"use client";

/**
 * services/chatReportService.js
 * 聊天举报（用户端）：私聊（举报对方）/ 群聊（举报某条/多条消息的发送者）。
 * 提交 → /api/community/chat-report（service_role 写 chat_reports）。
 * 截图上传复用 postReportService.uploadReportImage；原因复用 REPORT_REASONS。
 */

export async function submitChatReport({
  userId, chatType, conversationId, roomId, reportedUserId,
  messageId, messageContent, reason, detail, evidenceImages,
}) {
  const res = await fetch("/api/community/chat-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId, chatType, conversationId, roomId, reportedUserId,
      messageId, messageContent, reason, detail, evidenceImages,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "提交失败，请稍后重试");
  return json;
}
