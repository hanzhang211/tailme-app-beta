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

// 模块级单例：同一时刻只允许一段宠物语音在播
let currentAudio: HTMLAudioElement | null = null;

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
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {
      /* 忽略 */
    }
    currentAudio = null;
  }
}

/**
 * 生成并播放宠物语音。
 * 流程：onState('loading') → 合成 → 播放 onState('playing') → 结束 onState('ended')。
 * 任意失败回调 onState('error') 并抛出 Error，调用方负责 toast，绝不让页面崩溃。
 */
export async function speakPetVoice(opts: PetVoiceOptions = {}): Promise<void> {
  if (typeof window === "undefined" || typeof Audio === "undefined") return;
  const { text, emotion, petId, scene, onState } = opts;

  // 防叠加：开新的之前先停旧的
  stopPetVoice();
  onState?.("loading");

  let data: TtsResult;
  try {
    data = await generatePetVoice({ text, emotion, petId, scene });
  } catch (e) {
    onState?.("error");
    throw e;
  }

  const src = data.audioUrl || `data:${data.audioContentType || "audio/mp3"};base64,${data.audioBase64}`;

  return new Promise<void>((resolve, reject) => {
    try {
      const audio = new Audio(src);
      currentAudio = audio;
      audio.onended = () => {
        if (currentAudio === audio) currentAudio = null;
        onState?.("ended");
        resolve();
      };
      audio.onerror = () => {
        if (currentAudio === audio) currentAudio = null;
        onState?.("error");
        reject(new Error("音频播放失败"));
      };
      const p = audio.play();
      if (p && typeof (p as Promise<void>).then === "function") {
        (p as Promise<void>)
          .then(() => onState?.("playing"))
          .catch((err) => {
            if (currentAudio === audio) currentAudio = null;
            onState?.("error");
            reject(err);
          });
      } else {
        onState?.("playing");
      }
    } catch (e) {
      onState?.("error");
      reject(e);
    }
  });
}
