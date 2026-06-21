"use client";

/**
 * components/pet-call/PetCallCenter.jsx
 *
 * 【AI 宠物来电】全屏浮层容器。view 状态机切 8 画面（非真实路由）：
 *   settings → preview → incoming → active(语音 ⇄ chat 聊天) → ended → history
 *
 * 两种进入方式：
 *   1) 手动：首页入口点开 → 进设置页；「立即体验来电」默认演示「想你来电」场景。
 *   2) 自动：petCallTriggerService 命中 → 接入点已建好 incoming 记录并传入 initialTrigger
 *      → 直接进「来电中」，用触发场景的字幕/情绪/叫声；接听/挂断/完成时 update 该记录。
 *
 * 场景驱动：情绪 / 猫狗叫声 / 字幕语气由 lib/petCallEmotionMap 自动匹配（无音频静默回退、不报错）。
 *
 * props: { user, pet, onClose, initialTrigger? }
 *   initialTrigger = { recordId, scene, call_type, subtitle, emotion, sound_key, triggered_at, ... }
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { isCatPet } from "@/services/breedAvatar";
import { formatPetAge } from "@/services/petAge";
import { usePetCall } from "@/hooks/usePetCall";
import { getCallSettings, saveCallSettings, addCallRecord, updateCallRecord, markFeedingDone } from "@/services/petCallService";
import { setMedDoneToday } from "@/services/petHealthService";
import { DEFAULT_SCENES } from "@/lib/petCallTemplates";
import { getPetCallQuickActions } from "@/lib/petCallQuickActions";
import { playPetVoice, triggerForScene, resolveCallEmotion } from "@/lib/petCallEmotionMap";
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

export default function PetCallCenter({ user, pet, onClose, onNavigate, initialTrigger }) {
  const auto = initialTrigger || null;            // 自动来电触发信息（含 recordId）
  const recordId = auto?.recordId || null;

  const [view, setView] = useState(auto ? "incoming" : "settings");
  const [callMode, setCallMode] = useState("voice");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [scenes, setScenes] = useState(DEFAULT_SCENES);
  const [currentScene, setCurrentScene] = useState(auto?.scene || "miss_you");
  const [saving, setSaving] = useState(false);
  const [endedDuration, setEndedDuration] = useState(0);
  const [notice, setNotice] = useState(null);

  const call = usePetCall();
  const startedAtRef = useRef(auto?.triggered_at || null);

  const toast = useCallback((msg) => {
    setNotice(msg);
    if (toast._t) clearTimeout(toast._t);
    toast._t = setTimeout(() => setNotice(null), 2200);
  }, []);

  /* ── 宠物展示数据（优先 AI 形象）── */
  const name = pet?.name || "毛孩子";
  const avatar = pet?.ai_avatar_url || pet?.pet_avatar_thumb_url || (isCatPet(pet) ? "/cat.png" : "/dog.png");
  const hasAiAvatar = !!pet?.ai_avatar_url;
  const petType = isCatPet(pet) ? "cat" : "dog";
  const genderLabel = pet?.gender === "female" ? "女孩" : pet?.gender === "male" ? "男孩" : null;
  const ageStr = formatPetAge(pet?.birthday);
  const metaLine = [pet?.breed, ageStr, genderLabel].filter(Boolean).join(" · ");

  /* 当前通话的触发 context：自动来电用细分 call_type，手动体验用场景默认 context */
  const activeContext = auto ? auto.call_type : triggerForScene(currentScene);
  const subtitleTone = resolveCallEmotion(activeContext, petType).subtitleTone;
  const quickActions = getPetCallQuickActions(activeContext); // 按 call_type 动态生成快捷按钮

  /* ── 自动来电：挂载即准备好对应场景 ── */
  useEffect(() => {
    if (auto) {
      call.prepare(auto.scene || "miss_you");
      startedAtRef.current = auto.triggered_at || new Date().toISOString();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── 载入已存设置 + 场景开关 ── */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!pet?.id) return;
      try {
        const s = await getCallSettings(pet.id);
        if (alive && s) {
          setSettings({ ...DEFAULT_SETTINGS, ...s });
          setScenes({ ...DEFAULT_SCENES, ...(s.scenes && typeof s.scenes === "object" ? s.scenes : {}) });
        }
      } catch (e) {
        if (alive) toast(e.message || "加载设置失败");
      }
    })();
    return () => { alive = false; };
  }, [pet?.id, toast]);

  const setField = useCallback((field, value) => setSettings((s) => ({ ...s, [field]: value })), []);
  const onToggleScene = useCallback((id) => setScenes((p) => ({ ...p, [id]: !p[id] })), []);

  /* 自动来电：通话结束后关闭浮层；手动：回设置页 */
  const exitCall = () => { if (auto) onClose?.(); else setView("settings"); };

  /* ── 保存设置（含场景开关）── */
  const handleSave = async () => {
    if (!user?.id || !pet?.id) { toast("缺少账号或宠物信息"); return; }
    setSaving(true);
    try {
      await saveCallSettings(user.id, pet.id, { ...settings, scenes });
      toast("来电设置已保存 🐾");
    } catch (e) {
      toast(e.message || "保存失败");
    } finally { setSaving(false); }
  };

  /* ── 立即体验来电（手动）→ 推送预览，默认「想你来电」── */
  const handleTestCall = () => {
    setCurrentScene("miss_you");
    call.prepare("miss_you");
    startedAtRef.current = new Date().toISOString();
    setCallMode("voice");
    setView("preview");
  };

  /* ── 来电中：接听 / 挂断 / 稍后再说 ── */
  const handleAccept = async () => {
    call.startConversation(auto ? auto.subtitle : undefined); // 自动来电用场景专属字幕开场
    playPetVoice(activeContext, petType);                     // 狗用狗叫、猫用猫叫；无文件静默
    if (recordId) { try { await updateCallRecord(recordId, { status: "answered", answered_at: new Date().toISOString() }); } catch {} }
    setView("active");
  };

  const recordMissed = async (status) => {
    if (!user?.id || !pet?.id) return;
    try {
      await addCallRecord({
        user_id: user.id, pet_id: pet.id, call_type: currentScene,
        status, duration_seconds: 0,
        started_at: startedAtRef.current, ended_at: new Date().toISOString(),
      });
    } catch { /* 记录失败不阻断体验 */ }
  };

  const finishMissed = async (status) => {
    if (recordId) {
      try { await updateCallRecord(recordId, { status, ended_at: new Date().toISOString() }); } catch {}
    } else {
      await recordMissed(status);
    }
  };

  const handleDecline = async () => { await finishMissed("declined"); toast("已挂断"); exitCall(); };
  const handleLater = async () => { await finishMissed("missed"); toast("好的，我等你有空再聊～"); exitCall(); };

  /* ── 通话中：快捷按钮动作（按 call_type 动态，复用现有业务/页面）── */
  const doConfirmMedicine = async () => {
    const recId = auto?.trigger_source_id?.split("_")[1]; // med_{diseaseId}_{date} → diseaseId
    if (recId) { try { setMedDoneToday(recId, true); } catch {} } // 复用现有「完成用药」
    if (recordId) { try { await updateCallRecord(recordId, { status: "completed", ended_at: new Date().toISOString() }); } catch {} }
    toast("已记录本次用药");
    setTimeout(() => handleHangup(), 1300);
  };

  const doConfirmFeeding = async () => {
    const idx = auto?.trigger_source_id?.split("_")[3]; // feed_{petId}_{date}_{idx} → idx
    if (idx != null && idx !== "") markFeedingDone(pet.id, Number(idx)); // 复用首页同款「完成喂食」打卡
    if (recordId) { try { await updateCallRecord(recordId, { status: "completed", ended_at: new Date().toISOString() }); } catch {} }
    toast("已记录本次喂食");
    setTimeout(() => handleHangup(), 1300);
  };

  const navigateAfter = (target) => {
    if (recordId) updateCallRecord(recordId, { status: "answered", answered_at: new Date().toISOString() }).catch(() => {});
    setTimeout(() => { if (onNavigate) onNavigate(target); else onClose?.(); }, 800); // 显示宠物回复后再跳转
  };

  const finishStatus = async (status, toastMsg) => {
    if (recordId) { try { await updateCallRecord(recordId, { status, ended_at: new Date().toISOString() }); } catch {} }
    else { await recordMissed(status); }
    if (toastMsg) toast(toastMsg);
    setTimeout(() => exitCall(), 1000);
  };

  const saveMemory = async (done) => {
    if (recordId) { try { await updateCallRecord(recordId, { status: done ? "completed" : "answered" }); } catch {} }
    toast(done ? "好的，已记下啦 🐾" : "好的，我陪你慢慢来");
    // 第一版继续对话，不强制结束（memory_followup 表状态更新留待后续接入）
  };

  const handleAction = (btn) => {
    if (btn.replyText) {
      call.pushExchange(btn.replyText, btn.petReply || null);
      if (btn.petReply) playPetVoice(activeContext, petType); // 宠物每说一句播放对应情绪叫声
    }
    switch (btn.action) {
      case "end_call": handleHangup(); break;
      case "open_chat": setCallMode("chat"); break;
      case "confirm_medicine": doConfirmMedicine(); break;
      case "confirm_feeding": doConfirmFeeding(); break;
      case "go_medicine":
      case "go_health": navigateAfter("health"); break;
      case "go_feeding": navigateAfter("feeding"); break;
      case "go_walk":
      case "go_walk_nearby": navigateAfter("social"); break;
      case "go_card": navigateAfter("sharecard"); break;
      case "snooze": finishStatus("snoozed", "已记录，稍后提醒你"); break;
      case "dismiss": finishStatus("dismissed", null); break;
      case "save_memory_done": saveMemory(true); break;
      case "save_memory_pending": saveMemory(false); break;
      case "continue":
      default: break; // 仅推进对话，留在通话
    }
  };

  const handleHangup = () => {
    const dur = call.stop();
    setEndedDuration(dur);
    setView("ended");
  };

  /* ── 结束页：完成 → 保存/更新通话记录 ── */
  const handleDone = async (mood) => {
    if (user?.id && pet?.id) {
      const lastPet = [...call.messages].reverse().find((m) => m.from === "pet");
      const patch = {
        status: "completed", duration_seconds: endedDuration,
        script: lastPet?.text || null, mood_feedback: mood || null,
        ended_at: new Date().toISOString(),
      };
      try {
        if (recordId) await updateCallRecord(recordId, patch);
        else await addCallRecord({ user_id: user.id, pet_id: pet.id, call_type: call.callType, started_at: startedAtRef.current, ...patch });
      } catch (e) { toast(e.message || "保存记录失败"); }
    }
    toast("通话记录已保存 🐾");
    if (auto) onClose?.();
    else { call.prepare(currentScene); setView("settings"); }
  };

  const petLine = [...call.messages].reverse().find((m) => m.from === "pet")?.text || "";

  /* ── 渲染对应画面 ── */
  let screen;
  if (view === "settings") {
    screen = (
      <CallSettings
        name={name} avatar={avatar} hasAiAvatar={hasAiAvatar} metaLine={metaLine}
        settings={settings} setField={setField} scenes={scenes} onToggleScene={onToggleScene} saving={saving}
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
      quickActions, subtitleTone,
      muted: call.muted, speaker: call.speaker,
      onToggleMute: () => call.setMuted((m) => !m),
      onToggleSpeaker: () => call.setSpeaker((s) => !s),
      onAction: handleAction, onEnd: handleHangup,
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
