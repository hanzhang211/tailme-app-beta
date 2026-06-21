"use client";

/**
 * components/paw-planet/FloatingStars.jsx
 * 夜空背景层：闪烁星星 + 漂浮云朵（纯 CSS，只动 transform/opacity，移动端流畅）。
 * 固定预设位置（不用随机，避免 SSR hydration 不一致）。pointer-events:none，不挡交互。
 */

const STARS = [
  { t: 6, l: 14, s: 3, d: 0 }, { t: 14, l: 42, s: 2, d: 0.6 }, { t: 9, l: 72, s: 4, d: 1.2 },
  { t: 22, l: 86, s: 2, d: 0.3 }, { t: 30, l: 24, s: 3, d: 0.9 }, { t: 5, l: 58, s: 2, d: 1.5 },
  { t: 38, l: 66, s: 3, d: 0.4 }, { t: 18, l: 8, s: 2, d: 1.1 }, { t: 44, l: 90, s: 2, d: 0.7 },
  { t: 34, l: 50, s: 2, d: 1.8 }, { t: 50, l: 18, s: 3, d: 0.2 }, { t: 12, l: 30, s: 2, d: 1.4 },
  { t: 26, l: 64, s: 2, d: 1.0 }, { t: 42, l: 38, s: 3, d: 0.5 },
];

export default function FloatingStars() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {STARS.map((st, i) => (
        <span key={i} className="ps-star"
          style={{ top: `${st.t}%`, left: `${st.l}%`, width: st.s, height: st.s, animationDelay: `${st.d}s` }} />
      ))}
      <span className="ps-cloud" style={{ top: "20%", animationDelay: "0s", fontSize: 34 }}>☁️</span>
      <span className="ps-cloud" style={{ top: "58%", animationDelay: "9s", fontSize: 26 }}>☁️</span>
      <style>{`
        .ps-star { position:absolute; border-radius:50%; background:#fff;
          box-shadow:0 0 6px rgba(255,255,255,0.9); animation:ps-twinkle 2.8s ease-in-out infinite; }
        @keyframes ps-twinkle { 0%,100%{opacity:.22; transform:scale(.8)} 50%{opacity:1; transform:scale(1.25)} }
        .ps-cloud { position:absolute; left:-12%; opacity:.42; animation:ps-drift 30s linear infinite; }
        @keyframes ps-drift { from{transform:translateX(0)} to{transform:translateX(120vw)} }
      `}</style>
    </div>
  );
}
