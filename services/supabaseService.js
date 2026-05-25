/**
 * services/supabaseService.js
 *
 * 真实 Supabase MVP 环境。
 * 无任何 mock / fallback / fake 数据。
 * 所有函数失败时抛出真实错误，由调用方处理。
 */

import { supabase } from "@/lib/supabase";

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase client not initialized. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return supabase;
}

/* ── 获取当前登录用户 ─────────────────────────────────────────
   未登录时返回 null（不报错）
   ─────────────────────────────────────────────────────────── */
export async function getCurrentUser() {
  const sb = requireSupabase();
  const { data, error } = await sb.auth.getUser();
  if (error) return null;
  return data?.user ?? null;
}

/* ── 获取指定用户的所有宠物 ───────────────────────────────────*/
export async function getUserPets(userId) {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("pets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getUserPets failed: ${error.message}`);
  return data;
}

/* ── 保存宠物档案（真实 INSERT）──────────────────────────────
   表单字段映射：
   - neutered / vaccinated: "yes"/"no" → boolean
   - age / weight: string → number
   ─────────────────────────────────────────────────────────── */
export async function savePetProfile(formData) {
  const sb = requireSupabase();

  const { data: authData } = await sb.auth.getUser();
  const userId = authData?.user?.id ?? null;

  const payload = {
    name:       formData.name?.trim(),
    breed:      formData.breed || null,
    age:        formData.age    ? parseFloat(formData.age)    : null,
    weight:     formData.weight ? parseFloat(formData.weight) : null,
    gender:     formData.gender || null,
    neutered:   formData.neutered   === "yes",
    vaccinated: formData.vaccinated === "yes",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...(userId ? { user_id: userId } : {}),
  };

  const { data, error } = await sb
    .from("pets")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(`savePetProfile failed: ${error.message}`);
  return data;
}

/* ── 保存喂食记录 ─────────────────────────────────────────────*/
export async function saveFeedingRecord(record) {
  const sb = requireSupabase();
  const { error } = await sb
    .from("feeding_records")
    .insert({ ...record, recorded_at: new Date().toISOString() });
  if (error) throw new Error(`saveFeedingRecord failed: ${error.message}`);
}

/* ── 保存健康上传记录 ─────────────────────────────────────────*/
export async function saveHealthUpload(upload) {
  const sb = requireSupabase();
  const { error } = await sb
    .from("health_uploads")
    .insert({ ...upload, created_at: new Date().toISOString() });
  if (error) throw new Error(`saveHealthUpload failed: ${error.message}`);
}

/* ── 获取后台统计数据 ─────────────────────────────────────────
   每张表独立查询。
   返回: { counts: {...}, errors: {...} }
   - count = number（含 0）→ 真实数据
   - count = null          → 该表查询失败（含具体 error message）
   ─────────────────────────────────────────────────────────── */
export async function getAdminStats() {
  const sb = requireSupabase();

  const queryCount = async (table) => {
    const { count, error } = await sb
      .from(table)
      .select("*", { count: "exact", head: true });
    if (error) return { count: null, error: error.message };
    return { count, error: null };
  };

  const [users, pets, uploads, messages, shops] = await Promise.all([
    queryCount("users"),
    queryCount("pets"),
    queryCount("health_uploads"),
    queryCount("messages"),
    queryCount("shops"),
  ]);

  return {
    total_users:    users.count,
    total_pets:     pets.count,
    health_uploads: uploads.count,
    chat_messages:  messages.count,
    partner_shops:  shops.count,
    errors: {
      users:    users.error,
      pets:     pets.error,
      uploads:  uploads.error,
      messages: messages.error,
      shops:    shops.error,
    },
    queried_at: new Date().toISOString(),
  };
}
