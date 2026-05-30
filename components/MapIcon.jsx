"use client";

/**
 * MapIcon — 使用 CSS mask 渲染 /public/icons/map-icon.png
 *
 * PNG 形状作为 mask，backgroundColor 控制显示颜色。
 * 要求 PNG 必须是透明背景（只保留图标线条），mask 才能正确生效。
 */
export default function MapIcon({ size = 22, color = "#E68645" }) {
  return (
    <div
      style={{
        width:  size,
        height: size,
        backgroundColor: color,
        WebkitMaskImage:    "url('/map-icon.svg')",
        maskImage:          "url('/map-icon.svg')",
        WebkitMaskRepeat:   "no-repeat",
        maskRepeat:         "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition:       "center",
        WebkitMaskSize:     "contain",
        maskSize:           "contain",
        flexShrink: 0,
        display:   "inline-block",
        filter:    `drop-shadow(0 0 1.5px ${color})`,
      }}
    />
  );
}
