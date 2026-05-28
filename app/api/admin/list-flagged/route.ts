/**
 * GET /api/admin/list-flagged?table=posts|comments|messages&adminId=uuid
 *
 * 列出 flagged / hidden 的内容（绕过 RLS，service_role）。
 * 校验：adminId 对应的 users.role === 'admin'
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ALLOWED = ["posts", "comments", "messages"];

export async function GET(req: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY 未配置" }, { status: 500 });
  }

  const url = new URL(req.url);
  const table   = url.searchParams.get("table");
  const adminId = url.searchParams.get("adminId");

  if (!adminId) return NextResponse.json({ error: "缺少 adminId" }, { status: 400 });
  if (!table || !ALLOWED.includes(table)) {
    return NextResponse.json({ error: "table 必须是 posts / comments / messages" }, { status: 400 });
  }

  // 校验 admin 身份
  const { data: u, error: uErr } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", adminId)
    .maybeSingle();
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
  if (!u || u.role !== "admin") {
    return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
  }

  // 显式指定 FK 名消歧（posts/comments/messages 都有多条到 users 的路径）
  const fkName = `${table}_user_id_fkey`;
  const { data, error } = await supabaseAdmin
    .from(table)
    .select(`*, user:users!${fkName}(username)`)
    .in("status", ["flagged", "hidden"])
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
