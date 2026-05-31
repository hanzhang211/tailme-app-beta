/**
 * services/petHealthService.js
 *
 * 宠物健康记录 CRUD（疫苗/驱虫/体检/其他）。
 * 不删 pets 表已有的 neutered / vaccinated 字段，本表是更详细的历史记录。
 */

import { supabase } from "@/lib/supabase";

function sb() {
  if (!supabase) throw new Error("Supabase 未初始化");
  return supabase;
}

export const RECORD_TYPES = [
  { key: "vaccine", label: "疫苗",  emoji: "💉" },
  { key: "deworm",  label: "驱虫",  emoji: "🛡️" },
  { key: "checkup", label: "体检",  emoji: "🩺" },
  { key: "other",   label: "其他",  emoji: "📋" },
];

/** 拉某只宠物的全部健康记录 */
export async function listHealthRecords(petId) {
  if (!petId) return [];
  const { data, error } = await sb().from("pet_health_records")
    .select("*")
    .eq("pet_id", petId)
    .order("record_date", { ascending: false });
  if (error) throw new Error(`获取健康记录失败: ${error.message}`);
  return data || [];
}

/** 添加记录 */
export async function addHealthRecord({ userId, petId, recordType, title, recordDate, nextDueDate, note }) {
  if (!userId || !petId) throw new Error("addHealthRecord: 缺少 userId/petId");
  if (!recordType) throw new Error("请选择记录类型");
  const { data, error } = await sb().from("pet_health_records")
    .insert({
      user_id:       userId,
      pet_id:        petId,
      record_type:   recordType,
      title:         title?.trim() || null,
      record_date:   recordDate || new Date().toISOString().slice(0, 10),
      next_due_date: nextDueDate || null,
      note:          note?.trim() || null,
    })
    .select()
    .single();
  if (error) throw new Error(`添加记录失败: ${error.message}`);
  return data;
}

/** 删除记录（仅自己的） */
export async function deleteHealthRecord(id, userId) {
  if (!id || !userId) throw new Error("deleteHealthRecord: 缺少参数");
  const { error } = await sb().from("pet_health_records")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(`删除失败: ${error.message}`);
}

/* ══ 生病记录（health_records 表）══════════════════════════════ */

export async function listDiseaseRecords(petId) {
  if (!petId) return [];
  const { data, error } = await sb().from("health_records")
    .select("*").eq("pet_id", petId)
    .order("diagnosis_date", { ascending: false });
  if (error) throw new Error(`获取疾病记录失败: ${error.message}`);
  return data || [];
}

export async function addDiseaseRecord({ userId, petId, diseaseName, symptoms, status, diagnosisDate, recoveryDate, notes }) {
  if (!userId || !petId) throw new Error("缺少 userId/petId");
  const { data, error } = await sb().from("health_records").insert({
    user_id:        userId,
    pet_id:         petId,
    disease_name:   diseaseName?.trim(),
    symptoms:       symptoms?.trim() || null,
    status:         status || "treating",
    diagnosis_date: diagnosisDate || new Date().toISOString().slice(0, 10),
    recovery_date:  recoveryDate || null,
    notes:          notes?.trim() || null,
  }).select().single();
  if (error) throw new Error(`添加疾病记录失败: ${error.message}`);
  return data;
}

export async function deleteDiseaseRecord(id, userId) {
  if (!id || !userId) throw new Error("缺少参数");
  const { error } = await sb().from("health_records")
    .delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(`删除失败: ${error.message}`);
}

/* ══ 用药提醒（medication_reminders 表）══════════════════════════ */

export async function listMedicationReminders(petId) {
  if (!petId) return [];
  const { data, error } = await sb().from("medication_reminders")
    .select("*").eq("pet_id", petId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`获取用药记录失败: ${error.message}`);
  return data || [];
}

export async function addMedicationReminder({ userId, petId, medicineName, dosage, frequency, startDate, endDate, nextReminderTime, notes }) {
  if (!userId || !petId) throw new Error("缺少 userId/petId");
  const { data, error } = await sb().from("medication_reminders").insert({
    user_id:            userId,
    pet_id:             petId,
    medicine_name:      medicineName?.trim(),
    dosage:             dosage?.trim() || null,
    frequency:          frequency?.trim() || null,
    start_date:         startDate || new Date().toISOString().slice(0, 10),
    end_date:           endDate || null,
    next_reminder_time: nextReminderTime || null,
    is_active:          true,
    notes:              notes?.trim() || null,
  }).select().single();
  if (error) throw new Error(`添加用药提醒失败: ${error.message}`);
  return data;
}

export async function deleteMedicationReminder(id, userId) {
  if (!id || !userId) throw new Error("缺少参数");
  const { error } = await sb().from("medication_reminders")
    .delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(`删除失败: ${error.message}`);
}

/** 更新宠物的 neutered / vaccinated 状态（pets 表） */
export async function updatePetHealth(petId, userId, { neutered, vaccinated }) {
  if (!petId || !userId) throw new Error("updatePetHealth: 缺少参数");
  const patch = {};
  if (neutered   !== undefined) patch.neutered   = neutered;
  if (vaccinated !== undefined) patch.vaccinated = vaccinated;
  if (Object.keys(patch).length === 0) return;
  const { error } = await sb().from("pets")
    .update(patch)
    .eq("id", petId)
    .eq("user_id", userId);
  if (error) throw new Error(`更新宠物状态失败: ${error.message}`);
}
