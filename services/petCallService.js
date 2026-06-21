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
