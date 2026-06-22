"use client";

/**
 * components/share/ShareCardCenter.jsx
 * 「分享卡片」全屏浮层（沿用商城/审核同款浮层模式）。
 *
 * 单一预览页：顶部 4 个类型 tab 切换 → 中间通用海报卡（配置驱动）→ 底部操作按钮。
 * 只做模板展示 + mock，不接触发逻辑/真实业务。操作按钮（保存/分享/发布/重新生成）均 toast 占位。
 *
 * 卡片模板与文案/配色集中在 lib/shareCardTemplates.js；
 * 宠物主角位以 petImage / petName / petType 注入，结构上支持后续替换成用户专属宠物形象。
 *
 * props: { onClose, user, pet, initialType }   initialType 可选，命中则默认选中对应 tab
 */

import { useState } from "react";
import BackButton from "@/components/icons/BackButton";
import { isCatPet } from "@/services/breedAvatar";
import { Download, Share2, Users, RotateCw } from "lucide-react";
import { SHARE_CARD_TYPES, DECO_ICONS, resolveText } from "@/lib/shareCardTemplates";

const C = { pri:"#E68645", bg:"#EEE9E1", card:"#FFFFFF", text:"#2A2520", sub:"#8A8178", border:"#EFE3D5" };

export default function ShareCardCenter({ onClose, user, pet, initialType }) {
  const initIdx = SHARE_CARD_TYPES.findIndex((t) => t.id === initialType);
  const [idx, setIdx] = useState(initIdx >= 0 ? initIdx : 0);
  const [notice, setNotice] = useState(null);
  const cfg = SHARE_CARD_TYPES[idx];

  const toast = (msg) => {
    setNotice(msg);
    if (toast._t) clearTimeout(toast._t);
    toast._t = setTimeout(() => setNotice(null), 2000);
  };

  /* ── 宠物主角（结构可替换；当前读真实宠物，缺失回退占位）── */
  const petName  = pet?.name || "毛孩子";
  const petType  = isCatPet(pet) ? "cat" : "dog";
  const petImage = pet?.pet_avatar_thumb_url || pet?.ai_avatar_url || (petType === "cat" ? "/cat.png" : "/dog.png");
  const daysTogether = (() => {
    const d = pet?.created_at || pet?.birthday;
    if (d) { const n = Math.floor((Date.now() - new Date(d).getTime()) / 86400000); if (n > 0) return n; }
    return 24;
  })();

  const ctx = { name: petName, days: daysTogether };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:320, background:C.bg, display:"flex", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, height:"100%", background:C.bg, display:"flex", flexDirection:"column",
                    animation:"sc-in .22s ease-out" }}>
        {/* header */}
        <div style={{ padding:"max(env(safe-area-inset-top),28px) 16px 4px", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          <BackButton onClick={onClose} />
          <div style={{ flex:1, textAlign:"center", marginRight:38, fontSize:18, fontWeight:800, color:C.text }}>分享卡片</div>
        </div>

        {/* 4 个类型 tab */}
        <div style={{ display:"flex", gap:8, padding:"8px 14px 10px", overflowX:"auto", flexShrink:0 }}>
          {SHARE_CARD_TYPES.map((t, i) => {
            const on = i === idx;
            return (
              <button key={t.id} onClick={() => setIdx(i)}
                style={{ flex:"0 0 auto", padding:"8px 15px", borderRadius:15, fontSize:13, fontWeight:700, cursor:"pointer",
                         border:"none", whiteSpace:"nowrap", transition:"all .18s",
                         background: on ? t.theme.accent : "#FFFFFF",
                         color: on ? "#fff" : C.sub,
                         boxShadow: on ? `0 4px 12px ${t.theme.accent}44` : "0 1px 4px rgba(0,0,0,0.05)" }}>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* 海报预览 */}
        <div style={{ flex:1, overflowY:"auto", padding:"8px 22px 18px", display:"flex", justifyContent:"center", alignItems:"flex-start" }}>
          <SharePoster cfg={cfg} petName={petName} petImage={petImage}
                       statText={resolveText(cfg.statText, ctx)}
                       mainText={resolveText(cfg.mainText, ctx)} />
        </div>

        {/* 操作按钮（mock 占位） */}
        <div style={{ display:"flex", gap:8, padding:"10px 16px max(env(safe-area-inset-bottom),16px)", flexShrink:0,
                      borderTop:`1px solid ${C.border}`, background:"#fff" }}>
          <ActionBtn Icon={Download} label="保存图片"   onClick={() => toast("保存图片功能即将上线 🐾")} />
          <ActionBtn Icon={Share2}   label="分享给朋友" onClick={() => toast("分享功能即将上线 🐾")} />
          <ActionBtn Icon={Users}    label="发布到社区" onClick={() => toast("发布到社区功能即将上线 🐾")} />
          <ActionBtn Icon={RotateCw} label="重新生成"   onClick={() => toast("重新生成功能即将上线 🐾")} />
        </div>
      </div>

      {notice && (
        <div style={{ position:"fixed", left:"50%", bottom:96, transform:"translateX(-50%)", zIndex:340,
                      padding:"10px 18px", borderRadius:14, fontSize:13, fontWeight:600, color:"#fff",
                      background:C.pri, boxShadow:"0 4px 16px rgba(0,0,0,0.22)", whiteSpace:"nowrap" }}>
          {notice}
        </div>
      )}
      <style>{`@keyframes sc-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

/* ── 通用海报卡（配置驱动，统一结构）──
   顶部图标徽章+标题 / 状态 chip / 中间宠物主角区 / 主文案 / 底部小字+品牌 */
function SharePoster({ cfg, petName, petImage, statText, mainText }) {
  const t = cfg.theme;
  const Icon = cfg.Icon;
  // 装饰位置（环绕四周，刻意避开中间主角位）
  const decoPos = [
    { top:"14%", left:"9%",  size:20, op:0.5 },
    { top:"10%", right:"10%", size:15, op:0.42 },
    { top:"50%", left:"7%",  size:14, op:0.3 },
    { top:"47%", right:"8%", size:18, op:0.42 },
  ];

  return (
    <div style={{ width:"100%", maxWidth:330, borderRadius:28, background:t.bg, position:"relative", overflow:"hidden",
                  padding:"26px 22px 20px", boxShadow:"0 12px 34px rgba(0,0,0,0.14)",
                  display:"flex", flexDirection:"column", alignItems:"center" }}>
      {/* 角落柔光 */}
      <div style={{ position:"absolute", top:-44, right:-34, width:130, height:130, borderRadius:"50%",
                    background:"rgba(255,255,255,0.42)", filter:"blur(10px)" }} />
      <div style={{ position:"absolute", bottom:-40, left:-30, width:110, height:110, borderRadius:"50%",
                    background:"rgba(255,255,255,0.3)", filter:"blur(12px)" }} />

      {/* 轻装饰 */}
      {cfg.decos.map((k, i) => {
        const D = DECO_ICONS[k]; const p = decoPos[i] || decoPos[0];
        if (!D) return null;
        return <D key={i} size={p.size} color={t.deco} strokeWidth={2.2}
                  style={{ position:"absolute", top:p.top, left:p.left, right:p.right, opacity:p.op }} />;
      })}

      {/* 顶部：图标徽章 + 标题 */}
      <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:9 }}>
        <span style={{ width:44, height:44, borderRadius:"50%", background:t.badge, display:"flex",
                       alignItems:"center", justifyContent:"center", boxShadow:`0 3px 10px ${t.accent}33` }}>
          <Icon size={22} color={t.accent} strokeWidth={2.4} />
        </span>
        <div style={{ fontSize:21, fontWeight:900, color:t.deep, letterSpacing:1 }}>{cfg.title}</div>
      </div>

      {/* 状态 chip */}
      <div style={{ position:"relative", zIndex:1, marginTop:11, padding:"6px 15px", borderRadius:20,
                    background:"rgba(255,255,255,0.68)", fontSize:12.5, fontWeight:800, color:t.deep }}>
        {statText}
      </div>

      {/* 中间宠物主角区（干净留白，装饰不进入） */}
      <div style={{ position:"relative", zIndex:1, margin:"16px 0 14px", width:178, height:178,
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:t.stage,
                      boxShadow:"inset 0 0 0 6px rgba(255,255,255,0.4)" }} />
        <img src={petImage} alt={petName} loading="eager" decoding="async"
             style={{ position:"relative", width:"82%", height:"82%", objectFit:"contain",
                      filter:"drop-shadow(0 8px 14px rgba(0,0,0,0.18))" }} />
      </div>

      {/* 主文案 */}
      <div style={{ position:"relative", zIndex:1, fontSize:15, fontWeight:800, color:t.deep, textAlign:"center",
                    lineHeight:1.6, padding:"0 6px" }}>
        {mainText}
      </div>

      {/* 底部小字 */}
      <div style={{ position:"relative", zIndex:1, marginTop:9, fontSize:12, color:t.sub, textAlign:"center", lineHeight:1.5 }}>
        {cfg.footer}
      </div>

      {/* 品牌感小字 */}
      <div style={{ position:"relative", zIndex:1, marginTop:13, display:"flex", alignItems:"center", gap:6,
                    fontSize:10.5, color:t.sub, opacity:0.85, letterSpacing:0.5 }}>
        <span style={{ width:4, height:4, borderRadius:"50%", background:t.accent }} />
        TailMe · 爪爪日记
        <span style={{ width:4, height:4, borderRadius:"50%", background:t.accent }} />
      </div>
    </div>
  );
}

/* ── 底部操作按钮 ── */
function ActionBtn({ Icon, label, onClick }) {
  return (
    <button onClick={onClick}
      style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:"6px 0",
               background:"none", border:"none", cursor:"pointer" }}>
      <Icon size={20} color={C.pri} strokeWidth={2.1} />
      <span style={{ fontSize:11, fontWeight:600, color:C.text }}>{label}</span>
    </button>
  );
}
