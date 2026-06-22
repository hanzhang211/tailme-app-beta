"use client";

/**
 * components/paw-planet/FloatingStars.jsx
 * 夜空背景层：闪烁星星（白）+ 闪烁狗爪（暖黄）+ 粉色狗爪流星（左上→右下，带拖尾）+ 漂浮云朵。
 * 纯 CSS，只动 transform/opacity/位置；固定预设位置（避免 SSR hydration 不一致）；pointer-events:none。
 */

import { PawPrint } from "lucide-react";

const STARS = [
  { t: 6, l: 14, s: 3, d: 0 }, { t: 14, l: 42, s: 2, d: 0.6 }, { t: 9, l: 72, s: 4, d: 1.2 },
  { t: 22, l: 86, s: 2, d: 0.3 }, { t: 30, l: 24, s: 3, d: 0.9 }, { t: 5, l: 58, s: 2, d: 1.5 },
  { t: 38, l: 66, s: 3, d: 0.4 }, { t: 18, l: 8, s: 2, d: 1.1 }, { t: 44, l: 90, s: 2, d: 0.7 },
  { t: 34, l: 50, s: 2, d: 1.8 }, { t: 50, l: 18, s: 3, d: 0.2 }, { t: 12, l: 30, s: 2, d: 1.4 },
  { t: 26, l: 64, s: 2, d: 1.0 }, { t: 42, l: 38, s: 3, d: 0.5 },
];

// 暖黄闪烁狗爪（固定位置，避开正中主视觉）
const PAWS = [
  { t: 11, l: 22, s: 16, d: 0.2 }, { t: 27, l: 82, s: 13, d: 1.1 }, { t: 47, l: 7, s: 18, d: 0.6 },
  { t: 63, l: 87, s: 14, d: 1.6 }, { t: 78, l: 17, s: 15, d: 0.9 }, { t: 20, l: 52, s: 11, d: 1.35 },
  { t: 56, l: 63, s: 13, d: 0.45 }, { t: 87, l: 66, s: 16, d: 1.25 },
];

// 粉色狗爪流星（左上→右下，时不时来一道）
const METEORS = [
  { s: 26, delay: "1.5s", dur: "8s" },
  { s: 22, delay: "6s", dur: "11s" },
];

export default function FloatingStars() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {STARS.map((st, i) => (
        <span key={i} className="ps-star"
          style={{ top: `${st.t}%`, left: `${st.l}%`, width: st.s, height: st.s, animationDelay: `${st.d}s` }} />
      ))}
      {PAWS.map((pw, i) => (
        <PawPrint key={`paw${i}`} size={pw.s} className="ps-paw"
          style={{ position: "absolute", top: `${pw.t}%`, left: `${pw.l}%`, color: "#FFE89A", animationDelay: `${pw.d}s` }} />
      ))}
      {METEORS.map((m, i) => (
        <span key={`meteor${i}`} className="ps-meteor" style={{ animationDelay: m.delay, animationDuration: m.dur }}>
          <span className="ps-meteor-trail" />
          <PawPrint size={m.s} className="ps-meteor-paw" />
        </span>
      ))}
      <span className="ps-cloud" style={{ top: "20%", animationDelay: "0s", fontSize: 34 }}>☁️</span>
      <span className="ps-cloud" style={{ top: "58%", animationDelay: "9s", fontSize: 26 }}>☁️</span>
      <style>{`
        .ps-star { position:absolute; border-radius:50%; background:#fff;
          box-shadow:0 0 6px rgba(255,255,255,0.9); animation:ps-twinkle 2.8s ease-in-out infinite; }
        @keyframes ps-twinkle { 0%,100%{opacity:.22; transform:scale(.8)} 50%{opacity:1; transform:scale(1.25)} }
        .ps-paw { filter:drop-shadow(0 0 5px rgba(255,232,154,0.9)); animation:ps-paw-tw 3.2s ease-in-out infinite; }
        @keyframes ps-paw-tw { 0%,100%{opacity:.25; transform:scale(.85)} 50%{opacity:.95; transform:scale(1.12)} }
        .ps-cloud { position:absolute; left:-12%; opacity:.42; animation:ps-drift 30s linear infinite; }
        @keyframes ps-drift { from{transform:translateX(0)} to{transform:translateX(120vw)} }

        /* 粉色狗爪流星：左上→右下，带一点拖尾，时不时出现 */
        .ps-meteor { position:absolute; opacity:0; animation:ps-shoot 8s ease-in infinite; }
        @keyframes ps-shoot {
          0%   { top:-10%; left:-10%; opacity:0; }
          5%   { opacity:0; }
          8%   { opacity:1; }
          24%  { top:110%; left:110%; opacity:0; }
          100% { top:110%; left:110%; opacity:0; }
        }
        .ps-meteor-paw { position:absolute; top:0; left:0; transform:translate(-50%,-50%);
          color:#FF9ECF; filter:drop-shadow(0 0 6px rgba(255,150,205,0.95)); }
        .ps-meteor-trail { position:absolute; top:0; left:0; width:54px; height:3px; border-radius:3px;
          background:linear-gradient(to left, rgba(255,158,207,0.9), rgba(255,158,207,0));
          transform-origin:right center; transform:translate(-100%,-50%) rotate(45deg); }
      `}</style>
    </div>
  );
}
