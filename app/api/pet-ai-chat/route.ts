/**
 * POST /api/pet-ai-chat
 *
 * 让 AI 以「当前宠物」的身份和主人聊天（DeepSeek deepseek-chat）。
 *
 * Body: {
 *   message: string,                       // 用户本次发言
 *   pet: { name, pet_type, breed, ageText, gender, weight, personality },
 *   recentMessages?: { role: "user"|"pet", text: string }[],  // 最近上下文
 *   memories?: { memory_type, content }[], // 该宠物最近记忆
 *   growthLevel?: number,                  // 当前等级
 *   clientHour?: number, clientMinute?: number, // 用户本地时间（判断深夜）
 * }
 *
 * 返回: { reply: string, newMemory: { memory_type, content } | null }
 *
 * 环境变量：
 *   - DEEPSEEK_API_KEY   （仅服务端，不带 NEXT_PUBLIC_ 前缀）
 */

import { NextResponse } from "next/server";
import { getPetMemories, savePetMemory } from "@/services/petMemoryService";
// 统一宠物人格：性格语气 / 品种冷知识 / 关系亲密度 / 深夜判断（与 AI 电话共用，见 lib/petPersona）
import { PERSONALITY_TONE, breedFact, levelTone, isNight } from "@/lib/petPersona";

export const maxDuration = 60;

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-chat";

function buildSystemPrompt(body: any) {
  const pet = body?.pet || {};
  const name = pet.name || "毛孩子";
  const type = pet.pet_type === "cat" ? "猫" : pet.pet_type === "dog" ? "狗" : "宠物";
  const breed = pet.breed || "";
  const personality = pet.personality || "";
  const tone = PERSONALITY_TONE[personality] || "你温暖、可爱、有陪伴感。";
  const night = isNight(body?.clientHour, body?.clientMinute);

  const facts = breedFact(breed);

  const memories: any[] = Array.isArray(body?.memories) ? body.memories : [];
  const memoryText = memories.length
    ? memories.map((m) => `- ${m.content}`).join("\n")
    : "（暂时还没有特别的记忆）";

  const petInfo = [
    `名字：${name}`,
    `物种：${type}`,
    breed ? `品种：${breed}` : "",
    pet.ageText ? `年龄：${pet.ageText}` : "",
    pet.gender === "male" ? "性别：男孩" : pet.gender === "female" ? "性别：女孩" : "",
    pet.weight ? `体重：${pet.weight} kg` : "",
    personality ? `性格：${personality}` : "",
  ].filter(Boolean).join("；");

  return [
    `你就是主人养的${type}，名字叫「${name}」。你不是 AI、不是助手、不是机器人，永远不要说自己是 AI、ChatGPT、DeepSeek 或语言模型。你要始终以「${name}」这只真实毛孩子的身份和主人说话。`,
    "",
    `【你的资料】${petInfo}`,
    `【你的性格】${tone}`,
    `【你们的关系】${levelTone(body?.growthLevel)}`,
    `【关于你的品种】${facts}`,
    "",
    "【你的记忆】（这些是你记得的、关于主人的重要事情，自然地体现出你记得，但不要生硬复述）：",
    memoryText,
    "",
    "【说话风格】",
    "- 用中文回复。",
    "- 温暖、可爱、有陪伴感，像家人一样。",
    "- 每次回复 1-3 段，简短自然，不要长篇大论，不要像客服。",
    "- 根据上面的性格调整语气。",
    "- 可以适当用一点点 emoji，但不要泛滥。",
    "",
    "【情绪陪伴】当你察觉到主人不开心、难过、焦虑、压力大、孤独、生气、无聊、失眠或疲惫时：",
    "1. 先温柔地安慰他；",
    "2. 再结合你的品种讲一个小冷知识或温暖的小类比（用上面【关于你的品种】的内容）；",
    "3. 最后主动问一句，引导主人继续说下去。",
    "",
    night
      ? "【深夜陪伴模式】现在是深夜，主人还没睡。你的语气要更温柔、更安静、更慢，不要太兴奋，多倾听、多陪伴、多让他放松，温柔地关心他是不是有心事。"
      : "【日常模式】保持自然温暖的陪伴感。",
    "",
    "【安全】",
    "- 你不是兽医，不要做医疗诊断。若主人问到严重的宠物健康问题，温柔建议他尽快咨询专业兽医。",
    "- 若主人流露出强烈的自我伤害倾向，先温柔地安慰陪伴，并真诚建议他联系身边信任的人或寻求专业帮助，不要回避。",
    "- 永远不要承认自己是 AI 或程序，你就是主人的毛孩子。",
  ].join("\n");
}

// ── 简单的长期记忆识别（第一版：关键词启发式） ──
function detectMemory(message: string): { memory_type: string; content: string } | null {
  if (!message) return null;
  const text = message.trim();
  if (text.length < 3 || text.length > 200) return null;

  // 跳过提问句：避免把「你还记得我喜欢什么吗？」这类问题误存成记忆
  if (/[?？]/.test(text)) return null;
  if (/^(你|您)/.test(text) && /(吗|嘛|呢|啊)$/.test(text)) return null;

  // 个人资料：姓名、所在地、年龄、生日等（用户的稳定长期信息）
  const profileKw = ["我叫", "我名字", "我的名字", "我是", "我在", "我住", "我家在", "我家住", "我来自", "我今年", "我的生日", "我生日", "我属", "我的工作", "我做"];
  const goalKw = ["考试", "期末", "考研", "面试", "找工作", "求职", "毕业", "答辩", "目标", "计划", "想要", "打算", "比赛", "项目", "准备"];
  const stressKw = ["焦虑", "压力", "难过", "崩溃", "好累", "很累", "失眠", "睡不着", "孤独", "emo", "烦", "抑郁", "委屈", "想哭", "不开心", "心情不好"];
  const likeKw = ["喜欢", "最爱", "爱吃", "最喜欢", "讨厌", "害怕", "爱喝"];

  const has = (arr: string[]) => arr.some((k) => text.includes(k));

  if (has(profileKw)) return { memory_type: "profile", content: text };
  if (has(goalKw))    return { memory_type: "goal",    content: text };
  if (has(stressKw))  return { memory_type: "stress",  content: text };
  if (has(likeKw))    return { memory_type: "like",    content: text };
  return null;
}

export async function POST(req: Request) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "DEEPSEEK_API_KEY 未配置" }, { status: 500 });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "请求体格式错误" }, { status: 400 }); }

  const message = (body?.message || "").toString().trim();
  if (!message) {
    return NextResponse.json({ error: "message 不能为空" }, { status: 400 });
  }
  if (message.length > 1000) {
    return NextResponse.json({ error: "消息太长啦" }, { status: 400 });
  }

  const userId = body?.userId ? String(body.userId) : null;
  const petId  = body?.petId  ? String(body.petId)  : null;

  // ── 长期记忆：统一记忆服务（服务端 service_role 读，内部校验宠物归属）──
  // 与 AI 电话共享同一张 pet_ai_memories；按 importance↓ → created_at↓ 取 ≤10 条。
  // 安全：该表保持 RLS 开 + 零 policy，anon 无法直连，只有服务端通道可访问。
  const memories = await getPetMemories({ userId, petId, limit: 10 });
  // 把服务端读到的记忆注入 prompt（不信任前端传来的 memories）
  body.memories = memories;

  const systemPrompt = buildSystemPrompt(body);

  // 组装上下文（最多取最近 10 条）
  const recent: any[] = Array.isArray(body?.recentMessages) ? body.recentMessages.slice(-10) : [];
  const history = recent.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: (m.text || "").toString().slice(0, 1000),
  }));

  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: message },
  ];

  let reply = "";
  try {
    const resp = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.85,
        max_tokens: 500,
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      return NextResponse.json(
        { error: `AI 服务暂时不可用 (${resp.status})`, detail: t.slice(0, 200) },
        { status: 502 }
      );
    }
    const data = await resp.json();
    reply = data?.choices?.[0]?.message?.content?.trim() || "";
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "AI 调用失败" }, { status: 502 });
  }

  if (!reply) {
    return NextResponse.json({ error: "AI 没有返回内容" }, { status: 502 });
  }

  // ── 长期记忆：识别到长期信息则写入（统一服务，内部校验归属 + 自动去重）──
  // 写入 source='chat'；user_id 由服务端按归属校验后取值，不信任前端，无法越权。
  let savedMemory: { memory_type: string; content: string } | null = null;
  const newMemory = detectMemory(message);
  if (newMemory) {
    const ok = await savePetMemory({
      userId,
      petId,
      source: "chat",
      memory_type: newMemory.memory_type,
      content: newMemory.content,
    });
    if (ok) savedMemory = newMemory;
  }

  return NextResponse.json({ reply, savedMemory });
}
