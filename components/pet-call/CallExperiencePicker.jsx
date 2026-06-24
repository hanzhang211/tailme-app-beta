"use client";

/**
 * components/pet-call/CallExperiencePicker.jsx
 *
 * 「立即体验来电」的场景选择页（单独全屏页，带返回）。
 * 列出全部来电类型（CALL_TYPES），点任意一个 → 立刻体验该场景来电。
 * 仅用于手动体验；自动来电（initialTrigger）不经过此页。
 *
 * props: { name, avatar, onPick(typeId), onBack }
 */

import BackButton from "@/components/icons/BackButton";
import { CALL_TYPES } from "@/lib/petCallTemplates";

const C = { pri: "#E68645", text: "#2A2520", sub: "#8A8178", bg: "#EEE9E1", border: "#EFE3D5", light: "#FFF3E9" };

export default function CallExperiencePicker({ name = "毛孩子", onPick, onBack }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: C.bg, display: "flex", flexDirection: "column" }}>
      {/* header */}
      <div style={{ padding: "max(env(safe-area-inset-top), 28px) 16px 8px", display: "flex",
                    alignItems: "center", gap: 12, flexShrink: 0 }}>
        <BackButton onClick={onBack} />
        <div style={{ flex: 1, fontSize: 18, fontWeight: 900, color: C.text }}>选择想体验的来电</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 20px" }}>
        <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.6, marginBottom: 14 }}>
          点一种来电，{name}会立刻用这个场景给你打电话，感受一下它的声音和语气～
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {CALL_TYPES.map((t) => {
            const Icon = t.Icon;
            return (
              <button
                key={t.id}
                onClick={() => onPick?.(t.id)}
                style={{
                  textAlign: "left", cursor: "pointer", borderRadius: 16, padding: "12px 12px",
                  background: "#FFFFFF", border: `1.5px solid ${C.border}`,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  display: "flex", alignItems: "center", gap: 10,
                  transition: "all .15s ease", WebkitTapHighlightColor: "transparent",
                }}
              >
                <span style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0, background: "#FBF3EB",
                               display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={19} color={t.tint || "#B79B82"} strokeWidth={2} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13.5, fontWeight: 800, color: C.text }}>{t.label}</span>
                  <span style={{ display: "block", fontSize: 10.5, color: C.sub, marginTop: 2, lineHeight: 1.3 }}>{t.sub}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
