"use client";

/**
 * components/community/PostDetail.jsx
 *
 * 帖子详情 modal：
 *  - 全部图片（图片帖横向滚动）/ 文字卡片背景（文字帖）
 *  - 标题 + 正文
 *  - 点赞 + 评论 + 举报 + 删除（owner）
 *  - 评论树形（1 级嵌套），可点赞/回复/删除
 */

import { useEffect, useState } from "react";
import {
  getPostById,
  listComments, createComment,
  likeComment, unlikeComment, getMyLikedCommentIds,
  likePost, unlikePost,
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

export default function PostDetail({
  postId, user, pet, initialLiked,
  onLikeChange, onDeleted, onClose, toast,
}) {
  const [post,     setPost]     = useState(null);
  const [loadingPost, setLoadingPost] = useState(true);
  const [isLiked,  setIsLiked]  = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [likedCs,  setLikedCs]  = useState(new Set());
  const [loadingC, setLoadingC] = useState(true);

  const [draft,    setDraft]    = useState("");
  const [posting,  setPosting]  = useState(false);
  const [replyTo,  setReplyTo]  = useState(null);

  const [viewerIdx, setViewerIdx] = useState(null);

  const avatar  = avatarForBreed(post?.pet?.breed);
  const display = post?.user?.username || "未命名宠物";
  const own     = post?.user_id === user?.id;
  const images  = Array.isArray(post?.image_urls) ? post.image_urls : [];
  const isText  = post?.post_type === "text" || images.length === 0;

  /* 拉详情 + 评论（详情拉完才显示，避免空白闪烁） */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [p, list] = await Promise.all([
          getPostById(postId),
          listComments(postId),
        ]);
        if (!alive) return;
        setPost(p);
        setLikeCount(p?.like_count || 0);
        setComments(list);
        if (user?.id && list.length) {
          const liked = await getMyLikedCommentIds(user.id, list.map((c) => c.id));
          if (alive) setLikedCs(liked);
        }
      } catch (e) {
        if (alive) toast?.(e.message, "error");
      } finally {
        if (alive) { setLoadingPost(false); setLoadingC(false); }
      }
    })();
    return () => { alive = false; };
  }, [postId, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* esc / 系统返回关闭 */
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const togglePostLike = async () => {
    if (!user?.id) return;
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    onLikeChange?.(postId, !wasLiked, wasLiked ? -1 : 1);
    try {
      if (wasLiked) await unlikePost(postId, user.id);
      else          await likePost(postId, user.id);
    } catch (e) {
      setIsLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
      onLikeChange?.(postId, wasLiked, wasLiked ? 1 : -1);
      toast?.(e.message, "error");
    }
  };

  const submitComment = async () => {
    if (!draft.trim() || !user?.id || posting) return;
    setPosting(true);
    try {
      const { comment, flagged } = await createComment({
        postId: postId, userId: user.id, petId: pet?.id,
        content: draft, parentId: replyTo,
      });
      if (flagged) toast?.("评论已待审核", "warn");
      else setComments((prev) => [...prev, comment]);
      setDraft("");
      setReplyTo(null);
    } catch (e) {
      toast?.(e.message, "error");
    } finally {
      setPosting(false);
    }
  };

  const toggleCommentLike = async (commentId) => {
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
      toast?.(e.message, "error");
    }
  };

  const deleteCommentLocal = async (c) => {
    if (c.user_id !== user?.id) return;
    if (!confirm("删除这条评论？")) return;
    try {
      await deleteOwnContent({ userId: user.id, targetType: "comment", targetId: c.id });
      setComments((prev) => prev.filter((x) => x.id !== c.id && x.parent_id !== c.id));
    } catch (e) { toast?.(e.message, "error"); }
  };

  const handleDeletePost = async () => {
    if (!confirm("删除这条帖子？此操作不可撤销。")) return;
    try {
      await deleteOwnContent({ userId: user.id, targetType: "post", targetId: postId });
      onDeleted?.(postId);
      onClose?.();
      toast?.("帖子已删除", "info");
    } catch (e) { toast?.(e.message, "error"); }
  };

  const handleReport = async () => {
    const reason = prompt("举报理由（可选）");
    if (reason === null) return;
    try {
      await reportContent({
        reporterId: user.id, targetType: "post", targetId: postId, reason,
      });
      toast?.("已举报，管理员会处理", "info");
    } catch (e) { toast?.(e.message, "error"); }
  };

  const topLevels = comments.filter((c) => !c.parent_id);
  const repliesByParent = comments.reduce((map, c) => {
    if (c.parent_id) (map[c.parent_id] ||= []).push(c);
    return map;
  }, {});

  /* ── render ───────────────────────────────────────── */
  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose?.()}
      style={{ position:"fixed", inset:0, zIndex:150, background:"rgba(0,0,0,0.45)",
               display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, height:"95vh",
                    background:C.bg, borderRadius:"22px 22px 0 0",
                    display:"flex", flexDirection:"column",
                    animation:"detail-up .25s ease-out", overflow:"hidden" }}>

        {/* 头部 */}
        <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}`,
                      display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          <button onClick={onClose}
            style={{ background:"transparent", border:"none", fontSize:18, color:C.text,
                     cursor:"pointer", padding:"4px 6px" }}>
            ←
          </button>
          <div style={{ width:32, height:32, borderRadius:"50%", background:C.tint,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:16 }}>
            {avatar}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{display}</div>
            <div style={{ fontSize:10, color:C.sub }}>{post ? fmtRelTime(post.created_at) : ""}</div>
          </div>
          {post && (
            <button onClick={own ? handleDeletePost : handleReport}
              style={{ background:"transparent", border:"none", cursor:"pointer",
                       color:C.sub, fontSize:14 }}>
              {own ? "🗑" : "⚐"}
            </button>
          )}
        </div>

        {loadingPost && (
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
                        color:C.sub, fontSize:13 }}>
            加载中…
          </div>
        )}

        {!loadingPost && !post && (
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
                        color:C.sub, fontSize:13 }}>
            帖子不存在或已被删除
          </div>
        )}

        {!loadingPost && post && (<>
        {/* 滚动内容 */}
        <div style={{ flex:1, overflowY:"auto" }}>

          {/* 媒体 / 文字卡 */}
          {isText ? (
            <div style={{ background: post.text_bg_color || C.tint,
                          padding:"30px 24px", minHeight:200 }}>
              {post.title && (
                <div style={{ fontSize:22, fontWeight:800,
                              color: post.text_bg_color === "#E68645" ? "white" : C.text,
                              marginBottom:12, wordBreak:"break-word" }}>
                  {post.title}
                </div>
              )}
              <div style={{ fontSize:15, lineHeight:1.7,
                            color: post.text_bg_color === "#E68645" ? "white" : C.text,
                            whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
                {post.content}
              </div>
            </div>
          ) : (
            <div style={{ display:"flex", overflowX:"auto", scrollSnapType:"x mandatory",
                          background:"#000" }}>
              {images.map((url, i) => (
                <div key={i} onClick={() => setViewerIdx(i)}
                  style={{ flex:"0 0 100%", scrollSnapAlign:"start",
                           aspectRatio:"1", display:"flex",
                           alignItems:"center", justifyContent:"center",
                           cursor:"zoom-in" }}>
                  <img src={url} alt=""
                    style={{ maxWidth:"100%", maxHeight:"100%", objectFit:"contain" }} />
                </div>
              ))}
            </div>
          )}

          {/* 标题 + 正文（图片帖） */}
          {!isText && (
            <div style={{ padding:"16px 18px 8px" }}>
              {post.title && (
                <div style={{ fontSize:17, fontWeight:800, color:C.text,
                              marginBottom:8, wordBreak:"break-word" }}>
                  {post.title}
                </div>
              )}
              {post.content?.trim() && (
                <div style={{ fontSize:14, lineHeight:1.65, color:C.text,
                              whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
                  {post.content}
                </div>
              )}
            </div>
          )}

          {/* 互动栏 */}
          <div style={{ padding:"12px 18px", borderBottom:`1px solid ${C.border}`,
                        display:"flex", gap:18, fontSize:13 }}>
            <button onClick={togglePostLike}
              style={{ background:"transparent", border:"none", cursor:"pointer",
                       display:"flex", alignItems:"center", gap:6,
                       color: isLiked ? C.pri : C.sub,
                       fontWeight: isLiked ? 700 : 500, fontSize:13 }}>
              {isLiked ? "❤️" : "🤍"} {likeCount}
            </button>
            <div style={{ display:"flex", alignItems:"center", gap:6, color:C.sub, fontSize:13 }}>
              💬 {topLevels.length + Object.values(repliesByParent).reduce((s, a) => s+a.length, 0)}
            </div>
          </div>

          {/* 评论列表 */}
          <div style={{ padding:"14px 18px 130px" }}>
            <div style={{ fontSize:12, color:C.sub, marginBottom:10, fontWeight:600 }}>
              评论 · {topLevels.length}
            </div>
            {loadingC && <div style={{ fontSize:12, color:C.sub }}>加载中…</div>}
            {!loadingC && topLevels.length === 0 && (
              <div style={{ fontSize:13, color:C.sub, textAlign:"center", padding:"24px 0" }}>
                还没人评论，来抢沙发 🛋
              </div>
            )}

            {topLevels.map((c) => (
              <CommentBlock
                key={c.id} c={c} user={user}
                replies={repliesByParent[c.id] || []}
                isLiked={likedCs.has(c.id)} likedReplies={likedCs}
                onToggleLike={toggleCommentLike}
                onDelete={deleteCommentLocal}
                onReply={(parentId) => { setReplyTo(parentId); setDraft(""); }}
                replyHighlight={replyTo === c.id}
              />
            ))}
          </div>
        </div>

        {/* 底部输入框 */}
        <div style={{ background:"white", borderTop:`1px solid ${C.border}`,
                      padding:"10px 14px 16px", flexShrink:0 }}>
          {replyTo && (
            <div style={{ fontSize:11, color:C.sub, paddingLeft:4, marginBottom:5 }}>
              正在回复 <span style={{ color:C.pri, fontWeight:600 }}>
                @{comments.find((c) => c.id === replyTo)?.user?.username || "..."}
              </span>
              <button onClick={() => setReplyTo(null)}
                style={{ marginLeft:8, background:"transparent", border:"none",
                         color:C.sub, fontSize:11, cursor:"pointer" }}>取消</button>
            </div>
          )}
          <div style={{ display:"flex", gap:8 }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitComment()}
              placeholder={replyTo ? "回复…" : "写评论…"}
              maxLength={1000} disabled={posting}
              style={{ flex:1, borderRadius:18, padding:"10px 14px", fontSize:13,
                       border:`1.5px solid ${C.border}`, background:C.bg,
                       color:C.text, outline:"none" }} />
            <button onClick={submitComment} disabled={!draft.trim() || posting}
              style={{ padding:"0 16px", borderRadius:18, fontSize:13, fontWeight:700,
                       background: draft.trim() && !posting ? C.pri : C.light,
                       color:"white", border:"none",
                       cursor: draft.trim() && !posting ? "pointer" : "default" }}>
              {posting ? "…" : "发送"}
            </button>
          </div>
        </div>

        {/* 图片大图查看 */}
        {viewerIdx !== null && (
          <div onClick={() => setViewerIdx(null)}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.94)",
                     zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center",
                     cursor:"zoom-out", padding:20 }}>
            <img src={images[viewerIdx]} alt=""
              style={{ maxWidth:"100%", maxHeight:"100%", objectFit:"contain" }} />
          </div>
        )}
        </>)}
      </div>
      <style>{`@keyframes detail-up { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}

/* ── 单条评论（含其下回复） ─────────────────────────── */
function CommentBlock({ c, user, replies, isLiked, likedReplies, onToggleLike, onDelete, onReply, replyHighlight }) {
  return (
    <div style={{ marginBottom:14 }}>
      <CommentRow c={c} user={user}
        isLiked={isLiked}
        onToggleLike={() => onToggleLike(c.id)}
        onDelete={() => onDelete(c)}
        onReply={() => onReply(c.id)}
        replyHighlight={replyHighlight}
        indent={0} />
      {replies.map((r) => (
        <CommentRow key={r.id} c={r} user={user}
          isLiked={likedReplies.has(r.id)}
          onToggleLike={() => onToggleLike(r.id)}
          onDelete={() => onDelete(r)}
          onReply={() => onReply(c.id)}
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
                  paddingLeft: indent ? 38 : 0, marginBottom:8 }}>
      <div style={{ width: indent ? 26 : 32, height: indent ? 26 : 32, borderRadius:"50%",
                    background:C.tint,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize: indent ? 13 : 15, flexShrink:0 }}>
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
        <div style={{ fontSize:13.5, color:C.text, marginTop:2, lineHeight:1.55,
                      wordBreak:"break-word" }}>
          {c.content}
        </div>
        <div style={{ display:"flex", gap:16, marginTop:4, fontSize:11 }}>
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
                       color:C.sub, fontSize:11, padding:0 }}>🗑</button>
          )}
        </div>
      </div>
    </div>
  );
}
