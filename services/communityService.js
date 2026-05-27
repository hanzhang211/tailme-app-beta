/**
 * services/communityService.js
 *
 * 社群所有 Supabase 操作：帖子 / 评论 / 点赞 / 聊天 / 举报 / Realtime。
 *
 * 设计原则：
 *  - 读 / 创建 / 点赞 / 举报 → 前端直连 Supabase（anon key + RLS）
 *  - 删除（自己内容）→ 走 /api/community/delete
 *  - 管理员操作      → 走 /api/admin/moderate
 *
 * Realtime：
 *  - 聊天室订阅 messages 表（按 room_id 过滤）
 *  - 调用方负责 unsubscribe（返回的 channel 对象有 .unsubscribe()）
 */

import { supabase } from "@/lib/supabase";
import { checkContent } from "@/services/contentFilter";

function requireSupabase() {
  if (!supabase) throw new Error("Supabase 未初始化");
  return supabase;
}

/* ══════════════════════════════════════════════════════════
   聊天室
══════════════════════════════════════════════════════════ */
export async function listChatRooms() {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("chat_rooms")
    .select("*")
    .order("breed", { ascending: true, nullsFirst: true });
  if (error) throw new Error(`获取聊天室失败: ${error.message}`);
  return data;
}

/* ══════════════════════════════════════════════════════════
   消息（聊天）
══════════════════════════════════════════════════════════ */
export async function listMessages(roomId, limit = 50) {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("messages")
    .select(`
      id, content, status, created_at, user_id, pet_id,
      user:users!user_id ( username ),
      pet:pets!pet_id ( name, breed )
    `)
    .eq("room_id", roomId)
    .eq("status", "visible")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`获取消息失败: ${error.message}`);
  return (data || []).reverse(); // 老 → 新
}

export async function sendMessage({ roomId, userId, petId, content }) {
  const sb = requireSupabase();
  const { flagged } = checkContent(content);
  const { data, error } = await sb
    .from("messages")
    .insert({
      room_id: roomId,
      user_id: userId,
      pet_id:  petId || null,
      content: content.trim(),
      status:  flagged ? "flagged" : "visible",
    })
    .select(`
      id, content, status, created_at, user_id, pet_id,
      user:users!user_id ( username ),
      pet:pets!pet_id ( name, breed )
    `)
    .single();
  if (error) throw new Error(`发送失败: ${error.message}`);
  return data;
}

/**
 * 订阅某个聊天室的新消息。
 * onInsert: (newRow) => void  收到 INSERT 时回调（payload 已经 fetch 完关联字段）
 * 返回 channel 对象，调用方必须在 unmount 时 channel.unsubscribe()
 */
export function subscribeRoom(roomId, onInsert) {
  const sb = requireSupabase();
  const channel = sb
    .channel(`room:${roomId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
      async (payload) => {
        // payload.new 是原始 row（无关联）。补 fetch 一次 user/pet 信息。
        const id = payload.new?.id;
        if (!id) return;
        const { data } = await sb
          .from("messages")
          .select(`
            id, content, status, created_at, user_id, pet_id,
            user:users!user_id ( username ),
            pet:pets!pet_id ( name, breed )
          `)
          .eq("id", id)
          .maybeSingle();
        if (data && data.status === "visible") onInsert(data);
      }
    )
    .subscribe();
  return channel;
}

/* ══════════════════════════════════════════════════════════
   帖子
══════════════════════════════════════════════════════════ */
export async function listPosts(limit = 30) {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("posts")
    .select(`
      id, content, image_urls, status, like_count, comment_count, created_at,
      user_id, pet_id,
      user:users!posts_user_id_fkey ( username ),
      pet:pets!posts_pet_id_fkey ( name, breed )
    `)
    .eq("status", "visible")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`获取帖子失败: ${error.message}`);
  return data || [];
}

export async function createPost({ userId, petId, content, imageUrls }) {
  const sb = requireSupabase();
  const { flagged } = checkContent(content);
  const { data, error } = await sb
    .from("posts")
    .insert({
      user_id:    userId,
      pet_id:     petId || null,
      content:    content.trim(),
      image_urls: Array.isArray(imageUrls) && imageUrls.length ? imageUrls : null,
      status:     flagged ? "flagged" : "visible",
    })
    .select(`
      id, content, image_urls, status, like_count, comment_count, created_at,
      user_id, pet_id,
      user:users!posts_user_id_fkey ( username ),
      pet:pets!posts_pet_id_fkey ( name, breed )
    `)
    .single();
  if (error) throw new Error(`发帖失败: ${error.message}`);
  return { post: data, flagged };
}

/**
 * 上传一张图片到 post-images bucket。
 * 路径：<userId>/<timestamp>-<rand>.<ext>
 * 返回 public URL
 */
export async function uploadPostImage(file, userId) {
  const sb = requireSupabase();
  if (!file || !userId) throw new Error("缺少 file 或 userId");
  if (file.size > 5 * 1024 * 1024) throw new Error("图片不能超过 5MB");

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeExt = ext.length > 0 && ext.length <= 5 ? ext : "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

  const { error: upErr } = await sb.storage
    .from("post-images")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (upErr) throw new Error(`上传失败: ${upErr.message}`);

  const { data: pub } = sb.storage.from("post-images").getPublicUrl(path);
  if (!pub?.publicUrl) throw new Error("获取图片 URL 失败");
  return pub.publicUrl;
}

/* ══════════════════════════════════════════════════════════
   点赞
══════════════════════════════════════════════════════════ */
export async function getMyLikedPostIds(userId, postIds) {
  if (!postIds.length) return new Set();
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("post_likes")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);
  if (error) throw new Error(`查询点赞失败: ${error.message}`);
  return new Set((data || []).map((r) => r.post_id));
}

export async function likePost(postId, userId) {
  const sb = requireSupabase();
  const { error } = await sb
    .from("post_likes")
    .insert({ post_id: postId, user_id: userId });
  if (error && error.code !== "23505") throw new Error(`点赞失败: ${error.message}`);
}

export async function unlikePost(postId, userId) {
  const sb = requireSupabase();
  const { error } = await sb
    .from("post_likes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", userId);
  if (error) throw new Error(`取消点赞失败: ${error.message}`);
}

/* ══════════════════════════════════════════════════════════
   评论
══════════════════════════════════════════════════════════ */
export async function listComments(postId) {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("comments")
    .select(`
      id, content, status, created_at, user_id, pet_id,
      parent_id, like_count,
      user:users!user_id ( username ),
      pet:pets!pet_id ( name, breed )
    `)
    .eq("post_id", postId)
    .eq("status", "visible")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`获取评论失败: ${error.message}`);
  return data || [];
}

export async function createComment({ postId, userId, petId, content, parentId }) {
  const sb = requireSupabase();
  const { flagged } = checkContent(content);
  const { data, error } = await sb
    .from("comments")
    .insert({
      post_id:   postId,
      user_id:   userId,
      pet_id:    petId || null,
      parent_id: parentId || null,
      content:   content.trim(),
      status:    flagged ? "flagged" : "visible",
    })
    .select(`
      id, content, status, created_at, user_id, pet_id,
      parent_id, like_count,
      user:users!user_id ( username ),
      pet:pets!pet_id ( name, breed )
    `)
    .single();
  if (error) throw new Error(`评论失败: ${error.message}`);
  return { comment: data, flagged };
}

/* ══════════════════════════════════════════════════════════
   评论点赞
══════════════════════════════════════════════════════════ */
export async function getMyLikedCommentIds(userId, commentIds) {
  if (!commentIds.length || !userId) return new Set();
  const sb = requireSupabase();
  const { data, error } = await sb
    .from("comment_likes")
    .select("comment_id")
    .eq("user_id", userId)
    .in("comment_id", commentIds);
  if (error) throw new Error(`查询评论点赞失败: ${error.message}`);
  return new Set((data || []).map((r) => r.comment_id));
}

export async function likeComment(commentId, userId) {
  const sb = requireSupabase();
  const { error } = await sb
    .from("comment_likes")
    .insert({ comment_id: commentId, user_id: userId });
  if (error && error.code !== "23505") throw new Error(`点赞失败: ${error.message}`);
}

export async function unlikeComment(commentId, userId) {
  const sb = requireSupabase();
  const { error } = await sb
    .from("comment_likes")
    .delete()
    .eq("comment_id", commentId)
    .eq("user_id", userId);
  if (error) throw new Error(`取消点赞失败: ${error.message}`);
}

/* ══════════════════════════════════════════════════════════
   举报
══════════════════════════════════════════════════════════ */
export async function reportContent({ reporterId, targetType, targetId, reason }) {
  const sb = requireSupabase();
  const { error } = await sb
    .from("reports")
    .insert({
      reporter_id: reporterId,
      target_type: targetType,
      target_id:   targetId,
      reason:      reason || null,
    });
  if (error) throw new Error(`举报失败: ${error.message}`);
}

/* ══════════════════════════════════════════════════════════
   删除（走服务端 API）
══════════════════════════════════════════════════════════ */
export async function deleteOwnContent({ userId, targetType, targetId }) {
  const res = await fetch("/api/community/delete", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ userId, targetType, targetId }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "删除失败" }));
    throw new Error(error || "删除失败");
  }
}

export async function adminModerate({ adminId, targetType, targetId, action }) {
  const res = await fetch("/api/admin/moderate", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ adminId, targetType, targetId, action }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "操作失败" }));
    throw new Error(error || "操作失败");
  }
}

/* ══════════════════════════════════════════════════════════
   管理员查询：flagged 内容
══════════════════════════════════════════════════════════ */
export async function listFlagged({ adminId, table }) {
  const url = `/api/admin/list-flagged?table=${encodeURIComponent(table)}&adminId=${encodeURIComponent(adminId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "查询失败" }));
    throw new Error(error || "查询失败");
  }
  const json = await res.json();
  return json.data || [];
}
