"use client";

/**
 * components/profile/VerifyBadge.jsx
 * 「已认证用户」小标识：浅橙底 + 小盾牌对勾。我的页昵称旁 / 别人主页昵称旁复用。
 * 仅在 approved 时渲染（调用方判断），不占大面积空间。
 */

const C = { pri: "#E68645", tint: "#F7E6D2", text: "#B86A2E" };

export default function VerifyBadge({ size = "sm" }) {
  const fs = size === "sm" ? 11 : 12.5;
  const ic = size === "sm" ? 12 : 14;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: size === "sm" ? "2px 8px" : "3px 10px",
                   borderRadius: 999, background: C.tint, color: C.text, fontSize: fs, fontWeight: 800,
                   border: `1px solid #F0C9A8`, whiteSpace: "nowrap", lineHeight: 1.4 }}>
      <svg width={ic} height={ic} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2.6l7 2.6v6.1c0 4.4-3 8-7 10.1-4-2.1-7-5.7-7-10.1V5.2l7-2.6Z" fill={C.pri} />
        <path d="M8.6 12.1l2.3 2.3 4.4-4.5" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      已认证用户
    </span>
  );
}
