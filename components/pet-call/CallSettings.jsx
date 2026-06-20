"use client";

/**
 * components/pet-call/CallSettings.jsx
 *
 * 宠物来电设置 / 来电中心（参考设计图第 2 屏）：
 * 宠物卡 + 来电类型 + 来电时间 + 重复 + 来电风格 + 声音 + 保存 / 立即体验来电。
 *
 * props: {
 *   name, avatar, hasAiAvatar, metaLine,
 *   settings, setField, saving,
 *   onSave, onTestCall, onOpenHistory, onClose,
 * }
 */

import { Clock, ChevronRight, Sparkles } from "lucide-react";
import BackButton from "@/components/icons/BackButton";
import CallTypeSelector from "@/components/pet-call/CallTypeSelector";
import { CALL_STYLES, VOICE_TYPES, REPEAT_RULES, voiceLabel } from "@/lib/petCallTemplates";

const C = { pri: "#E68645", text: "#2A2520", sub: "#8A8178", bg: "#EEE9E1", border: "#EFE3D5", light: "#FFF3E9" };

export default function CallSettings({
  name, avatar, hasAiAvatar, metaLine,
  settings, setField, saving,
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

        {/* 来电类型 */}
        <SectionTitle>来电类型</SectionTitle>
        <CallTypeSelector value={settings.call_type} onChange={(v) => setField("call_type", v)} />

        {/* 时间 + 重复 */}
        <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${C.border}`, marginTop: 16,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.03)", overflow: "hidden" }}>
          <Row label="来电时间">
            <input type="time" value={settings.call_time}
              onChange={(e) => setField("call_time", e.target.value)}
              style={{ border: "none", background: "none", fontSize: 14.5, fontWeight: 700, color: C.pri,
                       textAlign: "right", outline: "none", WebkitAppearance: "none" }} />
          </Row>
          <div style={{ height: 1, background: C.border, margin: "0 14px" }} />
          <Row label="重复">
            <select value={settings.repeat_rule} onChange={(e) => setField("repeat_rule", e.target.value)}
              style={{ border: "none", background: "none", fontSize: 14.5, fontWeight: 700, color: C.pri,
                       textAlign: "right", outline: "none", WebkitAppearance: "none", cursor: "pointer" }}>
              {REPEAT_RULES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </Row>
        </div>

        {/* 来电风格 */}
        <SectionTitle>来电风格</SectionTitle>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {CALL_STYLES.map((s) => {
            const on = settings.call_style === s.id;
            return (
              <button key={s.id} onClick={() => setField("call_style", s.id)}
                style={{ padding: "9px 20px", borderRadius: 20, cursor: "pointer", fontSize: 13.5, fontWeight: 700,
                         background: on ? C.pri : "#fff", color: on ? "#fff" : C.sub,
                         border: `1.5px solid ${on ? C.pri : C.border}`, WebkitTapHighlightColor: "transparent" }}>
                {s.label}
              </button>
            );
          })}
        </div>

        {/* 声音选择 */}
        <SectionTitle>声音选择</SectionTitle>
        <button
          onClick={() => {
            const idx = VOICE_TYPES.findIndex((v) => v.id === settings.voice_type);
            const next = VOICE_TYPES[(idx + 1) % VOICE_TYPES.length];
            setField("voice_type", next.id);
          }}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                   background: "#fff", borderRadius: 16, border: `1px solid ${C.border}`, padding: "14px 16px",
                   cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
          <span style={{ fontSize: 14.5, fontWeight: 700, color: C.text }}>🔊 {voiceLabel(settings.voice_type)}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, color: C.sub }}>
            更换声音 <ChevronRight size={16} color={C.sub} />
          </span>
        </button>
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

function Row({ label, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
      <span style={{ fontSize: 14.5, fontWeight: 700, color: "#2A2520" }}>{label}</span>
      {children}
    </div>
  );
}
