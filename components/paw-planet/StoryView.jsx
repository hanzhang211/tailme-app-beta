"use client";

/**
 * components/paw-planet/StoryView.jsx
 * 「星球故事」——温柔叙事页（讲它在爪爪星球的生活）。第一版 mock 文案。
 * props: { petName, avatar, mock, onBack }
 */

import BackButton from "@/components/icons/BackButton";
import { PLANET_C as C } from "@/lib/pawPlanetMock";

export default function StoryView({ petName = "毛孩子", avatar, mock, onBack }) {
  const paragraphs = mock?.story || [];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column",
                  background: "linear-gradient(180deg,#3A3E7A 0%,#5F5A9D 46%,#8E84C8 100%)" }}>
      <div style={{ padding: "max(env(safe-area-inset-top), 28px) 16px 8px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <BackButton onClick={onBack} bg="rgba(255,255,255,0.85)" />
        <div style={{ flex: 1, textAlign: "center", marginRight: 38, fontSize: 17, fontWeight: 800, color: "#fff" }}>星球故事</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 22px 30px" }}>
        <div style={{ display: "flex", justifyContent: "center", margin: "10px 0 22px" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", inset: -8, borderRadius: "50%",
                           background: "radial-gradient(circle, rgba(255,221,180,0.5), transparent 70%)" }} />
            <img src={avatar} alt={petName}
                 style={{ position: "relative", width: 112, height: 112, objectFit: "contain", display: "block",
                          filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.32))" }} />
          </div>
        </div>
        {paragraphs.map((p, i) => (
          <p key={i} style={{ fontSize: 14.5, color: "rgba(255,255,255,0.92)", lineHeight: 2,
                              textAlign: "center", margin: "0 0 16px", fontWeight: i === 0 ? 800 : 500 }}>
            {p}
          </p>
        ))}
        <div style={{ textAlign: "center", fontSize: 18, marginTop: 10 }}>✨ 🐾 ✨</div>
      </div>
    </div>
  );
}
