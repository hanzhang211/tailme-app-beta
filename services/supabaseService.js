/**
 * services/supabaseService.js
 *
 * 手机号账号体系 MVP。
 * 无 Supabase Auth，用户通过 phone 唯一标识。
 * 无任何 mock / fallback / fake 数据。
 */

import { supabase } from "@/lib/supabase";

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase 未初始化。请检查 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY。"
    );
  }
  return supabase;
}

/* ── 手机号登录 / 注册（get or create）─────────────────────────
   逻辑：先 SELECT，有则返回，无则 INSERT。
   手机号加 UNIQUE 约束，物理上禁止重复。
   处理并发 race condition：INSERT 若报 23505（unique violation），
   说明并发请求刚刚创建，重新 SELECT 即可。
   ─────────────────────────────────────────────────────────── */
export async function getOrCreateUserByPhone(phone) {
  const sb = requireSupabase();

  // 1. 先查是否已存在
  const { data: existing, error: selErr } = await sb
    .from("users")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (selErr) throw new Error(`查询用户失败: ${selErr.message}`);
  if (existing) return existing;

  // 2. 不存在则创建
  const { data: created, error: insErr } = await sb
    .from("users")
    .insert({ phone, created_at: new Date().toISOString() })
    .select()
    .single();

  if (!insErr) return created;

  // 3. race condition：unique violation → 再查一次
  if (insErr.code === "23505") {
    const { data: retried, error: retryErr } = await sb
      .from("users")
      .select("*")
      .eq("phone", phone)
      .single();
    if (retryErr) throw new Error(`重试查询用户失败: ${retryErr.message}`);
    return retried;
  }

  throw new Error(`创建用户失败: ${insErr.message}`);
}

/* ── 根据 ID 获取用户 ────────────────────────────────────────── */
export async function getUserById(userId) {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw new Error(`获取用户失败: ${error.message}`);
  return data;
}

/* ── 获取用户的所有宠物 ───────────────────────────────────────── */
export async function getUserPets(userId) {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("pets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`获取宠物失败: ${error.message}`);
  return data; // 空数组代表无宠物
}

/* ── 保存宠物档案（真实 INSERT，绑定 userId）────────────────────
   userId 必传，不从 Supabase Auth 获取（MVP 使用自定义手机号体系）
   ─────────────────────────────────────────────────────────── */
export async function savePetProfile(formData, userId) {
  const sb = requireSupabase();
  if (!userId) throw new Error("savePetProfile: userId 不能为空");

  const payload = {
    user_id:    userId,
    name:        formData.name?.trim(),
    breed:       formData.breed       || null,
    birthday:    formData.birthday    || null,           // YYYY-MM-DD
    personality: formData.personality || null,
    age:         formData.age     ? parseFloat(formData.age)    : null,   // 保留兼容
    weight:      formData.weight  ? parseFloat(formData.weight) : null,
    gender:      formData.gender  || null,
    neutered:    formData.neutered   === "yes",
    vaccinated:  formData.vaccinated === "yes",
    created_at:  new Date().toISOString(),
    updated_at:  new Date().toISOString(),
  };

  const { data, error } = await sb
    .from("pets")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(`创建宠物失败: ${error.message}`);
  return data;
}

/* ── 删除宠物（owner 校验：where user_id = passed）─────────────── */
export async function deletePet(petId, userId) {
  const sb = requireSupabase();
  if (!petId || !userId) throw new Error("deletePet: 缺少 petId 或 userId");
  const { error } = await sb
    .from("pets")
    .delete()
    .eq("id", petId)
    .eq("user_id", userId);
  if (error) throw new Error(`删除宠物失败: ${error.message}`);
}

/* ── 更新宠物档案（部分字段）—— 用于老用户补全生日/性格 ──────── */
export async function updatePet(petId, fields) {
  const sb = requireSupabase();
  if (!petId) throw new Error("updatePet: petId 不能为空");
  const payload = { ...fields, updated_at: new Date().toISOString() };
  const { data, error } = await sb
    .from("pets")
    .update(payload)
    .eq("id", petId)
    .select()
    .single();
  if (error) throw new Error(`更新宠物失败: ${error.message}`);
  return data;
}

/* ── 用户名唯一性检查（大小写不敏感）──────────────────────────── */
export async function isUsernameTaken(username) {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("users")
    .select("id")
    .ilike("username", username)
    .maybeSingle();
  if (error) throw new Error(`查询用户名失败: ${error.message}`);
  return !!data;
}

/* ── 设置用户名（首次或修改）────────────────────────────────────
   23505 = unique violation → 提示重名
   ─────────────────────────────────────────────────────────── */
export async function setUsername(userId, username) {
  const sb = requireSupabase();
  if (!userId) throw new Error("setUsername: userId 不能为空");
  const { data, error } = await sb
    .from("users")
    .update({ username: username.trim() })
    .eq("id", userId)
    .select()
    .single();
  if (error) {
    if (error.code === "23505") throw new Error("该用户名已被占用，请换一个");
    throw new Error(`设置用户名失败: ${error.message}`);
  }
  return data;
}

/* ── 更新用户头像（users.avatar_url）──────────────────────────── */
export async function updateUserAvatar(userId, avatarUrl) {
  const sb = requireSupabase();
  if (!userId) throw new Error("updateUserAvatar: userId 不能为空");
  const { data, error } = await sb
    .from("users")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId)
    .select()
    .single();
  if (error) throw new Error(`更新头像失败: ${error.message}`);
  return data;
}

/* ── 更新用户个人主页背景图（users.profile_background_url）──────── */
export async function updateUserBackground(userId, url) {
  const sb = requireSupabase();
  if (!userId) throw new Error("updateUserBackground: userId 不能为空");
  const { data, error } = await sb
    .from("users")
    .update({ profile_background_url: url })
    .eq("id", userId)
    .select()
    .single();
  if (error) throw new Error(`更新背景失败: ${error.message}`);
  return data;
}

/* ── AI 宠物聊天：长期记忆 ───────────────────────────────────── */
// 读取某宠物最近 N 条记忆（默认 5），按时间倒序
export async function getPetAiMemories(petId, limit = 5) {
  if (!petId) return [];
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("pet_ai_memories")
    .select("id, memory_type, content, created_at")
    .eq("pet_id", petId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("读取 AI 记忆失败:", error.message);
    return [];
  }
  return data || [];
}

// 保存一条记忆（调用方负责去重）
export async function savePetAiMemory(userId, petId, memoryType, content) {
  if (!userId || !petId || !content) return null;
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("pet_ai_memories")
    .insert({ user_id: userId, pet_id: petId, memory_type: memoryType || "other", content })
    .select()
    .single();
  if (error) {
    console.error("保存 AI 记忆失败:", error.message);
    return null;
  }
  return data;
}

/* ── AI 宠物聊天：成长系统（pets.ai_level / ai_exp）──────────────── */
export async function updatePetAiGrowth(petId, aiExp, aiLevel) {
  if (!petId) return null;
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("pets")
    .update({ ai_exp: aiExp, ai_level: aiLevel })
    .eq("id", petId)
    .select()
    .single();
  if (error) {
    console.error("更新宠物成长值失败:", error.message);
    return null;
  }
  return data;
}

/* ── 批量统计一组用户各自的宠物数量 ──────────────────────────── */
export async function getPetCountByUsers(userIds = []) {
  if (!userIds.length) return {};
  const sb = requireSupabase();
  const { data } = await sb.from("pets").select("user_id").in("user_id", userIds);
  const m = {};
  (data || []).forEach((p) => { if (p.user_id) m[p.user_id] = (m[p.user_id] || 0) + 1; });
  return m;
}

/* ── 更新用户城市（users.city，用于社区同城）──────────────────── */
export async function updateUserCity(userId, city) {
  const sb = requireSupabase();
  if (!userId) throw new Error("updateUserCity: userId 不能为空");
  const { data, error } = await sb
    .from("users")
    .update({ city: city || null })
    .eq("id", userId)
    .select()
    .single();
  if (error) throw new Error(`更新城市失败: ${error.message}`);
  return data;
}

/* ── 读取宠物喂食计划（所有顿，按 feeding_order 升序）─────────── */
export async function getFeedingPlan(petId) {
  if (!petId) return [];
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("feeding_records")
    .select("feeding_order, scheduled_time, amount, unit, note")
    .eq("pet_id", petId)
    .order("feeding_order", { ascending: true });
  if (error) throw new Error(`获取喂食计划失败: ${error.message}`);
  return data || [];
}

/* ── 保存喂食计划（清空该宠物旧计划后重新插入）──────────────────── */
export async function saveFeedingPlan(petId, feedings) {
  if (!petId) throw new Error("缺少 petId");
  const sb = requireSupabase();
  const { error: delErr } = await sb
    .from("feeding_records").delete().eq("pet_id", petId);
  if (delErr) throw new Error(`清除旧计划失败: ${delErr.message}`);
  if (feedings.length === 0) return;
  const rows = feedings.map((f, i) => ({
    pet_id:         petId,
    feeding_order:  i + 1,
    scheduled_time: f.time.length === 5 ? f.time + ":00" : f.time,
    amount:         f.amount !== "" && f.amount != null ? parseFloat(f.amount) : null,
    unit:           f.unit   || null,
    note:           f.note   || null,
    recorded_at:    new Date().toISOString(),
  }));
  const { error: insErr } = await sb.from("feeding_records").insert(rows);
  if (insErr) throw new Error(`保存喂食计划失败: ${insErr.message}`);
}

/* ── 后台统计（各表真实 count）────────────────────────────────
   count = number（含 0）→ 正常
   count = null          → 该表查询失败（含错误原因）
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

  const [users, pets, messages, shops] = await Promise.all([
    queryCount("users"),
    queryCount("pets"),
    queryCount("messages"),
    queryCount("shops"),
  ]);

  return {
    total_users:    users.count,
    total_pets:     pets.count,
    chat_messages:  messages.count,
    partner_shops:  shops.count,
    errors: {
      users:    users.error,
      pets:     pets.error,
      messages: messages.error,
      shops:    shops.error,
    },
    queried_at: new Date().toISOString(),
  };
}
