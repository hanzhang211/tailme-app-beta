/**
 * services/verificationService.js
 * 用户认证（资料认证）客户端数据层。全程走 service_role API（私有 bucket）。
 *  - uploadVerifyImage：压缩后逐张 POST 到 /api/verify/upload，返回私有 bucket path
 *  - submitVerification：提交认证（documentPaths[] + selfiePath + contactInfo）
 *  - getMyVerification：读取本人认证状态 + 最近一次提交（图片为短期签名 URL）
 */

import { compressImage } from "@/services/imageCompress";

export async function uploadVerifyImage(file, userId) {
  if (!file) throw new Error("缺少文件");
  if (!file.type?.startsWith("image/")) throw new Error("请选择图片");
  if (file.size > 10 * 1024 * 1024) throw new Error("图片不能超过 10MB");
  const compressed = await compressImage(file, { maxDim: 1600, quality: 0.82 });
  const fd = new FormData();
  fd.append("userId", userId || "");
  fd.append("file", compressed, "verify.jpg");
  const res = await fetch("/api/verify/upload", { method: "POST", body: fd });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "上传失败");
  return json.path;
}

export async function submitVerification({ userId, documentPaths, selfiePath, contactInfo }) {
  const res = await fetch("/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, documentPaths, selfiePath, contactInfo }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "提交失败");
  return json;
}

export async function getMyVerification(userId) {
  if (!userId) return { status: "unverified", submission: null };
  const res = await fetch(`/api/verify?userId=${encodeURIComponent(userId)}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "加载失败");
  return json;
}
