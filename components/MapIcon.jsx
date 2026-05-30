"use client";

/**
 * MapIcon — 使用 CSS mask 渲染 /public/map-icon.svg
 *
 * 外层 div 应用 drop-shadow（作用于 mask 后的形状，使线条看起来更粗）
 * 内层 div 应用 mask-image + backgroundColor
 */
export default function MapIcon({ size = 22, color = "#E68645" }) {
  return (
    <div style={{
      width: size, height: size,
      flexShrink: 0, display: "inline-block",
      filter: `drop-shadow(0 0 2px ${color}) drop-shadow(0 0 1px ${color})`,
    }}>
      <div style={{
        width: "100%", height: "100%",
        backgroundColor: color,
        WebkitMaskImage:    "url('/map-icon.svg')",
        maskImage:          "url('/map-icon.svg')",
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
