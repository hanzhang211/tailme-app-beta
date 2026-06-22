"use client";

/**
 * components/paw-planet/TimelineView.jsx
 * 「回忆时间线」——梦幻紫星空竖向时间轴（仅视觉改造；时间线数据/顺序/图片逻辑保持不变）。
 * props: { avatar, mock, onBack }
 */

import BackButton from "@/components/icons/BackButton";
import FloatingStars from "@/components/paw-planet/FloatingStars";
import { PLANET_PURPLE as P } from "@/components/paw-planet/PlanetDecor";

const THUMBS = ["linear-gradient(135deg,#EDE6FB,#D6CAF0)", "linear-gradient(135deg,#E6ECFB,#C9D6EC)",
                "linear-gradient(135deg,#F3E8FB,#E0CDEF)", "linear-gradient(135deg,#E8E4FA,#CFC6EE)"];

export default function TimelineView({ avatar, mock, onBack }) {
  const list = mock?.timeline || [];
  return (
    <div style={{ height: "100%", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", background: P.bg }}>
      <FloatingStars />

      <div style={{ position: "relative", zIndex: 1, padding: "max(env(safe-area-inset-top), 28px) 16px 8px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <BackButton onClick={onBack} bg={P.glassBtn} color="#fff" border={false} shadow={false} />
        <div style={{ flex: 1, textAlign: "center", marginRight: 38, fontSize: 18, fontWeight: 800, color: "#fff" }}>回忆时间线</div>
      </div>

      <div style={{ position: "relative", zIndex: 1, flex: 1, overflowY: "auto", padding: "12px 18px 28px" }}>
        {list.map((t, i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: 18 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <span style={{ width: 13, height: 13, borderRadius: "50%", background: "#fff", border: "2px solid #B9A7F4",
                             boxShadow: "0 0 10px rgba(200,185,255,0.9)", marginTop: 4 }} />
              {i < list.length - 1 && (
                <span style={{ flex: 1, width: 2.5, marginTop: 4, minHeight: 70, borderRadius: 2,
                               background: "linear-gradient(to bottom, rgba(255,255,255,0.55), rgba(185,167,244,0.35))",
                               boxShadow: "0 0 8px rgba(200,185,255,0.5)" }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0, display: "flex", gap: 12, background: "rgba(248,245,255,0.92)", borderRadius: 20,
                          padding: "12px", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 12px 36px rgba(30,20,90,0.22)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "#8C7BF2", fontWeight: 800 }}>{t.date}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#5E55A8", marginTop: 4 }}>{t.title}</div>
                <div style={{ fontSize: 11.5, color: "#7E76B8", marginTop: 4, lineHeight: 1.5 }}>{t.desc}</div>
              </div>
              <div style={{ width: 64, height: 64, borderRadius: 14, flexShrink: 0, background: THUMBS[i % THUMBS.length],
                            display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={avatar} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover",
                                                   border: "2px solid rgba(255,255,255,0.85)" }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
