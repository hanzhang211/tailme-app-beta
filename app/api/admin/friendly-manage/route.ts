/**
 * /api/admin/friendly-manage — 友好地点管理（service_role）
 * GET  ?adminId=&status=   列出（pending/approved/all）
 * POST { adminId, id, action:'approve'|'reject'|'edit'|'delete', patch:{ title } }
 *   - approve: status='approved'（可同时改 title）→ 才会在友好地图展示
 *   - reject : status='rejected'
 *   - edit   : 修改标题（admin 可缩短/规范）
 *   - delete : status='deleted'（软删，不在地图显示）
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
  const status = url.searchParams.get("status") || "approved";
  const gate = await assertAdmin(adminId);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });
  let q = supabaseAdmin!.from("pet_friendly_reports").select("*").order("created_at", { ascending: false });
  if (status !== "all") q = q.eq("status", status); else q = q.neq("status", "deleted");
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reports: data || [] });
}

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "请求体格式错误" }, { status: 400 }); }
  const { adminId, id, action, patch } = body || {};
  const gate = await assertAdmin(adminId);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

  const now = new Date().toISOString();
  let upd: Record<string, any> = { updated_at: now };
  if (action === "approve") {
    upd.status = "approved";
    if (patch?.title?.trim()) upd.title = patch.title.trim();
  } else if (action === "reject") {
    upd.status = "rejected";
  } else if (action === "edit") {
    if (!patch?.title?.trim()) return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
    upd.title = patch.title.trim();
  } else if (action === "delete") {
    upd.status = "deleted";
  } else {
    return NextResponse.json({ error: "action 非法" }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin!.from("pet_friendly_reports").update(upd).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ report: data });
}
