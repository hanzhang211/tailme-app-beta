/**
 * POST /api/community/delete
 *
 * 删除自己发的帖子 / 评论 / 消息。
 *
 * Body: { userId: uuid, targetType: 'post'|'comment'|'message', targetId: uuid }
 *
 * 校验：
 *   1. userId 存在
 *   2. target 存在
 *   3. target.user_id === userId  （ownership）
 *
 * MVP 限制：userId 由前端传，无 session 校验。攻击者可冒充已知 user_id。
 *           上线前迁 Supabase Auth 用 auth.uid() 替代。
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

  let body: { userId?: string; targetType?: string; targetId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  const { userId, targetType, targetId } = body;
  if (!userId || !targetType || !targetId) {
    return NextResponse.json(
      { error: "缺少 userId / targetType / targetId" },
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

  // 查 target，确认 ownership
  const { data: target, error: selErr } = await supabaseAdmin
    .from(table)
    .select("user_id")
    .eq("id", targetId)
    .maybeSingle();

  if (selErr) {
    return NextResponse.json({ error: selErr.message }, { status: 500 });
  }
  if (!target) {
    return NextResponse.json({ error: "目标不存在" }, { status: 404 });
  }
  if (target.user_id !== userId) {
    return NextResponse.json(
      { error: "无权删除他人内容" },
      { status: 403 }
    );
  }

  // 删除
  const { error: delErr } = await supabaseAdmin
    .from(table)
    .delete()
    .eq("id", targetId);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
