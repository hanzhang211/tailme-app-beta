"use client";

/**
 * components/paw-planet/TimelineView.jsx
 * 「回忆时间线」——梦幻紫星空竖向时间轴。真实回忆卡片（memorial_memories）。
 * props: { avatar, memories, onBack }
 */

import BackButton from "@/components/icons/BackButton";
import FloatingStars from "@/components/paw-planet/FloatingStars";
import { PLANET_PURPLE as P } from "@/components/paw-planet/PlanetDecor";

function fmtDate(m) {
  const raw = m?.memory_date || m?.created_at;
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return String(raw);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

export default function TimelineView({ petName = "毛孩子", avatar, memories = [], onBack }) {
  const list = memories || [];
  return (
    <div style={{ height: "100%", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", background: P.bg }}>
      <FloatingStars />

      <div style={{ position: "relative", zIndex: 1, padding: "max(env(safe-area-inset-top), 28px) 16px 8px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <BackButton onClick={onBack} bg={P.glassBtn} color="#fff" border={false} shadow={false} />
        <div style={{ flex: 1, textAlign: "center", marginRight: 38, fontSize: 18, fontWeight: 800, color: "#fff" }}>和{petName}的回忆</div>
      </div>

      <div style={{ position: "relative", zIndex: 1, flex: 1, overflowY: "auto", padding: "12px 18px 28px" }}>
        {list.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: 80, color: P.sub }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>还没有回忆卡片</div>
            <div style={{ fontSize: 12, marginTop: 8, lineHeight: 1.6 }}>去「回忆」添加照片，<br />这里会留下你们一起走过的日子</div>
          </div>
        ) : list.map((m, i) => (
          <div key={m.id} style={{ display: "flex", gap: 12, marginBottom: 18 }}>
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
                <div style={{ fontSize: 12, color: "#8C7BF2", fontWeight: 800 }}>{fmtDate(m)}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#5E55A8", marginTop: 4, lineHeight: 1.35 }}>{m.title}</div>
                {m.description && <div style={{ fontSize: 11.5, color: "#7E76B8", marginTop: 4, lineHeight: 1.5 }}>{m.description}</div>}
              </div>
              <div style={{ width: 64, height: 64, borderRadius: 14, flexShrink: 0, overflow: "hidden", background: "#EDE6FB" }}>
                <img src={m.thumb_url || m.image_url || avatar} alt={m.title}
                     onError={(e) => { if (avatar && e.currentTarget.src !== avatar) e.currentTarget.src = avatar; }}
                     style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
