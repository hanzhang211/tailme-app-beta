"use client";

/**
 * components/paw-planet/TodayView.jsx
 * 「今天的它」——星球日常聊天式时间轴（对齐设计稿屏2）。第一版 mock。
 * props: { petName, avatar, mock, onBack }
 */

import { CalendarDays, Sun, Moon } from "lucide-react";
import BackButton from "@/components/icons/BackButton";
import { PLANET_C as C } from "@/lib/pawPlanetMock";

const THUMBS = ["linear-gradient(135deg,#FBE3D0,#F3C49B)", "linear-gradient(135deg,#DDEFC9,#B6D99A)", "linear-gradient(135deg,#E6DEF7,#C6BCE8)"];

export default function TodayView({ petName = "毛孩子", avatar, mock, onBack }) {
  const items = mock?.today?.items || [];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F4ECE0" }}>
      <div style={{ padding: "max(env(safe-area-inset-top), 28px) 16px 8px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <BackButton onClick={onBack} />
        <div style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: 800, color: C.text }}>今天的{petName} ✨</div>
        <span style={{ width: 38, height: 38, borderRadius: "50%", background: "#fff", border: `1px solid ${C.border}`,
                       display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <CalendarDays size={17} color={C.pri} />
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px 24px" }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 18 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <span style={{ width: 30, height: 30, borderRadius: "50%", background: C.cream,
                             border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {it.phase === "night" ? <Moon size={15} color="#8E84C8" /> : <Sun size={15} color={C.pri} />}
              </span>
              {i < items.length - 1 && <span style={{ flex: 1, width: 2, background: C.border, marginTop: 4, minHeight: 30 }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: C.sub, fontWeight: 700, marginBottom: 6 }}>{it.time}</div>
              <div style={{ background: "#fff", borderRadius: "4px 16px 16px 16px", padding: "11px 14px",
                            fontSize: 13.5, color: C.text, lineHeight: 1.7, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                {it.text}
              </div>
              <div style={{ height: 92, borderRadius: 14, marginTop: 8, background: THUMBS[i % THUMBS.length],
                            display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={avatar} alt="" style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover",
                                                   border: "2px solid rgba(255,255,255,0.8)" }} />
              </div>
            </div>
          </div>
        ))}
        <div style={{ textAlign: "center", fontSize: 11.5, color: C.sub, marginTop: 10 }}>
          这是爪爪星球为你保存的一份温柔想象 ♥
        </div>
      </div>
    </div>
  );
}
