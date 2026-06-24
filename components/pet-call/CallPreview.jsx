"use client";

/**
 * components/pet-call/CallPreview.jsx
 *
 * 来电提醒 / 推送预览（参考设计图第 3 屏）。
 * ⚠️ 第一版为 mock 锁屏预览，不调用系统推送。
 *    后续接 Capacitor Push / APNs·FCM 时，这里只作为「通知样式」展示参考。
 *
 * 点中间通知卡 → onAnswer（进入来电中页面）。
 *
 * props: { name, avatar, onAnswer, onClose }
 */

import { Lock, ChevronRight } from "lucide-react";

const C = { pri: "#E68645" };

const WEEK = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

export default function CallPreview({ name, avatar, onAnswer, onClose }) {
  const now = new Date();
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日 ${WEEK[now.getDay()]}`;
  // 即时体验：锁屏显示当前真实时间（不再依赖已移除的「来电时间」设置）
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <div
      style={{
        position: "absolute", inset: 0, overflow: "hidden",
        background: "linear-gradient(180deg,#FBDCAE 0%,#F4C281 55%,#EFB36A 100%)",
        display: "flex", flexDirection: "column", alignItems: "center",
      }}
    >
      {/* 返回（半透明） */}
      <button onClick={onClose} aria-label="返回"
        style={{ position: "absolute", top: "max(env(safe-area-inset-top), 16px)", left: 14, zIndex: 3,
                 width: 34, height: 34, borderRadius: "50%", border: "none", cursor: "pointer",
                 background: "rgba(255,255,255,0.35)", color: "#7A4E1E", fontSize: 18, fontWeight: 800 }}>
        ✕
      </button>

      {/* 锁屏顶部：锁 + 大时间 + 日期 */}
      <div style={{ paddingTop: "max(env(safe-area-inset-top), 54px)", display: "flex",
                    flexDirection: "column", alignItems: "center", zIndex: 2 }}>
        <Lock size={20} color="rgba(122,78,30,0.7)" style={{ marginBottom: 14 }} />
        <div style={{ fontSize: 74, fontWeight: 300, color: "#5E3C16", lineHeight: 1, letterSpacing: 1 }}>{timeStr}</div>
        <div style={{ fontSize: 16, color: "#7A4E1E", marginTop: 8, fontWeight: 500 }}>{dateStr}</div>
      </div>

      {/* 通知卡 */}
      <button onClick={onAnswer}
        style={{ position: "relative", zIndex: 2, width: "calc(100% - 36px)", maxWidth: 380, marginTop: 26,
                 textAlign: "left", cursor: "pointer", border: "none", borderRadius: 20,
                 background: "rgba(255,255,255,0.92)", backdropFilter: "blur(6px)", padding: "14px 16px",
                 boxShadow: "0 8px 24px rgba(150,90,30,0.22)", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 22, height: 22, borderRadius: 7, background: C.pri, flexShrink: 0,
                         display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🐾</span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "#2A2520", flex: 1 }}>TailMe 爪爪日记</span>
          <span style={{ fontSize: 11, color: "#9A8E7E" }}>现在</span>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#2A2520", lineHeight: 1.5 }}>
            {name}想你啦，正在呼叫你...
          </div>
          <div style={{ fontSize: 13.5, color: C.pri, fontWeight: 700, marginTop: 4,
                        display: "flex", alignItems: "center", gap: 2 }}>
            快去接听它的电话吧 💕
            <ChevronRight size={15} color={C.pri} style={{ marginLeft: "auto" }} />
          </div>
        </div>
      </button>

      {/* 底部宠物图 + 装饰 */}
      <div style={{ flex: 1, width: "100%", position: "relative", display: "flex",
                    alignItems: "flex-end", justifyContent: "center" }}>
        <div style={{ position: "absolute", right: "24%", top: "12%", fontSize: 22, opacity: 0.8 }}>💛</div>
        <div style={{ position: "absolute", left: "20%", top: "34%", fontSize: 16, opacity: 0.7 }}>🐾</div>
        <img src={avatar} alt={name}
             style={{ width: 200, height: 200, objectFit: "contain", marginBottom: 8,
                      filter: "drop-shadow(0 6px 14px rgba(120,70,20,0.25))" }} />
      </div>
    </div>
  );
}
