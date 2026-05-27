"use client";

/**
 * components/community/PostFeed.jsx
 *
 * 小红书式双列瀑布流帖子流：
 *  - 每张卡片只显示：封面（首图 / 文字卡背景）+ 标题 + 用户 + 点赞数
 *  - 点卡片打开 PostDetail modal 看完整内容 + 评论
 *  - 顶部"发布"按钮打开 PostCompose modal
 *
 * 瀑布流实现：JS 把 posts 按当前两列累积高度分到左/右列，简单可靠。
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

const COVER_MIN_RATIO = 0.7;  // 缩略图最矮
const COVER_MAX_RATIO = 1.4;  // 最高

/* 给文字卡随机分配高度（基于内容长度），让瀑布流自然 */
function textCoverRatio(post) {
  const len = ((post.title || "") + (post.content || "")).length;
  const base = Math.min(1.3, 0.75 + len / 220);
  return Math.min(COVER_MAX_RATIO, Math.max(COVER_MIN_RATIO, base));
}

export default function PostFeed({ user, pet }) {
  const [posts,    setPosts]    = useState([]);
  const [likedSet, setLikedSet] = useState(new Set());
  const [loading,  setLoading]  = useState(true);
  const [err,      setErr]      = useState(null);

  const [composeOpen, setComposeOpen] = useState(false);
  const [detail,      setDetail]      = useState(null);

  const [toastMsg, setToastMsg] = useState(null);
  const toastTimerRef = useRef();
  const toast = (msg, level = "info") => {
    clearTimeout(toastTimerRef.current);
    setToastMsg({ msg, level });
    toastTimerRef.current = setTimeout(() => setToastMsg(null),
      level === "error" ? 4000 : 2500);
  };

  /* ── 加载 feed ─────────────────────────────────────── */
  const refresh = async () => {
    try {
      const list = await listPosts();
      setPosts(list);
      if (user?.id) {
        const liked = await getMyLikedPostIds(user.id, list.map((p) => p.id));
        setLikedSet(liked);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { refresh(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 瀑布流分列（按累积高度） ─────────────────────── */
  const [leftCol, rightCol] = useMemo(() => {
    const L = [], R = [];
    let lh = 0, rh = 0;
    for (const p of posts) {
      // 估算卡片高度 = 封面比例 + 文字区固定 80px
      const isText = p.post_type === "text" || !p.cover_image_url;
      const ratio  = isText ? textCoverRatio(p) : 1; // 真实图片让 img 自适应，估算时按 1:1
      const estimateH = ratio + 0.45; // ~封面 + 标题/用户区
      if (lh <= rh) { L.push(p); lh += estimateH; }
      else          { R.push(p); rh += estimateH; }
    }
    return [L, R];
  }, [posts]);

  /* ── 点赞同步（详情/卡片相互更新） ─────────────────── */
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

  /* ── render ─────────────────────────────────────────── */
  return (
    <div style={{ height:"100%", overflowY:"auto", background:C.bg, position:"relative" }}>
      {/* 顶部发帖按钮 */}
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

      {/* 瀑布流 */}
      <div style={{ display:"flex", gap:8, padding:"12px 12px 90px" }}>
        {[leftCol, rightCol].map((col, ci) => (
          <div key={ci} style={{ flex:1, display:"flex", flexDirection:"column", gap:8, minWidth:0 }}>
            {col.map((p) => (
              <PostCard
                key={p.id} post={p} user={user}
                isLiked={likedSet.has(p.id)}
                onOpen={() => setDetail(p)}
                onToggleLike={(e) => handleCardLike(p, e)}
              />
            ))}
          </div>
        ))}
      </div>

      {loading && <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:30 }}>加载中...</div>}
      {err     && <div style={{ textAlign:"center", color:"#D94040", fontSize:12, padding:20 }}>❌ {err}</div>}
      {!loading && !err && posts.length === 0 && (
        <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:"60px 0" }}>
          还没有帖子，做第一个分享的人吧 🐾
        </div>
      )}

      {composeOpen && (
        <PostCompose
          user={user} pet={pet}
          onClose={() => setComposeOpen(false)}
          onSuccess={(post) => {
            setPosts((prev) => [post, ...prev]);
          }}
          toast={toast}
        />
      )}

      {detail && (
        <PostDetail
          post={detail} user={user} pet={pet}
          initialLiked={likedSet.has(detail.id)}
          onLikeChange={handleLikeChange}
          onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
          onClose={() => setDetail(null)}
          toast={toast}
        />
      )}

      {toastMsg && <Toast msg={toastMsg.msg} level={toastMsg.level} />}
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   单张 Feed 卡片
   ────────────────────────────────────────────────────── */
function PostCard({ post, user, isLiked, onOpen, onToggleLike }) {
  const avatar  = avatarForBreed(post.pet?.breed);
  const display = post.user?.username || "未命名宠物";
  const isText  = post.post_type === "text" || !post.cover_image_url;

  return (
    <div onClick={onOpen}
      style={{ background:"white", borderRadius:14, overflow:"hidden",
               cursor:"pointer", boxShadow:"0 1px 6px rgba(0,0,0,0.06)" }}>

      {/* 封面 */}
      {isText ? (
        <div style={{ background: post.text_bg_color || C.tint,
                      aspectRatio: `1 / ${textCoverRatio(post)}`,
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
        <img src={post.cover_image_url} alt=""
          loading="lazy"
          style={{ width:"100%", display:"block", aspectRatio:"auto" }} />
      )}

      {/* 标题（图片帖外露） */}
      {!isText && post.title && (
        <div style={{ padding:"8px 10px 0", fontSize:13, fontWeight:700, color:C.text,
                      overflow:"hidden", display:"-webkit-box",
                      WebkitLineClamp:2, WebkitBoxOrient:"vertical", lineHeight:1.4 }}>
          {post.title}
        </div>
      )}

      {/* 底栏：用户 + 点赞 */}
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
