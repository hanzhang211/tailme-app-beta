"use client";

/**
 * components/merchant/ui.jsx
 * 商家后台共享 UI（desktop-first，TailMe 暖色风：米白底 + 白卡片 + 橙主按钮 + 圆角）。
 */

import { useCallback, useState } from "react";
import { STORE_STATUS, PRODUCT_STATUS } from "@/services/merchantService";

/** 轻量 toast：const { toast, ToastHost } = useToast(); 在 JSX 末尾放 <ToastHost /> */
export function useToast() {
  const [msg, setMsg] = useState(null); // { text, tone }
  const toast = useCallback((text, tone = "info") => {
    setMsg({ text, tone });
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(() => setMsg(null), 2600);
  }, []);
  const ToastHost = () =>
    !msg ? null : (
      <div style={{ position: "fixed", top: 22, left: "50%", transform: "translateX(-50%)", zIndex: 2000,
                    background: msg.tone === "error" ? "#3A2218" : "#26201A", color: "#fff",
                    padding: "11px 20px", borderRadius: 12, fontSize: 13.5, fontWeight: 600,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.25)", maxWidth: "82vw" }}>
        {msg.tone === "error" ? "⚠️ " : msg.tone === "success" ? "✓ " : ""}{msg.text}
      </div>
    );
  return { toast, ToastHost };
}

export const MC = {
  pri:    "#E68645",
  priDark:"#D2702F",
  bg:     "#EEE9E1",
  tint:   "#F2E5DA",
  card:   "#FFFFFF",
  text:   "#2A2520",
  ink:    "#1A1006",
  sub:    "#8A8074",
  border: "#E4DDD2",
  line:   "#EFE9DF",
  err:    "#D94040",
  errBg:  "#FFF0F0",
  ok:     "#2E7D32",
  okBg:   "#E6F4E1",
  sidebar:"#1F1B16",
  sidebarSub:"#A89C8B",
};

export function Card({ children, style, pad = 20 }) {
  return (
    <div style={{ background: MC.card, borderRadius: 18, border: `1px solid ${MC.border}`,
                  boxShadow: "0 2px 14px rgba(0,0,0,0.04)", padding: pad, ...style }}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, sub, right }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: MC.ink }}>{children}</div>
        {sub && <div style={{ fontSize: 12.5, color: MC.sub, marginTop: 4 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

export function Btn({ children, onClick, variant = "primary", disabled, type = "button", style, full }) {
  const base = {
    padding: "11px 22px", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: disabled ? "default" : "pointer",
    border: "none", fontFamily: "inherit", transition: "all .15s", width: full ? "100%" : undefined,
    boxSizing: "border-box",
  };
  const variants = {
    primary: { background: disabled ? "#E5D8C8" : MC.pri, color: "#fff", boxShadow: disabled ? "none" : "0 4px 14px rgba(230,134,69,0.32)" },
    ghost:   { background: MC.card, color: MC.text, border: `1.5px solid ${MC.border}` },
    soft:    { background: MC.tint, color: MC.priDark },
    danger:  { background: MC.errBg, color: MC.err, border: `1px solid #F0CFCF` },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

export function Field({ label, required, hint, children, style }) {
  return (
    <label style={{ display: "block", marginBottom: 16, ...style }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: MC.text, marginBottom: 7 }}>
        {label} {required && <span style={{ color: MC.err }}>*</span>}
        {hint && <span style={{ fontWeight: 500, color: MC.sub, marginLeft: 8 }}>{hint}</span>}
      </div>
      {children}
    </label>
  );
}

const inputBase = {
  width: "100%", borderRadius: 12, padding: "11px 13px", fontSize: 14,
  border: `1.5px solid ${MC.border}`, background: "#fff", color: MC.text,
  outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};
export function Input(props) {
  return <input {...props} style={{ ...inputBase, ...props.style }} />;
}
export function Textarea(props) {
  return <textarea {...props} style={{ ...inputBase, resize: "vertical", minHeight: 90, lineHeight: 1.6, ...props.style }} />;
}
export function Select({ children, ...props }) {
  return <select {...props} style={{ ...inputBase, appearance: "none", cursor: "pointer", ...props.style }}>{children}</select>;
}

export function StatusBadge({ kind = "product", status }) {
  const map = kind === "store" ? STORE_STATUS : PRODUCT_STATUS;
  const s = map[status] || { label: status, color: MC.sub, bg: MC.line };
  return (
    <span style={{ display: "inline-block", fontSize: 12, fontWeight: 700, padding: "3px 11px",
                   borderRadius: 999, color: s.color, background: s.bg, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

export function StatTile({ icon, label, value, accent }) {
  return (
    <Card pad={18} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12.5, color: MC.sub }}>{label}</span>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent || MC.ink, lineHeight: 1.1 }}>{value}</div>
    </Card>
  );
}

export function Empty({ icon = "🐾", title, desc }) {
  return (
    <div style={{ textAlign: "center", padding: "56px 20px", color: MC.sub }}>
      <div style={{ fontSize: 44, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: MC.text }}>{title}</div>
      {desc && <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.7 }}>{desc}</div>}
    </div>
  );
}

export function Banner({ tone = "info", children }) {
  const tones = {
    info: { bg: MC.tint, color: MC.priDark, border: "#F0DCC6" },
    ok:   { bg: MC.okBg, color: MC.ok, border: "#CDE7C7" },
    warn: { bg: "#FFF4D6", color: "#9C5A00", border: "#F0E0AE" },
    err:  { bg: MC.errBg, color: MC.err, border: "#F0CFCF" },
  };
  const t = tones[tone] || tones.info;
  return (
    <div style={{ background: t.bg, color: t.color, border: `1px solid ${t.border}`, borderRadius: 14,
                  padding: "12px 16px", fontSize: 13, lineHeight: 1.6, fontWeight: 600 }}>
      {children}
    </div>
  );
}

/** 上传图片块（单图）：点击选图 → 调用 onUpload(file) → 显示预览 */
export function ImageUpload({ value, onPick, busy, label = "上传图片", w = 110, h = 110 }) {
  return (
    <label style={{ width: w, height: h, borderRadius: 14, border: `1.5px dashed ${MC.border}`,
                    background: MC.tint, display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", cursor: busy ? "wait" : "pointer", overflow: "hidden",
                    position: "relative", flexShrink: 0 }}>
      {value
        ? <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <div style={{ textAlign: "center", color: MC.sub }}>
            <div style={{ fontSize: 24, color: MC.pri }}>＋</div>
            <div style={{ fontSize: 11, marginTop: 2 }}>{busy ? "上传中…" : label}</div>
          </div>}
      <input type="file" accept="image/*" disabled={busy}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }}
        style={{ display: "none" }} />
    </label>
  );
}
