/**
 * POST /api/community/chat-report
 *
 * 聊天举报。Body:
 *  - 私聊: { userId, chatType:'private', conversationId, reportedUserId, reason, detail?, evidenceImages? }
 *  - 群聊: { userId, chatType:'group', roomId, reportedUserId, messageId?, messageContent?, reason, detail?, evidenceImages? }
 * 登录即可；防重复（同人对同会话/同被举报人未处理举报不可重复）；service_role 写 chat_reports。
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

  const {
    userId, chatType, conversationId, roomId, reportedUserId,
    messageId, messageContent, reason, detail, evidenceImages,
  } = body || {};

  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (!["private", "group"].includes(chatType)) {
    return NextResponse.json({ error: "chatType 非法" }, { status: 400 });
  }
  if (!reason || !VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: "请选择举报原因" }, { status: 400 });
  }
  if (chatType === "private" && !conversationId) {
    return NextResponse.json({ error: "缺少会话" }, { status: 400 });
  }
  if (chatType === "group" && !roomId) {
    return NextResponse.json({ error: "缺少群聊" }, { status: 400 });
  }

  // 登录校验（用户存在即可）
  const { data: u } = await supabaseAdmin
    .from("users").select("id").eq("id", userId).maybeSingle();
  if (!u) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  // 防重复
  let dupQ = supabaseAdmin.from("chat_reports").select("id")
    .eq("reporter_user_id", userId).eq("chat_type", chatType).eq("status", "pending");
  if (chatType === "private") dupQ = dupQ.eq("conversation_id", conversationId);
  else dupQ = dupQ.eq("room_id", roomId).eq("reported_user_id", reportedUserId || "");
  const { data: dup } = await dupQ.maybeSingle();
  if (dup) return NextResponse.json({ error: "你已举报过，我们正在处理" }, { status: 409 });

  const images = Array.isArray(evidenceImages)
    ? evidenceImages.filter((x: any) => typeof x === "string" && x).slice(0, 3)
    : [];

  const { error } = await supabaseAdmin.from("chat_reports").insert({
    chat_type: chatType,
    conversation_id: chatType === "private" ? conversationId : null,
    room_id: chatType === "group" ? roomId : null,
    reported_user_id: reportedUserId || null,
    message_id: messageId || null,
    message_content: typeof messageContent === "string" ? messageContent.slice(0, 2000) : null,
    reporter_user_id: userId,
    reason,
    detail: typeof detail === "string" && detail.trim() ? detail.trim().slice(0, 200) : null,
    evidence_images: images.length ? images : null,
    status: "pending",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
