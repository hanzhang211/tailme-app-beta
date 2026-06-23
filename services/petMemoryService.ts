/**
 * services/petMemoryService.ts
 *
 * 【统一宠物记忆】服务端读写封装 —— AI 文字聊天 + AI 电话共享同一张
 * pet_ai_memories 表，实现「电话里说的，下次打字聊天也记得」。
 *
 * ⚠️ 仅限服务端（app/api/**\/route.ts）使用：
 *   · 用 service_role（supabaseAdmin）读写，绕过 RLS。
 *   · pet_ai_memories 保持「RLS 开 + 零 policy」，anon 无法直连，安全边界不变。
 *   · 所有读写都先校验「该 userId 确实是该 petId 的主人」；写入的 user_id 取
 *     服务端查到的归属值，不信任前端传值 → 无法越权读写他人记忆。
 *
 * 表字段（见 supabase/schema_ai_chat.sql + supabase/add_pet_memory_fields.sql）：
 *   id, user_id, pet_id, source, memory_type, content, importance, created_at, updated_at
 */

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface PetMemory {
  memory_type: string;
  content: string;
  importance: number;
  source: string;
}

export type MemorySource = "chat" | "call" | "health" | "feeding" | "memorial" | "manual";

const clampImportance = (n: unknown): number =>
  Math.max(1, Math.min(5, Math.round(Number(n) || 3)));

/** 校验归属：是该宠物主人则返回真实 owner_id，否则返回 null（缺参数/未初始化也返回 null）。 */
async function verifyOwner(userId?: string | null, petId?: string | null): Promise<string | null> {
  if (!supabaseAdmin || !userId || !petId) return null;
  const { data } = await supabaseAdmin
    .from("pets")
    .select("user_id")
    .eq("id", petId)
    .maybeSingle();
  const owner = data?.user_id ?? null;
  return owner && owner === userId ? owner : null;
}

/**
 * 读取当前宠物的长期记忆：优先 importance 高、其次 created_at 新，默认 ≤10 条。
 * 不是主人 / 缺参数 / 出错 → 返回空数组（绝不抛错阻断聊天或电话）。
 */
export async function getPetMemories(
  opts: { userId?: string | null; petId?: string | null; limit?: number } = {}
): Promise<PetMemory[]> {
  const { userId, petId, limit = 10 } = opts;
  const owner = await verifyOwner(userId, petId);
  if (!owner || !supabaseAdmin) return [];

  const { data, error } = await supabaseAdmin
    .from("pet_ai_memories")
    .select("memory_type, content, importance, source")
    .eq("user_id", owner)
    .eq("pet_id", petId)
    .order("importance", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(20, Number(limit) || 10)));

  if (error) {
    console.error("[petMemory] 读取失败:", error.message);
    return [];
  }
  return (data || []) as PetMemory[];
}

/**
 * 把记忆整理成注入 DeepSeek 的文本块（编号列表）。空则返回占位文案。
 *   【主人和宠物的长期记忆】
 *   1. ...
 *   2. ...
 */
export function formatMemoriesForPrompt(memories: PetMemory[]): string {
  if (!memories?.length) return "（暂时还没有特别的记忆）";
  return memories.map((m, i) => `${i + 1}. ${m.content}`).join("\n");
}

/**
 * 写入一条长期记忆（服务端校验归属；user_id 取服务端归属值，不信任前端）。
 * 自动去重：同宠物下已有完全相同 content 则跳过。
 * 失败仅 console.error 并返回 false，绝不抛错（不影响本次聊天/电话流程）。
 */
export async function savePetMemory(opts: {
  userId?: string | null;
  petId?: string | null;
  source?: MemorySource;
  memory_type?: string;
  content?: string;
  importance?: number;
}): Promise<boolean> {
  const { userId, petId, source = "chat", memory_type = "other", content, importance = 3 } = opts;
  const text = (content || "").trim();
  if (!text) return false;

  const owner = await verifyOwner(userId, petId);
  if (!owner || !supabaseAdmin) return false;

  try {
    // 去重：同一宠物下已有完全相同 content 则跳过
    const { data: dup } = await supabaseAdmin
      .from("pet_ai_memories")
      .select("id")
      .eq("pet_id", petId)
      .eq("content", text)
      .limit(1);
    if (dup && dup.length) return false;

    const { error } = await supabaseAdmin.from("pet_ai_memories").insert({
      user_id: owner,
      pet_id: petId,
      source,
      memory_type,
      content: text,
      importance: clampImportance(importance),
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error("[petMemory] 写入失败:", error.message);
      return false;
    }
    return true;
  } catch (e: any) {
    console.error("[petMemory] 写入异常:", e?.message || e);
    return false;
  }
}

/**
 * 批量写入（电话结束总结一次产出 0-3 条时用）。逐条调用 savePetMemory，
 * 返回成功写入的条数。任意一条失败不影响其余。
 */
export async function savePetMemories(
  base: { userId?: string | null; petId?: string | null; source?: MemorySource },
  items: { memory_type?: string; content?: string; importance?: number }[]
): Promise<number> {
  if (!Array.isArray(items) || !items.length) return 0;
  let saved = 0;
  for (const it of items) {
    const ok = await savePetMemory({ ...base, ...it });
    if (ok) saved += 1;
  }
  return saved;
}
