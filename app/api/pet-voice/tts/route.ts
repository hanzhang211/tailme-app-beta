/**
 * POST /api/pet-voice/tts
 *
 * 火山引擎 / 豆包【语音合成大模型 2.0】V3 单向流式 HTTP 接口
 *   endpoint: https://openspeech.bytedance.com/api/v3/tts/unidirectional
 *   把「AI 宠物来电」文本合成为语音，逐行拼接 base64 片段后返回完整 MP3 供前端播放。
 *
 * Body: {
 *   text: string,                                   // 要合成的宠物语音文本
 *   emotion?: 'happy' | 'cute' | 'sad' | 'calm',    // 语气，默认 cute；也接受来电原始情绪（后端归一到四档）
 *   petId?: string,                                 // 当前宠物 ID（作 uid / 后续缓存预留）
 *   scene?: string                                  // 来电场景（第一版保留字段，不强依赖）
 * }
 *
 * 成功: { success: true, audioBase64, audioContentType: 'audio/mp3', text }
 * 失败: { success: false, error }   // HTTP 200，前端统一按 body.success 判断
 *
 * 环境变量（仅服务端，勿加 NEXT_PUBLIC_ 前缀；Access Token 绝不进前端 bundle）：
 *   VOLC_TTS_APP_ID            // X-Api-App-Id
 *   VOLC_TTS_ACCESS_TOKEN      // X-Api-Access-Key
 *   VOLC_TTS_DEFAULT_VOICE     // speaker，如 zh_female_sajiaoxuemei_uranus_bigtts
 *   VOLC_TTS_RESOURCE_ID       // X-Api-Resource-Id，默认 seed-tts-2.0
 *   VOLC_TTS_CLUSTER           // V3 不需要；保留为「可选」，缺失不报错
 */

import { NextResponse } from "next/server";
import { getEmotionParams, normalizeEmotion, DEFAULT_TEST_TEXT } from "@/lib/petVoiceConfig";

export const maxDuration = 30;

const VOLC_TTS_URL = "https://openspeech.bytedance.com/api/v3/tts/unidirectional";
const STREAM_END_CODE = 20000000; // V3 流结束标志

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export async function POST(request: Request) {
  // ── 读取环境变量（cluster 可选；缺其余必填项才报错）──
  const appId = process.env.VOLC_TTS_APP_ID;
  const accessKey = process.env.VOLC_TTS_ACCESS_TOKEN;
  const speaker = process.env.VOLC_TTS_DEFAULT_VOICE;
  const resourceId = process.env.VOLC_TTS_RESOURCE_ID || "seed-tts-2.0";

  if (!appId || !accessKey || !speaker) {
    return NextResponse.json({ success: false, error: "TTS 环境变量未配置完整" }, { status: 200 });
  }

  // ── 解析请求体 ──
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    /* 容错：无 body 时用默认文案 */
  }
  const text =
    typeof body?.text === "string" && body.text.trim() ? body.text.trim() : DEFAULT_TEST_TEXT;
  const emotion = normalizeEmotion(body?.emotion);
  const preset = getEmotionParams(emotion); // { speed_ratio, pitch_ratio, volume_ratio }
  const uid =
    typeof body?.petId === "string" && body.petId ? body.petId : "tailme_pet_voice";

  // 四档情绪 → V3 audio_params 数值（速率/音量；V3 不走 pitch 数值，未知字段被忽略不报错）
  const speechRate = clamp(Math.round((preset.speed_ratio - 1) * 100), -50, 100);
  const loudnessRate = clamp(Math.round((preset.volume_ratio - 1) * 100), -50, 100);

  const payload = {
    user: { uid },
    req_params: {
      text,
      speaker,
      audio_params: {
        format: "mp3",
        sample_rate: 24000,
        speech_rate: speechRate,
        loudness_rate: loudnessRate,
      },
    },
  };

  const reqId =
    globalThis.crypto?.randomUUID?.() ||
    `tts_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  try {
    const res = await fetch(VOLC_TTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-App-Id": appId,
        "X-Api-Access-Key": accessKey,
        "X-Api-Resource-Id": resourceId,
        "X-Api-Request-Id": reqId,
      },
      body: JSON.stringify(payload),
    });

    // V3 是 NDJSON 流：必须先取整段文本，再逐行解析（不能用 res.json()）
    const raw = await res.text();

    if (!res.ok) {
      console.error("[pet-voice/tts] 火山 HTTP 非 2xx:", res.status, raw?.slice(0, 2000));
      return NextResponse.json({ success: false, error: "语音生成失败，请稍后再试" }, { status: 200 });
    }

    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    const buffers: Buffer[] = [];
    let errLine: any = null;

    for (const line of lines) {
      // 兼容 SSE 形式（去掉可能的 "data:" 前缀）
      const jsonStr = line.startsWith("data:") ? line.slice(5).trim() : line;
      let obj: any;
      try {
        obj = JSON.parse(jsonStr);
      } catch {
        continue;
      }
      if (typeof obj?.data === "string" && obj.data.length > 0) {
        buffers.push(Buffer.from(obj.data, "base64"));
      }
      const code = obj?.code;
      if (code !== undefined && code !== 0 && code !== STREAM_END_CODE) {
        errLine = obj; // 记录最后一个错误行
      }
    }

    if (buffers.length === 0) {
      console.error(
        "[pet-voice/tts] 火山无音频数据:",
        res.status,
        "errLine:",
        errLine ? JSON.stringify(errLine) : "(none)",
        "raw:",
        raw?.slice(0, 2000)
      );
      return NextResponse.json({ success: false, error: "语音生成失败，请稍后再试" }, { status: 200 });
    }

    const audioBase64 = Buffer.concat(buffers).toString("base64");
    return NextResponse.json({
      success: true,
      audioBase64,
      audioContentType: "audio/mp3",
      text,
    });
  } catch (e: any) {
    console.error("[pet-voice/tts] 调用异常:", e?.message || e);
    return NextResponse.json({ success: false, error: "语音生成失败，请稍后再试" }, { status: 200 });
  }
}
