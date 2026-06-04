"use client";

/**
 * components/community/PostCompose.jsx
 *
 * 发布帖子 —— 独立全屏页面（不再是弹窗）：
 *  - 顶部：返回 / 标题"发布帖子" / 橙色"发布"按钮
 *  - 类型切换：图片帖 / 视频帖 / 文字帖（自定义宠物风 SVG 图标）
 *  - 图片帖：选图（1–9 张，最长边 1600px 压缩到 JPG）
 *  - 视频帖：仅 1 段视频（重复选择会提示）+ 真实上传进度
 *  - 文字帖：选背景色 + 实时预览卡（沿用现有：只存 text_bg_color，动态渲染，不生成图片文件）
 *  - 标题 / 正文
 *  - 选择话题：进入全屏话题页（真实热门 hashtag），选择后自动插入正文
 *
 * 发布 / 上传 / 取消清理逻辑与原弹窗版完全一致，未改动后端与数据结构。
 */

import { useRef, useState, useEffect } from "react";
import {
  uploadPostImage, uploadPostVideoProgress, createPost,
  cleanupUploadedImages, getHotTopics,
} from "@/services/communityService";
import { makeImageVariants } from "@/services/imageCompress";
import { captureVideoThumbnail, fmtDuration } from "@/services/videoThumb";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", text:"#2A2520",
  sub:"#8A8178", light:"#D6D5D8", border:"#E3DCD0",
};
const TINT_ON = "#FBEEE2"; // 选中态浅橙背景

const MAX_IMAGES = 9;
const MAX_VIDEO_MB = 50;
const TEXT_BG_COLORS = [
  { color: "#EEE9E1", label: "米白" },
  { color: "#F2E5DA", label: "浅粉米" },
  { color: "#D6D5D8", label: "浅灰紫" },
  { color: "#E68645", label: "橙" },
  { color: "#D8E8E2", label: "浅绿" },
  { color: "#DCE6F2", label: "浅蓝" },
];

/* ── 宠物风类型图标（扁平圆润 SVG，选中橙色 / 未选灰色）─────── */
function PawDot({ x, y, r = 1.5, fill }) {
  return <circle cx={x} cy={y} r={r} fill={fill} />;
}
function IconCamera({ on }) {
  const c = on ? C.pri : C.sub;
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="2.5" y="8" width="23" height="15" rx="4.5" stroke={c} strokeWidth="1.8"/>
      <path d="M9.5 8l1.6-2.6c.3-.5.8-.8 1.4-.8h3c.6 0 1.1.3 1.4.8L18.5 8" stroke={c} strokeWidth="1.8" strokeLinejoin="round"/>
      {/* 镜头里的小爪印 */}
      <circle cx="14" cy="15.5" r="4.3" stroke={c} strokeWidth="1.8"/>
      <PawDot x={12.4} y={14.2} fill={c} />
      <PawDot x={15.6} y={14.2} fill={c} />
      <path d="M11.8 16.4c0-1.3 1-2.2 2.2-2.2s2.2.9 2.2 2.2c0 .9-1 1.3-2.2 1.3s-2.2-.4-2.2-1.3z" fill={c}/>
    </svg>
  );
}
function IconVideo({ on }) {
  const c = on ? C.pri : C.sub;
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      {/* 场记板顶条 */}
      <path d="M3.5 9.5l19-3.2 1 4.2-19 3.2-1-4.2z" stroke={c} strokeWidth="1.7" strokeLinejoin="round"/>
      <path d="M8 8.4l1.6 3.4M13 7.6l1.6 3.4M18 6.8l1.6 3.4" stroke={c} strokeWidth="1.5"/>
      {/* 板身 + 播放键 */}
      <rect x="4" y="13.5" width="20" height="10.5" rx="2.6" stroke={c} strokeWidth="1.7"/>
      <path d="M12 16.6l4 2.2-4 2.2v-4.4z" fill={c}/>
    </svg>
  );
}
function IconText({ on }) {
  const c = on ? C.pri : C.sub;
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      {/* 便签 */}
      <rect x="4.5" y="4.5" width="15" height="19" rx="3" stroke={c} strokeWidth="1.8"/>
      <path d="M8 10h8M8 14h8M8 18h5" stroke={c} strokeWidth="1.7" strokeLinecap="round"/>
      {/* 铅笔 */}
      <path d="M22.5 12.5l2.2 2.2-6.4 6.4-2.9.7.7-2.9 6.4-6.4z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill={on ? TINT_ON : "white"}/>
    </svg>
  );
}
/* 小猫脸（输入框前缀） */
function CatFace({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink:0 }}>
      <path d="M5 7l1.5-3 3 2.2h5L17.5 4 19 7c1.2 1.4 1.8 3.2 1.8 5 0 4.4-3.9 7.5-8.8 7.5S3.2 16.4 3.2 12c0-1.8.6-3.6 1.8-5z" fill="#F2C79A" stroke="#E68645" strokeWidth="1.2"/>
      <circle cx="9.3" cy="12" r="1.1" fill="#5A4632"/>
      <circle cx="14.7" cy="12" r="1.1" fill="#5A4632"/>
      <path d="M11 14.6c.3.4.7.4 1 0" stroke="#5A4632" strokeWidth="1" strokeLinecap="round"/>
      <circle cx="7.4" cy="14" r="1" fill="#F4A06A" opacity="0.6"/>
      <circle cx="16.6" cy="14" r="1" fill="#F4A06A" opacity="0.6"/>
    </svg>
  );
}
/* 装饰：淡爪印 */
function FaintPaw({ size = 22, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#E68645" aria-hidden="true" style={{ opacity:0.12, ...style }}>
      <ellipse cx="6" cy="8" rx="2" ry="2.6" /><ellipse cx="10.5" cy="5" rx="2.2" ry="3" />
      <ellipse cx="14.5" cy="5" rx="2.2" ry="3" /><ellipse cx="19" cy="8" rx="2" ry="2.6" />
      <path d="M 7 14 Q 5 18, 8 21 Q 12.5 23, 17 21 Q 20 18, 18 14 Q 16 11.5, 12.5 11.5 Q 9 11.5, 7 14 Z" />
    </svg>
  );
}

export default function PostCompose({ user, pet, onClose, onSuccess, toast }) {
  const [type, setType]         = useState("image");  // image | video | text
  // 有序媒体：图片帖=多张图片；视频帖=单个视频。{ id, kind, file, preview, thumbFile?, duration?, w?, h? }
  const [media, setMedia]       = useState([]);
  const [bgColor, setBgColor]   = useState(TEXT_BG_COLORS[0].color);
  const [title, setTitle]       = useState("");
  const [body, setBody]         = useState("");

  const [phase, setPhase]       = useState("idle"); // idle | uploading | saving
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [videoPct, setVideoPct] = useState(0);      // 视频上传进度 0~100

  const [topicOpen, setTopicOpen] = useState(false); // 话题选择全屏子页

  const abortRef    = useRef({ current: false });
  const uploadedRef = useRef([]); // [{url, path}]
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  /* 卸载时如果有未提交的上传，清掉 storage 里的孤儿文件 */
  useEffect(() => {
    return () => {
      abortRef.current.current = true;
      if (uploadedRef.current.length) {
        cleanupUploadedImages(uploadedRef.current);
      }
    };
  }, []);

  /* 切换帖子类型时清空已选媒体 */
  const changeType = (t) => {
    if (isPublishing || t === type) return;
    setMedia((prev) => { prev.forEach((m) => m.preview && URL.revokeObjectURL(m.preview)); return []; });
    setVideoPct(0);
    setType(t);
  };

  /* ── 选择媒体（按 type 区分图片帖 / 视频帖）─────────── */
  const handlePick = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    if (type === "video") {
      // 视频帖只能有一段：已有则提示，不替换
      if (media.some((m) => m.kind === "video")) {
        toast?.("一个视频帖子只能上传一个视频哦", "warn");
        return;
      }
      const f = files[0];
      if (!(f.type || "").startsWith("video/")) { toast?.("请选择视频文件", "warn"); return; }
      if (f.size > MAX_VIDEO_MB * 1024 * 1024) {
        toast?.(`视频太大啦，请上传 ${MAX_VIDEO_MB}MB 以内的视频`, "error"); return;
      }
      const id = Math.random().toString(36).slice(2);
      setMedia([{ id, kind: "video", file: f, preview: null, thumbFile: null, duration: 0 }]);
      try {
        const { thumbFile, duration, width, height } = await captureVideoThumbnail(f);
        const preview = URL.createObjectURL(thumbFile);
        setMedia((prev) => prev.map((m) => m.id === id ? { ...m, preview, thumbFile, duration, w: width, h: height } : m));
      } catch {
        setMedia((prev) => prev.map((m) => m.id === id ? { ...m, duration: 0 } : m));
      }
      return;
    }

    // 图片帖：多张图片
    for (const f of files) {
      if (media.length >= MAX_IMAGES) { toast?.(`最多 ${MAX_IMAGES} 张图片`, "warn"); break; }
      if (!(f.type || "").startsWith("image/")) continue;
      const id = Math.random().toString(36).slice(2);
      const preview = URL.createObjectURL(f);
      setMedia((prev) => [...prev, { id, kind: "image", file: f, preview }]);
    }
  };

  const removePicked = (idx) => {
    setMedia((prev) => {
      const item = prev[idx];
      if (item?.preview) { try { URL.revokeObjectURL(item.preview); } catch {} }
      return prev.filter((_, i) => i !== idx);
    });
  };

  /* ── 选择话题后插入正文（去重；空则直接放，否则追加到末尾）── */
  const insertHashtag = (tag) => {
    setBody((prev) => {
      const existing = new Set(
        (prev.match(/#([一-龥\w]{1,20})/g) || []).map((s) => s.slice(1))
      );
      if (existing.has(tag)) return prev;            // 已有，不重复
      if (!prev.trim()) return `#${tag}`;
      return `${prev.replace(/\s+$/, "")} #${tag}`;  // 追加到末尾，前面留一个空格
    });
    setTopicOpen(false);
  };

  /* ── 取消（返回社群首页）─────────────────────────── */
  const handleCancel = () => {
    abortRef.current.current = true;
    // useEffect cleanup 会清 storage
    onClose?.();
  };

  /* ── 发布 ──────────────────────────────────────────── */
  const isPublishing = phase !== "idle";
  const canPublish = !isPublishing && (
    type === "image" ? media.length > 0 :                  // 图片帖：至少 1 张
    type === "video" ? media.some((m) => m.kind === "video") : // 视频帖：有视频
    (title.trim() || body.trim())                          // 文字帖：标题/正文非空
  );

  const handlePublish = async () => {
    if (!user?.id) { toast?.("请先登录", "error"); return; }
    if (!canPublish || isPublishing) return;

    abortRef.current.current = false;

    try {
      let displayImageUrls = [];   // 仅图片（向后兼容字段）
      let thumbnailUrls    = [];
      let mediaItems       = [];   // 有序媒体（图片/视频）
      let coverAspectRatio = null;

      if (type !== "text" && media.length > 0) {
        setPhase("uploading");
        setProgress({ done: 0, total: media.length });
        for (let i = 0; i < media.length; i++) {
          if (abortRef.current.current) throw _abort();
          const item = media[i];

          if (item.kind === "image") {
            const { display, thumb, width, height } = await makeImageVariants(item.file);
            if (abortRef.current.current) throw _abort();
            const dispR = await uploadPostImage(display, user.id, abortRef.current);
            uploadedRef.current.push(dispR);
            if (abortRef.current.current) throw _abort();
            const thumbR = await uploadPostImage(thumb, user.id, abortRef.current);
            uploadedRef.current.push(thumbR);
            displayImageUrls.push(dispR.url);
            thumbnailUrls.push(thumbR.url);
            mediaItems.push({ type: "image", url: dispR.url, thumbnail_url: thumbR.url });
            if (i === 0 && width && height) coverAspectRatio = +(width / height).toFixed(4);
          } else {
            // 视频：先传缩略图（小），再带进度上传视频
            let thumbUrl = null;
            if (item.thumbFile) {
              const tR = await uploadPostImage(item.thumbFile, user.id, abortRef.current);
              uploadedRef.current.push(tR);
              thumbUrl = tR.url;
            }
            if (abortRef.current.current) throw _abort();
            setVideoPct(0);
            const vidR = await uploadPostVideoProgress(item.file, user.id, (r) => setVideoPct(Math.round(r * 100)));
            uploadedRef.current.push(vidR);
            mediaItems.push({ type: "video", url: vidR.url, thumbnail_url: thumbUrl, duration: item.duration || 0 });
            if (i === 0 && item.w && item.h) coverAspectRatio = +(item.w / item.h).toFixed(4);
          }
          setProgress({ done: i + 1, total: media.length });
        }
      }

      if (abortRef.current.current) throw _abort();

      /* 写 posts */
      setPhase("saving");
      const { post, flagged } = await createPost({
        userId:           user.id,
        petId:            pet?.id,
        title:            title.trim(),
        content:          body,
        postType:         type === "text" ? "text" : "image",
        displayImageUrls: type === "text" ? [] : displayImageUrls,
        thumbnailUrls:    type === "text" ? [] : thumbnailUrls,
        mediaItems:       type === "text" ? [] : mediaItems,
        coverAspectRatio: type === "text" ? null : coverAspectRatio,
        textBgColor:      type === "text" ? bgColor : null,
      });

      // 成功后清空 uploadedRef（不再需要 cleanup）
      uploadedRef.current = [];

      if (flagged) {
        toast?.("帖子已待审核（命中敏感词）", "warn");
      } else {
        toast?.("发布成功 🎉", "success");
        onSuccess?.(post);
      }
      onClose?.();
    } catch (err) {
      if (err?.name === "AbortError" || abortRef.current.current) {
        // 取消：清掉已上传的
        await cleanupUploadedImages(uploadedRef.current);
        uploadedRef.current = [];
        toast?.("已取消", "info");
      } else {
        toast?.(err.message || "发布失败", "error");
      }
    } finally {
      setPhase("idle");
      setProgress({ done: 0, total: 0 });
    }
  };

  const publishLabel =
    phase === "uploading" ? (type === "video" ? `${videoPct}%` : `${progress.done}/${progress.total}`) :
    phase === "saving"    ? "保存…" : "发布";

  /* ── render ───────────────────────────────────────── */
  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, background:C.bg,
                  display:"flex", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, height:"100%", background:C.bg,
                    display:"flex", flexDirection:"column",
                    animation:"page-in .22s ease-out", position:"relative", overflow:"hidden" }}>

        {/* 顶部装饰爪印 */}
        <FaintPaw size={56} style={{ position:"absolute", top:30, right:18 }} />

        {/* ── 顶部栏 ── */}
        <div style={{ padding:"52px 16px 14px", display:"flex", alignItems:"center", gap:10,
                      flexShrink:0, position:"relative", zIndex:2 }}>
          <button onClick={handleCancel} disabled={isPublishing}
            style={{ width:40, height:40, borderRadius:"50%", background:"rgba(255,255,255,0.7)",
                     border:"none", cursor: isPublishing ? "default" : "pointer", color:C.text,
                     fontSize:22, display:"flex", alignItems:"center", justifyContent:"center",
                     flexShrink:0 }}>‹</button>
          <div style={{ flex:1, textAlign:"center", fontSize:18, fontWeight:800, color:C.text }}>
            发布帖子
          </div>
          <button onClick={handlePublish} disabled={!canPublish}
            style={{ minWidth:74, height:40, padding:"0 18px", borderRadius:999, fontSize:14, fontWeight:800,
                     background: canPublish ? C.pri : "#EBD9C7",
                     color: canPublish ? "white" : "#B7A793",
                     border:"none", cursor: canPublish ? "pointer" : "default",
                     boxShadow: canPublish ? "0 4px 12px rgba(230,134,69,0.35)" : "none",
                     transition:"all .15s", flexShrink:0 }}>
            {publishLabel}
          </button>
        </div>

        {/* ── 滚动内容 ── */}
        <div style={{ flex:1, overflowY:"auto", padding:"4px 16px 110px", position:"relative", zIndex:2 }}>

          {/* 类型切换卡 */}
          <div style={{ display:"flex", gap:6, background:"white", borderRadius:18, padding:6,
                        marginBottom:18, boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
            {[
              { key:"image", label:"图片帖", Icon:IconCamera },
              { key:"text",  label:"文字帖", Icon:IconText },
            ].map((t) => {
              const on = type === t.key;
              return (
                <button key={t.key} onClick={() => changeType(t.key)} disabled={isPublishing}
                  style={{ flex:1, padding:"11px 0", borderRadius:13, fontSize:13.5, fontWeight: on ? 800 : 600,
                           background: on ? TINT_ON : "transparent",
                           color: on ? C.pri : C.text,
                           border: `1.5px solid ${on ? C.pri : "transparent"}`,
                           cursor: isPublishing ? "default" : "pointer", transition:"all .15s",
                           display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                  <t.Icon on={on} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* ── 图片帖 ── */}
          {type === "image" && (
            <>
              <input ref={fileInputRef} type="file" accept="image/*" multiple
                     onChange={handlePick} disabled={isPublishing} style={{ display:"none" }} />
              {media.length === 0 ? (
                <button onClick={() => fileInputRef.current?.click()} disabled={isPublishing}
                  style={{ position:"relative", width:"100%", aspectRatio:"1.35 / 1", borderRadius:22,
                           border:`2px dashed ${C.pri}`, background:"rgba(255,255,255,0.55)", color:C.pri,
                           cursor: isPublishing ? "default" : "pointer", marginBottom:8,
                           display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6 }}>
                  <span style={{ position:"absolute", top:14, left:18, display:"flex", gap:3 }}>
                    <span style={{ width:10, height:3, borderRadius:2, background:C.pri, opacity:0.5, transform:"rotate(-25deg)" }} />
                    <span style={{ width:10, height:3, borderRadius:2, background:C.pri, opacity:0.5 }} />
                    <span style={{ width:10, height:3, borderRadius:2, background:C.pri, opacity:0.5, transform:"rotate(25deg)" }} />
                  </span>
                  <span style={{ fontSize:46, fontWeight:300, lineHeight:1 }}>＋</span>
                  <span style={{ fontSize:14, fontWeight:700 }}>0/{MAX_IMAGES}</span>
                </button>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:8, marginBottom:6 }}>
                  {media.map((m, i) => (
                    <div key={m.id} style={{ position:"relative", aspectRatio:"1", borderRadius:14, overflow:"hidden",
                                          border:`1px solid ${C.border}`, background:C.tint }}>
                      {m.preview
                        ? <img src={m.preview} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                        : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center",
                                        justifyContent:"center", fontSize:24 }}>🐾</div>}
                      {i === 0 && (
                        <div style={{ position:"absolute", left:6, bottom:6, background:"rgba(0,0,0,0.6)",
                                      color:"white", fontSize:10, padding:"2px 6px", borderRadius:6 }}>封面</div>
                      )}
                      {!isPublishing && (
                        <button onClick={() => removePicked(i)}
                          style={{ position:"absolute", top:4, right:4, width:22, height:22, borderRadius:"50%",
                                   background:"rgba(0,0,0,0.65)", color:"white", border:"none", cursor:"pointer",
                                   fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                      )}
                    </div>
                  ))}
                  {media.length < MAX_IMAGES && (
                    <button onClick={() => fileInputRef.current?.click()} disabled={isPublishing}
                      style={{ aspectRatio:"1", borderRadius:14, border:`2px dashed ${C.pri}`, background:"rgba(255,255,255,0.55)",
                               color:C.pri, fontSize:22, cursor: isPublishing ? "default" : "pointer",
                               display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:2 }}>
                      <span>＋</span>
                      <span style={{ fontSize:10 }}>{media.length}/{MAX_IMAGES}</span>
                    </button>
                  )}
                </div>
              )}
              <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11.5, color:C.sub, marginBottom:18, paddingLeft:2 }}>
                <FaintPaw size={16} style={{ opacity:0.5 }} /> 最多 {MAX_IMAGES} 张图片
              </div>
            </>
          )}

          {/* ── 视频帖 ── */}
          {type === "video" && (
            <>
              <input ref={videoInputRef} type="file" accept="video/*"
                     onChange={handlePick} disabled={isPublishing} style={{ display:"none" }} />
              {media.length === 0 ? (
                <button onClick={() => videoInputRef.current?.click()} disabled={isPublishing}
                  style={{ width:"100%", aspectRatio:"1.35 / 1", borderRadius:22,
                           border:`2px dashed ${C.pri}`, background:"rgba(255,255,255,0.55)", color:C.pri,
                           cursor: isPublishing ? "default" : "pointer", marginBottom:8,
                           display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10 }}>
                  <IconVideo on />
                  <span style={{ fontSize:14, fontWeight:700 }}>上传一个视频</span>
                  <span style={{ fontSize:11.5 }}>仅支持 1 个视频 · ≤ {MAX_VIDEO_MB}MB</span>
                </button>
              ) : media.map((m) => (
                <div key={m.id} style={{ position:"relative", width:"100%", aspectRatio:"1.35 / 1",
                                         borderRadius:22, overflow:"hidden", background:"#000", marginBottom:8 }}>
                  {m.preview
                    ? <img src={m.preview} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center",
                                    justifyContent:"center", fontSize:40 }}>🎬</div>}
                  {/* 右上角播放角标 */}
                  <div style={{ position:"absolute", top:10, left:10, display:"flex", alignItems:"center", gap:5,
                                background:"rgba(0,0,0,0.45)", color:"white", fontSize:11, fontWeight:700,
                                padding:"4px 9px", borderRadius:999, backdropFilter:"blur(2px)" }}>
                    <span style={{ width:7, height:7, borderRadius:"50%", background:C.pri }} />视频
                  </div>
                  <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <span style={{ width:54, height:54, borderRadius:"50%", background:"rgba(0,0,0,0.42)",
                                   display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <span style={{ borderLeft:"18px solid white", borderTop:"11px solid transparent",
                                     borderBottom:"11px solid transparent", marginLeft:5 }} />
                    </span>
                  </div>
                  {m.duration > 0 && (
                    <div style={{ position:"absolute", right:10, bottom:10, background:"rgba(0,0,0,0.6)",
                                  color:"white", fontSize:11, padding:"1px 7px", borderRadius:6 }}>
                      {fmtDuration(m.duration)}
                    </div>
                  )}
                  {!isPublishing && (
                    <button onClick={() => removePicked(0)}
                      style={{ position:"absolute", top:10, right:10, width:26, height:26, borderRadius:"50%",
                               background:"rgba(0,0,0,0.6)", color:"white", border:"none", cursor:"pointer",
                               fontSize:15, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                  )}
                  {isPublishing && (
                    <div style={{ position:"absolute", left:0, right:0, bottom:0, padding:"8px 12px",
                                  background:"rgba(0,0,0,0.55)" }}>
                      <div style={{ height:4, borderRadius:999, background:"rgba(255,255,255,0.3)", overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${videoPct}%`, background:C.pri, transition:"width .2s" }} />
                      </div>
                      <div style={{ color:"white", fontSize:11, marginTop:4, textAlign:"center" }}>视频上传中 {videoPct}%</div>
                    </div>
                  )}
                </div>
              ))}
              <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11.5, color:C.sub, marginBottom:18, paddingLeft:2 }}>
                <FaintPaw size={16} style={{ opacity:0.5 }} /> 一个视频帖只能上传一段视频
              </div>
            </>
          )}

          {/* ── 文字帖：预览卡 + 背景样式 ── */}
          {type === "text" && (
            <>
              {/* 预览卡 */}
              <div style={{ position:"relative", background:bgColor, borderRadius:22, padding:"34px 22px",
                            marginBottom:16, minHeight:170, overflow:"hidden",
                            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                            boxShadow:"0 4px 16px rgba(0,0,0,0.06)" }}>
                {/* 宠物装饰 */}
                <span style={{ position:"absolute", top:14, left:16, fontSize:14, opacity:0.5 }}>🐾</span>
                <span style={{ position:"absolute", top:18, right:20, fontSize:13, opacity:0.5 }}>💛</span>
                <span style={{ position:"absolute", bottom:16, right:18, fontSize:12, opacity:0.45 }}>🐾</span>
                <span style={{ position:"absolute", bottom:20, left:22, width:8, height:8, borderRadius:"50%",
                               background: bgColor === "#E68645" ? "rgba(255,255,255,0.5)" : "rgba(230,134,69,0.3)" }} />
                {title && (
                  <div style={{ fontSize:19, fontWeight:800, textAlign:"center",
                                color: bgColor === "#E68645" ? "white" : C.text,
                                marginBottom:8, wordBreak:"break-word" }}>{title}</div>
                )}
                <div style={{ fontSize:14.5, lineHeight:1.6, textAlign:"center",
                              color: bgColor === "#E68645" ? "white" : C.text,
                              whiteSpace:"pre-wrap", wordBreak:"break-word",
                              opacity: body.trim() ? 1 : 0.5 }}>
                  {body || "在这里写下你想分享的内容…"}
                </div>
              </div>
              {/* 背景样式 */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <span style={{ fontSize:13, fontWeight:700, color:C.text }}>背景样式</span>
                <span style={{ fontSize:11.5, color:C.sub }}>选一个喜欢的颜色</span>
              </div>
              <div style={{ display:"flex", gap:12, marginBottom:18, flexWrap:"wrap" }}>
                {TEXT_BG_COLORS.map((c) => {
                  const on = bgColor === c.color;
                  return (
                    <button key={c.color} onClick={() => !isPublishing && setBgColor(c.color)} disabled={isPublishing}
                      style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                               background:"transparent", border:"none", cursor: isPublishing ? "default" : "pointer" }}>
                      <div style={{ width:42, height:42, borderRadius:14, background: c.color,
                                    border: on ? `2.5px solid ${C.pri}` : `1.5px solid ${C.border}`,
                                    boxShadow: on ? "0 2px 8px rgba(230,134,69,0.3)" : "none" }} />
                      <span style={{ fontSize:10.5, color: on ? C.pri : C.sub, fontWeight: on ? 700 : 500 }}>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ── 标题 ── */}
          <div style={{ display:"flex", alignItems:"center", gap:10, background:"white", borderRadius:18,
                        padding:"12px 16px", marginBottom:12, boxShadow:"0 2px 10px rgba(0,0,0,0.04)" }}>
            <CatFace size={24} />
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="标题（最多 40 字，可选）" maxLength={40} disabled={isPublishing}
              style={{ flex:1, border:"none", outline:"none", background:"transparent", fontSize:14.5,
                       fontWeight:600, color:C.text, minWidth:0 }} />
          </div>

          {/* ── 正文 ── */}
          <div style={{ position:"relative", background:"white", borderRadius:18, padding:"14px 16px",
                        marginBottom:12, boxShadow:"0 2px 10px rgba(0,0,0,0.04)" }}>
            <div style={{ display:"flex", gap:10 }}>
              <CatFace size={24} />
              <textarea value={body} onChange={(e) => setBody(e.target.value)}
                placeholder="说点什么..." rows={6} maxLength={5000} disabled={isPublishing}
                style={{ flex:1, border:"none", outline:"none", background:"transparent", fontSize:14.5,
                         color:C.text, resize:"vertical", fontFamily:"inherit", lineHeight:1.6, minWidth:0,
                         paddingTop:2 }} />
            </div>
            <FaintPaw size={40} style={{ position:"absolute", bottom:10, right:12 }} />
          </div>

          {/* ── 选择话题 ── */}
          <button onClick={() => !isPublishing && setTopicOpen(true)} disabled={isPublishing}
            style={{ position:"relative", width:"100%", display:"flex", alignItems:"center", gap:12,
                     background:"white", borderRadius:22, padding:"16px 16px", border:"none",
                     cursor: isPublishing ? "default" : "pointer", textAlign:"left",
                     boxShadow:"0 2px 12px rgba(0,0,0,0.05)", overflow:"hidden" }}>
            <span style={{ width:42, height:42, borderRadius:"50%", background:C.pri, flexShrink:0,
                           display:"flex", alignItems:"center", justifyContent:"center",
                           color:"white", fontSize:20, fontWeight:800 }}>#</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14.5, fontWeight:700, color:C.text }}>选择话题</div>
              <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>添加话题，让更多人看到你的分享</div>
            </div>
            <FaintPaw size={36} style={{ position:"absolute", bottom:8, right:34 }} />
            <span style={{ color:C.sub, fontSize:20, flexShrink:0 }}>›</span>
          </button>

          {isPublishing && (
            <div style={{ marginTop:16, textAlign:"center", fontSize:12, color:C.sub }}>
              {phase === "uploading" && (type === "video" ? `📤 视频上传中 ${videoPct}%` : `📤 正在上传 ${progress.done}/${progress.total}`)}
              {phase === "saving"    && "💾 正在保存…"}
            </div>
          )}
        </div>

        {/* ── 话题选择全屏子页 ── */}
        {topicOpen && (
          <TopicSelect onClose={() => setTopicOpen(false)} onPick={insertHashtag} toast={toast} />
        )}
      </div>
      <style>{`@keyframes page-in { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform: translateY(0); } }`}</style>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   话题选择页：搜索 + 今日热门（真实 hashtag 统计）
════════════════════════════════════════════════════════════ */
function TopicSelect({ onClose, onPick, toast }) {
  const [q, setQ]       = useState("");
  const [hot, setHot]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getHotTopics({ days: 7, top: 10 })
      .then((list) => { if (alive) setHot(list || []); })
      .catch((e) => { if (alive) { setHot([]); toast?.(e.message, "error"); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const qt = q.trim().replace(/^#/, "");
  const filtered = qt ? hot.filter((h) => h.tag.includes(qt)) : hot;

  return (
    <div style={{ position:"absolute", inset:0, zIndex:10, background:C.bg,
                  display:"flex", flexDirection:"column", animation:"page-in .2s ease-out" }}>
      {/* 顶部栏 */}
      <div style={{ padding:"52px 16px 12px", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
        <button onClick={onClose}
          style={{ width:40, height:40, borderRadius:"50%", background:"rgba(255,255,255,0.7)",
                   border:"none", cursor:"pointer", color:C.text, fontSize:22,
                   display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>‹</button>
        <div style={{ flex:1, textAlign:"center", fontSize:18, fontWeight:800, color:C.text }}>选择话题</div>
        <div style={{ width:40, flexShrink:0 }} />
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"4px 16px 40px" }}>
        {/* 搜索框 */}
        <div style={{ display:"flex", alignItems:"center", gap:10, background:"white", borderRadius:999,
                      padding:"11px 16px", marginBottom:20, boxShadow:"0 2px 10px rgba(0,0,0,0.04)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke={C.sub} strokeWidth="1.8"/>
            <path d="M20 20l-3.2-3.2" stroke={C.sub} strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <input value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && qt) onPick(qt); }}
            placeholder="搜索话题"
            style={{ flex:1, border:"none", outline:"none", background:"transparent", fontSize:14, color:C.text, minWidth:0 }} />
          {qt && (
            <button onClick={() => onPick(qt)}
              style={{ background:C.pri, color:"white", border:"none", borderRadius:999, fontSize:12.5,
                       fontWeight:700, padding:"5px 12px", cursor:"pointer", flexShrink:0 }}>
              使用 #{qt}
            </button>
          )}
        </div>

        {/* 今日热门 */}
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:14 }}>
          <span style={{ fontSize:15, fontWeight:800, color:C.text }}>🔥 今日热门</span>
        </div>

        {loading ? (
          <div style={{ fontSize:13, color:C.sub, padding:"10px 2px" }}>加载中…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"40px 0", color:C.sub }}>
            <FaintPaw size={48} style={{ opacity:0.3 }} />
            <div style={{ fontSize:14, fontWeight:600, marginTop:10 }}>
              {qt ? `没有找到「${qt}」，点上方按钮直接使用` : "还没有热门话题，快来创建第一个吧"}
            </div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {filtered.map((h, i) => (
              <button key={h.tag} onClick={() => onPick(h.tag)}
                style={{ display:"flex", alignItems:"center", gap:12, background:"white", borderRadius:16,
                         padding:"14px 16px", border:"none", cursor:"pointer", textAlign:"left",
                         boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
                <span style={{ width:30, height:30, borderRadius:"50%", flexShrink:0, fontSize:13, fontWeight:800,
                               display:"flex", alignItems:"center", justifyContent:"center",
                               background: i < 3 ? C.pri : C.tint, color: i < 3 ? "white" : C.sub }}>
                  {i + 1}
                </span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14.5, fontWeight:700, color:C.text }}>#{h.tag}</div>
                  <div style={{ fontSize:11.5, color:C.sub, marginTop:1 }}>{h.count} 篇分享</div>
                </div>
                <span style={{ color:C.pri, fontSize:13, fontWeight:700, flexShrink:0 }}>使用</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function _abort() {
  const e = new Error("已取消");
  e.name = "AbortError";
  return e;
}
