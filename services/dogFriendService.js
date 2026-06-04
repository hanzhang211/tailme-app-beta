/**
 * services/dogFriendService.js
 *
 * 狗友 / 附近狗狗 —— 真实数据。
 *
 * 隐私模型：经纬度属于敏感信息，全部经由 Supabase SECURITY DEFINER RPC 访问，
 * 前端永远拿不到别人的 last_lat / last_lng，附近查询只返回 distance_km。
 * 对应 SQL：supabase/dog_friends.sql
 */

import { supabase } from "@/lib/supabase";

function sb() {
  if (!supabase) throw new Error("Supabase 未初始化");
  return supabase;
}

/* 遛弯时间 / 性格 / 大小狗偏好（前端与 DB 共用同一套字面值）*/
export const WALKING_TIMES = [
  "上午 6:00-9:00", "上午 9:00-12:00", "下午 12:00-16:00",
  "下午 16:00-20:00", "晚上 20:00-23:00", "深夜 23:00-6:00",
];
export const PERSONALITY_TAGS = [
  "亲人", "活泼", "温柔", "胆小", "高冷", "独立", "黏人", "安静", "调皮", "慢热",
];
export const SMALL_DOG_OPTIONS = ["可和小狗玩", "视情况而定", "只想安静"];
export const BIG_DOG_OPTIONS   = ["可和大狗玩", "视情况而定", "只想安静"];

/* ── 浏览器定位（包装成 Promise；区分"拒绝授权"与"获取失败"）── */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      const e = new Error("当前设备不支持定位"); e.code = "unsupported"; return reject(e);
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        const e = new Error(err.message || "定位失败");
        e.code = err.code === 1 ? "denied" : "unavailable"; // 1 = PERMISSION_DENIED
        reject(e);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  });
}

/* ── 读取我的名片（无则返回 null）────────────────────────── */
export async function getMyDogProfile(userId) {
  if (!userId) return null;
  const { data, error } = await sb().rpc("dog_friend_get_my_profile", { in_user_id: userId });
  if (error) throw new Error(`获取遛弯名片失败: ${error.message}`);
  return (data && data[0]) || null;
}

/* ── 保存名片（时间/性格/大小狗偏好/简介）────────────────── */
export async function upsertDogProfile({
  userId, petId, walkingTimes, personalities, smallPref, bigPref, intro,
}) {
  const { error } = await sb().rpc("dog_friend_upsert_profile", {
    in_user_id: userId,
    in_pet_id: petId || null,
    in_walking_times: walkingTimes || [],
    in_personalities: personalities || [],
    in_small: smallPref || null,
    in_big: bigPref || null,
    in_intro: (intro || "").slice(0, 100),
  });
  if (error) throw new Error(`保存遛弯名片失败: ${error.message}`);
}

/* ── 设置"公开距离"开关（开启需带当前坐标）──────────────── */
export async function setDogVisibility({ userId, visible, lat = null, lng = null }) {
  const { error } = await sb().rpc("dog_friend_set_visibility", {
    in_user_id: userId, in_visible: !!visible, in_lat: lat, in_lng: lng,
  });
  if (error) throw new Error(`更新公开状态失败: ${error.message}`);
}

/* ── 刷新当前位置（仅在已公开时服务端才会写入）────────────── */
export async function updateDogLocation({ userId, lat, lng }) {
  const { error } = await sb().rpc("dog_friend_update_location", {
    in_user_id: userId, in_lat: lat, in_lng: lng,
  });
  if (error) throw new Error(`更新位置失败: ${error.message}`);
}

/* ── 查询附近狗友（服务端算距离，只回 distance_km）────────── */
export async function getNearbyDogFriends({ userId, lat, lng, radiusKm = 1.0 }) {
  const { data, error } = await sb().rpc("nearby_dog_friends", {
    in_user_id: userId, in_lat: lat, in_lng: lng, in_radius_km: radiusKm,
  });
  if (error) throw new Error(`获取附近狗友失败: ${error.message}`);
  return data || [];
}
