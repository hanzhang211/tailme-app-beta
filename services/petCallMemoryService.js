/**
 * services/petCallMemoryService.js
 *
 * 【AI 记忆回访】数据层 —— 第一版仅结构预留，不自动创建 / 不自动触发。
 *
 * 未来设想：用户在 AI 聊天里说「我今晚要去办事情 / 明天要考试 / 等会去医院」，
 *   AI 识别出「事件 + 时间」→ createMemoryFollowup() 落库 →
 *   到 follow_up_time 时生成一通 memory_followup 来电，关心办得怎么样。
 *
 * 表：pet_call_memory_followups（见 supabase/pet_call_scenes_followups.sql）
 *   status: pending / triggered / done / cancelled
 */

import { supabase } from "@/lib/supabase";

export async function listMemoryFollowups(userId, limit = 50) {
  if (!userId || !supabase) return [];
  const { data, error } = await supabase
    .from("pet_call_memory_followups")
    .select("id, pet_id, event_text, event_time, follow_up_time, status, created_at, triggered_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`获取记忆回访失败: ${error.message}`);
  return data || [];
}

/**
 * 预留：未来由 AI 聊天事件识别后调用，创建一条待回访记录。
 * 第一版不在任何地方自动调用。
 */
export async function createMemoryFollowup({ userId, petId, sourceMessageId, eventText, eventTime, followUpTime }) {
  if (!userId || !petId) throw new Error("缺少 userId / petId");
  const { data, error } = await supabase
    .from("pet_call_memory_followups")
    .insert({
      user_id: userId,
      pet_id: petId,
      source_message_id: sourceMessageId || null,
      event_text: eventText || null,
      event_time: eventTime || null,
      follow_up_time: followUpTime || null,
      status: "pending",
    })
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`创建记忆回访失败: ${error.message}`);
  return data?.id || null;
}

/**
 * 预留：未来标记某条回访状态（触发/完成/取消）。
 */
export async function updateMemoryFollowupStatus(id, status, triggeredAt) {
  if (!id) return;
  const patch = { status };
  if (status === "triggered") patch.triggered_at = triggeredAt || new Date().toISOString();
  const { error } = await supabase.from("pet_call_memory_followups").update(patch).eq("id", id);
  if (error) throw new Error(`更新记忆回访失败: ${error.message}`);
}

/**
 * 预留：未来定时任务 / 前端轮询拉取「到点待触发」的回访。
 * 第一版返回空数组（不触发）。
 */
export async function listDueFollowups(/* userId, nowISO */) {
  // TODO(后续): 查询 status='pending' 且 follow_up_time <= now 的记录并触发来电
  return [];
}
