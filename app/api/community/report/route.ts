/**
 * POST /api/community/report
 *
 * 用户举报一条帖子。Body: { userId, postId, reason, detail?, evidenceImages? }
 *  - 登录即可举报（不要求实名认证）
 *  - 自动从 posts 取作者 id 填入 post_author_id
 *  - 防重复：同一用户对同一帖已有 pending 举报则拒绝
 *  - service_role 写 post_reports，status=pending
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const VALID_REASONS = [
  "不当内容", "色情低俗", "骚扰辱骂", "虚假信息",
  "广告引流", "盗图侵权", "涉及虐待动物", "其他",
];

export async function POST(req: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY 未配置" }, { status: 500 });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "请求体格式错误" }, { status: 400 }); }

  const { userId, postId, reason, detail, evidenceImages } = body || {};
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (!postId) return NextResponse.json({ error: "缺少 postId" }, { status: 400 });
  if (!reason || !VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: "请选择举报原因" }, { status: 400 });
  }

  // 登录校验（只要求用户存在，不要求认证）
  const { data: u } = await supabaseAdmin
    .from("users").select("id").eq("id", userId).maybeSingle();
  if (!u) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  // 取帖子与作者
  const { data: post } = await supabaseAdmin
    .from("posts").select("id, user_id").eq("id", postId).maybeSingle();
  if (!post) return NextResponse.json({ error: "帖子不存在或已删除" }, { status: 404 });

  // 防重复：同一用户对同一帖已有待处理举报
  const { data: dup } = await supabaseAdmin
    .from("post_reports").select("id")
    .eq("reporter_user_id", userId).eq("post_id", postId).eq("status", "pending")
    .maybeSingle();
  if (dup) return NextResponse.json({ error: "你已举报过这条内容，我们正在处理" }, { status: 409 });

  const images = Array.isArray(evidenceImages)
    ? evidenceImages.filter((x: any) => typeof x === "string" && x).slice(0, 3)
    : [];

  const { error } = await supabaseAdmin.from("post_reports").insert({
    post_id: postId,
    post_author_id: post.user_id,
    reporter_user_id: userId,
    reason,
    detail: typeof detail === "string" && detail.trim() ? detail.trim().slice(0, 200) : null,
    evidence_images: images.length ? images : null,
    status: "pending",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
