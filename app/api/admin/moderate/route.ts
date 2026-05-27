/**
 * POST /api/admin/moderate
 *
 * 管理员操作：隐藏 / 恢复 / 删除任意帖子 / 评论 / 消息。
 *
 * Body: {
 *   adminId: uuid,
 *   targetType: 'post'|'comment'|'message',
 *   targetId: uuid,
 *   action: 'hide'|'restore'|'delete'
 * }
 *
 * 校验：adminId 对应的 users.role === 'admin'
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const TABLES: Record<string, string> = {
  post:    "posts",
  comment: "comments",
  message: "messages",
};

export async function POST(req: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY 未配置" },
      { status: 500 }
    );
  }

  let body: { adminId?: string; targetType?: string; targetId?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  const { adminId, targetType, targetId, action } = body;
  if (!adminId || !targetType || !targetId || !action) {
    return NextResponse.json(
      { error: "缺少 adminId / targetType / targetId / action" },
      { status: 400 }
    );
  }

  const table = TABLES[targetType];
  if (!table) {
    return NextResponse.json(
      { error: "targetType 必须是 post / comment / message" },
      { status: 400 }
    );
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

  if (action === "delete") {
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .eq("id", targetId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "hide" || action === "restore") {
    const newStatus = action === "hide" ? "hidden" : "visible";
    const { error } = await supabaseAdmin
      .from(table)
      .update({ status: newStatus })
      .eq("id", targetId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { error: "action 必须是 hide / restore / delete" },
    { status: 400 }
  );
}
