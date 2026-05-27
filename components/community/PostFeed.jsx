"use client";

/**
 * components/community/PostFeed.jsx
 *
 * 帖子流（小红书式 MVP）：
 *  - 顶部发帖框（折叠 / 展开）
 *  - 帖子卡片：头像（品种 emoji） + 用户名 + 时间 + 内容 + 点赞 / 评论
 *  - 点赞 / 取消点赞 / 展开评论 / 发评论 / 删自己的帖子 / 举报别人的
 *
 * 注意：本批不做图片上传，posts.image_urls 字段预留。
 */

import { useEffect, useState } from "react";
import {
  listPosts, createPost,
  likePost, unlikePost, getMyLikedPostIds,
  listComments, createComment,
  deleteOwnContent, reportContent,
} from "@/services/communityService";
import { avatarForBreed } from "@/services/breedAvatar";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", text:"#1A1006",
  sub:"#8A8074", light:"#D6D5D8", border:"#D6D5D8",
};

function fmtRelTime(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const diff = (Date.now() - t) / 1000;
  if (diff < 60)        return "刚刚";
  if (diff < 3600)      return `${Math.floor(diff/60)} 分钟前`;
  if (diff < 86400)     return `${Math.floor(diff/3600)} 小时前`;
  if (diff < 86400 * 7) return `${Math.floor(diff/86400)} 天前`;
  return new Date(iso).toLocaleDateString("zh");
}

export default function PostFeed({ user, pet }) {
  const [posts,    setPosts]   = useState([]);
  const [likedSet, setLikedSet] = useState(new Set());
  const [loading,  setLoading] = useState(true);
  const [err,      setErr]     = useState(null);

  const [composeOpen, setComposeOpen] = useState(false);
  const [draft,       setDraft]       = useState("");
  const [posting,     setPosting]     = useState(false);

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

  const handlePost = async () => {
    if (!draft.trim() || !user?.id) return;
    setPosting(true);
    try {
      const { post, flagged } = await createPost({
        userId: user.id, petId: pet?.id, content: draft,
      });
      if (flagged) {
        alert("帖子包含敏感词，已待审核，暂未公开显示");
      } else {
        setPosts((prev) => [post, ...prev]);
      }
      setDraft("");
      setComposeOpen(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setPosting(false);
    }
  };

  const handleToggleLike = async (postId) => {
    if (!user?.id) return;
    const isLiked = likedSet.has(postId);
    // 乐观更新
    setLikedSet((prev) => {
      const n = new Set(prev);
      if (isLiked) n.delete(postId); else n.add(postId);
      return n;
    });
    setPosts((prev) => prev.map((p) =>
      p.id === postId ? { ...p, like_count: p.like_count + (isLiked ? -1 : 1) } : p
    ));
    try {
      if (isLiked) await unlikePost(postId, user.id);
      else         await likePost(postId, user.id);
    } catch (e) {
      // 回滚
      setLikedSet((prev) => {
        const n = new Set(prev);
        if (isLiked) n.add(postId); else n.delete(postId);
        return n;
      });
      alert(e.message);
    }
  };

  const handleDelete = async (post) => {
    if (post.user_id !== user?.id) return;
    if (!confirm("删除这条帖子？")) return;
    try {
      await deleteOwnContent({ userId: user.id, targetType: "post", targetId: post.id });
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } catch (e) { alert(e.message); }
  };

  const handleReport = async (post) => {
    const reason = prompt("举报理由（可选）");
    if (reason === null) return;
    try {
      await reportContent({
        reporterId: user.id, targetType: "post", targetId: post.id, reason,
      });
      alert("已举报，管理员会处理");
    } catch (e) { alert(e.message); }
  };

  return (
    <div style={{ height:"100%", overflowY:"auto", background:C.bg }}>
      {/* 发帖入口 */}
      <div style={{ padding:"14px 14px 0" }}>
        {composeOpen ? (
          <div style={{ background:"white", border:`1px solid ${C.border}`,
                        borderRadius:18, padding:14,
                        boxShadow:"0 4px 14px rgba(0,0,0,0.06)" }}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`分享 ${pet?.name || "你的宠物"} 的日常...`}
              maxLength={5000}
              rows={4}
              style={{ width:"100%", borderRadius:12, padding:"10px 12px", fontSize:14,
                       border:`1.5px solid ${C.border}`, background:C.bg, color:C.text,
                       outline:"none", boxSizing:"border-box", resize:"vertical",
                       fontFamily:"inherit" }} />
            <div style={{ display:"flex", gap:10, marginTop:10, justifyContent:"flex-end" }}>
              <button onClick={() => { setComposeOpen(false); setDraft(""); }}
                style={{ padding:"8px 18px", borderRadius:14, fontSize:13, fontWeight:600,
                         background:"transparent", color:C.sub, border:`1px solid ${C.border}`,
                         cursor:"pointer" }}>
                取消
              </button>
              <button onClick={handlePost} disabled={!draft.trim() || posting}
                style={{ padding:"8px 18px", borderRadius:14, fontSize:13, fontWeight:700,
                         background: draft.trim() && !posting ? C.pri : C.light,
                         color:"white", border:"none",
                         cursor: draft.trim() && !posting ? "pointer" : "default" }}>
                {posting ? "发布中..." : "发布"}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setComposeOpen(true)}
            style={{ width:"100%", padding:"12px 16px", textAlign:"left",
                     borderRadius:18, fontSize:13, color:C.sub,
                     background:"white", border:`1px solid ${C.border}`,
                     cursor:"pointer",
                     boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
            ✏️ 分享 {pet?.name || "你的宠物"} 的日常...
          </button>
        )}
      </div>

      {/* 帖子列表 */}
      <div style={{ padding:"12px 14px 90px" }}>
        {loading && <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:30 }}>加载中...</div>}
        {err     && <div style={{ textAlign:"center", color:"#D94040", fontSize:12, padding:20 }}>❌ {err}</div>}
        {!loading && !err && posts.length === 0 && (
          <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:"50px 0" }}>
            还没有帖子，做第一个分享的人吧 🐾
          </div>
        )}

        {posts.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            user={user}
            pet={pet}
            isLiked={likedSet.has(p.id)}
            onToggleLike={() => handleToggleLike(p.id)}
            onDelete={() => handleDelete(p)}
            onReport={() => handleReport(p)}
          />
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   单条帖子卡片（含评论展开）
   ────────────────────────────────────────────── */
function PostCard({ post, user, pet, isLiked, onToggleLike, onDelete, onReport }) {
  const [expanded, setExpanded]   = useState(false);
  const [comments, setComments]   = useState([]);
  const [draft,    setDraft]      = useState("");
  const [posting,  setPosting]    = useState(false);
  const [loadingC, setLoadingC]   = useState(false);

  const avatar  = avatarForBreed(post.pet?.breed);
  const display = post.user?.username || "未命名宠物";
  const own     = post.user_id === user?.id;

  const handleExpand = async () => {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    setLoadingC(true);
    try {
      const list = await listComments(post.id);
      setComments(list);
    } finally {
      setLoadingC(false);
    }
  };

  const handleComment = async () => {
    if (!draft.trim() || !user?.id) return;
    setPosting(true);
    try {
      const { comment, flagged } = await createComment({
        postId: post.id, userId: user.id, petId: pet?.id, content: draft,
      });
      if (flagged) {
        alert("评论包含敏感词，已待审核，暂未公开显示");
      } else {
        setComments((prev) => [...prev, comment]);
      }
      setDraft("");
    } catch (e) {
      alert(e.message);
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async (c) => {
    if (c.user_id !== user?.id) return;
    if (!confirm("删除这条评论？")) return;
    try {
      await deleteOwnContent({ userId: user.id, targetType: "comment", targetId: c.id });
      setComments((prev) => prev.filter((x) => x.id !== c.id));
    } catch (e) { alert(e.message); }
  };

  return (
    <div style={{ background:"white", border:`1px solid ${C.border}`, borderRadius:18,
                  padding:14, marginBottom:12,
                  boxShadow:"0 2px 10px rgba(0,0,0,0.05)" }}>
      {/* 头部 */}
      <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
        <div style={{ width:38, height:38, borderRadius:"50%", background:C.tint,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:18, flexShrink:0 }}>
          {avatar}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{display}</div>
          <div style={{ fontSize:11, color:C.sub, marginTop:2 }}>{fmtRelTime(post.created_at)}</div>
        </div>
        <button onClick={own ? onDelete : onReport}
          style={{ background:"transparent", border:"none", cursor:"pointer",
                   color:C.sub, fontSize:14, padding:"2px 6px" }}>
          {own ? "🗑" : "⚐"}
        </button>
      </div>

      {/* 内容 */}
      <div style={{ marginTop:10, fontSize:14, color:C.text, lineHeight:1.6,
                    whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
        {post.content}
      </div>

      {/* 操作栏 */}
      <div style={{ display:"flex", gap:18, marginTop:12, paddingTop:10,
                    borderTop:`1px solid ${C.border}`, fontSize:12, color:C.sub }}>
        <button onClick={onToggleLike}
          style={{ background:"transparent", border:"none", cursor:"pointer",
                   display:"flex", alignItems:"center", gap:5,
                   color: isLiked ? C.pri : C.sub, fontWeight:isLiked ? 700 : 500, fontSize:12 }}>
          {isLiked ? "❤️" : "🤍"} {post.like_count}
        </button>
        <button onClick={handleExpand}
          style={{ background:"transparent", border:"none", cursor:"pointer",
                   display:"flex", alignItems:"center", gap:5, color:C.sub, fontSize:12 }}>
          💬 {post.comment_count}
        </button>
      </div>

      {/* 评论区 */}
      {expanded && (
        <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.border}` }}>
          {loadingC && <div style={{ fontSize:12, color:C.sub }}>加载评论...</div>}
          {comments.map((c) => (
            <div key={c.id} style={{ display:"flex", gap:8, marginBottom:8,
                                     alignItems:"flex-start" }}>
              <div style={{ width:26, height:26, borderRadius:"50%", background:C.tint,
                            display:"flex", alignItems:"center", justifyContent:"center",
                            fontSize:13, flexShrink:0 }}>
                {avatarForBreed(c.pet?.breed)}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, color:C.sub }}>
                  <span style={{ fontWeight:700, color:C.text }}>{c.user?.username || "未命名宠物"}</span>
                  <span style={{ marginLeft:6 }}>{fmtRelTime(c.created_at)}</span>
                </div>
                <div style={{ fontSize:13, color:C.text, marginTop:1, wordBreak:"break-word" }}>
                  {c.content}
                </div>
              </div>
              {c.user_id === user?.id && (
                <button onClick={() => handleDeleteComment(c)}
                  style={{ background:"transparent", border:"none", cursor:"pointer",
                           color:C.sub, fontSize:12 }}>🗑</button>
              )}
            </div>
          ))}
          {/* 发评论 */}
          <div style={{ display:"flex", gap:8, marginTop:8 }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleComment()}
              placeholder="写评论..."
              maxLength={1000}
              style={{ flex:1, borderRadius:14, padding:"7px 12px", fontSize:12,
                       border:`1.5px solid ${C.border}`, background:C.bg, color:C.text, outline:"none" }} />
            <button onClick={handleComment} disabled={!draft.trim() || posting}
              style={{ padding:"7px 14px", borderRadius:14, fontSize:12, fontWeight:700,
                       background: draft.trim() && !posting ? C.pri : C.light,
                       color:"white", border:"none",
                       cursor: draft.trim() && !posting ? "pointer" : "default" }}>
              发送
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
