/**
 * /api/admin/news
 *
 * POST   创建资讯（仅 admin）
 * PUT    更新资讯（仅 admin）
 * DELETE 删除资讯（仅 admin）
 *
 * 校验：body.adminId 对应的 users.role === 'admin'
 * 用 service_role 绕过 RLS。
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

  const { adminId, news } = body || {};
  const gate = await assertAdmin(adminId);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });

  if (!news?.title?.trim()) {
    return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin!
    .from("pet_news")
    .insert({
      title:            String(news.title).trim(),
      summary:          news.summary?.trim() || null,
      content:          news.content || null,
      cover_image_url:  news.cover_image_url?.trim() || null,
      emoji:            news.emoji?.trim() || "📰",
      source:           news.source?.trim() || null,
      published_at:     news.published_at || new Date().toISOString(),
      is_builtin:       false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ news: data });
}

export async function PUT(req: Request) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "请求体格式错误" }, { status: 400 }); }

  const { adminId, newsId, patch } = body || {};
  const gate = await assertAdmin(adminId);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });

  if (!newsId) return NextResponse.json({ error: "缺少 newsId" }, { status: 400 });
  if (!patch || typeof patch !== "object") {
    return NextResponse.json({ error: "缺少 patch" }, { status: 400 });
  }

  const allowed = ["title", "summary", "content", "cover_image_url", "emoji", "source", "published_at"];
  const clean: Record<string, any> = {};
  for (const k of allowed) if (patch[k] !== undefined) clean[k] = patch[k];
  if (Object.keys(clean).length === 0) {
    return NextResponse.json({ error: "无可更新字段" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin!
    .from("pet_news")
    .update(clean)
    .eq("id", newsId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ news: data });
}

export async function DELETE(req: Request) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "请求体格式错误" }, { status: 400 }); }

  const { adminId, newsId } = body || {};
  const gate = await assertAdmin(adminId);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });

  if (!newsId) return NextResponse.json({ error: "缺少 newsId" }, { status: 400 });

  const { error } = await supabaseAdmin!
    .from("pet_news")
    .delete()
    .eq("id", newsId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
