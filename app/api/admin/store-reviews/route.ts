/**
 * POST /api/admin/store-reviews
 *
 * 平台审核员审核商家店铺资质。
 * Body: { adminId: uuid, storeId: uuid, action: 'approve'|'reject', reason?: string }
 * 校验：adminId 对应 users.role === 'admin'。service_role 执行（唯一能置 approved 的入口）。
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function assertAdmin(adminId: string | undefined) {
  if (!adminId) return { ok: false as const, error: "缺少 adminId" };
  if (!supabaseAdmin) return { ok: false as const, error: "SUPABASE_SERVICE_ROLE_KEY 未配置" };
  const { data, error } = await supabaseAdmin.from("users").select("role").eq("id", adminId).maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  if (!data || data.role !== "admin") return { ok: false as const, error: "需要管理员权限" };
  return { ok: true as const };
}

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "请求体格式错误" }, { status: 400 }); }

  const { adminId, storeId, action, reason } = body || {};
  const gate = await assertAdmin(adminId);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });
  if (!storeId) return NextResponse.json({ error: "缺少 storeId" }, { status: 400 });
  if (!["approve", "reject"].includes(action)) return NextResponse.json({ error: "action 非法" }, { status: 400 });
  if (action === "reject" && !reason?.trim()) return NextResponse.json({ error: "驳回需要填写原因" }, { status: 400 });

  const patch =
    action === "approve"
      ? { status: "approved", reject_reason: null, reviewed_at: new Date().toISOString() }
      : { status: "rejected", reject_reason: String(reason).trim(), reviewed_at: new Date().toISOString() };

  const { data, error } = await supabaseAdmin!
    .from("stores").update(patch).eq("id", storeId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ store: data });
}
