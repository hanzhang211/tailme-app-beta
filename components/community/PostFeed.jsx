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
  listPosts, listPostsByTag, getHotTopics, getRecommendedPosts, listFollowingPosts, listCityPosts,
  likePost, unlikePost, getMyLikedPostIds,
} from "@/services/communityService";
import { getMyLocation, reverseGeoCity } from "@/services/amapService";
import { updateUserCity } from "@/services/supabaseService";
import PetAvatar  from "@/components/PetAvatar";
import PostCompose from "./PostCompose";
import PostDetail  from "./PostDetail";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", text:"#1A1006",
  sub:"#8A8074", light:"#D6D5D8", border:"#D6D5D8",
};

const PAGE_SIZE = 20;

/** 相对时间：刚刚 / x分钟前 / x小时前 / x天前 / 日期 */
function relativeTime(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!isFinite(t)) return "";
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min}分钟前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}天前`;
  return new Date(iso).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

/** 双列瀑布流分列（主 feed 与话题页复用） */
export function splitTwoCols(list) {
  const L = [], R = [];
  let lh = 0, rh = 0;
  for (const p of list) {
    const isText = p.post_type === "text" || (!p.cover_thumbnail_url && !p.cover_image_url);
    const ratio = isText ? textCoverRatio(p) : imageCoverRatio(p);
    const estimateH = 1 / ratio + 0.45;
    if (lh <= rh) { L.push(p); lh += estimateH; }
    else          { R.push(p); rh += estimateH; }
  }
  return [L, R];
}

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

export default function PostFeed({ user, pet, onUserUpdated, onOpenProfile }) {
  const [posts,    setPosts]    = useState([]);
  const [likedSet, setLikedSet] = useState(new Set());
  const [loading,  setLoading]  = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,  setHasMore]  = useState(true);
  const [err,      setErr]      = useState(null);

  const [composeOpen, setComposeOpen] = useState(false);
  const [detailId,    setDetailId]    = useState(null);

  // 🔥 今日热门话题 + ✨ 今日推荐（真实数据，5分钟缓存）
  const [hotTopics, setHotTopics] = useState([]);
  const [recommend, setRecommend] = useState([]);

  // 顶部分区：推荐 / 关注 / 同城 / 最新
  const [feedTab, setFeedTab] = useState("recommend");
  const [followPosts,   setFollowPosts]   = useState([]);
  const [followLoading, setFollowLoading] = useState(false);

  // 同城
  const [cityPosts,   setCityPosts]   = useState([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [locating,    setLocating]    = useState(false);

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
    // 热门话题 + 推荐（非阻塞，失败静默）
    getHotTopics().then((t) => { if (alive) setHotTopics(t); }).catch(() => {});
    getRecommendedPosts().then((r) => { if (alive) setRecommend(r); }).catch(() => {});
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
  const [leftCol, rightCol] = useMemo(() => splitTwoCols(posts), [posts]);

  /* ── 话题页（Phase 1）：点击 #话题 → 展示该 tag 的所有帖子 ── */
  const [topicTag,     setTopicTag]     = useState(null);
  const [topicPosts,   setTopicPosts]   = useState([]);
  const [topicLoading, setTopicLoading] = useState(false);
  const openTopic = async (tag) => {
    if (!tag) return;
    setTopicTag(tag);
    setTopicLoading(true);
    try {
      const list = await listPostsByTag(tag);
      setTopicPosts(list);
      if (user?.id && list.length) {
        const liked = await getMyLikedPostIds(user.id, list.map((p) => p.id));
        setLikedSet((prev) => { const n = new Set(prev); liked.forEach((id) => n.add(id)); return n; });
      }
    } catch (e) { toast(e.message, "error"); }
    finally { setTopicLoading(false); }
  };
  const [topicL, topicR] = useMemo(() => splitTwoCols(topicPosts), [topicPosts]);

  /* ── 「关注」流：每次进入该 tab 都重新加载（我真正关注的人发的帖） ── */
  useEffect(() => {
    if (feedTab !== "follow" || !user?.id) return;
    let alive = true;
    setFollowLoading(true);
    listFollowingPosts(user.id)
      .then(async (list) => {
        if (!alive) return;
        setFollowPosts(list);
        if (list.length) {
          const liked = await getMyLikedPostIds(user.id, list.map((p) => p.id));
          if (alive) setLikedSet((prev) => { const n = new Set(prev); liked.forEach((id) => n.add(id)); return n; });
        }
      })
      .catch((e) => { if (alive) toast(e.message, "error"); })
      .finally(() => { if (alive) setFollowLoading(false); });
    return () => { alive = false; };
  }, [feedTab, user?.id]); // eslint-disable-line
  const [followL, followR] = useMemo(() => splitTwoCols(followPosts), [followPosts]);

  /* ── 「同城」流：有城市则加载同城帖 ── */
  useEffect(() => {
    if (feedTab !== "city" || !user?.city) return;
    let alive = true;
    setCityLoading(true);
    listCityPosts(user.city)
      .then(async (list) => {
        if (!alive) return;
        setCityPosts(list);
        if (user?.id && list.length) {
          const liked = await getMyLikedPostIds(user.id, list.map((p) => p.id));
          if (alive) setLikedSet((prev) => { const n = new Set(prev); liked.forEach((id) => n.add(id)); return n; });
        }
      })
      .catch((e) => { if (alive) toast(e.message, "error"); })
      .finally(() => { if (alive) setCityLoading(false); });
    return () => { alive = false; };
  }, [feedTab, user?.city]); // eslint-disable-line
  const [cityL, cityR] = useMemo(() => splitTwoCols(cityPosts), [cityPosts]);

  /* 用定位设置城市（高德 regeo），失败回退手动输入 */
  const handleLocateCity = async () => {
    if (locating || !user?.id) return;
    setLocating(true);
    try {
      const loc = await getMyLocation();
      let city = await reverseGeoCity(loc.lat, loc.lng);
      if (!city && typeof window !== "undefined") {
        city = window.prompt("没能自动定位到城市，手动输入（如：上海市）") || "";
      }
      city = (city || "").trim();
      if (!city) return;
      const updated = await updateUserCity(user.id, city);
      onUserUpdated?.(updated);
      toast(`已设置城市：${city}`, "success");
    } catch (e) {
      toast(e.message || "定位失败，请重试", "error");
    } finally {
      setLocating(false);
    }
  };

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

      {topicTag && (
        <TopicView
          tag={topicTag}
          loading={topicLoading}
          colL={topicL} colR={topicR}
          likedSet={likedSet}
          onBack={() => { setTopicTag(null); setTopicPosts([]); }}
          onOpenPost={openDetail}
          onToggleLike={handleCardLike}
          onOpenTopic={openTopic}
          onOpenProfile={onOpenProfile}
        />
      )}

      <div style={{ display: topicTag ? "none" : "block" }}>

      {/* 顶部分区 Tab：推荐 / 关注 / 同城 / 最新 */}
      <div style={{ display:"flex", gap:20, padding:"12px 16px 0" }}>
        {[["recommend","推荐"], ["follow","关注"], ["city","同城"], ["latest","最新"]].map(([key, label]) => {
          const on = feedTab === key;
          return (
            <button key={key} onClick={() => setFeedTab(key)}
              style={{ background:"transparent", border:"none", cursor:"pointer", padding:"0 0 6px",
                       fontSize:15, fontWeight: on ? 800 : 600, color: on ? C.text : C.sub,
                       position:"relative" }}>
              {label}
              {on && <span style={{ position:"absolute", left:"50%", bottom:0, transform:"translateX(-50%)",
                                    width:18, height:3, borderRadius:2, background:C.pri }} />}
            </button>
          );
        })}
      </div>

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

      {/* 🔥 今日热门话题（真实统计 · 5分钟缓存）—— 仅「推荐」 */}
      {feedTab === "recommend" && hotTopics.length > 0 && (
        <div style={{ padding:"14px 14px 0" }}>
          <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:8 }}>🔥 今日热门</div>
          <div style={{ display:"flex", gap:8, overflowX:"auto", scrollbarWidth:"none" }}>
            {hotTopics.map(({ tag, count }) => (
              <button key={tag} onClick={() => openTopic(tag)}
                style={{ flexShrink:0, display:"flex", alignItems:"center", gap:5,
                         background:"white", border:`1px solid ${C.border}`, borderRadius:999,
                         padding:"6px 12px", cursor:"pointer",
                         boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
                <span style={{ fontSize:12.5, fontWeight:700, color:C.pri }}># {tag}</span>
                <span style={{ fontSize:10, color:C.sub }}>{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ✨ 今日推荐（likes*2 + comments*3 · 近48h · 真实封面）—— 仅「推荐」 */}
      {feedTab === "recommend" && recommend.length > 0 && (
        <div style={{ padding:"16px 14px 0" }}>
          <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:8 }}>✨ 今日推荐</div>
          <div style={{ display:"flex", gap:8 }}>
            {recommend.map((p, i) => {
              const label = ["最受欢迎狗狗", "最可爱猫咪", "今日最佳照片"][i] || "热门推荐";
              const cover = p.cover_thumbnail_url || p.cover_image_url || null;
              return (
                <div key={p.id} onClick={() => openDetail(p)}
                  style={{ flex:"0 0 calc((100% - 16px) / 3)", minWidth:0, background:"white", borderRadius:14,
                           overflow:"hidden", cursor:"pointer",
                           boxShadow:"0 2px 10px rgba(0,0,0,0.06)" }}>
                  <div style={{ width:"100%", aspectRatio:"1 / 1", background:C.tint,
                                display:"flex", alignItems:"center", justifyContent:"center",
                                overflow:"hidden" }}>
                    {cover
                      ? <img src={cover} alt="" loading="lazy"
                          style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                      : <span style={{ fontSize:26 }}>🐾</span>}
                  </div>
                  <div style={{ padding:"7px 8px 8px" }}>
                    <div style={{ fontSize:11, fontWeight:800, color:C.text,
                                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {label}
                    </div>
                    <div style={{ fontSize:10, color:C.pri, fontWeight:600, marginTop:2 }}>
                      {p.like_count || 0} 个点赞
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(feedTab === "recommend" || feedTab === "latest") && (
      <div style={{ display:"flex", gap:8, padding:"12px 12px 0" }}>
        {[leftCol, rightCol].map((col, ci) => (
          <div key={ci} style={{ flex:1, display:"flex", flexDirection:"column", gap:8, minWidth:0 }}>
            {col.map((p) => (
              <PostCard
                key={p.id} post={p}
                isLiked={likedSet.has(p.id)}
                onOpen={() => openDetail(p)}
                onToggleLike={(e) => handleCardLike(p, e)}
                onOpenTopic={openTopic}
                onOpenProfile={onOpenProfile}
              />
            ))}
          </div>
        ))}
      </div>
      )}

      {/* 关注流：我赞过/互动过的人的帖子 */}
      {feedTab === "follow" && (
        followLoading ? (
          <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:30 }}>加载中…</div>
        ) : followPosts.length === 0 ? (
          <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:"60px 24px", lineHeight:1.8 }}>
            还没有关注的内容 🐾<br/>
            <span style={{ fontSize:12 }}>给喜欢的帖子点个赞，TA 的新动态就会出现在这里</span>
          </div>
        ) : (
          <div style={{ display:"flex", gap:8, padding:"12px 12px 90px" }}>
            {[followL, followR].map((col, ci) => (
              <div key={ci} style={{ flex:1, display:"flex", flexDirection:"column", gap:8, minWidth:0 }}>
                {col.map((p) => (
                  <PostCard key={p.id} post={p} isLiked={likedSet.has(p.id)}
                    onOpen={() => openDetail(p)} onToggleLike={(e) => handleCardLike(p, e)}
                    onOpenTopic={openTopic} onOpenProfile={onOpenProfile} />
                ))}
              </div>
            ))}
          </div>
        )
      )}

      {/* 同城流：定位设城市 → 同城用户的帖子（真实，无 mock） */}
      {feedTab === "city" && (
        !user?.city ? (
          <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:"56px 24px", lineHeight:1.9 }}>
            📍 看看同城的毛孩子<br/>
            <span style={{ fontSize:12 }}>设置所在城市后，就能刷到同城的动态啦</span>
            <div style={{ marginTop:18 }}>
              <button onClick={handleLocateCity} disabled={locating}
                style={{ background:C.pri, color:"white", border:"none", borderRadius:999,
                         padding:"11px 26px", fontSize:14, fontWeight:700,
                         cursor: locating ? "default" : "pointer" }}>
                {locating ? "定位中…" : "📍 用定位设置城市"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                          padding:"12px 16px 0" }}>
              <span style={{ fontSize:13, fontWeight:700, color:C.text }}>📍 {user.city}</span>
              <button onClick={handleLocateCity} disabled={locating}
                style={{ background:"transparent", border:"none", color:C.pri, fontSize:12,
                         fontWeight:600, cursor:"pointer" }}>
                {locating ? "定位中…" : "切换城市"}
              </button>
            </div>
            {cityLoading ? (
              <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:30 }}>加载中…</div>
            ) : cityPosts.length === 0 ? (
              <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:"50px 24px", lineHeight:1.8 }}>
                {user.city} 还没有同城动态 🐾<br/>
                <span style={{ fontSize:12 }}>来发第一条，让同城毛孩子家长看到你</span>
              </div>
            ) : (
              <div style={{ display:"flex", gap:8, padding:"10px 12px 90px" }}>
                {[cityL, cityR].map((col, ci) => (
                  <div key={ci} style={{ flex:1, display:"flex", flexDirection:"column", gap:8, minWidth:0 }}>
                    {col.map((p) => (
                      <PostCard key={p.id} post={p} isLiked={likedSet.has(p.id)}
                        onOpen={() => openDetail(p)} onToggleLike={(e) => handleCardLike(p, e)}
                        onOpenTopic={openTopic} onOpenProfile={onOpenProfile} />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </>
        )
      )}

      {(feedTab === "recommend" || feedTab === "latest") && (<>
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
      </>)}
      </div>{/* /主 feed 包裹（话题页打开时隐藏）*/}

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
export function PostCard({ post, isLiked, onOpen, onToggleLike, onOpenTopic, onOpenProfile }) {
  const primaryName = post.pet?.name || post.user?.username || "未命名宠物";
  const breed = post.pet?.breed || "";
  const time  = relativeTime(post.created_at);
  const tags  = Array.isArray(post.hashtags) ? post.hashtags : [];
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
        <CoverImage src={thumbUrl} ratio={imageCoverRatio(post)}
          count={Array.isArray(post.image_urls) ? post.image_urls.length : 0} />
      )}

      {/* 标题（图片帖外露） */}
      {!isText && post.title && (
        <div style={{ padding:"8px 10px 0", fontSize:13, fontWeight:700, color:C.text,
                      overflow:"hidden", display:"-webkit-box",
                      WebkitLineClamp:2, WebkitBoxOrient:"vertical", lineHeight:1.4 }}>
          {post.title}
        </div>
      )}

      {/* #话题 胶囊（可点击进入话题页） */}
      {tags.length > 0 && (
        <div style={{ padding:"7px 10px 0", display:"flex", flexWrap:"wrap", gap:5 }}>
          {tags.slice(0, 3).map((tag) => (
            <button key={tag}
              onClick={(e) => { e.stopPropagation(); onOpenTopic?.(tag); }}
              style={{ fontSize:10, fontWeight:600, color:C.pri, background:C.tint,
                       border:"none", borderRadius:999, padding:"2px 8px", cursor:"pointer",
                       maxWidth:"100%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* 作者行：宠物头像 + 宠物名 + 品种·时间 + 点赞（头像+名字可点进主页） */}
      <div style={{ padding:"8px 10px", display:"flex", alignItems:"center", gap:7 }}>
        <div onClick={(e) => { if (onOpenProfile && post.user_id) { e.stopPropagation(); onOpenProfile(post.user_id); } }}
          style={{ display:"flex", alignItems:"center", gap:7, flex:1, minWidth:0,
                   cursor: onOpenProfile ? "pointer" : "default" }}>
          <PetAvatar pet={post.pet} overrideUrl={post.user?.avatar_url} size={24} bg={C.tint} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11.5, fontWeight:700, color:C.text,
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {primaryName}
            </div>
            {(breed || time) && (
              <div style={{ fontSize:10, color:C.sub, marginTop:1,
                            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {[breed, time].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
        </div>
        <button onClick={onToggleLike}
          style={{ background:"transparent", border:"none", cursor:"pointer",
                   display:"flex", alignItems:"center", gap:3, flexShrink:0,
                   color: isLiked ? C.pri : C.sub,
                   fontSize:11, fontWeight: isLiked ? 700 : 500, padding:0 }}>
          {isLiked ? "❤️" : "🤍"} {post.like_count || 0}
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   话题页（Phase 1）：某个 #话题 下的所有帖子
   ────────────────────────────────────────────────────── */
function TopicView({ tag, loading, colL, colR, likedSet, onBack, onOpenPost, onToggleLike, onOpenTopic, onOpenProfile }) {
  const total = colL.length + colR.length;
  return (
    <div>
      <div style={{ padding:"14px 14px 6px", display:"flex", alignItems:"center", gap:10 }}>
        <button onClick={onBack}
          style={{ width:34, height:34, borderRadius:999, flexShrink:0,
                   background:"white", border:`1px solid ${C.border}`, cursor:"pointer",
                   fontSize:18, color:C.text, display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:18, fontWeight:800, color:C.pri,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}># {tag}</div>
          <div style={{ fontSize:12, color:C.sub }}>{loading ? "加载中…" : `${total} 篇帖子`}</div>
        </div>
      </div>

      <div style={{ display:"flex", gap:8, padding:"8px 12px 0" }}>
        {[colL, colR].map((col, ci) => (
          <div key={ci} style={{ flex:1, display:"flex", flexDirection:"column", gap:8, minWidth:0 }}>
            {col.map((p) => (
              <PostCard key={p.id} post={p} isLiked={likedSet.has(p.id)}
                onOpen={() => onOpenPost(p)} onToggleLike={(e) => onToggleLike(p, e)}
                onOpenTopic={onOpenTopic} onOpenProfile={onOpenProfile} />
            ))}
          </div>
        ))}
      </div>

      {!loading && total === 0 && (
        <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:"50px 0" }}>
          该话题还没有帖子 🐾
        </div>
      )}
      <div style={{ height:90 }} />
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   封面图：skeleton + lazy + fade-in + fallback
   ────────────────────────────────────────────────────── */
function CoverImage({ src, ratio, count = 0 }) {
  const [state, setState] = useState("loading"); // loading | loaded | error

  return (
    <div style={{ position:"relative", width:"100%",
                  aspectRatio: `${ratio} / 1`,
                  background: C.tint, overflow:"hidden" }}>
      {/* 多图角标 1/N */}
      {count > 1 && (
        <div style={{ position:"absolute", top:6, right:6, zIndex:2,
                      background:"rgba(0,0,0,0.45)", color:"#fff",
                      fontSize:10, fontWeight:700, lineHeight:1,
                      padding:"3px 7px", borderRadius:999,
                      backdropFilter:"blur(2px)", WebkitBackdropFilter:"blur(2px)" }}>
          1/{count}
        </div>
      )}
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
