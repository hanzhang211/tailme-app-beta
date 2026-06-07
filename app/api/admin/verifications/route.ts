/**
 * /api/admin/verifications — 用户认证审核（service_role，校验 role='admin'）
 *
 * GET  ?adminId&status=pending|approved|rejected|all  列出提交（含用户号 + 签名图片 URL）
 * POST { adminId, id, action:'approve'|'reject', adminNote, rejectionReason }
 *   approve: submission.status=approved + users.verification_status='approved' + verified_at
 *   reject : submission.status=rejected + users.verification_status='rejected' + rejected_reason
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BUCKET = "user-verifications";
const SIGN_TTL = 600;

async function assertAdmin(adminId?: string | null) {
  if (!adminId) return { ok: false as const, error: "缺少 adminId" };
  if (!supabaseAdmin) return { ok: false as const, error: "SUPABASE_SERVICE_ROLE_KEY 未配置" };
  const { data, error } = await supabaseAdmin.from("users").select("role").eq("id", adminId).maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  if (!data || data.role !== "admin") return { ok: false as const, error: "需要管理员权限" };
  return { ok: true as const };
}

async function sign(path?: string | null) {
  if (!path || !supabaseAdmin) return null;
  const { data } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, SIGN_TTL);
  return data?.signedUrl || null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const adminId = url.searchParams.get("adminId");
  const status = url.searchParams.get("status") || "pending";
  const gate = await assertAdmin(adminId);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });

  let q = supabaseAdmin!.from("user_verification_submissions").select("*").order("created_at", { ascending: false });
  if (status !== "all") q = q.eq("status", status);
  const { data: subs, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = [...new Set((subs || []).map((s) => s.user_id))];
  const { data: users } = await supabaseAdmin!.from("users")
    .select("id, user_no, username, phone").in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
  const uMap = new Map((users || []).map((u) => [u.id, u]));

  const items = await Promise.all((subs || []).map(async (s) => {
    const u: any = uMap.get(s.user_id) || {};
    const docs = Array.isArray(s.document_images) ? s.document_images : [];
    return {
      id: s.id, user_id: s.user_id, status: s.status,
      user_no: u.user_no || null, username: u.username || null, phone: u.phone || null,
      contact_info: s.contact_info, admin_note: s.admin_note, rejection_reason: s.rejection_reason,
      created_at: s.created_at, reviewed_at: s.reviewed_at,
      doc_urls: (await Promise.all(docs.map(sign))).filter(Boolean),
      selfie_url: await sign(s.selfie_with_pet_image),
    };
  }));

  return NextResponse.json({ submissions: items });
}

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "请求体格式错误" }, { status: 400 }); }
  const { adminId, id, action, adminNote, rejectionReason } = body || {};
  const gate = await assertAdmin(adminId);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  if (!["approve", "reject"].includes(action)) return NextResponse.json({ error: "action 非法" }, { status: 400 });

  const { data: sub, error: selErr } = await supabaseAdmin!
    .from("user_verification_submissions").select("id, user_id, status").eq("id", id).maybeSingle();
  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });
  if (!sub) return NextResponse.json({ error: "提交不存在" }, { status: 404 });

  const now = new Date().toISOString();

  if (action === "approve") {
    const { error: e1 } = await supabaseAdmin!.from("user_verification_submissions")
      .update({ status: "approved", admin_note: adminNote?.trim() || null, rejection_reason: null,
                reviewed_by: adminId, reviewed_at: now, updated_at: now }).eq("id", id);
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
    const { error: e2 } = await supabaseAdmin!.from("users")
      .update({ verification_status: "approved", verified_at: now, verification_rejected_reason: null })
      .eq("id", sub.user_id);
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
  } else {
    const reason = rejectionReason?.trim();
    if (!reason) return NextResponse.json({ error: "驳回需填写原因" }, { status: 400 });
    const { error: e1 } = await supabaseAdmin!.from("user_verification_submissions")
      .update({ status: "rejected", rejection_reason: reason, admin_note: adminNote?.trim() || null,
                reviewed_by: adminId, reviewed_at: now, updated_at: now }).eq("id", id);
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
    const { error: e2 } = await supabaseAdmin!.from("users")
      .update({ verification_status: "rejected", verification_rejected_reason: reason }).eq("id", sub.user_id);
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
