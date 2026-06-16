"use client";

/**
 * services/reportAdminService.js
 * Admin 举报管理：
 *  - 帖子举报：/api/admin/post-reports
 *  - 聊天举报：/api/admin/chat-reports（私聊/群聊 + 禁言）
 */

/* ── 帖子举报 ── */
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

/* ── 聊天举报（私聊/群聊）── */
export async function adminListChatReports(adminId, chatType = "private", status = "pending") {
  const res = await fetch(
    `/api/admin/chat-reports?adminId=${encodeURIComponent(adminId)}&chatType=${chatType}&status=${encodeURIComponent(status)}`
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "加载失败");
  return json.reports || [];
}

/** action: resolve | reject | mute | unmute；mute 时传 muteDays（1/3/7；永久传 36500） */
export async function adminHandleChatReport({ adminId, id, action, adminNote, muteDays }) {
  const res = await fetch("/api/admin/chat-reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, id, action, adminNote, muteDays }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "操作失败");
  return json.report;
}
