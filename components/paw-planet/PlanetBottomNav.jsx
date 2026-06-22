"use client";

/**
 * components/paw-planet/PlanetBottomNav.jsx
 * 爪爪星球模块底部导航（独立于主站 tab）。半透明紫玻璃 + 圆角，激活项浅紫高亮。
 * props: { active, onChange(key) }  key: home | today | letter | gallery | me
 */

import { Orbit, Sun, Mail, Image as ImageIcon, User } from "lucide-react";

const TABS = [
  { key: "home",    label: "星球首页",  Icon: Orbit },
  { key: "today",   label: "今天的它",  Icon: Sun },
  { key: "letter",  label: "写信",      Icon: Mail },
  { key: "gallery", label: "回忆",      Icon: ImageIcon },
  { key: "me",      label: "我的",      Icon: User },
];

export default function PlanetBottomNav({ active, onChange }) {
  return (
    <div style={{ flexShrink: 0, display: "flex", background: "rgba(74,72,133,0.42)",
                  backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
                  borderTop: "1px solid rgba(255,255,255,0.18)",
                  padding: "8px 8px max(env(safe-area-inset-bottom), 8px)" }}>
      {TABS.map((t) => {
        const on = active === t.key;
        const Icon = t.Icon;
        return (
          <button key={t.key} onClick={() => onChange?.(t.key)}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                     background: on ? "rgba(255,255,255,0.18)" : "none",
                     border: on ? "1px solid rgba(255,255,255,0.35)" : "1px solid transparent",
                     borderRadius: 14, cursor: "pointer", padding: "5px 0",
                     WebkitTapHighlightColor: "transparent" }}>
            <Icon size={21} color={on ? "#fff" : "rgba(255,255,255,0.6)"} strokeWidth={on ? 2.4 : 2} />
            <span style={{ fontSize: 10, fontWeight: on ? 800 : 600, color: on ? "#fff" : "rgba(255,255,255,0.6)" }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
