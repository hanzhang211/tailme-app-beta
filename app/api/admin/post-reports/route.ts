/**
 * /api/admin/post-reports — 帖子举报管理（service_role）
 *
 * GET  ?adminId=&status=pending|resolved|rejected|all
 *   返回举报列表，并拼接 被举报帖子 / 举报人 / 被举报作者 信息（post_reports 无外键，手动批量取）。
 * POST { adminId, id, action, adminNote }
 *   - resolve     : 标记已处理（status=resolved）
 *   - reject      : 驳回举报（status=rejected）
 *   - hide-post   : 隐藏被举报帖（posts.status=hidden）并把举报标记 resolved
 *   - delete-post : 删除被举报帖（删 posts）并把举报标记 resolved
 *   都会记录 handled_by / handled_at / admin_note。
 * 校验：adminId 对应 users.role==='admin'。
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function assertAdmin(adminId?: string | null) {
  if (!adminId) return { ok: false as const, error: "缺少 adminId" };
  if (!supabaseAdmin) return { ok: false as const, error: "SUPABASE_SERVICE_ROLE_KEY 未配置" };
  const { data, error } = await supabaseAdmin.from("users").select("role").eq("id", adminId).maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  if (!data || data.role !== "admin") return { ok: false as const, error: "需要管理员权限" };
  return { ok: true as const };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const adminId = url.searchParams.get("adminId");
  const status = url.searchParams.get("status") || "pending";
  const gate = await assertAdmin(adminId);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });

  let q = supabaseAdmin!.from("post_reports").select("*").order("created_at", { ascending: false }).limit(200);
  if (status !== "all") q = q.eq("status", status);
  const { data: reports, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows: any[] = reports || [];
  const postIds = [...new Set(rows.map((r) => r.post_id).filter(Boolean))];
  const userIds = [...new Set(rows.flatMap((r) => [r.reporter_user_id, r.post_author_id]).filter(Boolean))];

  const postMap: Record<string, any> = {};
  if (postIds.length) {
    const { data: posts } = await supabaseAdmin!.from("posts")
      .select("id, title, content, post_type, cover_thumbnail_url, thumbnail_urls, display_image_urls, status, like_count, comment_count")
      .in("id", postIds);
    (posts || []).forEach((p: any) => { postMap[p.id] = p; });
  }
  const userMap: Record<string, any> = {};
  if (userIds.length) {
    const { data: users } = await supabaseAdmin!.from("users")
      .select("id, username, user_no, banned_until").in("id", userIds);
    (users || []).forEach((u: any) => { userMap[u.id] = u; });
  }

  const enriched = rows.map((r) => ({
    ...r,
    post: postMap[r.post_id] || null,
    reporter: userMap[r.reporter_user_id] || null,
    author: userMap[r.post_author_id] || null,
  }));
  return NextResponse.json({ reports: enriched });
}

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "请求体格式错误" }, { status: 400 }); }

  const { adminId, id, action, adminNote } = body || {};
  const gate = await assertAdmin(adminId);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  if (!["resolve", "reject", "hide-post", "delete-post"].includes(action)) {
    return NextResponse.json({ error: "action 非法" }, { status: 400 });
  }

  const { data: rep } = await supabaseAdmin!
    .from("post_reports").select("id, post_id").eq("id", id).maybeSingle();
  if (!rep) return NextResponse.json({ error: "举报记录不存在" }, { status: 404 });

  // 涉及帖子的动作：先处理被举报帖
  if (action === "hide-post" && rep.post_id) {
    const { error: pe } = await supabaseAdmin!.from("posts").update({ status: "hidden" }).eq("id", rep.post_id);
    if (pe) return NextResponse.json({ error: `隐藏帖子失败: ${pe.message}` }, { status: 500 });
  } else if (action === "delete-post" && rep.post_id) {
    const { error: pe } = await supabaseAdmin!.from("posts").delete().eq("id", rep.post_id);
    if (pe) return NextResponse.json({ error: `删除帖子失败: ${pe.message}` }, { status: 500 });
  }

  const now = new Date().toISOString();
  const note = typeof adminNote === "string" && adminNote.trim() ? adminNote.trim().slice(0, 200) : null;
  const upd: Record<string, any> = {
    status: action === "reject" ? "rejected" : "resolved",
    handled_by: adminId, handled_at: now, updated_at: now,
  };
  if (note) upd.admin_note = note;

  const { data, error } = await supabaseAdmin!
    .from("post_reports").update(upd).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ report: data });
}
