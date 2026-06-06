/**
 * services/friendlyAdminService.js
 * Admin 端「友好地点管理」：读取全部 + 改标题 + 删除。走 /api/admin/friendly-manage（service_role）。
 */

export async function adminListFriendly(adminId, status = "approved") {
  const res = await fetch(`/api/admin/friendly-manage?adminId=${encodeURIComponent(adminId)}&status=${encodeURIComponent(status)}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "加载失败");
  return json.reports || [];
}

export async function adminApproveFriendly({ adminId, id, title }) {
  return post({ adminId, id, action: "approve", patch: title ? { title } : undefined });
}
export async function adminRejectFriendly({ adminId, id }) {
  return post({ adminId, id, action: "reject" });
}
export async function adminEditFriendlyTitle({ adminId, id, title }) {
  return post({ adminId, id, action: "edit", patch: { title } });
}
export async function adminDeleteFriendly({ adminId, id }) {
  return post({ adminId, id, action: "delete" });
}

async function post(body) {
  const res = await fetch("/api/admin/friendly-manage", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "操作失败");
  return json.report;
}
