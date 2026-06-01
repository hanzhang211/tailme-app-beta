/**
 * services/petAiChat.js
 *
 * 客户端安全的 AI 宠物聊天辅助函数（不含任何密钥）。
 * 真正的 DeepSeek 调用在服务端 /api/pet-ai-chat 完成。
 */

export const EXP_PER_LEVEL = 20;

// 根据经验值计算等级（每 20 exp 升一级，从 1 级起，不封顶）
export function levelFromExp(exp) {
  const e = Math.max(0, Number(exp) || 0);
  return Math.floor(e / EXP_PER_LEVEL) + 1;
}

// 成长称号
export function aiLevelTitle(level) {
  const lv = Number(level) || 1;
  if (lv >= 20) return "灵魂陪伴";
  if (lv >= 10) return "最好的朋友";
  if (lv >= 5)  return "熟悉的小伙伴";
  return "刚刚认识";
}

// 本次升级所需进度（0~1），用于 UI 展示
export function levelProgress(exp) {
  const e = Math.max(0, Number(exp) || 0);
  return (e % EXP_PER_LEVEL) / EXP_PER_LEVEL;
}

/**
 * 生成开场问候（纯前端，不调用 AI）。
 * 依据：当前时间 + 宠物性格 + 距上次聊天时长。
 */
export function buildOpeningMessage(pet, { now = new Date(), lastChatAt = null } = {}) {
  const name = pet?.name || "我";
  const hour = now.getHours();
  const minute = now.getMinutes();
  const isDeepNight = isNightTime(hour, minute);

  // 很久没聊（> 3 天）
  if (lastChatAt) {
    const days = (now.getTime() - new Date(lastChatAt).getTime()) / 86400000;
    if (days >= 3) return "好久没和你说话啦，我有点想你了呢～";
  }

  if (isDeepNight) {
    return "这么晚还没睡呀？是不是有点心事。我不吵你，就静静在这里陪着你。";
  }
  if (hour >= 5 && hour < 12)  return "早上好呀～新的一天，今天想做点什么呢？";
  if (hour >= 12 && hour < 18) return "主人今天过得怎么样呀？有没有什么想和我分享的？";
  return "晚上好～忙了一天啦，来陪我聊聊天吧。";
}

// 深夜模式：22:30 – 05:00
export function isNightTime(hour, minute) {
  if (hour > 22) return true;            // 23:xx
  if (hour === 22 && minute >= 30) return true; // 22:30–22:59
  if (hour < 5) return true;             // 00:00–04:59
  return false;
}

/**
 * 调用后端聊天接口。
 * payload: { message, pet, recentMessages, memories, growthLevel, clientHour, clientMinute }
 * 返回: { reply, newMemory }
 */
export async function sendPetChat(payload) {
  const resp = await fetch("/api/pet-ai-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data?.error || `聊天失败 (${resp.status})`);
  }
  return data;
}
