"use client";

/**
 * components/paw-planet/MailboxView.jsx
 * 「星球信箱」——梦幻紫星空信件列表（仅视觉改造；数据来自 Supabase memorial_letters，逻辑不变）。
 * props: { petName, letters, onBack, onOpen }
 */

import { useState } from "react";
import { Mail, ChevronRight, PenLine } from "lucide-react";
import BackButton from "@/components/icons/BackButton";
import FloatingStars from "@/components/paw-planet/FloatingStars";
import { PLANET_PURPLE as P } from "@/components/paw-planet/PlanetDecor";

function fmtDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return String(ts);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function MailboxView({ petName = "毛孩子", letters = [], onBack, onOpen }) {
  const list = letters || [];
  const [openId, setOpenId] = useState(null);

  return (
    <div style={{ height: "100%", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", background: P.bg }}>
      <FloatingStars />

      <div style={{ position: "relative", zIndex: 1, padding: "max(env(safe-area-inset-top), 28px) 16px 8px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <BackButton onClick={onBack} bg={P.glassBtn} color="#fff" border={false} shadow={false} />
        <div style={{ flex: 1, textAlign: "center", marginRight: 38, fontSize: 18, fontWeight: 800, color: "#fff" }}>星球信箱</div>
      </div>

      <div style={{ position: "relative", zIndex: 1, flex: 1, overflowY: "auto", padding: "8px 16px 22px" }}>
        <div style={{ fontSize: 12, color: P.sub, textAlign: "center", marginBottom: 14 }}>
          每一封信，{petName}都会在爪爪星球收到哦～
        </div>
        {list.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: 64 }}>
            <span style={{ display: "inline-flex", width: 64, height: 64, borderRadius: "50%", alignItems: "center", justifyContent: "center",
                           background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)",
                           boxShadow: "0 0 20px rgba(200,185,255,0.5)" }}>
              <Mail size={28} color="#fff" />
            </span>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginTop: 14 }}>还没有信件</div>
            <div style={{ fontSize: 12, marginTop: 6, color: P.sub }}>给它写第一封信吧</div>
          </div>
        ) : list.map((l) => {
          const expanded = openId === l.id;
          return (
            <div key={l.id} onClick={() => setOpenId(expanded ? null : l.id)}
              style={{ background: "rgba(248,245,255,0.92)", borderRadius: 18, padding: "13px 14px", marginBottom: 11, cursor: "pointer",
                       border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 12px 36px rgba(30,20,90,0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <span style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                               background: "#EDE6FB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Mail size={18} color="#7466D8" />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#5E55A8" }}>{l.title || "写给你的信"}</div>
                  <div style={{ fontSize: 11, color: "#9991C7", marginTop: 2 }}>{fmtDate(l.created_at)}</div>
                </div>
                <ChevronRight size={17} color="#A79FCF" style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
              </div>
              {expanded && (
                <div style={{ fontSize: 13, color: "#4A4470", lineHeight: 1.8, marginTop: 10, paddingTop: 10,
                              borderTop: "1px solid #E2D7F6", whiteSpace: "pre-wrap" }}>
                  {l.content}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ position: "relative", zIndex: 1, padding: "10px 16px 14px", flexShrink: 0 }}>
        <button onClick={() => onOpen?.("letter")}
          style={{ width: "100%", padding: "15px 0", borderRadius: 18, border: "none", cursor: "pointer",
                   background: "linear-gradient(90deg,#8C7BF2,#A88CFF,#7466D8)", color: "#fff", fontSize: 15, fontWeight: 800,
                   display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                   boxShadow: "0 0 28px rgba(170,145,255,0.5)" }}>
          <PenLine size={17} color="#fff" /> 再写一封信
        </button>
      </div>
    </div>
  );
}
