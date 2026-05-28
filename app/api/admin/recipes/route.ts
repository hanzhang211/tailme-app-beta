/**
 * /api/admin/recipes
 *
 * POST   创建食谱（仅 admin）
 * DELETE 删除食谱（仅 admin）
 *
 * 校验：body.adminId 对应的 users.role === 'admin'
 * 用 service_role 绕过 RLS，保证 anon 无法直接写 pet_recipes。
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function assertAdmin(adminId: string | undefined) {
  if (!adminId) return { ok: false as const, error: "缺少 adminId" };
  if (!supabaseAdmin) return { ok: false as const, error: "SUPABASE_SERVICE_ROLE_KEY 未配置" };
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", adminId)
    .maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  if (!data || data.role !== "admin") return { ok: false as const, error: "需要管理员权限" };
  return { ok: true as const };
}

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "请求体格式错误" }, { status: 400 }); }

  const { adminId, recipe } = body || {};
  const gate = await assertAdmin(adminId);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });

  if (!recipe?.title?.trim()) {
    return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin!
    .from("pet_recipes")
    .insert({
      user_id:      null,                            // 内置食谱不绑用户
      title:        String(recipe.title).trim(),
      emoji:        recipe.emoji?.trim() || "🍱",
      suitable_for: recipe.suitable_for?.trim() || null,
      ingredients:  recipe.ingredients?.trim() || null,
      steps:        recipe.steps?.trim() || null,
      nutrition:    recipe.nutrition?.trim() || null,
      notes:        recipe.notes?.trim() || null,
      is_builtin:   true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ recipe: data });
}

export async function DELETE(req: Request) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "请求体格式错误" }, { status: 400 }); }

  const { adminId, recipeId } = body || {};
  const gate = await assertAdmin(adminId);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });

  if (!recipeId) return NextResponse.json({ error: "缺少 recipeId" }, { status: 400 });

  const { error } = await supabaseAdmin!
    .from("pet_recipes")
    .delete()
    .eq("id", recipeId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "请求体格式错误" }, { status: 400 }); }

  const { adminId, recipeId, patch } = body || {};
  const gate = await assertAdmin(adminId);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });

  if (!recipeId) return NextResponse.json({ error: "缺少 recipeId" }, { status: 400 });
  if (!patch || typeof patch !== "object") {
    return NextResponse.json({ error: "缺少 patch" }, { status: 400 });
  }

  const allowed = ["title", "emoji", "suitable_for", "ingredients", "steps", "nutrition", "notes"];
  const clean: Record<string, any> = {};
  for (const k of allowed) if (patch[k] !== undefined) clean[k] = patch[k];
  if (Object.keys(clean).length === 0) {
    return NextResponse.json({ error: "无可更新字段" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin!
    .from("pet_recipes")
    .update(clean)
    .eq("id", recipeId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ recipe: data });
}
