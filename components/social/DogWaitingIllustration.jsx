"use client";

/**
 * components/social/DogWaitingIllustration.jsx
 *
 * TailMe 品牌风格的「等待中的小狗」空状态插画（纯 SVG，无外部图片/字体）。
 *  - 奶油色坐姿小狗 + 微笑 + 橙色围巾(白爪印) + 浅橙小爱心 + 头顶期待小线条 + 淡阴影
 * 仅用于空状态占位；不含任何业务逻辑。
 *
 * props:
 *  - size:      宽度(px)，默认 150（高度按比例自适应）
 *  - className: 透传
 *  - style:     透传
 */
export default function DogWaitingIllustration({ size = 150, className, style }) {
  const C = {
    cream:  "#F7E7CB",  // 身体主色（奶油）
    creamD: "#F2C7A5",  // 浅橙（耳朵/暗部）
    muzzle: "#FCF3E2",  // 口鼻浅色
    pri:    "#E68645",  // 主橙（围巾/线条）
    line:   "#2A2520",  // 深色（眼鼻）
    blush:  "#F4A9A0",  // 腮红
  };
  return (
    <svg
      className={className}
      style={style}
      width={size}
      viewBox="0 0 200 185"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="等待狗友的小狗插画"
    >
      {/* 淡阴影 */}
      <ellipse cx="100" cy="172" rx="52" ry="8" fill={C.line} opacity="0.06" />

      {/* 头顶期待小线条 */}
      <g stroke={C.pri} strokeWidth="3.4" strokeLinecap="round" opacity="0.9">
        <path d="M84 18 L80 30" />
        <path d="M100 12 L100 26" />
        <path d="M116 18 L120 30" />
      </g>

      {/* 左侧小爱心 */}
      <path
        d="M34 104c-6-6-15-2-15 6 0 7 8 11 15 17 7-6 15-10 15-17 0-8-9-12-15-6z"
        fill={C.creamD}
      />

      {/* 尾巴 */}
      <path
        d="M150 132c14-2 22-12 20-24-6 4-12 6-18 9"
        fill={C.cream}
        stroke={C.creamD}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* 身体（坐姿）*/}
      <path
        d="M62 150c0-30 17-46 38-46s38 16 38 46c0 9-6 13-16 13H78c-10 0-16-4-16-13z"
        fill={C.cream}
      />
      {/* 前腿 + 爪 */}
      <ellipse cx="84" cy="159" rx="11" ry="9" fill={C.muzzle} />
      <ellipse cx="116" cy="159" rx="11" ry="9" fill={C.muzzle} />

      {/* 围巾（橙色三角 + 颈带）*/}
      <path d="M74 116 Q100 128 126 116 L100 146 Z" fill={C.pri} />
      <path d="M73 112 Q100 124 127 112 L124 119 Q100 130 76 119 Z" fill={C.pri} />
      {/* 围巾上的白爪印 */}
      <g fill="#FFFFFF" opacity="0.95">
        <ellipse cx="95" cy="124" rx="1.5" ry="2" />
        <ellipse cx="100" cy="123" rx="1.5" ry="2" />
        <ellipse cx="105" cy="124" rx="1.5" ry="2" />
        <path d="M96 128c0-2.4 2-3.8 4-3.8s4 1.4 4 3.8c0 1.7-2 2.4-4 2.4s-4-0.7-4-2.4z" />
      </g>

      {/* 耳朵（暗部，先于头画，垂在两侧）*/}
      <path d="M62 56 Q42 62 47 96 Q60 100 70 78 Z" fill={C.creamD} />
      <path d="M138 56 Q158 62 153 96 Q140 100 130 78 Z" fill={C.creamD} />

      {/* 头 */}
      <ellipse cx="100" cy="74" rx="44" ry="40" fill={C.cream} />
      {/* 口鼻区浅色 */}
      <ellipse cx="100" cy="86" rx="24" ry="19" fill={C.muzzle} />

      {/* 腮红 */}
      <ellipse cx="72" cy="86" rx="7" ry="5" fill={C.blush} opacity="0.5" />
      <ellipse cx="128" cy="86" rx="7" ry="5" fill={C.blush} opacity="0.5" />

      {/* 眼睛 */}
      <ellipse cx="85" cy="72" rx="5" ry="5.6" fill={C.line} />
      <ellipse cx="115" cy="72" rx="5" ry="5.6" fill={C.line} />
      <circle cx="86.6" cy="70" r="1.6" fill="#FFFFFF" />
      <circle cx="116.6" cy="70" r="1.6" fill="#FFFFFF" />

      {/* 鼻子 + 微笑 */}
      <ellipse cx="100" cy="83" rx="6" ry="4.6" fill={C.line} />
      <path
        d="M100 87 L100 91 M100 91 Q92 99 85 93 M100 91 Q108 99 115 93"
        stroke={C.line}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
