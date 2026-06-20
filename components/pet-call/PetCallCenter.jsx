"use client";

/**
 * components/pet-call/PetCallCenter.jsx
 *
 * 【AI 宠物来电】全屏浮层容器（沿用商城/分享卡同款浮层模式，保留底部 tab 与登录态）。
 * 内部用 view 状态机切 8 个画面（非真实路由）：
 *   settings  → 来电设置 / 中心（第 2 屏）
 *   preview   → 推送预览（第 3 屏，mock）
 *   incoming  → 来电中（第 4 屏）
 *   active    → 通话中·语音模式（第 5 屏） ⇄ chat 聊天模式（第 6 屏）
 *   ended     → 通话结束 + 心情记录（第 7 屏）
 *   history   → 通话记录（第 8 屏）
 *
 * 第一版：固定话术模板 + 模拟来电；保存设置 / 保存通话记录走真实表。
 * 预留：usePetCall.reply / startConversation 内 TODO 为后续 AI 对话 + TTS 挂点。
 *
 * props: { user, pet, onClose }
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { isCatPet } from "@/services/breedAvatar";
import { formatPetAge } from "@/services/petAge";
import { usePetCall } from "@/hooks/usePetCall";
import { getCallSettings, saveCallSettings, addCallRecord } from "@/services/petCallService";
import CallSettings from "@/components/pet-call/CallSettings";
import CallPreview from "@/components/pet-call/CallPreview";
import IncomingCall from "@/components/pet-call/IncomingCall";
import ActiveCall from "@/components/pet-call/ActiveCall";
import CallChatMode from "@/components/pet-call/CallChatMode";
import CallEnded from "@/components/pet-call/CallEnded";
import CallHistory from "@/components/pet-call/CallHistory";

const C = { pri: "#E68645", bg: "#EEE9E1" };

const DEFAULT_SETTINGS = {
  enabled: true, call_type: "miss_you", call_time: "20:00",
  repeat_rule: "daily", call_style: "coquettish", voice_type: "cute_female",
};

export default function PetCallCenter({ user, pet, onClose }) {
  const [view, setView] = useState("settings");
  const [callMode, setCallMode] = useState("voice"); // active 时：voice / chat
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [endedDuration, setEndedDuration] = useState(0);
  const [notice, setNotice] = useState(null);

  const call = usePetCall();
  const startedAtRef = useRef(null);

  const toast = useCallback((msg) => {
    setNotice(msg);
    if (toast._t) clearTimeout(toast._t);
    toast._t = setTimeout(() => setNotice(null), 2200);
  }, []);

  /* ── 宠物展示数据（优先 AI 形象）── */
  const name = pet?.name || "毛孩子";
  const avatar = pet?.ai_avatar_url || pet?.pet_avatar_thumb_url || (isCatPet(pet) ? "/cat.png" : "/dog.png");
  const hasAiAvatar = !!pet?.ai_avatar_url;
  const genderLabel = pet?.gender === "female" ? "女孩" : pet?.gender === "male" ? "男孩" : null;
  const ageStr = formatPetAge(pet?.birthday);
  const metaLine = [pet?.breed, ageStr, genderLabel].filter(Boolean).join(" · ");

  /* ── 载入已存设置 ── */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!pet?.id) return;
      try {
        const s = await getCallSettings(pet.id);
        if (alive && s) setSettings({ ...DEFAULT_SETTINGS, ...s });
      } catch (e) {
        if (alive) toast(e.message || "加载设置失败");
      }
    })();
    return () => { alive = false; };
  }, [pet?.id, toast]);

  const setField = useCallback((field, value) => {
    setSettings((s) => ({ ...s, [field]: value }));
  }, []);

  /* ── 保存设置 ── */
  const handleSave = async () => {
    if (!user?.id || !pet?.id) { toast("缺少账号或宠物信息"); return; }
    setSaving(true);
    try {
      await saveCallSettings(user.id, pet.id, settings);
      toast("来电设置已保存 🐾");
    } catch (e) {
      toast(e.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  /* ── 立即体验来电 → 推送预览 ── */
  const handleTestCall = () => {
    call.prepare(settings.call_type);
    startedAtRef.current = new Date().toISOString();
    setCallMode("voice");
    setView("preview");
  };

  /* ── 来电中：接听 / 挂断 / 稍后再说 ── */
  const handleAccept = () => {
    call.startConversation();
    setView("active");
  };

  const recordMissed = async (status) => {
    if (!user?.id || !pet?.id) return;
    try {
      await addCallRecord({
        user_id: user.id, pet_id: pet.id, call_type: settings.call_type,
        status, duration_seconds: 0,
        started_at: startedAtRef.current, ended_at: new Date().toISOString(),
      });
    } catch { /* 记录失败不阻断体验 */ }
  };

  const handleDecline = async () => {
    await recordMissed("declined");
    setView("settings");
    toast("已挂断");
  };

  const handleLater = async () => {
    await recordMissed("missed");
    setView("settings");
    toast("好的，我等你有空再聊～");
  };

  /* ── 通话中：快捷回复 / 挂断 ── */
  const handleReply = (q) => {
    const isEnd = call.reply(q);
    if (isEnd) handleHangup();
  };

  const handleHangup = () => {
    const dur = call.stop();
    setEndedDuration(dur);
    setView("ended");
  };

  /* ── 结束页：完成 → 保存通话记录 ── */
  const handleDone = async (mood) => {
    if (user?.id && pet?.id) {
      const lastPet = [...call.messages].reverse().find((m) => m.from === "pet");
      try {
        await addCallRecord({
          user_id: user.id, pet_id: pet.id, call_type: call.callType,
          status: "completed", duration_seconds: endedDuration,
          script: lastPet?.text || null, mood_feedback: mood || null,
          started_at: startedAtRef.current, ended_at: new Date().toISOString(),
        });
      } catch (e) {
        toast(e.message || "保存记录失败");
      }
    }
    call.prepare(settings.call_type);
    setView("settings");
    toast("通话记录已保存 🐾");
  };

  const petLine = [...call.messages].reverse().find((m) => m.from === "pet")?.text || "";

  /* ── 渲染对应画面 ── */
  let screen;
  if (view === "settings") {
    screen = (
      <CallSettings
        name={name} avatar={avatar} hasAiAvatar={hasAiAvatar} metaLine={metaLine}
        settings={settings} setField={setField} saving={saving}
        onSave={handleSave} onTestCall={handleTestCall}
        onOpenHistory={() => setView("history")} onClose={onClose}
      />
    );
  } else if (view === "preview") {
    screen = (
      <CallPreview
        name={name} avatar={avatar} callTime={settings.call_time}
        onAnswer={() => setView("incoming")} onClose={() => setView("settings")}
      />
    );
  } else if (view === "incoming") {
    screen = (
      <IncomingCall
        name={name} avatar={avatar}
        onAccept={handleAccept} onDecline={handleDecline} onLater={handleLater}
      />
    );
  } else if (view === "active") {
    const common = {
      name, avatar, seconds: call.seconds,
      muted: call.muted, speaker: call.speaker,
      onToggleMute: () => call.setMuted((m) => !m),
      onToggleSpeaker: () => call.setSpeaker((s) => !s),
      onReply: handleReply, onEnd: handleHangup,
    };
    screen = callMode === "chat" ? (
      <CallChatMode {...common} messages={call.messages} onSwitchToVoice={() => setCallMode("voice")} />
    ) : (
      <ActiveCall {...common} petLine={petLine} onSwitchToChat={() => setCallMode("chat")} />
    );
  } else if (view === "ended") {
    screen = <CallEnded name={name} avatar={avatar} duration={endedDuration} onDone={handleDone} />;
  } else if (view === "history") {
    screen = <CallHistory userId={user?.id} avatar={avatar} onBack={() => setView("settings")} toast={toast} />;
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 320, background: C.bg, display: "flex", justifyContent: "center" }}>
      <div style={{ position: "relative", width: "100%", maxWidth: 430, height: "100%", background: C.bg,
                    overflow: "hidden", animation: "pcc-in .22s ease-out" }}>
        {screen}
      </div>
      {notice && (
        <div style={{ position: "fixed", left: "50%", bottom: 80, transform: "translateX(-50%)", zIndex: 380,
                      maxWidth: 300, padding: "10px 18px", borderRadius: 14, fontSize: 13, fontWeight: 600,
                      textAlign: "center", background: C.pri, color: "#fff", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
          {notice}
        </div>
      )}
      <style>{`@keyframes pcc-in { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform: translateY(0); } }`}</style>
    </div>
  );
}
