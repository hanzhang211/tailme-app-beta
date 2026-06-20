"use client";

/**
 * components/pet-call/CallTypeSelector.jsx
 *
 * 「来电类型」2 列卡片选择器（参考设计图第 2 屏）。
 * 选中态：浅橙底 + 橙描边 + 橙色图标 + 轻阴影。
 *
 * props: { value, onChange }
 */

import { CALL_TYPES } from "@/lib/petCallTemplates";

const C = { pri: "#E68645", text: "#2A2520", sub: "#8A8178", border: "#EFE3D5", light: "#FFF3E9" };

export default function CallTypeSelector({ value, onChange }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {CALL_TYPES.map((t) => {
        const on = value === t.id;
        const Icon = t.Icon;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              textAlign: "left", cursor: "pointer", borderRadius: 16, padding: "12px 12px",
              background: on ? C.light : "#FFFFFF",
              border: `1.5px solid ${on ? C.pri : C.border}`,
              boxShadow: on ? "0 4px 12px rgba(230,134,69,0.16)" : "0 1px 4px rgba(0,0,0,0.04)",
              display: "flex", alignItems: "center", gap: 10,
              transition: "all .15s ease", WebkitTapHighlightColor: "transparent",
            }}
          >
            <span
              style={{
                width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                background: on ? "#FFFFFF" : "#FBF3EB",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Icon size={19} color={on ? C.pri : "#B79B82"} strokeWidth={2} />
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 800, color: on ? C.pri : C.text }}>
                {t.label}
              </span>
              <span style={{ display: "block", fontSize: 10.5, color: C.sub, marginTop: 2, lineHeight: 1.3 }}>
                {t.sub}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
