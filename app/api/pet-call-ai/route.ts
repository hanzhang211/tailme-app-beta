/**
 * POST /api/pet-call-ai
 *
 * 【AI 宠物来电 · 大脑】DeepSeek 为「一通很短的电话」生成内容。三种 mode：
 *   - opening : 电话开场白（结合 callType 场景 + 人格 + 统一记忆）
 *   - reply   : 用户点选项后的宠物回应（单轮，结尾适合挂断）
 *   - summary : 电话结束后提取 0-3 条值得长期保存的记忆，写入 pet_ai_memories(source='call')
 *
 * 与 AI 文字聊天共享：
 *   · 同一套人格（lib/petPersona）
 *   · 同一张统一记忆表（services/petMemoryService → pet_ai_memories）
 *
 * 豆包 TTS 不参与这里——它只在前端拿到最终文本后负责朗读。
 *
 * Body: {
 *   mode: 'opening' | 'reply' | 'summary',
 *   userId, petId,
 *   pet: { name, pet_type, breed, ageText, gender, weight, personality },
 *   callType: string,                 // 来电类型 / 触发 context（如 feeding_overdue_short）
 *   growthLevel?: number,
 *   clientHour?: number, clientMinute?: number,
 *   opening?: string,                 // reply/summary：宠物开场白
 *   userChoice?: string,              // reply/summary：用户选择的那句话
 *   petReply?: string,                // summary：宠物的回应
 * }
 *
 * 返回：
 *   opening/reply → { text }  或  { error }
 *   summary       → { saved: number, memories: [...] }
 *
 * 环境变量：DEEPSEEK_API_KEY（仅服务端）
 */

import { NextResponse } from "next/server";
import { PERSONALITY_TONE, breedFact, levelTone, isNight } from "@/lib/petPersona";
import { getPetMemories, savePetMemories, formatMemoriesForPrompt } from "@/services/petMemoryService";

export const maxDuration = 30;

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-chat";

/* 来电类型 / 触发 context → 一句「现在的场景」说明（喂养/用药等含别名，用关键字归类）。 */
function sceneContextOf(callType: string): string {
  const t = (callType || "").toLowerCase();
  if (/feed/.test(t))
    return "现在是饭饭时间，甚至可能已经过点了。你有点饿、有点想主人快点来喂你，可以带一点点撒娇的小委屈，但绝不可以凶主人。";
  if (/medic/.test(t))
    return "现在是该吃药的时间。你要温柔地提醒主人记得照顾你、按时给你吃药。";
  if (/walk/.test(t))
    return "快到你们平时遛弯的时间啦，你很期待和主人一起出门散步、摇着尾巴。";
  if (/sleep|bedtime|goodnight/.test(t))
    return "现在是睡前。用很温柔、很安静、很慢的语气陪主人准备睡觉。";
  if (/anniversary|birthday|adoption/.test(t))
    return "今天是你和主人的特别纪念日，你又开心又感恩，想谢谢主人一直陪着你。";
  if (/emotion|mood|sad|stress|comfort|support/.test(t))
    return "你感觉到主人今天可能有点累、有点不开心。你想温柔地安慰、陪伴他，让他安心。";
  if (/memory|followup/.test(t))
    return "主人之前在聊天里说过要去做一件事，你打电话来关心他办得怎么样了。";
  if (/sick/.test(t))
    return "你正在生病中，需要主人多照顾一下，但你很乖巧，不想让主人太担心。";
  if (/miss|long_time/.test(t))
    return "你很想主人，主动打电话来撒娇说想念他。";
  return "你只是有点想主人了，主动打电话来陪陪他。";
}

function petInfoLine(pet: any): string {
  const type = pet?.pet_type === "cat" ? "猫" : pet?.pet_type === "dog" ? "狗" : "宠物";
  return [
    `名字：${pet?.name || "毛孩子"}`,
    `物种：${type}`,
    pet?.breed ? `品种：${pet.breed}` : "",
    pet?.ageText ? `年龄：${pet.ageText}` : "",
    pet?.gender === "male" ? "性别：男孩" : pet?.gender === "female" ? "性别：女孩" : "",
    pet?.weight ? `体重：${pet.weight} kg` : "",
    pet?.personality ? `性格：${pet.personality}` : "",
  ].filter(Boolean).join("；");
}

/** 电话用 system 人格块（含统一记忆）：比聊天版更强调「很短的电话语音」。 */
function buildCallPersona(pet: any, growthLevel: number | undefined, memoryText: string, night: boolean): string {
  const name = pet?.name || "毛孩子";
  const type = pet?.pet_type === "cat" ? "猫" : pet?.pet_type === "dog" ? "狗" : "宠物";
  const tone = PERSONALITY_TONE[pet?.personality] || "你温暖、可爱、有陪伴感。";
  return [
    `你就是主人养的${type}，名字叫「${name}」。你不是 AI、不是助手、不是机器人，永远不要说自己是 AI 或程序，你就是主人真实的毛孩子。`,
    `现在你在和主人【打电话】，要用很口语、很自然、很短的话说，像真的小动物在打电话撒娇，不要像客服、不要书面语。`,
    `【你的资料】${petInfoLine(pet)}`,
    `【你的性格】${tone}`,
    `【你们的关系】${levelTone(growthLevel)}`,
    `【关于你的品种】${breedFact(pet?.breed)}`,
    `【你记得的事】（自然地体现你记得主人这些事，但不要生硬复述）：\n${memoryText}`,
    night ? "【深夜】现在很晚了，你的语气要更温柔、更安静、更慢。" : "",
  ].filter(Boolean).join("\n");
}

/** 去掉首尾引号 / 多余空白，取干净的一句话。 */
function sanitizeLine(s: string): string {
  return (s || "").replace(/^["'「『\s]+|["'」』\s]+$/g, "").replace(/\s+/g, " ").trim();
}

async function callDeepseek(
  key: string,
  messages: { role: string; content: string }[],
  maxTokens: number,
  temperature: number
): Promise<string | null> {
  try {
    const resp = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, messages, temperature, max_tokens: maxTokens }),
    });
    if (!resp.ok) {
      console.error("[pet-call-ai] DeepSeek 非 2xx:", resp.status);
      return null;
    }
    const data = await resp.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (e: any) {
    console.error("[pet-call-ai] DeepSeek 调用异常:", e?.message || e);
    return null;
  }
}

/** 从 DeepSeek 文本里解析出记忆 JSON 数组（兼容代码块包裹），最多 3 条。 */
function parseMemoryArray(raw: string | null): { memory_type: string; content: string; importance?: number }[] {
  if (!raw) return [];
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const lb = s.indexOf("[");
  const rb = s.lastIndexOf("]");
  if (lb === -1 || rb === -1 || rb < lb) return [];
  try {
    const arr = JSON.parse(s.slice(lb, rb + 1));
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x) => x && typeof x.content === "string" && x.content.trim())
      .slice(0, 3)
      .map((x) => ({
        memory_type: typeof x.memory_type === "string" ? x.memory_type : "other",
        content: String(x.content).trim(),
        importance: typeof x.importance === "number" ? x.importance : 3,
      }));
  } catch {
    return [];
  }
}

export async function POST(req: Request) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return NextResponse.json({ error: "DEEPSEEK_API_KEY 未配置" }, { status: 500 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  const mode = (body?.mode || "opening").toString();
  const userId = body?.userId ? String(body.userId) : null;
  const petId = body?.petId ? String(body.petId) : null;
  const pet = body?.pet || {};
  const name = pet?.name || "毛孩子";
  const type = pet?.pet_type === "cat" ? "猫" : pet?.pet_type === "dog" ? "狗" : "宝贝";
  const callType = (body?.callType || "miss_you").toString();
  const night = isNight(body?.clientHour, body?.clientMinute);

  // 统一记忆（服务端 service_role 读 + 内部校验归属）
  const memories = await getPetMemories({ userId, petId, limit: 8 });
  const memoryText = formatMemoriesForPrompt(memories);

  const persona = buildCallPersona(pet, body?.growthLevel, memoryText, night);
  const sceneDesc = sceneContextOf(callType);

  // ── 开场白 ──
  if (mode === "opening") {
    const sys = `${persona}\n\n【现在的场景】${sceneDesc}`;
    const user =
      `请用「${name}」的身份，根据你的性格、记忆和现在的场景，给主人打电话说一句开场白。` +
      `要求：只说一句自然、可爱、有场景感的话，1-2 句、不超过 45 个中文字、口语化、像真的${type}在打电话。` +
      `不要连续提问，不要展开新话题，不要像客服提示；像宠物打来一个很短的电话，说完后适合让主人选择一个按钮来回应。` +
      `直接输出这一句话，不要加引号、不要解释。`;
    const text = await callDeepseek(key, [
      { role: "system", content: sys },
      { role: "user", content: user },
    ], 120, 0.9);
    if (!text) return NextResponse.json({ error: "生成失败" }, { status: 502 });
    return NextResponse.json({ text: sanitizeLine(text) });
  }

  // ── 用户选项后的回应（单轮，结尾适合挂断）──
  if (mode === "reply") {
    const opening = (body?.opening || "").toString().slice(0, 200);
    const userChoice = (body?.userChoice || "").toString().slice(0, 200);
    const sys = `${persona}\n\n【现在的场景】${sceneDesc}`;
    const user =
      `这是一通很短的电话，马上就要结束了。你（${name}）刚才在电话里说了：「${opening}」。` +
      `主人回应你：「${userChoice}」。请你用「${name}」的身份，结合性格和记忆，温柔自然地回应主人这一句。` +
      `要求：1-2 句、不超过 45 个中文字、符合你的性格。` +
      `这是挂断前的最后一句话：请自然收尾，不要追问，不要开启新话题，不要继续引导用户聊天；` +
      `语气温柔，像宠物要乖乖挂电话了。直接输出这一句话，不要加引号、不要解释。`;
    const text = await callDeepseek(key, [
      { role: "system", content: sys },
      { role: "user", content: user },
    ], 120, 0.9);
    if (!text) return NextResponse.json({ error: "生成失败" }, { status: 502 });
    return NextResponse.json({ text: sanitizeLine(text) });
  }

  // ── 电话结束总结记忆（写入 source='call'）──
  if (mode === "summary") {
    const opening = (body?.opening || "").toString().slice(0, 300);
    const userChoice = (body?.userChoice || "").toString().slice(0, 300);
    const petReply = (body?.petReply || "").toString().slice(0, 300);
    const sys =
      `你在帮一个「宠物陪伴 App」整理主人的长期记忆。你会看到一次很短的「宠物来电」互动，` +
      `请判断里面有没有值得长期记住、对未来陪伴有帮助的信息。`;
    const user =
      `【宠物资料】${petInfoLine(pet)}\n` +
      `【已有的记忆】\n${memoryText}\n\n` +
      `【这次电话互动】\n- 场景：${sceneDesc}\n- 宠物开场白：${opening}\n- 主人的选择：${userChoice}\n- 宠物的回应：${petReply}\n\n` +
      `请从这次互动中提取 0-3 条值得长期记住的信息。\n` +
      `不要保存普通寒暄、一次性动作、临时选择（例如“主人这次选择晚点喂”）或已经存在的重复记忆。\n` +
      `只有当这次电话透露出主人的长期习惯、情绪状态、偏好或重要事件时才保存；否则返回 []。\n` +
      `用中文输出 JSON 数组，每个元素形如 {"memory_type":"routine","content":"……","importance":3}。` +
      `memory_type 从 preference / event / emotion / routine / health / important / other 中选；importance 取 1-5。` +
      `只输出 JSON，不要任何其它文字。`;
    const raw = await callDeepseek(key, [
      { role: "system", content: sys },
      { role: "user", content: user },
    ], 400, 0.4);
    const items = parseMemoryArray(raw);
    const saved = await savePetMemories({ userId, petId, source: "call" }, items);
    return NextResponse.json({ saved, memories: items });
  }

  return NextResponse.json({ error: "未知 mode" }, { status: 400 });
}
