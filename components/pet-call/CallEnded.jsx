"use client";

/**
 * components/pet-call/CallEnded.jsx
 *
 * 通话结束页（参考设计图第 7 屏）：宠物头像 + 通话时长 + 暖心收尾文案 +
 * 心情记录（5 选）+ 完成按钮。
 *
 * props: { name, avatar, duration, onDone(mood) }
 */

import { useState } from "react";
import { formatDuration } from "@/hooks/usePetCall";

const C = { pri: "#E68645", text: "#2A2520", sub: "#8A8178", bg: "#EEE9E1", border: "#EFE3D5" };

const MOODS = [
  { id: "very_happy", emoji: "😆", label: "很开心" },
  { id: "happy", emoji: "🙂", label: "开心" },
  { id: "normal", emoji: "😐", label: "一般" },
  { id: "tired", emoji: "😪", label: "有点累" },
  { id: "sad", emoji: "😢", label: "很难过" },
];

export default function CallEnded({ name, avatar, duration, onDone }) {
  const [mood, setMood] = useState(null);

  return (
    <div style={{ position: "absolute", inset: 0, background: C.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, overflowY: "auto",
                    padding: "max(env(safe-area-inset-top), 40px) 22px 16px",
                    display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: C.text, marginTop: 8 }}>通话已结束</div>
        <div style={{ fontSize: 13, color: C.sub, marginTop: 6 }}>通话时长 {formatDuration(duration)}</div>

        <div style={{ position: "relative", margin: "26px 0 18px" }}>
          <img src={avatar} alt={name}
               style={{ width: 116, height: 116, borderRadius: "50%", objectFit: "cover",
                        border: "4px solid #fff", boxShadow: "0 6px 20px rgba(230,134,69,0.22)", background: "#F2E5DA" }} />
        </div>

        <div style={{ fontSize: 15.5, fontWeight: 700, color: C.text, textAlign: "center", lineHeight: 1.7 }}>
          很开心和你聊天！<br />我会一直在这里等你哦～
        </div>

        {/* 心情记录 */}
        <div style={{ width: "100%", background: "#fff", borderRadius: 20, border: `1px solid ${C.border}`,
                      padding: "16px 14px", marginTop: 28, boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>心情记录</div>
          <div style={{ fontSize: 11.5, color: C.sub, marginTop: 3, marginBottom: 14 }}>这次通话让你的心情如何？</div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {MOODS.map((m) => {
              const on = mood === m.id;
              return (
                <button key={m.id} onClick={() => setMood(m.id)}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                           background: "none", border: "none", cursor: "pointer", padding: 0,
                           WebkitTapHighlightColor: "transparent" }}>
                  <span style={{ width: 46, height: 46, borderRadius: "50%", fontSize: 24, lineHeight: "46px",
                                 textAlign: "center", transition: "all .15s ease",
                                 background: on ? "#FFF1E6" : "#F6F2EB",
                                 border: `1.5px solid ${on ? C.pri : "transparent"}`,
                                 transform: on ? "scale(1.06)" : "scale(1)" }}>
                    {m.emoji}
                  </span>
                  <span style={{ fontSize: 10.5, fontWeight: on ? 800 : 600, color: on ? C.pri : C.sub }}>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 完成 */}
      <div style={{ padding: "12px 22px max(env(safe-area-inset-bottom), 22px)", background: C.bg }}>
        <button onClick={() => onDone(mood)}
          style={{ width: "100%", padding: "15px 0", borderRadius: 16, border: "none", cursor: "pointer",
                   background: C.pri, color: "#fff", fontSize: 16, fontWeight: 800,
                   boxShadow: "0 6px 18px rgba(230,134,69,0.32)" }}>
          完成
        </button>
      </div>
    </div>
  );
}
