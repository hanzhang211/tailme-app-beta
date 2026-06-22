/**
 * services/memorialLetterService.js
 * 星球信箱「写给它的信」真实持久化（Supabase memorial_letters，anon 直连，按 pet_id 过滤）。
 */
import { supabase } from "@/lib/supabase";

/** 取某宠物的全部信件（最新在前） */
export async function listMemorialLetters(petId) {
  if (!petId) return [];
  const { data, error } = await supabase
    .from("memorial_letters")
    .select("*")
    .eq("pet_id", petId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[memorialLetters] list 失败:", error.message);
    return [];
  }
  return data || [];
}

/** 写一封信（记录在案） */
export async function addMemorialLetter({ userId, petId, title, content }) {
  if (!petId) throw new Error("缺少宠物信息");
  if (!content || !content.trim()) throw new Error("信件内容不能为空");
  const { data, error } = await supabase
    .from("memorial_letters")
    .insert({
      user_id: userId || null,
      pet_id: petId,
      title: (title || "").trim() || null,
      content: content.trim(),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
