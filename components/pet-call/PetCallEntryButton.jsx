"use client";

/**
 * components/pet-call/PetCallEntryButton.jsx
 *
 * 首页右上角【AI 宠物来电】入口：白色圆形 + 轻阴影 + 橙色电话图标，
 * 右上角橙底白心 badge（既是「电话+爱心」组合，也表示「宠物想你啦」）。
 *
 * props: { onClick, dot = true }
 */

import { PhoneCall, Heart } from "lucide-react";

const PRI = "#E68645";

export default function PetCallEntryButton({ onClick, dot = true }) {
  return (
    <button
      onClick={onClick}
      aria-label="宠物来电"
      style={{
        position: "relative", width: 44, height: 44, borderRadius: "50%",
        background: "#FFFFFF", border: "1px solid #F0E2D2",
        boxShadow: "0 3px 10px rgba(230,134,69,0.18)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", flexShrink: 0, padding: 0,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <PhoneCall size={21} color={PRI} strokeWidth={2.2} />
      {dot && (
        <span
          style={{
            position: "absolute", top: -2, right: -2,
            width: 16, height: 16, borderRadius: "50%",
            background: PRI, border: "2px solid #FFFFFF",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Heart size={7} color="#FFFFFF" fill="#FFFFFF" />
        </span>
      )}
    </button>
  );
}
