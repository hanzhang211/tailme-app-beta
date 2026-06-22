"use client";

/**
 * components/profile/SettingsModal.jsx
 *
 * 全屏「设置」页（对齐设计稿）。两屏 view：
 *   main → 设置主列表（账号 / 宠物·纪念 / 帮助 等分组卡片）
 *   pets → 宠物管理子页（添加 / 编辑 / 删除已有宠物，沿用原功能）
 *
 * 「星球纪念模式」点击 → onOpenMemorial()（由 ProfileTab 打开纪念浮层）。
 * 其余暂未实现的入口（账号与安全 / 通知提醒 / 隐私设置 / 纪念内容设置 / 帮助 / 关于 / 删除账号）
 * 先做占位 toast，后续再接。
 */

import { useState } from "react";
import { ShieldCheck, Bell, Lock, PawPrint, HeartHandshake, HelpCircle, Info, ChevronRight, Headphones } from "lucide-react";
import PetAvatar from "@/components/PetAvatar";
import BackButton from "@/components/icons/BackButton";
import { isCatPet } from "@/services/breedAvatar";

const C = {
  pri: "#E68645", bg: "#EEE9E1", card: "#FFFFFF", text: "#2A2520",
  sub: "#9A8E7E", line: "#F0E9DF", err: "#D9542B", light: "#D6D5D8", tint: "#F2E5DA",
};

const MAX_PETS = 4;
const APP_VERSION = "v1.4.2";

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

export default function SettingsModal({
  pets, onAddPet, onEditPet, onDeletePet, onLogout, onClose, toast, onOpenMemorial, onOpenContact,
}) {
  const [view, setView] = useState("main");
  const canAdd = pets.length < MAX_PETS;
  const soon = () => toast?.("功能即将上线 🐾", "info");

  const handleAdd = () => {
    if (!canAdd) { toast?.(`最多可以添加 ${MAX_PETS} 位毛孩子哦`, "warn"); return; }
    onAddPet?.();
  };
  const handleDelete = async (pet) => {
    if (!confirm(`确定要删除 ${pet.name || "这只毛孩子"} 的档案吗？`)) return;
    await onDeletePet?.(pet);
  };
  const handleLogout = () => {
    if (!confirm("确定要退出当前账号吗？")) return;
    onLogout?.();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: C.bg, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 430, height: "100%", display: "flex", flexDirection: "column",
                    animation: "set-in .22s ease-out" }}>
        {/* header */}
        <div style={{ padding: "max(env(safe-area-inset-top), 28px) 16px 10px", display: "flex",
                      alignItems: "center", gap: 10, flexShrink: 0 }}>
          <BackButton onClick={view === "pets" ? () => setView("main") : onClose} />
          <div style={{ flex: 1, textAlign: "center", marginRight: 38, fontSize: 18, fontWeight: 800, color: C.text }}>
            {view === "pets" ? "宠物管理" : "设置"}
          </div>
        </div>

        {view === "main" ? (
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 30px" }}>
            {/* 账号 */}
            <Group>
              <Row icon={<ShieldCheck size={21} />} title="账号与安全" onClick={soon} />
              <Row icon={<Bell size={21} />} title="通知提醒" onClick={soon} />
              <Row icon={<Lock size={21} />} title="隐私设置" onClick={soon} last />
            </Group>

            {/* 宠物 & 纪念 */}
            <Group>
              <Row icon={<PawPrint size={21} />} title="宠物管理" onClick={() => setView("pets")} />
              <Row icon={<HeartHandshake size={21} />} title="纪念内容设置" onClick={soon} last />
            </Group>

            {/* 帮助 */}
            <Group>
              <Row icon={<Headphones size={21} />} title="联系我们" sub="客服 · 合作 · 建议反馈" onClick={() => onOpenContact?.()} />
              <Row icon={<HelpCircle size={21} />} title="帮助与反馈" onClick={soon} />
              <Row icon={<Info size={21} />} title="关于 TailMe" right={APP_VERSION} onClick={soon} last />
            </Group>

            {/* 退出登录 */}
            <div style={{ background: C.card, borderRadius: 16, marginTop: 6, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
              <button onClick={handleLogout}
                style={{ width: "100%", padding: "16px 0", background: "transparent", border: "none",
                         cursor: "pointer", fontSize: 15, fontWeight: 700, color: C.err }}>
                退出登录
              </button>
            </div>

            {/* 删除账号 */}
            <button onClick={() => toast?.("如需删除账号请联系客服 🐾", "info")}
              style={{ display: "block", margin: "20px auto 0", background: "none", border: "none",
                       cursor: "pointer", fontSize: 13, color: C.sub }}>
              删除账号
            </button>
          </div>
        ) : (
          /* ── 宠物管理子页 ── */
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 30px" }}>
            {pets.map((pet) => (
              <div key={pet.id}
                style={{ display: "flex", alignItems: "center", padding: "12px 14px", background: C.card,
                         marginBottom: 10, borderRadius: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                <div style={{ marginRight: 12, flexShrink: 0 }}>
                  <PetAvatar pet={pet} size={50} bg={C.tint} fallbackImg={isCatPet(pet) ? "/cat.png" : "/dog.png"} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text, overflow: "hidden",
                                textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pet.name || "未命名"}</div>
                  <div style={{ fontSize: 12, color: C.sub, marginTop: 3 }}>{pet.breed || "未填品种"}</div>
                </div>
                <button onClick={() => onEditPet?.(pet)}
                  style={{ background: C.tint, color: C.text, border: "none", padding: "7px 14px",
                           borderRadius: 11, fontSize: 12.5, fontWeight: 700, cursor: "pointer", marginRight: 8 }}>
                  编辑
                </button>
                <button onClick={() => handleDelete(pet)}
                  style={{ background: "transparent", color: C.err, border: `1px solid ${C.err}33`,
                           padding: "7px 12px", borderRadius: 11, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                  删除
                </button>
              </div>
            ))}
            <button onClick={handleAdd}
              style={{ width: "100%", marginTop: 4, padding: "14px 0", borderRadius: 16,
                       background: canAdd ? C.pri : C.light, color: canAdd ? "#fff" : C.sub,
                       border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
              + 添加毛孩子（{pets.length}/{MAX_PETS}）
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes set-in { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }`}</style>
    </div>
  );
}

function Group({ children }) {
  return (
    <div style={{ background: C.card, borderRadius: 16, marginBottom: 14, overflow: "hidden",
                  boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
      {children}
    </div>
  );
}

function Row({ icon, title, sub, right, onClick, danger, last }) {
  return (
    <button onClick={onClick}
      style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "15px 16px",
               background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
               borderBottom: last ? "none" : `1px solid ${C.line}`, WebkitTapHighlightColor: "transparent" }}>
      <span style={{ color: danger ? C.err : C.pri, flexShrink: 0, display: "flex" }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 15, fontWeight: 600, color: danger ? C.err : C.text }}>{title}</span>
        {sub && <span style={{ display: "block", fontSize: 11.5, color: C.sub, marginTop: 3, lineHeight: 1.4 }}>{sub}</span>}
      </span>
      {right ? <span style={{ fontSize: 12.5, color: C.sub, marginRight: 2 }}>{right}</span> : null}
      <ChevronRight size={18} color="#C9BFB2" style={{ flexShrink: 0 }} />
    </button>
  );
}
