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

/* 按品种查找房间，不存在则创建 */
export async function getOrCreateChatRoom(breed, petType = "dog") {
  const sb = requireSupabase();
  const { data: existing } = await sb
    .from("chat_rooms")
    .select("*")
    .eq("breed", breed)
    .maybeSingle();
  if (existing) return existing;
  const { data, error } = await sb
    .from("chat_rooms")
    .insert({ name: `${breed}群聊`, breed, pet_type: petType })
    .select()
    .single();
  if (error) throw new Error(`创建房间失败: ${error.message}`);
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
      user:users!user_id ( username, avatar_url ),
      pet:pets!pet_id ( name, breed, ai_avatar_url )
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
      user:users!user_id ( username, avatar_url ),
      pet:pets!pet_id ( name, breed, ai_avatar_url )
    `)
    .single();
  if (error) throw new Error(`发送失败: ${error.message}`);
  return data;
}

/**
 * 统一关闭 channel：用 supabase.removeChannel（比 channel.unsubscribe 更彻底，
 * 会清理 client 内部的 channel 注册表，避免重复订阅泄漏）。
 */
export function unsubscribeChannel(channel) {
  if (!channel) return;
  try { supabase?.removeChannel(channel); }
  catch { try { channel.unsubscribe?.(); } catch {} }
}

/**
 * 订阅某个聊天室的新消息。
 * onInsert: (newRow) => void  收到 INSERT 时回调（payload 已经 fetch 完关联字段）
 * 返回 channel 对象，调用方必须在 unmount 时 unsubscribeChannel(channel)
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
            user:users!user_id ( username, avatar_url ),
            pet:pets!pet_id ( name, breed, ai_avatar_url )
          `)
          .eq("id", id)
          .maybeSingle();
        if (data && data.status === "visible") onInsert(data);
      }
    )
    .subscribe();
  return channel;
}

/**
 * 订阅某条帖子的评论变化（INSERT / DELETE）。
 * onInsert: (commentRow) => void  收到新评论时回调（已补 fetch 关联字段）
 * onDelete: (id)         => void  收到删除事件时回调
 * 调用方必须在 unmount 时 unsubscribeChannel(channel)
 */
export function subscribeComments(postId, { onInsert, onDelete } = {}) {
  const sb = requireSupabase();
  // 临时调试日志 — 验证完可删
  const tag = `[RT-comments ${postId.slice(0, 8)}]`;
  console.log(`${tag} 建立订阅`);
  const channel = sb
    .channel(`post:${postId}:comments`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
      async (payload) => {
        console.log(`${tag} 收到 INSERT payload`, payload.new?.id, payload.new?.content);
        const id = payload.new?.id;
        if (!id || !onInsert) return;
        const { data } = await sb
          .from("comments")
          .select(`
            id, content, status, created_at, user_id, pet_id,
            parent_id, like_count,
            user:users!user_id ( username, avatar_url ),
            pet:pets!pet_id ( name, breed, ai_avatar_url )
          `)
          .eq("id", id)
          .maybeSingle();
        if (data && data.status === "visible") {
          console.log(`${tag} 调用 onInsert，append 到 state`);
          onInsert(data);
        } else {
          console.log(`${tag} fetch 回来 data=null 或非 visible，跳过`);
        }
      }
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
      (payload) => {
        const id = payload.old?.id;
        console.log(`${tag} 收到 DELETE`, id);
        if (id && onDelete) onDelete(id);
      }
    )
    .subscribe((status, err) => {
      console.log(`${tag} channel status:`, status, err?.message || "");
    });
  return channel;
}

/* ══════════════════════════════════════════════════════════
   帖子
══════════════════════════════════════════════════════════ */
/**
 * Feed 分页拉取——只取卡片渲染必需字段，不要 image_urls。
 *  - cover_thumbnail_url 缺失时回退到 cover_image_url
 *  - 用 cursor (before) 而非 offset，避免新帖插入导致跳页
 */
/**
 * 从文本解析 #话题（中文/字母数字，去重，最多 10 个，单个 ≤20 字）。
 * 例： "今天遛狗 #今日遛狗打卡 #哈士奇" → ["今日遛狗打卡","哈士奇"]
 */
export function parseHashtags(text) {
  if (!text) return [];
  const out = [];
  const re = /#([一-龥\w]{1,20})/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const tag = m[1];
    if (tag && !out.includes(tag)) out.push(tag);
    if (out.length >= 10) break;
  }
  return out;
}

export async function listPosts({ limit = 20, before } = {}) {
  const sb = requireSupabase();
  let q = sb.from("posts")
    .select(`
      id, title, content, post_type, text_bg_color,
      cover_thumbnail_url, cover_image_url, cover_aspect_ratio, image_urls,
      like_count, comment_count, created_at, hashtags,
      user_id, pet_id,
      user:users!posts_user_id_fkey ( username, avatar_url ),
      pet:pets!posts_pet_id_fkey ( name, breed, ai_avatar_url )
    `)
    .eq("status", "visible")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (before) q = q.lt("created_at", before);

  const { data, error } = await q;
  if (error) throw new Error(`获取帖子失败: ${error.message}`);
  return data || [];
}

/**
 * 「关注」流：我赞过/互动过的人发的帖子（按时间倒序，真实数据）。
 * 逻辑：取我点赞过的帖子 → 这些帖子的作者 → 这些作者的全部可见帖子。
 */
export async function listFollowingPosts(userId, { limit = 30 } = {}) {
  if (!userId) return [];
  const sb = requireSupabase();
  const { data: likes } = await sb.from("post_likes")
    .select("post_id").eq("user_id", userId).limit(300);
  const likedIds = (likes || []).map((l) => l.post_id);
  if (!likedIds.length) return [];
  const { data: likedPosts } = await sb.from("posts")
    .select("user_id").in("id", likedIds);
  const authorIds = [...new Set((likedPosts || []).map((p) => p.user_id).filter(Boolean))];
  if (!authorIds.length) return [];
  const { data, error } = await sb.from("posts")
    .select(`
      id, title, content, post_type, text_bg_color,
      cover_thumbnail_url, cover_image_url, cover_aspect_ratio, image_urls,
      like_count, comment_count, created_at, hashtags,
      user_id, pet_id,
      user:users!posts_user_id_fkey ( username, avatar_url ),
      pet:pets!posts_pet_id_fkey ( name, breed, ai_avatar_url )
    `)
    .eq("status", "visible")
    .in("user_id", authorIds)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`获取关注流失败: ${error.message}`);
  return data || [];
}

/* ══════════════════════════════════════════════════════════
   关注系统（follows 表）
══════════════════════════════════════════════════════════ */
export async function followUser(followerId, followingId) {
  if (!followerId || !followingId || followerId === followingId) return;
  const sb = requireSupabase();
  const { error } = await sb.from("follows").insert({ follower_id: followerId, following_id: followingId });
  if (error && error.code !== "23505") throw new Error(`关注失败: ${error.message}`); // 23505=已关注，忽略
}

export async function unfollowUser(followerId, followingId) {
  if (!followerId || !followingId) return;
  const sb = requireSupabase();
  const { error } = await sb.from("follows").delete()
    .eq("follower_id", followerId).eq("following_id", followingId);
  if (error) throw new Error(`取消关注失败: ${error.message}`);
}

export async function isFollowing(followerId, followingId) {
  if (!followerId || !followingId) return false;
  const sb = requireSupabase();
  const { data } = await sb.from("follows").select("id")
    .eq("follower_id", followerId).eq("following_id", followingId).maybeSingle();
  return !!data;
}

/** 关注数 + 粉丝数（count，不取行） */
export async function getFollowCounts(userId) {
  if (!userId) return { following: 0, followers: 0 };
  const sb = requireSupabase();
  const [a, b] = await Promise.all([
    sb.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", userId),
    sb.from("follows").select("id", { count: "exact", head: true }).eq("following_id", userId),
  ]);
  return { following: a.count || 0, followers: b.count || 0 };
}

/** 某用户所有可见帖子的获赞总数 */
export async function getUserLikeTotal(userId) {
  if (!userId) return 0;
  const sb = requireSupabase();
  const { data } = await sb.from("posts").select("like_count")
    .eq("user_id", userId).eq("status", "visible");
  return (data || []).reduce((s, p) => s + (p.like_count || 0), 0);
}

/** 我关注的人（含资料），按关注时间倒序 */
export async function listFollowing(userId, { limit = 200 } = {}) {
  if (!userId) return [];
  const sb = requireSupabase();
  const { data, error } = await sb.from("follows")
    .select("created_at, following:users!follows_following_id_fkey ( id, username, avatar_url, city )")
    .eq("follower_id", userId).order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`获取关注列表失败: ${error.message}`);
  return (data || []).map((r) => ({ ...(r.following || {}), followed_at: r.created_at })).filter((u) => u.id);
}

/** 我的粉丝（含资料） */
export async function listFollowers(userId, { limit = 200 } = {}) {
  if (!userId) return [];
  const sb = requireSupabase();
  const { data, error } = await sb.from("follows")
    .select("created_at, follower:users!follows_follower_id_fkey ( id, username, avatar_url, city )")
    .eq("following_id", userId).order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`获取粉丝列表失败: ${error.message}`);
  return (data || []).map((r) => ({ ...(r.follower || {}), followed_at: r.created_at })).filter((u) => u.id);
}

/** 一批用户里，我已关注了哪些（返回 Set） */
export async function getFollowingSet(followerId, userIds = []) {
  if (!followerId || !userIds.length) return new Set();
  const sb = requireSupabase();
  const { data } = await sb.from("follows").select("following_id")
    .eq("follower_id", followerId).in("following_id", userIds);
  return new Set((data || []).map((r) => r.following_id));
}

/**
 * 「同城」流：同城用户发的帖子（users.city === city，真实数据）。
 */
export async function listCityPosts(city, { limit = 30 } = {}) {
  if (!city) return [];
  const sb = requireSupabase();
  const { data: cityUsers } = await sb.from("users").select("id").eq("city", city).limit(500);
  const ids = (cityUsers || []).map((u) => u.id);
  if (!ids.length) return [];
  const { data, error } = await sb.from("posts")
    .select(`
      id, title, content, post_type, text_bg_color,
      cover_thumbnail_url, cover_image_url, cover_aspect_ratio, image_urls,
      like_count, comment_count, created_at, hashtags,
      user_id, pet_id,
      user:users!posts_user_id_fkey ( username, avatar_url ),
      pet:pets!posts_pet_id_fkey ( name, breed, ai_avatar_url )
    `)
    .eq("status", "visible")
    .in("user_id", ids)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`获取同城帖子失败: ${error.message}`);
  return data || [];
}

/* ══════════════════════════════════════════════════════════
   轻量内存缓存（5 分钟）—— 避免热门/推荐每次刷新全表扫
══════════════════════════════════════════════════════════ */
const _cache = new Map();
async function cached(key, ttlMs, fn) {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.t < ttlMs) return hit.v;
  const v = await fn();
  _cache.set(key, { t: Date.now(), v });
  return v;
}
const FIVE_MIN = 5 * 60 * 1000;

/**
 * 🔥 今日热门话题：统计近 N 天帖子 hashtags 出现次数，取前 top（真实数据，非 mock）。
 */
export async function getHotTopics({ days = 7, top = 5 } = {}) {
  return cached(`hotTopics_${days}_${top}`, FIVE_MIN, async () => {
    const sb = requireSupabase();
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data, error } = await sb.from("posts")
      .select("hashtags")
      .eq("status", "visible")
      .gte("created_at", since)
      .limit(1000);
    if (error) throw new Error(`获取热门话题失败: ${error.message}`);
    const count = {};
    (data || []).forEach((p) => (p.hashtags || []).forEach((t) => {
      if (t) count[t] = (count[t] || 0) + 1;
    }));
    return Object.entries(count)
      .sort((a, b) => b[1] - a[1])
      .slice(0, top)
      .map(([tag, n]) => ({ tag, count: n }));
  });
}

/**
 * ✨ 今日推荐：近 hours 小时内，按 likes*2 + comments*3 排序，取前 top（真实帖子封面）。
 */
export async function getRecommendedPosts({ hours = 48, top = 3 } = {}) {
  return cached(`recommend_${hours}_${top}`, FIVE_MIN, async () => {
    const sb = requireSupabase();
    const since = new Date(Date.now() - hours * 3600000).toISOString();
    const { data, error } = await sb.from("posts")
      .select(`
        id, title, content, post_type, text_bg_color,
        cover_thumbnail_url, cover_image_url, cover_aspect_ratio,
        like_count, comment_count, created_at, hashtags,
        user_id, pet_id,
        user:users!posts_user_id_fkey ( username, avatar_url ),
        pet:pets!posts_pet_id_fkey ( name, breed, ai_avatar_url )
      `)
      .eq("status", "visible")
      .gte("created_at", since)
      .limit(100);
    if (error) throw new Error(`获取推荐失败: ${error.message}`);
    return (data || [])
      .map((p) => ({ ...p, _score: (p.like_count || 0) * 2 + (p.comment_count || 0) * 3 }))
      .sort((a, b) => b._score - a._score)
      .slice(0, top);
  });
}

/**
 * 「我加入的群聊」：我发过言的群（去重）+ 每群最近一条消息（真实，无新表）。
 * 返回 [{ id, name, breed, pet_type, lastMsg:{content, created_at, username} }]，按最近消息倒序。
 */
export async function getMyJoinedRooms(userId, { limit = 20 } = {}) {
  if (!userId) return [];
  const sb = requireSupabase();
  const { data: myMsgs } = await sb.from("messages")
    .select("room_id").eq("user_id", userId)
    .order("created_at", { ascending: false }).limit(300);
  const roomIds = [...new Set((myMsgs || []).map((m) => m.room_id))].slice(0, limit);
  if (!roomIds.length) return [];

  const { data: rooms } = await sb.from("chat_rooms")
    .select("id, name, breed, pet_type").in("id", roomIds);
  const roomById = {};
  (rooms || []).forEach((r) => { roomById[r.id] = r; });

  // 这些房间最近的消息（一次拉，挑每房第一条 + 每房近期时间线用于算未读）
  const { data: recent } = await sb.from("messages")
    .select("room_id, content, created_at, user_id, user:users!user_id ( username )")
    .in("room_id", roomIds).eq("status", "visible")
    .order("created_at", { ascending: false }).limit(600);
  const lastByRoom = {};
  const recentByRoom = {};
  (recent || []).forEach((m) => {
    if (!lastByRoom[m.room_id]) {
      lastByRoom[m.room_id] = { content: m.content, created_at: m.created_at, username: m.user?.username || "" };
    }
    const arr = (recentByRoom[m.room_id] = recentByRoom[m.room_id] || []);
    if (arr.length < 60) arr.push({ created_at: m.created_at, user_id: m.user_id });
  });

  return roomIds
    .map((id) => {
      const r = roomById[id];
      if (!r) return null;
      return { id, name: r.name, breed: r.breed, pet_type: r.pet_type || "dog",
               lastMsg: lastByRoom[id] || null, recent: recentByRoom[id] || [] };
    })
    .filter(Boolean)
    .sort((a, b) => (b.lastMsg?.created_at || "").localeCompare(a.lastMsg?.created_at || ""));
}

/**
 * 品种群活跃度 + 🔥本周最火（真实派生，无新表，5分钟缓存）：
 *  - 成员数：pets.breed 计数
 *  - 在线数：该房间近 15 分钟发消息的去重用户数
 *  - 本周最火：近 7 天群消息数 Top3
 * 返回 { statByBreed: { [breed]: {members, online, msgCount7d} }, hotGroups: [...] }
 */
export async function getGroupStats() {
  return cached("groupStats", FIVE_MIN, async () => {
    const sb = requireSupabase();
    const { data: rooms } = await sb.from("chat_rooms").select("id, name, breed");
    const roomByBreed = {};
    (rooms || []).forEach((r) => { if (r.breed) roomByBreed[r.breed] = r; });

    const { data: petRows } = await sb.from("pets").select("breed").limit(5000);
    const memberByBreed = {};
    (petRows || []).forEach((p) => { if (p.breed) memberByBreed[p.breed] = (memberByBreed[p.breed] || 0) + 1; });

    const since7  = new Date(Date.now() - 7 * 86400000).toISOString();
    const since15 = Date.now() - 15 * 60000;
    const { data: msgs } = await sb.from("messages")
      .select("room_id, user_id, created_at")
      .eq("status", "visible")
      .gte("created_at", since7)
      .order("created_at", { ascending: false })
      .limit(3000);
    const msgCount = {}, online = {};
    (msgs || []).forEach((m) => {
      msgCount[m.room_id] = (msgCount[m.room_id] || 0) + 1;
      if (new Date(m.created_at).getTime() >= since15) {
        (online[m.room_id] = online[m.room_id] || new Set()).add(m.user_id);
      }
    });

    const statByBreed = {};
    Object.entries(roomByBreed).forEach(([breed, r]) => {
      statByBreed[breed] = {
        members:    memberByBreed[breed] || 0,
        online:     online[r.id]?.size || 0,
        msgCount7d: msgCount[r.id] || 0,
      };
    });
    const hotGroups = Object.entries(roomByBreed)
      .map(([breed, r]) => ({
        breed, roomId: r.id, pet_type: r.pet_type || "dog",
        members: memberByBreed[breed] || 0,
        online:  online[r.id]?.size || 0,
        msgCount: msgCount[r.id] || 0,
      }))
      .filter((g) => g.msgCount > 0)
      .sort((a, b) => b.msgCount - a.msgCount)
      .slice(0, 3);

    return { statByBreed, hotGroups };
  });
}

/**
 * 话题页：拉取包含某个 hashtag 的所有可见帖子（按时间倒序）。
 */
export async function listPostsByTag(tag, { limit = 30 } = {}) {
  if (!tag) return [];
  const sb = requireSupabase();
  const { data, error } = await sb.from("posts")
    .select(`
      id, title, content, post_type, text_bg_color,
      cover_thumbnail_url, cover_image_url, cover_aspect_ratio, image_urls,
      like_count, comment_count, created_at, hashtags,
      user_id, pet_id,
      user:users!posts_user_id_fkey ( username, avatar_url ),
      pet:pets!posts_pet_id_fkey ( name, breed, ai_avatar_url )
    `)
    .eq("status", "visible")
    .contains("hashtags", [tag])
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`获取话题帖子失败: ${error.message}`);
  return data || [];
}

/**
 * 详情用——选 display_image_urls + thumbnail_urls 做模糊占位
 * （不取原图 original_image_urls；老帖 image_urls 作为 display 兜底）
 */
/* ══════════════════════════════════════════════════════════
   个人主页用查询
══════════════════════════════════════════════════════════ */

/** 我发的帖子 */
export async function listMyPosts(userId, { limit = 50, before } = {}) {
  if (!userId) return [];
  const sb = requireSupabase();
  let q = sb.from("posts")
    .select(`
      id, title, content, post_type, text_bg_color,
      cover_thumbnail_url, cover_image_url, cover_aspect_ratio, image_urls,
      like_count, comment_count, created_at, hashtags,
      user_id, pet_id,
      user:users!posts_user_id_fkey ( username, avatar_url ),
      pet:pets!posts_pet_id_fkey ( name, breed, ai_avatar_url )
    `)
    .eq("user_id", userId)
    .eq("status", "visible")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (before) q = q.lt("created_at", before);
  const { data, error } = await q;
  if (error) throw new Error(`获取我的帖子失败: ${error.message}`);
  return data || [];
}

/** 我赞过的帖子 */
export async function listLikedPosts(userId, { limit = 50 } = {}) {
  if (!userId) return [];
  const sb = requireSupabase();
  const { data: likes, error: likeErr } = await sb
    .from("post_likes")
    .select("post_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (likeErr) throw new Error(`获取点赞列表失败: ${likeErr.message}`);
  const ids = (likes || []).map((r) => r.post_id);
  if (ids.length === 0) return [];

  const { data, error } = await sb.from("posts")
    .select(`
      id, title, content, post_type, text_bg_color,
      cover_thumbnail_url, cover_image_url, cover_aspect_ratio, image_urls,
      like_count, comment_count, created_at, hashtags,
      user_id, pet_id,
      user:users!posts_user_id_fkey ( username, avatar_url ),
      pet:pets!posts_pet_id_fkey ( name, breed, ai_avatar_url )
    `)
    .in("id", ids)
    .eq("status", "visible");
  if (error) throw new Error(`获取点赞帖子失败: ${error.message}`);
  const map = new Map((data || []).map((p) => [p.id, p]));
  return ids.map((id) => map.get(id)).filter(Boolean);
}

/** 个人主页统计：获赞总数 / 作品数 / 赞过数 */
export async function getUserStats(userId) {
  if (!userId) return { totalLikes: 0, postCount: 0, likedCount: 0 };
  const sb = requireSupabase();
  const [posts, postCount, likedCount] = await Promise.all([
    sb.from("posts").select("like_count").eq("user_id", userId).eq("status", "visible"),
    sb.from("posts").select("*", { count: "exact", head: true })
      .eq("user_id", userId).eq("status", "visible"),
    sb.from("post_likes").select("*", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);
  const totalLikes = (posts.data || []).reduce((s, p) => s + (p.like_count || 0), 0);
  return {
    totalLikes,
    postCount:  postCount.count  || 0,
    likedCount: likedCount.count || 0,
  };
}

export async function getPostById(id) {
  const sb = requireSupabase();
  const { data, error } = await sb.from("posts")
    .select(`
      id, title, content, post_type, text_bg_color,
      display_image_urls, image_urls, thumbnail_urls,
      cover_image_url, cover_thumbnail_url, cover_aspect_ratio,
      status, like_count, comment_count, created_at,
      user_id, pet_id,
      user:users!posts_user_id_fkey ( username, avatar_url ),
      pet:pets!posts_pet_id_fkey ( name, breed, ai_avatar_url )
    `)
    .eq("id", id)
    .eq("status", "visible")
    .maybeSingle();
  if (error) throw new Error(`获取帖子详情失败: ${error.message}`);
  return data;
}

export async function createPost({
  userId, petId, content, title, postType,
  displayImageUrls, thumbnailUrls, originalImageUrls,
  coverAspectRatio, textBgColor,
}) {
  const sb = requireSupabase();
  const { flagged: fc } = checkContent(content || "");
  const { flagged: ft } = checkContent(title || "");
  const flagged = fc || ft;

  const hasDisp = Array.isArray(displayImageUrls) && displayImageUrls.length;
  const hasThumb = Array.isArray(thumbnailUrls) && thumbnailUrls.length;
  const hasOrig  = Array.isArray(originalImageUrls) && originalImageUrls.length;

  // 自动解析 #话题（标题 + 正文）
  const hashtags = parseHashtags(`${title || ""} ${content || ""}`);

  const { data, error } = await sb
    .from("posts")
    .insert({
      user_id:             userId,
      pet_id:              petId || null,
      title:               (title || "").trim() || null,
      content:             (content || "").trim(),
      hashtags,
      post_type:           postType || (hasDisp ? "image" : "text"),
      text_bg_color:       textBgColor || null,
      display_image_urls:  hasDisp ? displayImageUrls : null,
      thumbnail_urls:      hasThumb ? thumbnailUrls : null,
      original_image_urls: hasOrig ? originalImageUrls : null,
      // image_urls 保留写入（向后兼容老代码读旧字段），值同 display
      image_urls:          hasDisp ? displayImageUrls : null,
      cover_image_url:     hasDisp ? displayImageUrls[0] : null,
      cover_thumbnail_url: hasThumb ? thumbnailUrls[0] : null,
      cover_aspect_ratio:  coverAspectRatio || null,
      status:              flagged ? "flagged" : "visible",
    })
    .select(`
      id, title, content, post_type, text_bg_color,
      display_image_urls, thumbnail_urls, original_image_urls, image_urls,
      cover_image_url, cover_thumbnail_url, cover_aspect_ratio,
      status, like_count, comment_count, created_at, hashtags,
      user_id, pet_id,
      user:users!posts_user_id_fkey ( username, avatar_url ),
      pet:pets!posts_pet_id_fkey ( name, breed, ai_avatar_url )
    `)
    .single();
  if (error) throw new Error(`发帖失败: ${error.message}`);
  return { post: data, flagged };
}

/**
 * 上传一张图片到 post-images bucket。
 * abortFlag: { current: boolean } —— 在 await 后检查；命中则抛 AbortError
 */
export async function uploadPostImage(file, userId, abortFlag) {
  const sb = requireSupabase();
  if (!file || !userId) throw new Error("缺少 file 或 userId");
  if (file.size > 10 * 1024 * 1024) throw new Error("图片不能超过 10MB");

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeExt = ext.length > 0 && ext.length <= 5 ? ext : "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

  if (abortFlag?.current) {
    const e = new Error("已取消"); e.name = "AbortError"; throw e;
  }

  const { error: upErr } = await sb.storage
    .from("post-images")
    .upload(path, file, { cacheControl: "86400", upsert: false });
  if (upErr) throw new Error(`上传失败: ${upErr.message}`);

  // 上传完成后再检查一次取消标志：若已取消，立即删除刚上传的文件
  if (abortFlag?.current) {
    sb.storage.from("post-images").remove([path]).catch(() => {});
    const e = new Error("已取消"); e.name = "AbortError"; throw e;
  }

  const { data: pub } = sb.storage.from("post-images").getPublicUrl(path);
  if (!pub?.publicUrl) throw new Error("获取图片 URL 失败");
  return { url: pub.publicUrl, path };
}

/**
 * 删除一批已上传的图片（取消发布时清理）。
 * 接受 [{ path }] 数组（uploadPostImage 返回的对象）
 */
export async function cleanupUploadedImages(uploadedList) {
  if (!uploadedList?.length) return;
  const sb = requireSupabase();
  const paths = uploadedList.map((u) => u.path).filter(Boolean);
  if (!paths.length) return;
  await sb.storage.from("post-images").remove(paths).catch(() => {});
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
      user:users!user_id ( username, avatar_url ),
      pet:pets!pet_id ( name, breed, ai_avatar_url )
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
      user:users!user_id ( username, avatar_url ),
      pet:pets!pet_id ( name, breed, ai_avatar_url )
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
