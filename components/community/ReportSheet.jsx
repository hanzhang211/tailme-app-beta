"use client";

/**
 * components/community/ReportSheet.jsx
 *
 * 通用举报底部弹层（帖子 / 私聊 / 群聊共用，TailMe 米白橙风）：
 *  被举报对象预览 + 原因单选 + 补充说明(≤200) + 截图(≤3) + 提交。
 *
 * props:
 *  - preview: { thumb, title, desc }   被举报对象预览卡内容
 *  - reasons: string[]                 原因选项（默认 REPORT_REASONS）
 *  - onSubmit: async ({ reason, detail, images }) => void   由调用方决定写哪张表
 *  - user / toast / onClose
 */

import { useState } from "react";
import { REPORT_REASONS, uploadReportImage } from "@/services/postReportService";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", text:"#1A1006",
  sub:"#8A8074", light:"#D6D5D8", border:"#D6D5D8",
};

export default function ReportSheet({ preview, user, onClose, toast, onSubmit, reasons = REPORT_REASONS }) {
  const [reason, setReason]       = useState(null);
  const [detail, setDetail]       = useState("");
  const [images, setImages]       = useState([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy]           = useState(false);

  const pickImages = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    const room = 3 - images.length;
    if (room <= 0) { toast?.("最多上传 3 张截图", "warn"); return; }
    setUploading(true);
    try {
      const urls = [];
      for (const f of files.slice(0, room)) urls.push(await uploadReportImage(f, user?.id));
      setImages((arr) => [...arr, ...urls]);
    } catch (err) { toast?.(err.message, "error"); }
    finally { setUploading(false); }
  };

  const submit = async () => {
    if (!reason || busy) return;
    if (!user?.id) { toast?.("请先登录", "warn"); return; }
    setBusy(true);
    try {
      await onSubmit({ reason, detail: detail.trim() || null, images });
      toast?.("举报已提交，我们会尽快审核处理", "success");
      onClose?.();
    } catch (err) {
      toast?.(err.message || "提交失败，请稍后重试", "error");
    } finally { setBusy(false); }
  };

  const canSubmit = !!reason && !busy;

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose?.()}
      style={{ position:"fixed", inset:0, zIndex:520, background:"rgba(0,0,0,0.45)",
               display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, background:C.bg,
                    borderRadius:"22px 22px 0 0", padding:"14px 0 22px",
                    maxHeight:"90vh", overflowY:"auto", animation:"compose-up .25s ease-out" }}>
        <div style={{ width:40, height:4, borderRadius:4, background:C.light, margin:"0 auto 14px" }} />

        {/* 标题 */}
        <div style={{ textAlign:"center", padding:"0 18px 4px" }}>
          <div style={{ fontSize:17, fontWeight:800, color:C.text }}>举报内容</div>
          <div style={{ fontSize:12, color:C.sub, marginTop:4 }}>请选择举报原因，我们会在审核后处理</div>
        </div>

        {/* 被举报对象预览 */}
        {preview && (
          <div style={{ display:"flex", alignItems:"center", gap:10, margin:"12px 14px",
                        background:"white", borderRadius:14, padding:10, border:`1px solid ${C.light}` }}>
            {preview.thumb
              ? <img src={preview.thumb} alt="" style={{ width:46, height:46, borderRadius:10, objectFit:"cover", flexShrink:0 }} />
              : <div style={{ width:46, height:46, borderRadius:10, background:C.tint, flexShrink:0,
                              display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🐾</div>}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.text, overflow:"hidden",
                            textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{preview.title}</div>
              <div style={{ fontSize:11, color:C.sub, marginTop:2, display:"-webkit-box",
                            WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden", lineHeight:1.4, whiteSpace:"pre-wrap" }}>
                {preview.desc || "（无文字内容）"}
              </div>
            </div>
          </div>
        )}

        {/* 原因单选 */}
        <div style={{ padding:"0 14px" }}>
          {reasons.map((r) => {
            const on = reason === r;
            return (
              <button key={r} onClick={() => setReason(r)}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:10,
                         background:"white", border:`1.5px solid ${on ? C.pri : C.light}`,
                         borderRadius:14, padding:"13px 14px", marginBottom:8, cursor:"pointer",
                         textAlign:"left", transition:"border .15s" }}>
                <span style={{ flex:1, fontSize:14, fontWeight: on ? 700 : 600, color: on ? C.pri : C.text }}>{r}</span>
                <span style={{ width:18, height:18, borderRadius:"50%", flexShrink:0,
                               border:`2px solid ${on ? C.pri : C.light}`, background: on ? C.pri : "transparent",
                               display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {on && <span style={{ width:7, height:7, borderRadius:"50%", background:"white" }} />}
                </span>
              </button>
            );
          })}
        </div>

        {/* 补充说明 */}
        <div style={{ padding:"6px 14px 0" }}>
          <div style={{ position:"relative" }}>
            <textarea value={detail} onChange={(e) => setDetail(e.target.value.slice(0, 200))}
              placeholder="请补充说明问题，帮助我们更快处理（选填）"
              style={{ width:"100%", minHeight:80, borderRadius:14, border:`1px solid ${C.light}`,
                       padding:"12px 14px", fontSize:13, color:C.text, resize:"vertical",
                       background:"white", outline:"none", boxSizing:"border-box", fontFamily:"inherit" }} />
            <span style={{ position:"absolute", right:12, bottom:10, fontSize:11, color:C.sub }}>{detail.length}/200</span>
          </div>
        </div>

        {/* 上传截图 */}
        <div style={{ padding:"12px 14px 0" }}>
          <div style={{ fontSize:12, color:C.sub, marginBottom:8 }}>上传截图（选填，最多 3 张）</div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {images.map((u, i) => (
              <div key={i} style={{ position:"relative", width:72, height:72, borderRadius:12, overflow:"hidden" }}>
                <img src={u} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                <span onClick={() => setImages((arr) => arr.filter((_, j) => j !== i))}
                  style={{ position:"absolute", top:2, right:2, width:18, height:18, borderRadius:"50%",
                           background:"rgba(0,0,0,0.5)", color:"white", fontSize:13, lineHeight:"18px",
                           textAlign:"center", cursor:"pointer" }}>×</span>
              </div>
            ))}
            {images.length < 3 && (
              <label style={{ width:72, height:72, borderRadius:12, border:`1.5px dashed ${C.light}`,
                              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                              cursor:"pointer", color:C.sub, background:"white" }}>
                <span style={{ fontSize:22, lineHeight:1 }}>{uploading ? "…" : "＋"}</span>
                <span style={{ fontSize:10, marginTop:2 }}>添加图片</span>
                <input type="file" accept="image/*" multiple disabled={uploading}
                  onChange={pickImages} style={{ display:"none" }} />
              </label>
            )}
          </div>
        </div>

        {/* 提示条 */}
        <div style={{ margin:"14px 14px 0", background:C.tint, borderRadius:12, padding:"10px 12px",
                      fontSize:11, color:C.sub, lineHeight:1.6 }}>
          ⓘ 提交后将进入后台审核，管理员可查看举报内容、举报人与原因。
        </div>

        {/* 提交 / 取消 */}
        <div style={{ padding:"14px 14px 0" }}>
          <button onClick={submit} disabled={!canSubmit}
            style={{ width:"100%", padding:"14px 0", borderRadius:16, fontSize:15, fontWeight:800,
                     border:"none", color:"white",
                     background: canSubmit ? C.pri : "#E5D8C8",
                     cursor: canSubmit ? "pointer" : "default",
                     boxShadow: canSubmit ? "0 4px 14px rgba(230,134,69,0.35)" : "none" }}>
            {busy ? "提交中…" : "提交举报"}
          </button>
          <button onClick={onClose}
            style={{ width:"100%", padding:"12px 0", marginTop:6, background:"transparent",
                     border:"none", color:C.sub, fontSize:14, fontWeight:600, cursor:"pointer" }}>
            取消
          </button>
        </div>
      </div>
      <style>{`@keyframes compose-up { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}
