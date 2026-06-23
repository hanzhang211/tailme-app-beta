"use client";

/**
 * components/pet-call/ActiveCall.jsx
 *
 * 通话中页面 · 语音模式（参考设计图第 5 屏）：暖橙渐变、宠物头像 + 声波环、
 * 宠物说话气泡、快捷回复、底部通话控制（静音 / 挂断 / 免提）。
 * 右上角可切到「聊天模式」(CallChatMode)。
 *
 * props: {
 *   name, avatar, seconds, petLine,
 *   muted, speaker, onToggleMute, onToggleSpeaker,
 *   onReply, onEnd, onSwitchToChat,
 * }
 */

import { Mic, MicOff, PhoneOff, Volume2, VolumeX, MessageSquare } from "lucide-react";
import BackButton from "@/components/icons/BackButton";
import { formatDuration } from "@/hooks/usePetCall";

const C = { pri: "#E68645", text: "#3A2A1A", sub: "#9A7A56" };

// 快捷按钮配色（暖橙背景上）：完成=白底绿 / 主推=橙底白 / 结束=半透白红 / 其它=白底深
function acActionStyle(type) {
  switch (type) {
    case "primary": return { background: "#E68645", color: "#fff", border: "1px solid #E68645" };
    case "success": return { background: "#fff", color: "#3E8E5A", border: "1.5px solid #8FCBA3" };
    case "danger":  return { background: "rgba(255,255,255,0.55)", color: "#C0451F", border: "1px solid rgba(217,84,43,0.4)" };
    default:        return { background: "#fff", color: "#3A2A1A", border: "1px solid rgba(255,255,255,0.9)" };
  }
}

export default function ActiveCall({
  name, avatar, seconds, petLine, subtitleTone, quickActions, muted, speaker,
  onToggleMute, onToggleSpeaker, onAction, onEnd, onSwitchToChat, disabled,
}) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden",
                  background: "linear-gradient(180deg,#F9E2C4 0%,#F0CB9D 60%,#EABF8C 100%)",
                  display: "flex", flexDirection: "column" }}>
      {/* header */}
      <div style={{ padding: "max(env(safe-area-inset-top), 28px) 16px 6px", display: "flex",
                    alignItems: "center", gap: 12, flexShrink: 0 }}>
        <BackButton onClick={onEnd} bg="rgba(255,255,255,0.7)" />
        <div style={{ flex: 1, textAlign: "center", marginLeft: -38 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.text }}>{name}</div>
          <div style={{ fontSize: 12.5, color: C.sub, marginTop: 2 }}>{formatDuration(seconds)}</div>
        </div>
        <button onClick={onSwitchToChat} aria-label="聊天模式"
          style={{ width: 38, height: 38, borderRadius: "50%", border: "none", cursor: "pointer",
                   background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MessageSquare size={18} color={C.pri} />
        </button>
      </div>

      {/* 头像 + 声波环 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
        <div style={{ position: "relative", width: 200, height: 200, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
          <span className="ac-wave" style={{ animationDelay: "0s" }} />
          <span className="ac-wave" style={{ animationDelay: "1.1s" }} />
          <img src={avatar} alt={name}
               style={{ position: "relative", width: 138, height: 138, borderRadius: "50%", objectFit: "cover",
                        border: "4px solid rgba(255,255,255,0.9)", boxShadow: "0 8px 26px rgba(150,90,30,0.28)", background: "#F2E5DA" }} />
          <span style={{ position: "absolute", top: 6, right: 24, fontSize: 20 }}>💛</span>
        </div>

        {/* 宠物语翻译中 + 语气标签（情绪/叫声由场景自动匹配） */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: "#A8531C", fontWeight: 700 }}>🐾 宠物语翻译中</span>
          <span className="ac-tdot" style={{ animationDelay: "0s", color: "#A8531C" }}>·</span>
          <span className="ac-tdot" style={{ animationDelay: ".2s", color: "#A8531C" }}>·</span>
          <span className="ac-tdot" style={{ animationDelay: ".4s", color: "#A8531C" }}>·</span>
          {subtitleTone && (
            <span style={{ marginLeft: 4, fontSize: 11.5, fontWeight: 800, color: "#fff",
                           background: C.pri, padding: "2px 10px", borderRadius: 10 }}>
              {subtitleTone}
            </span>
          )}
        </div>

        {/* 宠物气泡（字幕） */}
        <div style={{ background: "#fff", borderRadius: 20, padding: "14px 18px", maxWidth: 300,
                      boxShadow: "0 6px 18px rgba(150,90,30,0.16)", fontSize: 15, fontWeight: 600,
                      color: C.text, lineHeight: 1.6, textAlign: "center" }}>
          {petLine}
        </div>

        {/* 快捷按钮（按 call_type 动态生成，见 lib/petCallQuickActions） */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 22, width: "100%", maxWidth: 320 }}>
          {(quickActions || []).map((a) => (
            <button key={a.key} onClick={() => onAction(a)} disabled={disabled}
              style={{ padding: "11px 0", borderRadius: 14, cursor: disabled ? "default" : "pointer", fontSize: 14, fontWeight: 700,
                       boxShadow: "0 2px 8px rgba(150,90,30,0.1)", WebkitTapHighlightColor: "transparent",
                       opacity: disabled ? 0.5 : 1, transition: "opacity .2s",
                       ...acActionStyle(a.type) }}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* 底部通话控制 */}
      <Controls muted={muted} speaker={speaker} onToggleMute={onToggleMute} onToggleSpeaker={onToggleSpeaker} onEnd={onEnd} />

      <style>{`
        @keyframes ac-wave { 0%{transform:scale(.86);opacity:.55} 70%{transform:scale(1.25);opacity:0} 100%{transform:scale(1.25);opacity:0} }
        .ac-wave { position:absolute; width:170px; height:170px; border-radius:50%; background:rgba(230,134,69,0.35); animation:ac-wave 2.6s ease-out infinite; }
        @keyframes ac-blink { 0%,100%{opacity:.3} 50%{opacity:1} }
        .ac-tdot { font-weight:800; animation:ac-blink 1.2s infinite; }
      `}</style>
    </div>
  );
}

/* 底部三按钮（ActiveCall / CallChatMode 共用同款视觉） */
export function Controls({ muted, speaker, onToggleMute, onToggleSpeaker, onEnd, light }) {
  const ctlBg = light ? "#F2EDE5" : "rgba(255,255,255,0.7)";
  const iconColor = "#7A5A38";
  return (
    <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center",
                  padding: "8px 30px max(env(safe-area-inset-bottom), 30px)", flexShrink: 0 }}>
      <Ctl label="静音" bg={muted ? "#E68645" : ctlBg} onClick={onToggleMute}>
        {muted ? <MicOff size={24} color="#fff" /> : <Mic size={24} color={iconColor} />}
      </Ctl>
      <Ctl label="挂断" bg="#E5573E" big onClick={onEnd}>
        <PhoneOff size={28} color="#fff" />
      </Ctl>
      <Ctl label="免提" bg={speaker ? "#E68645" : ctlBg} onClick={onToggleSpeaker}>
        {speaker ? <Volume2 size={24} color="#fff" /> : <VolumeX size={24} color={iconColor} />}
      </Ctl>
    </div>
  );
}

function Ctl({ children, label, bg, big, onClick }) {
  const d = big ? 70 : 58;
  return (
    <button onClick={onClick}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
               background: "none", border: "none", cursor: "pointer", padding: 0, WebkitTapHighlightColor: "transparent" }}>
      <span style={{ width: d, height: d, borderRadius: "50%", background: bg,
                     display: "flex", alignItems: "center", justifyContent: "center",
                     boxShadow: big ? "0 6px 18px rgba(229,87,62,0.45)" : "0 3px 10px rgba(150,90,30,0.16)" }}>
        {children}
      </span>
      <span style={{ fontSize: 12, color: "#8A6A45", fontWeight: 600 }}>{label}</span>
    </button>
  );
}
