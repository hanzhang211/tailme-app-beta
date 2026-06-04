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
            petId={pet?.id}
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
      <TipCard />

      {/* 主按钮 */}
      <button onClick={openPicker}
        style={{ width:"100%", height:56, marginTop:16, borderRadius:999, border:"none",
                 background:C.pri, color:"white", fontSize:18, fontWeight:800, cursor:"pointer",
                 boxShadow:"0 8px 18px rgba(230,134,69,0.32)" }}>
        选择照片
      </button>

      {/* 隐私提示 */}
      <PrivacyNote />
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
function PawIcon({ size = 22, color = "#E68645" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <ellipse cx="6" cy="9" rx="1.9" ry="2.5"/><ellipse cx="10.3" cy="6" rx="2.1" ry="2.8"/>
      <ellipse cx="14.7" cy="6" rx="2.1" ry="2.8"/><ellipse cx="18.5" cy="9.5" rx="1.9" ry="2.4"/>
      <path d="M7.5 14.5q-2 4 1.5 6.4 3.4 1.6 6.6-.2 2.4-2.2.4-6.2-1.6-2.6-4.5-2.6-2.6 0-4 2.6z"/>
    </svg>
  );
}

/* 三列拍照建议卡（PICK / 生成中共用）*/
function TipCard() {
  return (
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
  );
}

/* 隐私提示（PICK / 生成中共用）*/
function PrivacyNote() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginTop:14 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3l7 3v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z" stroke={C.peach} strokeWidth="1.8" strokeLinejoin="round"/>
        <path d="M8.8 12.2l2.2 2.2 4-4.4" stroke={C.peach} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span style={{ fontSize:12, color:C.sub }}>仅用于生成宠物形象，我们会严格保护你的隐私</span>
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

const GEN_TIPS = [
  "AI 正在记住它最可爱的表情 ✨",
  "正在帮毛孩子整理小耳朵 🐾",
  "快好了，马上见到专属形象啦",
  "正在让它更像自己一点点",
  "小爪印正在努力创作中 🐾",
];

function GeneratingStep({ previewSrc, elapsed, onCancel }) {
  const [tipIdx, setTipIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTipIdx((i) => (i + 1) % GEN_TIPS.length), 3500);
    return () => clearInterval(t);
  }, []);

  // 视觉进度：随用时缓慢推进，最高 90%（真正完成由父组件切到 RESULT 体现）
  const progress = Math.min(90, Math.round((elapsed / 55) * 90));

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
      {/* ── 头像创作动画 ── */}
      <div style={{ position:"relative", width:236, height:236, margin:"4px 0 4px" }}>
        {/* 旋转虚线轨道 */}
        <div style={{ position:"absolute", inset:14, borderRadius:"50%",
                      border:`2px dashed ${C.peach}`, opacity:0.6,
                      animation:"aiRingSpin 14s linear infinite" }} />

        {/* 圆形预览 */}
        <div style={{ position:"absolute", inset:26, borderRadius:"50%", overflow:"hidden",
                      border:"3px solid rgba(230,134,69,0.35)", background:C.tint,
                      boxShadow:"0 8px 22px rgba(230,134,69,0.18)" }}>
          {previewSrc ? (
            <img src={previewSrc} alt=""
              style={{ width:"100%", height:"100%", objectFit:"cover", filter:"saturate(0.9) blur(1.5px)" }} />
          ) : (
            <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center",
                          justifyContent:"center", fontSize:80, animation:"aiFloat 2.6s ease-in-out infinite" }}>🐶</div>
          )}
          {/* 柔光米白遮罩 */}
          <div style={{ position:"absolute", inset:0, background:"rgba(238,233,225,0.32)" }} />
          {/* shimmer 光扫 */}
          <div style={{ position:"absolute", top:0, bottom:0, left:0, width:"55%",
                        background:"linear-gradient(100deg, transparent, rgba(255,255,255,0.55), transparent)",
                        animation:"aiShimmer 2.4s ease-in-out infinite" }} />
          {/* 中央魔法笔（浮动）*/}
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ animation:"aiFloat 2.6s ease-in-out infinite" }}><MagicPen /></div>
          </div>
        </div>

        {/* 轨道上的爪印（3 个，相位错开，绕圈 + 自身保持正立）*/}
        {[0, -4.67, -9.33].map((d, i) => (
          <div key={i} style={{ position:"absolute", inset:26,
                                animation:"aiOrbit 14s linear infinite", animationDelay:`${d}s` }}>
            <div style={{ position:"absolute", top:-13, left:"50%", marginLeft:-13,
                          animation:"aiOrbitCCW 14s linear infinite", animationDelay:`${d}s` }}>
              <PawBadge />
            </div>
          </div>
        ))}

        {/* 周围小装饰：星星 / 爱心 / 小爪 */}
        <Deco kind="sparkle" style={{ top:34, left:4 }}      delay="0s"   size={16} />
        <Deco kind="sparkle" style={{ bottom:30, right:6 }}  delay="0.8s" size={12} />
        <Deco kind="heart"   style={{ top:64, right:0 }}     delay="0.4s" size={15} />
        <Deco kind="heart"   style={{ bottom:50, left:-2 }}  delay="1.2s" size={12} />
        <Deco kind="paw"     style={{ top:10, right:40 }}    delay="0.6s" size={16} />
      </div>

      {/* 文案 */}
      <div style={{ fontSize:17, fontWeight:800, color:C.text }}>正在画出专属毛孩子形象…</div>
      <div style={{ fontSize:12.5, color:C.sub, marginTop:5 }}>
        大约需要 30 - 60 秒（已用时 {elapsed}s）
      </div>

      {/* 轮播暖心提示 */}
      <div key={tipIdx}
        style={{ marginTop:12, padding:"7px 16px", borderRadius:999, background:"white",
                 border:`1px solid ${C.peach}`, fontSize:12.5, color:C.pri, fontWeight:600,
                 display:"flex", alignItems:"center", gap:6, animation:"aiTipIn .5s ease" }}>
        <PawIcon size={15} /> {GEN_TIPS[tipIdx]}
      </div>

      {/* 进度条：橙色渐变 + 爪印滑块 */}
      <div style={{ position:"relative", width:"100%", height:8, borderRadius:999,
                    background:C.light, marginTop:18 }}>
        <div style={{ height:"100%", width:`${progress}%`, borderRadius:999,
                      background:"linear-gradient(90deg, #F2C7A5, #E68645)", transition:"width .6s ease" }} />
        <div style={{ position:"absolute", top:"50%", left:`${progress}%`, transform:"translate(-50%,-50%)",
                      width:24, height:24, borderRadius:"50%", background:"white",
                      boxShadow:"0 2px 6px rgba(230,134,69,0.4)", transition:"left .6s ease",
                      display:"flex", alignItems:"center", justifyContent:"center" }}>
          <PawIcon size={14} />
        </div>
      </div>

      {/* 建议卡 */}
      <div style={{ width:"100%" }}><TipCard /></div>

      {/* 取消（胶囊）*/}
      <button onClick={onCancel}
        style={{ marginTop:16, padding:"11px 32px", fontSize:13.5, fontWeight:600, color:C.sub,
                 background:"white", border:`1px solid ${C.border}`, borderRadius:999, cursor:"pointer" }}>
        取消
      </button>

      <PrivacyNote />

      <style>{`
        @keyframes aiRingSpin { to { transform: rotate(360deg); } }
        @keyframes aiOrbit { to { transform: rotate(360deg); } }
        @keyframes aiOrbitCCW { to { transform: rotate(-360deg); } }
        @keyframes aiFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        @keyframes aiShimmer { 0%{transform:translateX(-180%)} 100%{transform:translateX(240%)} }
        @keyframes aiSparkle { 0%,100%{opacity:.25;transform:scale(.8)} 50%{opacity:1;transform:scale(1.15)} }
        @keyframes aiTipIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

/* 魔法笔（橙色铅笔 + 白爪印 + 顶部小星）*/
function MagicPen() {
  return (
    <svg width="46" height="46" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <g transform="rotate(26 24 24)">
        <rect x="20" y="9" width="8" height="25" rx="3" fill="#E68645" />
        <rect x="20" y="9" width="8" height="6" rx="3" fill="#F2C7A5" />
        <path d="M20 34l4 7 4-7z" fill="#FBEAD0" stroke="#E68645" strokeWidth="1" strokeLinejoin="round" />
        <g fill="#fff">
          <circle cx="22.6" cy="20" r="0.9" /><circle cx="25.4" cy="20" r="0.9" />
          <circle cx="21.2" cy="22" r="0.8" /><circle cx="26.8" cy="22" r="0.8" />
          <ellipse cx="24" cy="23.4" rx="2.1" ry="1.6" />
        </g>
      </g>
      <path d="M37 9l1.2 3 3 1.2-3 1.2L37 17.4l-1.2-3-3-1.2 3-1.2L37 9z" fill="#FFD89E" />
    </svg>
  );
}

/* 轨道爪印小徽章（白底圆 + 橙爪）*/
function PawBadge() {
  return (
    <div style={{ width:26, height:26, borderRadius:"50%", background:"#fff",
                  boxShadow:"0 2px 6px rgba(230,134,69,0.35)",
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
      <PawIcon size={14} />
    </div>
  );
}

/* 浮动小装饰：星星 / 爱心 / 小爪 */
function Deco({ kind, style, delay = "0s", size = 16 }) {
  const base = { position:"absolute", ...style };
  if (kind === "heart") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#F4B58C" aria-hidden="true"
        style={{ ...base, opacity:0.75, animation:"aiFloat 3s ease-in-out infinite", animationDelay:delay }}>
        <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" />
      </svg>
    );
  }
  if (kind === "paw") {
    return (
      <div style={{ ...base, animation:"aiSparkle 2.2s ease-in-out infinite", animationDelay:delay }}>
        <PawIcon size={size} color="#F2C7A5" />
      </div>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#F2C7A5" aria-hidden="true"
      style={{ ...base, animation:"aiSparkle 1.9s ease-in-out infinite", animationDelay:delay }}>
      <path d="M12 2l2 8 8 2-8 2-2 8-2-8-8-2 8-2 2-8z" />
    </svg>
  );
}

function ResultStep({ aiUrl, petId, onUse, onRegen, onCancel, saveErr }) {
  const [saving, setSaving] = useState(false);
  const [imgState, setImgState] = useState("loading"); // loading | ready | error

  // 先 preload，完全加载好再淡入显示（避免从上往下逐行加载 / 白屏）
  useEffect(() => {
    if (!aiUrl) return;
    setImgState("loading");
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      setImgState("ready");
      try { if (petId) localStorage.setItem(`tailme_ai_result_cache_${petId}`, aiUrl); } catch {}
    };
    img.onerror = () => setImgState("error");
    img.src = aiUrl;
    return () => { img.onload = null; img.onerror = null; };
  }, [aiUrl, petId]);

  const handleSave = async () => {
    setSaving(true);
    try { await onUse(); }
    finally { setSaving(false); }
  };

  const useDisabled = saving || imgState !== "ready";

  return (
    <>
      {/* 预览卡 */}
      <div style={{ position:"relative", width:"100%", height:384, borderRadius:24, overflow:"hidden",
                    background:"#FFFCF7", border:`1px solid ${C.border}`,
                    boxShadow:"0 4px 16px rgba(0,0,0,0.05)", marginBottom:16,
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
        {imgState === "error" ? (
          <div style={{ textAlign:"center", padding:24 }}>
            <div style={{ fontSize:34, marginBottom:8 }}>😿</div>
            <div style={{ fontSize:13.5, color:C.sub }}>图片加载失败，请重新生成试试</div>
          </div>
        ) : (
          <>
            {/* 加载占位（shimmer + 爪印）*/}
            {imgState === "loading" && (
              <div style={{ position:"absolute", inset:0, background:C.tint,
                            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12 }}>
                <div style={{ position:"absolute", top:0, bottom:0, left:0, width:"55%",
                              background:"linear-gradient(100deg, transparent, rgba(255,255,255,0.5), transparent)",
                              animation:"aiShimmer 1.8s ease-in-out infinite" }} />
                <div style={{ animation:"aiFloat 2.2s ease-in-out infinite" }}><PawIcon size={40} /></div>
                <div style={{ fontSize:12.5, color:C.sub }}>正在整理毛孩子的新头像…</div>
              </div>
            )}
            {/* 加载完成淡入 */}
            {imgState === "ready" && (
              <img src={aiUrl} alt="AI 生成宠物形象" loading="eager" decoding="async"
                style={{ width:"100%", height:"100%", objectFit:"contain", display:"block",
                         animation:"aiResultIn .35s ease" }} />
            )}
          </>
        )}
      </div>

      {/* 主按钮 */}
      <button onClick={handleSave} disabled={useDisabled}
        style={{ width:"100%", height:56, borderRadius:999, border:"none",
                 background:C.pri, color:"white", fontSize:18, fontWeight:800, marginBottom:10,
                 cursor: useDisabled ? "default" : "pointer",
                 opacity: useDisabled ? 0.7 : 1, transition:"opacity .15s",
                 boxShadow:"0 8px 18px rgba(230,134,69,0.32)" }}>
        {saving ? "保存中…" : "使用这个头像"}
      </button>

      {saveErr && (
        <div style={{ background:"#FFF0F0", color:"#D94040", borderRadius:12,
                      padding:"9px 14px", fontSize:12, lineHeight:1.5,
                      marginBottom:10, textAlign:"center" }}>
          ❌ {saveErr}
        </div>
      )}

      {/* 次按钮：重新生成 / 取消 */}
      <div style={{ display:"flex", gap:10 }}>
        <button onClick={onRegen} disabled={saving}
          style={{ flex:1, height:52, borderRadius:16, border:"none", background:C.tint, color:C.text,
                   fontSize:14, fontWeight:700, cursor: saving ? "default" : "pointer",
                   display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
          <RefreshIcon /> 重新生成
        </button>
        <button onClick={onCancel} disabled={saving}
          style={{ flex:1, height:52, borderRadius:16, background:"white", color:C.text,
                   border:`1px solid ${C.border}`, fontSize:14, fontWeight:700,
                   cursor: saving ? "default" : "pointer" }}>
          取消
        </button>
      </div>

      <style>{`
        @keyframes aiResultIn { from{opacity:0} to{opacity:1} }
        @keyframes aiShimmer { 0%{transform:translateX(-180%)} 100%{transform:translateX(240%)} }
        @keyframes aiFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
      `}</style>
    </>
  );
}

/* 刷新图标（重新生成）*/
function RefreshIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 11a8 8 0 1 0-.6 4" stroke="#2A2520" strokeWidth="1.9" strokeLinecap="round"/>
      <path d="M20 4v6h-6" stroke="#2A2520" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
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
