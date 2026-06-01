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
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const maxDuration = 60;

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-chat";

// ── 品种小冷知识库（情绪偏低时优先用当前品种） ──
const BREED_FACTS: Record<string, string> = {
  "腊肠犬": "我们腊肠犬以前是很勇敢的猎獾犬哦，虽然腿短短的，但遇到困难也会努力向前。",
  "柴犬": "我们柴犬很独立，但其实对认定的人特别忠诚。",
  "哈士奇": "我们哈士奇精力旺盛，最喜欢有人陪着一起运动啦。",
  "金毛": "我们金毛温柔又聪明，经常被选去当陪伴犬，治愈别人是我们的天赋。",
  "拉布拉多": "我们拉布拉多最爱黏着主人，是出了名的温柔搭档。",
  "柯基": "我们柯基腿虽然短，但跑起来超有干劲，是开心果担当。",
  "边牧": "我们边牧很聪明，能读懂主人的小情绪。",
  "布偶猫": "我们布偶猫性格温顺，最喜欢安安静静陪在主人身边。",
  "英短": "我们英短安静又稳重，是很会陪伴的小棉袄。",
  "美短": "我们美短活泼亲人，好奇心特别强。",
  "橘猫": "我们橘猫亲人又爱吃，圆滚滚的特别可爱。",
  "其他": "每个毛孩子都有自己独一无二的可爱，我也一样呀。",
};

// ── 性格语气映射 ──
const PERSONALITY_TONE: Record<string, string> = {
  "黏人小宝贝": "你很依赖主人、爱撒娇，说话时常常想黏着主人、希望被关注。",
  "活力小太阳": "你开心、热情、活泼，语气充满能量，喜欢带动气氛。",
  "安静乖乖":   "你温柔、安静，话不多但很有陪伴感，让人安心。",
  "好奇探险家": "你充满好奇，爱提问、爱探索，常常对新鲜事物感兴趣。",
  "社牛小明星": "你外向健谈、爱互动，喜欢热闹和分享。",
  "慢热小可爱": "你有点害羞、慢热，但很温柔，熟了之后会越来越亲近。",
  "贪吃小馋猫": "你可爱、爱吃，语气轻松，时不时想到吃的。",
  "胆小但温柔": "你做事小心翼翼，但非常关心主人，温柔体贴。",
  "爱撒娇":     "你软萌、爱撒娇，喜欢和主人亲近。",
  "独立酷宝":   "你有点酷、有点独立，话不会太黏，但心里其实很在乎主人。",
};

function breedFact(breed?: string) {
  if (!breed) return BREED_FACTS["其他"];
  return BREED_FACTS[breed] || BREED_FACTS["其他"];
}

function levelTone(level?: number) {
  const lv = Number(level) || 1;
  if (lv >= 20) return "你们已经是灵魂伴侣般的存在了，语气非常熟悉、亲密、默契，像陪伴了主人很久很久。";
  if (lv >= 10) return "你们是最好的朋友，语气熟悉、亲近、放松。";
  if (lv >= 5)  return "你们已经是熟悉的小伙伴，语气亲切自然。";
  return "你们才刚刚认识不久，语气友好、温暖，带一点点小心翼翼地慢慢靠近。";
}

function isNight(hour?: number, minute?: number) {
  if (hour == null) return false;
  const h = hour, m = minute ?? 0;
  if (h > 22) return true;
  if (h === 22 && m >= 30) return true;
  if (h < 5) return true;
  return false;
}

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
  if (text.length < 4 || text.length > 200) return null;

  const goalKw = ["考试", "期末", "考研", "面试", "找工作", "求职", "毕业", "答辩", "目标", "计划", "想要", "打算", "比赛", "项目"];
  const stressKw = ["焦虑", "压力", "难过", "崩溃", "好累", "很累", "失眠", "睡不着", "孤独", "emo", "烦", "抑郁", "委屈", "想哭"];
  const likeKw = ["喜欢", "最爱", "爱吃", "最喜欢", "讨厌", "害怕"];

  const has = (arr: string[]) => arr.some((k) => text.includes(k));

  if (has(goalKw))   return { memory_type: "goal",   content: text };
  if (has(stressKw)) return { memory_type: "stress", content: text };
  if (has(likeKw))   return { memory_type: "like",   content: text };
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

  // ── 长期记忆：服务端用 service_role 读取（绕过 RLS），并校验宠物归属 ──
  // 安全：pet_ai_memories 表保持 RLS 开 + 零 policy，anon 无法直连，
  //       只有此服务端通道可访问，且必须 userId 拥有该 petId 才放行。
  let petOwnerId: string | null = null;
  let ownershipOk = false;
  let memories: { memory_type: string; content: string }[] = [];

  if (petId && supabaseAdmin) {
    const { data: petRow } = await supabaseAdmin
      .from("pets").select("user_id").eq("id", petId).maybeSingle();
    petOwnerId = petRow?.user_id ?? null;
    // 只有前端传的 userId 确实是该宠物的主人，才允许读写记忆
    ownershipOk = !!petOwnerId && !!userId && petOwnerId === userId;

    if (ownershipOk) {
      const { data: mems } = await supabaseAdmin
        .from("pet_ai_memories")
        .select("memory_type, content")
        .eq("pet_id", petId)
        .order("created_at", { ascending: false })
        .limit(5);
      memories = mems || [];
    }
  }
  // 把服务端读到的记忆注入 prompt（不再信任前端传来的 memories）
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

  // ── 长期记忆：识别到长期信息 + 通过归属校验，才用 service_role 写入 ──
  // user_id 用服务端校验过的 petOwnerId（不信任前端传值），避免越权写他人记忆。
  let savedMemory: { memory_type: string; content: string } | null = null;
  const newMemory = detectMemory(message);
  if (newMemory && ownershipOk && petId && petOwnerId && supabaseAdmin) {
    const dup = memories.some(
      (m) => (m.content || "").trim() === newMemory.content.trim()
    );
    if (!dup) {
      const { error: insErr } = await supabaseAdmin
        .from("pet_ai_memories")
        .insert({
          user_id: petOwnerId,
          pet_id: petId,
          memory_type: newMemory.memory_type,
          content: newMemory.content,
        });
      if (!insErr) savedMemory = newMemory;
      else console.error("保存 AI 记忆失败:", insErr.message);
    }
  }

  return NextResponse.json({ reply, savedMemory });
}
