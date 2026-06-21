"use client";

/**
 * components/paw-planet/MemoryTimelinePreview.jsx
 * 「我们一起走过的日子」横向时间线预览（首页区块）。点击「查看时间线」进完整时间线。
 * props: { timeline, onMore }
 */

import { ChevronRight, Clock } from "lucide-react";
import { PLANET_C as C } from "@/lib/pawPlanetMock";

const THUMBS = ["linear-gradient(135deg,#FBE3D0,#F3C49B)", "linear-gradient(135deg,#E6DEF7,#C6BCE8)",
                "linear-gradient(135deg,#DDEFC9,#B6D99A)", "linear-gradient(135deg,#FCE0E6,#F2B8C6)"];

export default function MemoryTimelinePreview({ timeline = [], onMore }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12, padding: "0 2px" }}>
        <div style={{ flex: 1, fontSize: 15.5, fontWeight: 800, color: "#fff" }}>我们一起走过的日子</div>
        <button onClick={onMore}
          style={{ display: "flex", alignItems: "center", gap: 2, background: "none", border: "none",
                   cursor: "pointer", fontSize: 12.5, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
          查看时间线 <ChevronRight size={15} />
        </button>
      </div>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
        {timeline.map((t, i) => (
          <div key={i} style={{ flexShrink: 0, width: 140, background: C.cream, borderRadius: 16,
                                overflow: "hidden", boxShadow: "0 4px 14px rgba(40,40,90,0.18)" }}>
            <div style={{ height: 80, background: THUMBS[i % THUMBS.length], display: "flex",
                          alignItems: "center", justifyContent: "center" }}>
              <Clock size={22} color="rgba(255,255,255,0.85)" />
            </div>
            <div style={{ padding: "9px 11px" }}>
              <div style={{ fontSize: 11, color: C.pri, fontWeight: 700 }}>{t.date}</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, marginTop: 3, lineHeight: 1.35 }}>{t.title}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
