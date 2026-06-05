/**
 * services/shopService.js
 *
 * 用户端商城的「真实数据」层（Supabase）。
 * 只暴露 **已上线** 的商品：product.status==='approved' 且其 store.status==='approved'。
 * 把库内字段映射为商城 UI 期望的形状（cover / images / original / soldCount …）。
 */

import { supabase } from "@/lib/supabase";

function sb() {
  if (!supabase) throw new Error("Supabase 未初始化");
  return supabase;
}

export function mapStore(s, productCount = 0) {
  return {
    id: s.id,
    name: s.name,
    logo: s.logo_url || null,
    emoji: "🏪",          // 无 logo 时的占位
    official: false,
    desc: s.intro || "",
    contact: s.contact || "",
    productCount,
    fans: "—",
    rating: 5.0,
    status: s.status,
  };
}

export function mapProduct(p) {
  const gallery = Array.isArray(p.gallery) ? p.gallery : [];
  const detail = Array.isArray(p.detail_images) ? p.detail_images : [];
  const images = [p.main_image, ...gallery].filter(Boolean);
  return {
    id: p.id,
    title: p.title,
    price: p.price,
    original: p.original_price || null,
    cover: p.main_image || null,
    images,                       // 详情页主图轮播
    detailImages: detail,         // 详情大图
    emoji: "🐾",                  // 无图时占位
    tone: "cream",
    categoryId: p.category_id,
    storeId: p.store_id,
    soldCount: p.sold_count || 0,
    stock: p.stock,
    unit: p.unit || "",
    tags: Array.isArray(p.tags) ? p.tags : [],
    desc: p.description || "",
  };
}

/** 拉取全部已上线商品 + 其已审核店铺，返回映射后的 { products, stores }。 */
export async function fetchShopData() {
  const { data: stores, error: se } = await sb()
    .from("stores").select("*").eq("status", "approved");
  if (se) throw new Error(se.message);

  const okIds = (stores || []).map((s) => s.id);
  let products = [];
  if (okIds.length) {
    const { data, error } = await sb()
      .from("products").select("*").eq("status", "approved").in("store_id", okIds)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    products = data || [];
  }

  const countByStore = {};
  products.forEach((p) => { countByStore[p.store_id] = (countByStore[p.store_id] || 0) + 1; });

  return {
    products: products.map(mapProduct),
    stores: (stores || []).map((s) => mapStore(s, countByStore[s.id] || 0)),
  };
}
