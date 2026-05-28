/**
 * services/petNewsService.js
 *
 * 宠物资讯 / 活动推送：
 *  - 普通用户：listNews / getNews（只读）
 *  - 管理员：adminCreateNews / adminUpdateNews / adminDeleteNews 走 /api/admin/news
 */

import { supabase } from "@/lib/supabase";

function sb() {
  if (!supabase) throw new Error("Supabase 未初始化");
  return supabase;
}

/** 全部资讯（按 published_at 倒序） */
export async function listNews({ limit = 50 } = {}) {
  const { data, error } = await sb().from("pet_news")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`获取资讯失败: ${error.message}`);
  return data || [];
}

/** 取最新一条（首页卡片预览用） */
export async function getLatestNews() {
  const { data, error } = await sb().from("pet_news")
    .select("id, title, cover_image_url, emoji, published_at")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`获取最新资讯失败: ${error.message}`);
  return data;
}

export async function getNews(id) {
  if (!id) return null;
  const { data, error } = await sb().from("pet_news")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`获取资讯失败: ${error.message}`);
  return data;
}

/* ──────────────────────────────────────────────
   Admin —— 走 /api/admin/news（service_role 校验 role='admin'）
   ────────────────────────────────────────────── */
export async function adminCreateNews(adminId, news) {
  const res = await fetch("/api/admin/news", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, news }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "创建失败" }));
    throw new Error(error || "创建失败");
  }
  const json = await res.json();
  return json.news;
}

export async function adminUpdateNews(adminId, newsId, patch) {
  const res = await fetch("/api/admin/news", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, newsId, patch }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "更新失败" }));
    throw new Error(error || "更新失败");
  }
  const json = await res.json();
  return json.news;
}

export async function adminDeleteNews(adminId, newsId) {
  const res = await fetch("/api/admin/news", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, newsId }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "删除失败" }));
    throw new Error(error || "删除失败");
  }
}
