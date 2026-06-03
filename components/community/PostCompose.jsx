"use client";

/**
 * components/community/PostCompose.jsx
 *
 * 发帖 modal：
 *  - 选择"图片帖" / "文字帖"
 *  - 图片帖：选图（1–9 张，最长边 1600px 压缩到 JPG）+ 标题 + 正文
 *  - 文字帖：选背景色 + 标题 + 正文
 *  - 发布按钮 loading / disabled / 防重复
 *  - 取消按钮真正中止：未提交时不会再继续上传，已上传的文件清掉
 *  - 失败/成功明确 toast 通知
 */

import { useRef, useState, useEffect } from "react";
import { uploadPostImage, uploadPostVideoProgress, createPost, cleanupUploadedImages } from "@/services/communityService";
import { makeImageVariants } from "@/services/imageCompress";
import { captureVideoThumbnail, fmtDuration } from "@/services/videoThumb";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", text:"#1A1006",
  sub:"#8A8074", light:"#D6D5D8", border:"#D6D5D8",
};

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
      const f = files[0];
      if (!(f.type || "").startsWith("video/")) { toast?.("请选择视频文件", "warn"); return; }
      if (f.size > MAX_VIDEO_MB * 1024 * 1024) {
        toast?.(`视频太大啦，请上传 ${MAX_VIDEO_MB}MB 以内的视频`, "error"); return;
      }
      // 只允许一段视频：替换
      setMedia((prev) => { prev.forEach((m) => m.preview && URL.revokeObjectURL(m.preview)); return []; });
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

  /* ── 取消（卸载或显式按钮） ───────────────────────── */
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

  /* ── render ───────────────────────────────────────── */
  return (
    <div onClick={(e) => e.target === e.currentTarget && !isPublishing && handleCancel()}
      style={{ position:"fixed", inset:0, zIndex:200,
               background:"rgba(0,0,0,0.45)",
               display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, maxHeight:"92vh",
                    background:C.bg, borderRadius:"22px 22px 0 0",
                    display:"flex", flexDirection:"column",
                    animation:"compose-up .25s ease-out" }}>

        {/* 头部 */}
        <div style={{ padding:"14px 16px 8px", display:"flex", alignItems:"center",
                      borderBottom:`1px solid ${C.border}`, flexShrink:0, gap:10 }}>
          <button onClick={handleCancel} disabled={isPublishing}
            style={{ background:"transparent", border:"none", fontSize:14, color:C.sub,
                     cursor: isPublishing ? "default" : "pointer", padding:"6px 4px" }}>
            取消
          </button>
          <div style={{ flex:1, textAlign:"center", fontSize:15, fontWeight:700, color:C.text }}>
            发布{type === "image" ? "图片" : type === "video" ? "视频" : "文字"}帖
          </div>
          <button onClick={handlePublish} disabled={!canPublish}
            style={{ padding:"6px 14px", borderRadius:14, fontSize:13, fontWeight:700,
                     background: canPublish ? C.pri : C.light,
                     color: canPublish ? "white" : C.sub,
                     border:"none",
                     cursor: canPublish ? "pointer" : "default",
                     minWidth: 70 }}>
            {phase === "uploading" ? (type === "video" ? `${videoPct}%` : `${progress.done}/${progress.total}`) :
             phase === "saving"    ? "保存…" : "发布"}
          </button>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"14px 16px 100px" }}>
          {/* 类型切换 */}
          <div style={{ display:"flex", gap:8, marginBottom:14 }}>
            {[
              { key:"image", label:"📷 图片帖" },
              { key:"video", label:"🎬 视频帖" },
              { key:"text",  label:"📝 文字帖" },
            ].map((t) => {
              const on = type === t.key;
              return (
                <button key={t.key} onClick={() => changeType(t.key)}
                  disabled={isPublishing}
                  style={{ flex:1, padding:"10px 0", borderRadius:14, fontSize:12.5,
                           fontWeight:600,
                           background: on ? C.pri : "white",
                           color: on ? "white" : C.text,
                           border: `1.5px solid ${on ? C.pri : C.border}`,
                           cursor: isPublishing ? "default" : "pointer",
                           transition:"all .15s" }}>
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* 视频帖：仅一段视频 + 上传进度 */}
          {type === "video" && (
            <>
              <input ref={videoInputRef} type="file" accept="video/*"
                     onChange={handlePick} disabled={isPublishing}
                     style={{ display:"none" }} />
              {media.length === 0 ? (
                <button onClick={() => videoInputRef.current?.click()} disabled={isPublishing}
                  style={{ width:"100%", aspectRatio:"16 / 10", borderRadius:16,
                           border:`1.5px dashed ${C.border}`, background:"white", color:C.sub,
                           cursor: isPublishing ? "default" : "pointer", marginBottom:8,
                           display:"flex", flexDirection:"column", alignItems:"center",
                           justifyContent:"center", gap:8 }}>
                  <span style={{ fontSize:36 }}>🎬</span>
                  <span style={{ fontSize:13, fontWeight:600 }}>选择一段视频</span>
                  <span style={{ fontSize:11 }}>仅支持一段视频 · ≤ {MAX_VIDEO_MB}MB</span>
                </button>
              ) : media.map((m) => (
                <div key={m.id} style={{ position:"relative", width:"100%", aspectRatio:"16 / 10",
                                         borderRadius:16, overflow:"hidden", background:"#000", marginBottom:8 }}>
                  {m.preview
                    ? <img src={m.preview} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center",
                                    justifyContent:"center", fontSize:40 }}>🎬</div>}
                  <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <span style={{ width:48, height:48, borderRadius:"50%", background:"rgba(0,0,0,0.42)",
                                   display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <span style={{ borderLeft:"16px solid white", borderTop:"10px solid transparent",
                                     borderBottom:"10px solid transparent", marginLeft:4 }} />
                    </span>
                  </div>
                  {m.duration > 0 && (
                    <div style={{ position:"absolute", right:8, bottom:8, background:"rgba(0,0,0,0.6)",
                                  color:"white", fontSize:11, padding:"1px 6px", borderRadius:6 }}>
                      {fmtDuration(m.duration)}
                    </div>
                  )}
                  {!isPublishing && (
                    <button onClick={() => removePicked(0)}
                      style={{ position:"absolute", top:8, right:8, width:24, height:24, borderRadius:"50%",
                               background:"rgba(0,0,0,0.6)", color:"white", border:"none", cursor:"pointer",
                               fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                  )}
                  {isPublishing && (
                    <div style={{ position:"absolute", left:0, right:0, bottom:0, padding:"8px 10px",
                                  background:"rgba(0,0,0,0.55)" }}>
                      <div style={{ height:4, borderRadius:999, background:"rgba(255,255,255,0.3)", overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${videoPct}%`, background:C.pri, transition:"width .2s" }} />
                      </div>
                      <div style={{ color:"white", fontSize:11, marginTop:4, textAlign:"center" }}>视频上传中 {videoPct}%</div>
                    </div>
                  )}
                </div>
              ))}
              <div style={{ fontSize:11, color:C.sub, marginBottom:14 }}>
                一个视频帖只能上传一段视频
              </div>
            </>
          )}

          {/* 图片帖：多张图片 */}
          {type === "image" && (
            <>
              <input ref={fileInputRef} type="file" accept="image/*" multiple
                     onChange={handlePick} disabled={isPublishing}
                     style={{ display:"none" }} />
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)",
                            gap:8, marginBottom:6 }}>
                {media.map((m, i) => (
                  <div key={m.id} style={{ position:"relative", aspectRatio:"1",
                                        borderRadius:12, overflow:"hidden",
                                        border:`1px solid ${C.border}`, background:C.tint }}>
                    {m.preview ? (
                      <img src={m.preview} alt=""
                           style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    ) : (
                      <div style={{ width:"100%", height:"100%", display:"flex",
                                    alignItems:"center", justifyContent:"center", fontSize:24 }}>
                        {m.kind === "video" ? "🎬" : "🐾"}
                      </div>
                    )}
                    {m.kind === "video" && (
                      <>
                        <div style={{ position:"absolute", inset:0, display:"flex",
                                      alignItems:"center", justifyContent:"center" }}>
                          <span style={{ width:28, height:28, borderRadius:"50%",
                                         background:"rgba(0,0,0,0.5)", display:"flex",
                                         alignItems:"center", justifyContent:"center" }}>
                            <span style={{ borderLeft:"9px solid white", borderTop:"6px solid transparent",
                                           borderBottom:"6px solid transparent", marginLeft:3 }} />
                          </span>
                        </div>
                        {m.duration > 0 && (
                          <div style={{ position:"absolute", right:6, bottom:6,
                                        background:"rgba(0,0,0,0.6)", color:"white",
                                        fontSize:10, padding:"1px 5px", borderRadius:6 }}>
                            {fmtDuration(m.duration)}
                          </div>
                        )}
                      </>
                    )}
                    {i === 0 && (
                      <div style={{ position:"absolute", left:6, bottom:6,
                                    background:"rgba(0,0,0,0.6)", color:"white",
                                    fontSize:10, padding:"2px 6px", borderRadius:6 }}>
                        封面
                      </div>
                    )}
                    {!isPublishing && (
                      <button onClick={() => removePicked(i)}
                        style={{ position:"absolute", top:4, right:4,
                                 width:22, height:22, borderRadius:"50%",
                                 background:"rgba(0,0,0,0.65)", color:"white",
                                 border:"none", cursor:"pointer", fontSize:13,
                                 display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                    )}
                  </div>
                ))}
                {media.length < MAX_IMAGES && (
                  <button onClick={() => fileInputRef.current?.click()}
                    disabled={isPublishing}
                    style={{ aspectRatio:"1", borderRadius:12,
                             border:`1.5px dashed ${C.border}`, background:"white",
                             color:C.sub, fontSize:22, cursor: isPublishing ? "default" : "pointer",
                             display:"flex", alignItems:"center", justifyContent:"center",
                             flexDirection:"column", gap:4 }}>
                    <span>＋</span>
                    <span style={{ fontSize:10 }}>{media.length}/{MAX_IMAGES}</span>
                  </button>
                )}
              </div>
              <div style={{ fontSize:11, color:C.sub, marginBottom:14 }}>
                最多 {MAX_IMAGES} 张图片
              </div>
            </>
          )}

          {/* 文字模式：背景色 */}
          {type === "text" && (
            <>
              <div style={{ fontSize:12, color:C.sub, marginBottom:8 }}>背景色</div>
              <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
                {TEXT_BG_COLORS.map((c) => {
                  const on = bgColor === c.color;
                  return (
                    <button key={c.color} onClick={() => !isPublishing && setBgColor(c.color)}
                      disabled={isPublishing}
                      style={{ display:"flex", flexDirection:"column", alignItems:"center",
                               gap:3, background:"transparent", border:"none",
                               cursor: isPublishing ? "default" : "pointer" }}>
                      <div style={{ width:36, height:36, borderRadius:"50%",
                                    background: c.color,
                                    border: on ? `2.5px solid ${C.pri}` : `1.5px solid ${C.border}` }} />
                      <span style={{ fontSize:10, color: on ? C.pri : C.sub,
                                     fontWeight: on ? 700 : 500 }}>{c.label}</span>
                    </button>
                  );
                })}
              </div>
              {/* 实时预览卡片 */}
              <div style={{ background:bgColor, borderRadius:14, padding:"18px 16px",
                            marginBottom:14, minHeight:120,
                            display:"flex", flexDirection:"column", justifyContent:"center",
                            border:`1px solid ${C.border}` }}>
                {title && <div style={{ fontSize:16, fontWeight:800,
                                        color: bgColor === "#E68645" ? "white" : C.text,
                                        marginBottom:6, wordBreak:"break-word" }}>{title}</div>}
                <div style={{ fontSize:13, lineHeight:1.55,
                              color: bgColor === "#E68645" ? "white" : C.text,
                              whiteSpace:"pre-wrap", wordBreak:"break-word",
                              opacity: body.trim() ? 1 : 0.5 }}>
                  {body || "正文预览…"}
                </div>
              </div>
            </>
          )}

          {/* 标题 */}
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="标题（最多 40 字，可选）"
            maxLength={40} disabled={isPublishing}
            style={{ width:"100%", borderRadius:14, padding:"12px 14px", fontSize:14,
                     border:`1.5px solid ${C.border}`, background:"white", color:C.text,
                     outline:"none", boxSizing:"border-box", marginBottom:10, fontWeight:600 }} />

          {/* 正文 */}
          <textarea value={body} onChange={(e) => setBody(e.target.value)}
            placeholder={type === "image" ? "说点什么…" : "写下你想分享的内容…"}
            rows={6} maxLength={5000} disabled={isPublishing}
            style={{ width:"100%", borderRadius:14, padding:"12px 14px", fontSize:14,
                     border:`1.5px solid ${C.border}`, background:"white", color:C.text,
                     outline:"none", boxSizing:"border-box", resize:"vertical",
                     fontFamily:"inherit", lineHeight:1.55 }} />

          {isPublishing && (
            <div style={{ marginTop:14, textAlign:"center", fontSize:12, color:C.sub }}>
              {phase === "uploading" && (type === "video" ? `📤 视频上传中 ${videoPct}%` : `📤 正在上传 ${progress.done}/${progress.total}`)}
              {phase === "saving"    && "💾 正在保存…"}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes compose-up { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}

function _abort() {
  const e = new Error("已取消");
  e.name = "AbortError";
  return e;
}
