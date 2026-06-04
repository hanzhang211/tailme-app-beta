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

import { useEffect, useRef, useState } from "react";
import {
  getPostById,
  listComments, createComment,
  likeComment, unlikeComment, getMyLikedCommentIds,
  likePost, unlikePost,
  deleteOwnContent, reportContent,
  subscribeComments, unsubscribeChannel,
  isFollowing, followUser, unfollowUser,
} from "@/services/communityService";
import PetAvatar from "@/components/PetAvatar";
import PawLikeIcon from "@/components/icons/PawLikeIcon";
import PetTrashIcon from "@/components/icons/PetTrashIcon";
import EmptyCommentsDogCat from "@/components/illustrations/EmptyCommentsDogCat";
import { fmtDuration } from "@/services/videoThumb";

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
  postId, user, pet, initialLiked, initialIsVideo, initialPost,
  onLikeChange, onDeleted, onClose, toast, onOpenProfile, onOpenTopic,
}) {
  const [post,     setPost]     = useState(initialPost || null);
  const [loadingPost, setLoadingPost] = useState(!initialPost); // 有初始数据则不整屏加载
  const [isLiked,  setIsLiked]  = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialPost?.like_count || 0);
  const [comments, setComments] = useState([]);
  const [likedCs,  setLikedCs]  = useState(new Set());
  const [loadingC, setLoadingC] = useState(true);

  const [draft,    setDraft]    = useState("");
  const [posting,  setPosting]  = useState(false);
  const [replyTo,  setReplyTo]  = useState(null);

  const [viewerIdx, setViewerIdx] = useState(null);
  const [viewerSrc, setViewerSrc] = useState(null);
  const [following, setFollowing] = useState(false);

  const display = post?.user?.username || "未命名宠物";
  const own     = post?.user_id === user?.id;

  // 关注（仅视频沉浸页用到；非本人时加载关注态）
  useEffect(() => {
    if (!post?.user_id || own || !user?.id) return;
    let alive = true;
    isFollowing(user.id, post.user_id).then((f) => { if (alive) setFollowing(f); }).catch(() => {});
    return () => { alive = false; };
  }, [post?.user_id, own, user?.id]);

  const toggleFollow = async () => {
    if (!user?.id || own || !post?.user_id) return;
    const next = !following;
    setFollowing(next);
    try { next ? await followUser(user.id, post.user_id) : await unfollowUser(user.id, post.user_id); }
    catch { setFollowing(!next); }
  };

  // 详情图：优先 display_image_urls（1600px 压缩），老帖回退 image_urls
  const images = (Array.isArray(post?.display_image_urls) && post.display_image_urls.length)
    ? post.display_image_urls
    : (Array.isArray(post?.image_urls) ? post.image_urls : []);

  // 每张图对应的缩略图（用于模糊占位）
  const thumbs = (Array.isArray(post?.thumbnail_urls) && post.thumbnail_urls.length)
    ? post.thumbnail_urls
    : [];

  // 有序媒体（图片/视频）；存在则优先用它渲染
  const media = Array.isArray(post?.media_items) ? post.media_items : [];
  const isText  = post?.post_type === "text" || (images.length === 0 && media.length === 0);
  const firstAspect = Number(post?.cover_aspect_ratio) > 0 ? Number(post.cover_aspect_ratio) : 1;

  /* 拉详情 + 评论（详情拉完才显示，避免空白闪烁） */
  useEffect(() => {
    let alive = true;
    // 帖子主体：有 initialPost 先用它即时渲染，后台拉完整（高清图等）再悄悄替换
    getPostById(postId)
      .then((p) => { if (alive && p) { setPost(p); setLikeCount(p.like_count || 0); } })
      .catch((e) => { if (alive && !initialPost) toast?.(e.message, "error"); })
      .finally(() => { if (alive) setLoadingPost(false); });
    // 评论：独立加载，不挡住帖子主体（评论区自己显示加载/空状态）
    setLoadingC(true);
    listComments(postId)
      .then(async (list) => {
        if (!alive) return;
        setComments(list);
        if (user?.id && list.length) {
          const liked = await getMyLikedCommentIds(user.id, list.map((c) => c.id));
          if (alive) setLikedCs(liked);
        }
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoadingC(false); });
    return () => { alive = false; };
  }, [postId, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* esc / 系统返回关闭 */
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* 评论 Realtime：当前帖子的 comments INSERT / DELETE */
  useEffect(() => {
    if (!postId) return;
    const channel = subscribeComments(postId, {
      onInsert: (newC) => {
        setComments((prev) => prev.some((c) => c.id === newC.id) ? prev : [...prev, newC]);
      },
      onDelete: (id) => {
        setComments((prev) => prev.filter((c) => c.id !== id && c.parent_id !== id));
      },
    });
    return () => unsubscribeChannel(channel);
  }, [postId]);

  const togglePostLike = async () => {
    if (!user?.id) return;
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount((c) => Math.max(0, c + (wasLiked ? -1 : 1)));
    onLikeChange?.(postId, !wasLiked, wasLiked ? -1 : 1);
    try {
      if (wasLiked) await unlikePost(postId, user.id);
      else          await likePost(postId, user.id);
    } catch (e) {
      setIsLiked(wasLiked);
      setLikeCount((c) => Math.max(0, c + (wasLiked ? 1 : -1)));
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
      if (flagged) {
        toast?.("评论已待审核", "warn");
      } else {
        setComments((prev) => [...prev, comment]);
        toast?.(replyTo ? "回复成功 🎉" : "评论成功 🎉", "success");
      }
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
      c.id === commentId ? { ...c, like_count: Math.max(0, (c.like_count || 0) + (isL ? -1 : 1)) } : c
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

  /* ── 视频帖 → 全屏沉浸式（图片/文字帖走下面原布局）── */
  const videoMedia = media.find((m) => m.type === "video");
  const isVideoPost = post ? (media[0]?.type === "video") : !!initialIsVideo;
  if (isVideoPost) {
    return (
      <ImmersiveVideo
        loadingPost={loadingPost}
        videoUrl={videoMedia?.url || null}
        posterUrl={videoMedia?.thumbnail_url || post?.cover_thumbnail_url || null}
        pet={post?.pet} avatarOverride={post?.user?.avatar_url}
        display={display} own={own} hashtags={post?.hashtags}
        title={post?.title} content={post?.content}
        isLiked={isLiked} likeCount={likeCount} onToggleLike={togglePostLike}
        commentCount={comments.length}
        draft={draft} setDraft={setDraft} submitComment={submitComment} posting={posting}
        following={following} onToggleFollow={toggleFollow}
        onClose={onClose}
        onOpenProfile={() => { if (onOpenProfile && post?.user_id) { onOpenProfile(post.user_id); onClose?.(); } }}
        onOpenTopic={onOpenTopic ? (tag) => { onOpenTopic(tag); onClose?.(); } : null}
        onMore={own ? handleDeletePost : handleReport}
      />
    );
  }

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
        <div style={{ padding:"12px 16px", background:"white", borderBottom:`1px solid ${C.border}`,
                      display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          <button onClick={onClose}
            style={{ background:"transparent", border:"none", fontSize:18, color:C.text,
                     cursor:"pointer", padding:"4px 6px" }}>
            ←
          </button>
          <div onClick={() => { if (onOpenProfile && post?.user_id) { onOpenProfile(post.user_id); onClose?.(); } }}
            style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0,
                     cursor: (onOpenProfile && post?.user_id) ? "pointer" : "default" }}>
            <PetAvatar pet={post?.pet} overrideUrl={post?.user?.avatar_url} size={32} bg={C.tint} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{display}</div>
              <div style={{ fontSize:10, color:C.sub }}>{post ? fmtRelTime(post.created_at) : ""}</div>
            </div>
          </div>
          {post && (
            <button onClick={own ? handleDeletePost : handleReport}
              style={{ background:"transparent", border:"none", cursor:"pointer",
                       color:C.sub, fontSize:14, display:"flex", alignItems:"center", padding:0 }}>
              {own ? <PetTrashIcon size={20} /> : "⚐"}
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
            <div style={{ margin:"12px 14px 0", borderRadius:18, overflow:"hidden",
                          background: post.text_bg_color || C.tint,
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
          ) : media.length > 0 ? (
            <div style={{ margin:"12px 14px 0", borderRadius:18, overflow:"hidden", background:"#000" }}>
            <div style={{ display:"flex", overflowX:"auto", scrollSnapType:"x mandatory",
                          background:"#000" }}>
              {media.map((m, i) => {
                const ar = i === 0 ? firstAspect : 1;
                if (m.type === "video") {
                  return (
                    <div key={i} style={{ flex:"0 0 100%", scrollSnapAlign:"start", background:"#000" }}>
                      <DetailVideo src={m.url} poster={m.thumbnail_url || null} />
                    </div>
                  );
                }
                return (
                  <DetailImage key={i} src={m.url} thumb={m.thumbnail_url || null}
                    aspectRatio={ar} eager={i === 0} onClick={() => setViewerSrc(m.url)} />
                );
              })}
            </div>
            </div>
          ) : (
            <div style={{ margin:"12px 14px 0", borderRadius:18, overflow:"hidden", background:"#000" }}>
            <div style={{ display:"flex", overflowX:"auto", scrollSnapType:"x mandatory",
                          background:"#000" }}>
              {images.map((url, i) => {
                // thumbnail 来源：第一张优先用 cover_thumbnail_url（最稳），
                // 否则按 index 取 thumbnail_urls；都没有时（老帖）退回 display 自身
                const thumb = (i === 0 ? (post.cover_thumbnail_url || thumbs[0]) : thumbs[i]) || null;
                const ar = i === 0 ? firstAspect : 1;   // 后续图未存 aspect，先用 1:1 容器
                return (
                  <DetailImage
                    key={i}
                    src={url}
                    thumb={thumb}
                    aspectRatio={ar}
                    eager={i === 0}
                    onClick={() => setViewerIdx(i)}
                  />
                );
              })}
            </div>
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

          {/* #话题 */}
          {Array.isArray(post.hashtags) && post.hashtags.length > 0 && (
            <div style={{ padding: isText ? "12px 18px 4px" : "0 18px 6px",
                          display:"flex", flexWrap:"wrap", gap:8 }}>
              {post.hashtags.map((tag) => (
                <button key={tag}
                  onClick={() => { if (onOpenTopic) { onOpenTopic(tag); onClose?.(); } }}
                  style={{ fontSize:12.5, fontWeight:600, color:C.pri, background:C.tint,
                           border:"none", borderRadius:999, padding:"4px 12px",
                           cursor: onOpenTopic ? "pointer" : "default" }}>
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* 互动栏 */}
          <div style={{ padding:"12px 18px", borderBottom:`1px solid ${C.border}`,
                        display:"flex", gap:24, fontSize:13 }}>
            <button onClick={togglePostLike}
              style={{ background:"transparent", border:"none", cursor:"pointer",
                       display:"flex", alignItems:"center", gap:6,
                       color: isLiked ? "#E85D5D" : C.sub,
                       fontWeight: isLiked ? 700 : 500, fontSize:13 }}>
              <span key={isLiked ? "on" : "off"}
                style={{ display:"inline-flex", animation: isLiked ? "pawpop .2s ease" : "none" }}>
                <PawLikeIcon filled={isLiked} size={22} />
              </span>
              {likeCount}
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
            {!loadingC && topLevels.length === 0 && <CommentEmpty />}

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
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            {/* 左侧：帖子点赞（复用现有逻辑，与上方互动栏同步）*/}
            <button onClick={togglePostLike}
              title={isLiked ? "取消点赞" : "点赞"}
              style={{ width:44, height:44, borderRadius:999, flexShrink:0,
                       background:C.tint, border:"none", cursor:"pointer",
                       display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span key={isLiked ? "on" : "off"}
                style={{ display:"inline-flex", animation: isLiked ? "pawpop .2s ease" : "none" }}>
                <PawLikeIcon filled={isLiked} size={24} />
              </span>
            </button>
            <input value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitComment()}
              placeholder={replyTo ? "回复…" : "写评论..."}
              maxLength={1000} disabled={posting}
              style={{ flex:1, height:44, borderRadius:999, padding:"0 18px", fontSize:14, minWidth:0,
                       border:`1px solid ${C.border}`, background:C.bg,
                       color:C.text, outline:"none", boxSizing:"border-box" }} />
            <button onClick={submitComment} disabled={!draft.trim() || posting}
              style={{ height:44, padding:"0 22px", borderRadius:999, fontSize:14, fontWeight:700,
                       flexShrink:0,
                       background: draft.trim() && !posting ? C.pri : C.light,
                       color:"white", border:"none",
                       cursor: draft.trim() && !posting ? "pointer" : "default" }}>
              {posting ? "…" : "发送"}
            </button>
          </div>
        </div>

        {/* 图片大图查看 */}
        {(viewerSrc || viewerIdx !== null) && (
          <div onClick={() => { setViewerIdx(null); setViewerSrc(null); }}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.94)",
                     zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center",
                     cursor:"zoom-out", padding:20 }}>
            <img src={viewerSrc || images[viewerIdx]} alt=""
              style={{ maxWidth:"100%", maxHeight:"100%", objectFit:"contain" }} />
          </div>
        )}
        </>)}
      </div>
      <style>{`@keyframes detail-up { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}

/* ── 空评论状态：一猫一狗依偎在小窝上 ───────────────── */
function CommentEmpty() {
  return (
    <div style={{ textAlign:"center", padding:"30px 0 26px" }}>
      <EmptyCommentsDogCat className="w-44 mx-auto" />
      <div style={{ fontSize:14, fontWeight:600, color:C.text, marginTop:14 }}>这里还空着，快来抢个小窝吧</div>
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

/* ── 详情页单张图片：模糊缩略图占位 → 高清图渐显 ─────────── */
/* ────────────────────────────────────────────────────────────
   全屏沉浸式视频详情（仅视频帖）
   ──────────────────────────────────────────────────────────── */
function ImmersiveVideo({
  loadingPost, videoUrl, posterUrl, pet, avatarOverride, display, own, hashtags, title, content,
  isLiked, likeCount, onToggleLike, commentCount, draft, setDraft, submitComment, posting,
  following, onToggleFollow, onClose, onOpenProfile, onOpenTopic, onMore,
}) {
  const vRef = useRef(null);
  const barRef = useRef(null);
  const inputRef = useRef(null);
  const [muted, setMuted]   = useState(true);
  const [paused, setPaused] = useState(false);
  const [cur, setCur]       = useState(0);
  const [dur, setDur]       = useState(0);
  const [state, setState]   = useState("loading"); // loading | ready | error

  useEffect(() => {
    if (loadingPost) return;
    if (!videoUrl) { setState("error"); return; }
    const v = vRef.current; if (!v) return;
    v.muted = true;
    const t = setTimeout(() => v.play?.().catch(() => {}), 0);
    return () => clearTimeout(t);
  }, [videoUrl, loadingPost]);

  const tags = Array.isArray(hashtags) ? hashtags : [];

  const togglePlay = () => {
    const v = vRef.current; if (!v) return;
    if (v.paused) { v.play?.().catch(() => {}); setPaused(false); }
    else { v.pause?.(); setPaused(true); }
  };
  const toggleMute = (e) => {
    e.stopPropagation();
    const v = vRef.current; if (!v) return;
    const n = !muted; setMuted(n); v.muted = n;
    if (!n) v.play?.().catch(() => {});
  };
  const seekFromX = (clientX) => {
    const v = vRef.current, bar = barRef.current;
    if (!v || !bar || !v.duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    v.currentTime = ratio * v.duration;
    setCur(v.currentTime);
  };
  const onBarDown = (e) => {
    e.stopPropagation();
    seekFromX(e.clientX);
    const move = (ev) => seekFromX(ev.clientX);
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const noop = (e) => { e.stopPropagation(); /* 转发：暂未接功能 */ };
  const focusInput = () => inputRef.current?.focus();

  const prog = dur ? cur / dur : 0;
  const TopBtn = ({ onClick, children }) => (
    <button onClick={onClick}
      style={{ width:38, height:38, borderRadius:"50%", border:"none", cursor:"pointer",
               background:"rgba(0,0,0,0.35)", color:"white", fontSize:16,
               display:"flex", alignItems:"center", justifyContent:"center",
               backdropFilter:"blur(4px)", WebkitBackdropFilter:"blur(4px)" }}>
      {children}
    </button>
  );

  return (
    <div style={{ position:"fixed", inset:0, zIndex:150, background:"#000",
                  display:"flex", justifyContent:"center" }}>
      <div style={{ position:"relative", width:"100%", maxWidth:430, height:"100%",
                    background:"#000", overflow:"hidden" }}>

        {/* 视频 */}
        {state !== "error" ? (
          <video ref={vRef} src={videoUrl || undefined} poster={posterUrl || undefined}
            autoPlay muted loop playsInline preload="metadata"
            onClick={togglePlay}
            onLoadedData={() => setState("ready")}
            onCanPlay={() => setState("ready")}
            onTimeUpdate={(e) => { setCur(e.target.currentTime); setDur(e.target.duration || 0); }}
            onError={() => setState("error")}
            style={{ position:"absolute", inset:0, width:"100%", height:"100%",
                     objectFit:"cover", background:"#000" }} />
        ) : (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center",
                        justifyContent:"center", color:"#bbb", fontSize:14 }}>
            视频加载失败，请稍后再试
          </div>
        )}

        {/* 加载中 */}
        {state === "loading" && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center",
                        justifyContent:"center", pointerEvents:"none" }}>
            <span style={{ width:34, height:34, borderRadius:"50%",
                           border:"3px solid rgba(255,255,255,0.35)", borderTopColor:"#fff",
                           animation:"vspin .8s linear infinite" }} />
          </div>
        )}

        {/* 暂停时中央播放按钮 */}
        {paused && state !== "error" && (
          <div onClick={togglePlay}
            style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ width:72, height:72, borderRadius:"50%", background:"rgba(0,0,0,0.4)",
                           display:"flex", alignItems:"center", justifyContent:"center",
                           backdropFilter:"blur(2px)", WebkitBackdropFilter:"blur(2px)" }}>
              <span style={{ borderLeft:"24px solid white", borderTop:"15px solid transparent",
                             borderBottom:"15px solid transparent", marginLeft:6 }} />
            </span>
          </div>
        )}

        {/* 顶部栏 */}
        <div style={{ position:"absolute", top:46, left:14, right:14, zIndex:5,
                      display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <TopBtn onClick={onClose}>‹</TopBtn>
            <div style={{ display:"flex", alignItems:"center", gap:5, alignSelf:"flex-start",
                          background:"rgba(0,0,0,0.35)", color:"white", fontSize:12, fontWeight:700,
                          padding:"5px 11px", borderRadius:999,
                          backdropFilter:"blur(4px)", WebkitBackdropFilter:"blur(4px)" }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:"#E68645" }} />视频
            </div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <TopBtn onClick={noop}>🔍</TopBtn>
            <TopBtn onClick={noop}>↗</TopBtn>
            <TopBtn onClick={onMore}>⋯</TopBtn>
          </div>
        </div>

        {/* 声音按钮 */}
        {state !== "error" && (
          <button onClick={toggleMute}
            style={{ position:"absolute", right:14, top:"46%", zIndex:5, width:40, height:40,
                     borderRadius:"50%", border:"none", cursor:"pointer", color:"white", fontSize:17,
                     background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center",
                     backdropFilter:"blur(4px)", WebkitBackdropFilter:"blur(4px)" }}>
            {muted ? "🔇" : "🔊"}
          </button>
        )}

        {/* 底部渐变 + 作者/文案/进度/输入 */}
        <div style={{ position:"absolute", left:0, right:0, bottom:0, zIndex:5, padding:"60px 16px 18px",
                      background:"linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0.35) 55%, transparent)" }}>
          {/* 作者 */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
            <div onClick={onOpenProfile} style={{ cursor:"pointer", flexShrink:0,
                  width:40, height:40, borderRadius:"50%", overflow:"hidden", border:"2px solid rgba(255,255,255,0.85)" }}>
              <PetAvatar pet={pet} overrideUrl={avatarOverride} size={36} bg="#F2E5DA" />
            </div>
            <div onClick={onOpenProfile} style={{ cursor:"pointer", fontSize:15, fontWeight:800, color:"white",
                  textShadow:"0 1px 3px rgba(0,0,0,0.5)" }}>{display}</div>
            {!own && (
              <button onClick={onToggleFollow}
                style={{ marginLeft:2, padding:"5px 14px", borderRadius:999, fontSize:12.5, fontWeight:700,
                         border: following ? "1px solid rgba(255,255,255,0.7)" : "none",
                         background: following ? "transparent" : "#E68645",
                         color:"white", cursor:"pointer" }}>
                {following ? "已关注" : "关注"}
              </button>
            )}
          </div>

          {/* 标题 / 正文 */}
          {title && (
            <div style={{ fontSize:16, fontWeight:800, color:"white", marginBottom:5,
                          textShadow:"0 1px 3px rgba(0,0,0,0.5)", wordBreak:"break-word" }}>{title}</div>
          )}
          {content?.trim() && (
            <div style={{ fontSize:13.5, lineHeight:1.55, color:"rgba(255,255,255,0.95)", marginBottom:6,
                          textShadow:"0 1px 3px rgba(0,0,0,0.5)", whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
              {content}
            </div>
          )}
          {tags.length > 0 && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:10 }}>
              {tags.map((t) => (
                <span key={t} onClick={() => onOpenTopic?.(t)}
                  style={{ fontSize:13, fontWeight:600, color:"#FFD9B8", cursor: onOpenTopic ? "pointer" : "default",
                           textShadow:"0 1px 3px rgba(0,0,0,0.5)" }}>#{t}</span>
              ))}
            </div>
          )}

          {/* 进度条 */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div ref={barRef} onPointerDown={onBarDown}
              style={{ position:"relative", flex:1, height:14, display:"flex", alignItems:"center", cursor:"pointer" }}>
              <div style={{ position:"absolute", left:0, right:0, height:3, borderRadius:999,
                            background:"rgba(255,255,255,0.35)" }} />
              <div style={{ position:"absolute", left:0, height:3, borderRadius:999,
                            width:`${Math.round(prog * 100)}%`, background:"#E68645" }} />
              <div style={{ position:"absolute", left:`${Math.round(prog * 100)}%`, width:11, height:11,
                            borderRadius:"50%", background:"#fff", transform:"translateX(-50%)",
                            boxShadow:"0 1px 4px rgba(0,0,0,0.4)" }} />
            </div>
            <span style={{ fontSize:11, color:"rgba(255,255,255,0.9)", flexShrink:0,
                           textShadow:"0 1px 3px rgba(0,0,0,0.5)" }}>
              {fmtDuration(cur)} / {fmtDuration(dur)}
            </span>
          </div>

          {/* 评论输入 + 点赞/评论/转发 */}
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ flex:1, display:"flex", alignItems:"center", gap:8,
                          background:"rgba(255,255,255,0.16)", borderRadius:999, padding:"9px 14px" }}>
              <PawLikeIcon size={16} color="rgba(255,255,255,0.8)" />
              <input ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && draft.trim() && !posting && submitComment()}
                placeholder="说点什么..." maxLength={1000} disabled={posting}
                style={{ flex:1, border:"none", outline:"none", background:"transparent",
                         color:"white", fontSize:13.5, minWidth:0 }} />
            </div>

            <button onClick={(e) => { e.stopPropagation(); onToggleLike(); }}
              style={{ background:"transparent", border:"none", cursor:"pointer", color:"white",
                       display:"flex", flexDirection:"column", alignItems:"center", gap:2, flexShrink:0 }}>
              <span key={isLiked ? "on" : "off"} style={{ display:"inline-flex",
                    animation: isLiked ? "pawpop .2s ease" : "none" }}>
                <PawLikeIcon filled={isLiked} color={isLiked ? "#E85D5D" : "#fff"} size={26} />
              </span>
              <span style={{ fontSize:11, textShadow:"0 1px 3px rgba(0,0,0,0.5)" }}>{likeCount}</span>
            </button>

            <button onClick={focusInput}
              style={{ background:"transparent", border:"none", cursor:"pointer", color:"white",
                       display:"flex", flexDirection:"column", alignItems:"center", gap:2, flexShrink:0, fontSize:24, lineHeight:1 }}>
              💬<span style={{ fontSize:11, textShadow:"0 1px 3px rgba(0,0,0,0.5)" }}>{commentCount}</span>
            </button>

            <button onClick={noop}
              style={{ background:"transparent", border:"none", cursor:"pointer", color:"white",
                       display:"flex", flexDirection:"column", alignItems:"center", gap:2, flexShrink:0 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M12 3v12M12 3l-4 4M12 3l4 4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize:11, textShadow:"0 1px 3px rgba(0,0,0,0.5)" }}>0</span>
            </button>
          </div>
        </div>

        <style>{`@keyframes vspin { to { transform: rotate(360deg); } } @keyframes pawpop { 0%{transform:scale(1)} 50%{transform:scale(1.18)} 100%{transform:scale(1)} }`}</style>
      </div>
    </div>
  );
}

/* TikTok 式视频：进入即静音自动循环播放 + 声音开关 + 点击暂停/播放 */
function DetailVideo({ src, poster }) {
  const ref = useRef(null);
  const [muted, setMuted] = useState(true);
  const [prog, setProg] = useState(0);
  const [state, setState] = useState(src ? "loading" : "error"); // loading | ready | error

  useEffect(() => {
    const v = ref.current;
    if (!v || !src) return;
    v.muted = true;
    const t = setTimeout(() => { v.play?.().catch(() => {}); }, 0);
    return () => clearTimeout(t);
  }, [src]);

  const toggleMute = (e) => {
    e.stopPropagation();
    const v = ref.current; if (!v) return;
    const next = !muted;
    setMuted(next); v.muted = next;
    if (!next) v.play?.().catch(() => {});
  };
  const togglePlay = () => {
    const v = ref.current; if (!v) return;
    if (v.paused) v.play?.().catch(() => {}); else v.pause?.();
  };

  if (state === "error") {
    return (
      <div style={{ width:"100%", minHeight:240, background:"#000", color:"#bbb",
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>
        视频加载失败，请稍后再试
      </div>
    );
  }

  return (
    <div style={{ position:"relative", width:"100%", background:"#000",
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
      <video ref={ref} src={src} poster={poster || undefined}
        autoPlay muted loop playsInline preload="metadata"
        onClick={togglePlay}
        onLoadedData={() => setState("ready")}
        onCanPlay={() => setState("ready")}
        onTimeUpdate={(e) => { const v = e.target; if (v.duration) setProg(v.currentTime / v.duration); }}
        onError={() => setState("error")}
        style={{ width:"100%", maxHeight:420, objectFit:"contain", display:"block", background:"#000" }} />

      {/* 视频标签 */}
      <div style={{ position:"absolute", top:10, left:10, display:"flex", alignItems:"center", gap:5,
                    background:"rgba(0,0,0,0.45)", color:"white", fontSize:11, fontWeight:700,
                    padding:"4px 9px", borderRadius:999,
                    backdropFilter:"blur(2px)", WebkitBackdropFilter:"blur(2px)" }}>
        <span style={{ width:7, height:7, borderRadius:"50%", background:C.pri }} />
        视频
      </div>

      {/* 细进度条 */}
      <div style={{ position:"absolute", left:0, right:0, bottom:0, height:3,
                    background:"rgba(255,255,255,0.25)" }}>
        <div style={{ height:"100%", width:`${Math.round(prog * 100)}%`, background:C.pri,
                      transition:"width .2s linear" }} />
      </div>

      {state === "loading" && (
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
                      pointerEvents:"none" }}>
          <span style={{ width:30, height:30, borderRadius:"50%",
                         border:"3px solid rgba(255,255,255,0.35)", borderTopColor:"#fff",
                         animation:"vspin .8s linear infinite" }} />
        </div>
      )}

      <button onClick={toggleMute}
        style={{ position:"absolute", top:10, right:10, width:36, height:36, borderRadius:"50%",
                 background:"rgba(0,0,0,0.45)", border:"none", cursor:"pointer", color:"white",
                 fontSize:16, display:"flex", alignItems:"center", justifyContent:"center",
                 backdropFilter:"blur(2px)", WebkitBackdropFilter:"blur(2px)" }}>
        {muted ? "🔇" : "🔊"}
      </button>
      <style>{`@keyframes vspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function DetailImage({ src, thumb, aspectRatio, eager, onClick }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div onClick={onClick}
      style={{ flex:"0 0 100%", scrollSnapAlign:"start",
               position:"relative", width:"100%",
               aspectRatio: `${aspectRatio} / 1`,
               background:"#000", overflow:"hidden", cursor:"zoom-in" }}>

      {/* 模糊缩略图作为占位（首图：肯定有 cover_thumbnail_url） */}
      {thumb && (
        <img src={thumb} alt="" aria-hidden="true"
          loading="eager" decoding="async"
          style={{ position:"absolute", inset:0, width:"100%", height:"100%",
                   objectFit:"cover",
                   filter:"blur(24px) saturate(1.1)",
                   transform:"scale(1.15)",        // 放大消除模糊边缘
                   opacity: loaded ? 0 : 1,
                   transition:"opacity .35s ease" }} />
      )}

      {/* 高清 display 图 */}
      <img src={src} alt=""
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        fetchpriority={eager ? "high" : "auto"}
        onLoad={() => setLoaded(true)}
        style={{ position:"absolute", inset:0, width:"100%", height:"100%",
                 objectFit:"contain",
                 opacity: loaded ? 1 : 0,
                 transition:"opacity .35s ease" }} />
    </div>
  );
}

function CommentRow({ c, user, isLiked, onToggleLike, onDelete, onReply, replyHighlight, indent, replyToUsername }) {
  return (
    <div style={{ display:"flex", gap:8, alignItems:"flex-start",
                  paddingLeft: indent ? 38 : 0, marginBottom:8 }}>
      <PetAvatar pet={c.pet} overrideUrl={c.user?.avatar_url} size={indent ? 26 : 32} bg={C.tint} />
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
                     color: isLiked ? "#E85D5D" : C.sub, fontWeight: isLiked ? 700 : 500,
                     fontSize:11, padding:0, display:"flex", alignItems:"center", gap:4 }}>
            <span key={isLiked ? "on" : "off"}
              style={{ display:"inline-flex", animation: isLiked ? "pawpop .2s ease" : "none" }}>
              <PawLikeIcon filled={isLiked} size={17} />
            </span>
            {c.like_count || 0}
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
                       color:C.sub, padding:0, display:"flex", alignItems:"center" }}>
              <PetTrashIcon size={17} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
