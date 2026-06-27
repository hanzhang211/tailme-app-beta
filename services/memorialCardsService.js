/**
 * services/memorialCardsService.js
 *
 * 【爪爪星球 · 今日的它】8 张 AI 纪念卡片：前端读缓存 + 逐张补齐编排。
 *  - listMemorialCards(petId)：读该宠物已生成的卡（anon 直连，公开读）。
 *  - cardsMapOf(rows)：rows → { cardType: imageUrl }（仅取 done 且有图）。
 *  - ensureMemorialCards(...)：查缓存→对缺失的 cardType 逐张并发调 /api/memorial-cards/generate，
 *      每张生成好回调 onCard 实时驱动 UI 替换；已全部生成则直接返回，不重复生成。
 *
 * 生成与写库都在服务端（service_role）。本文件只读表 + 触发生成，无任何密钥。
 */

import { supabase } from "@/lib/supabase";
import { CARD_TYPES } from "@/lib/memorialCardPrompts";

/** 读某宠物的全部纪念卡行（card_type / image_url / status）。 */
export async function listMemorialCards(petId) {
  if (!petId) return [];
  const { data, error } = await supabase
    .from("memorial_planet_cards")
    .select("card_type, image_url, status")
    .eq("pet_id", petId);
  if (error) {
    console.error("[memorialCards] list 失败:", error.message);
    return [];
  }
  return data || [];
}

/** rows → { cardType: imageUrl }（只收 done 且有图的卡）。 */
export function cardsMapOf(rows) {
  const map = {};
  for (const r of rows || []) {
    if (r.status === "done" && r.image_url) map[r.card_type] = r.image_url;
  }
  return map;
}

/** 触发生成 1 张（服务端已生成则秒回缓存）。成功返回 { cardType, imageUrl }，失败返回 null。 */
async function generateOne(petId, userId, cardType) {
  try {
    const resp = await fetch("/api/memorial-cards/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ petId, userId, cardType }),
    });
    const data = await resp.json().catch(() => null);
    if (resp.ok && data?.imageUrl) return { cardType, imageUrl: data.imageUrl };
    console.warn("[memorialCards] 生成失败:", cardType, data?.error || resp.status);
    return null;
  } catch (e) {
    console.warn("[memorialCards] 生成异常:", cardType, e?.message || e);
    return null;
  }
}

/**
 * 确保 8 张纪念卡齐全。
 * @param {object} opts { petId, userId, onCard?(cardType,url), concurrency? }
 * @returns Promise<{ [cardType]: imageUrl }>  最终缓存 map
 *
 * 逻辑：读现有 → 算缺失 → 限并发逐张生成（默认并发 2，避免火山限流）→ 每张好了 onCard 回调。
 * 全部已存在则不发任何生成请求（满足「已生成不重复」）。
 */
export async function ensureMemorialCards({ petId, userId, onCard, concurrency = 2 } = {}) {
  if (!petId) return {};
  const rows = await listMemorialCards(petId);
  const map = cardsMapOf(rows);
  const missing = CARD_TYPES.filter((ct) => !map[ct]);
  if (missing.length === 0) return map;

  let idx = 0;
  const worker = async () => {
    while (idx < missing.length) {
      const ct = missing[idx++];
      const r = await generateOne(petId, userId, ct);
      if (r) {
        map[r.cardType] = r.imageUrl;
        try { onCard?.(r.cardType, r.imageUrl); } catch { /* 回调里组件已卸载等，忽略 */ }
      }
    }
  };
  const n = Math.max(1, Math.min(concurrency, missing.length));
  await Promise.all(Array.from({ length: n }, worker));
  return map;
}
