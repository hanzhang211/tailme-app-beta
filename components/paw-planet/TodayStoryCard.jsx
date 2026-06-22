"use client";

/**
 * components/paw-planet/TodayStoryCard.jsx
 * 主视觉旁的「今天的它」浅紫玻璃摘要卡（仅视觉；点击进今日动态页逻辑不变）。
 * props: { petName, summary, onClick }
 */

import { ChevronRight, Sparkles } from "lucide-react";

export default function TodayStoryCard({ petName = "毛孩子", summary = "今天状态很好哦", onClick }) {
  return (
    <button onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", maxWidth: 260,
               background: "rgba(248,245,255,0.92)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
               cursor: "pointer", border: "1px solid rgba(255,255,255,0.6)", borderRadius: 24, padding: "12px 15px",
               boxShadow: "0 12px 32px rgba(30,20,90,0.24)", textAlign: "left", WebkitTapHighlightColor: "transparent" }}>
      <span style={{ width: 40, height: 40, borderRadius: 13, flexShrink: 0,
                     background: "linear-gradient(135deg,#FFB86B,#F7A65A)",
                     display: "flex", alignItems: "center", justifyContent: "center",
                     boxShadow: "0 4px 12px rgba(247,166,90,0.4)" }}>
        <Sparkles size={19} color="#fff" />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14.5, fontWeight: 800, color: "#5E55A8" }}>今天的{petName}</span>
        <span style={{ display: "block", fontSize: 11.5, color: "#8C7BF2", marginTop: 2 }}>{summary}</span>
      </span>
      <ChevronRight size={18} color="#A79FCF" />
    </button>
  );
}
