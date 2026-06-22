"use client";

/**
 * components/paw-planet/PlanetDecor.jsx
 * 爪爪星球梦幻紫装饰（纯 CSS/SVG/emoji/图片，无依赖，pointer-events 安全）。
 * 仅供视觉使用，不含任何业务逻辑。
 */

/* 紫色星空主题色板 */
export const PLANET_PURPLE = {
  bg: "linear-gradient(180deg,#20265F 0%,#3C3E85 32%,#5656A6 60%,#9A8DDA 86%,#B9A7F4 100%)",
  paper: "#F8F5FF",
  paperLine: "#D9D2F3",
  inkTitle: "#5A5298",
  ink: "#6E66A8",
  inkPlaceholder: "#A79FCF",
  sign: "#8C7BD8",
  btn: "linear-gradient(90deg,#6F65D8,#8D7CF2)",
  btnGlow: "0 10px 30px rgba(158,139,255,0.45)",
  glassBtn: "rgba(255,255,255,0.16)",
  glassBorder: "rgba(255,255,255,0.42)",
  white: "#FFFFFF",
  sub: "rgba(255,255,255,0.72)",
  chipOn: "#B6A5FF",
};

/* 半透明紫玻璃圆形按钮（相机 / 加号等顶部按钮） */
export function GlassCircle({ size = 38, onClick, ariaLabel, children, style }) {
  return (
    <button onClick={onClick} aria-label={ariaLabel}
      style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, padding: 0,
               cursor: onClick ? "pointer" : "default", background: PLANET_PURPLE.glassBtn,
               border: `1px solid ${PLANET_PURPLE.glassBorder}`, backdropFilter: "blur(6px)",
               display: "flex", alignItems: "center", justifyContent: "center",
               WebkitTapHighlightColor: "transparent", ...style }}>
      {children}
    </button>
  );
}

/* 底部柔光云（衬托页面下半部） */
export function SoftClouds() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      <div style={{ position: "absolute", bottom: -30, left: -20, width: 200, height: 120, borderRadius: "50%",
                    background: "rgba(217,199,255,0.25)", filter: "blur(26px)" }} />
      <div style={{ position: "absolute", bottom: 30, right: -30, width: 180, height: 110, borderRadius: "50%",
                    background: "rgba(185,167,244,0.22)", filter: "blur(26px)" }} />
    </div>
  );
}

/* 回忆相册空状态插画：使用 public/memphoto.png（透明 PNG，云上相册+星球），不加额外 emoji 装饰 */
export function MemoryAlbumPlaceholder() {
  return (
    <img src="/memphoto.png" alt="" aria-hidden="true"
         style={{ width: 320, maxWidth: "84%", height: "auto", display: "block", margin: "0 auto",
                  filter: "drop-shadow(0 12px 26px rgba(40,28,96,0.32))" }} />
  );
}
