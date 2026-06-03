"use client";

/**
 * PetTrashIcon — 垃圾桶 + 小爪印 的删除图标（手写 SVG，无图片）
 *
 * <PetTrashIcon active={hover} />
 *   - active=false → 深灰线条垃圾桶
 *   - active=true  → 红色（危险）
 * 颜色可由父级覆盖：<PetTrashIcon color="#E85D5D" />
 * 支持 size / className / style。
 *
 * 一眼是删除（垃圾桶轮廓），同时带 TailMe 宠物元素（桶身小爪印）。
 */
export default function PetTrashIcon({ size = 20, active = false, color, className, style }) {
  const c = color ?? (active ? "#E85D5D" : "#8A8178");
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      className={className}
      fill="none" stroke={c} strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round"
      style={style} aria-hidden="true">
      {/* 盖子 + 提手 */}
      <path d="M3.5 6h17" />
      <path d="M9 6V4.6C9 3.7 9.7 3 10.6 3h2.8c.9 0 1.6.7 1.6 1.6V6" />
      {/* 桶身 */}
      <path d="M5.6 6l.95 13.4c.06.9.8 1.6 1.7 1.6h7.5c.9 0 1.64-.7 1.7-1.6L18.4 6" />
      {/* 桶身小爪印 */}
      <g fill={c} stroke="none">
        <circle cx="9.9"  cy="12.6" r="0.85" />
        <circle cx="12.2" cy="12"   r="0.85" />
        <circle cx="14.3" cy="12.8" r="0.85" />
        <ellipse cx="12.1" cy="15.4" rx="2.1" ry="1.6" />
      </g>
    </svg>
  );
}
