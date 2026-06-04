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
import PetCameraIllustration from "@/components/illustrations/PetCameraIllustration";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", text:"#2A2520",
  sub:"#8A8178", light:"#D6D5D8", border:"#D6D5D8", peach:"#F2C7A5",
};

/* 小四角星（标题装饰，浅橙/金色）*/
function TitleStar({ size = 16, color = "#E8A24E" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 2l2.4 6.2L21 10l-6.6 1.8L12 22l-2.4-6.2L3 10l6.6-1.8L12 2z" />
    </svg>
  );
}

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
  const [saveErr,       setSaveErr]       = useState(null);
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
        { userId: user.id, petId: pet.id, photoUrl, petType: pet?.pet_type || "dog" },
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
    setSaveErr(null);
    try {
      const updated = await saveAIAvatarToPet(pet.id, user.id, {
        aiAvatarUrl:       aiUrl,
        originalPhotoUrl:  originalUrl,
        petAvatarThumbUrl: thumbUrl,
      });
      onSaved?.(updated);
      onClose?.();
    } catch (e) {
      setSaveErr(e.message || "保存失败，请再试一次");
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
      <div onClick={(e) => e.stopPropagation()}
        style={{ width:"100%", maxWidth:430, background:C.bg,
                 borderRadius:"30px 30px 0 0", padding:"14px 18px calc(28px + env(safe-area-inset-bottom))",
                 maxHeight:"92vh", overflowY:"auto", animation:"aiSheetUp .26s ease-out" }}>
        <style>{`@keyframes aiSheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
        <div style={{ width:40, height:4, borderRadius:4, background:C.light,
                      margin:"0 auto 18px" }}/>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:7 }}>
          <TitleStar size={15} />
          <span style={{ fontSize:23, fontWeight:800, color:C.text, letterSpacing:0.2 }}>AI 专属宠物形象</span>
          <TitleStar size={15} />
        </div>
        <div style={{ fontSize:13.5, color:C.sub, marginBottom:18, textAlign:"center", lineHeight:1.5 }}>
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
            saveErr={saveErr}
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
  const inputRef = useRef(null);
  const openPicker = () => inputRef.current?.click();

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" onChange={onPick} style={{ display:"none" }} />

      {/* 上传区：大圆角虚线框 + 相机插画 */}
      <div onClick={openPicker}
        style={{ width:"100%", borderRadius:24, background:"white",
                 border:`2px dashed ${C.peach}`, cursor:"pointer",
                 padding:"22px 18px 24px", display:"flex", flexDirection:"column",
                 alignItems:"center", boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}>
        <PetCameraIllustration size={158} style={{ display:"block", marginBottom:6 }} />
        <div style={{ fontSize:16, fontWeight:800, color:C.text, marginBottom:6 }}>选择毛孩照片</div>
        <div style={{ fontSize:13, color:C.sub }}>建议光线明亮、正面、面部清晰</div>
        <div style={{ fontSize:11.5, color:C.light, marginTop:3 }}>
          {"支持 JPG / PNG / HEIC，< 10MB"}
        </div>
      </div>

      {/* 拍照建议卡片：三列 */}
      <div style={{ display:"flex", background:"white", borderRadius:20, padding:"14px 6px",
                    marginTop:14, boxShadow:"0 2px 10px rgba(0,0,0,0.04)" }}>
        {[
          { Icon: SunIcon,  title:"正面更清晰", note:"建议正面对镜头" },
          { Icon: BulbIcon, title:"光线充足",   note:"自然光效果更佳" },
          { Icon: PawIcon,  title:"五官完整",   note:"避免遮挡更准确" },
        ].map((t, i) => (
          <div key={t.title} style={{ flex:1, display:"flex", alignItems:"center" }}>
            {i > 0 && <div style={{ width:1, height:36, background:C.border, opacity:0.6 }} />}
            <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:"0 4px" }}>
              <t.Icon />
              <div style={{ fontSize:12.5, fontWeight:700, color:C.text }}>{t.title}</div>
              <div style={{ fontSize:10.5, color:C.sub, textAlign:"center" }}>{t.note}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 主按钮 */}
      <button onClick={openPicker}
        style={{ width:"100%", height:56, marginTop:16, borderRadius:999, border:"none",
                 background:C.pri, color:"white", fontSize:18, fontWeight:800, cursor:"pointer",
                 boxShadow:"0 8px 18px rgba(230,134,69,0.32)" }}>
        选择照片
      </button>

      {/* 隐私提示 */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginTop:14 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3l7 3v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z" stroke={C.peach} strokeWidth="1.8" strokeLinejoin="round"/>
          <path d="M8.8 12.2l2.2 2.2 4-4.4" stroke={C.peach} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{ fontSize:12, color:C.sub }}>仅用于生成宠物形象，我们会严格保护你的隐私</span>
      </div>
    </>
  );
}

/* 建议卡片橙色线条小图标 */
function SunIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" stroke="#E68645" strokeWidth="1.8"/>
      <g stroke="#E68645" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7"/>
      </g>
    </svg>
  );
}
function BulbIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 16.5a6 6 0 1 1 6 0c-.5.4-.8 1-.8 1.7v.3H9.8v-.3c0-.7-.3-1.3-.8-1.7z"
            stroke="#E68645" strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M9.8 20.5h4.4" stroke="#E68645" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
function PawIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#E68645" aria-hidden="true">
      <ellipse cx="6" cy="9" rx="1.9" ry="2.5"/><ellipse cx="10.3" cy="6" rx="2.1" ry="2.8"/>
      <ellipse cx="14.7" cy="6" rx="2.1" ry="2.8"/><ellipse cx="18.5" cy="9.5" rx="1.9" ry="2.4"/>
      <path d="M7.5 14.5q-2 4 1.5 6.4 3.4 1.6 6.6-.2 2.4-2.2.4-6.2-1.6-2.6-4.5-2.6-2.6 0-4 2.6z"/>
    </svg>
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

function ResultStep({ aiUrl, onUse, onRegen, onCancel, saveErr }) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try { await onUse(); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div style={{ width:"100%", aspectRatio:"1", borderRadius:18, overflow:"hidden",
                    background:C.tint, marginBottom:14,
                    boxShadow:"0 6px 18px rgba(230,134,69,0.18)" }}>
        <img src={aiUrl} alt=""
             style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
      </div>
      <button onClick={handleSave} disabled={saving}
        style={{ width:"100%", padding:"12px 0", borderRadius:14, fontSize:14, fontWeight:700,
                 background:C.pri, color:"white", border:"none",
                 cursor: saving ? "default" : "pointer", marginBottom:8,
                 opacity: saving ? 0.75 : 1, transition:"opacity .15s" }}>
        {saving ? "保存中…" : "使用这个头像"}
      </button>
      {saveErr && (
        <div style={{ background:"#FFF0F0", color:"#D94040", borderRadius:12,
                      padding:"9px 14px", fontSize:12, lineHeight:1.5,
                      marginBottom:8, textAlign:"center" }}>
          ❌ {saveErr}
        </div>
      )}
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
