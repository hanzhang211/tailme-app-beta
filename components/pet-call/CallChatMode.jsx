"use client";

/**
 * components/pet-call/CallChatMode.jsx
 *
 * 通话中页面 · 聊天模式（参考设计图第 6 屏）：聊天气泡流（宠物左 / 用户右）+
 * 底部快捷回复 + 通话控制（静音 / 挂断 / 免提）。可切回「语音模式」(ActiveCall)。
 *
 * 第一版无输入框，用固定快捷回复推动对话。
 * 预留：后续可在此加输入框 + 语音识别（ASR）+ AI 回复 + TTS。
 *
 * props: {
 *   name, avatar, seconds, messages,
 *   muted, speaker, onToggleMute, onToggleSpeaker,
 *   onReply, onEnd, onSwitchToVoice,
 * }
 */

import { useRef, useEffect } from "react";
import { Mic as MicIcon } from "lucide-react";
import BackButton from "@/components/icons/BackButton";
import { Controls } from "@/components/pet-call/ActiveCall";
import { formatDuration } from "@/hooks/usePetCall";

const C = { pri: "#E68645", text: "#2A2520", sub: "#8A8178", bg: "#F4ECE0" };

// 快捷按钮配色（浅米背景上）：完成=浅绿 / 主推=橙底白 / 结束=浅红 / 其它=白底橙边
function ccActionStyle(type) {
  switch (type) {
    case "primary": return { background: "#E68645", color: "#fff", border: "1px solid #E68645" };
    case "success": return { background: "#EAF6EE", color: "#3E8E5A", border: "1px solid #8FCBA3" };
    case "danger":  return { background: "#FBE6D4", color: "#C0451F", border: "1px solid rgba(217,84,43,0.35)" };
    default:        return { background: "#fff", color: "#E68645", border: "1px solid #E68645" };
  }
}

export default function CallChatMode({
  name, avatar, seconds, messages, subtitleTone, quickActions, muted, speaker,
  onToggleMute, onToggleSpeaker, onAction, onEnd, onSwitchToVoice,
}) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  return (
    <div style={{ position: "absolute", inset: 0,
                  background: "linear-gradient(180deg,#F8EFE3 0%,#F1E4D2 100%)",
                  display: "flex", flexDirection: "column" }}>
      {/* header */}
      <div style={{ padding: "max(env(safe-area-inset-top), 28px) 16px 8px", display: "flex",
                    alignItems: "center", gap: 12, flexShrink: 0, borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
        <BackButton onClick={onEnd} />
        <div style={{ flex: 1, textAlign: "center", marginLeft: -38 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: C.text }}>{name}</div>
          <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
            {formatDuration(seconds)} · 🐾 宠物语翻译中{subtitleTone ? ` · ${subtitleTone}` : ""}
          </div>
        </div>
        <button onClick={onSwitchToVoice} aria-label="语音模式"
          style={{ width: 38, height: 38, borderRadius: "50%", border: "none", cursor: "pointer",
                   background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                   display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MicIcon size={18} color={C.pri} />
        </button>
      </div>

      {/* 气泡流 */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px 14px 8px" }}>
        {messages.map((m, i) =>
          m.from === "pet" ? (
            <div key={i} style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 14 }}>
              <img src={avatar} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", background: "#F2E5DA", flexShrink: 0 }} />
              <div style={{ maxWidth: "74%", background: "#fff", borderRadius: "4px 16px 16px 16px",
                            padding: "10px 14px", fontSize: 14.5, color: C.text, lineHeight: 1.6,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                {m.text}
              </div>
            </div>
          ) : (
            <div key={i} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
              <div style={{ maxWidth: "74%", background: C.pri, color: "#fff", borderRadius: "16px 4px 16px 16px",
                            padding: "10px 14px", fontSize: 14.5, lineHeight: 1.6,
                            boxShadow: "0 2px 8px rgba(230,134,69,0.28)" }}>
                {m.text}
              </div>
            </div>
          )
        )}
      </div>

      {/* 快捷按钮（按 call_type 动态生成，见 lib/petCallQuickActions） */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "8px 14px", flexShrink: 0 }}>
        {(quickActions || []).map((a) => (
          <button key={a.key} onClick={() => onAction(a)}
            style={{ flexShrink: 0, padding: "9px 16px", borderRadius: 18, cursor: "pointer", fontSize: 13.5, fontWeight: 700,
                     WebkitTapHighlightColor: "transparent", ...ccActionStyle(a.type) }}>
            {a.label}
          </button>
        ))}
      </div>

      {/* 底部通话控制（浅色版） */}
      <Controls muted={muted} speaker={speaker} onToggleMute={onToggleMute} onToggleSpeaker={onToggleSpeaker} onEnd={onEnd} light />
    </div>
  );
}
