/**
 * services/merchantService.js
 *
 * 商家后台数据层（/merchant 页面使用）。
 *
 * 设计与现有架构保持一致：
 *  - 读 / 普通写：anon supabase 客户端（与 savePetProfile / setUsername 同一信任级别）。
 *  - 真正的安全边界 = 「商品/店铺审核通过(approved)」，只能由 /api/admin/* 用 service_role 操作。
 *    商家自己永远只能把状态改成 draft / pending_review / offline，无法自审。
 *  - 图片暂存到现有公开 bucket（IMG_BUCKET），路径前缀 merchant/<storeId>/...，
 *    未来可平滑迁移到独立 bucket（只改这一个常量）。
 *
 * 商品上线到用户端的条件：product.status==='approved' 且其 store.status==='approved'。
 */

import { supabase } from "@/lib/supabase";
import { compressImage } from "@/services/imageCompress";
import { GRID_CATEGORIES } from "@/services/shopMock";

function sb() {
  if (!supabase) throw new Error("Supabase 未初始化");
  return supabase;
}

/* ── 常量 ───────────────────────────────────────────── */
const IMG_BUCKET = "pet-avatars"; // 复用现有公开 bucket（MVP）；未来可换独立 bucket

// 店铺状态
export const STORE_STATUS = {
  pending_review: { label: "审核中",   color: "#9C5A00", bg: "#FFF4D6" },
  approved:       { label: "已通过审核", color: "#2E7D32", bg: "#E6F4E1" },
  rejected:       { label: "审核不通过", color: "#D94040", bg: "#FFE2E2" },
};

// 商品状态
export const PRODUCT_STATUS = {
  draft:          { label: "草稿",     color: "#8A8074", bg: "#EFEAE1" },
  pending_review: { label: "待审核",   color: "#9C5A00", bg: "#FFF4D6" },
  approved:       { label: "已上线",   color: "#2E7D32", bg: "#E6F4E1" },
  rejected:       { label: "已驳回",   color: "#D94040", bg: "#FFE2E2" },
  offline:        { label: "已下架",   color: "#8A8074", bg: "#E4DDD2" },
};

// 商品分类（沿用商城 2×5 宫格分类，保证两端一致）
export const PRODUCT_CATEGORIES = GRID_CATEGORIES.map((c) => ({ id: c.id, name: c.name }));

// 高风险品类（驱虫药/药品）：MVP 不允许提交上线，只能人工
export const HIGH_RISK_CATEGORIES = ["deworm"];

// 各品类需要的证明材料（doc_type → 中文名）。base 为所有商品必填。
export const DOC_REQUIREMENTS = {
  base: [
    { type: "main_image_note", name: "商品主图", builtin: true },     // 主图随商品保存，不在 docs 表
    { type: "brand_auth",      name: "品牌授权 / 进货证明" },
    { type: "quality_report",  name: "产品质量证明 / 检测报告" },
  ],
  food: [ // 狗粮/猫粮/零食
    { type: "ingredients",        name: "配料表" },
    { type: "production_license", name: "生产许可证 / 进口证明" },
    { type: "quality_report",     name: "质检报告" },
    { type: "label_image",        name: "包装标签图" },
    { type: "shelf_life",         name: "保质期信息" },
    { type: "manufacturer",       name: "生产厂家信息" },
  ],
  health: [ // 保健品
    { type: "compliance_filing", name: "产品备案 / 合规说明" },
    { type: "ingredients",       name: "成分说明" },
    { type: "target",            name: "适用对象" },
    { type: "caution",           name: "禁忌 / 注意事项" },
  ],
};

const FOOD_CATS   = ["dogfood", "catfood", "snack"];
const HEALTH_CATS = ["health"];

// 给定分类 → 需要的证明材料清单（base + 品类特定，去重）
export function docsForCategory(categoryId) {
  const extra = FOOD_CATS.includes(categoryId)
    ? DOC_REQUIREMENTS.food
    : HEALTH_CATS.includes(categoryId)
      ? DOC_REQUIREMENTS.health
      : [];
  const base = DOC_REQUIREMENTS.base.filter((d) => !d.builtin);
  // 合并去重（按 type）
  const seen = new Set();
  return [...base, ...extra].filter((d) => (seen.has(d.type) ? false : seen.add(d.type)));
}

/* ── 图片 / 文件上传 ─────────────────────────────────── */
// kind: 'store' | 'product' | 'doc'。返回 public url。
export async function uploadMerchantImage(file, storeId, kind = "product") {
  if (!file) throw new Error("缺少文件");
  if (file.size > 10 * 1024 * 1024) throw new Error("文件不能超过 10MB");
  const isImg = file.type?.startsWith("image/");
  const payload = isImg ? await compressImage(file, { maxDim: 1600, quality: 0.85 }) : file;
  const ext = isImg ? "jpg" : (file.name?.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `merchant/${storeId || "_new"}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await sb().storage
    .from(IMG_BUCKET)
    .upload(path, payload, { cacheControl: "86400", upsert: false, contentType: isImg ? "image/jpeg" : (file.type || undefined) });
  if (error) throw new Error(`上传失败: ${error.message}`);
  const { data: pub } = sb().storage.from(IMG_BUCKET).getPublicUrl(path);
  if (!pub?.publicUrl) throw new Error("获取文件 URL 失败");
  return pub.publicUrl;
}

/* ── 店铺 ───────────────────────────────────────────── */
// 取当前商家的店铺（一个 owner 一个店铺，MVP）
export async function getMyStore(ownerId) {
  if (!ownerId) return null;
  const { data, error } = await sb()
    .from("stores")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`获取店铺失败: ${error.message}`);
  return data;
}

export async function getStoreById(storeId) {
  if (!storeId) return null;
  const { data, error } = await sb().from("stores").select("*").eq("id", storeId).maybeSingle();
  if (error) throw new Error(`获取店铺失败: ${error.message}`);
  return data;
}

/**
 * 入驻 / 保存店铺资质。
 *  - 没有店铺 → 通过 /api/merchant/enroll 创建（同时把 users.role 置为 merchant），状态 pending_review。
 *  - 已有店铺 → 直接更新资料；若 submit=true，则把状态重置为 pending_review（重新送审）。
 */
export async function saveStore({ userId, storeId, fields, submit = false }) {
  if (!userId) throw new Error("缺少 userId");

  if (!storeId) {
    // 首次入驻：走服务端（需要提升 role）
    const res = await fetch("/api/merchant/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, store: fields }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "入驻失败");
    return json.store;
  }

  // 已有店铺：更新资料
  const patch = { ...fields };
  if (submit) {
    patch.status = "pending_review";
    patch.reject_reason = null;
    patch.reviewed_at = null;
  }
  const { data, error } = await sb()
    .from("stores")
    .update(patch)
    .eq("id", storeId)
    .eq("owner_id", userId)
    .select()
    .single();
  if (error) throw new Error(`保存店铺失败: ${error.message}`);
  return data;
}

/* ── 商品 ───────────────────────────────────────────── */
export async function listMyProducts(storeId) {
  if (!storeId) return [];
  const { data, error } = await sb()
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`获取商品失败: ${error.message}`);
  return data || [];
}

export async function getMyProduct(productId) {
  if (!productId) return null;
  const { data, error } = await sb().from("products").select("*").eq("id", productId).maybeSingle();
  if (error) throw new Error(`获取商品失败: ${error.message}`);
  return data;
}

// 新建 / 更新商品。status: 'draft' | 'pending_review'（提交审核）。商家不可设 approved。
export async function saveProduct({ storeId, productId, fields, submit = false }) {
  if (!storeId) throw new Error("缺少 storeId");
  const status = submit ? "pending_review" : (fields.status || "draft");
  const payload = {
    store_id:       storeId,
    title:          fields.title?.trim(),
    category_id:    fields.category_id,
    price:          fields.price != null && fields.price !== "" ? parseFloat(fields.price) : 0,
    original_price: fields.original_price != null && fields.original_price !== "" ? parseFloat(fields.original_price) : null,
    stock:          fields.stock != null && fields.stock !== "" ? parseInt(fields.stock, 10) : 0,
    unit:           fields.unit || null,
    main_image:     fields.main_image || null,
    gallery:        fields.gallery || [],
    detail_images:  fields.detail_images || [],
    tags:           fields.tags || [],
    description:    fields.description || null,
    risk_level:     HIGH_RISK_CATEGORIES.includes(fields.category_id) ? "high" : "normal",
    status,
  };
  if (submit) { payload.submitted_at = new Date().toISOString(); payload.reject_reason = null; }

  if (productId) {
    const { data, error } = await sb().from("products").update(payload).eq("id", productId).eq("store_id", storeId).select().single();
    if (error) throw new Error(`保存商品失败: ${error.message}`);
    return data;
  }
  const { data, error } = await sb().from("products").insert(payload).select().single();
  if (error) throw new Error(`创建商品失败: ${error.message}`);
  return data;
}

// 商家操作：提交审核 / 下架 / 重新编辑（回到草稿）
export async function submitProduct(productId, storeId) {
  const { data, error } = await sb().from("products")
    .update({ status: "pending_review", submitted_at: new Date().toISOString(), reject_reason: null })
    .eq("id", productId).eq("store_id", storeId).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function setProductOffline(productId, storeId) {
  const { data, error } = await sb().from("products")
    .update({ status: "offline" }).eq("id", productId).eq("store_id", storeId).select().single();
  if (error) throw new Error(error.message);
  return data;
}
export async function deleteProduct(productId, storeId) {
  const { error } = await sb().from("products").delete().eq("id", productId).eq("store_id", storeId);
  if (error) throw new Error(error.message);
}

/* ── 商品证明材料（product_docs）─────────────────────── */
export async function listProductDocs(productId) {
  if (!productId) return [];
  const { data, error } = await sb().from("product_docs").select("*").eq("product_id", productId).order("created_at");
  if (error) throw new Error(error.message);
  return data || [];
}
// 全量替换某商品的证明材料（先删后插，简单可靠）
export async function saveProductDocs(productId, docs) {
  if (!productId) throw new Error("缺少 productId");
  await sb().from("product_docs").delete().eq("product_id", productId);
  const rows = (docs || []).filter((d) => d.file_url).map((d) => ({
    product_id: productId, doc_type: d.doc_type, file_url: d.file_url,
  }));
  if (rows.length === 0) return [];
  const { data, error } = await sb().from("product_docs").insert(rows).select();
  if (error) throw new Error(error.message);
  return data;
}

/* ── 商家首页统计 ────────────────────────────────────── */
export async function getMerchantStats(storeId) {
  const empty = { total: 0, pending: 0, approved: 0, rejected: 0, offline: 0, draft: 0 };
  if (!storeId) return empty;
  const products = await listMyProducts(storeId);
  return products.reduce((acc, p) => {
    acc.total += 1;
    if (acc[p.status] != null) acc[p.status] += 1;
    if (p.status === "pending_review") acc.pending += 1;
    return acc;
  }, { ...empty });
}
