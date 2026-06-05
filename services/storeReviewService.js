/**
 * services/storeReviewService.js
 *
 * 平台审核员（admin）用的数据层：列出待审核店铺/商品 + 审核操作。
 *  - 读取：anon 客户端（与现有 admin 列表读取一致；RLS 在新表上未启用）。
 *  - 审核动作（通过/驳回）：走 /api/admin/* 服务端 service_role + 校验 role==='admin'。
 *    这是真正的安全边界 —— 只有 admin 能把状态改成 approved。
 */

import { supabase } from "@/lib/supabase";

function sb() {
  if (!supabase) throw new Error("Supabase 未初始化");
  return supabase;
}

/* ── 店铺审核 ───────────────────────────────────────── */
// status: 'pending_review' | 'approved' | 'rejected' | 'all'
export async function adminListStores(status = "pending_review") {
  let q = sb().from("stores").select("*").order("created_at", { ascending: false });
  if (status && status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function adminReviewStore({ adminId, storeId, action, reason }) {
  const res = await fetch("/api/admin/store-reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, storeId, action, reason }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "操作失败");
  return json.store;
}

/* ── 商品审核 ───────────────────────────────────────── */
export async function adminListProducts(status = "pending_review") {
  let q = sb().from("products").select("*").order("submitted_at", { ascending: false, nullsFirst: false });
  if (status && status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function adminGetProductDocs(productId) {
  if (!productId) return [];
  const { data, error } = await sb().from("product_docs").select("*").eq("product_id", productId).order("created_at");
  if (error) throw new Error(error.message);
  return data || [];
}

// action: 'approve' | 'reject' | 'changes'(退回补充材料)
export async function adminReviewProduct({ adminId, productId, action, reason }) {
  const res = await fetch("/api/admin/product-reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, productId, action, reason }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "操作失败");
  return json.product;
}

// 一次性取每个店铺的名字（用于商品审核列表里展示店铺）
export async function adminMapStores(storeIds = []) {
  if (!storeIds.length) return {};
  const { data, error } = await sb().from("stores").select("id, name, status").in("id", storeIds);
  if (error) throw new Error(error.message);
  const m = {};
  (data || []).forEach((s) => { m[s.id] = s; });
  return m;
}
