/**
 * services/petCallService.js
 *
 * 【AI 宠物来电】数据层：读写 pet_call_settings / pet_call_records 两张表。
 * 与项目其它数据一致：自建手机号账号体系，前端用 anon key 直连（无 Supabase Auth）。
 *
 * 表结构（已在 Supabase 建好）：
 *   pet_call_settings(id, user_id, pet_id, enabled, call_type, call_time,
 *                     repeat_rule, call_style, voice_type, created_at, updated_at) UNIQUE(pet_id)
 *   pet_call_records (id, user_id, pet_id, call_type, status, duration_seconds,
 *                     script, mood_feedback, started_at, ended_at, created_at)
 */

import { supabase } from "@/lib/supabase";

function sb() {
  if (!supabase) {
    throw new Error(
      "Supabase 未初始化。请检查 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY。"
    );
  }
  return supabase;
}

/* ── 来电设置（每个宠物一条）─────────────────────────────────── */
export async function getCallSettings(petId) {
  if (!petId) return null;
  const { data, error } = await sb()
    .from("pet_call_settings")
    .select("enabled, call_type, call_time, repeat_rule, call_style, voice_type, scenes")
    .eq("pet_id", petId)
    .maybeSingle();
  if (error) throw new Error(`获取来电设置失败: ${error.message}`);
  return data || null;
}

export async function saveCallSettings(userId, petId, fields) {
  if (!userId || !petId) throw new Error("缺少 userId / petId");
  const row = {
    user_id: userId,
    pet_id: petId,
    enabled: fields.enabled ?? true,
    call_type: fields.call_type || "miss_you",
    call_time: fields.call_time || "20:00",
    repeat_rule: fields.repeat_rule || "daily",
    call_style: fields.call_style || "coquettish", // UI 已移除手动选风格，保留字段写默认占位
    voice_type: fields.voice_type || "cute_female", // UI 已移除手动选声音，保留字段写默认占位
    scenes: fields.scenes && typeof fields.scenes === "object" ? fields.scenes : {}, // 场景开关
    updated_at: new Date().toISOString(),
  };
  // UNIQUE(pet_id) → upsert，存在则更新
  const { error } = await sb()
    .from("pet_call_settings")
    .upsert(row, { onConflict: "pet_id" });
  if (error) throw new Error(`保存来电设置失败: ${error.message}`);
}

/* ── 通话记录 ──────────────────────────────────────────────── */
export async function addCallRecord(record) {
  if (!record?.user_id || !record?.pet_id) throw new Error("缺少 userId / petId");
  const row = {
    user_id: record.user_id,
    pet_id: record.pet_id,
    call_type: record.call_type || null,
    status: record.status || "completed", // incoming/answered/missed/declined/completed
    duration_seconds: record.duration_seconds || 0,
    script: record.script || null,
    mood_feedback: record.mood_feedback || null,
    started_at: record.started_at || null,
    ended_at: record.ended_at || new Date().toISOString(),
    trigger_type: record.trigger_type || null,
    trigger_source_id: record.trigger_source_id || null,
    trigger_source_table: record.trigger_source_table || null,
    emotion: record.emotion || null,
    subtitle: record.subtitle || null,
    sound_key: record.sound_key || null,
    scheduled_for: record.scheduled_for || null,
    triggered_at: record.triggered_at || null,
    answered_at: record.answered_at || null,
  };
  const { data, error } = await sb()
    .from("pet_call_records")
    .insert(row)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`保存通话记录失败: ${error.message}`);
  return data?.id || null;
}

export async function listCallRecords(userId, limit = 50) {
  if (!userId) return [];
  const { data, error } = await sb()
    .from("pet_call_records")
    .select("id, pet_id, call_type, status, duration_seconds, mood_feedback, started_at, ended_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`获取通话记录失败: ${error.message}`);
  return data || [];
}

export async function clearCallRecords(userId) {
  if (!userId) return;
  const { error } = await sb()
    .from("pet_call_records")
    .delete()
    .eq("user_id", userId);
  if (error) throw new Error(`清空通话记录失败: ${error.message}`);
}

/* ════ 自动触发来电（incoming record + 防重复 / 频率查询）════════════ */

// 本地「今天 00:00」对应的 ISO（用于按本地自然日过滤 created_at）
function todayStartISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** 自动触发命中时，先建一条 status='incoming' 的来电记录，返回 id（前端据此弹来电、后续 update 状态）。 */
export async function createIncomingCallRecord(rec) {
  if (!rec?.user_id || !rec?.pet_id) throw new Error("缺少 userId / petId");
  const nowISO = new Date().toISOString();
  const row = {
    user_id: rec.user_id,
    pet_id: rec.pet_id,
    call_type: rec.call_type || null,
    status: "incoming",
    trigger_type: rec.trigger_type || null,
    trigger_source_id: rec.trigger_source_id || null,
    trigger_source_table: rec.trigger_source_table || null,
    emotion: rec.emotion || null,
    subtitle: rec.subtitle || null,
    sound_key: rec.sound_key || null,
    scheduled_for: rec.scheduled_for || nowISO,
    triggered_at: nowISO,
    started_at: nowISO,
  };
  const { data, error } = await sb()
    .from("pet_call_records").insert(row).select("id").maybeSingle();
  if (error) throw new Error(`创建来电记录失败: ${error.message}`);
  return data?.id || null;
}

/** 更新某条来电记录（接听 / 挂断 / 完成时改 status、时长、心情等）。 */
export async function updateCallRecord(id, patch) {
  if (!id || !patch) return;
  const { error } = await sb().from("pet_call_records").update(patch).eq("id", id);
  if (error) throw new Error(`更新通话记录失败: ${error.message}`);
}

/** 防重复：今天是否已为同一触发来源（某餐/某次用药/某遛弯…）触发过来电。 */
export async function hasTriggeredToday(petId, triggerSourceId) {
  if (!petId || !triggerSourceId) return false;
  const { data, error } = await sb()
    .from("pet_call_records").select("id")
    .eq("pet_id", petId).eq("trigger_source_id", triggerSourceId)
    .gte("created_at", todayStartISO()).limit(1);
  if (error) return false;
  return (data || []).length > 0;
}

/** 今天是否已触发过某一类来电（如 medication，用于"已用药来电则当天不再生病照护"）。 */
export async function hasTriggeredTypeToday(petId, triggerType) {
  if (!petId || !triggerType) return false;
  const { data, error } = await sb()
    .from("pet_call_records").select("id")
    .eq("pet_id", petId).eq("trigger_type", triggerType)
    .gte("created_at", todayStartISO()).limit(1);
  if (error) return false;
  return (data || []).length > 0;
}

/** 今天该用户的自动触发来电次数（trigger_type 非空），用于频率限制。 */
export async function countTodayAutoCalls(userId) {
  if (!userId) return 0;
  const { count, error } = await sb()
    .from("pet_call_records").select("id", { count: "exact", head: true })
    .eq("user_id", userId).not("trigger_type", "is", null)
    .gte("created_at", todayStartISO());
  if (error) return 0;
  return count || 0;
}

/**
 * 标记某餐「今日已完成」——写入与首页喂食卡同一 localStorage（tailme_feed_done_{本地日期}_{petId}）。
 * 等价于首页点「已完成」打卡：首页会同步显示已完成、自动触发也不再为该餐来电。不改首页/喂食数据结构。
 */
export function markFeedingDone(petId, mealIndex) {
  if (typeof window === "undefined" || !petId || mealIndex == null) return;
  try {
    const d = new Date(); const p = (n) => String(n).padStart(2, "0");
    const today = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    const key = `tailme_feed_done_${today}_${petId}`;
    const cur = JSON.parse(localStorage.getItem(key) || "{}");
    cur[mealIndex] = true;
    localStorage.setItem(key, JSON.stringify(cur));
  } catch { /* localStorage 不可用则忽略 */ }
}

/** 「想你来电」连续 2 次未接 → 暂停 3 天（不影响用药/喂食等刚需提醒）。 */
export async function isMissYouPaused(userId) {
  if (!userId) return false;
  const { data, error } = await sb()
    .from("pet_call_records").select("status, created_at")
    .eq("user_id", userId).eq("trigger_type", "miss_you")
    .order("created_at", { ascending: false }).limit(2);
  if (error || !data || data.length < 2) return false;
  const missed = (s) => s === "missed" || s === "declined";
  if (missed(data[0].status) && missed(data[1].status)) {
    return Date.now() - new Date(data[0].created_at).getTime() < 3 * 24 * 3600 * 1000;
  }
  return false;
}
