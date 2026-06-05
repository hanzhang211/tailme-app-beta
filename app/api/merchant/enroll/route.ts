/**
 * POST /api/merchant/enroll
 *
 * 商家入驻：创建店铺（status=pending_review）并把该用户的 role 提升为 'merchant'。
 * 用 service_role 执行（role 提升属于敏感操作，不让 anon 客户端直接改 users.role）。
 *
 * Body: { userId: uuid, store: { name, logo_url?, intro?, contact?, company_name?,
 *                                license_url?, brand_auth_url?, food_license_url?, extra_docs? } }
 *
 * 规则：
 *  - userId 必须存在；role 不能是 admin（admin 不入驻）。
 *  - 一个 user 只允许有一个店铺（已存在则直接返回该店铺）。
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY 未配置" }, { status: 500 });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "请求体格式错误" }, { status: 400 }); }

  const { userId, store } = body || {};
  if (!userId) return NextResponse.json({ error: "缺少 userId" }, { status: 400 });
  if (!store?.name?.trim()) return NextResponse.json({ error: "店铺名称不能为空" }, { status: 400 });

  // 校验用户
  const { data: user, error: uErr } = await supabaseAdmin
    .from("users").select("id, role").eq("id", userId).maybeSingle();
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
  if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  if (user.role === "admin") return NextResponse.json({ error: "管理员账号不能入驻为商家" }, { status: 403 });

  // 已有店铺则直接返回（幂等）
  const { data: existing } = await supabaseAdmin
    .from("stores").select("*").eq("owner_id", userId).limit(1).maybeSingle();
  if (existing) {
    if (user.role !== "merchant") {
      await supabaseAdmin.from("users").update({ role: "merchant" }).eq("id", userId);
    }
    return NextResponse.json({ store: existing });
  }

  // 创建店铺
  const { data: created, error: sErr } = await supabaseAdmin
    .from("stores")
    .insert({
      owner_id:         userId,
      name:             String(store.name).trim(),
      logo_url:         store.logo_url || null,
      intro:            store.intro || null,
      contact:          store.contact || null,
      company_name:     store.company_name || null,
      license_url:      store.license_url || null,
      brand_auth_url:   store.brand_auth_url || null,
      food_license_url: store.food_license_url || null,
      extra_docs:       store.extra_docs || [],
      status:           "pending_review",
    })
    .select()
    .single();
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  // 提升角色
  const { error: rErr } = await supabaseAdmin.from("users").update({ role: "merchant" }).eq("id", userId);
  if (rErr) return NextResponse.json({ error: `店铺已建但角色提升失败: ${rErr.message}` }, { status: 500 });

  return NextResponse.json({ store: created });
}
