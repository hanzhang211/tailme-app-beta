"use client";

/**
 * components/paw-planet/TodayView.jsx
 * 「今天的它」——梦幻紫星空时间轴（仅视觉改造；数据/时间轴/图片渲染逻辑保持不变）。
 * 卡片图 = 场景背景 + 当前宠物叠加（SceneComposite）。
 * props: { petName, avatar, petType, stories, onBack }  stories 来自 lib/pawPlanetDailyStories（按日固定）
 */

import { CalendarDays } from "lucide-react";
import BackButton from "@/components/icons/BackButton";
import FloatingStars from "@/components/paw-planet/FloatingStars";
import SceneComposite from "@/components/paw-planet/SceneComposite";
import { PLANET_PURPLE as P, GlassCircle } from "@/components/paw-planet/PlanetDecor";
import { storyImage } from "@/lib/pawPlanetDailyStories";
import { placementForType } from "@/lib/pawPlanetScenePlacements";
import { cardTypeOfStory } from "@/lib/memorialCardPrompts";

// 时间节点发光色（按 slot；纯视觉，不改数据）
const SLOT_GLOW = { morning: "#FFE89A", afternoon: "#E3A9EE", evening: "#FFE0A0" };

// cardsMap：{ cardType: imageUrl } —— 该宠物已生成的 AI 纪念卡（含宠物本体）。
// 有 AI 图：整图直显、不再叠加宠物头像（避免「两只宠物」）；
// 无 AI 图：回退现有「背景图 + 头像」合成作为临时占位（始终有内容、也是生成失败时的兜底）。
export default function TodayView({ petName = "毛孩子", avatar, petType = "dog", stories = [], cardsMap = {}, cardsBusy = false, onBack }) {
  const items = stories;
  return (
    <div style={{ height: "100%", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", background: P.bg }}>
      <FloatingStars />

      {/* header */}
      <div style={{ position: "relative", zIndex: 1, padding: "max(env(safe-area-inset-top), 28px) 16px 8px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <BackButton onClick={onBack} bg={P.glassBtn} color="#fff" border={false} shadow={false} />
        <div style={{ flex: 1, textAlign: "center", fontSize: 18, fontWeight: 800, color: "#fff" }}>今天的{petName} <span style={{ fontSize: 14 }}>✨</span></div>
        <GlassCircle ariaLabel="日历"><CalendarDays size={17} color="#fff" /></GlassCircle>
      </div>

      <div style={{ position: "relative", zIndex: 1, flex: 1, overflowY: "auto", padding: "12px 18px 28px" }}>
        {items.map((it, i) => {
          const glow = SLOT_GLOW[it.slot] || "#C9BCF2";
          return (
            <div key={i} style={{ display: "flex", gap: 11, marginBottom: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <span style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.15)",
                               backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.3)",
                               boxShadow: `0 0 14px ${glow}aa`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 16 }}>{it.icon}</span>
                </span>
                {i < items.length - 1 && (
                  <span style={{ flex: 1, width: 2.5, marginTop: 5, minHeight: 30, borderRadius: 2,
                                 background: "linear-gradient(to bottom, rgba(255,255,255,0.55), rgba(185,167,244,0.35))",
                                 boxShadow: "0 0 8px rgba(200,185,255,0.5)" }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: "#fff", fontWeight: 700, marginBottom: 6 }}>{it.time}</div>
                <div style={{ background: "rgba(248,245,255,0.92)", borderRadius: 22, padding: "12px 15px",
                              border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 12px 36px rgba(30,20,90,0.22)" }}>
                  {it.title && <div style={{ fontSize: 14, fontWeight: 800, color: "#5E55A8", marginBottom: 4 }}>{it.title}</div>}
                  <div style={{ fontSize: 13, color: it.title ? "#7E76B8" : "#5E55A8", lineHeight: 1.7 }}>{it.text}</div>
                </div>
                <div style={{ marginTop: 10, borderRadius: 22, overflow: "hidden", position: "relative",
                              border: "1px solid rgba(255,255,255,0.4)", boxShadow: "0 12px 40px rgba(90,70,180,0.28)" }}>
                  {cardsMap[cardTypeOfStory(it.type)] ? (
                    // AI 成品图已含这只宠物：整图直显，不叠头像
                    <img src={cardsMap[cardTypeOfStory(it.type)]} alt=""
                         style={{ display: "block", width: "100%", aspectRatio: "1280 / 720", objectFit: "cover" }} />
                  ) : (
                    // 还没生成好：沿用现有「背景图 + 宠物头像」合成（临时占位 / 兜底）
                    <>
                      <SceneComposite backgroundImage={storyImage(it.type)}
                                      fallbackGradient={placementForType(it.type).fallbackGradient}
                                      placement={placementForType(it.type).petPlacement}
                                      petImage={avatar} petType={petType} radius={22} />
                      {cardsBusy && (
                        <div style={{ position: "absolute", left: 10, bottom: 10, padding: "3px 10px", borderRadius: 11,
                                      background: "rgba(40,30,70,0.55)", backdropFilter: "blur(4px)", color: "#fff",
                                      fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, zIndex: 5 }}>
                          ✨ 星球绘制中…
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div style={{ textAlign: "center", fontSize: 11.5, color: P.sub, marginTop: 12 }}>
          这是爪爪星球为你保存的一份温柔想象 ♥
        </div>
      </div>
    </div>
  );
}
