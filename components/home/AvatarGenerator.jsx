"use client";

/**
 * components/home/AvatarGenerator.jsx
 *
 * AI 宠物头像生成弹窗：
 *  pick → preview → generate → result → 使用 / 重新生成 / 取消
 */

import { useEffect, useRef, useState } from "react";
import {
  uploadOriginalPhoto,
  generateAIAvatar,
  saveAIAvatarToPet,
} from "@/services/petAvatarService";
import { compressImage } from "@/services/imageCompress";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", text:"#1A1006",
  sub:"#8A8074", light:"#D6D5D8", border:"#D6D5D8",
};

const PHASES = {
  PICK:    "pick",     // 选图
  PREVIEW: "preview",  // 预览原图
  GENING:  "gening",   // 生成中
  RESULT:  "result",   // 出图，等用户决定
  ERROR:   "error",
};

export default function AvatarGenerator({ user, pet, onSaved, onClose }) {
  const [phase,         setPhase]         = useState(PHASES.PICK);
  const [pickedFile,    setPickedFile]    = useState(null);     // 压缩后的 File
  const [previewSrc,    setPreviewSrc]    = useState(null);     // dataURL
  const [originalUrl,   setOriginalUrl]   = useState(null);     // Storage 上原图 public URL
  const [aiUrl,         setAiUrl]         = useState(null);
  const [thumbUrl,      setThumbUrl]      = useState(null);
  const [errMsg,        setErrMsg]        = useState(null);
  const [elapsed,       setElapsed]       = useState(0);
  const abortRef    = useRef(null);
  const timerRef    = useRef(null);

  // 生成中计时显示
  useEffect(() => {
    if (phase === PHASES.GENING) {
      const t0 = Date.now();
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - t0) / 1000));
      }, 500);
      return () => clearInterval(timerRef.current);
    }
  }, [phase]);

  /* ── 选图 ─────────────────────────────────── */
  const handlePick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";   // 允许同一文件再选
    if (!f) return;
    setErrMsg(null);
    try {
      // 先压缩（最长边 1280，质量 0.85）—— Replicate 接收更快，省 Storage
      const compressed = await compressImage(f, { maxDim: 1280, quality: 0.85 });
      setPickedFile(compressed);
      const reader = new FileReader();
      reader.onload = (ev) => setPreviewSrc(ev.target.result);
      reader.readAsDataURL(compressed);
      setPhase(PHASES.PREVIEW);
    } catch (err) {
      setErrMsg(err.message || "读取照片失败");
    }
  };

  /* ── 生成（包括首次和"重新生成"）──────────── */
  const handleGenerate = async () => {
    if (!pickedFile || !user?.id || !pet?.id) return;
    setErrMsg(null);
    setPhase(PHASES.GENING);
    abortRef.current = new AbortController();

    try {
      // 1) 上传原图（如果还没传过 / 重新生成可以复用同一张原图）
      let photoUrl = originalUrl;
      if (!photoUrl) {
        const { url } = await uploadOriginalPhoto(pickedFile, user.id, pet.id);
        photoUrl = url;
        setOriginalUrl(url);
      }

      // 2) 调 Replicate（30-60s）
      const { aiUrl: resultUrl, thumbUrl: resultThumb } = await generateAIAvatar(
        { userId: user.id, petId: pet.id, photoUrl },
        abortRef.current.signal
      );

      setAiUrl(resultUrl);
      setThumbUrl(resultThumb);
      setPhase(PHASES.RESULT);
    } catch (err) {
      if (err.name === "AbortError") {
        setPhase(PHASES.PREVIEW); // 回到预览，不报错
      } else {
        setErrMsg("生成失败啦，可以换一张更清晰的照片再试试");
        setPhase(PHASES.ERROR);
      }
    }
  };

  /* ── 使用这个头像 ────────────────────────── */
  const handleUse = async () => {
    if (!aiUrl || !pet?.id || !user?.id) return;
    try {
      const updated = await saveAIAvatarToPet(pet.id, user.id, {
        aiAvatarUrl:       aiUrl,
        originalPhotoUrl:  originalUrl,
        petAvatarThumbUrl: thumbUrl,
      });
      onSaved?.(updated);
      onClose?.();
    } catch (e) {
      setErrMsg(e.message);
    }
  };

  /* ── 重置回选图 ───────────────────────────── */
  const handleResetAll = () => {
    setPickedFile(null);
    setPreviewSrc(null);
    setOriginalUrl(null);
    setAiUrl(null);
    setThumbUrl(null);
    setErrMsg(null);
    setPhase(PHASES.PICK);
  };

  /* ── 取消生成 / 关闭 ─────────────────────── */
  const handleCancelGen = () => {
    try { abortRef.current?.abort(); } catch {}
    setPhase(PHASES.PREVIEW);
  };

  return (
    <div onClick={(e) => phase !== PHASES.GENING && e.target === e.currentTarget && onClose?.()}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000,
               display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, background:C.bg,
                    borderRadius:"22px 22px 0 0", padding:"18px 18px 28px",
                    maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ width:40, height:4, borderRadius:4, background:C.light,
                      margin:"0 auto 16px" }}/>
        <div style={{ fontSize:18, fontWeight:800, color:C.text, marginBottom:6, textAlign:"center" }}>
          ✨ AI 专属宠物形象
        </div>
        <div style={{ fontSize:12, color:C.sub, marginBottom:16, textAlign:"center" }}>
          上传一张毛孩的清晰照片，AI 给它生成一个可爱头像
        </div>

        {phase === PHASES.PICK && (
          <PickStep onPick={handlePick} />
        )}

        {phase === PHASES.PREVIEW && previewSrc && (
          <PreviewStep
            src={previewSrc}
            onReselect={handleResetAll}
            onGenerate={handleGenerate}
            onCancel={onClose}
          />
        )}

        {phase === PHASES.GENING && (
          <GeneratingStep
            previewSrc={previewSrc}
            elapsed={elapsed}
            onCancel={handleCancelGen}
          />
        )}

        {phase === PHASES.RESULT && aiUrl && (
          <ResultStep
            aiUrl={aiUrl}
            onUse={handleUse}
            onRegen={handleGenerate}
            onCancel={handleResetAll}
          />
        )}

        {phase === PHASES.ERROR && (
          <ErrorStep
            errMsg={errMsg}
            onRetry={() => setPhase(PHASES.PREVIEW)}
            onResetAll={handleResetAll}
          />
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────── */
function PickStep({ onPick }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"20px 0" }}>
      <label style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10,
                      width:"100%", padding:"30px 16px", borderRadius:18,
                      background:"white", border:`1.5px dashed ${C.border}`, cursor:"pointer",
                      transition:"border-color .15s" }}
        onMouseOver={(e) => e.currentTarget.style.borderColor = C.pri}
        onMouseOut={(e) => e.currentTarget.style.borderColor = C.border}>
        <div style={{ fontSize:48 }}>📷</div>
        <div style={{ fontSize:14, fontWeight:700, color:C.text }}>选择毛孩照片</div>
        <div style={{ fontSize:11, color:C.sub, lineHeight:1.5, textAlign:"center" }}>
          建议光线明亮、正面、面部清晰<br/>支持 JPG / PNG / HEIC，≤ 10MB
        </div>
        <input type="file" accept="image/*"
          onChange={onPick}
          style={{ display:"none" }} />
      </label>
    </div>
  );
}

function PreviewStep({ src, onReselect, onGenerate, onCancel }) {
  return (
    <>
      <div style={{ width:"100%", aspectRatio:"1", borderRadius:18, overflow:"hidden",
                    background:C.tint, marginBottom:14 }}>
        <img src={src} alt=""
             style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:10 }}>
        <button onClick={onReselect}
          style={{ flex:1, padding:"11px 0", borderRadius:14, fontSize:13, fontWeight:600,
                   background:"white", color:C.text, border:`1px solid ${C.border}`,
                   cursor:"pointer" }}>
          重新选择
        </button>
        <button onClick={onGenerate}
          style={{ flex:2, padding:"11px 0", borderRadius:14, fontSize:13, fontWeight:700,
                   background:C.pri, color:"white", border:"none", cursor:"pointer" }}>
          ✨ 生成专属宠物形象
        </button>
      </div>
      <button onClick={onCancel}
        style={{ width:"100%", padding:"8px 0", fontSize:12, color:C.sub,
                 background:"transparent", border:"none", cursor:"pointer" }}>
        取消
      </button>
    </>
  );
}

function GeneratingStep({ previewSrc, elapsed, onCancel }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"6px 0" }}>
      <div style={{ position:"relative", width:160, height:160, borderRadius:"50%",
                    overflow:"hidden", background:C.tint, marginBottom:18,
                    boxShadow:"0 6px 18px rgba(230,134,69,0.18)" }}>
        {previewSrc && (
          <img src={previewSrc} alt=""
            style={{ width:"100%", height:"100%", objectFit:"cover",
                     filter:"saturate(0.6) blur(2px)" }} />
        )}
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center",
                      justifyContent:"center", background:"rgba(238,233,225,0.55)" }}>
          <span style={{ fontSize:42, animation:"spin 1.4s linear infinite" }}>✨</span>
        </div>
      </div>
      <div style={{ fontSize:14, fontWeight:700, color:C.text }}>
        正在生成专属宠物形象…
      </div>
      <div style={{ fontSize:12, color:C.sub, marginTop:4 }}>
        大约需要 30 - 60 秒（已用时 {elapsed}s）
      </div>

      {/* 进度条（视觉占位，不是真实进度） */}
      <div style={{ width:"100%", height:6, borderRadius:6, background:C.light, marginTop:18,
                    overflow:"hidden" }}>
        <div style={{ width:`${Math.min(100, (elapsed / 60) * 100)}%`,
                      height:"100%", background:C.pri, transition:"width .6s linear" }} />
      </div>

      <button onClick={onCancel}
        style={{ marginTop:18, padding:"8px 20px", fontSize:12, color:C.sub,
                 background:"transparent", border:`1px solid ${C.border}`,
                 borderRadius:14, cursor:"pointer" }}>
        取消
      </button>

      <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

function ResultStep({ aiUrl, onUse, onRegen, onCancel }) {
  const [saving, setSaving] = useState(false);
  return (
    <>
      <div style={{ width:"100%", aspectRatio:"1", borderRadius:18, overflow:"hidden",
                    background:C.tint, marginBottom:14,
                    boxShadow:"0 6px 18px rgba(230,134,69,0.18)" }}>
        <img src={aiUrl} alt=""
             style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
      </div>
      <button onClick={async () => { setSaving(true); try { await onUse(); } finally { setSaving(false); } }}
        disabled={saving}
        style={{ width:"100%", padding:"12px 0", borderRadius:14, fontSize:14, fontWeight:700,
                 background:C.pri, color:"white", border:"none",
                 cursor: saving ? "default" : "pointer", marginBottom:8 }}>
        {saving ? "保存中..." : "使用这个头像"}
      </button>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={onRegen} disabled={saving}
          style={{ flex:1, padding:"10px 0", borderRadius:14, fontSize:13, fontWeight:600,
                   background:C.tint, color:C.text, border:"none", cursor:"pointer" }}>
          🔁 重新生成
        </button>
        <button onClick={onCancel} disabled={saving}
          style={{ flex:1, padding:"10px 0", borderRadius:14, fontSize:13, fontWeight:600,
                   background:"white", color:C.text, border:`1px solid ${C.border}`,
                   cursor:"pointer" }}>
          取消
        </button>
      </div>
    </>
  );
}

function ErrorStep({ errMsg, onRetry, onResetAll }) {
  return (
    <div style={{ padding:"20px 6px" }}>
      <div style={{ fontSize:32, textAlign:"center", marginBottom:10 }}>😿</div>
      <div style={{ fontSize:13, color:C.text, textAlign:"center", lineHeight:1.6,
                    marginBottom:18 }}>
        {errMsg || "生成失败啦，可以换一张更清晰的照片再试试"}
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={onResetAll}
          style={{ flex:1, padding:"11px 0", borderRadius:14, fontSize:13, fontWeight:600,
                   background:"white", color:C.text, border:`1px solid ${C.border}`,
                   cursor:"pointer" }}>
          重新选图
        </button>
        <button onClick={onRetry}
          style={{ flex:1, padding:"11px 0", borderRadius:14, fontSize:13, fontWeight:700,
                   background:C.pri, color:"white", border:"none", cursor:"pointer" }}>
          再试一次
        </button>
      </div>
    </div>
  );
}
