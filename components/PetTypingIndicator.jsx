"use client";

import { PawPrint } from "lucide-react";

/**
 * 宠物「正在回复」指示器 —— 极简爪印跳动动画。
 * 三个橙色爪印依次跳动/变亮，循环，无文字、无气泡、透明背景。
 * 猫狗通用，可复用。
 *
 * props:
 *   color  爪印颜色（默认 TailMe 橙）
 *   size   单个爪印尺寸（默认 18px）
 */
export default function PetTypingIndicator({ color = "#E68645", size = 18 }) {
  return (
    <div role="status" aria-label="对方正在回复"
         style={{ display:"inline-flex", alignItems:"center", gap:6, background:"transparent" }}>
      {[0, 1, 2].map((i) => (
        <PawPrint
          key={i} size={size} color={color} strokeWidth={2}
          style={{
            opacity: 0.35,
            animation: "petTypingPaw 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes petTypingPaw {
          0%, 70%, 100% { opacity: 0.35; transform: translateY(0); }
          35%           { opacity: 1;    transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
