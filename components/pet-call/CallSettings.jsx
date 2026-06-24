"use client";

/**
 * components/pet-call/CallSettings.jsx
 *
 * 宠物来电设置 / 来电中心（场景驱动版）：
 * 宠物卡 + 来电场景开关 + 智能情绪声音说明 + 保存 / 立即体验来电。
 *
 * 已移除：来电风格 chip、声音选择（改为场景自动匹配情绪与叫声，见 lib/petCallEmotionMap）；
 *         来电时间 / 重复（来电按场景规则自动触发，无需用户手动设置，避免设错）。
 *
 * props: {
 *   name, avatar, hasAiAvatar, metaLine,
 *   scenes, onToggleScene, saving,
 *   onSave, onTestCall, onOpenHistory, onClose,
 * }
 */

import { Clock, Sparkles, Languages } from "lucide-react";
import BackButton from "@/components/icons/BackButton";
import CallScenes from "@/components/pet-call/CallScenes";

const C = { pri: "#E68645", text: "#2A2520", sub: "#8A8178", bg: "#EEE9E1", border: "#EFE3D5", light: "#FFF3E9" };

export default function CallSettings({
  name, avatar, hasAiAvatar, metaLine,
  scenes, onToggleScene, saving,
  onSave, onTestCall, onOpenHistory, onClose,
}) {
  return (
    <div style={{ position: "absolute", inset: 0, background: C.bg, display: "flex", flexDirection: "column" }}>
      {/* header */}
      <div style={{ padding: "max(env(safe-area-inset-top), 28px) 16px 8px", display: "flex",
                    alignItems: "center", gap: 12, flexShrink: 0 }}>
        <BackButton onClick={onClose} />
        <div style={{ flex: 1, fontSize: 18, fontWeight: 900, color: C.text }}>宠物来电设置</div>
        <button onClick={onOpenHistory} aria-label="通话记录"
          style={{ width: 38, height: 38, borderRadius: "50%", background: "#fff", border: `1px solid ${C.border}`,
                   display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
                   boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <Clock size={17} color={C.pri} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 20px" }}>
        {/* 宠物卡 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", borderRadius: 18,
                      border: `1px solid ${C.border}`, padding: "12px 14px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
          <img src={avatar} alt={name}
               style={{ width: 50, height: 50, borderRadius: "50%", objectFit: "cover", background: "#F2E5DA", flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{name}</div>
            {metaLine && <div style={{ fontSize: 12, color: C.sub, marginTop: 3 }}>{metaLine}</div>}
          </div>
        </div>

        {/* 无 AI 形象温柔提示 */}
        {!hasAiAvatar && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.light, borderRadius: 14,
                        border: "1px solid #F4D9BE", padding: "10px 12px", marginTop: 10 }}>
            <Sparkles size={16} color={C.pri} style={{ flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: "#A86E3D", lineHeight: 1.5 }}>
              生成 AI 形象后，来电会更有陪伴感哦～
            </div>
          </div>
        )}

        {/* 来电场景开关 */}
        <SectionTitle>来电场景</SectionTitle>
        <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.6, marginTop: -4, marginBottom: 12 }}>
          选择你希望宠物在哪些时刻主动给你打电话。
        </div>
        <CallScenes scenes={scenes} onToggle={onToggleScene} />

        {/* 智能情绪声音 */}
        <SectionTitle>智能情绪声音</SectionTitle>
        <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.7, marginTop: -4, marginBottom: 12 }}>
          宠物会根据不同场景，自动使用开心、撒娇、委屈、着急等叫声，并用字幕翻译它想说的话。
        </div>
        <div style={{ background: "linear-gradient(135deg,#FFF4E8,#FCE6D2)", borderRadius: 18,
                      border: "1px solid #F4D9BE", padding: "14px 16px", display: "flex", gap: 12 }}>
          <span style={{ width: 40, height: 40, borderRadius: 13, background: "#fff", flexShrink: 0,
                         display: "flex", alignItems: "center", justifyContent: "center",
                         boxShadow: "0 2px 8px rgba(230,134,69,0.2)" }}>
            <Languages size={20} color={C.pri} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#A8531C" }}>宠物语翻译模式</div>
            <div style={{ fontSize: 12, color: "#A86E3D", lineHeight: 1.7, marginTop: 4 }}>
              猫猫狗狗不会真的说人话，但它会用自己的声音表达情绪，字幕会帮你理解它想说什么。
            </div>
          </div>
        </div>
      </div>

      {/* 底部按钮 */}
      <div style={{ padding: "10px 16px max(env(safe-area-inset-bottom), 20px)", background: C.bg }}>
        <button onClick={onTestCall}
          style={{ width: "100%", padding: "13px 0", borderRadius: 14, cursor: "pointer", marginBottom: 10,
                   background: "#fff", border: `1.5px solid ${C.pri}`, color: C.pri, fontSize: 15, fontWeight: 800 }}>
          📞 立即体验来电
        </button>
        <button onClick={onSave} disabled={saving}
          style={{ width: "100%", padding: "15px 0", borderRadius: 16, border: "none",
                   cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1,
                   background: C.pri, color: "#fff", fontSize: 16, fontWeight: 800,
                   boxShadow: "0 6px 18px rgba(230,134,69,0.32)" }}>
          {saving ? "保存中…" : "保存设置"}
        </button>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 14, fontWeight: 800, color: "#2A2520", margin: "20px 0 10px" }}>{children}</div>;
}
