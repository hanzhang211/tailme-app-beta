"use client";

/**
 * components/pet-call/PetCallCenter.jsx
 *
 * 【AI 宠物来电】全屏浮层容器。view 状态机切多画面（非真实路由）：
 *   settings → pick(选择体验场景) → preview → incoming → active(语音 ⇄ chat 聊天) → ended → history
 *
 * 两种进入方式：
 *   1) 手动：首页入口点开 → 进设置页；「立即体验来电」→ 选择想体验的来电场景 → 体验该场景。
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
import { speakPetVoice, stopPetVoice } from "@/services/petVoiceClient";
import { generateCallOpening, generateCallReply, summarizeCall } from "@/services/petCallAi";
import CallSettings from "@/components/pet-call/CallSettings";
import CallExperiencePicker from "@/components/pet-call/CallExperiencePicker";
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

/* 单通来电硬上限：≥300s 或 ≥20 条消息任一满足即「拟人化收尾」结束（防无限消耗 TTS/LLM）。 */
const MAX_DURATION = 300;   // 秒
const MAX_MESSAGES = 20;    // 用户 + 宠物消息总数
const WARN_DURATION = 270;  // 提前 30s 提示「即将结束」
const WARN_MESSAGES = 18;   // 临近轮数上限提示

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
  const [busy, setBusy] = useState(false);       // AI 生成开场白中：禁用选项按钮
  const [selected, setSelected] = useState(false); // 本通已选过一次：单轮，禁用其余按钮

  const call = usePetCall();
  const startedAtRef = useRef(auto?.triggered_at || null);
  const closingRef = useRef(false); // 收尾中：防重入 + 拦截继续点按钮
  const warnedRef = useRef(false);  // 「即将结束」提示只弹一次
  const busyRef = useRef(false);     // 与 busy 同步，供事件回调即时判断
  const selectedRef = useRef(false); // 与 selected 同步，供事件回调即时判断
  const interactionRef = useRef(null); // 本通互动 { callType, opening, userChoice, petReply }，结束时总结记忆用
  const summarizedRef = useRef(false); // 防一通电话重复总结

  const toast = useCallback((msg) => {
    setNotice(msg);
    if (toast._t) clearTimeout(toast._t);
    toast._t = setTimeout(() => setNotice(null), 2200);
  }, []);

  /* ── 宠物展示数据 ── */
  const name = pet?.name || "毛孩子";
  // 缩略图优先（300px 透明 WebP，秒加载；与首页/关怀模式一致），缺失再回退 AI 原图 / 猫狗占位
  const avatar = pet?.pet_avatar_thumb_url || pet?.ai_avatar_url || (isCatPet(pet) ? "/cat.png" : "/dog.png");
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

  /* ── 浮层卸载：停止任何正在播放的 TTS 语音 ── */
  useEffect(() => () => stopPetVoice(), []);

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

  /* ── 立即体验来电（手动）→ 先进「选择体验场景」页 ── */
  const handleTestCall = () => setView("pick");

  /* ── 选好体验场景 → 准备该场景并进入预览（整通来电的字幕/情绪/叫声/AI 开场白
     都由 currentScene 自动派生，见 activeContext）── */
  const startExperience = (sceneId) => {
    const scene = sceneId || "miss_you";
    setCurrentScene(scene);
    call.prepare(scene);
    startedAtRef.current = new Date().toISOString();
    closingRef.current = false; warnedRef.current = false; // 新通话重置上限状态
    setCallMode("voice");
    setView("preview");
  };

  /* ── 用火山 TTS 念一句宠物台词（整通用同一场景情绪）；失败仅 toast，不阻断通话 ──
     opts.loading=true 时显示「生成语音中…」（仅开场白用；对话后续句不弹提示以免打扰）。 */
  const speakLine = useCallback((text, opts = {}) => {
    const t = (text || "").trim();
    if (!t) return;
    const { emotion } = resolveCallEmotion(activeContext, petType); // 来电原始情绪，后端归一到四档
    if (opts.loading) toast("生成语音中…");
    speakPetVoice({
      text: t,
      emotion,
      petId: pet?.id,
      scene: activeContext,
      onState: (s) => { if (s === "playing") setNotice(null); }, // 开始播放即清除「生成中」提示
    }).catch(() => toast("语音生成失败，请稍后再试"));
  }, [activeContext, petType, pet?.id, toast]);

  /* ── 来电中：接听 / 挂断 / 稍后再说 ── */
  const handleAccept = async () => {
    // 新通话重置所有运行时标志（上限 / 单轮 / AI 忙 / 记忆总结）
    closingRef.current = false; warnedRef.current = false;
    selectedRef.current = false; setSelected(false);
    interactionRef.current = null; summarizedRef.current = false;
    busyRef.current = true; setBusy(true);

    // 模板字幕兜底：DeepSeek 慢/失败时用它（保证有内容、能出声）
    const fallbackOpening =
      auto?.subtitle || resolveCallEmotion(activeContext, petType).subtitle || "主人～我今天也有乖乖想你哦～";

    // 立即：进入通话页、播叫声（秒出声）、先显示兜底字幕并开始计时
    call.startConversation(fallbackOpening);
    playPetVoice(activeContext, petType);
    setView("active");
    if (recordId) updateCallRecord(recordId, { status: "answered", answered_at: new Date().toISOString() }).catch(() => {});

    // DeepSeek 生成开场白（带超时 + 模板兜底）→ 更新字幕 → 火山 TTS 念出
    const opening = await generateCallOpening({
      userId: user?.id, petId: pet?.id, pet: aiPetPayload(),
      callType: activeContext, growthLevel: pet?.ai_level,
      clientHour: new Date().getHours(), clientMinute: new Date().getMinutes(),
      fallback: fallbackOpening,
    });
    busyRef.current = false; setBusy(false);
    if (closingRef.current) return;        // 期间已挂断/收尾则不再处理
    call.setOpeningLine(opening);          // 更新第一条宠物气泡为最终开场白
    speakLine(opening, { loading: true }); // 火山 TTS 念开场白
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

  /* ── 通话中：用户点选项 → DeepSeek 生成回应 + 单轮收尾（复用现有业务/页面）── */

  // 给 DeepSeek 的当前宠物资料（电话与聊天共用同一份人格输入）
  const aiPetPayload = useCallback(() => ({
    name: pet?.name,
    pet_type: petType,
    breed: pet?.breed,
    ageText: ageStr,
    gender: pet?.gender,
    weight: pet?.weight,
    personality: pet?.personality,
  }), [pet?.name, petType, pet?.breed, ageStr, pet?.gender, pet?.weight, pet?.personality]);

  // 本通宠物说的第一句（开场白）——生成回应时作上下文
  const firstPetLine = useCallback(() => {
    const m = call.messages.find((x) => x.from === "pet");
    return m?.text || "";
  }, [call.messages]);

  // 选项 → 收尾后跳转的页面（无则挂断）
  const navTargetOf = (action) => ({
    go_medicine: "health", go_health: "health",
    go_feeding: "feeding", go_walk: "social", go_walk_nearby: "social",
    go_card: "sharecard",
  }[action] || null);

  // 仅打卡（复用现有「完成用药 / 完成喂食」，不改其数据结构；挂断交给统一收尾）
  const medicineCheckin = () => {
    const recId = auto?.trigger_source_id?.split("_")[1]; // med_{diseaseId}_{date} → diseaseId
    if (recId) { try { setMedDoneToday(recId, true); } catch {} }
    toast("已记录本次用药");
  };
  const feedingCheckin = () => {
    const idx = auto?.trigger_source_id?.split("_")[3]; // feed_{petId}_{date}_{idx} → idx
    if (idx != null && idx !== "") markFeedingDone(pet.id, Number(idx));
    toast("已记录本次喂食");
  };

  // 电话结束时总结本通记忆（DeepSeek 提取 0-3 条 → 写入 pet_ai_memories，source='call'）。
  // 只在用户真的互动过（选过选项）时才调用；后台进行、失败静默，绝不阻塞挂断/跳转。
  const summarizeIfNeeded = useCallback(() => {
    if (summarizedRef.current) return;
    const it = interactionRef.current;
    if (!it || !it.userChoice) return; // 没有实质互动 → 不浪费一次 DeepSeek 调用
    summarizedRef.current = true;
    summarizeCall({
      userId: user?.id, petId: pet?.id, pet: aiPetPayload(),
      callType: it.callType, opening: it.opening, userChoice: it.userChoice, petReply: it.petReply,
    }).catch(() => {}); // route 内部已 console.error；写入失败不影响通话
  }, [user?.id, pet?.id, aiPetPayload]);

  const navigateAfter = (target) => {
    summarizeIfNeeded(); // 跳转前后台总结本通记忆（不阻塞）
    if (recordId) updateCallRecord(recordId, { status: "answered", answered_at: new Date().toISOString() }).catch(() => {});
    setTimeout(() => { if (onNavigate) onNavigate(target); else onClose?.(); }, 800); // 显示宠物回复后再跳转
  };

  /* 用户点选项 → DeepSeek 生成「挂断前最后一句」→ TTS 念 → 念完 2 秒收尾（单轮，禁用其余按钮）。 */
  const handleAction = async (btn) => {
    if (closingRef.current || busyRef.current || selectedRef.current) return;

    // 「先挂了」：用户主动挂断，立即结束，不生成回应
    if (btn.action === "end_call") {
      selectedRef.current = true; setSelected(true);
      if (btn.replyText) call.pushExchange(btn.replyText, null);
      handleHangup();
      return;
    }

    selectedRef.current = true; setSelected(true); // 单轮：禁用其余按钮

    // 1) 用户气泡
    if (btn.replyText) call.pushExchange(btn.replyText, null);

    // 2) 业务副作用（仅打卡，不在此挂断/跳转）
    if (btn.action === "confirm_medicine") medicineCheckin();
    else if (btn.action === "confirm_feeding") feedingCheckin();

    // 3) DeepSeek 生成挂断前最后一句（带超时 + 用按钮原 petReply 兜底）
    const reply = await generateCallReply({
      userId: user?.id, petId: pet?.id, pet: aiPetPayload(),
      callType: activeContext, opening: firstPetLine(),
      userChoice: btn.replyText || btn.label,
      growthLevel: pet?.ai_level,
      clientHour: new Date().getHours(), clientMinute: new Date().getMinutes(),
      fallback: btn.petReply || (petType === "cat" ? "好啦，我先乖乖挂电话啦，记得想我哦～喵～" : "好啦，我先乖乖挂电话啦，记得想我哦～汪～"),
    });
    if (closingRef.current) return; // 期间已被上限收尾

    // 4) 宠物回应气泡 + 叫声 + 火山 TTS 念出
    call.pushExchange(null, reply);
    // 记录本通互动，供结束时总结记忆（source='call'）
    interactionRef.current = {
      callType: activeContext,
      opening: firstPetLine(),
      userChoice: btn.replyText || btn.label,
      petReply: reply,
    };
    playPetVoice(activeContext, petType);

    // 5) 念完（或失败）后 2 秒收尾：跳转类→去对应页；其余→挂断进结束页
    const target = navTargetOf(btn.action);
    const finish = () => {
      if (closingRef.current) return;
      closingRef.current = true; // 防与上限收尾重复
      if (target) navigateAfter(target);
      else handleHangup();
    };
    let done = false;
    const schedule = () => { if (done) return; done = true; setTimeout(finish, 2000); };
    const { emotion } = resolveCallEmotion(activeContext, petType);
    speakPetVoice({ text: reply, emotion, petId: pet?.id, scene: activeContext })
      .then(schedule)
      .catch(() => { toast("语音生成失败，请稍后再试"); schedule(); });
    setTimeout(() => { if (!done) { done = true; finish(); } }, 9000); // 兜底：最多 9s 必收尾
  };

  const handleHangup = () => {
    stopPetVoice();
    summarizeIfNeeded(); // 后台总结本通记忆（不阻塞挂断；失败静默）
    const dur = call.stop();
    setEndedDuration(dur);
    setView("ended");
  };

  /* ── 达到时长/轮数上限：拟人化收尾后自动结束（不硬断线）── */
  const autoEndCall = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true; // 立即拦截后续点击
    const closing = petType === "cat"
      ? "我有点困啦～我们下次再聊哦 🐱"
      : "我有点累啦～我们下次再聊哦 🐶";
    call.pushExchange(null, closing); // 先说最后一句（仅宠物气泡）
    const { emotion } = resolveCallEmotion(activeContext, petType);
    let done = false;
    const finish = () => { if (done) return; done = true; handleHangup(); }; // handleHangup 内已 stopPetVoice
    speakPetVoice({ text: closing, emotion, petId: pet?.id, scene: activeContext })
      .then(() => setTimeout(finish, 500))   // 念完最后一句 → 收尾进结束页
      .catch(() => setTimeout(finish, 800)); // TTS 失败也照常收尾
    setTimeout(finish, 8000);                // 兜底：最多 8s 必结束，绝不卡死
  }, [petType, activeContext, pet?.id, call, handleHangup]);

  /* ── 上限监听：仅通话中（active）；到警戒值提示一次、到上限拟人化收尾 ── */
  useEffect(() => {
    if (view !== "active" || closingRef.current) return;
    const dur = call.seconds;
    const msgs = call.messages.length;
    if (dur >= MAX_DURATION || msgs >= MAX_MESSAGES) {
      autoEndCall();
    } else if (!warnedRef.current && (dur >= WARN_DURATION || msgs >= WARN_MESSAGES)) {
      warnedRef.current = true;
      toast("通话即将结束…");
    }
  }, [view, call.seconds, call.messages.length, autoEndCall, toast]);

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
        scenes={scenes} onToggleScene={onToggleScene} saving={saving}
        onSave={handleSave} onTestCall={handleTestCall}
        onOpenHistory={() => setView("history")} onClose={onClose}
      />
    );
  } else if (view === "pick") {
    screen = (
      <CallExperiencePicker
        name={name} avatar={avatar}
        onPick={startExperience} onBack={() => setView("settings")}
      />
    );
  } else if (view === "preview") {
    screen = (
      <CallPreview
        name={name} avatar={avatar}
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
      disabled: busy || selected, // 生成开场白中 / 已选过：禁用选项（单轮 + 防重复点击）
    };
    screen = callMode === "chat" ? (
      <CallChatMode {...common} messages={call.messages} onSwitchToVoice={() => setCallMode("voice")} />
    ) : (
      // 电话不是聊天入口：右上角「聊天」改为温柔提示，引导挂断后从正常 AI 聊天进入（不在电话内进聊天）
      <ActiveCall {...common} petLine={petLine}
        onSwitchToChat={() => toast("挂断后可以从首页的 AI 聊天，继续和我聊哦～")} />
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
