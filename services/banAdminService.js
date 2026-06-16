"use client";

/**
 * services/banAdminService.js
 * Admin 账号封禁：按账号搜索用户 / 列出封禁中用户 / 封禁 / 解封。
 * 走 /api/admin/users（service_role + assertAdmin）。方案 B（用户封禁 Tab）与方案 A（举报详情）共用。
 */

/* 封禁时长选项：7天 / 30天 / 永久（永久 = 36500 天，年份≥2099 视为永久）*/
export const BAN_OPTS = [
  { d: 7,     label: "封禁 7 天" },
  { d: 30,    label: "封禁 30 天" },
  { d: 36500, label: "永久封禁" },
];

/* 按关键词搜索用户（user_no 精确 + 用户名模糊）*/
export async function adminSearchUsers(adminId, q) {
  const res = await fetch(
    `/api/admin/users?adminId=${encodeURIComponent(adminId)}&q=${encodeURIComponent(q)}`
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "搜索失败");
  return json.users || [];
}

/* 当前封禁中的用户列表 */
export async function adminListBannedUsers(adminId) {
  const res = await fetch(
    `/api/admin/users?adminId=${encodeURIComponent(adminId)}&banned=1`
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "加载失败");
  return json.users || [];
}

/** action: 'ban' | 'unban'；ban 时传 banDays（7/30；永久传 36500）*/
export async function adminSetBan({ adminId, targetUserId, action, banDays }) {
  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, targetUserId, action, banDays }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "操作失败");
  return json.user;
}
