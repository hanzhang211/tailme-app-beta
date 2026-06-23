/**
 * lib/petVoiceConfig.ts
 *
 * 【AI 宠物来电 · TTS】情绪 → 火山合成参数（语速/音高/音量）映射、默认测试文案、情绪归一。
 *
 * ⚠️ 本文件只放「纯常量 / 纯函数」，前后端均可安全 import；
 *    绝不读取任何密钥（VOLC_TTS_ACCESS_TOKEN 等仅在 app/api/pet-voice/tts/route.ts 服务端读取）。
 *
 * 后续缓存：相同 text + emotion + voice 可复用旧音频，避免重复计费（第二版接 Supabase Storage）。
 */

export type PetVoiceEmotion = "cute" | "happy" | "sad" | "calm";

export const DEFAULT_EMOTION: PetVoiceEmotion = "cute";
export const DEFAULT_TEST_TEXT = "主人～我今天也有乖乖想你哦～";

/* 四档情绪 → 火山 audio 参数（数值按需求约定，勿随意改动） */
export const EMOTION_PRESETS: Record<
  PetVoiceEmotion,
  { speed_ratio: number; pitch_ratio: number; volume_ratio: number }
> = {
  cute: { speed_ratio: 0.95, pitch_ratio: 1.12, volume_ratio: 1 }, // 撒娇小狗音
  happy: { speed_ratio: 1.12, pitch_ratio: 1.08, volume_ratio: 1 }, // 元气小狗音
  sad: { speed_ratio: 0.85, pitch_ratio: 0.96, volume_ratio: 0.9 }, // 委屈小狗音
  calm: { speed_ratio: 0.9, pitch_ratio: 1, volume_ratio: 0.95 }, // 安心陪伴音
};

/**
 * 来电情绪归一表：lib/petCallEmotionMap 里的情绪有十几种（happy/cute/sleepy/caring/worried/
 * angry_cute/excited/excited_waiting/sad…），统一收敛到上面四档。
 */
const EMOTION_ALIASES: Record<string, PetVoiceEmotion> = {
  cute: "cute",
  happy: "happy",
  excited: "happy",
  excited_waiting: "happy",
  sad: "sad",
  worried: "sad",
  angry_cute: "cute", // 「哼，有点小生气」——撒娇式抱怨，归撒娇音
  caring: "calm",
  sleepy: "calm",
  calm: "calm",
};

/** 把任意来电情绪（或四档之一）归一到四档；未知一律回退 cute。 */
export function normalizeEmotion(raw?: string | null): PetVoiceEmotion {
  if (!raw) return DEFAULT_EMOTION;
  if (EMOTION_ALIASES[raw]) return EMOTION_ALIASES[raw];
  if (raw in EMOTION_PRESETS) return raw as PetVoiceEmotion;
  return DEFAULT_EMOTION;
}

/** 取某情绪对应的火山 audio 参数（已归一）。 */
export function getEmotionParams(emotion?: string | null) {
  return EMOTION_PRESETS[normalizeEmotion(emotion)];
}
