"use client";

/**
 * components/paw-planet/SceneComposite.jsx
 * 场景合成：背景层 + 当前宠物主角层叠加（纯前端展示，无 AI 生成）。
 * ScenePreview 与 TodayView「今日的它」共用。
 *
 * props:
 *   backgroundImage   背景图路径（缺失/加载失败 → fallbackGradient）
 *   fallbackGradient  兜底渐变
 *   placement         { x, y, scale, translateX, translateY, zIndex }
 *   petImage          当前宠物图（thumb 优先；失败回退猫狗占位）
 *   petType           "cat" | "dog"（占位回退用）
 *   radius            圆角（默认 14）
 *   children          叠加在最上层的内容（如底部文案）
 */
export default function SceneComposite({
  backgroundImage, fallbackGradient, placement, petImage, petType = "dog", radius = 14, children,
}) {
  const p = placement || {};
  const fallbackPet = petType === "cat" ? "/cat.png" : "/dog.png";

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "1672 / 941", borderRadius: radius,
                  overflow: "hidden", background: fallbackGradient || "#EFE3D5" }}>
      {/* 背景层（加载失败则隐藏，露出兜底渐变） */}
      {backgroundImage && (
        <img src={backgroundImage} alt="" aria-hidden="true"
             onError={(e) => { e.currentTarget.style.display = "none"; }}
             style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }} />
      )}

      {/* 宠物主角层（按配置叠加；不变形、不裁切、居中锚点） */}
      <img src={petImage || fallbackPet} alt="" loading="eager" decoding="async"
           onError={(e) => { if (e.currentTarget.src.indexOf(fallbackPet) === -1) e.currentTarget.src = fallbackPet; }}
           style={{ position: "absolute", left: p.x, top: p.y, width: p.scale, height: "auto",
                    transform: `translate(-50%,-50%) translate(${p.translateX || 0}px,${p.translateY || 0}px)`,
                    zIndex: p.zIndex || 2, objectFit: "contain", pointerEvents: "none",
                    filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.18))" }} />

      {children}
    </div>
  );
}
