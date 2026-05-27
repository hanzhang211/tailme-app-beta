"use client";

/**
 * components/community/PostFeed.jsx
 *
 * 小红书式双列瀑布流：
 *  - 卡片只加载 thumbnail（cover_thumbnail_url，回退 cover_image_url）
 *  - 不加载 image_urls；详情打开时由 PostDetail 单独拉
 *  - 懒加载 (loading="lazy" decoding="async")
 *  - skeleton 占位 + onLoad 淡入 + onError fallback
 *  - cover_aspect_ratio 预先撑高，避免 layout shift
 *  - IntersectionObserver 滚动分页 (cursor: before=created_at, limit=20)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  listPosts,
  likePost, unlikePost, getMyLikedPostIds,
} from "@/services/communityService";
import { avatarForBreed } from "@/services/breedAvatar";
import PostCompose from "./PostCompose";
import PostDetail  from "./PostDetail";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", text:"#1A1006",
  sub:"#8A8074", light:"#D6D5D8", border:"#D6D5D8",
};

const PAGE_SIZE = 20;

function textCoverRatio(post) {
  // 文字卡：根据内容长度撑高度（瀑布流自然错落）
  const len = ((post.title || "") + (post.content || "")).length;
  // 返回 width/height ratio：值越小越高
  return Math.max(0.75, Math.min(1.4, 1.2 - len / 280));
}

function imageCoverRatio(post) {
  // 用上传时存的 ratio；老帖 / 缺失时回退 1（正方）
  const r = Number(post.cover_aspect_ratio);
  if (!isFinite(r) || r <= 0) return 1;
  return Math.max(0.55, Math.min(1.6, r));   // 限幅防极端
}

export default function PostFeed({ user, pet }) {
  const [posts,    setPosts]    = useState([]);
  const [likedSet, setLikedSet] = useState(new Set());
  const [loading,  setLoading]  = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,  setHasMore]  = useState(true);
  const [err,      setErr]      = useState(null);

  const [composeOpen, setComposeOpen] = useState(false);
  const [detailId,    setDetailId]    = useState(null);

  const [toastMsg, setToastMsg] = useState(null);
  const toastTimerRef = useRef();
  const toast = (msg, level = "info") => {
    clearTimeout(toastTimerRef.current);
    setToastMsg({ msg, level });
    toastTimerRef.current = setTimeout(() => setToastMsg(null),
      level === "error" ? 4000 : 2500);
  };

  const sentinelRef   = useRef(null);
  const scrollRef     = useRef(null);
  const loadingMoreRef = useRef(false);

  /* ── 首次加载 ─────────────────────────────────────── */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await listPosts({ limit: PAGE_SIZE });
        if (!alive) return;
        setPosts(list);
        setHasMore(list.length === PAGE_SIZE);
        if (user?.id && list.length) {
          const liked = await getMyLikedPostIds(user.id, list.map((p) => p.id));
          if (alive) setLikedSet(liked);
        }
      } catch (e) {
        if (alive) setErr(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [user?.id]);

  /* ── 分页加载更多 ─────────────────────────────────── */
  const loadMore = async () => {
    if (loadingMoreRef.current || !hasMore || posts.length === 0) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const last = posts[posts.length - 1];
      const more = await listPosts({ limit: PAGE_SIZE, before: last.created_at });
      setPosts((prev) => [...prev, ...more]);
      setHasMore(more.length === PAGE_SIZE);
      if (user?.id && more.length) {
        const liked = await getMyLikedPostIds(user.id, more.map((p) => p.id));
        setLikedSet((prev) => {
          const n = new Set(prev);
          liked.forEach((id) => n.add(id));
          return n;
        });
      }
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  };

  /* ── IntersectionObserver 触发分页 ────────────────── */
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    }, { root: scrollRef.current, rootMargin: "300px 0px" });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, posts]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 瀑布流分列 ──────────────────────────────────── */
  const [leftCol, rightCol] = useMemo(() => {
    const L = [], R = [];
    let lh = 0, rh = 0;
    for (const p of posts) {
      const isText = p.post_type === "text" || (!p.cover_thumbnail_url && !p.cover_image_url);
      // 估算卡片高度（用 ratio 倒数 = 高/宽）
      const ratio = isText ? textCoverRatio(p) : imageCoverRatio(p);
      const estimateH = 1 / ratio + 0.45;
      if (lh <= rh) { L.push(p); lh += estimateH; }
      else          { R.push(p); rh += estimateH; }
    }
    return [L, R];
  }, [posts]);

  /* ── 点赞同步 ────────────────────────────────────── */
  const handleLikeChange = (postId, isLikedNow, likeDelta) => {
    setLikedSet((prev) => {
      const n = new Set(prev);
      if (isLikedNow) n.add(postId); else n.delete(postId);
      return n;
    });
    setPosts((prev) => prev.map((p) =>
      p.id === postId ? { ...p, like_count: (p.like_count || 0) + likeDelta } : p
    ));
  };

  /* 打开详情：先用 new Image() 预拉第一张 display 图，让浏览器开始下载，
     再 setDetailId 触发详情 modal —— 用户感知"秒开" */
  const openDetail = (post) => {
    const firstUrl = post.cover_image_url ||
                     (Array.isArray(post.image_urls) && post.image_urls[0]) ||
                     null;
    if (firstUrl && typeof window !== "undefined") {
      const img = new Image();
      img.fetchPriority = "high";
      img.src = firstUrl;
    }
    setDetailId(post.id);
  };

  const handleCardLike = async (post, e) => {
    e.stopPropagation();
    if (!user?.id) return;
    const wasLiked = likedSet.has(post.id);
    handleLikeChange(post.id, !wasLiked, wasLiked ? -1 : 1);
    try {
      if (wasLiked) await unlikePost(post.id, user.id);
      else          await likePost(post.id, user.id);
    } catch (err) {
      handleLikeChange(post.id, wasLiked, wasLiked ? 1 : -1);
      toast(err.message, "error");
    }
  };

  /* ── render ──────────────────────────────────────── */
  return (
    <div ref={scrollRef}
      style={{ height:"100%", overflowY:"auto", background:C.bg, position:"relative" }}>

      <div style={{ padding:"14px 14px 0" }}>
        <button onClick={() => setComposeOpen(true)}
          style={{ width:"100%", padding:"12px 16px", textAlign:"left",
                   borderRadius:18, fontSize:13, color:C.sub,
                   background:"white", border:`1px solid ${C.border}`,
                   cursor:"pointer",
                   boxShadow:"0 2px 8px rgba(0,0,0,0.04)",
                   display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ width:30, height:30, borderRadius:"50%", background:C.tint,
                         display:"flex", alignItems:"center", justifyContent:"center",
                         fontSize:14 }}>✏️</span>
          分享 {pet?.name || "你的宠物"} 的日常...
        </button>
      </div>

      <div style={{ display:"flex", gap:8, padding:"12px 12px 0" }}>
        {[leftCol, rightCol].map((col, ci) => (
          <div key={ci} style={{ flex:1, display:"flex", flexDirection:"column", gap:8, minWidth:0 }}>
            {col.map((p) => (
              <PostCard
                key={p.id} post={p}
                isLiked={likedSet.has(p.id)}
                onOpen={() => openDetail(p)}
                onToggleLike={(e) => handleCardLike(p, e)}
              />
            ))}
          </div>
        ))}
      </div>

      {loading && <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:30 }}>加载中…</div>}
      {err     && <div style={{ textAlign:"center", color:"#D94040", fontSize:12, padding:20 }}>❌ {err}</div>}
      {!loading && !err && posts.length === 0 && (
        <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:"60px 0" }}>
          还没有帖子，做第一个分享的人吧 🐾
        </div>
      )}

      {/* 分页 sentinel */}
      {hasMore && posts.length > 0 && (
        <div ref={sentinelRef} style={{ height:60, display:"flex",
                                        alignItems:"center", justifyContent:"center",
                                        color:C.sub, fontSize:12 }}>
          {loadingMore ? "加载中…" : ""}
        </div>
      )}
      {!hasMore && posts.length > 0 && (
        <div style={{ textAlign:"center", color:C.sub, fontSize:11, padding:"20px 0 90px" }}>
          —— 没有更多了 ——
        </div>
      )}

      {composeOpen && (
        <PostCompose
          user={user} pet={pet}
          onClose={() => setComposeOpen(false)}
          onSuccess={(post) => setPosts((prev) => [post, ...prev])}
          toast={toast}
        />
      )}

      {detailId && (
        <PostDetail
          postId={detailId}
          user={user} pet={pet}
          initialLiked={likedSet.has(detailId)}
          onLikeChange={handleLikeChange}
          onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
          onClose={() => setDetailId(null)}
          toast={toast}
        />
      )}

      {toastMsg && <Toast msg={toastMsg.msg} level={toastMsg.level} />}
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   单张 Feed 卡片：只显示 thumbnail
   ────────────────────────────────────────────────────── */
function PostCard({ post, isLiked, onOpen, onToggleLike }) {
  const avatar  = avatarForBreed(post.pet?.breed);
  const display = post.user?.username || "未命名宠物";
  const thumbUrl = post.cover_thumbnail_url || post.cover_image_url || null;
  const isText  = post.post_type === "text" || !thumbUrl;

  return (
    <div onClick={onOpen}
      style={{ background:"white", borderRadius:14, overflow:"hidden",
               cursor:"pointer", boxShadow:"0 1px 6px rgba(0,0,0,0.06)" }}>

      {/* 封面 */}
      {isText ? (
        <div style={{ background: post.text_bg_color || C.tint,
                      aspectRatio: `1 / ${1 / textCoverRatio(post)}`,
                      padding:"14px 14px",
                      display:"flex", flexDirection:"column", justifyContent:"center" }}>
          {post.title && (
            <div style={{ fontSize:14, fontWeight:800,
                          color: post.text_bg_color === "#E68645" ? "white" : C.text,
                          marginBottom:6, lineHeight:1.4, wordBreak:"break-word",
                          overflow:"hidden", display:"-webkit-box",
                          WebkitLineClamp:3, WebkitBoxOrient:"vertical" }}>
              {post.title}
            </div>
          )}
          <div style={{ fontSize:12, lineHeight:1.55,
                        color: post.text_bg_color === "#E68645" ? "white" : C.text,
                        wordBreak:"break-word",
                        overflow:"hidden", display:"-webkit-box",
                        WebkitLineClamp: post.title ? 4 : 7, WebkitBoxOrient:"vertical",
                        opacity: 0.92 }}>
            {post.content}
          </div>
        </div>
      ) : (
        <CoverImage src={thumbUrl} ratio={imageCoverRatio(post)} />
      )}

      {/* 标题（图片帖外露） */}
      {!isText && post.title && (
        <div style={{ padding:"8px 10px 0", fontSize:13, fontWeight:700, color:C.text,
                      overflow:"hidden", display:"-webkit-box",
                      WebkitLineClamp:2, WebkitBoxOrient:"vertical", lineHeight:1.4 }}>
          {post.title}
        </div>
      )}

      <div style={{ padding:"8px 10px", display:"flex", alignItems:"center", gap:6 }}>
        <div style={{ width:22, height:22, borderRadius:"50%", background:C.tint,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:11, flexShrink:0 }}>
          {avatar}
        </div>
        <div style={{ flex:1, fontSize:11, color:C.sub,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {display}
        </div>
        <button onClick={onToggleLike}
          style={{ background:"transparent", border:"none", cursor:"pointer",
                   display:"flex", alignItems:"center", gap:3,
                   color: isLiked ? C.pri : C.sub,
                   fontSize:11, fontWeight: isLiked ? 700 : 500, padding:0 }}>
          {isLiked ? "❤️" : "🤍"} {post.like_count || 0}
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   封面图：skeleton + lazy + fade-in + fallback
   ────────────────────────────────────────────────────── */
function CoverImage({ src, ratio }) {
  const [state, setState] = useState("loading"); // loading | loaded | error

  return (
    <div style={{ position:"relative", width:"100%",
                  aspectRatio: `${ratio} / 1`,
                  background: C.tint, overflow:"hidden" }}>
      {/* skeleton 动效 */}
      {state === "loading" && (
        <div style={{ position:"absolute", inset:0,
                      background: `linear-gradient(110deg, ${C.tint} 8%, #EFE4D8 18%, ${C.tint} 33%)`,
                      backgroundSize: "200% 100%",
                      animation: "shimmer 1.6s linear infinite" }} />
      )}
      {state === "error" ? (
        <div style={{ position:"absolute", inset:0,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      color:C.sub, fontSize:11 }}>
          🖼 图片加载失败
        </div>
      ) : (
        <img src={src} alt=""
          loading="lazy" decoding="async"
          onLoad={() => setState("loaded")}
          onError={() => setState("error")}
          style={{ width:"100%", height:"100%", objectFit:"cover", display:"block",
                   opacity: state === "loaded" ? 1 : 0,
                   transition:"opacity .25s ease" }} />
      )}
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   Toast
   ────────────────────────────────────────────────────── */
function Toast({ msg, level }) {
  const colors = {
    info:    { bg:"#1F2937", color:"white" },
    success: { bg:"#0F766E", color:"white" },
    warn:    { bg:"#B45309", color:"white" },
    error:   { bg:"#B91C1C", color:"white" },
  };
  const s = colors[level] || colors.info;
  return (
    <div style={{ position:"fixed", left:"50%", bottom:90, transform:"translateX(-50%)",
                  background:s.bg, color:s.color, padding:"10px 18px",
                  borderRadius:22, fontSize:13, fontWeight:600,
                  boxShadow:"0 6px 20px rgba(0,0,0,0.25)", zIndex:300,
                  maxWidth:"80%", textAlign:"center",
                  animation:"toast-up .2s ease-out" }}>
      {msg}
      <style>{`@keyframes toast-up { from { opacity:0; transform:translate(-50%, 8px); } to { opacity:1; transform:translate(-50%, 0); } }`}</style>
    </div>
  );
}
