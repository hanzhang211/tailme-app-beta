/**
 * /api/admin/users — 用户封禁管理（service_role）
 *
 * GET  ?adminId=&q=关键词     按 user_no 精确 + 用户名模糊 搜索用户（最多 50 条）
 * GET  ?adminId=&banned=1     列出当前封禁中的用户（banned_until > now）
 *   返回字段：id, username, user_no, avatar_url, role, banned_until, muted_until, created_at
 * POST { adminId, targetUserId, action:'ban'|'unban', banDays }
 *   - ban   : banned_until = now + banDays 天（7/30；永久传 36500）
 *   - unban : banned_until = null
 *   保护：不能封禁自己、不能封禁管理员账号。
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

const USER_COLS = "id, username, user_no, avatar_url, role, banned_until, muted_until, created_at";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const adminId = url.searchParams.get("adminId");
  const gate = await assertAdmin(adminId);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });

  // 封禁中列表
  if (url.searchParams.get("banned") === "1") {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabaseAdmin!
      .from("users").select(USER_COLS)
      .gt("banned_until", nowIso)
      .order("banned_until", { ascending: false })
      .limit(200);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ users: data || [] });
  }

  // 按账号搜索：去掉会破坏 or() 语法的字符
  const q = (url.searchParams.get("q") || "").trim().replace(/[(),]/g, "");
  if (!q) return NextResponse.json({ users: [] });

  const parts = [`username.ilike.%${q}%`];
  if (/^\d+$/.test(q)) parts.push(`user_no.eq.${q}`); // user_no 为纯数字时才精确匹配，避免类型错误

  const { data, error } = await supabaseAdmin!
    .from("users").select(USER_COLS)
    .or(parts.join(","))
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data || [] });
}

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "请求体格式错误" }, { status: 400 }); }

  const { adminId, targetUserId, action, banDays } = body || {};
  const gate = await assertAdmin(adminId);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 403 });
  if (!targetUserId) return NextResponse.json({ error: "缺少 targetUserId" }, { status: 400 });
  if (!["ban", "unban"].includes(action)) return NextResponse.json({ error: "action 非法" }, { status: 400 });
  if (targetUserId === adminId) return NextResponse.json({ error: "不能封禁自己" }, { status: 400 });

  const { data: target } = await supabaseAdmin!
    .from("users").select("id, role").eq("id", targetUserId).maybeSingle();
  if (!target) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  let banned_until: string | null = null;
  if (action === "ban") {
    if (target.role === "admin") return NextResponse.json({ error: "不能封禁管理员账号" }, { status: 400 });
    const days = Number(banDays) > 0 ? Number(banDays) : 7;
    banned_until = new Date(Date.now() + days * 86400000).toISOString();
  }

  const { data, error } = await supabaseAdmin!
    .from("users").update({ banned_until }).eq("id", targetUserId)
    .select(USER_COLS).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ user: data });
}
