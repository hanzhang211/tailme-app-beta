/**
 * services/privateChatService.js
 *
 * 一对一私聊：会话 / 消息 / 图片 / 未读 / Realtime。
 *
 * 安全模型（与群聊 messages 一致的 MVP 方案）：
 *  - 前端 anon key 直连，业务隔离靠按 currentUser.id 过滤
 *    （会话只取 user1_id=me OR user2_id=me；只订阅自己参与的会话）。
 *  - 无 Supabase Auth，故不用 auth.uid() 写 RLS。
 *
 * Realtime channel 命名：
 *  - private-chat-{conversationId}  详情页订阅该会话新消息
 *  - private-inbox-{userId}         列表页订阅"发给我"的新消息（更新未读/排序）
 *  不复用、不影响群聊 channel。
 */

import { supabase } from "@/lib/supabase";
import { compressImage } from "@/services/imageCompress";

function sb() {
  if (!supabase) throw new Error("Supabase 未初始化");
  return supabase;
}

const MSG_COLS =
  "id, conversation_id, sender_id, receiver_id, content, message_type, image_url, video_url, thumbnail_url, duration, read_at, created_at";

function participantKey(a, b) {
  return a < b ? `${a}__${b}` : `${b}__${a}`;
}

/* ── 获取或创建与某用户的会话（防重复 A-B / B-A）─────────── */
export async function getOrCreateConversation(meId, targetId) {
  if (!meId || !targetId) throw new Error("缺少用户信息");
  if (meId === targetId) throw new Error("不能和自己私聊哦");
  const key = participantKey(meId, targetId);
  const s = sb();

  const { data: existing } = await s
    .from("private_conversations")
    .select("*")
    .eq("participant_key", key)
    .maybeSingle();
  if (existing) return existing;

  const [u1, u2] = meId < targetId ? [meId, targetId] : [targetId, meId];
  const { data, error } = await s
    .from("private_conversations")
    .insert({ user1_id: u1, user2_id: u2, participant_key: key })
    .select("*")
    .single();

  if (error) {
    // 并发创建 → unique violation，重查
    if (error.code === "23505") {
      const { data: r } = await s
        .from("private_conversations")
        .select("*")
        .eq("participant_key", key)
        .single();
      return r;
    }
    throw new Error(`创建会话失败: ${error.message}`);
  }
  return data;
}

/* ── 我的会话列表（含对方资料 + 未读数）──────────────────── */
export async function listConversations(meId) {
  if (!meId) return [];
  const s = sb();
  const { data, error } = await s
    .from("private_conversations")
    .select(`
      id, user1_id, user2_id, last_message, last_message_type, last_message_at, updated_at,
      u1:users!private_conversations_user1_id_fkey ( id, username, avatar_url ),
      u2:users!private_conversations_user2_id_fkey ( id, username, avatar_url )
    `)
    .or(`user1_id.eq.${meId},user2_id.eq.${meId}`)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(100);
  if (error) throw new Error(`获取私聊列表失败: ${error.message}`);

  const convs = data || [];
  const ids = convs.map((c) => c.id);
  const unreadByConv = {};
  if (ids.length) {
    const { data: un } = await s
      .from("private_messages")
      .select("conversation_id")
      .in("conversation_id", ids)
      .eq("receiver_id", meId)
      .is("read_at", null);
    (un || []).forEach((m) => {
      unreadByConv[m.conversation_id] = (unreadByConv[m.conversation_id] || 0) + 1;
    });
  }

  return convs.map((c) => {
    const other =
      c.user1_id === meId ? c.u2 : c.u1;
    return {
      id: c.id,
      other: other || {
        id: c.user1_id === meId ? c.user2_id : c.user1_id,
        username: "毛孩子家长",
        avatar_url: null,
      },
      last_message: c.last_message,
      last_message_type: c.last_message_type,
      last_message_at: c.last_message_at,
      unread: unreadByConv[c.id] || 0,
    };
  });
}

/* ── 会话内消息（按时间升序）────────────────────────────── */
export async function listPrivateMessages(convId, { limit = 200 } = {}) {
  if (!convId) return [];
  const { data, error } = await sb()
    .from("private_messages")
    .select(MSG_COLS)
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`获取私聊消息失败: ${error.message}`);
  return data || [];
}

async function bumpConversation(convId, preview, type) {
  const now = new Date().toISOString();
  await sb()
    .from("private_conversations")
    .update({ last_message: preview, last_message_type: type, last_message_at: now, updated_at: now })
    .eq("id", convId);
}

/* ── 发送文字 ───────────────────────────────────────────── */
export async function sendPrivateText({ convId, senderId, receiverId, content }) {
  const text = (content || "").trim();
  if (!convId || !senderId || !receiverId) throw new Error("缺少会话信息");
  if (!text) throw new Error("消息不能为空");
  if (text.length > 2000) throw new Error("消息太长啦");
  const { data, error } = await sb()
    .from("private_messages")
    .insert({ conversation_id: convId, sender_id: senderId, receiver_id: receiverId, content: text, message_type: "text" })
    .select(MSG_COLS)
    .single();
  if (error) throw new Error(`发送失败: ${error.message}`);
  await bumpConversation(convId, text.slice(0, 50), "text");
  return data;
}

/* ── 上传私聊图片（压缩 → private-chat-images bucket）────── */
export async function uploadPrivateImage(file, convId) {
  if (!file) throw new Error("没有选择图片");
  if (!file.type?.startsWith("image/")) throw new Error("请选择图片文件");
  if (file.size > 5 * 1024 * 1024) throw new Error("图片不能超过 5MB");
  const compressed = await compressImage(file, { maxDim: 1280, quality: 0.82 });
  const path = `${convId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await sb()
    .storage.from("private-chat-images")
    .upload(path, compressed, { cacheControl: "86400", upsert: false });
  if (error) throw new Error(`图片上传失败: ${error.message}`);
  const { data: pub } = sb().storage.from("private-chat-images").getPublicUrl(path);
  if (!pub?.publicUrl) throw new Error("获取图片地址失败");
  return pub.publicUrl;
}

/* ── 上传私聊视频（≤50MB，复用 private-chat-images bucket）──── */
export async function uploadPrivateVideo(file, convId) {
  if (!file) throw new Error("没有选择视频");
  if (!file.type?.startsWith("video/")) throw new Error("请选择视频文件");
  if (file.size > 50 * 1024 * 1024) throw new Error("视频太大啦，请上传 50MB 以内的视频");
  const ext = (file.name?.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeExt = ["mp4", "mov", "webm", "m4v"].includes(ext) ? ext : "mp4";
  const path = `${convId}/video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
  const { error } = await sb()
    .storage.from("private-chat-images")
    .upload(path, file, { cacheControl: "86400", upsert: false, contentType: file.type || undefined });
  if (error) throw new Error(`视频上传失败: ${error.message}`);
  const { data: pub } = sb().storage.from("private-chat-images").getPublicUrl(path);
  if (!pub?.publicUrl) throw new Error("获取视频地址失败");
  return pub.publicUrl;
}

/* ── 发送视频消息 ───────────────────────────────────────── */
export async function sendPrivateVideoMsg({ convId, senderId, receiverId, videoUrl, thumbnailUrl, duration }) {
  if (!convId || !senderId || !receiverId || !videoUrl) throw new Error("缺少信息");
  const { data, error } = await sb()
    .from("private_messages")
    .insert({
      conversation_id: convId, sender_id: senderId, receiver_id: receiverId,
      content: "[视频]", message_type: "video", video_url: videoUrl,
      thumbnail_url: thumbnailUrl || null, duration: duration || null,
    })
    .select(MSG_COLS)
    .single();
  if (error) throw new Error(`发送失败: ${error.message}`);
  await bumpConversation(convId, "[视频]", "video");
  return data;
}

/* ── 发送图片消息 ───────────────────────────────────────── */
export async function sendPrivateImageMsg({ convId, senderId, receiverId, imageUrl }) {
  if (!convId || !senderId || !receiverId || !imageUrl) throw new Error("缺少信息");
  const { data, error } = await sb()
    .from("private_messages")
    .insert({
      conversation_id: convId, sender_id: senderId, receiver_id: receiverId,
      content: "[图片]", message_type: "image", image_url: imageUrl,
    })
    .select(MSG_COLS)
    .single();
  if (error) throw new Error(`发送失败: ${error.message}`);
  await bumpConversation(convId, "[图片]", "image");
  return data;
}

/* ── 进入会话：把对方发给我的未读标记已读 ──────────────── */
export async function markConversationRead(convId, meId) {
  if (!convId || !meId) return;
  await sb()
    .from("private_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", convId)
    .eq("receiver_id", meId)
    .is("read_at", null);
}

/* ── 我的总未读（可用于消息 tab 角标）──────────────────── */
export async function getTotalUnread(meId) {
  if (!meId) return 0;
  const { count } = await sb()
    .from("private_messages")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", meId)
    .is("read_at", null);
  return count || 0;
}

/* ── Realtime：订阅某会话的新消息 ──────────────────────── */
export function subscribePrivateConversation(convId, onInsert) {
  const channel = sb()
    .channel(`private-chat-${convId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "private_messages", filter: `conversation_id=eq.${convId}` },
      (payload) => { if (payload.new) onInsert(payload.new); }
    )
    .subscribe();
  return channel;
}

/* ── Realtime：订阅"发给我"的新消息（列表页更新未读/排序）── */
export function subscribeMyInbox(meId, onInsert) {
  const channel = sb()
    .channel(`private-inbox-${meId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "private_messages", filter: `receiver_id=eq.${meId}` },
      (payload) => { if (payload.new) onInsert(payload.new); }
    )
    .subscribe();
  return channel;
}

export function unsubscribePrivate(channel) {
  if (!channel) return;
  try { supabase?.removeChannel(channel); }
  catch { try { channel.unsubscribe?.(); } catch {} }
}
