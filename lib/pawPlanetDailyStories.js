/**
 * lib/pawPlanetDailyStories.js
 *
 * 「今天的它」每日动态生成器（升级版）。
 *
 * 规则：
 *  - 每天 3 条：morning / afternoon / evening，各从对应随机池抽 1 条；
 *  - 种子 = petId + 当天日期 → 同天同宠物固定一致、次日自动换一组；
 *  - 收到信优先：用户当天写信后，「下一个还没到的时间段」的动态替换为「收到信」动态
 *      · 上午写 → 当天下午变收到信；下午写 → 当天晚上；晚上写 → 次日上午（跨天）；
 *      · 用 target(日期+slot) 唯一决定 mailbox 出现在哪天哪段 → 同一封信只触发一次、不重复；
 *  - 特殊日子优先级：收到信 > 相遇纪念日 > 生日 > 进星球第 7/30/100 天 > 普通；
 *      且至少保留一条普通星球生活动态。
 *
 * 写信状态：第一版用 localStorage 记录（getPlanetLetters / addPlanetLetter）。
 *  📌 以后接 Supabase memorial_letters：把 getPlanetLetters 换成查表（按 user_id+pet_id+当天），
 *     getDailyPlanetStories 的 letters 入参结构保持 [{ id, created_at }] 即可，其余逻辑不用改。
 *
 * 输出：getDailyPlanetStories({ pet, date, letters, existingDailyStory }) →
 *   [{ slot, time, icon, title, text, type }, ...]（3 条）
 */

/* ── 时间段配置 ─────────────────────────────────────────────── */
const SLOT_META = {
  morning:   { time: "09:20", icon: "☀️" },
  afternoon: { time: "14:10", icon: "🐾" },
  evening:   { time: "20:30", icon: "🌙" },
};

/* ── 普通随机池（按时间段；每条 { type, title, text }）─────────── */
const POOLS = {
  morning: [
    { type: "sunshine",    title: "在草地上晒太阳", text: "在草地上晒了太阳，毛毛都变得暖暖的。" },
    { type: "sunshine",    title: "追着晨光跑",     text: "追着草地上的第一缕阳光，跑了一小圈。" },
    { type: "walk_flower", title: "花园里散步",     text: "在小花园里散步，闻了闻新开的小花。" },
    { type: "walk_flower", title: "遇见小蝴蝶",     text: "草地上飞来一只小蝴蝶，它好奇地追了两步。" },
    { type: "wake_up",     title: "小屋里醒来",     text: "在星球小屋里慢慢醒来，伸了个大大的懒腰。" },
    { type: "wake_up",     title: "门口打哈欠",     text: "蹲在小屋门口打了个哈欠，今天也是好天气。" },
  ],
  afternoon: [
    { type: "friends",   title: "和新朋友玩耍", text: "和新朋友多多一起在草地上玩，可开心啦。" },
    { type: "friends",   title: "交了新朋友",   text: "今天又认识了好几个小伙伴，大家都很喜欢它。" },
    { type: "play_ball", title: "玩小球",       text: "追着小球跑来跑去，玩得停不下来。" },
    { type: "snack",     title: "吃到小零食",   text: "吃到了最喜欢的小零食，心满意足～" },
    { type: "explore",   title: "探索星球",     text: "去星球没去过的角落探险，发现了一个小水洼。" },
    { type: "explore",   title: "树荫下歇脚",   text: "跟新朋友一起在树荫下乘凉休息。" },
  ],
  evening: [
    { type: "sleep_home", title: "回小窝睡觉", text: "回到小窝里，睡了一个软软的觉。" },
    { type: "sleep_home", title: "盖云朵被子", text: "钻进软软的云朵被子里，做了个甜甜的梦。" },
    { type: "stargazing", title: "看星星",     text: "躺在草地上看星星，数着数着就笑了。" },
    { type: "stargazing", title: "星星灯旁",   text: "坐在星星灯旁边，好像在轻轻想你。" },
    { type: "quiet_rest", title: "安心休息",   text: "爪爪星球的夜晚很安静，它睡得很安心。" },
    { type: "quiet_rest", title: "和朋友看晚霞", text: "和朋友们一起看了今天的晚霞，才慢慢回家。" },
  ],
};

/* ── 收到信优先事件池 ───────────────────────────────────────── */
const MAILBOX_POOL = [
  { type: "mailbox", icon: "💌", title: "星球信箱亮了",   text: "它收到了你的信，信箱旁边的小星星亮了好久。" },
  { type: "mailbox", icon: "💌", title: "收到你的想念",   text: "你的话已经被好好送到爪爪星球啦。" },
  { type: "mailbox", icon: "⭐", title: "信被好好收下了", text: "它把你的信放进了星球小屋里，像珍贵的宝贝一样保存着。" },
  { type: "mailbox", icon: "🐾", title: "今天有一封特别的信", text: "星球信箱今天轻轻响了一下，因为收到了你的想念。" },
];

/* ── 特殊纪念日 ─────────────────────────────────────────────── */
const ANNIV = {
  companion: { type: "anniversary", icon: "💛", title: "相遇纪念日", text: "今天是你们相遇的日子，这一天会一直被好好记住。" },
  birthday:  { type: "anniversary", icon: "🎂", title: "生日快乐",   text: "今天是它的生日，爪爪星球的小伙伴们都来陪它啦。" },
  milestone: (n) => ({ type: "anniversary", icon: "⭐", title: `在星球的第 ${n} 天`, text: `它已经在爪爪星球住了 ${n} 天啦，这里有阳光、草地和新朋友。` }),
};

/* ── type → 卡片占位色（真实卡片素材以后放进项目即可替换）──────── */
export const TYPE_THUMB = {
  sunshine:    "linear-gradient(135deg,#FBE9C8,#F3CE8A)",
  walk_flower: "linear-gradient(135deg,#E6F2D0,#C2DE98)",
  wake_up:     "linear-gradient(135deg,#FBE3D0,#F3C49B)",
  friends:     "linear-gradient(135deg,#DDEFC9,#B6D99A)",
  play_ball:   "linear-gradient(135deg,#D9ECF2,#ABD3E0)",
  snack:       "linear-gradient(135deg,#FBEEC8,#F2D98A)",
  explore:     "linear-gradient(135deg,#E0EFD2,#BCD9A0)",
  sleep_home:  "linear-gradient(135deg,#E6DEF7,#C6BCE8)",
  stargazing:  "linear-gradient(135deg,#D6D9F2,#AEB4E0)",
  quiet_rest:  "linear-gradient(135deg,#E6DEF7,#C6BCE8)",
  mailbox:     "linear-gradient(135deg,#FCE0E6,#F2B8C6)",
  anniversary: "linear-gradient(135deg,#F6E0C0,#EFC07E)",
  album:       "linear-gradient(135deg,#EAE2F6,#CFC2EA)",
};
export function storyThumb(type) {
  return TYPE_THUMB[type] || "linear-gradient(135deg,#FBE3D0,#F3C49B)";
}

/* type → 真实卡片图（public 下，已压缩为 JPEG，3:2 / 1024×682，约 90-150KB 每张）。
   池里没有独立图的 type（花园/醒来/探索/看星星/安静）映射到语义最相近的一张。 */
export const TYPE_IMAGE = {
  sunshine:    "/planet_sunshine_card.jpg",
  walk_flower: "/planet_sunshine_card.jpg",   // 花园散步 → 户外晒太阳
  wake_up:     "/planet_sleep_home_card.jpg", // 小屋醒来 → 小屋
  friends:     "/planet_friends_card.jpg",
  play_ball:   "/planet_play_ball_card.jpg",
  snack:       "/planet_snack_card.jpg",
  explore:     "/planet_friends_card.jpg",    // 探索 → 户外
  sleep_home:  "/planet_sleep_home_card.jpg",
  stargazing:  "/planet_sleep_home_card.jpg", // 看星星 → 夜晚小屋
  quiet_rest:  "/planet_sleep_home_card.jpg",
  mailbox:     "/planet_mailbox_card.jpg",
  album:       "/planet_album_card.jpg",
  anniversary: "/planet_anniversary_card.jpg",
};
export function storyImage(type) {
  return TYPE_IMAGE[type] || "/planet_sunshine_card.jpg";
}

/* ── 写信记录（第一版 localStorage；以后换 Supabase memorial_letters）── */
const LETTERS_KEY = (petId) => `tailme_planet_letters_${petId}`;
export function getPlanetLetters(petId) {
  if (typeof window === "undefined" || !petId) return [];
  try { return JSON.parse(localStorage.getItem(LETTERS_KEY(petId)) || "[]"); } catch { return []; }
}
export function addPlanetLetter(petId, { title, content } = {}) {
  if (typeof window === "undefined" || !petId) return;
  try {
    const list = getPlanetLetters(petId);
    list.push({ id: `L${Date.now()}`, created_at: new Date().toISOString(), title: title || "", content: content || "" });
    localStorage.setItem(LETTERS_KEY(petId), JSON.stringify(list));
  } catch { /* localStorage 不可用则忽略 */ }
}

/* ── 工具 ───────────────────────────────────────────────────── */
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function localDateStr(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function slotOfHour(h) {
  if (h >= 6 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "afternoon";
  return "evening"; // 18-23 与 0-5 都归晚上
}
function sameMonthDay(iso, today) {
  if (!iso) return false;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return false;
  return d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}
function daysSince(iso, today) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.floor((today.getTime() - d.getTime()) / 86400000);
}

/** 计算「今天应该出现收到信动态」的时间段集合（target 唯一决定，天然防重复）。 */
function mailboxSlotsForToday(letters, today) {
  const todayStr = localDateStr(today);
  const set = new Set();
  for (const l of letters || []) {
    const lc = new Date(l.created_at);
    if (isNaN(lc.getTime())) continue;
    const ls = slotOfHour(lc.getHours());
    let targetDate = new Date(lc), targetSlot;
    if (ls === "morning") targetSlot = "afternoon";
    else if (ls === "afternoon") targetSlot = "evening";
    else { targetDate.setDate(targetDate.getDate() + 1); targetSlot = "morning"; } // 晚上 → 次日上午
    if (localDateStr(targetDate) === todayStr) set.add(targetSlot);
  }
  return set;
}

/* ── 主入口 ─────────────────────────────────────────────────── */
export function getDailyPlanetStories({ pet, date, letters, existingDailyStory } = {}) {
  const today = date instanceof Date ? date : new Date();
  const petId = pet?.id || "anon";
  const rnd = mulberry32(hashSeed(`${petId}_${localDateStr(today)}`));
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  // existingDailyStory 预留：以后可用已存记录覆盖随机结果（保证更强一致性），第一版未使用。
  void existingDailyStory;

  // 1) 基础 3 条
  const base = {
    morning: pick(POOLS.morning),
    afternoon: pick(POOLS.afternoon),
    evening: pick(POOLS.evening),
  };
  const special = { morning: false, afternoon: false, evening: false };

  // 2) 特殊纪念日（相遇 > 生日 > 进星球里程碑），默认放上午
  const milestone = (() => {
    const n = daysSince(pet?.memorial_started_at, today);
    return [7, 30, 100].includes(n) ? ANNIV.milestone(n) : null;
  })();
  const anniv =
    sameMonthDay(pet?.created_at, today) ? ANNIV.companion :
    sameMonthDay(pet?.birthday, today) ? ANNIV.birthday :
    milestone || null;
  if (anniv) { base.morning = anniv; special.morning = true; }

  // 3) 收到信（最高优先，覆盖 target 段；若占了上午纪念日，则把纪念日挪到一条普通段）
  const lettersSafe = letters || getPlanetLetters(petId);
  const mailSlots = mailboxSlotsForToday(lettersSafe, today);
  ["morning", "afternoon", "evening"].forEach((slot) => {
    if (!mailSlots.has(slot)) return;
    if (slot === "morning" && special.morning && anniv) {
      if (!mailSlots.has("afternoon")) { base.afternoon = anniv; special.afternoon = true; }
      else if (!mailSlots.has("evening")) { base.evening = anniv; special.evening = true; }
    }
    base[slot] = pick(MAILBOX_POOL);
    special[slot] = true;
  });

  // 4) 至少保留一条普通星球生活动态
  if (special.morning && special.afternoon && special.evening) {
    base.evening = pick(POOLS.evening);
  }

  // 组装（slot 决定 time，普通动态用 slot 默认 icon，特殊动态用自带 icon）
  const make = (slot, s) => {
    const meta = SLOT_META[slot];
    return { slot, time: meta.time, icon: s.icon || meta.icon, title: s.title, text: s.text, type: s.type };
  };
  return [make("morning", base.morning), make("afternoon", base.afternoon), make("evening", base.evening)];
}
