"use client";

/**
 * services/postReportService.js
 *
 * 帖子举报（用户端）：
 *  - REPORT_REASONS：举报原因单选项
 *  - uploadReportImage：举报截图压缩后传到 post-images bucket 的 reports/ 前缀
 *  - submitPostReport：提交举报 → /api/community/report（service_role 写 post_reports）
 *
 * Admin 审核走 /api/admin/post-reports（第二步实现）。
 */

import { supabase } from "@/lib/supabase";
import { compressImage } from "@/services/imageCompress";

/** 举报原因（单选）*/
export const REPORT_REASONS = [
  "不当内容", "色情低俗", "骚扰辱骂", "虚假信息",
  "广告引流", "盗图侵权", "涉及虐待动物", "其他",
];

/** 上传一张举报截图 → post-images/reports/<userId>/...，返回 public URL */
export async function uploadReportImage(file, userId = "anon") {
  if (!file) throw new Error("缺少文件");
  if (!file.type?.startsWith("image/")) throw new Error("请选择图片");
  if (file.size > 10 * 1024 * 1024) throw new Error("图片不能超过 10MB");
  if (!supabase) throw new Error("Supabase 未初始化");
  const blob = await compressImage(file, { maxDim: 1600, quality: 0.82 });
  const path = `reports/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
  const { error } = await supabase.storage.from("post-images")
    .upload(path, blob, { cacheControl: "86400", upsert: false, contentType: "image/jpeg" });
  if (error) throw new Error(`上传失败: ${error.message}`);
  const { data: pub } = supabase.storage.from("post-images").getPublicUrl(path);
  if (!pub?.publicUrl) throw new Error("获取图片地址失败");
  return pub.publicUrl;
}

/** 提交帖子举报 */
export async function submitPostReport({ userId, postId, reason, detail, evidenceImages }) {
  const res = await fetch("/api/community/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, postId, reason, detail, evidenceImages }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "提交失败，请稍后重试");
  return json;
}
