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
        {/* 爱心外框（对称、饱满、底部柔和收尖） */}
        <path d="M32 23.5 C29.5 19.5 24 17.5 19.5 20 C14 23 13 30 17.5 35.5 C21 40 26.5 45 32 49.5 C37.5 45 43 40 46.5 35.5 C51 30 50 23 44.5 20 C40 17.5 34.5 19.5 32 23.5 Z" />
        {/* 医疗加号（附着在爱心右上角外侧） */}
        <path d="M49 11.5 L49 20.5" />
        <path d="M44.5 16 L53.5 16" />
        {/* paw — 上方 4 个趾垫 */}
        <ellipse cx="26.5" cy="33"   rx="2.1" ry="2.8" transform="rotate(-22 26.5 33)" />
        <ellipse cx="30.2" cy="30.3" rx="2.1" ry="2.9" transform="rotate(-7 30.2 30.3)" />
        <ellipse cx="33.8" cy="30.3" rx="2.1" ry="2.9" transform="rotate(7 33.8 30.3)" />
        <ellipse cx="37.5" cy="33"   rx="2.1" ry="2.8" transform="rotate(22 37.5 33)" />
        {/* paw — 下方主肉垫 */}
        <path d="M28.5 38 C28.5 35 35.5 35 35.5 38 C36.5 41.8 34 44 32 44 C30 44 27.5 41.8 28.5 38 Z" />
      </g>
    </svg>
  );
}
