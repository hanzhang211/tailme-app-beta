/**
 * services/warningAdminService.js
 * Admin 端「宠物警示审核」。读取(所有状态)与审核动作都走 /api/admin/warning-reviews
 * （service_role 绕过 RLS + 校验 role='admin'）；anon 无法读 pending / 改记录。
 */

export async function adminListWarnings(adminId, status = "pending") {
  const res = await fetch(`/api/admin/warning-reviews?adminId=${encodeURIComponent(adminId)}&status=${encodeURIComponent(status)}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "加载失败");
  return json.reports || [];
}

/**
 * action: 'approve' | 'reject' | 'delete'
 * patch（approve 时可带）: { admin_title, event_type, risk_level, admin_note }
 * reject 时：{ rejection_reason }
 */
export async function adminReviewWarning({ adminId, id, action, patch }) {
  const res = await fetch("/api/admin/warning-reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, id, action, patch }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "操作失败");
  return json.report;
}
