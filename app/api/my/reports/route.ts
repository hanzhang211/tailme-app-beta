/**
 * /api/my/reports — 用户端「审核」页数据（service_role）
 *
 * 无 Supabase Auth：警示/友好表 RLS 仅允许 anon 读 approved，且无 anon UPDATE 权限。
 * 因此用户读取「自己的」全部状态记录、以及下架/上架/删除/撤回，都必须经此路由，
 * 由服务端校验「该记录 reporter_user_id === 调用方 userId」后才放行（当前无 Auth 下的最强保护）。
 *
 * GET  ?userId=&kind=friendly|warning
 *   → 该用户自己的全部记录（排除 deleted），created_at 倒序
 * POST { userId, kind, id, action }
 *   action:
 *     - offline  : approved → offline（下架，地图不再显示）
 *     - relist   : offline  → approved（重新上架，地图重新显示）
 *     - delete   : 任意      → deleted（永久删除＝软删，不在任何端显示）
 *     - withdraw : pending  → deleted（撤回提交）
 *
 * 软删策略：status='deleted'，不硬删行、不删 Storage 图片（与 admin 删除一致）。
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const TABLES: Record<string, string> = {
  friendly: "pet_friendly_reports",
  warning: "pet_warning_reports",
};

function tableFor(kind?: string | null) {
  return kind ? TABLES[kind] : undefined;
}

export async function GET(req: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY 未配置" }, { status: 500 });
  }
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const kind = url.searchParams.get("kind");
  const table = tableFor(kind);
  if (!userId) return NextResponse.json({ error: "缺少 userId" }, { status: 400 });
  if (!table) return NextResponse.json({ error: "kind 非法" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from(table)
    .select("*")
    .eq("reporter_user_id", userId)
    .neq("status", "deleted")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reports: data || [] });
}

export async function POST(req: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY 未配置" }, { status: 500 });
  }
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "请求体格式错误" }, { status: 400 }); }

  const { userId, kind, id, action } = body || {};
  const table = tableFor(kind);
  if (!userId) return NextResponse.json({ error: "缺少 userId" }, { status: 400 });
  if (!table) return NextResponse.json({ error: "kind 非法" }, { status: 400 });
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  if (!["offline", "relist", "delete", "withdraw"].includes(action)) {
    return NextResponse.json({ error: "action 非法" }, { status: 400 });
  }

  // 1) 取该行，校验归属（防越权）
  const { data: row, error: selErr } = await supabaseAdmin
    .from(table)
    .select("id, reporter_user_id, status")
    .eq("id", id)
    .maybeSingle();
  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  if (String(row.reporter_user_id) !== String(userId)) {
    return NextResponse.json({ error: "无权操作该记录" }, { status: 403 });
  }

  // 2) 状态机校验
  const cur = row.status;
  let next: string;
  if (action === "offline") {
    if (cur !== "approved") return NextResponse.json({ error: "只有已通过的内容可以下架" }, { status: 400 });
    next = "offline";
  } else if (action === "relist") {
    if (cur !== "offline") return NextResponse.json({ error: "只有已下架的内容可以重新上架" }, { status: 400 });
    next = "approved";
  } else if (action === "withdraw") {
    if (cur !== "pending") return NextResponse.json({ error: "只有审核中的内容可以撤回" }, { status: 400 });
    next = "deleted";
  } else {
    next = "deleted"; // delete：任意状态可永久删除（软删）
  }

  const { data, error } = await supabaseAdmin
    .from(table)
    .update({ status: next, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ report: data });
}
