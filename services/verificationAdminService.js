/**
 * services/verificationAdminService.js
 * Admin 用户认证审核客户端层 → /api/admin/verifications（service_role 校验 admin）。
 */

export async function adminListVerifications(adminId, status = "pending") {
  const res = await fetch(`/api/admin/verifications?adminId=${encodeURIComponent(adminId)}&status=${status}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "加载失败");
  return json.submissions || [];
}

export async function adminReviewVerification({ adminId, id, action, adminNote, rejectionReason }) {
  const res = await fetch("/api/admin/verifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, id, action, adminNote, rejectionReason }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "操作失败");
  return json;
}
