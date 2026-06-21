"use client";

/**
 * components/paw-planet/TodayStoryCard.jsx
 * 主视觉旁的「今天的它」磨砂摘要卡（点击进今日动态页）。
 * props: { petName, summary, onClick }
 */

import { ChevronRight, Sparkles } from "lucide-react";
import { PLANET_C as C } from "@/lib/pawPlanetMock";

export default function TodayStoryCard({ petName = "毛孩子", summary = "今天状态很好哦", onClick }) {
  return (
    <button onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", maxWidth: 240,
               background: "rgba(255,248,243,0.92)", backdropFilter: "blur(8px)", cursor: "pointer",
               border: "1px solid rgba(255,255,255,0.7)", borderRadius: 18, padding: "11px 14px",
               boxShadow: "0 8px 22px rgba(40,40,90,0.22)", textAlign: "left", WebkitTapHighlightColor: "transparent" }}>
      <span style={{ width: 38, height: 38, borderRadius: 12, background: C.pri, flexShrink: 0,
                     display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Sparkles size={19} color="#fff" />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 800, color: C.text }}>今天的{petName}</span>
        <span style={{ display: "block", fontSize: 11.5, color: C.sub, marginTop: 2 }}>{summary}</span>
      </span>
      <ChevronRight size={18} color={C.brown} />
    </button>
  );
}
