"use client";

/**
 * services/petVoiceClient.ts
 *
 * 【AI 宠物来电 · TTS】前端调用 /api/pet-voice/tts + 播放管理。
 *   - generatePetVoice(): 调后端拿 audioBase64 / audioUrl（不直接播放）。
 *   - speakPetVoice():    生成并播放；模块级单例 audio 防止多段叠加；通过 onState 回调驱动按钮文案/loading。
 *   - stopPetVoice():     停止当前播放（挂断 / 组件卸载时调用）。
 *
 * ⚠️ 不含任何密钥；Access Token 只在 app/api/pet-voice/tts/route.ts 服务端。
 * 后续缓存：相同 text + emotion + voice 复用旧音频，避免重复计费（第二版接 Supabase Storage）。
 */

import { DEFAULT_TEST_TEXT, DEFAULT_EMOTION } from "@/lib/petVoiceConfig";

export type PetVoiceState = "loading" | "playing" | "ended" | "error";

export interface PetVoiceOptions {
  text?: string;
  emotion?: string; // 'happy'|'cute'|'sad'|'calm'，或来电原始情绪（后端归一）
  petId?: string;
  scene?: string;
  onState?: (state: PetVoiceState) => void;
}

interface TtsResult {
  success: boolean;
  audioBase64?: string;
  audioUrl?: string;
  audioContentType?: string;
  text?: string;
  error?: string;
}

// 模块级单例：复用同一个 audio 元素（iOS 连播关键——已解锁的元素切 src 可继续 play）
let currentAudio: HTMLAudioElement | null = null;
// 播放令牌：每次新播放 +1；stopPetVoice 也 +1，使正在进行的分句队列失效（防叠加 / 挂断后续句不再播）
let playToken = 0;

/** 按中英文句末标点切句，过短碎片并入相邻句，避免单字成句。不用 lookbehind（兼容老版 iOS WKWebView）。 */
function splitSentences(text: string): string[] {
  const raw = (text || "").trim();
  if (!raw) return [];
  const parts = (raw.match(/[^。！？!?；;~～\n]+[。！？!?；;~～\n]*/g) || [])
    .map((s) => s.trim())
    .filter(Boolean);
  const merged: string[] = [];
  for (const p of parts) {
    const last = merged[merged.length - 1];
    if (last && (p.length <= 2 || last.length <= 2)) merged[merged.length - 1] = last + p;
    else merged.push(p);
  }
  return merged.length ? merged : [raw];
}

/** 调后端合成，拿到可播放的数据；失败抛出带文案的 Error（由调用方 toast）。 */
export async function generatePetVoice(opts: PetVoiceOptions = {}): Promise<TtsResult> {
  const { text, emotion, petId, scene } = opts;
  const res = await fetch("/api/pet-voice/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: text || DEFAULT_TEST_TEXT,
      emotion: emotion || DEFAULT_EMOTION,
      petId: petId || undefined,
      scene: scene || undefined,
    }),
  });
  const data: TtsResult | null = await res.json().catch(() => null);
  if (!data || !data.success) {
    throw new Error(data?.error || "语音生成失败，请稍后再试");
  }
  return data;
}

/** 停止并清除当前播放（幂等，可随时调用）。 */
export function stopPetVoice() {
  playToken++; // 使正在进行的分句队列失效（不再合成/播放后续句）
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {
      /* 忽略 */
    }
    currentAudio.onended = null;
    currentAudio.onerror = null;
    // 保留元素复用（iOS 连播）：不置 null
  }
}

/**
 * 生成并播放宠物语音（分句流式队列）。
 * 把整段文本按句切分，逐句「合成 → 播放」：第一句先播，后续句在播放当前句时**提前合成**好、无缝接上，
 * 首句延迟只取决于第一句的合成时间（而非整段）。复用同一 audio 元素以提升 iOS 连播成功率。
 *
 * onState：loading → playing → ended。某句合成/播放失败则跳过该句（不中断队列）；
 * 全部失败才抛 Error（由调用方 toast，叫声+字幕已兜底）；被挂断/新一轮播放则静默结束。
 */
export async function speakPetVoice(opts: PetVoiceOptions = {}): Promise<void> {
  if (typeof window === "undefined" || typeof Audio === "undefined") return;
  const { text, emotion, petId, scene, onState } = opts;

  const sentences = splitSentences(text || DEFAULT_TEST_TEXT);
  if (!sentences.length) return;

  stopPetVoice();               // 停旧的（同时 ++playToken）
  const myToken = ++playToken;  // 本次队列令牌
  onState?.("loading");

  if (!currentAudio) currentAudio = new Audio();
  const audio = currentAudio;

  // 合成单句 → 可播放 src；失败返回 null（跳过该句，不中断队列）
  const synth = async (s: string): Promise<string | null> => {
    try {
      const data = await generatePetVoice({ text: s, emotion, petId, scene });
      return data.audioUrl || `data:${data.audioContentType || "audio/mp3"};base64,${data.audioBase64}`;
    } catch {
      return null;
    }
  };

  // 播放单句（复用 audio）→ onended / 失败 / 被拦 都 resolve（绝不抛错卡住队列）
  const playOne = (src: string) =>
    new Promise<void>((resolve) => {
      if (myToken !== playToken) return resolve();
      audio.src = src;
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      const p = audio.play();
      if (p && typeof (p as Promise<void>).then === "function") {
        (p as Promise<void>)
          .then(() => { if (myToken === playToken) onState?.("playing"); })
          .catch(() => resolve()); // 自动播放被拦/失败 → 跳过该句
      } else {
        onState?.("playing");
      }
    });

  // 流水线：播当前句的同时，提前合成下一句
  let nextSynth = synth(sentences[0]);
  let playedAny = false;
  for (let i = 0; i < sentences.length; i++) {
    if (myToken !== playToken) break;            // 已被取消（挂断 / 新一轮）
    const src = await nextSynth;
    if (myToken !== playToken) break;
    if (i + 1 < sentences.length) nextSynth = synth(sentences[i + 1]);
    if (src) { playedAny = true; await playOne(src); }
  }

  if (myToken !== playToken) return;             // 被取消：静默结束
  onState?.(playedAny ? "ended" : "error");
  if (!playedAny) throw new Error("语音生成失败，请稍后再试");
}
