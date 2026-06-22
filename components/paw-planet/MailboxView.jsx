"use client";

/**
 * components/paw-planet/MailboxView.jsx
 * 「星球信箱」——真实信件列表 + 展开查看（数据来自 Supabase memorial_letters）。
 * props: { petName, letters, onBack, onOpen }
 */

import { useState } from "react";
import { Mail, ChevronRight, PenLine } from "lucide-react";
import BackButton from "@/components/icons/BackButton";
import { PLANET_C as C } from "@/lib/pawPlanetMock";

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
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F4ECE0" }}>
      <div style={{ padding: "max(env(safe-area-inset-top), 28px) 16px 8px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <BackButton onClick={onBack} />
        <div style={{ flex: 1, textAlign: "center", marginRight: 38, fontSize: 17, fontWeight: 800, color: C.text }}>星球信箱</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 20px" }}>
        <div style={{ fontSize: 12, color: C.sub, textAlign: "center", marginBottom: 12 }}>
          每一封信，{petName}都会在爪爪星球收到哦～
        </div>
        {list.length === 0 ? (
          <div style={{ textAlign: "center", color: C.sub, marginTop: 70 }}>
            <div style={{ fontSize: 38, marginBottom: 10 }}>💌</div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>还没有信件</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>给它写第一封信吧</div>
          </div>
        ) : list.map((l) => {
          const expanded = openId === l.id;
          return (
            <div key={l.id} onClick={() => setOpenId(expanded ? null : l.id)}
              style={{ background: "#fff", borderRadius: 16, padding: "13px 14px", marginBottom: 10, cursor: "pointer",
                       border: `1px solid ${C.border}`, boxShadow: "0 1px 5px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <span style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                               background: C.cream, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Mail size={18} color={C.pri} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{l.title || "写给你的信"}</div>
                  <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{fmtDate(l.created_at)}</div>
                </div>
                <ChevronRight size={17} color={C.brown} style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
              </div>
              {expanded && (
                <div style={{ fontSize: 13, color: C.text, lineHeight: 1.8, marginTop: 10, paddingTop: 10,
                              borderTop: `1px solid ${C.border}`, whiteSpace: "pre-wrap" }}>
                  {l.content}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ padding: "10px 16px 14px", flexShrink: 0 }}>
        <button onClick={() => onOpen?.("letter")}
          style={{ width: "100%", padding: "14px 0", borderRadius: 16, border: "none", cursor: "pointer",
                   background: C.pri, color: "#fff", fontSize: 15, fontWeight: 800,
                   display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                   boxShadow: "0 6px 18px rgba(230,134,69,0.32)" }}>
          <PenLine size={17} color="#fff" /> 再写一封信
        </button>
      </div>
    </div>
  );
}
