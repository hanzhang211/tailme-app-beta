"use client";

/**
 * components/share/ShareCardCenter.jsx
 * 「分享卡片中心」全屏浮层（沿用商城/审核同款浮层模式，保留底部 tab 与登录态）。
 *
 * 当前阶段：只做入口 + 页面框架 + mock 数据。
 *  - 分类卡（今日陪伴 / 喂食打卡 / 纪念日 / AI想说 / 成长记录）
 *  - 最近生成（mock 缩略入口）
 *  - 点击暂以 toast 占位；后续接「卡片生成 + 真实分享（保存图片 / 系统分享 / 分享链接）」逻辑。
 *
 * props: { onClose, toast, user, pet, initialType }
 */

import { useState } from "react";
import BackButton from "@/components/icons/BackButton";
import { Heart, Utensils, CalendarHeart, Sparkles, TrendingUp, ChevronRight, Share2 } from "lucide-react";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", card:"#FFFFFF",
  text:"#1A1006", sub:"#8A8074", border:"#E4DDD2",
};

/* 卡片分类（mock，后续每类接具体生成页）。配色取自暖橙/奶油系，保持温暖。 */
const SHARE_CARD_TYPES = [
  { id:"daily",       title:"今日陪伴卡", desc:"记录今天和宠物的陪伴时光", Icon:Heart,        bg:"#FDEDE0", ic:"#E68645" },
  { id:"feeding",     title:"喂食打卡卡", desc:"把今天的喂食记录分享出来", Icon:Utensils,     bg:"#FBF0DA", ic:"#E0962F" },
  { id:"anniversary", title:"纪念日卡",   desc:"纪念它来到我身边的重要日子", Icon:CalendarHeart, bg:"#F7E4E6", ic:"#D9728A" },
  { id:"ai-message",  title:"AI想说卡",   desc:"生成宠物想对主人说的话",   Icon:Sparkles,     bg:"#EFE7F6", ic:"#9A78C2" },
  { id:"growth",      title:"成长记录卡", desc:"记录体重、年龄、成长变化",  Icon:TrendingUp,   bg:"#E4F1E6", ic:"#5FA766" },
];

/* 最近生成（mock 占位，后续接真实数据） */
const RECENT_MOCK = [
  { id:"r1", type:"今日陪伴卡", date:"2026-06-16", bg:"#FDEDE0", ic:"#E68645", Icon:Heart },
  { id:"r2", type:"喂食打卡卡", date:"2026-06-15", bg:"#FBF0DA", ic:"#E0962F", Icon:Utensils },
  { id:"r3", type:"AI想说卡",   date:"2026-06-14", bg:"#EFE7F6", ic:"#9A78C2", Icon:Sparkles },
];

export default function ShareCardCenter({ onClose, user, pet, initialType }) {
  // 内置轻量提示（首页/我的页都能复用，无需外部 toast）
  const [notice, setNotice] = useState(null);
  const soon = (label) => {
    setNotice(`${label}即将开放，敬请期待 🐾`);
    if (soon._t) clearTimeout(soon._t);
    soon._t = setTimeout(() => setNotice(null), 2200);
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:320, background:C.bg, display:"flex", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, height:"100%", background:C.bg,
                    display:"flex", flexDirection:"column", animation:"scc-in .22s ease-out" }}>

        {/* 顶部栏 */}
        <div style={{ padding:"max(env(safe-area-inset-top), 28px) 16px 10px", display:"flex",
                      alignItems:"center", gap:10, flexShrink:0 }}>
          <BackButton onClick={onClose} />
          <div style={{ flex:1, textAlign:"center", fontSize:18, fontWeight:800, color:C.text }}>分享卡片中心</div>
          <div style={{ width:40, flexShrink:0 }} />
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"4px 16px 40px" }}>

          {/* 顶部说明 */}
          <div style={{ display:"flex", gap:12, background:"linear-gradient(135deg,#FFF3E8,#FDEAD9)",
                        borderRadius:20, padding:"16px 16px", marginBottom:18,
                        border:"1px solid #F3D9C0" }}>
            <div style={{ width:44, height:44, borderRadius:14, flexShrink:0, background:"#fff",
                          display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Share2 size={22} color={C.pri} strokeWidth={2} />
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:15, fontWeight:800, color:C.text, marginBottom:3 }}>记录陪伴，也分享陪伴</div>
              <div style={{ fontSize:12, color:"#9A7B5C", lineHeight:1.6 }}>
                把和宠物的点滴日常，变成可以保存和分享的温暖卡片
              </div>
            </div>
          </div>

          {/* 卡片分类 */}
          <div style={{ fontSize:13, fontWeight:800, color:C.text, margin:"2px 2px 10px" }}>选择卡片类型</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:22 }}>
            {SHARE_CARD_TYPES.map((t) => (
              <button key={t.id} onClick={() => soon(t.title)}
                style={{ display:"flex", alignItems:"center", gap:13, width:"100%",
                         background:C.card, border:`1px solid ${C.border}`, borderRadius:18,
                         padding:"13px 14px", cursor:"pointer", textAlign:"left",
                         boxShadow:"0 2px 10px rgba(0,0,0,0.04)" }}>
                <div style={{ width:46, height:46, borderRadius:14, flexShrink:0, background:t.bg,
                              display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <t.Icon size={23} color={t.ic} strokeWidth={2} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14.5, fontWeight:800, color:C.text }}>{t.title}</div>
                  <div style={{ fontSize:11.5, color:C.sub, marginTop:2,
                                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.desc}</div>
                </div>
                <ChevronRight size={18} color={C.sub} style={{ flexShrink:0 }} />
              </button>
            ))}
          </div>

          {/* 最近生成 */}
          <div style={{ fontSize:13, fontWeight:800, color:C.text, margin:"2px 2px 10px" }}>最近生成</div>
          {RECENT_MOCK.length === 0 ? (
            <div style={{ textAlign:"center", color:C.sub, fontSize:12.5, padding:"30px 0",
                          background:C.card, borderRadius:18, border:`1px solid ${C.border}` }}>
              还没有生成过卡片，挑一个类型开始吧 🐾
            </div>
          ) : (
            <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:4 }}>
              {RECENT_MOCK.map((r) => (
                <button key={r.id} onClick={() => soon("卡片详情")}
                  style={{ flexShrink:0, width:128, background:C.card, border:`1px solid ${C.border}`,
                           borderRadius:16, padding:0, cursor:"pointer", overflow:"hidden",
                           boxShadow:"0 2px 10px rgba(0,0,0,0.04)" }}>
                  <div style={{ height:84, background:r.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <r.Icon size={30} color={r.ic} strokeWidth={2} />
                  </div>
                  <div style={{ padding:"8px 10px", textAlign:"left" }}>
                    <div style={{ fontSize:12.5, fontWeight:800, color:C.text,
                                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.type}</div>
                    <div style={{ fontSize:10.5, color:C.sub, marginTop:2 }}>{r.date}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {notice && (
        <div style={{ position:"fixed", left:"50%", bottom:60, transform:"translateX(-50%)", zIndex:340,
                      maxWidth:300, padding:"10px 18px", borderRadius:14, fontSize:13, fontWeight:600,
                      textAlign:"center", background:"#E68645", color:"#fff",
                      boxShadow:"0 4px 16px rgba(0,0,0,0.2)" }}>
          {notice}
        </div>
      )}
      <style>{`@keyframes scc-in { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform: translateY(0); } }`}</style>
    </div>
  );
}
