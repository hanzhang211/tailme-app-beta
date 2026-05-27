"use client";

/**
 * components/community/PostFeed.jsx
 *
 * 帖子流：
 *  - 顶部 compose（折叠/展开），支持文字 + 最多 4 张图
 *  - 帖子卡片：头像 + 用户名 + 时间 + 内容 + 图片网格 + 点赞 + 评论
 *  - 评论树形（1 级嵌套）：每条评论可点赞、可回复
 */

import { useEffect, useRef, useState } from "react";
import {
  listPosts, createPost, uploadPostImage,
  likePost, unlikePost, getMyLikedPostIds,
  listComments, createComment,
  likeComment, unlikeComment, getMyLikedCommentIds,
  deleteOwnContent, reportContent,
} from "@/services/communityService";
import { avatarForBreed } from "@/services/breedAvatar";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", text:"#1A1006",
  sub:"#8A8074", light:"#D6D5D8", border:"#D6D5D8",
};

const MAX_IMAGES = 4;

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
  const [pickedFiles, setPickedFiles] = useState([]);    // File[] (本地)
  const [previews,    setPreviews]    = useState([]);    // dataURL[]
  const [posting,     setPosting]     = useState(false);
  const fileInputRef = useRef(null);

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

  /* ── 图片选择 ─────────────────────────────────────── */
  const handlePickImages = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = MAX_IMAGES - pickedFiles.length;
    const slice = files.slice(0, remaining);
    setPickedFiles((prev) => [...prev, ...slice]);
    slice.forEach((f) => {
      const r = new FileReader();
      r.onload = (ev) => setPreviews((prev) => [...prev, ev.target.result]);
      r.readAsDataURL(f);
    });
    e.target.value = ""; // 允许再次选同一个文件
  };

  const removePicked = (idx) => {
    setPickedFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  /* ── 发帖 ──────────────────────────────────────────── */
  const handlePost = async () => {
    if (!user?.id) return;
    if (!draft.trim() && pickedFiles.length === 0) return;
    setPosting(true);
    try {
      // 先上传图片
      let imageUrls = [];
      if (pickedFiles.length) {
        imageUrls = await Promise.all(
          pickedFiles.map((f) => uploadPostImage(f, user.id))
        );
      }
      const { post, flagged } = await createPost({
        userId: user.id, petId: pet?.id,
        content: draft.trim() || " ",   // 允许只发图
        imageUrls,
      });
      if (flagged) {
        alert("帖子包含敏感词，已待审核，暂未公开显示");
      } else {
        setPosts((prev) => [post, ...prev]);
      }
      setDraft("");
      setPickedFiles([]);
      setPreviews([]);
      setComposeOpen(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setPosting(false);
    }
  };

  /* ── 点赞 / 取消 ──────────────────────────────────── */
  const handleToggleLike = async (postId) => {
    if (!user?.id) return;
    const isLiked = likedSet.has(postId);
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
      {/* compose */}
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

            {/* 图片预览 */}
            {previews.length > 0 && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)",
                            gap:6, marginTop:10 }}>
                {previews.map((src, i) => (
                  <div key={i} style={{ position:"relative", aspectRatio:"1",
                                        borderRadius:10, overflow:"hidden",
                                        border:`1px solid ${C.border}` }}>
                    <img src={src} alt=""
                         style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    <button onClick={() => removePicked(i)}
                      style={{ position:"absolute", top:4, right:4,
                               width:20, height:20, borderRadius:"50%",
                               background:"rgba(0,0,0,0.6)", color:"white",
                               border:"none", cursor:"pointer", fontSize:12,
                               display:"flex", alignItems:"center", justifyContent:"center" }}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display:"flex", gap:10, marginTop:10, alignItems:"center" }}>
              <input ref={fileInputRef} type="file" accept="image/*" multiple
                     onChange={handlePickImages}
                     style={{ display:"none" }} />
              <button onClick={() => fileInputRef.current?.click()}
                disabled={pickedFiles.length >= MAX_IMAGES}
                style={{ padding:"8px 14px", borderRadius:14, fontSize:12, fontWeight:600,
                         background:C.tint, color:C.text,
                         border:"none",
                         cursor: pickedFiles.length >= MAX_IMAGES ? "default" : "pointer",
                         opacity: pickedFiles.length >= MAX_IMAGES ? 0.5 : 1 }}>
                📷 {pickedFiles.length}/{MAX_IMAGES}
              </button>
              <div style={{ flex:1 }} />
              <button onClick={() => {
                setComposeOpen(false); setDraft(""); setPickedFiles([]); setPreviews([]);
              }}
                style={{ padding:"8px 16px", borderRadius:14, fontSize:13, fontWeight:600,
                         background:"transparent", color:C.sub, border:`1px solid ${C.border}`,
                         cursor:"pointer" }}>
                取消
              </button>
              <button onClick={handlePost}
                disabled={(!draft.trim() && pickedFiles.length === 0) || posting}
                style={{ padding:"8px 18px", borderRadius:14, fontSize:13, fontWeight:700,
                         background: (draft.trim() || pickedFiles.length) && !posting ? C.pri : C.light,
                         color:"white", border:"none",
                         cursor: (draft.trim() || pickedFiles.length) && !posting ? "pointer" : "default" }}>
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

      {/* 列表 */}
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

/* ──────────────────────────────────────────────────────────
   单条帖子卡片
   ────────────────────────────────────────────────────────── */
function PostCard({ post, user, pet, isLiked, onToggleLike, onDelete, onReport }) {
  const [expanded, setExpanded]   = useState(false);
  const [comments, setComments]   = useState([]);
  const [likedCs,  setLikedCs]    = useState(new Set());
  const [draft,    setDraft]      = useState("");
  const [posting,  setPosting]    = useState(false);
  const [loadingC, setLoadingC]   = useState(false);
  const [replyTo,  setReplyTo]    = useState(null); // 顶级评论 id（嵌套时用）
  const [viewer,   setViewer]     = useState(null); // 图片大图 src

  const avatar  = avatarForBreed(post.pet?.breed);
  const display = post.user?.username || "未命名宠物";
  const own     = post.user_id === user?.id;
  const images  = Array.isArray(post.image_urls) ? post.image_urls : [];

  const handleExpand = async () => {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    setLoadingC(true);
    try {
      const list = await listComments(post.id);
      setComments(list);
      if (user?.id) {
        const liked = await getMyLikedCommentIds(user.id, list.map((c) => c.id));
        setLikedCs(liked);
      }
    } finally {
      setLoadingC(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!draft.trim() || !user?.id) return;
    setPosting(true);
    try {
      const { comment, flagged } = await createComment({
        postId: post.id, userId: user.id, petId: pet?.id,
        content: draft, parentId: replyTo,
      });
      if (flagged) {
        alert("评论包含敏感词，已待审核，暂未公开显示");
      } else {
        setComments((prev) => [...prev, comment]);
        if (!replyTo) {
          // 只有顶级评论才更新帖子 comment_count；二级回复 trigger 也会算
        }
      }
      setDraft("");
      setReplyTo(null);
    } catch (e) {
      alert(e.message);
    } finally {
      setPosting(false);
    }
  };

  const handleToggleCommentLike = async (commentId) => {
    if (!user?.id) return;
    const isL = likedCs.has(commentId);
    setLikedCs((prev) => {
      const n = new Set(prev);
      if (isL) n.delete(commentId); else n.add(commentId);
      return n;
    });
    setComments((prev) => prev.map((c) =>
      c.id === commentId ? { ...c, like_count: (c.like_count || 0) + (isL ? -1 : 1) } : c
    ));
    try {
      if (isL) await unlikeComment(commentId, user.id);
      else     await likeComment(commentId, user.id);
    } catch (e) {
      setLikedCs((prev) => {
        const n = new Set(prev);
        if (isL) n.add(commentId); else n.delete(commentId);
        return n;
      });
      alert(e.message);
    }
  };

  const handleDeleteComment = async (c) => {
    if (c.user_id !== user?.id) return;
    if (!confirm("删除这条评论？")) return;
    try {
      await deleteOwnContent({ userId: user.id, targetType: "comment", targetId: c.id });
      setComments((prev) => prev.filter((x) => x.id !== c.id && x.parent_id !== c.id));
    } catch (e) { alert(e.message); }
  };

  // 构造树形：顶级 + 各顶级下的 replies
  const topLevels = comments.filter((c) => !c.parent_id);
  const repliesByParent = comments.reduce((map, c) => {
    if (c.parent_id) {
      if (!map[c.parent_id]) map[c.parent_id] = [];
      map[c.parent_id].push(c);
    }
    return map;
  }, {});

  return (
    <div style={{ background:"white", border:`1px solid ${C.border}`, borderRadius:18,
                  padding:14, marginBottom:12,
                  boxShadow:"0 2px 10px rgba(0,0,0,0.05)" }}>
      {/* header */}
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

      {/* content */}
      {post.content && post.content.trim() && (
        <div style={{ marginTop:10, fontSize:14, color:C.text, lineHeight:1.6,
                      whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
          {post.content}
        </div>
      )}

      {/* image grid */}
      {images.length > 0 && (
        <div style={{ marginTop:10,
                      display:"grid",
                      gridTemplateColumns: images.length === 1 ? "1fr" : "1fr 1fr",
                      gap:6 }}>
          {images.slice(0, 4).map((url, i) => (
            <div key={i} onClick={() => setViewer(url)}
              style={{ aspectRatio: images.length === 1 ? "16/10" : "1",
                       borderRadius:12, overflow:"hidden", cursor:"zoom-in",
                       background:C.tint }}>
              <img src={url} alt=""
                style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
            </div>
          ))}
        </div>
      )}

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
          {!loadingC && topLevels.length === 0 && (
            <div style={{ fontSize:12, color:C.sub, textAlign:"center", padding:"8px 0" }}>
              还没人评论，来抢沙发 🛋
            </div>
          )}

          {topLevels.map((c) => (
            <CommentItem
              key={c.id} c={c} user={user}
              replies={repliesByParent[c.id] || []}
              isLiked={likedCs.has(c.id)}
              likedReplies={likedCs}
              onToggleLike={handleToggleCommentLike}
              onDelete={handleDeleteComment}
              onReply={(parentId) => { setReplyTo(parentId); setDraft(""); }}
              replyingTo={replyTo === c.id}
            />
          ))}

          {/* 评论输入 */}
          <div style={{ display:"flex", flexDirection:"column", marginTop:8, gap:4 }}>
            {replyTo && (
              <div style={{ fontSize:11, color:C.sub, paddingLeft:4 }}>
                正在回复 <span style={{ color:C.pri, fontWeight:600 }}>
                  @{comments.find((c) => c.id === replyTo)?.user?.username || "..."}
                </span>
                <button onClick={() => setReplyTo(null)}
                  style={{ marginLeft:8, background:"transparent", border:"none",
                           color:C.sub, fontSize:11, cursor:"pointer" }}>取消</button>
              </div>
            )}
            <div style={{ display:"flex", gap:8 }}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmitComment()}
                placeholder={replyTo ? "回复..." : "写评论..."}
                maxLength={1000}
                style={{ flex:1, borderRadius:14, padding:"7px 12px", fontSize:12,
                         border:`1.5px solid ${C.border}`, background:C.bg, color:C.text, outline:"none" }} />
              <button onClick={handleSubmitComment} disabled={!draft.trim() || posting}
                style={{ padding:"7px 14px", borderRadius:14, fontSize:12, fontWeight:700,
                         background: draft.trim() && !posting ? C.pri : C.light,
                         color:"white", border:"none",
                         cursor: draft.trim() && !posting ? "pointer" : "default" }}>
                发送
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 图片大图查看 */}
      {viewer && (
        <div onClick={() => setViewer(null)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)",
                   zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center",
                   cursor:"zoom-out", padding:20 }}>
          <img src={viewer} alt=""
            style={{ maxWidth:"100%", maxHeight:"100%", objectFit:"contain" }} />
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   单条评论（含其下回复）
   ────────────────────────────────────────────────────────── */
function CommentItem({ c, user, replies, isLiked, likedReplies, onToggleLike, onDelete, onReply, replyingTo }) {
  return (
    <div style={{ marginBottom:10 }}>
      <CommentRow c={c} user={user}
        isLiked={isLiked}
        onToggleLike={() => onToggleLike(c.id)}
        onDelete={() => onDelete(c)}
        onReply={() => onReply(c.id)}
        replyHighlight={replyingTo}
        indent={0} />

      {/* 二级回复（统一挂在顶级 c.id 下） */}
      {replies.map((r) => (
        <CommentRow key={r.id} c={r} user={user}
          isLiked={likedReplies.has(r.id)}
          onToggleLike={() => onToggleLike(r.id)}
          onDelete={() => onDelete(r)}
          onReply={() => onReply(c.id)}   // 回复仍挂在顶级
          replyHighlight={false}
          indent={1}
          replyToUsername={c.user?.username} />
      ))}
    </div>
  );
}

function CommentRow({ c, user, isLiked, onToggleLike, onDelete, onReply, replyHighlight, indent, replyToUsername }) {
  return (
    <div style={{ display:"flex", gap:8, alignItems:"flex-start",
                  paddingLeft: indent ? 32 : 0, marginBottom:6 }}>
      <div style={{ width: indent ? 22 : 26, height: indent ? 22 : 26, borderRadius:"50%",
                    background:C.tint,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize: indent ? 11 : 13, flexShrink:0 }}>
        {avatarForBreed(c.pet?.breed)}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:11, color:C.sub }}>
          <span style={{ fontWeight:700, color:C.text }}>{c.user?.username || "未命名宠物"}</span>
          {indent === 1 && replyToUsername && (
            <span style={{ color:C.sub }}> 回复 <span style={{ color:C.pri, fontWeight:600 }}>@{replyToUsername}</span></span>
          )}
          <span style={{ marginLeft:6 }}>{fmtRelTime(c.created_at)}</span>
        </div>
        <div style={{ fontSize:13, color:C.text, marginTop:1, wordBreak:"break-word" }}>
          {c.content}
        </div>
        <div style={{ display:"flex", gap:14, marginTop:3, fontSize:11, color:C.sub }}>
          <button onClick={onToggleLike}
            style={{ background:"transparent", border:"none", cursor:"pointer",
                     color: isLiked ? C.pri : C.sub, fontWeight: isLiked ? 700 : 500,
                     fontSize:11, padding:0 }}>
            {isLiked ? "❤️" : "🤍"} {c.like_count || 0}
          </button>
          <button onClick={onReply}
            style={{ background:"transparent", border:"none", cursor:"pointer",
                     color: replyHighlight ? C.pri : C.sub,
                     fontWeight: replyHighlight ? 700 : 500,
                     fontSize:11, padding:0 }}>
            ↩ 回复
          </button>
          {c.user_id === user?.id && (
            <button onClick={onDelete}
              style={{ background:"transparent", border:"none", cursor:"pointer",
                       color:C.sub, fontSize:11, padding:0 }}>🗑 删除</button>
          )}
        </div>
      </div>
    </div>
  );
}
