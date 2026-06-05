"use client";

/**
 * components/shop/CategoryIcon.jsx
 *
 * 宠物商城分类宫格用的统一简洁 SVG 图标（扁平、圆润、柔和宠物风，无 emoji）。
 * 用法：<CategoryIcon name="dogfood" size={32} />
 */

export default function CategoryIcon({ name, size = 32 }) {
  // viewBox 收紧到艺术内容区（裁掉四周留白），让图标在底块里更撑满
  const p = { width: size, height: size, viewBox: "5 5 30 30", fill: "none",
              xmlns: "http://www.w3.org/2000/svg", "aria-hidden": true };
  switch (name) {
    case "dogfood": // 狗粮袋 + 爪
      return (
        <svg {...p}>
          <path d="M13 14 L20 10 L27 14 V31 a2.4 2.4 0 0 1-2.4 2.4 H15.4 A2.4 2.4 0 0 1 13 31 Z" fill="#E3C69C"/>
          <path d="M13 14 L20 10 L27 14 L20 17.2 Z" fill="#D2AE7C"/>
          <g fill="#B68A52">
            <ellipse cx="20" cy="26.4" rx="3.1" ry="2.5"/>
            <circle cx="16.7" cy="23" r="1.1"/><circle cx="18.9" cy="21.7" r="1.1"/>
            <circle cx="21.1" cy="21.7" r="1.1"/><circle cx="23.3" cy="23" r="1.1"/>
          </g>
        </svg>
      );
    case "catfood": // 橘猫脸
      return (
        <svg {...p}>
          <path d="M12.5 17 L13.4 8.5 L21 14 Z" fill="#EBA967"/>
          <path d="M27.5 17 L26.6 8.5 L19 14 Z" fill="#EBA967"/>
          <circle cx="20" cy="22.5" r="9.6" fill="#EEB374"/>
          <path d="M20 13.5 v4" stroke="#DA934C" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="16.6" cy="21.6" r="1.4" fill="#5B4636"/>
          <circle cx="23.4" cy="21.6" r="1.4" fill="#5B4636"/>
          <path d="M20 23 v1.6" stroke="#5B4636" strokeWidth="1.1" strokeLinecap="round"/>
          <path d="M18.4 25.4 q1.6 1.4 3.2 0" stroke="#5B4636" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
        </svg>
      );
    case "snack": // 鸡腿
      return (
        <svg {...p}>
          <circle cx="17" cy="20.5" r="8.4" fill="#E7A35C"/>
          <path d="M16 18 q2 -3 5 -2" stroke="#F2C390" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
          <rect x="21.5" y="24" width="9.5" height="4.4" rx="2.2" fill="#F3E6D0" transform="rotate(42 21.5 24)"/>
          <circle cx="29.2" cy="29.8" r="2.5" fill="#F3E6D0"/>
          <circle cx="31.7" cy="27.2" r="2.5" fill="#F3E6D0"/>
        </svg>
      );
    case "feeder": // 喂食器
      return (
        <svg {...p}>
          <path d="M15 9 h10 a2 2 0 0 1 2 2 v8.5 a3 3 0 0 1-3 3 h-8 a3 3 0 0 1-3-3 V11 a2 2 0 0 1 2-2 Z" fill="#CFCFD5"/>
          <circle cx="20" cy="14.5" r="2" fill="#B6B6BD"/>
          <ellipse cx="20" cy="28.5" rx="10" ry="3.4" fill="#DBDBE0"/>
          <path d="M10 28.5 a10 3.4 0 0 0 20 0 v1.2 a10 3.8 0 0 1-20 0 Z" fill="#C6C6CD"/>
        </svg>
      );
    case "deworm": // 药罐 + 十字
      return (
        <svg {...p}>
          <rect x="13" y="11.5" width="14" height="4.4" rx="1.8" fill="#A7D1D7"/>
          <rect x="12.3" y="15.5" width="15.4" height="16.2" rx="3.2" fill="#C4E2E6"/>
          <g fill="#fff">
            <rect x="19" y="20" width="2" height="8.4" rx="1"/>
            <rect x="15.8" y="23.2" width="8.4" height="2" rx="1"/>
          </g>
        </svg>
      );
    case "leash": // 牵引绳环 + 扣
      return (
        <svg {...p}>
          <circle cx="18.5" cy="23" r="7.4" stroke="#E8C25A" strokeWidth="3.4" fill="none"/>
          <rect x="23.5" y="9.5" width="4.6" height="8" rx="2.3" fill="#E8C25A" transform="rotate(34 23.5 9.5)"/>
        </svg>
      );
    case "toy": // 骨头玩具
      return (
        <svg {...p}>
          <g fill="#E8975A" transform="rotate(-22 20 20)">
            <circle cx="12.5" cy="16.6" r="3.1"/><circle cx="12.5" cy="23.4" r="3.1"/>
            <circle cx="27.5" cy="16.6" r="3.1"/><circle cx="27.5" cy="23.4" r="3.1"/>
            <rect x="12.5" y="16.8" width="15" height="6.4" rx="3.2"/>
          </g>
        </svg>
      );
    case "clean": // 清洁喷雾瓶
      return (
        <svg {...p}>
          <rect x="15.5" y="16" width="11" height="15.5" rx="3.2" fill="#A9CEE6"/>
          <rect x="18" y="20.5" width="6" height="6.5" rx="1.2" fill="#fff" opacity="0.75"/>
          <rect x="18.3" y="10.5" width="3.6" height="3.4" fill="#8FB9D8"/>
          <path d="M18 16 v-2.6 h4.6 l3.4 -2.2 v3 l-3.4 1.8 Z" fill="#8FB9D8"/>
        </svg>
      );
    case "health": // 保健品瓶 + 叶
      return (
        <svg {...p}>
          <rect x="14.6" y="12.5" width="10.8" height="4.2" rx="1.6" fill="#7CAC62"/>
          <rect x="13.2" y="16.2" width="13.6" height="15.4" rx="3.2" fill="#8FBE75"/>
          <rect x="16.4" y="20" width="7.2" height="8" rx="1.5" fill="#fff" opacity="0.82"/>
          <path d="M20 21.4 q2.2 1.2 0 4.6 q-2.2 -1.2 0 -4.6 Z" fill="#8FBE75"/>
        </svg>
      );
    case "litter": // 猫砂罐 + 爪
      return (
        <svg {...p}>
          <rect x="13" y="11.5" width="14" height="3.8" rx="1.9" fill="#CDA877"/>
          <path d="M13.6 15.3 h12.8 l0.9 13 a2.2 2.2 0 0 1-2.2 2.4 H14.9 a2.2 2.2 0 0 1-2.2-2.4 Z" fill="#DDBE92"/>
          <g fill="#C49E68">
            <ellipse cx="20" cy="24.6" rx="2.7" ry="2.1"/>
            <circle cx="17.4" cy="21.8" r="0.95"/><circle cx="19.4" cy="20.9" r="0.95"/>
            <circle cx="20.9" cy="20.9" r="0.95"/><circle cx="22.6" cy="21.8" r="0.95"/>
          </g>
        </svg>
      );
    default:
      return <svg {...p}><circle cx="20" cy="20" r="9" fill="#E3C69C"/></svg>;
  }
}
