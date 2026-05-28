/**
 * services/petRecipeService.js
 *
 * 宠物食谱：从 DB 读（含内置 + 用户自建）。
 * SQL 已 seed 了 5 个内置食谱，is_builtin=true。
 *
 * 预留接口（占位 TODO，后期实现 UI）：
 *  - createRecipe(payload, userId)
 *  - updateRecipe(id, patch, userId)
 *  - deleteRecipe(id, userId)
 */

import { supabase } from "@/lib/supabase";

function sb() {
  if (!supabase) throw new Error("Supabase 未初始化");
  return supabase;
}

/** 全部食谱（内置在前，最新在后） */
export async function listRecipes() {
  const { data, error } = await sb().from("pet_recipes")
    .select("*")
    .order("is_builtin", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw new Error(`获取食谱失败: ${error.message}`);
  return data || [];
}

export async function getRecipe(id) {
  if (!id) return null;
  const { data, error } = await sb().from("pet_recipes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`获取食谱失败: ${error.message}`);
  return data;
}

/** 今日推荐：用日期种子做稳定 rotation */
export async function getTodayRecipe() {
  const list = await listRecipes();
  if (!list.length) return null;
  const today = new Date();
  const dayKey = today.getFullYear() * 1000 + (today.getMonth() + 1) * 31 + today.getDate();
  return list[dayKey % list.length];
}

/* ──────────────────────────────────────────────
   预留：用户自建食谱（UI 后期接入）
   ────────────────────────────────────────────── */
export async function createRecipe(payload, userId) {
  if (!userId) throw new Error("createRecipe: 缺少 userId");
  const { data, error } = await sb().from("pet_recipes")
    .insert({
      user_id:      userId,
      title:        payload.title?.trim(),
      emoji:        payload.emoji || "🍱",
      suitable_for: payload.suitable_for || null,
      ingredients:  payload.ingredients || null,
      steps:        payload.steps || null,
      nutrition:    payload.nutrition || null,
      notes:        payload.notes || null,
      is_builtin:   false,
    })
    .select()
    .single();
  if (error) throw new Error(`创建食谱失败: ${error.message}`);
  return data;
}

export async function updateRecipe(id, patch, userId) {
  if (!id || !userId) throw new Error("updateRecipe: 缺少参数");
  // 不允许编辑内置食谱
  const { data, error } = await sb().from("pet_recipes")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId)
    .eq("is_builtin", false)
    .select()
    .single();
  if (error) throw new Error(`更新食谱失败: ${error.message}`);
  return data;
}

export async function deleteRecipe(id, userId) {
  if (!id || !userId) throw new Error("deleteRecipe: 缺少参数");
  const { error } = await sb().from("pet_recipes")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .eq("is_builtin", false);
  if (error) throw new Error(`删除食谱失败: ${error.message}`);
}
