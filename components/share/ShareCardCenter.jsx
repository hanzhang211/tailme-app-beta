"use client";

/**
 * components/share/ShareCardCenter.jsx
 * 「分享卡片中心」全屏浮层（沿用商城/审核同款浮层模式，保留底部 tab 与登录态）。
 *
 * 浮层内三屏（view 切换，等价 /share-cards、/share-cards/daily、/share-cards/daily/result）：
 *   center → 分享卡片中心首页（banner + 分类 tab + 模板卡列表）
 *   daily  → 今日陪伴卡 生成配置页（预览卡 + 设置列表 + 立即生成）
 *   result → 生成完成页（tab + 海报卡 + 保存/分享/发布 + 重新生成）
 *
 * 视觉：每类卡片有独立主题配色（CARD_THEMES）；mock data 为主，尽量读当前宠物。
 * 预留 generateShareCard / saveCardImage / shareCard / publishToCommunity，第一版均 toast「即将上线」。
 *
 * props: { onClose, user, pet, initialType }
 */

import { useState } from "react";
import BackButton from "@/components/icons/BackButton";
import { isCatPet } from "@/services/breedAvatar";
import {
  Clock, Heart, Utensils, CalendarHeart, Sparkles, MessageCircle, ChevronRight, Eye, Home,
  Download, Share2, Users, RotateCw, Palette, FileText, CalendarDays, PawPrint, Star,
} from "lucide-react";

const C = {
  pri:"#E68645", light:"#FFE9D8", cream:"#FFF7EF", bg:"#EEE9E1",
  card:"#FFFFFF", text:"#2A2520", sub:"#8A8178", border:"#EFE3D5",
};

/* 各卡片类型主题（前端常量统一管理：缩略图渐变 / 强调色 / 装饰色 / 图标） */
const CARD_THEMES = {
  daily:       { thumb:"linear-gradient(135deg,#FFF1E2,#FBD7BC)", accent:"#E68645", deep:"#C25E1C", soft:"#9A6438", deco:"#F2B27E", Icon:Heart,         Deco2:PawPrint,      label:"陪伴卡" },
  feeding:     { thumb:"linear-gradient(135deg,#FBF4DC,#F0E1B2)", accent:"#CE9A33", deep:"#977017", soft:"#8C7434", deco:"#E3CC82", Icon:Utensils,      Deco2:PawPrint,      label:"喂食卡" },
  anniversary: { thumb:"linear-gradient(135deg,#FCE7EA,#F6C6D1)", accent:"#D9728A", deep:"#B5475F", soft:"#A56777", deco:"#EBA9B8", Icon:CalendarHeart, Deco2:Star,          label:"纪念卡" },
  "ai-message":{ thumb:"linear-gradient(135deg,#EFE8F7,#DBCAEF)", accent:"#9A78C2", deep:"#6E51A0", soft:"#7E6BA0", deco:"#C3ABE0", Icon:Sparkles,      Deco2:MessageCircle, label:"AI心情卡" },
};

/* 4 个卡片模板 */
const TEMPLATES = [
  { id:"daily",       title:"今日陪伴卡", desc:"记录今天的陪伴时光，分享温暖与爱",   cat:"陪伴卡" },
  { id:"feeding",     title:"今日喂食卡", desc:"记录每一餐的用心时刻，营养满满、健康成长", cat:"喂食卡" },
  { id:"anniversary", title:"陪伴纪念日", desc:"铭记每一个重要的日子，见证我们的成长", cat:"纪念卡" },
  { id:"ai-message",  title:"想对你说",   desc:"AI生成宠物的暖心小话，传递爱与陪伴",   cat:"AI心情卡" },
];

const CENTER_TABS = ["全部", "陪伴卡", "喂食卡", "纪念卡", "AI心情卡"];
const RESULT_TABS = ["今日陪伴卡", "喂食卡", "纪念卡"];

const TEXT_POOL = [
  "今天也有好好爱你 ❤",
  "谢谢你来到我身边 🐾",
  "有你的每一天都很温暖",
  "今天也要开开心心呀 ✨",
  "想把最好的都给你 ❤",
];

export default function ShareCardCenter({ onClose, user, pet, initialType }) {
  const [view, setView] = useState("center");
  const [tab, setTab] = useState("全部");
  const [resultTab, setResultTab] = useState("今日陪伴卡");
  const [cardText, setCardText] = useState(TEXT_POOL[0]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(TEXT_POOL[0]);
  const [notice, setNotice] = useState(null);

  const toast = (msg) => {
    setNotice(msg);
    if (toast._t) clearTimeout(toast._t);
    toast._t = setTimeout(() => setNotice(null), 2200);
  };

  /* ── 宠物数据（尽量读真实，缺失回退 mock）── */
  const petName = pet?.name || "柚子";
  const avatar  = pet?.pet_avatar_thumb_url || pet?.ai_avatar_url || (isCatPet(pet) ? "/cat.png" : "/dog.png");
  const daysTogether = (() => {
    const d = pet?.created_at || pet?.birthday;
    if (d) {
      const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
      if (days > 0) return days;
    }
    return 427;
  })();

  const saveCardImage      = () => toast("保存图片功能即将上线 🐾");
  const shareCard          = () => toast("分享功能即将上线 🐾");
  const publishToCommunity = () => toast("发布到社区功能即将上线 🐾");
  const regenerate         = () => {
    const next = TEXT_POOL[(TEXT_POOL.indexOf(cardText) + 1) % TEXT_POOL.length];
    setCardText(next); setDraft(next);
    toast("已换一句新文案 ✨");
  };

  const wrap = (children) => (
    <div style={{ position:"fixed", inset:0, zIndex:320, background:C.bg, display:"flex", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, height:"100%", background:C.bg,
                    display:"flex", flexDirection:"column", animation:"scc-in .22s ease-out" }}>
        {children}
      </div>
      {notice && (
        <div style={{ position:"fixed", left:"50%", bottom:60, transform:"translateX(-50%)", zIndex:340,
                      maxWidth:300, padding:"10px 18px", borderRadius:14, fontSize:13, fontWeight:600,
                      textAlign:"center", background:C.pri, color:"#fff", boxShadow:"0 4px 16px rgba(0,0,0,0.2)" }}>
          {notice}
        </div>
      )}
      {editing && (
        <TextEditor draft={draft} setDraft={setDraft}
          onCancel={() => { setEditing(false); setDraft(cardText); }}
          onSave={() => { setCardText(draft.trim() || cardText); setEditing(false); }} />
      )}
      <style>{`@keyframes scc-in { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform: translateY(0); } }`}</style>
    </div>
  );

  /* ════════ 屏一：分享卡片中心 ════════ */
  if (view === "center") {
    const list = tab === "全部" ? TEMPLATES : TEMPLATES.filter((t) => t.cat === tab);
    const openTemplate = (t) => {
      if (t.id === "daily") setView("daily");
      else toast(`${t.title}即将上线 🐾`);
    };
    return wrap(<>
      {/* header */}
      <div style={{ padding:"max(env(safe-area-inset-top), 28px) 16px 8px", display:"flex",
                    alignItems:"flex-start", gap:10, flexShrink:0 }}>
        <BackButton onClick={onClose} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:19, fontWeight:900, color:C.text }}>分享卡片中心</div>
          <div style={{ fontSize:12, color:C.sub, marginTop:3 }}>记录陪伴日常，一键生成温暖分享卡</div>
        </div>
        <button onClick={() => toast("最近生成即将上线 🐾")}
          style={{ width:38, height:38, borderRadius:"50%", background:"#fff", border:`1px solid ${C.border}`,
                   display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0,
                   boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
          <Clock size={17} color={C.pri} />
        </button>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"12px 16px 40px" }}>
        {/* Banner */}
        <button onClick={() => setView("daily")}
          style={{ position:"relative", width:"100%", textAlign:"left", cursor:"pointer", border:"none",
                   background:"linear-gradient(135deg,#FFEAD3,#FBD2AE)", borderRadius:24, padding:"18px 16px",
                   marginBottom:18, overflow:"hidden", boxShadow:"0 6px 20px rgba(230,134,69,0.18)",
                   display:"flex", alignItems:"center", gap:10 }}>
          <Deco color="#F2B27E" big />
          <div style={{ position:"relative", flex:1, minWidth:0, zIndex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <span style={{ width:32, height:32, borderRadius:11, background:"#fff", flexShrink:0,
                             display:"flex", alignItems:"center", justifyContent:"center",
                             boxShadow:"0 2px 6px rgba(230,134,69,0.2)" }}>
                <Heart size={17} color={C.pri} fill={C.pri} />
              </span>
              <span style={{ fontSize:18, fontWeight:900, color:"#C25E1C" }}>今日陪伴卡</span>
            </div>
            <div style={{ fontSize:12.5, color:"#9A6438", lineHeight:1.7 }}>
              记录今天的温暖时光<br/>一键生成，分享爱与陪伴
            </div>
          </div>
          <img src={avatar} alt="" style={{ width:90, height:90, objectFit:"contain", flexShrink:0,
                                            position:"relative", zIndex:1, filter:"drop-shadow(0 3px 6px rgba(0,0,0,0.12))" }} />
        </button>

        {/* 分类 tabs */}
        <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4, marginBottom:14 }}>
          {CENTER_TABS.map((t) => {
            const on = tab === t;
            return (
              <button key={t} onClick={() => setTab(t)}
                style={{ flexShrink:0, padding:"7px 17px", borderRadius:999, fontSize:13, fontWeight: on?800:600,
                         border:`1px solid ${on?C.pri:C.border}`, background:on?C.pri:"#fff", color:on?"#fff":C.sub,
                         cursor:"pointer", whiteSpace:"nowrap",
                         boxShadow: on ? "0 3px 9px rgba(230,134,69,0.28)" : "none" }}>
                {t}
              </button>
            );
          })}
        </div>

        {/* 模板卡列表 */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {list.map((t) => {
            const th = CARD_THEMES[t.id];
            return (
              <div key={t.id} onClick={() => openTemplate(t)}
                style={{ display:"flex", alignItems:"center", gap:12, background:C.card,
                         border:`1px solid ${C.border}`, borderRadius:18, padding:"12px 13px",
                         cursor:"pointer", boxShadow:"0 3px 12px rgba(0,0,0,0.05)" }}>
                <ThumbCard theme={th} avatar={avatar} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14.5, fontWeight:800, color:C.text }}>{t.title}</div>
                  <div style={{ fontSize:11.5, color:C.sub, marginTop:3, lineHeight:1.55 }}>{t.desc}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); openTemplate(t); }}
                  style={{ flexShrink:0, padding:"8px 17px", borderRadius:999, fontSize:13, fontWeight:800,
                           background:C.pri, color:"#fff", border:"none", cursor:"pointer",
                           boxShadow:"0 3px 9px rgba(230,134,69,0.28)" }}>
                  生成
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>);
  }

  /* ════════ 屏二：今日陪伴卡 生成配置 ════════ */
  if (view === "daily") {
    return wrap(<>
      <div style={{ padding:"max(env(safe-area-inset-top), 28px) 16px 10px", display:"flex",
                    alignItems:"center", gap:10, flexShrink:0 }}>
        <BackButton onClick={() => setView("center")} />
        <div style={{ flex:1, textAlign:"center", fontSize:18, fontWeight:800, color:C.text }}>今日陪伴卡</div>
        <button onClick={() => toast("已为你预览 👀")}
          style={{ flexShrink:0, display:"flex", alignItems:"center", gap:4, padding:"7px 13px", borderRadius:999,
                   background:"#fff", border:`1.5px solid ${C.light}`, color:C.pri, fontSize:12.5, fontWeight:800,
                   cursor:"pointer", boxShadow:"0 2px 8px rgba(230,134,69,0.12)" }}>
          <Eye size={14} /> 预览
        </button>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"6px 16px 30px" }}>
        <PreviewCard petName={petName} days={daysTogether} text={cardText} avatar={avatar} />

        {/* 设置列表 */}
        <div style={{ background:C.card, borderRadius:20, border:`1px solid ${C.border}`,
                      overflow:"hidden", marginTop:18, boxShadow:"0 3px 12px rgba(0,0,0,0.05)" }}>
          <SettingRow icon={<img src={avatar} alt="" style={{ width:24, height:24, borderRadius:"50%", objectFit:"cover" }} />}
            label="选择宠物" value={petName} onClick={() => toast("多宠选择即将上线，当前用「" + petName + "」")} />
          <SettingRow icon={<Sparkles size={18} color={C.pri} />} label="卡片风格" value="暖心橙调"
            onClick={() => toast("更多风格即将上线 ✨")} />
          <SettingRow icon={<FileText size={18} color={C.pri} />} label="文案内容" value="可编辑"
            onClick={() => { setDraft(cardText); setEditing(true); }} />
          <SettingRow icon={<CalendarDays size={18} color={C.pri} />} label="日期显示" value="显示天数"
            onClick={() => toast("日期显示方式即将上线")} />
          <SettingRow icon={<Palette size={18} color={C.pri} />} label="背景配色"
            value={<span style={{ display:"flex", gap:6 }}>
              {["#E68645","#F2E5DA","#9DCBA9","#9FBEE0"].map((c,i) =>
                <span key={i} style={{ width:16, height:16, borderRadius:"50%", background:c,
                  border: i===0 ? "2px solid #C25E1C" : `1px solid ${C.border}` }} />)}
            </span>}
            onClick={() => toast("更多配色即将上线 🎨")} last />
        </div>
      </div>

      <div style={{ flexShrink:0, padding:"10px 16px max(env(safe-area-inset-bottom), 18px)",
                    background:"linear-gradient(to top, rgba(238,233,225,1) 72%, rgba(238,233,225,0))" }}>
        <button onClick={() => { setResultTab("今日陪伴卡"); setView("result"); }}
          style={{ width:"100%", height:54, borderRadius:18, border:"none", cursor:"pointer",
                   background:"linear-gradient(135deg,#E68645,#F09A5B)", color:"#fff", fontSize:16.5, fontWeight:800,
                   boxShadow:"0 10px 22px rgba(230,134,69,0.32)", display:"flex", alignItems:"center",
                   justifyContent:"center", gap:7 }}>
          <Sparkles size={18} /> 立即生成
        </button>
      </div>
    </>);
  }

  /* ════════ 屏三：生成完成 ════════ */
  return wrap(<>
    <div style={{ padding:"max(env(safe-area-inset-top), 28px) 16px 10px", display:"flex",
                  alignItems:"center", gap:10, flexShrink:0 }}>
      <BackButton onClick={() => setView("daily")} />
      <div style={{ flex:1, textAlign:"center", fontSize:18, fontWeight:800, color:C.text }}>生成完成</div>
      <button onClick={onClose}
        style={{ width:38, height:38, borderRadius:"50%", background:"#fff", border:`1px solid ${C.border}`,
                 display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0,
                 boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
        <Home size={17} color={C.pri} />
      </button>
    </div>

    <div style={{ flex:1, overflowY:"auto", padding:"4px 16px 30px" }}>
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {RESULT_TABS.map((t) => {
          const on = resultTab === t;
          return (
            <button key={t} onClick={() => { if (t === "今日陪伴卡") setResultTab(t); else toast(`${t}即将上线 🐾`); }}
              style={{ flex:1, padding:"9px 0", borderRadius:999, fontSize:13, fontWeight: on?800:600,
                       border:`1px solid ${on?C.pri:C.border}`, background:on?C.pri:"#fff", color:on?"#fff":C.sub,
                       cursor:"pointer", whiteSpace:"nowrap",
                       boxShadow: on ? "0 3px 9px rgba(230,134,69,0.28)" : "none" }}>
              {t}
            </button>
          );
        })}
      </div>

      <PosterCard petName={petName} days={daysTogether} text={cardText} avatar={avatar} />

      <div style={{ display:"flex", gap:10, marginTop:18 }}>
        <ActionBtn icon={<Download size={20} color={C.pri} />} label="保存图片" onClick={saveCardImage} />
        <ActionBtn icon={<Share2 size={20} color={C.pri} />} label="分享给朋友" onClick={shareCard} />
        <ActionBtn icon={<Users size={20} color={C.pri} />} label="发布到社区" onClick={publishToCommunity} />
      </div>

      <button onClick={regenerate}
        style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, margin:"18px auto 0",
                 background:"none", border:"none", color:C.sub, fontSize:13, fontWeight:700, cursor:"pointer" }}>
        <RotateCw size={15} /> 重新生成
      </button>
    </div>
  </>);
}

/* ── 模板卡缩略图（按主题配色 + 装饰 + 宠物图）── */
function ThumbCard({ theme, avatar }) {
  const T = theme.Icon, D = theme.Deco2;
  return (
    <div style={{ width:94, height:74, borderRadius:14, flexShrink:0, overflow:"hidden",
                  position:"relative", background:theme.thumb }}>
      <T size={15} color={theme.accent} style={{ position:"absolute", top:7, left:8, opacity:0.7 }} />
      <D size={11} color={theme.deco} style={{ position:"absolute", bottom:9, left:13, opacity:0.6 }} />
      <T size={9} color={theme.deco} style={{ position:"absolute", top:11, right:30, opacity:0.45 }} />
      <img src={avatar} alt="" style={{ position:"absolute", right:1, bottom:0, width:56, height:56,
                                        objectFit:"contain", filter:"drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }} />
    </div>
  );
}

/* ── 横版预览卡（配置页，暖橙）── */
function PreviewCard({ petName, days, text, avatar }) {
  return (
    <div style={{ position:"relative", borderRadius:24, overflow:"hidden",
                  background:"linear-gradient(135deg,#FFEAD3,#FBD5B2)", padding:"22px 18px",
                  boxShadow:"0 8px 22px rgba(230,134,69,0.18)", minHeight:236,
                  display:"flex", alignItems:"center" }}>
      <Deco color="#F2B27E" big />
      <div style={{ position:"relative", flex:1, minWidth:0, zIndex:1 }}>
        <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:10 }}>
          <Heart size={18} color="#E68645" fill="#E68645" />
          <span style={{ fontSize:23, fontWeight:900, color:"#C25E1C", letterSpacing:1 }}>今日陪伴卡</span>
        </div>
        <div style={{ fontSize:14, color:"#9A6438", marginBottom:2 }}>{petName}已经陪伴我</div>
        <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:8 }}>
          <span style={{ fontSize:50, fontWeight:900, color:"#E68645", lineHeight:1 }}>{days}</span>
          <span style={{ fontSize:18, fontWeight:700, color:"#9A6438" }}>天</span>
        </div>
        <div style={{ fontSize:13.5, fontWeight:700, color:"#B86A33" }}>{text}</div>
        <div style={{ fontSize:10, color:"#B9936E", marginTop:14, display:"flex", alignItems:"center", gap:4 }}>
          <PawPrint size={11} /> TailMe · 记录爱与陪伴的每一天
        </div>
      </div>
      <img src={avatar} alt="" style={{ width:122, height:122, objectFit:"contain", flexShrink:0,
                                        position:"relative", zIndex:1, filter:"drop-shadow(0 4px 8px rgba(0,0,0,0.14))" }} />
    </div>
  );
}

/* ── 竖版海报卡（结果页，暖橙）── */
function PosterCard({ petName, days, text, avatar }) {
  return (
    <div style={{ position:"relative", borderRadius:26, overflow:"hidden", textAlign:"center",
                  background:"linear-gradient(170deg,#FFF4E8 0%,#FBE0C6 100%)",
                  padding:"28px 20px 22px", boxShadow:"0 10px 28px rgba(230,134,69,0.2)" }}>
      <Deco color="#F2B27E" big />
      <div style={{ position:"relative", zIndex:1 }}>
        <div style={{ width:40, height:40, borderRadius:14, background:"#fff", margin:"0 auto 10px",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      boxShadow:"0 3px 8px rgba(230,134,69,0.22)" }}>
          <Heart size={20} color="#E68645" fill="#E68645" />
        </div>
        <div style={{ fontSize:28, fontWeight:900, color:"#C25E1C", letterSpacing:2, marginBottom:14 }}>今日陪伴卡</div>
        <div style={{ fontSize:15, color:"#9A6438", marginBottom:2 }}>{petName}已经陪伴我</div>
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"center", gap:6, marginBottom:10 }}>
          <span style={{ fontSize:66, fontWeight:900, color:"#E68645", lineHeight:1 }}>{days}</span>
          <span style={{ fontSize:22, fontWeight:700, color:"#9A6438" }}>天</span>
        </div>
        <div style={{ fontSize:15, fontWeight:700, color:"#B86A33", marginBottom:16 }}>{text}</div>
        <img src={avatar} alt="" style={{ width:178, height:178, objectFit:"contain", margin:"0 auto",
                                          filter:"drop-shadow(0 5px 10px rgba(0,0,0,0.14))" }} />
        <div style={{ fontSize:11, color:"#B9936E", marginTop:12, display:"flex", alignItems:"center",
                      justifyContent:"center", gap:4 }}>
          <PawPrint size={12} /> TailMe · 记录爱与陪伴的每一天
        </div>
      </div>
    </div>
  );
}

/* ── 卡内浅色装饰（爱心/爪印，纯点缀）── */
function Deco({ color = "#F2B27E", big }) {
  const o = big ? 0.5 : 0.4;
  return (
    <div aria-hidden="true" style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:0 }}>
      <Heart size={big?20:14} color={color} style={{ position:"absolute", top:"13%", right:"11%", opacity:o }} />
      <PawPrint size={big?18:13} color={color} style={{ position:"absolute", bottom:"15%", left:"7%", opacity:o*0.8 }} />
      <Heart size={big?13:10} color={color} style={{ position:"absolute", top:"54%", right:"20%", opacity:o*0.65 }} />
      <Sparkles size={big?14:10} color={color} style={{ position:"absolute", top:"30%", left:"16%", opacity:o*0.55 }} />
    </div>
  );
}

/* ── 设置项行 ── */
function SettingRow({ icon, label, value, onClick, last }) {
  return (
    <button onClick={onClick}
      style={{ display:"flex", alignItems:"center", gap:12, width:"100%", background:"none", cursor:"pointer",
               border:"none", borderBottom: last ? "none" : `1px solid #F3ECE2`, padding:"14px 14px", textAlign:"left" }}>
      <span style={{ width:34, height:34, borderRadius:11, background:"#FFF3E8", flexShrink:0,
                     display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>{icon}</span>
      <span style={{ flex:1, fontSize:14, fontWeight:700, color:C.text }}>{label}</span>
      <span style={{ fontSize:12.5, color:C.sub, display:"flex", alignItems:"center", gap:6 }}>{value}</span>
      <ChevronRight size={17} color={C.sub} style={{ flexShrink:0 }} />
    </button>
  );
}

/* ── 结果页操作按钮 ── */
function ActionBtn({ icon, label, onClick }) {
  return (
    <button onClick={onClick}
      style={{ flex:1, background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:"14px 4px",
               cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:7,
               boxShadow:"0 3px 12px rgba(0,0,0,0.05)" }}>
      <span style={{ width:36, height:36, borderRadius:12, background:"#FFF3E8",
                     display:"flex", alignItems:"center", justifyContent:"center" }}>{icon}</span>
      <span style={{ fontSize:12, fontWeight:700, color:C.text }}>{label}</span>
    </button>
  );
}

/* ── 文案编辑弹窗 ── */
function TextEditor({ draft, setDraft, onCancel, onSave }) {
  return (
    <div onClick={(e) => e.target === e.currentTarget && onCancel()}
      style={{ position:"fixed", inset:0, zIndex:360, background:"rgba(0,0,0,0.45)",
               display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, background:C.bg, borderRadius:"22px 22px 0 0",
                    padding:"20px 18px max(env(safe-area-inset-bottom), 22px)", animation:"scc-in .2s ease-out" }}>
        <div style={{ fontSize:16, fontWeight:800, color:C.text, marginBottom:12 }}>编辑文案</div>
        <textarea value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 40))}
          rows={3} placeholder="写一句想对它说的话～"
          style={{ width:"100%", borderRadius:14, padding:"12px 14px", fontSize:14, boxSizing:"border-box",
                   border:`1.5px solid ${C.border}`, background:"#fff", color:C.text, outline:"none",
                   resize:"none", fontFamily:"inherit", lineHeight:1.6 }} />
        <div style={{ textAlign:"right", fontSize:11, color:C.sub, marginTop:4 }}>{draft.length}/40</div>
        <div style={{ display:"flex", gap:10, marginTop:12 }}>
          <button onClick={onCancel}
            style={{ flex:1, padding:"13px 0", borderRadius:14, fontSize:14, fontWeight:700,
                     background:"#fff", color:C.sub, border:`1px solid ${C.border}`, cursor:"pointer" }}>取消</button>
          <button onClick={onSave}
            style={{ flex:2, padding:"13px 0", borderRadius:14, fontSize:14, fontWeight:800,
                     background:C.pri, color:"#fff", border:"none", cursor:"pointer" }}>保存</button>
        </div>
      </div>
    </div>
  );
}
