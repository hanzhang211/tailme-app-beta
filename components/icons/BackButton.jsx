"use client";

/**
 * components/icons/BackButton.jsx
 *
 * 全局统一的「返回」按钮：更大的点击区 + 加粗的箭头图标（替代又细又小的「‹」字符）。
 * 默认白色圆形 + 浅描边 + 轻阴影，在各种背景上都清晰可见。
 *
 * props:
 *  - onClick
 *  - size       圆形直径（默认 38）
 *  - iconSize   箭头大小（默认 size*0.6）
 *  - color      箭头颜色（默认深色 #2A2520）
 *  - bg         背景（默认白）
 *  - border / shadow  是否描边 / 阴影（默认 true）
 *  - disabled
 *  - style      额外样式（如 position:absolute 定位）
 *  - ariaLabel
 */

import { ChevronLeft } from "lucide-react";

export default function BackButton({
  onClick,
  size = 38,
  iconSize,
  color = "#2A2520",
  bg = "#FFFFFF",
  border = true,
  shadow = true,
  disabled = false,
  style,
  ariaLabel = "返回",
}) {
  const is = iconSize || Math.round(size * 0.6);
  return (
    <button onClick={onClick} disabled={disabled} aria-label={ariaLabel} className="tm-back-btn"
      style={{ width:size, height:size, borderRadius:"50%", flexShrink:0, padding:0,
               display:"flex", alignItems:"center", justifyContent:"center",
               background:bg, border: border ? "1px solid #E6DCCD" : "none",
               boxShadow: shadow ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
               cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1,
               WebkitTapHighlightColor:"transparent", transition:"transform .12s ease",
               ...style }}>
      <ChevronLeft size={is} color={color} strokeWidth={2.6} style={{ marginLeft:-1 }} />
    </button>
  );
}
