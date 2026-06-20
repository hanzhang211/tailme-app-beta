"use client";

/**
 * components/pet-call/IncomingCall.jsx
 *
 * 来电中页面（参考设计图第 4 屏）：全屏深棕暖橙渐变、宠物大圆头像 + 呼吸光圈、
 * 「来电中...」点点动画、底部三按钮（稍后再说 / 接听 / 挂断）。
 *
 * props: { name, avatar, onAccept, onDecline, onLater }
 */

import { Phone, PhoneOff, MessageSquare } from "lucide-react";

export default function IncomingCall({ name, avatar, onAccept, onDecline, onLater }) {
  return (
    <div
      style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(165deg,#5A4634 0%,#3A2D22 60%,#2A2018 100%)",
        display: "flex", flexDirection: "column", alignItems: "center",
        color: "#fff", overflow: "hidden",
      }}
    >
      {/* 上部：头像 + 名字 + 来电中 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", width: "100%", paddingTop: "max(env(safe-area-inset-top), 40px)" }}>
        <div style={{ position: "relative", width: 168, height: 168, marginBottom: 30 }}>
          {/* 呼吸光圈 */}
          <span className="pc-ring" style={ringStyle(0)} />
          <span className="pc-ring" style={ringStyle(0.9)} />
          <img
            src={avatar}
            alt={name}
            style={{
              position: "absolute", inset: 18, width: 132, height: 132, borderRadius: "50%",
              objectFit: "cover", border: "3px solid rgba(255,255,255,0.85)",
              boxShadow: "0 8px 30px rgba(0,0,0,0.35)", background: "#EADBCB",
            }}
          />
        </div>
        <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: 1, marginBottom: 10 }}>{name}</div>
        <div style={{ fontSize: 15, color: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", gap: 2 }}>
          来电中
          <span className="pc-dot" style={{ animationDelay: "0s" }}>·</span>
          <span className="pc-dot" style={{ animationDelay: ".2s" }}>·</span>
          <span className="pc-dot" style={{ animationDelay: ".4s" }}>·</span>
        </div>
      </div>

      {/* 底部三按钮 */}
      <div style={{ width: "100%", display: "flex", justifyContent: "space-around", alignItems: "flex-end",
                    padding: "0 28px max(env(safe-area-inset-bottom), 44px)" }}>
        <CallBtn label="稍后再说" bg="rgba(255,255,255,0.16)" onClick={onLater}>
          <MessageSquare size={26} color="#fff" />
        </CallBtn>
        <CallBtn label="接听" bg="#3FB984" big onClick={onAccept}>
          <Phone size={30} color="#fff" fill="#fff" />
        </CallBtn>
        <CallBtn label="挂断" bg="#E5573E" onClick={onDecline}>
          <PhoneOff size={26} color="#fff" />
        </CallBtn>
      </div>

      <style>{`
        @keyframes pc-breathe { 0%{transform:scale(1);opacity:.5} 70%{transform:scale(1.35);opacity:0} 100%{transform:scale(1.35);opacity:0} }
        .pc-ring { position:absolute; inset:0; border-radius:50%; background:rgba(230,134,69,0.45); animation:pc-breathe 2.4s ease-out infinite; }
        @keyframes pc-blink { 0%,100%{opacity:.3} 50%{opacity:1} }
        .pc-dot { animation:pc-blink 1.2s infinite; }
      `}</style>
    </div>
  );
}

function ringStyle(delaySec) {
  return { animationDelay: `${delaySec}s` };
}

function CallBtn({ children, label, bg, big, onClick }) {
  const d = big ? 74 : 62;
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 9,
        background: "none", border: "none", cursor: "pointer", padding: 0,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <span style={{ width: d, height: d, borderRadius: "50%", background: bg,
                     display: "flex", alignItems: "center", justifyContent: "center",
                     boxShadow: big ? "0 6px 20px rgba(63,185,132,0.5)" : "0 4px 12px rgba(0,0,0,0.25)" }}>
        {children}
      </span>
      <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.85)" }}>{label}</span>
    </button>
  );
}
