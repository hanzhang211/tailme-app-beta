"use client";

/**
 * components/paw-planet/MemorialCardView.jsx
 * 「纪念卡片」——单一固定紫色星空纪念卡（可编辑一句话 + 自动统计：陪伴天数/写信数/来看次数）。
 * 去掉颜色选择 / 模板切换 / 换一句话 tabs，只保留一个模板 + 保存到相册。
 * props: { petName, avatar, petType, letterCount, visitCount, birthday, memorialStartDate, onBack, toast }
 */

import { useState } from "react";
import { CalendarDays, Mail, PawPrint, Heart } from "lucide-react";
import BackButton from "@/components/icons/BackButton";
import FloatingStars from "@/components/paw-planet/FloatingStars";
import { PLANET_PURPLE as P } from "@/components/paw-planet/PlanetDecor";

export default function MemorialCardView({
  petName = "毛孩子", avatar, petType = "dog",
  letterCount = 0, visitCount = 0, birthday, memorialStartDate,
  onBack, toast,
}) {
  const [customMessage, setCustomMessage] = useState("谢谢你来过我的生命里");
  const petImg = avatar || (petType === "cat" ? "/cat.png" : "/dog.png");

  // 陪伴天数 = 进入星球日期 - 生日；缺失/异常显示 "--"
  const days = (() => {
    if (!birthday || !memorialStartDate) return null;
    const b = new Date(birthday), m = new Date(memorialStartDate);
    if (isNaN(b.getTime()) || isNaN(m.getTime())) return null;
    const n = Math.floor((m.getTime() - b.getTime()) / 86400000);
    return n >= 0 ? n : null;
  })();

  const Stat = ({ Icon, label, value, unit }) => (
    <div style={{ flex: 1, minWidth: 0, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 22, padding: "11px 4px", backdropFilter: "blur(6px)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 11.5, color: "rgba(255,255,255,0.82)" }}>
        <Icon size={13} color="#fff" /> {label}
      </div>
      <div style={{ marginTop: 4, whiteSpace: "nowrap" }}>
        <span style={{ fontSize: 25, fontWeight: 900, color: "#FFE49A" }}>{value}</span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", marginLeft: 3 }}>{unit}</span>
      </div>
    </div>
  );

  return (
    <div style={{ height: "100%", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", background: P.bg }}>
      <FloatingStars />

      {/* header */}
      <div style={{ position: "relative", zIndex: 1, padding: "max(env(safe-area-inset-top), 28px) 16px 8px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <BackButton onClick={onBack} bg={P.glassBtn} color="#fff" border={false} shadow={false} />
        <div style={{ flex: 1, textAlign: "center", marginRight: 38, fontSize: 18, fontWeight: 800, color: "#fff" }}>纪念卡片</div>
      </div>

      <div style={{ position: "relative", zIndex: 1, flex: 1, overflowY: "auto", padding: "8px 20px 22px" }}>
        {/* 纪念卡 */}
        <div style={{ position: "relative", overflow: "hidden", borderRadius: 36, padding: "26px 20px 22px",
                      background: "linear-gradient(180deg, rgba(79,74,160,0.88) 0%, rgba(107,99,190,0.78) 55%, rgba(154,141,218,0.72) 100%)",
                      border: "1px solid rgba(255,255,255,0.3)", boxShadow: "0 20px 70px rgba(20,16,80,0.45)", textAlign: "center" }}>
          {/* 卡内装饰（不挡交互） */}
          <span style={{ position: "absolute", left: "12%", top: "11%", fontSize: 13, color: "#FFE89A", opacity: 0.85, pointerEvents: "none" }}>✦</span>
          <span style={{ position: "absolute", right: "14%", top: "16%", fontSize: 10, color: "#FFE89A", opacity: 0.7, pointerEvents: "none" }}>✦</span>
          <span style={{ position: "absolute", right: "10%", top: "30%", fontSize: 11, color: "#fff", opacity: 0.6, pointerEvents: "none" }}>✦</span>
          <div style={{ position: "absolute", left: -20, bottom: 20, width: 120, height: 70, borderRadius: "50%",
                        background: "rgba(217,199,255,0.3)", filter: "blur(14px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", right: -20, bottom: 30, width: 110, height: 60, borderRadius: "50%",
                        background: "rgba(245,167,216,0.22)", filter: "blur(14px)", pointerEvents: "none" }} />

          {/* 可编辑一句话 */}
          <input className="mc-title" value={customMessage} onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="写一句想对它说的话" maxLength={20}
            style={{ position: "relative", zIndex: 1, width: "100%", border: "none", outline: "none", background: "transparent",
                     textAlign: "center", color: "#FFF3C8", fontSize: 23, fontWeight: 900, lineHeight: 1.4,
                     textShadow: "0 1px 8px rgba(255,235,180,0.35)" }} />
          <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "center", margin: "6px 0 4px" }}>
            <Heart size={13} color="#fff" style={{ opacity: 0.7 }} />
          </div>

          {/* 宠物头像 + 发光圆环 */}
          <div style={{ position: "relative", zIndex: 1, width: 130, height: 130, margin: "8px auto 18px" }}>
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.7)",
                           boxShadow: "0 0 28px rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.08)" }} />
            <img src={petImg} alt={petName}
                 style={{ position: "relative", width: "100%", height: "100%", borderRadius: "50%", objectFit: "contain", padding: 8 }} />
          </div>

          {/* 自动统计 */}
          <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 9 }}>
            <Stat Icon={CalendarDays} label="陪伴了" value={days != null ? days : "--"} unit="天" />
            <Stat Icon={Mail} label="写给它" value={letterCount || 0} unit="封信" />
            <Stat Icon={PawPrint} label="来看它" value={visitCount || 0} unit="次" />
          </div>

          {/* 分隔 + 祝福 */}
          <div style={{ position: "relative", zIndex: 1, borderTop: "1px dashed rgba(255,255,255,0.3)", margin: "18px 6px 12px" }} />
          <div style={{ position: "relative", zIndex: 1, fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.7 }}>
            你永远是我最重要的小宝贝 🐾
          </div>
        </div>
      </div>

      {/* 保存到相册 */}
      <div style={{ position: "relative", zIndex: 1, padding: "10px 16px 14px", flexShrink: 0 }}>
        <button onClick={() => toast?.("已保存到相册 🐾")}
          style={{ width: "100%", padding: "16px 0", borderRadius: 28, border: "none", cursor: "pointer",
                   background: "linear-gradient(90deg,#8C7BF2,#D77BDA,#F5A7D8)", color: "#fff", fontSize: 15.5, fontWeight: 800,
                   display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                   boxShadow: "0 0 32px rgba(215,123,218,0.45)" }}>
          保存到相册
        </button>
      </div>

      <style>{`.mc-title::placeholder{ color:rgba(255,243,200,0.6); }`}</style>
    </div>
  );
}
