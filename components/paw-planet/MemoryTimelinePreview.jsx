"use client";

/**
 * components/paw-planet/MemoryTimelinePreview.jsx
 * 「我们一起走过的日子」首页预览（真实回忆卡片 memorial_memories，最多 4 张）。
 * 有回忆：点「查看时间线」进完整时间线；无回忆：引导去「回忆」添加。
 * props: { memories, onMore, onPost }
 */

import { ChevronRight, ImagePlus, Star } from "lucide-react";

function fmtDate(m) {
  const raw = m?.memory_date || m?.created_at;
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return String(raw);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

export default function MemoryTimelinePreview({ memories = [], onMore, onPost }) {
  const empty = memories.length === 0;
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12, padding: "0 2px" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 5, fontSize: 15.5, fontWeight: 800, color: "#fff" }}>
          我们一起走过的日子 <Star size={13} color="#FFE89A" fill="#FFE89A" />
        </div>
        {!empty && (
          <button onClick={onMore}
            style={{ display: "flex", alignItems: "center", gap: 2, background: "none", border: "none",
                     cursor: "pointer", fontSize: 12.5, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
            查看时间线 <ChevronRight size={15} />
          </button>
        )}
      </div>

      {empty ? (
        /* 空态：引导去「回忆」添加第一张卡片 */
        <button onClick={onPost}
          style={{ width: "100%", padding: "26px 18px", borderRadius: 20, cursor: "pointer", textAlign: "center",
                   background: "rgba(255,255,255,0.1)", border: "1.5px dashed rgba(255,255,255,0.4)",
                   display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                   WebkitTapHighlightColor: "transparent" }}>
          <ImagePlus size={28} color="#fff" strokeWidth={2.1} />
          <div style={{ fontSize: 13.5, fontWeight: 800, color: "#fff" }}>还没有回忆卡片</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.78)", lineHeight: 1.6 }}>去「回忆」记录你们的第一段美好吧</div>
        </button>
      ) : (
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
          {memories.map((m) => (
            <div key={m.id} onClick={onMore}
              style={{ flexShrink: 0, width: 140, background: "rgba(255,255,255,0.16)",
                       backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                       border: "1px solid rgba(255,255,255,0.18)", borderRadius: 18, cursor: "pointer",
                       overflow: "hidden", boxShadow: "0 8px 24px rgba(30,20,90,0.22)" }}>
              <div style={{ height: 80, background: "#EDE6FB", overflow: "hidden" }}>
                <img src={m.thumb_url || m.image_url} alt={m.title}
                     onError={(e) => { e.currentTarget.style.opacity = 0; }}
                     style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              <div style={{ padding: "9px 11px" }}>
                <div style={{ fontSize: 11, color: "#FFE6A8", fontWeight: 700 }}>{fmtDate(m)}</div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", marginTop: 3, lineHeight: 1.35,
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
