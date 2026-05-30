"use client";

/**
 * ChatIcon — 使用 CSS mask 渲染 /public/chat-icon.svg
 * 外层 div 可加 drop-shadow；内层 div 应用 mask + backgroundColor
 */
export default function ChatIcon({ size = 22, color = "#E68645" }) {
  return (
    <div style={{ width: size, height: size, flexShrink: 0, display: "inline-block" }}>
      <div style={{
        width: "100%", height: "100%",
        backgroundColor: color,
        WebkitMaskImage:    "url('/chat-icon.svg')",
        maskImage:          "url('/chat-icon.svg')",
        WebkitMaskRepeat:   "no-repeat",
        maskRepeat:         "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition:       "center",
        WebkitMaskSize:     "contain",
        maskSize:           "contain",
      }} />
    </div>
  );
}
