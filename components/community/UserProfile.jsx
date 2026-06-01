"use client";

/**
 * components/community/UserProfile.jsx
 *
 * 用户主页浮层（SPA 内视图，替代 /profile/[userId]）：
 *   头像 / 昵称 / 城市 / 关注·粉丝·获赞 / 关注按钮 / TA的宠物 / TA的帖子瀑布流
 * 不影响现有社区、点赞、群聊、Realtime。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { getUserById, getUserPets } from "@/services/supabaseService";
import {
  getFollowCounts, getUserLikeTotal, isFollowing, followUser, unfollowUser,
  listMyPosts, getMyLikedPostIds, likePost, unlikePost,
} from "@/services/communityService";
import { PostCard, splitTwoCols } from "./PostFeed";
import PostDetail from "./PostDetail";
import { avatarForBreed } from "@/services/breedAvatar";
import { formatPetAge } from "@/services/petAge";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", text:"#1A1006",
  sub:"#8A8074", light:"#D6D5D8", border:"#D6D5D8",
};
const PAGE = 10;

export default function UserProfile({ viewerId, userId, onClose }) {
  const isSelf = viewerId && viewerId === userId;

  const [user,   setUser]   = useState(null);
  const [counts, setCounts] = useState({ following: 0, followers: 0 });
  const [likes,  setLikes]  = useState(0);
  const [pets,   setPets]   = useState([]);
  const [following, setFollowing] = useState(false);
  const [busy,   setBusy]   = useState(false);
  const [loading, setLoading] = useState(true);

  const [posts,    setPosts]    = useState([]);
  const [likedSet, setLikedSet] = useState(new Set());
  const [hasMore,  setHasMore]  = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);
  const moreRef = useRef(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const [u, c, lk, ps, posts0] = await Promise.all([
          getUserById(userId).catch(() => null),
          getFollowCounts(userId),
          getUserLikeTotal(userId),
          getUserPets(userId).catch(() => []),
          listMyPosts(userId, { limit: PAGE }),
        ]);
        if (!alive) return;
        setUser(u); setCounts(c); setLikes(lk); setPets(ps || []);
        setPosts(posts0); setHasMore(posts0.length === PAGE);
        if (!isSelf && viewerId) isFollowing(viewerId, userId).then((f) => alive && setFollowing(f));
        if (viewerId && posts0.length) {
          const liked = await getMyLikedPostIds(viewerId, posts0.map((p) => p.id));
          if (alive) setLikedSet(liked);
        }
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [userId]); // eslint-disable-line

  const loadMore = async () => {
    if (moreRef.current || !hasMore || posts.length === 0) return;
    moreRef.current = true; setLoadingMore(true);
    try {
      const more = await listMyPosts(userId, { limit: PAGE, before: posts[posts.length - 1].created_at });
      setPosts((p) => [...p, ...more]);
      setHasMore(more.length === PAGE);
      if (viewerId && more.length) {
        const liked = await getMyLikedPostIds(viewerId, more.map((p) => p.id));
        setLikedSet((prev) => { const n = new Set(prev); liked.forEach((id) => n.add(id)); return n; });
      }
    } catch {} finally { setLoadingMore(false); moreRef.current = false; }
  };
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const obs = new IntersectionObserver((e) => { if (e[0].isIntersecting) loadMore(); },
      { root: scrollRef.current, rootMargin: "300px 0px" });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, posts]); // eslint-disable-line

  const [colL, colR] = useMemo(() => splitTwoCols(posts), [posts]);

  const toggleFollow = async () => {
    if (busy || !viewerId || isSelf) return;
    setBusy(true);
    const next = !following;
    setFollowing(next);
    setCounts((c) => ({ ...c, followers: Math.max(0, c.followers + (next ? 1 : -1)) }));
    try {
      if (next) await followUser(viewerId, userId);
      else      await unfollowUser(viewerId, userId);
    } catch {
      setFollowing(!next);
      setCounts((c) => ({ ...c, followers: Math.max(0, c.followers + (next ? -1 : 1)) }));
    } finally { setBusy(false); }
  };

  const handleCardLike = async (post, e) => {
    e.stopPropagation();
    if (!viewerId) return;
    const was = likedSet.has(post.id);
    setLikedSet((prev) => { const n = new Set(prev); was ? n.delete(post.id) : n.add(post.id); return n; });
    setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, like_count: (p.like_count || 0) + (was ? -1 : 1) } : p));
    try { was ? await unlikePost(post.id, viewerId) : await likePost(post.id, viewerId); }
    catch { setLikedSet((prev) => { const n = new Set(prev); was ? n.add(post.id) : n.delete(post.id); return n; }); }
  };

  const name = user?.username || "毛孩子家长";

  return (
    <div style={{ position:"absolute", inset:0, zIndex:120, background:C.bg,
                  display:"flex", flexDirection:"column" }}>
      {/* 顶栏 */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"52px 16px 12px",
                    background:"white", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
        <button onClick={onClose}
          style={{ width:34, height:34, borderRadius:999, background:C.bg, border:`1px solid ${C.border}`,
                   cursor:"pointer", fontSize:18, color:C.text }}>‹</button>
        <div style={{ fontSize:16, fontWeight:800, color:C.text,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</div>
      </div>

      <div ref={scrollRef} style={{ flex:1, overflowY:"auto" }}>
        {/* 头部 */}
        <div style={{ background:"white", padding:"20px 18px 18px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <Avatar url={user?.avatar_url} size={64} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:18, fontWeight:800, color:C.text }}>{name}</div>
              {user?.city && <div style={{ fontSize:12, color:C.sub, marginTop:3 }}>📍 {user.city}</div>}
            </div>
          </div>

          {/* 统计三列 */}
          <div style={{ display:"flex", marginTop:18, marginBottom:16 }}>
            <Stat n={counts.following} label="关注" />
            <Stat n={counts.followers} label="粉丝" />
            <Stat n={likes}            label="获赞" />
          </div>

          {/* 关注按钮（自己主页不显示） */}
          {!isSelf && (
            <button onClick={toggleFollow} disabled={busy}
              style={{ width:"100%", height:42, borderRadius:999, fontSize:14, fontWeight:700,
                       cursor: busy ? "default" : "pointer",
                       background: following ? "white" : C.pri,
                       color: following ? C.sub : "white",
                       border: following ? `1px solid ${C.border}` : "none" }}>
              {following ? "已关注" : "+ 关注"}
            </button>
          )}
        </div>

        {/* TA的宠物 */}
        {pets.length > 0 && (
          <div style={{ padding:"16px 16px 0" }}>
            <div style={{ fontSize:14, fontWeight:800, color:C.text, marginBottom:10 }}>
              {isSelf ? "我的毛孩子" : "TA 的毛孩子"}
            </div>
            <div style={{ display:"flex", gap:10, overflowX:"auto", scrollbarWidth:"none", paddingBottom:4 }}>
              {pets.map((p) => {
                const src = p.pet_avatar_thumb_url || p.ai_avatar_url || null;
                const age = formatPetAge(p.birthday);
                return (
                  <div key={p.id} style={{ flexShrink:0, width:130, background:"white", borderRadius:16,
                                           border:`1px solid ${C.border}`, padding:"10px",
                                           display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:44, height:44, borderRadius:"50%", background:C.tint, flexShrink:0,
                                  overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>
                      {src ? <img src={src} alt={p.name} style={{ width:"100%", height:"100%", objectFit:"cover", mixBlendMode:"multiply" }} />
                           : avatarForBreed(p.breed, p.pet_type)}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:C.text,
                                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                      <div style={{ fontSize:10, color:C.sub, marginTop:2,
                                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {[p.breed, age].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TA的帖子 */}
        <div style={{ padding:"16px 12px 0" }}>
          <div style={{ fontSize:14, fontWeight:800, color:C.text, padding:"0 4px 10px" }}>
            {isSelf ? "我的帖子" : "TA 的帖子"}
          </div>
          {loading ? (
            <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:30 }}>加载中…</div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:"40px 0 90px" }}>还没有帖子 🐾</div>
          ) : (
            <>
              <div style={{ display:"flex", gap:8 }}>
                {[colL, colR].map((col, ci) => (
                  <div key={ci} style={{ flex:1, display:"flex", flexDirection:"column", gap:8, minWidth:0 }}>
                    {col.map((p) => (
                      <PostCard key={p.id} post={p} isLiked={likedSet.has(p.id)}
                        onOpen={() => setDetailId(p.id)} onToggleLike={(e) => handleCardLike(p, e)} />
                    ))}
                  </div>
                ))}
              </div>
              {hasMore && <div ref={sentinelRef} style={{ height:50, textAlign:"center", color:C.sub, fontSize:12, paddingTop:16 }}>{loadingMore ? "加载中…" : ""}</div>}
              <div style={{ height:90 }} />
            </>
          )}
        </div>
      </div>

      {detailId && (
        <PostDetail postId={detailId} user={{ id: viewerId }}
          initialLiked={likedSet.has(detailId)}
          onLikeChange={(id, liked, delta) => {
            setLikedSet((prev) => { const n = new Set(prev); liked ? n.add(id) : n.delete(id); return n; });
            setPosts((prev) => prev.map((p) => p.id === id ? { ...p, like_count: (p.like_count || 0) + delta } : p));
          }}
          onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
          onClose={() => setDetailId(null)}
          toast={() => {}} />
      )}
    </div>
  );
}

function Stat({ n, label }) {
  return (
    <div style={{ flex:1, textAlign:"center" }}>
      <div style={{ fontSize:19, fontWeight:800, color:C.text }}>{n}</div>
      <div style={{ fontSize:11, color:C.sub, marginTop:2 }}>{label}</div>
    </div>
  );
}

function Avatar({ url, size = 64 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:C.tint, flexShrink:0,
                  overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:size * 0.5 }}>
      {url ? <img src={url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : "🐾"}
    </div>
  );
}
