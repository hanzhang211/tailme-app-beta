"use client";

/**
 * components/illustrations/EmptyCommentsDogCat.tsx
 *
 * TailMe 风格「空评论」轻插画（纯 inline SVG，无外部图片/字体/emoji）。
 * 对照 public/no-comments-nest.png 手工复刻：
 *  一只奶油色小狗 + 一只橘色小猫一起窝在温暖的拱形宠物窝里，
 *  只露出头和搭在窝边的小前爪；窝底软垫中间一个橙色爪印；
 *  顶部一颗橙色爱心，四周散落浅橙星星 / 爪印 / 圆点；底部淡椭圆阴影。
 * 仅作帖子详情「还没有评论」占位用，无业务逻辑。
 *
 * 用法：<EmptyCommentsDogCat className="w-48 h-auto mx-auto" />
 */

type Props = {
  className?: string;
};

// —— TailMe 暖色调色板 ——
const RIM = "#F4D9B0";       // 窝外圈毛绒奶油边
const RIM_HI = "#FFF6E8";    // 窝边高光
const CUSHION = "#F4C079";   // 窝底软垫
const CUSHION_HI = "#FAD79B";// 软垫高光
const DOG = "#FBEBCE";       // 小狗主体（奶油白）
const DOG_FACE = "#FFF8EC";  // 小狗口鼻白
const DOG_EAR = "#E9B97A";   // 小狗垂耳（浅棕橙）
const DOG_PATCH = "#EFD2A0"; // 小狗头顶浅色块
const CAT = "#F4B86A";       // 小猫主体（橘）
const CAT_STRIPE = "#E69A45";// 小猫条纹（深橘）
const CAT_FACE = "#FFF6EA";  // 小猫口鼻白
const PINK = "#F6B8A8";      // 耳内/腮红粉
const NOSE = "#E68645";      // 猫鼻橙
const INK = "#3A2A20";       // 眼睛/狗鼻（柔深棕，不用纯黑）
const HEART = "#F2A56F";     // 橙色爱心
const ACC = "#E9A24E";       // 星星橙
const SOFT = "#F2C7A5";      // 浅橙爪印/圆点
const SHADOW = "#D6D5D8";    // 底部阴影

// 浅色爪印（中心 0,0，约 18px）
function Paw({ x, y, s = 1, fill = SOFT, o = 0.6 }: { x: number; y: number; s?: number; fill?: string; o?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill} opacity={o}>
      <ellipse cx="0" cy="5" rx="7" ry="6" />
      <ellipse cx="-6" cy="-2.5" rx="2.6" ry="3.4" />
      <ellipse cx="-2" cy="-6" rx="2.6" ry="3.4" />
      <ellipse cx="2.6" cy="-6" rx="2.6" ry="3.4" />
      <ellipse cx="6.5" cy="-2.5" rx="2.6" ry="3.4" />
    </g>
  );
}

// 四角小星星（中心 0,0）
function Star({ x, y, s = 1, fill = ACC, o = 0.85 }: { x: number; y: number; s?: number; fill?: string; o?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -8 C1 -1.2 1.2 -1 8 0 C1.2 1 1 1.2 0 8 C-1 1.2 -1.2 1 -8 0 C-1.2 -1 -1 -1.2 0 -8 Z"
      fill={fill}
      opacity={o}
    />
  );
}

export default function EmptyCommentsDogCat({ className }: Props) {
  return (
    <svg
      viewBox="0 0 320 240"
      className={className}
      width="200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="一只小狗和一只小猫窝在宠物窝里"
      style={{ height: "auto" }}
    >
      <defs>
        <linearGradient id="nestInner" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B5722F" />
          <stop offset="0.55" stopColor="#C8853E" />
          <stop offset="1" stopColor="#D89A52" />
        </linearGradient>
      </defs>

      {/* 底部淡椭圆阴影 */}
      <ellipse cx="160" cy="210" rx="118" ry="14" fill={SHADOW} opacity="0.25" />

      {/* 窝外圈（毛绒奶油边） */}
      <path
        d="M48 186 C44 116 96 68 160 68 C224 68 276 116 272 186 C272 204 232 214 160 214 C88 214 48 204 48 186 Z"
        fill={RIM}
      />
      {/* 左上柔和高光 */}
      <path d="M70 96 C92 76 124 70 150 72 C120 74 96 88 78 110 C72 106 70 100 70 96 Z" fill={RIM_HI} opacity="0.7" />

      {/* 窝内（温暖棕橙，拱形开口） */}
      <path
        d="M80 184 C78 130 112 96 160 96 C208 96 242 130 240 184 C240 192 208 198 160 198 C112 198 80 192 80 184 Z"
        fill="url(#nestInner)"
      />

      {/* ───────── 小猫（右，窝在里面） ───────── */}
      {/* 身体（连接头与前爪，藏在窝里） */}
      <ellipse cx="196" cy="154" rx="24" ry="20" fill={CAT} />
      {/* 三角耳 */}
      <path d="M175 104 L171 83 L196 100 Z" fill={CAT} />
      <path d="M217 104 L221 83 L196 100 Z" fill={CAT} />
      <path d="M178 100 L176 89 L192 100 Z" fill={PINK} />
      <path d="M214 100 L216 89 L200 100 Z" fill={PINK} />
      {/* 头 */}
      <circle cx="196" cy="126" r="29" fill={CAT} />
      {/* 额头浅橘条纹 */}
      <g stroke={CAT_STRIPE} strokeWidth="3" strokeLinecap="round">
        <line x1="196" y1="103" x2="196" y2="114" />
        <line x1="187" y1="105" x2="185" y2="115" />
        <line x1="205" y1="105" x2="207" y2="115" />
      </g>
      {/* 口鼻白 */}
      <ellipse cx="196" cy="134" rx="15" ry="11" fill={CAT_FACE} />
      {/* 腮红 */}
      <ellipse cx="181" cy="132" rx="5.5" ry="3.8" fill={PINK} opacity="0.55" />
      <ellipse cx="211" cy="132" rx="5.5" ry="3.8" fill={PINK} opacity="0.55" />
      {/* 眼睛 */}
      <circle cx="187" cy="124" r="4" fill={INK} />
      <circle cx="205" cy="124" r="4" fill={INK} />
      <circle cx="188.3" cy="122.6" r="1.3" fill="#fff" />
      <circle cx="206.3" cy="122.6" r="1.3" fill="#fff" />
      {/* 鼻子 */}
      <path d="M192.5 130 H199.5 L196 133.5 Z" fill={NOSE} />
      {/* W 嘴 */}
      <path
        d="M196 133.5 C196 136 194 137 192.2 136 M196 133.5 C196 136 198 137 199.8 136"
        stroke={INK}
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      {/* 胡须 */}
      <g stroke="#D9B98E" strokeWidth="1.2" strokeLinecap="round">
        <line x1="184" y1="133" x2="170" y2="130" />
        <line x1="184" y1="136" x2="169" y2="137" />
        <line x1="208" y1="133" x2="222" y2="130" />
        <line x1="208" y1="136" x2="223" y2="137" />
      </g>

      {/* ───────── 小狗（左，窝在里面，略叠在猫前面） ───────── */}
      {/* 身体 */}
      <ellipse cx="120" cy="152" rx="26" ry="20" fill={DOG} />
      {/* 垂耳 */}
      <path d="M96 100 C79 102 75 132 88 144 C97 135 101 113 103 102 Z" fill={DOG_EAR} />
      <path d="M144 100 C161 102 165 132 152 144 C143 135 139 113 137 102 Z" fill={DOG_EAR} />
      {/* 头 */}
      <circle cx="120" cy="120" r="33" fill={DOG} />
      {/* 头顶浅色块 */}
      <path d="M104 98 C112 90 128 90 136 98 C128 96 112 96 104 102 Z" fill={DOG_PATCH} opacity="0.8" />
      {/* 口鼻白 */}
      <ellipse cx="120" cy="129" rx="16" ry="13" fill={DOG_FACE} />
      {/* 腮红 */}
      <ellipse cx="103" cy="128" rx="6" ry="4" fill={PINK} opacity="0.6" />
      <ellipse cx="137" cy="128" rx="6" ry="4" fill={PINK} opacity="0.6" />
      {/* 眼睛 */}
      <circle cx="109" cy="117" r="4.5" fill={INK} />
      <circle cx="131" cy="117" r="4.5" fill={INK} />
      <circle cx="110.5" cy="115.4" r="1.5" fill="#fff" />
      <circle cx="132.5" cy="115.4" r="1.5" fill="#fff" />
      {/* 鼻子 */}
      <ellipse cx="120" cy="125" rx="4.5" ry="3.4" fill={INK} />
      {/* 微笑嘴 + 小舌头 */}
      <path
        d="M120 128 C120 134 116 136 112 135 M120 128 C120 134 124 136 128 135"
        stroke={INK}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      <ellipse cx="120" cy="134" rx="3.4" ry="4.2" fill="#F19A86" />

      {/* ───────── 窝底软垫（盖住身体下半，前爪搭在上面） ───────── */}
      <path
        d="M64 182 C64 166 104 158 160 158 C216 158 256 166 256 182 C256 202 216 212 160 212 C104 212 64 202 64 182 Z"
        fill={CUSHION}
      />
      <path d="M100 166 C124 160 196 160 220 166 C196 164 124 164 100 166 Z" fill={CUSHION_HI} opacity="0.8" />
      {/* 软垫中间橙色爪印 */}
      <Paw x="160" y="188" s={1.15} fill="#DC8A3C" o={0.85} />

      {/* 前爪搭在窝边 */}
      <ellipse cx="146" cy="172" rx="9.5" ry="7" fill={DOG_FACE} />
      <ellipse cx="170" cy="172" rx="9" ry="6.5" fill={CAT_FACE} />

      {/* 顶部橙色爱心 + 两侧小短线 */}
      <path
        d="M160 56 C160 56 146 47 146 38 C146 32.5 150.5 30 154.5 32.2 C156.5 33.3 158.4 35.2 160 37.4 C161.6 35.2 163.5 33.3 165.5 32.2 C169.5 30 174 32.5 174 38 C174 47 160 56 160 56 Z"
        fill={HEART}
      />
      <g stroke={HEART} strokeWidth="2.4" strokeLinecap="round" opacity="0.8">
        <line x1="132" y1="40" x2="138" y2="40" />
        <line x1="182" y1="40" x2="188" y2="40" />
      </g>

      {/* 星星 / 爪印 / 圆点 装饰 */}
      <Star x="58" y="70" s={1} />
      <Star x="270" y="120" s={0.85} />
      <Star x="64" y="178" s={0.7} fill={SOFT} o={0.8} />
      <Paw x="40" y="120" s={0.7} />
      <Paw x="284" y="170" s={0.65} />
      <circle cx="286" cy="92" r="3" fill={SOFT} opacity="0.6" />
      <circle cx="44" cy="150" r="2.6" fill={SOFT} opacity="0.6" />
      <circle cx="262" cy="200" r="2.6" fill={SOFT} opacity="0.55" />
    </svg>
  );
}
