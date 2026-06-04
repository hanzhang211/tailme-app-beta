"use client";

import type { CSSProperties } from "react";

/**
 * components/illustrations/EmptyCommentsDogCat.tsx
 *
 * TailMe 风格「空评论」轻插画（纯 inline SVG，无外部图片/字体/emoji）：
 *  一只浅橙奶油色 Q 版小狗 + 一只浅灰白 Q 版小猫并排坐着，
 *  上方一颗黄色爱心，左右浅色爪印点缀，底部淡淡椭圆阴影。
 * 仅作帖子详情「还没有评论」占位用，无业务逻辑。
 *
 * props:
 *  - size:   宽度 px（默认 180）
 *  - width:  宽度（覆盖 size，可为数字或 CSS 字符串）
 *  - height: 高度（缺省时按 viewBox 比例自动）
 *  - className / style
 */

type Props = {
  size?: number;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
};

export default function EmptyCommentsDogCat({
  size,
  width,
  height,
  className,
  style,
}: Props) {
  const w = width ?? size ?? 180;

  // —— TailMe 暖色调色板 ——
  const dog = "#F3B765"; // 小狗主体（浅橙）
  const dogD = "#E59E45"; // 小狗耳朵/暗部
  const cream = "#FBEEDA"; // 奶油色（胸口/口鼻/前爪）
  const cat = "#D7D7DD"; // 小猫主体（浅灰）
  const catD = "#BCBCC5"; // 小猫斑纹
  const catW = "#FFFDFA"; // 小猫白色
  const pink = "#F2C7BE"; // 耳朵内/鼻子粉
  const cheek = "#F3B7A6"; // 腮红
  const nosePk = "#E89A86"; // 猫鼻
  const ink = "#3A2A1C"; // 眼睛/狗鼻
  const heart = "#F4C84B"; // 黄色爱心
  const paw = "#E2D2B8"; // 浅色爪印
  const shadow = "#E7DAC4"; // 椭圆阴影

  // 爪印（以 0,0 为中心，约 20px）
  const Paw = ({
    x,
    y,
    s = 1,
    o = 0.45,
  }: {
    x: number;
    y: number;
    s?: number;
    o?: number;
  }) => (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={paw} opacity={o}>
      <ellipse cx="0" cy="6" rx="8" ry="6.5" />
      <ellipse cx="-7" cy="-2.5" rx="3" ry="4" />
      <ellipse cx="-2.4" cy="-7" rx="3" ry="4" />
      <ellipse cx="3" cy="-7" rx="3" ry="4" />
      <ellipse cx="7.5" cy="-2.5" rx="3" ry="4" />
    </g>
  );

  return (
    <svg
      className={className}
      width={w}
      height={height}
      viewBox="0 0 240 210"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="一只小狗和一只小猫"
      style={{ height: height == null ? "auto" : undefined, ...style }}
    >
      {/* 底部淡淡椭圆阴影 */}
      <ellipse cx="120" cy="190" rx="92" ry="13" fill={shadow} opacity="0.7" />

      {/* 浅色爪印点缀 */}
      <Paw x="30" y="66" s="0.95" o={0.5} />
      <Paw x="36" y="150" s="0.55" o={0.4} />
      <Paw x="205" y="98" s="0.8" o={0.5} />
      <Paw x="200" y="158" s="0.5" o={0.38} />

      {/* 黄色爱心（两只之间上方） */}
      <path
        d="M118 47 C118 47 105 39 105 30 C105 25 109 22.5 113 24.3 C115 25.2 116.7 27 118 29 C119.3 27 121 25.2 123 24.3 C127 22.5 131 25 131 30 C131 39 118 47 118 47 Z"
        fill={heart}
      />

      {/* ───────── 小狗（左） ───────── */}
      {/* 尾巴 */}
      <path
        d="M104 150 C124 148 126 126 118 118 C122 130 114 144 100 146 Z"
        fill={dogD}
      />
      {/* 身体 */}
      <ellipse cx="74" cy="150" rx="38" ry="36" fill={dog} />
      {/* 胸口奶油色 */}
      <ellipse cx="74" cy="158" rx="20" ry="26" fill={cream} />
      {/* 前爪 */}
      <ellipse cx="60" cy="178" rx="11" ry="9" fill={cream} />
      <ellipse cx="90" cy="178" rx="11" ry="9" fill={cream} />
      {/* 耳朵（垂耳） */}
      <path d="M50 74 C30 76 26 100 34 116 C44 110 50 92 54 80 Z" fill={dogD} />
      <path d="M94 74 C114 76 118 100 110 116 C100 110 94 92 90 80 Z" fill={dogD} />
      {/* 头 */}
      <circle cx="72" cy="98" r="36" fill={dog} />
      {/* 额头白斑 */}
      <path d="M72 68 C65 84 65 100 72 112 C79 100 79 84 72 68 Z" fill={cream} />
      {/* 口鼻奶油色 */}
      <ellipse cx="72" cy="108" rx="20" ry="15" fill={cream} />
      {/* 腮红 */}
      <ellipse cx="51" cy="106" rx="6" ry="4" fill={cheek} opacity="0.7" />
      <ellipse cx="93" cy="106" rx="6" ry="4" fill={cheek} opacity="0.7" />
      {/* 眼睛 */}
      <circle cx="60" cy="95" r="4.6" fill={ink} />
      <circle cx="84" cy="95" r="4.6" fill={ink} />
      <circle cx="61.6" cy="93.4" r="1.5" fill="#fff" />
      <circle cx="85.6" cy="93.4" r="1.5" fill="#fff" />
      {/* 鼻子 */}
      <ellipse cx="72" cy="103" rx="5" ry="3.8" fill={ink} />
      {/* 嘴 + 舌头 */}
      <path
        d="M72 107 C72 113 68 116 64 115 M72 107 C72 113 76 116 80 115"
        stroke={ink}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      <ellipse cx="72" cy="115" rx="3.6" ry="4.6" fill={nosePk} />

      {/* ───────── 小猫（右） ───────── */}
      {/* 尾巴（带斑纹） */}
      <path
        d="M183 156 C202 152 198 126 187 120 C192 132 184 148 174 150 Z"
        fill={cat}
      />
      <path
        d="M191 130 C194 132 195 137 193 141 C190 139 189 134 191 130 Z"
        fill={catD}
      />
      {/* 身体 */}
      <ellipse cx="156" cy="154" rx="31" ry="32" fill={cat} />
      {/* 胸口白色 */}
      <ellipse cx="156" cy="160" rx="16" ry="22" fill={catW} />
      {/* 前爪 */}
      <ellipse cx="146" cy="178" rx="9" ry="7.5" fill={catW} />
      <ellipse cx="168" cy="178" rx="9" ry="7.5" fill={catW} />
      {/* 身上斑纹 */}
      <path d="M138 140 C141 144 141 150 138 154" stroke={catD} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M174 140 C171 144 171 150 174 154" stroke={catD} strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* 耳朵 */}
      <path d="M134 96 L131 70 L155 90 Z" fill={cat} />
      <path d="M178 96 L181 70 L157 90 Z" fill={cat} />
      <path d="M137 92 L135.5 78 L150 90 Z" fill={pink} />
      <path d="M175 92 L176.5 78 L162 90 Z" fill={pink} />
      {/* 头 */}
      <circle cx="156" cy="110" r="29" fill={cat} />
      {/* 头顶斑纹 */}
      <g stroke={catD} strokeWidth="3" strokeLinecap="round">
        <line x1="156" y1="84" x2="156" y2="96" />
        <line x1="147" y1="86" x2="145" y2="97" />
        <line x1="165" y1="86" x2="167" y2="97" />
      </g>
      {/* 口鼻白色 */}
      <ellipse cx="156" cy="118" rx="15" ry="11" fill={catW} />
      {/* 腮红 */}
      <ellipse cx="139" cy="118" rx="5" ry="3.5" fill={cheek} opacity="0.6" />
      <ellipse cx="173" cy="118" rx="5" ry="3.5" fill={cheek} opacity="0.6" />
      {/* 眼睛 */}
      <circle cx="147" cy="110" r="4.2" fill={ink} />
      <circle cx="165" cy="110" r="4.2" fill={ink} />
      <circle cx="148.4" cy="108.6" r="1.4" fill="#fff" />
      <circle cx="166.4" cy="108.6" r="1.4" fill="#fff" />
      {/* 鼻子 */}
      <path d="M152.6 116 H159.4 L156 120 Z" fill={nosePk} />
      {/* 嘴 */}
      <path
        d="M156 120 C156 123 153.5 124.5 151 123.5 M156 120 C156 123 158.5 124.5 161 123.5"
        stroke={ink}
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      {/* 胡须 */}
      <g stroke="#C9C3BA" strokeWidth="1.3" strokeLinecap="round">
        <line x1="142" y1="117" x2="126" y2="114" />
        <line x1="142" y1="120" x2="127" y2="122" />
        <line x1="170" y1="117" x2="186" y2="114" />
        <line x1="170" y1="120" x2="185" y2="122" />
      </g>
    </svg>
  );
}
