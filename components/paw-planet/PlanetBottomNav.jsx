"use client";

/**
 * components/paw-planet/PlanetBottomNav.jsx
 * 爪爪星球模块自己的底部导航（独立于主站 tab）。半透明白底 + 圆角，激活项橙色高亮。
 * props: { active, onChange(key) }  key: home | today | letter | gallery | me
 */

import { Orbit, Sun, Mail, Image as ImageIcon, User } from "lucide-react";
import { PLANET_C as C } from "@/lib/pawPlanetMock";

const TABS = [
  { key: "home",    label: "星球首页",  Icon: Orbit },
  { key: "today",   label: "今天的它",  Icon: Sun },
  { key: "letter",  label: "写信",      Icon: Mail },
  { key: "gallery", label: "回忆",      Icon: ImageIcon },
  { key: "me",      label: "我的",      Icon: User },
];

export default function PlanetBottomNav({ active, onChange }) {
  return (
    <div style={{ flexShrink: 0, display: "flex", background: "rgba(255,248,243,0.94)",
                  backdropFilter: "blur(10px)", borderTop: "1px solid rgba(0,0,0,0.05)",
                  padding: "8px 6px max(env(safe-area-inset-bottom), 8px)" }}>
      {TABS.map((t) => {
        const on = active === t.key;
        const Icon = t.Icon;
        return (
          <button key={t.key} onClick={() => onChange?.(t.key)}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                     background: "none", border: "none", cursor: "pointer", padding: "4px 0",
                     WebkitTapHighlightColor: "transparent" }}>
            <Icon size={21} color={on ? C.pri : "#B3A593"} strokeWidth={on ? 2.4 : 2} />
            <span style={{ fontSize: 10, fontWeight: on ? 800 : 600, color: on ? C.pri : "#B3A593" }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
