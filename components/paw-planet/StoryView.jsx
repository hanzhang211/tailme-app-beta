"use client";

/**
 * components/paw-planet/StoryView.jsx
 * 「星球故事」——梦幻紫星空叙事页（同步星点/爪印/流星动态背景）。
 * props: { petName, avatar, mock, onBack }
 */

import BackButton from "@/components/icons/BackButton";
import FloatingStars from "@/components/paw-planet/FloatingStars";
import { PLANET_PURPLE as P } from "@/components/paw-planet/PlanetDecor";

export default function StoryView({ petName = "毛孩子", avatar, mock, onBack }) {
  const paragraphs = mock?.story || [];
  return (
    <div style={{ height: "100%", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", background: P.bg }}>
      <FloatingStars />

      <div style={{ position: "relative", zIndex: 1, padding: "max(env(safe-area-inset-top), 28px) 16px 8px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <BackButton onClick={onBack} bg={P.glassBtn} color="#fff" border={false} shadow={false} />
        <div style={{ flex: 1, textAlign: "center", marginRight: 38, fontSize: 18, fontWeight: 800, color: "#fff" }}>星球故事</div>
      </div>

      <div style={{ position: "relative", zIndex: 1, flex: 1, overflowY: "auto", padding: "10px 22px 30px" }}>
        <div style={{ display: "flex", justifyContent: "center", margin: "10px 0 22px" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", inset: -8, borderRadius: "50%",
                           background: "radial-gradient(circle, rgba(255,232,154,0.45), transparent 70%)" }} />
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
      </div>
    </div>
  );
}
