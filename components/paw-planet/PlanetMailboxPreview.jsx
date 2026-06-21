"use client";

/**
 * components/paw-planet/PlanetMailboxPreview.jsx
 * 首页底部「星球信箱」入口卡。点击进信箱页。
 * props: { unread, petName, onClick }
 */

import { Mail, ChevronRight } from "lucide-react";
import { PLANET_C as C } from "@/lib/pawPlanetMock";

export default function PlanetMailboxPreview({ unread = 0, petName = "毛孩子", onClick }) {
  return (
    <button onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 13, width: "100%", marginTop: 16,
               background: C.cream, borderRadius: 18, padding: "14px 16px", cursor: "pointer",
               border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 6px 18px rgba(40,40,90,0.18)",
               textAlign: "left", WebkitTapHighlightColor: "transparent" }}>
      <span style={{ position: "relative", width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                     background: "linear-gradient(135deg,#FBD9A8,#F4B775)",
                     display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Mail size={21} color="#fff" />
        {unread > 0 && (
          <span style={{ position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9,
                         background: "#E5573E", color: "#fff", fontSize: 10.5, fontWeight: 800, padding: "0 5px",
                         display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>
            {unread}
          </span>
        )}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 15, fontWeight: 800, color: C.text }}>
          星球信箱{unread > 0 ? ` · ${unread} 封未读` : ""}
        </span>
        <span style={{ display: "block", fontSize: 11.5, color: C.sub, marginTop: 3 }}>
          每一封信，{petName}都会收到哦～
        </span>
      </span>
      <ChevronRight size={18} color={C.brown} />
    </button>
  );
}
