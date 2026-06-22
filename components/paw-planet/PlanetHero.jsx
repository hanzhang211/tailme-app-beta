"use client";

/**
 * components/paw-planet/PlanetHero.jsx
 *
 * 爪爪星球主视觉（第一版 CSS 星球；预留真实 3D 星球 PNG 替换位）。
 *
 * 📌 以后替换真实素材：传入下面任一字段即可，无需改页面结构——
 *   planetImageUrl    → 有值则用这张 PNG 当星球（替代 CSS 草地球）
 *   petImageUrl       → 宠物头像（默认已传当前宠物 AI 形象/头像）
 *   backgroundImageUrl→ 有值则作为 hero 区背景图（替代透明/夜空）
 *
 * 视觉：草地小星球 + 小房子/树/花 + 宠物 + 小伙伴 + 柔和光环 + 「想你啦～」气泡；
 *       星球上下浮动、光环呼吸、宠物轻浮动（纯 CSS，只动 transform/opacity）。
 */

import { PLANET_C as C } from "@/lib/pawPlanetMock";

export default function PlanetHero({ planetImageUrl, petImageUrl, backgroundImageUrl, petName = "毛孩子" }) {
  return (
    <div style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center",
                  padding: "6px 0 2px",
                  backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : undefined,
                  backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="ph-float" style={{ position: "relative", width: 322, height: 308,
                                         display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* 柔和光环 */}
        <span className="ph-halo" />

        {planetImageUrl ? (
          /* 真实星球 PNG（xingqiu.png 已含草地/房子/树/小伙伴；主宠物叠在中间草地上） */
          <div style={{ position: "relative", width: 308, height: 308, display: "flex", alignItems: "center", justifyContent: "center", transform: "translateX(-20px)" }}>
            <img src={planetImageUrl} alt="爪爪星球"
                 style={{ width: 308, height: 308, objectFit: "contain",
                          filter: "drop-shadow(0 16px 36px rgba(80,90,160,0.4))" }} />
            <img src={petImageUrl} alt={petName} className="ph-pet" loading="eager" decoding="async"
                 style={{ position: "absolute", left: "55%", top: "30%", transform: "translateX(-50%)",
                          width: 142, height: 142, objectFit: "contain", display: "block",
                          filter: "drop-shadow(0 6px 12px rgba(40,60,30,0.3))" }} />
          </div>
        ) : (
          /* 第一版 CSS 草地小星球 */
          <div style={{ position: "relative", width: 240, height: 240, borderRadius: "50%",
                        background: "radial-gradient(circle at 38% 30%, #D6EFB0 0%, #A6D981 42%, #7CC06E 70%, #56A05B 100%)",
                        boxShadow: "0 20px 50px rgba(70,110,60,0.45), inset -14px -18px 42px rgba(40,80,40,0.32), inset 12px 12px 34px rgba(255,255,255,0.4)" }}>
            {/* 地面高光弧 */}
            <span style={{ position: "absolute", left: "18%", top: "16%", width: "64%", height: "30%",
                           borderRadius: "50%", background: "rgba(255,255,255,0.28)", filter: "blur(6px)" }} />
            {/* 装饰：小房子 / 树 / 花 */}
            <span style={{ position: "absolute", left: "22%", top: "17%", fontSize: 32 }}>🏡</span>
            <span style={{ position: "absolute", right: "19%", top: "13%", fontSize: 27 }}>🌳</span>
            <span style={{ position: "absolute", left: "15%", bottom: "25%", fontSize: 17 }}>🌸</span>
            <span style={{ position: "absolute", right: "21%", bottom: "23%", fontSize: 15 }}>🌼</span>
            <span style={{ position: "absolute", left: "44%", bottom: "16%", fontSize: 14 }}>🌷</span>
            {/* 宠物（透明抠图直接融入，无边框无圆形，和首页主头像一致；轻浮动） */}
            <img src={petImageUrl} alt={petName} className="ph-pet"
                 style={{ position: "absolute", left: "50%", top: "28%", width: 110, height: 110,
                          objectFit: "contain", display: "block",
                          filter: "drop-shadow(0 6px 14px rgba(40,60,30,0.32))" }} />
            {/* 小伙伴 */}
            <img src="/dog.png" alt="" style={{ position: "absolute", left: "12%", top: "42%", width: 34, height: 34, objectFit: "contain", opacity: 0.95 }} />
            <img src="/cat.png" alt="" style={{ position: "absolute", right: "11%", bottom: "33%", width: 30, height: 30, objectFit: "contain", opacity: 0.92 }} />
          </div>
        )}

      </div>

      <style>{`
        .ph-float { animation: ph-float 5s ease-in-out infinite; }
        @keyframes ph-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        .ph-halo { position:absolute; width:322px; height:322px; border-radius:50%;
          background:radial-gradient(circle, rgba(255,221,180,0.40), rgba(142,132,200,0.10) 55%, transparent 70%);
          animation:ph-halo 4.2s ease-in-out infinite; }
        @keyframes ph-halo { 0%,100%{transform:scale(.94); opacity:.5} 50%{transform:scale(1.1); opacity:.9} }
        .ph-pet { animation: ph-pet 3.4s ease-in-out infinite; }
        @keyframes ph-pet { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(-5px)} }
      `}</style>
    </div>
  );
}
