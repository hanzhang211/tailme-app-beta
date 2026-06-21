"use client";

/**
 * components/paw-planet/TimelineView.jsx
 * 「回忆时间线」——竖向时间轴（对齐设计稿屏5）。第一版 mock。
 * props: { avatar, mock, onBack }
 */

import BackButton from "@/components/icons/BackButton";
import { PLANET_C as C } from "@/lib/pawPlanetMock";

const THUMBS = ["linear-gradient(135deg,#FBE3D0,#F3C49B)", "linear-gradient(135deg,#DDEFC9,#B6D99A)",
                "linear-gradient(135deg,#FBEEC8,#F2D98A)", "linear-gradient(135deg,#E6DEF7,#C6BCE8)"];

export default function TimelineView({ avatar, mock, onBack }) {
  const list = mock?.timeline || [];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F4ECE0" }}>
      <div style={{ padding: "max(env(safe-area-inset-top), 28px) 16px 8px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <BackButton onClick={onBack} />
        <div style={{ flex: 1, textAlign: "center", marginRight: 38, fontSize: 17, fontWeight: 800, color: C.text }}>回忆时间线</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px 24px" }}>
        {list.map((t, i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: 18 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: C.pri, border: "2px solid #fff",
                             boxShadow: "0 0 0 2px #F4D9BE" }} />
              {i < list.length - 1 && <span style={{ flex: 1, width: 2, background: C.border, marginTop: 2, minHeight: 70 }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0, display: "flex", gap: 12, background: "#fff", borderRadius: 16,
                          padding: "12px 12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: C.pri, fontWeight: 800 }}>{t.date}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginTop: 4 }}>{t.title}</div>
                <div style={{ fontSize: 11.5, color: C.sub, marginTop: 4, lineHeight: 1.5 }}>{t.desc}</div>
              </div>
              <div style={{ width: 64, height: 64, borderRadius: 12, flexShrink: 0, background: THUMBS[i % THUMBS.length],
                            display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={avatar} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover",
                                                   border: "2px solid rgba(255,255,255,0.8)" }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
