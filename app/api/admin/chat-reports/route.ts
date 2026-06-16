/**
 * /api/admin/chat-reports — 聊天举报管理（service_role）
 *
 * GET  ?adminId=&chatType=private|group&status=pending|resolved|rejected|all
 *   返回该类型的举报，拼接举报人/被举报人信息（含 muted_until）。
 * POST { adminId, id, action, adminNote?, muteDays? }
 *   - resolve : 标记已处理
 *   - reject  : 驳回
 *   - mute    : 禁言被举报人 muteDays 天（1/3/7；永久传大数如 36500），并标记 resolved
 *   - unmute  : 解除被举报人禁言
 *   记录 handled_by / handled_at / admin_note。
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
  const chatType = url.searchParams.get("chatType") || "private";
  const status = url.searchParams.get("status") || "pending";
  const gate = await assertAdmin(adminId);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });

  let q = supabaseAdmin!.from("chat_reports").select("*")
    .eq("chat_type", chatType).order("created_at", { ascending: false }).limit(200);
  if (status !== "all") q = q.eq("status", status);
  const { data: reports, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows: any[] = reports || [];
  const userIds = [...new Set(rows.flatMap((r) => [r.reporter_user_id, r.reported_user_id]).filter(Boolean))];
  const um: Record<string, any> = {};
  if (userIds.length) {
    const { data: users } = await supabaseAdmin!.from("users")
      .select("id, username, user_no, muted_until, banned_until").in("id", userIds);
    (users || []).forEach((u: any) => { um[u.id] = u; });
  }
  const enriched = rows.map((r) => ({
    ...r,
    reporter: um[r.reporter_user_id] || null,
    reported: um[r.reported_user_id] || null,
  }));
  return NextResponse.json({ reports: enriched });
}

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "请求体格式错误" }, { status: 400 }); }

  const { adminId, id, action, adminNote, muteDays } = body || {};
  const gate = await assertAdmin(adminId);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  if (!["resolve", "reject", "mute", "unmute"].includes(action)) {
    return NextResponse.json({ error: "action 非法" }, { status: 400 });
  }

  const { data: rep } = await supabaseAdmin!
    .from("chat_reports").select("id, reported_user_id").eq("id", id).maybeSingle();
  if (!rep) return NextResponse.json({ error: "举报记录不存在" }, { status: 404 });

  // 禁言 / 解禁
  if (action === "mute") {
    if (!rep.reported_user_id) return NextResponse.json({ error: "该举报无明确被举报人，无法禁言" }, { status: 400 });
    const days = Number(muteDays) > 0 ? Number(muteDays) : 1;
    const until = new Date(Date.now() + days * 86400000).toISOString();
    const { error: me } = await supabaseAdmin!.from("users").update({ muted_until: until }).eq("id", rep.reported_user_id);
    if (me) return NextResponse.json({ error: `禁言失败: ${me.message}` }, { status: 500 });
  } else if (action === "unmute" && rep.reported_user_id) {
    const { error: me } = await supabaseAdmin!.from("users").update({ muted_until: null }).eq("id", rep.reported_user_id);
    if (me) return NextResponse.json({ error: `解除禁言失败: ${me.message}` }, { status: 500 });
  }

  const now = new Date().toISOString();
  const note = typeof adminNote === "string" && adminNote.trim() ? adminNote.trim().slice(0, 200) : null;
  const upd: Record<string, any> = {
    status: action === "reject" ? "rejected" : "resolved",
    handled_by: adminId, handled_at: now, updated_at: now,
  };
  if (note) upd.admin_note = note;

  const { data, error } = await supabaseAdmin!
    .from("chat_reports").update(upd).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ report: data });
}
