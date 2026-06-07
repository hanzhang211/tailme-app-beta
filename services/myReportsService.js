/**
 * services/myReportsService.js
 * 用户端「审核」页数据层：调 /api/my/reports（service_role）。
 * 无 Supabase Auth：用户读自己全部状态的记录 + 下架/上架/删除/撤回都经此路由，
 * 服务端按 reporter_user_id 校验归属。kind: 'friendly' | 'warning'。
 */

async function postJSON(body) {
  const res = await fetch("/api/my/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "操作失败");
  return json.report;
}

/** 拉取当前用户某一类（friendly/warning）的全部记录（排除 deleted） */
export async function listMyReports(userId, kind) {
  if (!userId) return [];
  const res = await fetch(`/api/my/reports?userId=${encodeURIComponent(userId)}&kind=${kind}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "加载失败");
  return json.reports || [];
}

/** approved → offline（下架） */
export const takeOffline = (userId, kind, id) => postJSON({ userId, kind, id, action: "offline" });
/** offline → approved（重新上架） */
export const relist = (userId, kind, id) => postJSON({ userId, kind, id, action: "relist" });
/** 永久删除（软删 status=deleted） */
export const removeReport = (userId, kind, id) => postJSON({ userId, kind, id, action: "delete" });
/** pending → deleted（撤回提交） */
export const withdrawReport = (userId, kind, id) => postJSON({ userId, kind, id, action: "withdraw" });
