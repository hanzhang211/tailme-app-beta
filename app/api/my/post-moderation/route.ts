/**
 * GET /api/my/post-moderation?userId=
 *
 * 用户端「审核」页的帖子相关数据（service_role，按 userId 取自己的）：
 *  - posts:   我自己被管理员下架(status=hidden)的帖子（只读展示）
 *  - reports: 我提交的帖子举报，并拼接被举报帖现状（post=null 表示帖子已被删除）
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY 未配置" }, { status: 500 });
  }
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  // ① 我被下架的帖子
  const { data: posts, error: pe } = await supabaseAdmin
    .from("posts")
    .select("id, title, content, post_type, cover_thumbnail_url, thumbnail_urls, display_image_urls, status, created_at")
    .eq("user_id", userId).eq("status", "hidden")
    .order("created_at", { ascending: false }).limit(100);
  if (pe) return NextResponse.json({ error: pe.message }, { status: 500 });

  // ② 我的举报
  const { data: reports, error: re } = await supabaseAdmin
    .from("post_reports")
    .select("*")
    .eq("reporter_user_id", userId)
    .order("created_at", { ascending: false }).limit(100);
  if (re) return NextResponse.json({ error: re.message }, { status: 500 });

  // 拼接被举报帖现状（post_reports 无外键，手动取）
  const rows: any[] = reports || [];
  const postIds = [...new Set(rows.map((r) => r.post_id).filter(Boolean))];
  const pm: Record<string, any> = {};
  if (postIds.length) {
    const { data: ps } = await supabaseAdmin.from("posts")
      .select("id, title, content, cover_thumbnail_url, thumbnail_urls, display_image_urls, status")
      .in("id", postIds);
    (ps || []).forEach((p: any) => { pm[p.id] = p; });
  }
  const enrichedReports = rows.map((r) => ({ ...r, post: pm[r.post_id] || null }));

  return NextResponse.json({ posts: posts || [], reports: enrichedReports });
}
