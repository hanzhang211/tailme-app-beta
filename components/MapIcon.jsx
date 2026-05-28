"use client";

/**
 * MapIcon — 宠物地图 SVG 图标
 * 折叠地图 + 爪印定位针 + 虚线路径 + 小爪印
 * 天然透明背景，color prop 控制颜色
 */
export default function MapIcon({ size = 22, color = "#E68645" }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 100 100"
      fill="none" stroke={color}
      strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
      style={{ display:"inline-block", verticalAlign:"middle", flexShrink:0 }}
    >
      {/* 折叠地图轮廓（底部 W 形折痕） */}
      <path d="M 8,52 L 8,85 L 30,75 L 50,84 L 70,75 L 92,85 L 92,52 Z" />

      {/* 定位针（泪珠形），覆盖在地图顶部 */}
      <path d="M 50,54 Q 29,46 29,27 A 21,21 0 0,1 71,27 Q 71,46 50,54 Z" />

      {/* 针内爪印 — 4 个趾垫 */}
      <ellipse cx="40"   cy="26" rx="4"   ry="5"   />
      <ellipse cx="46.5" cy="20" rx="4"   ry="5.5" />
      <ellipse cx="53.5" cy="20" rx="4"   ry="5.5" />
      <ellipse cx="60"   cy="26" rx="4"   ry="5"   />
      {/* 针内爪印 — 主肉垫 */}
      <path d="M 41,35 Q 38,41 42,46 Q 50,47 58,46 Q 62,41 59,35 Q 56,32 50,32 Q 44,32 41,35 Z" />

      {/* 地图上的虚线路径 */}
      <path d="M 16,65 Q 34,70 52,69 Q 66,68 74,64" strokeDasharray="8,6" />

      {/* 地图右侧小爪印 — 4 个趾垫 */}
      <ellipse cx="75"   cy="71" rx="2.8" ry="3.3" />
      <ellipse cx="80.5" cy="68" rx="2.8" ry="3.3" />
      <ellipse cx="86"   cy="68" rx="2.8" ry="3.3" />
      <ellipse cx="91.5" cy="71" rx="2.8" ry="3.3" />
      {/* 小爪印 — 主肉垫 */}
      <path d="M 75.5,77 Q 73,82 77,85 Q 83,88 89,85 Q 92,82 89.5,77 Q 87,73 83,73 Q 79,73 75.5,77 Z" />
    </svg>
  );
}
