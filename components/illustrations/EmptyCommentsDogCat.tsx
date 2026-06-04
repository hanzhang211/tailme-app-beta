"use client";

/**
 * components/illustrations/EmptyCommentsDogCat.tsx
 *
 * TailMe 风格「空评论」轻插画（纯 inline SVG，无外部图片/字体/emoji）：
 *  左边一只浅橙奶油色 Q 版小狗、右边一只灰白色 Q 版小猫，
 *  都是「大头 + 圆身体 + 短腿」的正常宠物坐姿（无人形、无手臂、无长腿），
 *  上方一颗小爱心，左右浅色爪印，底部淡椭圆阴影。
 *  仅作帖子详情「还没有评论」占位用，无业务逻辑。
 *
 * 用法：<EmptyCommentsDogCat className="w-44 h-auto mx-auto" />
 */

type Props = {
  className?: string;
};

// —— TailMe 暖色调色板 ——
const DOG = "#F6C27A"; // 小狗主体（橙黄）
const DOG_EAR = "#E69A45"; // 小狗耳朵/尾巴（深一点的橙）
const DOG_FACE = "#FFF4E5"; // 小狗口鼻白色区
const CAT = "#F4EFE6"; // 小猫主体（米白）
const CAT_LINE = "#B8ADA0"; // 小猫条纹/暗部
const CHEEK = "#F6B8A8"; // 腮红
const INK = "#2A2520"; // 眼睛/狗鼻
const PINK = "#EFA890"; // 猫鼻/耳内粉
const HEART = "#F4C84B"; // 黄色爱心
const PAW = "#F2C7A5"; // 浅橙爪印
const SHADOW = "#EADFCB"; // 椭圆阴影

// 浅色爪印（以 0,0 为中心，约 18px）
function Paw({ x, y, s = 1, o = 0.5 }: { x: number; y: number; s?: number; o?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={PAW} opacity={o}>
      <ellipse cx="0" cy="5" rx="7" ry="6" />
      <ellipse cx="-6" cy="-2.5" rx="2.6" ry="3.4" />
      <ellipse cx="-2" cy="-6" rx="2.6" ry="3.4" />
      <ellipse cx="2.6" cy="-6" rx="2.6" ry="3.4" />
      <ellipse cx="6.5" cy="-2.5" rx="2.6" ry="3.4" />
    </g>
  );
}

export default function EmptyCommentsDogCat({ className }: Props) {
  return (
    <svg
      className={className}
      width="180"
      viewBox="0 0 240 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="一只小狗和一只小猫坐在一起"
      style={{ height: "auto" }}
    >
      {/* 底部淡椭圆阴影 */}
      <ellipse cx="120" cy="149" rx="88" ry="10" fill={SHADOW} opacity="0.7" />

      {/* 浅色爪印装饰 */}
      <Paw x="26" y="48" s={0.95} o={0.55} />
      <Paw x="30" y="120" s={0.55} o={0.4} />
      <Paw x="212" y="64" s={0.85} o={0.55} />
      <Paw x="208" y="124" s={0.5} o={0.4} />

      {/* 黄色小爱心（两只之间上方） */}
      <path
        d="M117 35 C117 35 105 28 105 20.5 C105 16 109 14 112.5 15.7 C114.3 16.6 115.8 18.2 117 20 C118.2 18.2 119.7 16.6 121.5 15.7 C125 14 129 16 129 20.5 C129 28 117 35 117 35 Z"
        fill={HEART}
      />

      {/* ───────── 小狗（左，坐姿） ───────── */}
      {/* 尾巴（左侧小弯尾，画在身体后） */}
      <path d="M52 126 C36 124 36 105 46 100 C42 109 47 119 58 121 Z" fill={DOG_EAR} />
      {/* 圆身体 */}
      <ellipse cx="82" cy="118" rx="34" ry="26" fill={DOG} />
      {/* 两只短前爪 */}
      <ellipse cx="70" cy="139" rx="9" ry="6" fill={DOG_FACE} />
      <ellipse cx="94" cy="139" rx="9" ry="6" fill={DOG_FACE} />
      {/* 下垂耳朵（画在头之前，让头盖住耳根） */}
      <path d="M60 52 C46 54 44 78 53 90 C59 84 62 66 64 56 Z" fill={DOG_EAR} />
      <path d="M104 52 C118 54 120 78 111 90 C105 84 102 66 100 56 Z" fill={DOG_EAR} />
      {/* 大头 */}
      <circle cx="82" cy="70" r="30" fill={DOG} />
      {/* 口鼻白色区 */}
      <ellipse cx="82" cy="82" rx="16" ry="12.5" fill={DOG_FACE} />
      {/* 腮红 */}
      <ellipse cx="62" cy="80" rx="6" ry="4" fill={CHEEK} opacity="0.7" />
      <ellipse cx="102" cy="80" rx="6" ry="4" fill={CHEEK} opacity="0.7" />
      {/* 眼睛 */}
      <circle cx="71" cy="69" r="4.2" fill={INK} />
      <circle cx="93" cy="69" r="4.2" fill={INK} />
      <circle cx="72.4" cy="67.6" r="1.4" fill="#fff" />
      <circle cx="94.4" cy="67.6" r="1.4" fill="#fff" />
      {/* 鼻子 */}
      <ellipse cx="82" cy="79" rx="4.2" ry="3.2" fill={INK} />
      {/* 微笑嘴 */}
      <path
        d="M82 82 C82 88 78 90 74 89 M82 82 C82 88 86 90 90 89"
        stroke={INK}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />

      {/* ───────── 小猫（右，坐姿） ───────── */}
      {/* 尾巴（右侧弯起，带条纹） */}
      <path d="M178 128 C198 126 198 102 186 98 C193 105 188 119 176 121 Z" fill={CAT} />
      <path d="M191 108 C194 110 194 116 191 119" stroke={CAT_LINE} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      {/* 圆身体 */}
      <ellipse cx="152" cy="120" rx="30" ry="24" fill={CAT} />
      {/* 身上条纹 */}
      <path d="M138 113 C141 116 141 122 138 125" stroke={CAT_LINE} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M166 113 C169 116 169 122 166 125" stroke={CAT_LINE} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      {/* 两只短前爪 */}
      <ellipse cx="142" cy="139" rx="8" ry="5.5" fill="#FFFDFA" />
      <ellipse cx="162" cy="139" rx="8" ry="5.5" fill="#FFFDFA" />
      {/* 三角猫耳（先画，头盖住耳根） */}
      <path d="M135 60 L129 41 L151 57 Z" fill={CAT} />
      <path d="M169 60 L175 41 L153 57 Z" fill={CAT} />
      <path d="M137 57 L133 46 L147 56 Z" fill={PINK} />
      <path d="M167 57 L171 46 L157 56 Z" fill={PINK} />
      {/* 大头 */}
      <circle cx="152" cy="76" r="27" fill={CAT} />
      {/* 额头浅灰短纹 */}
      <g stroke={CAT_LINE} strokeWidth="2.4" strokeLinecap="round">
        <line x1="152" y1="56" x2="152" y2="66" />
        <line x1="145" y1="58" x2="143" y2="67" />
        <line x1="159" y1="58" x2="161" y2="67" />
      </g>
      {/* 腮红 */}
      <ellipse cx="136" cy="84" rx="5.5" ry="3.8" fill={CHEEK} opacity="0.6" />
      <ellipse cx="168" cy="84" rx="5.5" ry="3.8" fill={CHEEK} opacity="0.6" />
      {/* 眼睛 */}
      <circle cx="143" cy="78" r="3.9" fill={INK} />
      <circle cx="161" cy="78" r="3.9" fill={INK} />
      <circle cx="144.3" cy="76.7" r="1.3" fill="#fff" />
      <circle cx="162.3" cy="76.7" r="1.3" fill="#fff" />
      {/* 鼻子 */}
      <path d="M148.6 85 H155.4 L152 88.5 Z" fill={PINK} />
      {/* W 型嘴 */}
      <path
        d="M152 88.5 C152 91 150 92 148.2 91 M152 88.5 C152 91 154 92 155.8 91"
        stroke={INK}
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      {/* 胡须（每边 3 根） */}
      <g stroke="#C9C3BA" strokeWidth="1.2" strokeLinecap="round">
        <line x1="140" y1="84" x2="125" y2="81" />
        <line x1="140" y1="87" x2="124" y2="88" />
        <line x1="140" y1="90" x2="126" y2="94" />
        <line x1="164" y1="84" x2="179" y2="81" />
        <line x1="164" y1="87" x2="180" y2="88" />
        <line x1="164" y1="90" x2="178" y2="94" />
      </g>
    </svg>
  );
}
