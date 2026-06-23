/**
 * services/petCallAi.js
 *
 * 【AI 宠物来电 · 大脑】前端调用 /api/pet-call-ai（DeepSeek 生成开场白 / 选项回应 / 记忆总结）。
 *   - 不含任何密钥；DeepSeek 调用在服务端。
 *   - 开场白 / 回应都带「超时 + 模板兜底」：DeepSeek 慢或失败时立刻回退现有文案，绝不让通话冷场。
 *   - 豆包 TTS 不在这里——调用方拿到最终文本后再交给 services/petVoiceClient 朗读。
 */

/** 带超时的 fetch；超时 / 网络错误 / 非 2xx → 返回 null（由调用方决定兜底）。 */
async function callCallAi(payload, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch("/api/pet-call-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    if (!resp.ok) return null;
    return await resp.json().catch(() => null);
  } catch {
    return null; // 超时（abort）或网络错误
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 生成电话开场白。
 * @param opts { userId, petId, pet, callType, growthLevel, clientHour, clientMinute, fallback, timeoutMs }
 * @returns string —— 成功返回生成文本，失败/超时返回 fallback（现有模板字幕）。
 */
export async function generateCallOpening(opts = {}) {
  const { fallback = "", timeoutMs = 3500, ...payload } = opts;
  const data = await callCallAi({ ...payload, mode: "opening" }, timeoutMs);
  const text = (data?.text || "").trim();
  return text || fallback;
}

/**
 * 生成用户选项后的宠物回应（单轮）。
 * @param opts { userId, petId, pet, callType, opening, userChoice, growthLevel, clientHour, clientMinute, fallback, timeoutMs }
 * @returns string —— 成功返回生成文本，失败/超时返回 fallback（按钮自带的 petReply 模板）。
 */
export async function generateCallReply(opts = {}) {
  const { fallback = "", timeoutMs = 4000, ...payload } = opts;
  const data = await callCallAi({ ...payload, mode: "reply" }, timeoutMs);
  const text = (data?.text || "").trim();
  return text || fallback;
}

/**
 * 电话结束后总结记忆（写入 source='call'，在服务端完成）。
 * 失败静默返回 { saved: 0 }，绝不影响挂断流程。
 * @param opts { userId, petId, pet, callType, opening, userChoice, petReply, timeoutMs }
 */
export async function summarizeCall(opts = {}) {
  const { timeoutMs = 8000, ...payload } = opts;
  const data = await callCallAi({ ...payload, mode: "summary" }, timeoutMs);
  return { saved: data?.saved || 0, memories: data?.memories || [] };
}
