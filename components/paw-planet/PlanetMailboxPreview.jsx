"use client";

/**
 * components/paw-planet/PlanetMailboxPreview.jsx
 * 首页底部「星球信箱」入口卡——紫色玻璃卡（仅视觉；点击进信箱逻辑不变）。
 * props: { count, petName, onClick }
 */

import { Mail, ChevronRight, Star } from "lucide-react";

export default function PlanetMailboxPreview({ count = 0, petName = "毛孩子", onClick }) {
  return (
    <button onClick={onClick}
      style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 13, width: "100%", marginTop: 16,
               background: "linear-gradient(90deg, rgba(255,255,255,0.18), rgba(255,255,255,0.12) 60%, rgba(255,255,255,0.08))",
               backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
               borderRadius: 26, padding: "15px 16px", cursor: "pointer",
               border: "1px solid rgba(255,255,255,0.22)", boxShadow: "0 10px 36px rgba(50,30,120,0.28)",
               textAlign: "left", WebkitTapHighlightColor: "transparent" }}>
      <span style={{ position: "relative", width: 50, height: 50, borderRadius: 18, flexShrink: 0,
                     background: "linear-gradient(135deg,#B9A7F4,#7466D8)", border: "1px solid rgba(255,255,255,0.3)",
                     display: "flex", alignItems: "center", justifyContent: "center",
                     boxShadow: "0 0 20px rgba(185,167,244,0.45)" }}>
        <Mail size={22} color="#fff" />
        {count > 0 && (
          <span style={{ position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9,
                         background: "#FF8FA3", color: "#fff", fontSize: 10.5, fontWeight: 800, padding: "0 5px",
                         display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>
            {count}
          </span>
        )}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 15, fontWeight: 800, color: "#fff" }}>
          星球信箱{count > 0 ? ` · ${count} 封信` : ""}
        </span>
        <span style={{ display: "block", fontSize: 11.5, color: "rgba(255,255,255,0.72)", marginTop: 3 }}>
          每一封信，{petName}都会收到哦～
        </span>
      </span>
      <ChevronRight size={18} color="rgba(255,255,255,0.75)" />
      {/* 小星星装饰（不挡点击） */}
      <Star size={11} color="#FFE89A" fill="#FFE89A" style={{ position: "absolute", top: 10, right: 34, opacity: 0.85, pointerEvents: "none" }} />
      <Star size={8} color="#FFE89A" fill="#FFE89A" style={{ position: "absolute", bottom: 12, right: 50, opacity: 0.7, pointerEvents: "none" }} />
    </button>
  );
}
