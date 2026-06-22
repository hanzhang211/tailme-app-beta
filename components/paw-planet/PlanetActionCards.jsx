"use client";

/**
 * components/paw-planet/PlanetActionCards.jsx
 * 主视觉下方 5 个功能入口——紫色玻璃功能面板（仅视觉，跳转逻辑不变）。
 * props: { onOpen(key) }  key: today | letter | gallery | card | timeline
 */

import { Star, Mail, Image as ImageIcon, Heart, Clock } from "lucide-react";

const ACTIONS = [
  { key: "today",    label: "今天的它",   sub: "星球日常",       Icon: Star,      grad: "linear-gradient(135deg,#FFE7A8,#B9A7F4)" },
  { key: "letter",   label: "写给它的信", sub: "说说心里话",     Icon: Mail,      grad: "linear-gradient(135deg,#FBD0E8,#A995FF)" },
  { key: "gallery",  label: "回忆相册",   sub: "珍藏每份美好",   Icon: ImageIcon, grad: "linear-gradient(135deg,#CDBDFF,#8C7BF2)" },
  { key: "card",     label: "纪念卡片",   sub: "生成纪念卡",     Icon: Heart,     grad: "linear-gradient(135deg,#FFC9D8,#A995FF)" },
  { key: "timeline", label: "回忆时间线", sub: "一起走过的日子", Icon: Clock,     grad: "linear-gradient(135deg,#FFE0A8,#9A8DDA)" },
];

export default function PlanetActionCards({ onOpen }) {
  return (
    <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.12)",
                  backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
                  border: "1px solid rgba(255,255,255,0.2)", borderRadius: 28, padding: "16px 8px",
                  boxShadow: "0 12px 40px rgba(30,20,90,0.28), 0 0 24px rgba(180,160,255,0.18)" }}>
      {ACTIONS.map((a) => {
        const Icon = a.Icon;
        return (
          <button key={a.key} onClick={() => onOpen?.(a.key)}
            style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                     background: "none", border: "none", cursor: "pointer", padding: "2px",
                     WebkitTapHighlightColor: "transparent" }}>
            <span style={{ width: 46, height: 46, borderRadius: 16, flexShrink: 0, background: a.grad,
                           border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center",
                           boxShadow: "0 6px 20px rgba(120,90,220,0.28)" }}>
              <Icon size={21} color="#fff" style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.55))" }} />
            </span>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", textAlign: "center", lineHeight: 1.2 }}>{a.label}</span>
            <span style={{ fontSize: 8.5, color: "rgba(255,255,255,0.66)", textAlign: "center", lineHeight: 1.2 }}>{a.sub}</span>
          </button>
        );
      })}
    </div>
  );
}
