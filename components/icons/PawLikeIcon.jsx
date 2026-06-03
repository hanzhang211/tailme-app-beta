"use client";

/**
 * PawLikeIcon — 爪印点赞图标（手写 SVG，无图片）
 *
 * <PawLikeIcon filled={isLiked} />
 *   - filled=false → 深灰线条爪印（outline）
 *   - filled=true  → 红色实心爪印
 * 颜色可由父级覆盖：<PawLikeIcon color="#E85D5D" />
 * 支持 size / className / style。
 *
 * 4 个趾豆 + 1 个掌垫，线条圆润。
 */
export default function PawLikeIcon({ size = 20, filled = false, color, className, style }) {
  const c = color ?? (filled ? "#E85D5D" : "#8A8178");
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      className={className}
      fill={filled ? c : "none"}
      stroke={c}
      strokeWidth={filled ? 0 : 1.8}
      strokeLinecap="round" strokeLinejoin="round"
      style={style} aria-hidden="true">
      {/* 4 个趾豆 */}
      <ellipse cx="6"  cy="10"  rx="1.7" ry="2.3" />
      <ellipse cx="10" cy="6.5" rx="1.8" ry="2.5" />
      <ellipse cx="14" cy="6.5" rx="1.8" ry="2.5" />
      <ellipse cx="18" cy="10"  rx="1.7" ry="2.3" />
      {/* 掌垫 */}
      <path d="M12 12.4c-2.9 0-5.1 2.1-5.1 4.5 0 1.9 1.5 2.9 3.1 2.9 1 0 1.4-.4 2-.4s1 .4 2 .4c1.6 0 3.1-1 3.1-2.9 0-2.4-2.2-4.5-5.1-4.5Z" />
    </svg>
  );
}
