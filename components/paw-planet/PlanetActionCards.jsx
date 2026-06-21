"use client";

/**
 * components/paw-planet/PlanetActionCards.jsx
 * 主视觉下方 5 个功能入口（对齐设计稿屏1）。半透明卡内一行 5 个按钮。
 * props: { onOpen(key) }  key: today | letter | gallery | card | timeline
 */

import { Star, Mail, Image as ImageIcon, Heart, Clock } from "lucide-react";
import { PLANET_C as C } from "@/lib/pawPlanetMock";

const ACTIONS = [
  { key: "today",    label: "今天的它",  sub: "星球日常",     Icon: Star },
  { key: "letter",   label: "写给它的信", sub: "说说心里话",   Icon: Mail },
  { key: "gallery",  label: "回忆相册",  sub: "珍藏的美好",   Icon: ImageIcon },
  { key: "card",     label: "纪念卡片",  sub: "生成纪念卡",   Icon: Heart },
  { key: "timeline", label: "回忆时间线", sub: "一起走过的日子", Icon: Clock },
];

export default function PlanetActionCards({ onOpen }) {
  return (
    <div style={{ display: "flex", gap: 4, background: "rgba(255,248,243,0.16)", backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.22)", borderRadius: 20, padding: "12px 6px" }}>
      {ACTIONS.map((a) => {
        const Icon = a.Icon;
        return (
          <button key={a.key} onClick={() => onOpen?.(a.key)}
            style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                     background: "none", border: "none", cursor: "pointer", padding: "2px 2px",
                     WebkitTapHighlightColor: "transparent" }}>
            <span style={{ width: 42, height: 42, borderRadius: 14, flexShrink: 0,
                           background: "linear-gradient(135deg,#FBD9A8,#F4B775)",
                           display: "flex", alignItems: "center", justifyContent: "center",
                           boxShadow: "0 4px 10px rgba(230,134,69,0.35)" }}>
              <Icon size={20} color="#fff" />
            </span>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: "#fff", textAlign: "center", lineHeight: 1.2 }}>{a.label}</span>
            <span style={{ fontSize: 8.5, color: "rgba(255,255,255,0.78)", textAlign: "center", lineHeight: 1.2 }}>{a.sub}</span>
          </button>
        );
      })}
    </div>
  );
}
