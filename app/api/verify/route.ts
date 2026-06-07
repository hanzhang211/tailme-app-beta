/**
 * /api/verify — 用户认证状态 + 提交（service_role）
 *
 * GET  ?userId   → { status, rejected_reason, submission?: {…, doc_urls[], selfie_url} }
 *                  （图片用短期签名 URL，仅本人可见）
 * POST { userId, documentPaths[], selfiePath, contactInfo }
 *                  → 新建一条 pending 提交 + users.verification_status='pending'
 *
 * 隐私：私有 bucket，anon 无权访问；图片只在此返回签名 URL（10 分钟）。
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BUCKET = "user-verifications";
const SIGN_TTL = 600;

async function sign(path?: string | null) {
  if (!path || !supabaseAdmin) return null;
  const { data } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, SIGN_TTL);
  return data?.signedUrl || null;
}

export async function GET(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY 未配置" }, { status: 500 });
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "缺少 userId" }, { status: 400 });

  const { data: u, error: uErr } = await supabaseAdmin
    .from("users").select("verification_status, verified_at, verification_rejected_reason")
    .eq("id", userId).maybeSingle();
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  const { data: sub } = await supabaseAdmin
    .from("user_verification_submissions").select("*")
    .eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();

  let submission: any = null;
  if (sub) {
    const docs = Array.isArray(sub.document_images) ? sub.document_images : [];
    submission = {
      id: sub.id, status: sub.status, contact_info: sub.contact_info,
      rejection_reason: sub.rejection_reason, admin_note: sub.admin_note,
      created_at: sub.created_at, reviewed_at: sub.reviewed_at,
      doc_urls: (await Promise.all(docs.map(sign))).filter(Boolean),
      selfie_url: await sign(sub.selfie_with_pet_image),
    };
  }

  return NextResponse.json({
    status: u?.verification_status || "unverified",
    verified_at: u?.verified_at || null,
    rejected_reason: u?.verification_rejected_reason || null,
    submission,
  });
}

export async function POST(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY 未配置" }, { status: 500 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "请求体格式错误" }, { status: 400 }); }

  const { userId, documentPaths, selfiePath, contactInfo } = body || {};
  if (!userId) return NextResponse.json({ error: "缺少 userId" }, { status: 400 });
  if (!Array.isArray(documentPaths) || documentPaths.length === 0) {
    return NextResponse.json({ error: "请至少上传 1 张宠物证明材料" }, { status: 400 });
  }
  if (!selfiePath) return NextResponse.json({ error: "请上传同框认证照片" }, { status: 400 });

  // 当前状态校验：已认证 / 审核中 不允许重复提交
  const { data: u } = await supabaseAdmin.from("users").select("verification_status").eq("id", userId).maybeSingle();
  if (!u) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  if (u.verification_status === "approved") return NextResponse.json({ error: "你已是认证用户" }, { status: 400 });
  if (u.verification_status === "pending") return NextResponse.json({ error: "已有认证正在审核中" }, { status: 400 });

  const now = new Date().toISOString();
  const { error: insErr } = await supabaseAdmin.from("user_verification_submissions").insert({
    user_id: userId,
    document_images: documentPaths.slice(0, 5),
    selfie_with_pet_image: selfiePath,
    contact_info: contactInfo?.trim() || null,
    status: "pending",
    created_at: now, updated_at: now,
  });
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  const { error: updErr } = await supabaseAdmin.from("users")
    .update({ verification_status: "pending", verification_rejected_reason: null }).eq("id", userId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, status: "pending" });
}
