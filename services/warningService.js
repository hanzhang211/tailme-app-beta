/**
 * services/warningService.js
 * 「宠物警示」用户端数据层（Supabase，anon）。
 *  - listApprovedWarnings：地图只读 status='approved'（RLS 也强制）
 *  - submitWarning：写入 status='pending'（用户不可设风险等级/状态）
 *  - uploadWarningImage：压缩后传到 pet-warning-reports bucket，返回 public url
 * 审核 / 改风险等级 / 改标题 一律走 /api/admin/warning-reviews（service_role）。
 */

import { supabase } from "@/lib/supabase";
import { compressImage } from "@/services/imageCompress";

const BUCKET = "pet-warning-reports";
function sb() { if (!supabase) throw new Error("Supabase 未初始化"); return supabase; }

export async function listApprovedWarnings() {
  const { data, error } = await sb()
    .from("pet_warning_reports")
    .select("*")
    .eq("status", "approved")
    .order("reviewed_at", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function uploadWarningImage(file, userId = "anon") {
  if (!file) throw new Error("缺少文件");
  if (!file.type?.startsWith("image/")) throw new Error("请选择图片");
  if (file.size > 10 * 1024 * 1024) throw new Error("图片不能超过 10MB");
  const compressed = await compressImage(file, { maxDim: 1600, quality: 0.82 });
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
  const { error } = await sb().storage.from(BUCKET)
    .upload(path, compressed, { cacheControl: "86400", upsert: false, contentType: "image/jpeg" });
  if (error) throw new Error(`上传失败: ${error.message}`);
  const { data: pub } = sb().storage.from(BUCKET).getPublicUrl(path);
  if (!pub?.publicUrl) throw new Error("获取图片 URL 失败");
  return pub.publicUrl;
}

export async function submitWarning(payload) {
  // 后端硬校验认证（service_role）：仅 approved 用户可上报，防绕过前端拦截。
  const res = await fetch("/api/reports/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: payload.reporterUserId || null, kind: "warning", payload }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.error || "提交失败");
    err.code = json?.code;
    throw err;
  }
  return json;
}
