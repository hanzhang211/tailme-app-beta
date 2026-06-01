/**
 * services/petAvatarService.js
 *
 * AI 宠物头像生成流程（前端侧）：
 *  1. 用户选图 → 压缩
 *  2. uploadOriginalPhoto() 上传原图到 pet-avatars/<userId>/<petId>/original-*.jpg
 *  3. generateAIAvatar() 调 /api/generate-pet-avatar → 服务端 Replicate + 保存
 *  4. saveAIAvatarToPet() 把 ai_avatar_url 写回 pets 表
 *
 * 不在前端暴露 REPLICATE_API_TOKEN。
 */

import { supabase } from "@/lib/supabase";

function sb() {
  if (!supabase) throw new Error("Supabase 未初始化");
  return supabase;
}

/**
 * 上传一张原始宠物照片到 pet-avatars bucket。
 * @returns { url: string, path: string }
 */
export async function uploadOriginalPhoto(file, userId, petId) {
  if (!file || !userId || !petId) throw new Error("缺少 file / userId / petId");
  if (file.size > 10 * 1024 * 1024) throw new Error("照片不能超过 10MB");

  const ext = (file.name?.split(".").pop() || "jpg")
    .toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeExt = ext.length > 0 && ext.length <= 5 ? ext : "jpg";
  const path = `${userId}/${petId}/original-${Date.now()}.${safeExt}`;

  const { error } = await sb().storage
    .from("pet-avatars")
    .upload(path, file, { cacheControl: "86400", upsert: false });
  if (error) throw new Error(`上传失败: ${error.message}`);

  const { data: pub } = sb().storage.from("pet-avatars").getPublicUrl(path);
  if (!pub?.publicUrl) throw new Error("获取图片 URL 失败");
  return { url: pub.publicUrl, path };
}

/**
 * 上传用户自定义头像（不绑定具体宠物），返回 public URL。
 */
export async function uploadUserAvatar(file, userId) {
  if (!file || !userId) throw new Error("缺少 file / userId");
  if (file.size > 10 * 1024 * 1024) throw new Error("图片不能超过 10MB");

  const ext = (file.name?.split(".").pop() || "jpg")
    .toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeExt = ext.length > 0 && ext.length <= 5 ? ext : "jpg";
  const path = `${userId}/user-avatar-${Date.now()}.${safeExt}`;

  const { error } = await sb().storage
    .from("pet-avatars")
    .upload(path, file, { cacheControl: "86400", upsert: false });
  if (error) throw new Error(`上传失败: ${error.message}`);

  const { data: pub } = sb().storage.from("pet-avatars").getPublicUrl(path);
  if (!pub?.publicUrl) throw new Error("获取图片 URL 失败");
  return pub.publicUrl;
}

/**
 * 调用后端 API 生成 AI 头像。
 * @param signal AbortSignal（用户取消时中止）
 * @returns { aiUrl }
 */
export async function generateAIAvatar({ userId, petId, photoUrl, petType = "dog" }, signal) {
  if (!userId || !petId || !photoUrl) throw new Error("缺少 userId / petId / photoUrl");

  const res = await fetch("/api/generate-pet-avatar", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ userId, petId, photoUrl, petType }),
    signal,
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "生成失败" }));
    throw new Error(error || "生成失败");
  }
  const { aiUrl, thumbUrl } = await res.json();
  if (!aiUrl) throw new Error("AI 服务未返回图片");
  return { aiUrl, thumbUrl: thumbUrl ?? null };
}

/**
 * 保存 AI 头像 / 原图 URL 到 pets 表。
 */
export async function saveAIAvatarToPet(petId, userId, { aiAvatarUrl, originalPhotoUrl, petAvatarThumbUrl }) {
  if (!petId || !userId) throw new Error("缺少 petId / userId");
  const patch = {};
  if (aiAvatarUrl        !== undefined) patch.ai_avatar_url        = aiAvatarUrl;
  if (originalPhotoUrl   !== undefined) patch.original_photo_url   = originalPhotoUrl;
  if (petAvatarThumbUrl  !== undefined) patch.pet_avatar_thumb_url = petAvatarThumbUrl;
  if (Object.keys(patch).length === 0) return;

  const { data, error } = await sb().from("pets")
    .update(patch)
    .eq("id", petId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw new Error(`保存头像失败: ${error.message}`);
  return data;
}

// TODO: 后期加每日次数限制
//   方案 A：服务端记 user_id+date 计数表，前端先 GET /api/generate-pet-avatar/quota
//   方案 B：用 Redis / Upstash KV 做 rate limit
