/**
 * services/memorialMemoryService.js
 * 回忆相册「memorial_memories」真实持久化（Supabase，anon 直连，按 pet_id 过滤）。
 * 图片复用现有 post-images 公开桶，前缀 memorial-memories/{userId}/{petId}/{ts}.jpg。
 *
 * category 取值：daily | birthday | travel | favorite | null
 */
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/services/imageCompress";

function sb() {
  if (!supabase) throw new Error("Supabase 未初始化");
  return supabase;
}

/** 上传回忆图片到 post-images（原图 + 缩略图），返回 { url, thumbUrl } */
export async function uploadMemoryImage(file, userId, petId) {
  if (!file) throw new Error("请选择图片");
  if (!file.type?.startsWith("image/")) throw new Error("请选择图片文件");
  if (file.size > 10 * 1024 * 1024) throw new Error("图片不能超过 10MB");
  const base = `memorial-memories/${userId || "anon"}/${petId}/${Date.now()}`;
  const pub = (p) => sb().storage.from("post-images").getPublicUrl(p).data?.publicUrl || null;

  // 原图（详情用，最长边 1600）
  const full = await compressImage(file, { maxDim: 1600, quality: 0.82 });
  const { error } = await sb().storage.from("post-images").upload(`${base}.jpg`, full, { cacheControl: "86400", upsert: false });
  if (error) throw new Error(`上传失败: ${error.message}`);
  const url = pub(`${base}.jpg`);
  if (!url) throw new Error("获取图片 URL 失败");

  // 缩略图（列表/网格用，最长边 400；失败不阻断）
  let thumbUrl = null;
  try {
    const thumb = await compressImage(file, { maxDim: 400, quality: 0.72 });
    const { error: e2 } = await sb().storage.from("post-images").upload(`${base}_thumb.jpg`, thumb, { cacheControl: "86400", upsert: false });
    if (!e2) thumbUrl = pub(`${base}_thumb.jpg`);
  } catch { /* 缩略图失败忽略 */ }

  return { url, thumbUrl };
}

/** 取某宠物的全部回忆（最新在前） */
export async function listMemories(petId) {
  if (!petId) return [];
  const { data, error } = await sb()
    .from("memorial_memories")
    .select("*")
    .eq("pet_id", petId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[memorialMemories] list 失败:", error.message);
    return [];
  }
  return data || [];
}

/** 新增一条回忆卡片 */
export async function addMemory({ userId, petId, title, description, imageUrl, thumbUrl, memoryDate, category }) {
  if (!petId) throw new Error("缺少宠物信息");
  if (!title || !title.trim()) throw new Error("请填写标题");
  const { data, error } = await sb()
    .from("memorial_memories")
    .insert({
      user_id: userId || null,
      pet_id: petId,
      title: title.trim(),
      description: (description || "").trim() || null,
      image_url: imageUrl || null,
      thumb_url: thumbUrl || null,
      memory_date: memoryDate || null,
      category: category || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** 删除一条回忆卡片（连带 best-effort 删除其图片） */
export async function deleteMemory(memory) {
  if (!memory?.id) return;
  // best-effort 删 Storage 图片（原图 + 缩略图，失败忽略）
  try {
    const marker = "/post-images/";
    const paths = [memory.image_url, memory.thumb_url].map((u) => {
      const url = u || "";
      const idx = url.indexOf(marker);
      return idx >= 0 ? decodeURIComponent(url.slice(idx + marker.length).split("?")[0]) : null;
    }).filter(Boolean);
    if (paths.length) await sb().storage.from("post-images").remove(paths).catch(() => {});
  } catch { /* 删图失败不阻断删记录 */ }
  const { error } = await sb().from("memorial_memories").delete().eq("id", memory.id);
  if (error) throw new Error(error.message);
}
