"use client";

/**
 * components/community/PrivateChatDetail.jsx
 *
 * 一对一私聊详情（自包含浮层，position:absolute inset:0）。
 * 可从两处打开：
 *   - 私聊列表：传 conversationId + target（对方资料）
 *   - 用户主页：只传 target（内部 getOrCreate 会话）
 *
 * 我的消息靠右橙色气泡，对方靠左白色气泡；文字 + 图片；Realtime 实时；进入即已读。
 * 不复用、不影响群聊 Realtime。
 */

import { useEffect, useRef, useState } from "react";
import {
  getOrCreateConversation, listPrivateMessages,
  sendPrivateText, uploadPrivateImage, sendPrivateImageMsg,
  uploadPrivateVideo, sendPrivateVideoMsg,
  markConversationRead, subscribePrivateConversation, unsubscribePrivate,
} from "@/services/privateChatService";
import { isFollowing } from "@/services/communityService";
import { captureVideoThumbnail, fmtDuration } from "@/services/videoThumb";
import UserProfile from "./UserProfile";

// 私聊消息内存缓存（convId → 消息列表）：再次打开会话时秒显，后台静默刷新
const pmMsgCache = new Map();

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", text:"#2A2520",
  sub:"#8A8178", light:"#D6D5D8", border:"#E4DED3",
};

function fmtTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("zh", { hour: "2-digit", minute: "2-digit" });
}

function Avatar({ url, size = 38, onClick }) {
  return (
    <div onClick={onClick}
      style={{ width:size, height:size, borderRadius:"50%", background:C.tint, flexShrink:0,
                  overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:size * 0.5, cursor: onClick ? "pointer" : "default" }}>
      {url ? <img src={url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : "🐾"}
    </div>
  );
}

export default function PrivateChatDetail({ meId, target, conversationId = null, onClose, onActivity }) {
  const [convId, setConvId]   = useState(conversationId);
  const [msgs, setMsgs]       = useState(() => (conversationId && pmMsgCache.get(conversationId)) || []);
  const [loading, setLoading] = useState(() => !(conversationId && pmMsgCache.has(conversationId)));
  const [err, setErr]         = useState(null);
  const [inp, setInp]         = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [rel, setRel]         = useState({ mutual: false, loaded: false }); // 互相关注关系
  const [notice, setNotice]   = useState(null);
  const [playing, setPlaying] = useState(() => new Set());                  // 正在内联播放的视频消息 id
  const [profileOpen, setProfileOpen] = useState(false);                    // 对方主页浮层
  const openProfile = () => { if (target?.id) setProfileOpen(true); };

  const scrollRef  = useRef(null);
  const chRef      = useRef(null);
  const fileRef    = useRef(null);
  const noticeRef  = useRef();

  const flash = (msg) => {
    clearTimeout(noticeRef.current);
    setNotice(msg);
    noticeRef.current = setTimeout(() => setNotice(null), 2600);
  };

  /* 私信权限：互相关注=畅聊+图片；未互关=只能发 1 条文字、不能发图 */
  const theyReplied = msgs.some((m) => m.sender_id === target?.id);
  const myCount     = msgs.reduce((n, m) => (m.sender_id === meId ? n + 1 : n), 0);
  const canText     = rel.mutual || theyReplied || myCount < 1;
  const canImage    = rel.mutual;
  const strangerBanner = rel.loaded && !rel.mutual && !theyReplied;

  /* 解析会话 → 加载历史 → 订阅 → 标记已读 */
  useEffect(() => {
    let alive = true;
    setErr(null);
    const hasCache = conversationId && pmMsgCache.has(conversationId);
    if (!hasCache) { setLoading(true); setMsgs([]); } // 有缓存则保留旧消息、不转圈，后台静默刷新
    (async () => {
      try {
        let cid = conversationId;
        if (!cid) {
          const conv = await getOrCreateConversation(meId, target.id);
          cid = conv.id;
        }
        if (!alive) return;
        setConvId(cid);

        // 关系：是否互相关注（决定能否畅聊 / 发图片）
        Promise.all([
          isFollowing(meId, target.id),
          isFollowing(target.id, meId),
        ]).then(([iFollow, theyFollow]) => {
          if (alive) setRel({ mutual: iFollow && theyFollow, loaded: true });
        }).catch(() => { if (alive) setRel({ mutual: false, loaded: true }); });

        const list = await listPrivateMessages(cid);
        if (!alive) return;
        setMsgs(list);
        pmMsgCache.set(cid, list);

        markConversationRead(cid, meId).then(() => onActivity?.()).catch(() => {});

        const ch = subscribePrivateConversation(cid, (row) => {
          if (!alive) return;
          setMsgs((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            const next = [...prev, row];
            pmMsgCache.set(cid, next);
            return next;
          });
          if (row.sender_id !== meId) {
            markConversationRead(cid, meId).then(() => onActivity?.()).catch(() => {});
          }
        });
        chRef.current = ch;
      } catch (e) {
        if (alive) setErr(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; unsubscribePrivate(chRef.current); chRef.current = null; };
  }, [meId, target?.id, conversationId]); // eslint-disable-line

  /* 滚到底 */
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, loading]);

  const doSendText = async () => {
    const text = inp.trim();
    if (!text || sending || !convId) return;
    if (!canText) { flash("对方回复后才能继续聊天哦 🐾"); return; }
    setSending(true); setInp("");
    try {
      const saved = await sendPrivateText({ convId, senderId: meId, receiverId: target.id, content: text });
      setMsgs((prev) => prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]);
      onActivity?.();
    } catch (e) { setErr(e.message); setInp(text); }
    finally { setSending(false); }
  };

  const openMediaPicker = () => {
    if (uploading || !convId) return;
    if (!canImage) { flash("互相关注后才能发图片 / 视频哦~"); return; }
    fileRef.current?.click();
  };

  const doSendMedia = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || uploading || !convId) return;
    if (!canImage) { flash("互相关注后才能发图片 / 视频哦~"); return; }
    const isVideo = (f.type || "").startsWith("video/");
    setUploading(true); setErr(null);
    try {
      let saved;
      if (isVideo) {
        if (f.size > 50 * 1024 * 1024) throw new Error("视频太大啦，请上传 50MB 以内的视频");
        let thumbnailUrl = null, duration = 0;
        try {
          const { thumbFile, duration: d } = await captureVideoThumbnail(f);
          duration = d;
          thumbnailUrl = await uploadPrivateImage(thumbFile, convId);
        } catch { /* 抽帧失败 → 无封面，UI 用默认占位 */ }
        const videoUrl = await uploadPrivateVideo(f, convId);
        saved = await sendPrivateVideoMsg({ convId, senderId: meId, receiverId: target.id, videoUrl, thumbnailUrl, duration });
      } else {
        const url = await uploadPrivateImage(f, convId);
        saved = await sendPrivateImageMsg({ convId, senderId: meId, receiverId: target.id, imageUrl: url });
      }
      setMsgs((prev) => prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]);
      onActivity?.();
    } catch (e) { setErr(e.message); }
    finally { setUploading(false); }
  };

  return (
    <div style={{ position:"absolute", inset:0, zIndex:140, background:C.bg,
                  display:"flex", flexDirection:"column" }}>
      {/* 顶栏 */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"52px 14px 12px",
                    background:"white", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
        <button onClick={onClose}
          style={{ background:"transparent", border:"none", cursor:"pointer", fontSize:20,
                   color:C.text, padding:"2px 4px" }}>‹</button>
        <Avatar url={target?.avatar_url} size={36} onClick={openProfile} />
        <div onClick={openProfile} style={{ flex:1, minWidth:0, cursor:"pointer" }}>
          <div style={{ fontSize:15, fontWeight:800, color:C.text,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {target?.username || "毛孩子家长"}
          </div>
          <div style={{ fontSize:11, color:C.pri, marginTop:1 }}>在线</div>
        </div>
        <span style={{ fontSize:20, color:C.sub, letterSpacing:1, padding:"0 4px" }}>···</span>
      </div>

      {/* 消息区 */}
      <div ref={scrollRef} style={{ flex:1, overflowY:"auto", padding:"16px 14px" }}>
        {loading && <div style={{ textAlign:"center", color:C.sub, fontSize:12 }}>加载中…</div>}
        {err && <div style={{ textAlign:"center", color:"#E85D5D", fontSize:12, padding:"6px 0" }}>❌ {err}</div>}
        {!loading && !err && msgs.length === 0 && (
          <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:"40px 0" }}>
            打个招呼，开始聊天吧 🐾
          </div>
        )}

        {msgs.map((m) => {
          const own = m.sender_id === meId;
          const isImg = m.message_type === "image" && m.image_url;
          const isVideo = m.message_type === "video" && m.video_url;
          return (
            <div key={m.id} style={{ display:"flex", gap:8, marginBottom:14,
                                     flexDirection: own ? "row-reverse" : "row" }}>
              {!own && <Avatar url={target?.avatar_url} size={34} onClick={openProfile} />}
              <div style={{ maxWidth:"72%", display:"flex", flexDirection:"column",
                            alignItems: own ? "flex-end" : "flex-start" }}>
                {isVideo ? (
                  playing.has(m.id) ? (
                    <video src={m.video_url} poster={m.thumbnail_url || undefined}
                      controls autoPlay playsInline
                      style={{ maxWidth:220, width:"100%", borderRadius:16, display:"block",
                               boxShadow:"0 1px 6px rgba(0,0,0,0.08)" }} />
                  ) : (
                    <div onClick={() => setPlaying((p) => new Set(p).add(m.id))}
                      style={{ position:"relative", maxWidth:220, width:200, borderRadius:16,
                               overflow:"hidden", cursor:"pointer", background:C.tint,
                               aspectRatio:"3 / 4", boxShadow:"0 1px 6px rgba(0,0,0,0.08)",
                               display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {m.thumbnail_url
                        ? <img src={m.thumbnail_url} alt="视频" loading="lazy"
                            style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
                        : <span style={{ fontSize:34 }}>🎬</span>}
                      <span style={{ position:"relative", width:44, height:44, borderRadius:"50%",
                                     background:"rgba(0,0,0,0.45)", display:"flex",
                                     alignItems:"center", justifyContent:"center" }}>
                        <span style={{ borderLeft:"14px solid white", borderTop:"9px solid transparent",
                                       borderBottom:"9px solid transparent", marginLeft:4 }} />
                      </span>
                      {m.duration > 0 && (
                        <span style={{ position:"absolute", right:8, bottom:8, background:"rgba(0,0,0,0.6)",
                                       color:"white", fontSize:11, padding:"1px 6px", borderRadius:6 }}>
                          {fmtDuration(m.duration)}
                        </span>
                      )}
                    </div>
                  )
                ) : isImg ? (
                  <img src={m.image_url} alt="图片" loading="lazy"
                    onClick={() => typeof window !== "undefined" && window.open(m.image_url, "_blank")}
                    style={{ maxWidth:220, width:"100%", borderRadius:16, display:"block",
                             objectFit:"cover", cursor:"pointer",
                             boxShadow:"0 1px 6px rgba(0,0,0,0.08)" }} />
                ) : (
                  <div style={{ padding:"10px 14px", fontSize:14, lineHeight:1.55,
                                borderRadius: own ? "18px 6px 18px 18px" : "6px 18px 18px 18px",
                                background: own ? C.pri : "white", color: own ? "white" : C.text,
                                boxShadow:"0 1px 6px rgba(0,0,0,0.05)",
                                wordBreak:"break-word", whiteSpace:"pre-wrap" }}>
                    {m.content}
                  </div>
                )}
                <div style={{ fontSize:10, color:C.sub, marginTop:3, padding:"0 4px",
                              display:"flex", gap:6, alignItems:"center" }}>
                  {fmtTime(m.created_at)}
                  {own && <span style={{ opacity:0.7 }}>{m.read_at ? "已读" : "已发送"}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 轻提示 */}
      {notice && (
        <div style={{ position:"absolute", left:"50%", bottom:96, transform:"translateX(-50%)",
                      background:"#2A2520", color:"white", padding:"9px 16px", borderRadius:999,
                      fontSize:12.5, fontWeight:600, zIndex:10, maxWidth:"82%", textAlign:"center",
                      boxShadow:"0 6px 20px rgba(0,0,0,0.25)" }}>
          {notice}
        </div>
      )}

      {/* 陌生人提示条（未互相关注）*/}
      {strangerBanner && (
        <div style={{ background:"#FBF1E6", borderTop:`1px solid ${C.border}`,
                      padding:"9px 16px", fontSize:11.5, color:"#9A7B55", textAlign:"center",
                      lineHeight:1.5, flexShrink:0 }}>
          {canText
            ? "只能先发一条消息打个招呼～ 对方回复后即可继续聊天（互相关注后可发图片）"
            : "对方回复后才能继续聊天 🐾"}
        </div>
      )}

      {/* 输入区 */}
      <div style={{ background:"white", borderTop:`1px solid ${C.border}`, padding:"10px 12px 20px",
                    display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
        <button onClick={openMediaPicker} disabled={uploading || !convId}
          style={{ width:38, height:38, borderRadius:"50%", flexShrink:0, background:C.bg,
                   border:`1px solid ${C.border}`, cursor: uploading ? "default" : "pointer",
                   opacity: canImage ? 1 : 0.45,
                   display:"flex", alignItems:"center", justifyContent:"center", color:C.pri, fontSize:20 }}>
          {uploading ? "…" : "＋"}
        </button>
        <input ref={fileRef} type="file" accept="image/*,video/*" onChange={doSendMedia} style={{ display:"none" }} />
        <input
          value={inp}
          onChange={(e) => setInp(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doSendText()}
          disabled={!canText}
          placeholder={canText ? "输入消息..." : "对方回复后才能继续聊天"}
          style={{ flex:1, borderRadius:999, padding:"10px 16px", fontSize:14, minWidth:0,
                   border:`1.5px solid ${C.border}`, background:C.bg,
                   color: canText ? C.text : C.sub, outline:"none",
                   cursor: canText ? "text" : "not-allowed" }} />
        <button onClick={doSendText} disabled={!inp.trim() || sending || !canText}
          style={{ flexShrink:0, padding:"9px 18px", borderRadius:999, border:"none",
                   background: inp.trim() && !sending && canText ? C.pri : C.light, color:"white",
                   fontSize:14, fontWeight:700,
                   cursor: inp.trim() && !sending && canText ? "pointer" : "default" }}>
          发送
        </button>
      </div>

      {/* 点头像/名字 → 对方主页（覆盖层）*/}
      {profileOpen && target?.id && (
        <UserProfile viewerId={meId} userId={target.id} onClose={() => setProfileOpen(false)} />
      )}
    </div>
  );
}
