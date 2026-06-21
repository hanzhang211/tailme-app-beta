"use client";

/**
 * components/memorial/MemorialCenter.jsx
 *
 * 「爪爪星球纪念模式」全屏浮层（沿用商城/分享卡同款浮层模式）。内部 view 状态机：
 *   select → 选择宠物（每只独立显示 未开启/已开启，可开启/查看/关闭）
 *   intro  → 某只宠物的开启介绍页（对齐设计稿：宠物卡 + 说明 + 3 信息卡 + 进入爪爪星球/暂不开启）
 *   home   → 爪爪星球纪念主页（大头像 + 星球装饰 + 轮播温柔文案 + 小档案 + 功能卡）
 *
 * 数据：pets.is_memorial_mode / memorial_started_at，开关复用 updatePet；开关后 onPetUpdated 通知外层刷新。
 * 每只宠物独立，互不影响。温暖治愈、非悲伤、无宗教感。
 *
 * props: { pets, user, onClose, onPetUpdated, toast }
 */

import { useState } from "react";
import { Heart, Image as ImageIcon, Clock, Sparkles, ChevronRight } from "lucide-react";
import BackButton from "@/components/icons/BackButton";
import { isCatPet } from "@/services/breedAvatar";
import { formatPetAge } from "@/services/petAge";
import { updatePet } from "@/services/supabaseService";
import PawPlanetPage from "@/components/paw-planet/PawPlanetPage";

const C = {
  pri: "#E68645", bg: "#F3ECE0", card: "#FFFFFF", text: "#2A2520",
  sub: "#9A8E7E", border: "#EFE3D5", soft: "#A86E3D", light: "#FFF3E9", deep: "#C25E1C",
};

/* 橙色小星球 icon（带环 + 小爪点） */
function PlanetIcon({ size = 22, color = C.pri }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="6.4" fill={color} fillOpacity="0.16" stroke={color} strokeWidth="1.6" />
      <ellipse cx="11" cy="12.5" rx="10.5" ry="3.1" stroke={color} strokeWidth="1.6" transform="rotate(-20 11 12.5)" />
      <circle cx="9.2" cy="9.4" r="1" fill={color} />
      <circle cx="12.6" cy="11.4" r="0.8" fill={color} />
    </svg>
  );
}

const avatarOf = (pet) => pet?.ai_avatar_url || pet?.pet_avatar_thumb_url || (isCatPet(pet) ? "/cat.png" : "/dog.png");
const genderLabel = (pet) => (pet?.gender === "female" ? "女孩" : pet?.gender === "male" ? "男孩" : null);
const daysWith = (pet) => {
  const d = pet?.created_at || pet?.birthday;
  if (!d) return null;
  const n = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  return n > 0 ? n : null;
};
const metaOf = (pet) => [pet?.breed, formatPetAge(pet?.birthday), genderLabel(pet)].filter(Boolean).join(" · ");

export default function MemorialCenter({ pets = [], user, onClose, onPetUpdated, toast }) {
  const [view, setView] = useState("select");
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(null); // 待关闭的 pet
  const [notice, setNotice] = useState(null);

  const selected = pets.find((p) => p.id === selectedId) || null;

  const note = (msg) => {
    setNotice(msg);
    if (note._t) clearTimeout(note._t);
    note._t = setTimeout(() => setNotice(null), 2200);
  };

  const openIntro = (pet) => { setSelectedId(pet.id); setView("intro"); };
  const openHome = (pet) => { setSelectedId(pet.id); setView("home"); };

  const enableMemorial = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const updated = await updatePet(selected.id, { is_memorial_mode: true, memorial_started_at: new Date().toISOString() });
      onPetUpdated?.(updated);
      note("已进入爪爪星球 🪐");
      setView("home");
    } catch (e) { note(e.message || "开启失败"); }
    finally { setBusy(false); }
  };

  const doClose = async (pet) => {
    setConfirmClose(null);
    try {
      const updated = await updatePet(pet.id, { is_memorial_mode: false });
      onPetUpdated?.(updated);
      note("已关闭纪念模式");
    } catch (e) { note(e.message || "关闭失败"); }
  };

  /* 浮层外壳 + 内部 toast + 确认弹窗 */
  const wrap = (children) => (
    <div style={{ position: "fixed", inset: 0, zIndex: 240, background: C.bg, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 430, height: "100%", display: "flex", flexDirection: "column",
                    animation: "mc-in .22s ease-out", position: "relative", overflow: "hidden" }}>
        {children}
      </div>
      {notice && (
        <div style={{ position: "fixed", left: "50%", bottom: 70, transform: "translateX(-50%)", zIndex: 270,
                      maxWidth: 300, padding: "10px 18px", borderRadius: 14, fontSize: 13, fontWeight: 600,
                      textAlign: "center", background: C.pri, color: "#fff", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
          {notice}
        </div>
      )}
      {confirmClose && (
        <ConfirmDialog
          title="确认关闭纪念模式？"
          text="关闭后将恢复普通显示状态，但已保存的纪念内容不会被删除。"
          okText="确认关闭" okColor="#D9542B"
          onCancel={() => setConfirmClose(null)} onOk={() => doClose(confirmClose)} />
      )}
      <style>{`@keyframes mc-in { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }`}</style>
    </div>
  );

  /* ════════ 屏一：选择宠物 ════════ */
  if (view === "select") {
    return wrap(<>
      <div style={{ padding: "max(env(safe-area-inset-top), 28px) 16px 10px", display: "flex", alignItems: "flex-start", gap: 10, flexShrink: 0 }}>
        <BackButton onClick={onClose} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.text }}>选择进入星球纪念模式的宠物</div>
          <div style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>你可以为每一只毛孩子单独开启纪念模式</div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px 30px" }}>
        {pets.length === 0 ? (
          <div style={{ textAlign: "center", color: C.sub, marginTop: 80, fontSize: 14 }}>还没有毛孩子的档案哦</div>
        ) : pets.map((pet) => {
          const on = !!pet.is_memorial_mode;
          return (
            <div key={pet.id} style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.border}`,
                                       padding: "14px", marginBottom: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <img src={avatarOf(pet)} alt={pet.name}
                     style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", background: "#F2E5DA", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{pet.name || "未命名"}</div>
                  <div style={{ fontSize: 12, color: C.sub, marginTop: 3 }}>{metaOf(pet) || "暂无资料"}</div>
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 700, padding: "4px 11px", borderRadius: 11, flexShrink: 0,
                               background: on ? C.light : "#F2EDE5", color: on ? C.pri : C.sub,
                               border: on ? `1px solid #F4D9BE` : "1px solid #E8E0D4" }}>
                  {on ? "已开启" : "未开启"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                {on ? (
                  <>
                    <button onClick={() => openHome(pet)}
                      style={{ flex: 1, padding: "11px 0", borderRadius: 13, border: "none", cursor: "pointer",
                               background: C.pri, color: "#fff", fontSize: 13.5, fontWeight: 800 }}>
                      查看纪念页面
                    </button>
                    <button onClick={() => setConfirmClose(pet)}
                      style={{ padding: "11px 16px", borderRadius: 13, cursor: "pointer",
                               background: "#fff", color: C.sub, border: `1px solid ${C.border}`, fontSize: 13.5, fontWeight: 700 }}>
                      关闭
                    </button>
                  </>
                ) : (
                  <button onClick={() => openIntro(pet)}
                    style={{ flex: 1, padding: "11px 0", borderRadius: 13, border: "none", cursor: "pointer",
                             background: C.pri, color: "#fff", fontSize: 13.5, fontWeight: 800 }}>
                    开启纪念模式
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>);
  }

  /* ════════ 屏二：开启介绍页（对齐设计稿）════════ */
  if (view === "intro" && selected) {
    const days = daysWith(selected);
    return wrap(<>
      <div style={{ padding: "max(env(safe-area-inset-top), 28px) 16px 8px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <BackButton onClick={() => setView("select")} />
        <div style={{ flex: 1, textAlign: "center", marginRight: 38, fontSize: 18, fontWeight: 800, color: C.text }}>爪爪星球纪念模式</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 24px" }}>
        {/* 宠物卡 */}
        <div style={{ position: "relative", overflow: "hidden", background: "linear-gradient(135deg,#FFF6EC,#FCE8D4)",
                      borderRadius: 22, border: "1px solid #F4D9BE", padding: "16px", display: "flex", alignItems: "center", gap: 14 }}>
          <img src={avatarOf(selected)} alt={selected.name}
               style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid #fff", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.text }}>{selected.name || "毛孩子"}</div>
            <div style={{ fontSize: 13, color: C.sub, marginTop: 3 }}>{selected.breed || "未填品种"}</div>
            {days != null && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, fontSize: 11.5,
                            fontWeight: 700, color: C.pri, background: "#fff", padding: "3px 10px", borderRadius: 10 }}>
                <Heart size={11} color={C.pri} fill={C.pri} /> 与你相遇 {days} 天
              </div>
            )}
          </div>
          <div style={{ position: "absolute", right: 14, top: 14, opacity: 0.9 }}><PlanetIcon size={50} /></div>
          <Sparkles size={14} color="#F2B27E" style={{ position: "absolute", right: 70, top: 18 }} />
        </div>

        {/* 说明卡 */}
        <div style={{ display: "flex", gap: 12, background: C.card, borderRadius: 18, border: `1px solid ${C.border}`,
                      padding: "14px 16px", marginTop: 14 }}>
          <span style={{ width: 36, height: 36, borderRadius: 12, background: C.light, flexShrink: 0,
                         display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Heart size={18} color={C.pri} fill={C.pri} />
          </span>
          <div style={{ fontSize: 12.5, color: C.soft, lineHeight: 1.8 }}>
            开启后，TailMe 会为它保留一个温柔的纪念空间——照片、帖子、回忆与陪伴都会被好好收藏，你随时可以来爪爪星球看看它。
          </div>
        </div>

        {/* 3 信息卡 */}
        <div style={{ marginTop: 14 }}>
          <InfoCard Icon={ImageIcon} title="保留照片与帖子" sub="所有美好瞬间都会被永久保存" onClick={() => note("照片与帖子会被保留 🐾")} />
          <InfoCard Icon={Heart} title="纪念卡片" sub="为爱宠生成专属纪念卡片" onClick={() => note("纪念卡片即将上线 🐾")} />
          <InfoCard Icon={Clock} title="回忆时间线" sub="完整记录你们的点滴回忆" onClick={() => note("回忆时间线即将上线 🐾")} last />
        </div>
      </div>

      {/* 底部按钮 */}
      <div style={{ padding: "10px 16px max(env(safe-area-inset-bottom), 16px)", background: C.bg, flexShrink: 0 }}>
        <button onClick={enableMemorial} disabled={busy}
          style={{ width: "100%", padding: "15px 0", borderRadius: 16, border: "none", cursor: busy ? "default" : "pointer",
                   opacity: busy ? 0.6 : 1, background: C.pri, color: "#fff", fontSize: 16, fontWeight: 800,
                   boxShadow: "0 6px 18px rgba(230,134,69,0.32)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {busy ? "开启中…" : <>进入爪爪星球 <PlanetIcon size={20} color="#fff" /></>}
        </button>
        <button onClick={() => setView("select")}
          style={{ width: "100%", padding: "13px 0", borderRadius: 14, marginTop: 10, cursor: "pointer",
                   background: "#fff", color: C.pri, border: `1px solid ${C.border}`, fontSize: 14.5, fontWeight: 700 }}>
          暂不开启
        </button>
        <div style={{ textAlign: "center", fontSize: 11.5, color: C.sub, marginTop: 12 }}>
          随时可以在设置中开启或关闭纪念模式
        </div>
      </div>
    </>);
  }

  /* ════════ 屏三：进入完整「爪爪星球」独立页面模块 ════════ */
  if (view === "home" && selected) {
    return <PawPlanetPage pet={selected} onBack={() => setView("select")} />;
  }

  return wrap(<div style={{ flex: 1 }} />);
}

function InfoCard({ Icon, title, sub, onClick, last }) {
  return (
    <button onClick={onClick}
      style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: C.card,
               borderRadius: 16, border: `1px solid ${C.border}`, padding: "13px 14px", cursor: "pointer",
               marginBottom: last ? 0 : 10, textAlign: "left", boxShadow: "0 1px 5px rgba(0,0,0,0.03)",
               WebkitTapHighlightColor: "transparent" }}>
      <span style={{ width: 40, height: 40, borderRadius: 13, background: C.light, flexShrink: 0,
                     display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={19} color={C.pri} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14.5, fontWeight: 800, color: C.text }}>{title}</span>
        <span style={{ display: "block", fontSize: 11.5, color: C.sub, marginTop: 3 }}>{sub}</span>
      </span>
      <ChevronRight size={18} color="#C9BFB2" style={{ flexShrink: 0 }} />
    </button>
  );
}

function ConfirmDialog({ title, text, okText, okColor, onCancel, onOk }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 280, background: "rgba(0,0,0,0.4)",
                  display: "flex", alignItems: "center", justifyContent: "center", padding: 30 }}
         onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 310, background: "#fff", borderRadius: 22, padding: "22px 20px 16px",
                 textAlign: "center", boxShadow: "0 12px 40px rgba(0,0,0,0.25)" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.7, marginBottom: 20 }}>{text}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel}
            style={{ flex: 1, padding: "12px 0", borderRadius: 13, cursor: "pointer",
                     background: "#F2EDE5", border: "none", color: C.text, fontSize: 14, fontWeight: 700 }}>
            取消
          </button>
          <button onClick={onOk}
            style={{ flex: 1, padding: "12px 0", borderRadius: 13, cursor: "pointer",
                     background: okColor || C.pri, border: "none", color: "#fff", fontSize: 14, fontWeight: 700 }}>
            {okText || "确认"}
          </button>
        </div>
      </div>
    </div>
  );
}
