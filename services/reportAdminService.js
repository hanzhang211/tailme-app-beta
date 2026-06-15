"use client";

/**
 * services/reportAdminService.js
 * Admin 帖子举报管理：列表查询 + 处理动作，走 /api/admin/post-reports（service_role）。
 */

export async function adminListReports(adminId, status = "pending") {
  const res = await fetch(
    `/api/admin/post-reports?adminId=${encodeURIComponent(adminId)}&status=${encodeURIComponent(status)}`
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "加载失败");
  return json.reports || [];
}

/** action: resolve | reject | hide-post | delete-post */
export async function adminHandleReport({ adminId, id, action, adminNote }) {
  const res = await fetch("/api/admin/post-reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, id, action, adminNote }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "操作失败");
  return json.report;
}
