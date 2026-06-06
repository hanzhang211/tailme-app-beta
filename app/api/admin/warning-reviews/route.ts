/**
 * /api/admin/warning-reviews  — 宠物警示审核（service_role）
 *
 * GET  ?adminId=&status=pending|approved|rejected|all   列出（可读所有状态）
 * POST { adminId, id, action:'approve'|'reject'|'delete', patch }
 *   - approve : status=approved，需 risk_level；可改 admin_title/event_type/admin_note；
 *               记录 reviewed_by/reviewed_at（唯一能置 approved 的入口）
 *   - reject  : status=rejected，需 rejection_reason
 *   - delete  : status=deleted（软删，不在用户端显示）
 * 校验：adminId 对应 users.role==='admin'。
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const RISKS = ["low", "medium", "high", "critical"];

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

  let q = supabaseAdmin!.from("pet_warning_reports").select("*").order("created_at", { ascending: false });
  if (status !== "all") q = q.eq("status", status);
  else q = q.neq("status", "deleted");
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
  if (!["approve", "reject", "delete"].includes(action)) return NextResponse.json({ error: "action 非法" }, { status: 400 });

  const now = new Date().toISOString();
  let upd: Record<string, any> = { updated_at: now };

  if (action === "approve") {
    const risk = patch?.risk_level;
    if (!RISKS.includes(risk)) return NextResponse.json({ error: "请先选择风险等级" }, { status: 400 });
    upd = {
      ...upd,
      status: "approved",
      risk_level: risk,
      admin_title: patch?.admin_title?.trim() || null,
      admin_note: patch?.admin_note?.trim() || null,
      rejection_reason: null,
      reviewed_by: adminId,
      reviewed_at: now,
    };
    if (patch?.event_type) upd.event_type = patch.event_type;
  } else if (action === "reject") {
    if (!patch?.rejection_reason?.trim()) return NextResponse.json({ error: "驳回需填写原因" }, { status: 400 });
    upd = { ...upd, status: "rejected", rejection_reason: patch.rejection_reason.trim(), reviewed_by: adminId, reviewed_at: now };
  } else {
    upd = { ...upd, status: "deleted", reviewed_by: adminId, reviewed_at: now };
  }

  const { data, error } = await supabaseAdmin!
    .from("pet_warning_reports").update(upd).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ report: data });
}
