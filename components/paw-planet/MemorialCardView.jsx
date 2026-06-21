"use client";

/**
 * components/paw-planet/MemorialCardView.jsx
 * 「纪念卡片」——紫色梦幻纪念卡（对齐设计稿屏6）。换一句话 / 保存到相册。第一版 mock。
 * props: { petName, avatar, daysTogether, onBack, toast }
 */

import { useState } from "react";
import BackButton from "@/components/icons/BackButton";
import { PLANET_C as C, MEMORIAL_CARD_LINES } from "@/lib/pawPlanetMock";

const THEMES = ["linear-gradient(135deg,#3A3E7A,#6E69B0)", "linear-gradient(135deg,#5B4E8C,#9A86C8)",
                "linear-gradient(135deg,#B5708A,#E0A6B8)", "linear-gradient(135deg,#3E6E8C,#7FB3C8)",
                "linear-gradient(135deg,#8C6E4E,#CFA27A)"];

export default function MemorialCardView({ petName = "毛孩子", avatar, daysTogether, onBack, toast }) {
  const [lineIdx, setLineIdx] = useState(0);
  const [theme, setTheme] = useState(0);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F4ECE0" }}>
      <div style={{ padding: "max(env(safe-area-inset-top), 28px) 16px 8px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <BackButton onClick={onBack} />
        <div style={{ flex: 1, textAlign: "center", marginRight: 38, fontSize: 17, fontWeight: 800, color: C.text }}>纪念卡片</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 22px 16px" }}>
        {/* 梦幻纪念卡 */}
        <div style={{ position: "relative", borderRadius: 24, overflow: "hidden", padding: "30px 22px 34px",
                      background: THEMES[theme], boxShadow: "0 12px 34px rgba(60,60,120,0.35)", textAlign: "center" }}>
          <span style={{ position: "absolute", left: "16%", top: "12%", fontSize: 14, opacity: 0.8 }}>✨</span>
          <span style={{ position: "absolute", right: "18%", top: "20%", fontSize: 12, opacity: 0.7 }}>⭐</span>
          <span style={{ position: "absolute", left: "22%", bottom: "14%", fontSize: 12, opacity: 0.6 }}>☁️</span>

          <div style={{ fontSize: 19, fontWeight: 900, color: "#fff", lineHeight: 1.6, marginBottom: 18 }}>
            {MEMORIAL_CARD_LINES[lineIdx]}
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", inset: -6, borderRadius: "50%",
                             background: "radial-gradient(circle, rgba(255,221,180,0.5), transparent 70%)" }} />
              <img src={avatar} alt={petName}
                   style={{ position: "relative", width: 92, height: 92, borderRadius: "50%", objectFit: "cover",
                            border: "3px solid rgba(255,255,255,0.9)" }} />
            </div>
          </div>
          {daysTogether != null && (
            <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.92)", lineHeight: 1.8 }}>
              我们一起走过了 <span style={{ color: "#FFD9A8", fontWeight: 900, fontSize: 17 }}>{daysTogether}</span> 天<br />
              你永远是我最重要的小宝贝 🐾
            </div>
          )}
        </div>

        {/* 主题模板缩略 */}
        <div style={{ display: "flex", gap: 10, overflowX: "auto", marginTop: 16, paddingBottom: 4 }}>
          {THEMES.map((t, i) => (
            <button key={i} onClick={() => setTheme(i)}
              style={{ flexShrink: 0, width: 54, height: 54, borderRadius: 14, cursor: "pointer", background: t,
                       border: theme === i ? `2.5px solid ${C.pri}` : "2.5px solid transparent",
                       boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }} />
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, padding: "10px 16px 14px", flexShrink: 0 }}>
        <button onClick={() => setLineIdx((i) => (i + 1) % MEMORIAL_CARD_LINES.length)}
          style={{ padding: "14px 20px", borderRadius: 14, cursor: "pointer", background: "#fff",
                   color: C.pri, border: `1.5px solid ${C.pri}`, fontSize: 14.5, fontWeight: 700 }}>
          换一句话
        </button>
        <button onClick={() => toast?.("已保存到相册 🐾")}
          style={{ flex: 1, padding: "14px 0", borderRadius: 14, border: "none", cursor: "pointer",
                   background: C.pri, color: "#fff", fontSize: 15, fontWeight: 800,
                   boxShadow: "0 6px 18px rgba(230,134,69,0.32)" }}>
          保存到相册
        </button>
      </div>
    </div>
  );
}
