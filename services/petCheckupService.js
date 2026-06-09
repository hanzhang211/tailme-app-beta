/**
 * services/petCheckupService.js
 *
 * 体检记录（pet_checkup_records 表）CRUD + 图片上传。
 * 取代旧的「通用新增健康记录(pet_health_records)」里的体检入口。
 * 图片复用现有公开 bucket（pet-avatars，checkups/ 前缀），与商家/友好地图同一惯例。
 */

import { supabase } from "@/lib/supabase";
import { compressImage } from "@/services/imageCompress";

const IMG_BUCKET = "pet-avatars"; // 复用现有公开 bucket（MVP），路径前缀 checkups/

function sb() {
  if (!supabase) throw new Error("Supabase 未初始化");
  return supabase;
}

export const CHECKUP_RESULTS = [
  { key: "normal",    label: "正常",   tone: "green"  },
  { key: "attention", label: "需关注", tone: "orange" },
  { key: "recheck",   label: "需复查", tone: "orange" },
];
export function checkupResultMeta(key) {
  return CHECKUP_RESULTS.find((r) => r.key === key) || CHECKUP_RESULTS[0];
}

/** 上传一张体检图片，返回 public URL */
export async function uploadCheckupImage(file, userId = "anon", petId = "pet") {
  if (!file) throw new Error("缺少文件");
  if (!file.type?.startsWith("image/")) throw new Error("请选择图片");
  if (file.size > 10 * 1024 * 1024) throw new Error("图片不能超过 10MB");
  const compressed = await compressImage(file, { maxDim: 1600, quality: 0.82 });
  const path = `checkups/${userId}/${petId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
  const { error } = await sb().storage.from(IMG_BUCKET)
    .upload(path, compressed, { cacheControl: "86400", upsert: false, contentType: "image/jpeg" });
  if (error) throw new Error(`上传失败: ${error.message}`);
  const { data: pub } = sb().storage.from(IMG_BUCKET).getPublicUrl(path);
  if (!pub?.publicUrl) throw new Error("获取图片 URL 失败");
  return pub.publicUrl;
}

/** 拉某只宠物的全部体检记录（按体检日期倒序）*/
export async function listCheckupRecords(petId) {
  if (!petId) return [];
  const { data, error } = await sb()
    .from("pet_checkup_records")
    .select("*")
    .eq("pet_id", petId)
    .order("checkup_date", { ascending: false });
  if (error) throw new Error(`获取体检记录失败: ${error.message}`);
  return data || [];
}

/** 新增体检记录 */
export async function addCheckupRecord({
  userId, petId, checkupDate, clinicName, checkupItems,
  resultStatus, nextDueDate, notes, imageUrls,
}) {
  if (!userId || !petId) throw new Error("addCheckupRecord: 缺少 userId/petId");
  const { data, error } = await sb()
    .from("pet_checkup_records")
    .insert({
      user_id:       userId,
      pet_id:        petId,
      checkup_date:  checkupDate || new Date().toISOString().slice(0, 10),
      clinic_name:   clinicName?.trim() || null,
      checkup_items: checkupItems?.trim() || null,
      result_status: resultStatus || "normal",
      next_due_date: nextDueDate || null,
      notes:         notes?.trim() || null,
      image_urls:    Array.isArray(imageUrls) ? imageUrls : [],
    })
    .select()
    .single();
  if (error) throw new Error(`添加体检记录失败: ${error.message}`);
  return data;
}

/** 更新体检记录（仅自己的）*/
export async function updateCheckupRecord(id, userId, fields) {
  if (!id || !userId) throw new Error("updateCheckupRecord: 缺少参数");
  const patch = {};
  if (fields.checkupDate   !== undefined) patch.checkup_date  = fields.checkupDate || null;
  if (fields.clinicName    !== undefined) patch.clinic_name   = fields.clinicName?.trim() || null;
  if (fields.checkupItems  !== undefined) patch.checkup_items = fields.checkupItems?.trim() || null;
  if (fields.resultStatus  !== undefined) patch.result_status = fields.resultStatus || "normal";
  if (fields.nextDueDate   !== undefined) patch.next_due_date = fields.nextDueDate || null;
  if (fields.notes         !== undefined) patch.notes         = fields.notes?.trim() || null;
  if (fields.imageUrls     !== undefined) patch.image_urls    = Array.isArray(fields.imageUrls) ? fields.imageUrls : [];
  patch.updated_at = new Date().toISOString();
  const { data, error } = await sb()
    .from("pet_checkup_records")
    .update(patch).eq("id", id).eq("user_id", userId)
    .select().single();
  if (error) throw new Error(`更新体检记录失败: ${error.message}`);
  return data;
}

/** 删除体检记录（仅自己的）*/
export async function deleteCheckupRecord(id, userId) {
  if (!id || !userId) throw new Error("deleteCheckupRecord: 缺少参数");
  const { error } = await sb()
    .from("pet_checkup_records")
    .delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(`删除失败: ${error.message}`);
}
