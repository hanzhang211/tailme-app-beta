/**
 * services/petCallTriggerService.js
 *
 * 【AI 宠物来电】自动触发判断。只「监听」现有事件，全程只读，不改任何现有数据。
 *
 * checkPetCallTriggers(user, pet) → 评估各场景 → 同一时刻只返回「优先级最高的一个」触发，或 null。
 *
 * 优先级（数字越小越高，对应需求第二节 P0→P5）：
 *   0 用药超时(overdue) · 1 用药到点(due) · 2 喂食超时 · 3 遛弯 · 4 生病照护 · 5 记忆回访 · 6 想你
 *
 * 防重复 / 频率 / 安静时间 / 未接暂停：见 checkPetCallTriggers 末尾与 petCallService 查询。
 *
 * 数据源（均复用现有，独立读取、不 import 首页计算、不改首页）：
 *   喂食  feeding_records(getFeedingPlan) + localStorage tailme_feed_done_{date}_{petId}
 *   用药  health_records(listDiseaseRecords).activeDisease.medicine_* + localStorage isMedDoneToday
 *   遛弯  dog_friend_get_my_profile.walking_times（时间段字符串，取起点）
 *   想你  localStorage tailme_last_open_{userId}
 *
 * 第一版：前端在 App 打开/首页加载/切宠物/进来电页时调用；记忆回访 evalMemory 预留返回 null。
 * 后续：可换成 Supabase Edge cron / Vercel cron / push 调度，规则函数复用。
 */

import { getFeedingPlan } from "@/services/supabaseService";
import { listDiseaseRecords, isMedDoneToday } from "@/services/petHealthService";
import { getMyDogProfile } from "@/services/dogFriendService";
import { isCatPet } from "@/services/breedAvatar";
import { resolveCallEmotion } from "@/lib/petCallEmotionMap";
import { DEFAULT_SCENES } from "@/lib/petCallTemplates";
import {
  getCallSettings, hasTriggeredToday, hasTriggeredTypeToday,
  countTodayAutoCalls, isMissYouPaused,
} from "@/services/petCallService";

/* ── 时间 / 本地状态工具 ───────────────────────────────────── */
function localToday() {
  const d = new Date(); const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function nowMinutes() {
  const d = new Date(); return d.getHours() * 60 + d.getMinutes();
}
// 安静时间：默认 23:00 - 08:00 不主动来电
function inQuietHours() {
  const h = new Date().getHours();
  return h >= 23 || h < 8;
}
// 从 "HH:MM" / "HH:MM:SS" / "晚上 20:00-23:00" 解析出起点分钟数
function parseStartMinutes(text) {
  const m = String(text || "").match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}
function getDoneMeals(petId, today) {
  try {
    const s = localStorage.getItem(`tailme_feed_done_${today}_${petId}`);
    return s ? JSON.parse(s) : {};
  } catch { return {}; }
}

/* ── 「久未打开」用的最近打开时间（接入点在 check 之后再调 markAppOpened）── */
const lastOpenKey = (userId) => `tailme_last_open_${userId}`;
export function markAppOpened(userId) {
  if (typeof window === "undefined" || !userId) return;
  try { localStorage.setItem(lastOpenKey(userId), new Date().toISOString()); } catch {}
}
function daysSinceLastOpen(userId) {
  try {
    const s = localStorage.getItem(lastOpenKey(userId));
    if (!s) return null; // 无记录 = 首次进入，不算久未打开
    return (Date.now() - new Date(s).getTime()) / (24 * 3600 * 1000);
  } catch { return null; }
}

/** 节流：同一会话同一宠物默认 5 分钟内不重复检查（避免切 tab 反复查库）。切宠物会用新 key。 */
export function shouldRunCheck(userId, petId, minIntervalMs = 5 * 60 * 1000) {
  if (typeof window === "undefined" || !userId || !petId) return false;
  try {
    const k = `tailme_call_check_${userId}_${petId}`;
    const last = sessionStorage.getItem(k);
    if (last && Date.now() - Number(last) < minIntervalMs) return false;
    sessionStorage.setItem(k, String(Date.now()));
    return true;
  } catch { return true; }
}

/* ── 各场景判断（命中返回候选，否则 null）──────────────────── */

// 用药超时（最高优先级）：基于 activeDisease 的 medicine_reminder_*（与首页一致）
async function evalMedication(pet, today) {
  const diseases = await listDiseaseRecords(pet.id).catch(() => []);
  const active = diseases.find((d) => d.status !== "recovered");
  if (!active) return null;
  if (!active.medicine_reminder_enabled || !active.medicine_reminder_time) return null;
  if (active.medicine_start_date && today < active.medicine_start_date) return null;
  if (active.medicine_end_date && today > active.medicine_end_date) return null;
  if (isMedDoneToday(active.id)) return null;
  const start = parseStartMinutes(active.medicine_reminder_time);
  if (start == null) return null;
  const diff = nowMinutes() - start; // 正 = 已超时分钟
  const base = {
    scene: "medication", trigger_type: "medication",
    trigger_source_id: `med_${active.id}_${today}`, trigger_source_table: "health_records",
  };
  if (diff >= 30) return { ...base, call_type: "medicine_overdue", priority: 0 };
  if (diff >= 5) return { ...base, call_type: "medicine_due", priority: 1 };
  return null;
}

// 喂食超时：取超时最久的未完成餐；每餐每天最多触发一次（source_id 含餐序号）
async function evalFeeding(pet, today) {
  const rows = await getFeedingPlan(pet.id).catch(() => []);
  if (!rows.length) return null;
  const done = getDoneMeals(pet.id, today);
  const now = nowMinutes();
  let worst = null; // { idx, diff }
  rows.forEach((r, i) => {
    if (done[i]) return;
    const start = parseStartMinutes(r.scheduled_time);
    if (start == null) return;
    const diff = now - start;
    if (diff >= 15 && (!worst || diff > worst.diff)) worst = { idx: i, diff };
  });
  if (!worst) return null;
  // 同一餐只来 1 次电，文案按当时超时程度选轻/重（避免重复打扰）
  const call_type = worst.diff >= 60 ? "feeding_overdue_long" : "feeding_overdue_short";
  return {
    scene: "feeding", call_type, trigger_type: "feeding", priority: 2,
    trigger_source_id: `feed_${pet.id}_${today}_${worst.idx}`, trigger_source_table: "feeding_records",
  };
}

// 遛弯时间：名片有 walking_times（视为开启遛弯卡片）；前 10 分钟 / 过后 15 分钟触发；猫狗都可
async function evalWalk(user, pet, today) {
  const profile = await getMyDogProfile(user.id).catch(() => null);
  const times = profile?.walking_times || [];
  if (!times.length) return null;
  const now = nowMinutes();
  for (const slot of times) {
    const start = parseStartMinutes(slot);
    if (start == null) continue;
    const diff = now - start;
    const key = String(slot).replace(/[^0-9]/g, "");
    const base = {
      scene: "walk", trigger_type: "walk", priority: 3,
      trigger_source_id: `walk_${pet.id}_${today}_${key}`, trigger_source_table: "dog_friend_profiles",
    };
    if (diff >= -10 && diff < 0) return { ...base, call_type: "walk_time_soon" };
    if (diff >= 0 && diff <= 15) return { ...base, call_type: "walk_time_overdue" };
  }
  return null;
}

// 生病照护：生病中且当天未触发过用药来电，每天最多一次
async function evalSickCare(pet, today) {
  const diseases = await listDiseaseRecords(pet.id).catch(() => []);
  const active = diseases.find((d) => d.status !== "recovered");
  if (!active) return null;
  if (await hasTriggeredTypeToday(pet.id, "medication")) return null; // 已有用药来电则当天不再生病照护
  return {
    scene: "sick_care", call_type: "sick_care_checkin", trigger_type: "sick_care", priority: 4,
    trigger_source_id: `sick_${pet.id}_${today}`, trigger_source_table: "health_records",
  };
}

// AI 记忆回访：第一版预留，不自动触发
async function evalMemory(/* user, pet, today */) {
  // TODO(后续): 接 AI 聊天事件识别 → listDueFollowups(user.id) 命中则返回 memory_followup 触发
  return null;
}

// 想你来电：久未打开 App（≥3 天），每天最多一次
function evalMissYou(user, pet, today) {
  const days = daysSinceLastOpen(user.id);
  if (days == null || days < 3) return null;
  return {
    scene: "miss_you", call_type: "miss_you", trigger_type: "miss_you", priority: 6,
    trigger_source_id: `miss_${pet.id}_${today}`, trigger_source_table: null,
  };
}

/* ── 主入口 ────────────────────────────────────────────────── */
export async function checkPetCallTriggers(user, pet) {
  if (typeof window === "undefined") return null;
  if (!user?.id || !pet?.id) return null;
  if (inQuietHours()) return null; // 安静时间不主动来电

  let settings = null;
  try { settings = await getCallSettings(pet.id); } catch { settings = null; }
  if (settings && settings.enabled === false) return null;
  const scenes = { ...DEFAULT_SCENES, ...(settings?.scenes && typeof settings.scenes === "object" ? settings.scenes : {}) };
  const petType = isCatPet(pet) ? "cat" : "dog";
  const today = localToday();

  const candidates = [];
  const push = async (on, fn) => { if (!on) return; try { const c = await fn(); if (c) candidates.push(c); } catch {} };
  await push(scenes.medication, () => evalMedication(pet, today));
  await push(scenes.feeding, () => evalFeeding(pet, today));
  await push(scenes.walk, () => evalWalk(user, pet, today));
  await push(scenes.sick_care, () => evalSickCare(pet, today));
  await push(scenes.memory_followup, () => evalMemory(user, pet, today));
  await push(scenes.miss_you, () => Promise.resolve(evalMissYou(user, pet, today)));

  if (!candidates.length) return null;
  candidates.sort((a, b) => a.priority - b.priority);
  const top = candidates[0];

  // 防重复：同一来源今天已触发过
  if (await hasTriggeredToday(pet.id, top.trigger_source_id)) return null;
  // 频率限制：普通每天 1 次；用药刚需可至 2 次（会员 3 次后续再放开 cap）
  const cap = top.trigger_type === "medication" ? 2 : 1;
  if ((await countTodayAutoCalls(user.id)) >= cap) return null;
  // 想你来电连续 2 次未接 → 暂停 3 天（不影响用药/喂食等刚需）
  if (top.scene === "miss_you" && (await isMissYouPaused(user.id))) return null;

  // 补充字幕 / 情绪 / 声音（统一由情绪映射给出）
  const emo = resolveCallEmotion(top.call_type, petType);
  return {
    ...top,
    subtitle: emo.subtitle,
    emotion: emo.emotion,
    sound_key: emo.sound,
    subtitleTone: emo.subtitleTone,
  };
}
