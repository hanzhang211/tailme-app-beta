"use client";

/**
 * PetHealthPlaceholderIcon — 宠物健康空状态占位图标（纯 inline SVG，无图片、无依赖）
 *
 * 结构：爱心外框 + 中间 paw（4 趾垫 + 1 主肉垫）+ 右上角医疗加号。
 * 表达「宠物健康 / 医疗护理 / 爪子健康」。极简线性风格，温和、清晰、不抢眼，
 * 用于「宠物健康 → 生病护理」tab 的空状态卡片占位。
 *
 *   <PetHealthPlaceholderIcon size={46} />              纯 icon（透明背景）
 *   <PetHealthPlaceholderIcon size={84} bg="#EEF6EC" /> 自带浅绿圆形背景
 *
 * - color 默认健康模块绿 #4FA85D，可由父级覆盖
 * - bg 不传则透明背景（复用调用处自己的圆形底）
 * - 支持 size / className / style
 */
export default function PetHealthPlaceholderIcon({
  size = 46,
  color = "#4FA85D",
  bg,
  className,
  style,
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {bg && <circle cx="32" cy="32" r="32" fill={bg} />}
      <g
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* 爱心外框（放大、对称、饱满、底部柔和收尖） */}
        <path d="M32 21 C29 16 23 13 18 15 C11 18 9 26 12 33 C15 39 23 47 32 53 C41 47 49 39 52 33 C55 26 53 18 46 15 C41 13 35 16 32 21 Z" />
        {/* 医疗加号（空心十字轮廓，附着在爱心右上角外侧） */}
        <path d="M47.6 8 L52.4 8 L52.4 11.1 L55.5 11.1 L55.5 15.9 L52.4 15.9 L52.4 19 L47.6 19 L47.6 15.9 L44.5 15.9 L44.5 11.1 L47.6 11.1 Z" />
        {/* paw — 上方 4 个趾垫 */}
        <ellipse cx="25"   cy="34"   rx="2.6" ry="3.4" transform="rotate(-22 25 34)" />
        <ellipse cx="29.7" cy="30.5" rx="2.6" ry="3.5" transform="rotate(-7 29.7 30.5)" />
        <ellipse cx="34.3" cy="30.5" rx="2.6" ry="3.5" transform="rotate(7 34.3 30.5)" />
        <ellipse cx="39"   cy="34"   rx="2.6" ry="3.4" transform="rotate(22 39 34)" />
        {/* paw — 下方主肉垫 */}
        <path d="M27 41 C27 37.5 37 37.5 37 41 C38 45.5 34.5 49 32 49 C29.5 49 26 45.5 27 41 Z" />
      </g>
    </svg>
  );
}
