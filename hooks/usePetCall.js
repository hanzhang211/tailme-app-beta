"use client";

/**
 * hooks/usePetCall.js
 *
 * 「一通 AI 宠物来电」的状态机：来电类型 / 计时 / 对话推进 / 静音免提。
 * 只管「一次通话」的运行时数据；画面切换（来电中/通话中/结束…）由 PetCallCenter 的 view 控制。
 *
 * 第一版对话用 lib/petCallTemplates 的本地话术。
 * 预留扩展点（见 reply 内 TODO）：后续把推进逻辑换成 async 调 /api/pet-ai-chat + TTS 播放。
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { getOpeningLine, getNextLine, getCallType } from "@/lib/petCallTemplates";

export function usePetCall() {
  const [callType, setCallType] = useState("miss_you");
  const [messages, setMessages] = useState([]); // { from:'pet'|'user', text }
  const [step, setStep] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);

  const timerRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => () => clearInterval(timerRef.current), []);

  /** 准备一通新来电（重置所有运行时状态，进入「来电中」前调用）。 */
  const prepare = useCallback((type) => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    startRef.current = null;
    setCallType(type || "miss_you");
    setMessages([]);
    setStep(0);
    setSeconds(0);
    setMuted(false);
    setSpeaker(true);
  }, []);

  /** 接听：放出宠物开场白并开始计时。openingOverride 用于自动来电时的场景专属字幕。 */
  const startConversation = useCallback((openingOverride) => {
    const t = getCallType(callType);
    setMessages([{ from: "pet", text: openingOverride || t.flow[0] }]);
    setStep(0);
    startRef.current = Date.now();
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (startRef.current) {
        setSeconds(Math.floor((Date.now() - startRef.current) / 1000));
      }
    }, 1000);
    // TODO(后续): 这里可触发 TTS 播放开场白（语音陪伴感）
  }, [callType]);

  /** 用户点快捷回复：记用户气泡 + 宠物推进一句。返回 true 表示这是「挂断」类回复。 */
  const reply = useCallback((quickReply) => {
    if (quickReply?.end) return true; // 「先挂了」→ 交给上层挂断
    setStep((prev) => {
      const next = prev + 1;
      const petLine = getNextLine(callType, next);
      setMessages((m) => [
        ...m,
        { from: "user", text: quickReply.text },
        { from: "pet", text: petLine },
      ]);
      return next;
    });
    // TODO(后续): 改为 await generateAiReply(pet, history, style) 接真实 AI 对话 + TTS
    return false;
  }, [callType]);

  /** 直接追加一轮「用户气泡 + 宠物气泡」（快捷按钮专属对话，文案来自 petCallQuickActions）。 */
  const pushExchange = useCallback((userText, petText) => {
    setMessages((m) => {
      const next = [...m];
      if (userText) next.push({ from: "user", text: userText });
      if (petText) next.push({ from: "pet", text: petText });
      return next;
    });
  }, []);

  /** 替换开场白：DeepSeek 生成的开场白回来后，更新第一条宠物气泡（接听先用模板占位）。 */
  const setOpeningLine = useCallback((text) => {
    if (!text) return;
    setMessages((m) => {
      if (!m.length) return [{ from: "pet", text }];
      const next = [...m];
      const i = next.findIndex((x) => x.from === "pet");
      if (i === -1) next.unshift({ from: "pet", text });
      else next[i] = { ...next[i], text };
      return next;
    });
  }, []);

  /** 挂断：停止计时，返回本通最终时长（秒）。 */
  const stop = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    const dur = startRef.current
      ? Math.floor((Date.now() - startRef.current) / 1000)
      : 0;
    startRef.current = null;
    return dur;
  }, []);

  return {
    callType, messages, step, seconds, muted, speaker,
    setMuted, setSpeaker,
    prepare, startConversation, reply, pushExchange, setOpeningLine, stop,
  };
}

/** mm:ss 格式化通话时长。 */
export function formatDuration(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
