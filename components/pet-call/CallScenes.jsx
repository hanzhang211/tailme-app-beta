"use client";

/**
 * components/pet-call/CallScenes.jsx
 *
 * 「来电场景」开关列表（替代原来的「来电类型」单选）。
 * 每个场景：左 icon + 标题 + 说明 + 右侧 switch；开启用 TailMe 橙色。
 * 用户只开关场景，情绪/叫声/字幕语气由 lib/petCallEmotionMap 自动匹配。
 *
 * props: { scenes, onToggle(sceneId) }
 */

import { CALL_SCENES } from "@/lib/petCallTemplates";

const C = { pri: "#E68645", text: "#2A2520", sub: "#8A8178", border: "#EFE3D5", light: "#FFF3E9" };

export default function CallScenes({ scenes, onToggle }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {CALL_SCENES.map((s) => {
        const on = !!scenes?.[s.id];
        const Icon = s.Icon;
        return (
          <div key={s.id}
            style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", borderRadius: 16,
                     border: `1px solid ${on ? "#F4D9BE" : C.border}`, padding: "12px 14px",
                     boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
            <span style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                           background: on ? C.light : "#F6F2EB",
                           display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={19} color={on ? C.pri : "#B79B82"} strokeWidth={2} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: C.text }}>{s.label}</div>
              <div style={{ fontSize: 11.5, color: C.sub, marginTop: 3, lineHeight: 1.4 }}>{s.desc}</div>
            </div>
            <Switch on={on} onClick={() => onToggle(s.id)} />
          </div>
        );
      })}
    </div>
  );
}

function Switch({ on, onClick }) {
  return (
    <button onClick={onClick} role="switch" aria-checked={on}
      style={{ width: 46, height: 27, borderRadius: 14, border: "none", cursor: "pointer", flexShrink: 0,
               padding: 0, position: "relative", background: on ? "#E68645" : "#D9D3C8",
               transition: "background .2s ease", WebkitTapHighlightColor: "transparent" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 22 : 3, width: 21, height: 21, borderRadius: "50%",
                     background: "#fff", transition: "left .2s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }} />
    </button>
  );
}
