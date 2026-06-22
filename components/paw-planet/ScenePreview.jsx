"use client";

/**
 * components/paw-planet/ScenePreview.jsx
 *
 * 爪爪星球「8 张场景背景 + 当前宠物主角图叠加」前端合成预览（纯展示，不接 AI 生成）。
 * 背景层：lib/pawPlanetScenePlacements 的 backgroundImage（缺失/加载失败 → fallbackGradient）。
 * 宠物层：当前宠物图（pet_avatar_thumb_url → ai_avatar_url → 猫狗占位），按场景 petPlacement 叠加。
 *
 * props: { petName, avatar, petType, onBack }
 *   avatar 已是 thumb 优先的 AI 头像；加载失败回退到对应猫狗占位图。
 */

import { useState } from "react";
import BackButton from "@/components/icons/BackButton";
import SceneComposite from "@/components/paw-planet/SceneComposite";
import { PLANET_C as C } from "@/lib/pawPlanetMock";
import { PAW_PLANET_SCENE_PLACEMENTS, PAW_PLANET_SCENE_ORDER } from "@/lib/pawPlanetScenePlacements";

export default function ScenePreview({ petName = "毛孩子", avatar, petType = "dog", onBack }) {
  const [active, setActive] = useState(PAW_PLANET_SCENE_ORDER[0]);
  const scene = PAW_PLANET_SCENE_PLACEMENTS[active];
  const p = scene.petPlacement;
  const fallbackPet = petType === "cat" ? "/cat.png" : "/dog.png";
  const petSrc = avatar || fallbackPet;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F4ECE0" }}>
      {/* header */}
      <div style={{ padding: "max(env(safe-area-inset-top),28px) 16px 8px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <BackButton onClick={onBack} />
        <div style={{ flex: 1, textAlign: "center", marginRight: 38, fontSize: 17, fontWeight: 800, color: C.text }}>场景预览</div>
      </div>

      {/* 场景 tab（横向滚动） */}
      <div style={{ display: "flex", gap: 8, padding: "4px 14px 10px", overflowX: "auto", flexShrink: 0 }}>
        {PAW_PLANET_SCENE_ORDER.map((key) => {
          const on = key === active;
          const t = PAW_PLANET_SCENE_PLACEMENTS[key];
          return (
            <button key={key} onClick={() => setActive(key)}
              style={{ flex: "0 0 auto", padding: "8px 14px", borderRadius: 14, fontSize: 13, fontWeight: 700, cursor: "pointer",
                       border: "none", whiteSpace: "nowrap", transition: "all .18s",
                       background: on ? C.pri : "#fff", color: on ? "#fff" : C.sub,
                       boxShadow: on ? `0 4px 12px ${C.pri}44` : "0 1px 4px rgba(0,0,0,0.05)" }}>
              {t.title}
            </button>
          );
        })}
      </div>

      {/* 合成卡片 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 18px 22px" }}>
        <div style={{ boxShadow: "0 10px 28px rgba(0,0,0,0.14)", borderRadius: 18 }}>
          <SceneComposite backgroundImage={scene.backgroundImage} fallbackGradient={scene.fallbackGradient}
                          placement={p} petImage={petSrc} petType={petType} radius={18}>
            {/* 底部基础文案区（在宠物之上，避免被挡） */}
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 3, padding: "26px 16px 12px",
                          background: "linear-gradient(transparent, rgba(0,0,0,0.32))" }}>
              <div style={{ fontSize: 17, fontWeight: 900, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>{scene.title}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.92)", marginTop: 2, textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
                {petName} 的爪爪星球日常
              </div>
            </div>
          </SceneComposite>
        </div>

        {/* 位置读数（方便调试：改 lib/pawPlanetScenePlacements.js 即可调整） */}
        <div style={{ marginTop: 12, padding: "10px 14px", background: "#fff", borderRadius: 14,
                      border: `1px solid ${C.border}`, fontSize: 12, color: C.sub, lineHeight: 1.8 }}>
          <div style={{ fontWeight: 800, color: C.text, marginBottom: 2 }}>{scene.title}（{scene.sceneKey}）</div>
          位置 x:{p.x} · y:{p.y} · 宽:{p.scale} · 微调:({p.translateX || 0},{p.translateY || 0})
          <div style={{ color: "#A99", marginTop: 4 }}>
            背景图：{scene.backgroundImage}（缺失则用渐变）<br />
            调整位置改 <b>lib/pawPlanetScenePlacements.js</b>
          </div>
        </div>
      </div>
    </div>
  );
}
