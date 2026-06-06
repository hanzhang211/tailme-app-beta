/**
 * services/friendlyService.js
 * 「友好地图」用户上报地点数据层（Supabase，anon）。
 *  - 审核制：用户提交 status='pending'，admin 审核通过后才在友好地图展示。
 *  - 图片复用 pet-warning-reports bucket（friendly/ 前缀）。
 */

import { supabase } from "@/lib/supabase";
import { compressImage } from "@/services/imageCompress";

const BUCKET = "pet-warning-reports";
function sb() { if (!supabase) throw new Error("Supabase 未初始化"); return supabase; }

export async function listFriendlyReports() {
  const { data, error } = await sb()
    .from("pet_friendly_reports")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function uploadFriendlyImage(file, userId = "anon") {
  if (!file) throw new Error("缺少文件");
  if (!file.type?.startsWith("image/")) throw new Error("请选择图片");
  if (file.size > 10 * 1024 * 1024) throw new Error("图片不能超过 10MB");
  const compressed = await compressImage(file, { maxDim: 1600, quality: 0.82 });
  const path = `friendly/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
  const { error } = await sb().storage.from(BUCKET)
    .upload(path, compressed, { cacheControl: "86400", upsert: false, contentType: "image/jpeg" });
  if (error) throw new Error(`上传失败: ${error.message}`);
  const { data: pub } = sb().storage.from(BUCKET).getPublicUrl(path);
  if (!pub?.publicUrl) throw new Error("获取图片 URL 失败");
  return pub.publicUrl;
}

export async function submitFriendly(payload) {
  const row = {
    reporter_user_id: payload.reporterUserId || null,
    title:            payload.title || payload.placeName || "宠物友好地点",
    description:      payload.description || null,
    place_name:       payload.placeName || null,
    address:          payload.address || null,
    latitude:         payload.latitude ?? null,
    longitude:        payload.longitude ?? null,
    images:           payload.images || [],
    has_water_bowl:   !!payload.hasWaterBowl,
    has_food_bowl:    !!payload.hasFoodBowl,
    allow_pet_inside: !!payload.allowPetInside,
    good_for_rest:    !!payload.goodForRest,
    contact_info:     payload.contactInfo || null,
    anonymous:        payload.anonymous !== false,
    status:           "pending",     // 审核制：待 admin 通过
  };
  // 不要 .select()：SELECT 策略只允许 approved，返回新插入 pending 行会触发 RLS。
  const { error } = await sb().from("pet_friendly_reports").insert(row);
  if (error) throw new Error(error.message);
  return { ...row };
}
