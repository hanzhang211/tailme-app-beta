/**
 * POST /api/admin/product-reviews
 *
 * 平台审核员审核商品。
 * Body: { adminId: uuid, productId: uuid, action: 'approve'|'reject'|'changes', reason?: string }
 *   - approve : 通过 → status='approved'（商品才可能出现在用户端商城）
 *   - reject  : 驳回 → status='rejected'，记录原因
 *   - changes : 要求补充材料 → 退回 status='draft'，记录原因（商家重新编辑后再提交）
 * 校验：adminId 对应 users.role === 'admin'。service_role 执行（唯一能置 approved 的入口）。
 *
 * 注：上线到用户端还需该商品所属 store.status==='approved'（用户端查询时再过滤）。
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

  const { adminId, productId, action, reason } = body || {};
  const gate = await assertAdmin(adminId);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });
  if (!productId) return NextResponse.json({ error: "缺少 productId" }, { status: 400 });
  if (!["approve", "reject", "changes"].includes(action)) return NextResponse.json({ error: "action 非法" }, { status: 400 });
  if ((action === "reject" || action === "changes") && !reason?.trim()) {
    return NextResponse.json({ error: "驳回 / 退回需要填写说明" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const patch =
    action === "approve"
      ? { status: "approved", reject_reason: null, reviewed_at: now }
      : action === "reject"
        ? { status: "rejected", reject_reason: String(reason).trim(), reviewed_at: now }
        : { status: "draft", reject_reason: `【需补充材料】${String(reason).trim()}`, reviewed_at: now };

  const { data, error } = await supabaseAdmin!
    .from("products").update(patch).eq("id", productId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}
