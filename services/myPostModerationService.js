"use client";

/**
 * services/myPostModerationService.js
 * 用户端「审核」页的帖子数据：我被下架的帖子 + 我的举报记录（走 /api/my/post-moderation）。
 */

export async function listMyPostModeration(userId) {
  if (!userId) return { posts: [], reports: [] };
  const res = await fetch(`/api/my/post-moderation?userId=${encodeURIComponent(userId)}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "加载失败");
  return { posts: json.posts || [], reports: json.reports || [] };
}
