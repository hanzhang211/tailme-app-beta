/**
 * lib/pawPlanetDailyStories.js
 *
 * 「今天的它」每日动态生成器 —— 按 petId + 日期 种子化随机：
 *   ✅ 同一天同一只宠物看到的内容固定一致（刷新不变）；
 *   ✅ 第二天自动换一组。
 *
 * 第一版来源：时间段文案池（morning/afternoon/evening）+ 宠物性格文案池 + 特殊日子优先。
 * 预留：specialDay 已实现；memoryAction（用户行为）后续接入；
 *       未来接 AI 自动生成只需替换 getDailyPlanetStories 内部，调用方与返回结构不变。
 *
 * 输出：getDailyPlanetStories({ pet, date }) →
 *   [ { time:'09:20', icon:'☀️', phase:'morning',  title, text },
 *     { time:'14:10', icon:'🐾', phase:'afternoon', title, text },
 *     { time:'20:30', icon:'🌙', phase:'evening',   title, text } ]
 *
 * 文案风格：温柔治愈、不悲伤；统一用「爪爪星球 / 星球小屋 / 草地 / 新朋友 / 阳光 / 星星」等概念。
 */

/* ── 时间段文案池（每条 { title, text }）─────────────────────── */
const MORNING = [
  { title: "在草地上晒太阳", text: "在草地上晒了太阳，毛毛都变得暖暖的。" },
  { title: "门口伸懒腰", text: "在星球小屋门口伸了个大大的懒腰。" },
  { title: "闻到了花香", text: "闻到了花香，开心地转了两圈。" },
  { title: "很早就醒啦", text: "今天醒得很早，好像心情特别好。" },
  { title: "追着晨光跑", text: "追着草地上的第一缕阳光，跑了一小圈。" },
  { title: "和露珠玩耍", text: "踩到草叶上的小露珠，凉凉的，觉得好新奇呀。" },
];
const AFTERNOON = [
  { title: "和新朋友玩球", text: "和新朋友多多一起玩了小球，跑得可开心啦。" },
  { title: "发现小黄花", text: "在小花园里发现了一朵小黄花，盯着看了好久。" },
  { title: "吃到了小零食", text: "吃到了最喜欢的小零食，心满意足～" },
  { title: "树荫下歇脚", text: "跟新朋友一起在树荫下乘凉休息。" },
  { title: "草地上打滚", text: "在软软的草地上打了好几个滚，毛上沾满阳光的味道。" },
  { title: "散步小路", text: "沿着星球的小路散了散步，遇见了好多小伙伴。" },
];
const EVENING = [
  { title: "回小窝睡觉", text: "回到小窝里，睡了一个软软的觉。" },
  { title: "星星灯旁发呆", text: "坐在星星灯旁边，好像在轻轻想你。" },
  { title: "和朋友看晚霞", text: "和朋友们一起看了今天的晚霞。" },
  { title: "安心入睡", text: "爪爪星球的夜晚很安静，它睡得很安心。" },
  { title: "数着星星", text: "躺在草地上数星星，数着数着就笑了。" },
  { title: "盖上云朵被子", text: "钻进软软的云朵被子里，做了个甜甜的梦。" },
];

/* ── 性格文案池（按关键词匹配 pet.personality 子串）──────────── */
const PERSONALITY = [
  { keys: ["活力", "活泼"], title: "草地上撒欢", text: "今天在草地上跑了好几圈，开心得尾巴一直摇。" },
  { keys: ["黏人", "粘人", "撒娇"], title: "在等你的信", text: "今天坐在小屋门口，好像在等一封你的来信。" },
  { keys: ["安静", "慢热"], title: "树荫下好梦", text: "今天在树荫下睡了很久，梦里都是暖暖的阳光。" },
  { keys: ["贪吃", "馋"], title: "吃到心爱零食", text: "今天吃到了最喜欢的小零食，开心得眼睛都亮了。" },
  { keys: ["好奇", "探险"], title: "探索新角落", text: "今天去星球没去过的角落探险，发现了一个小水洼。" },
  { keys: ["社牛", "明星"], title: "交了新朋友", text: "今天又认识了好几个新朋友，大家都很喜欢它。" },
];

/* ── 特殊日子（优先替换上午第一条）──────────────────────────── */
const SPECIAL = {
  birthday:  { title: "生日快乐", text: "今天是它的生日，爪爪星球的小伙伴们都来陪它啦。" },
  companion: { title: "相遇纪念日", text: "今天是你们相遇的日子，这一天会一直被好好记住。" },
  arrival:   { title: "星球纪念日", text: "它已经在爪爪星球住下一段时间啦，这里有阳光、草地和新朋友。" },
};

/* ── 种子化随机（字符串 → 稳定随机序列）──────────────────────── */
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

function localDateStr(date) {
  const d = date instanceof Date ? date : new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
// 月日匹配（生日/纪念日比对，忽略年份）
function sameMonthDay(iso, today) {
  if (!iso) return false;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return false;
  return d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}

/**
 * 生成「今天的它」3 条动态（上午/下午/晚上）。
 * 种子 = petId + 当前日期 → 同天同宠物一致、次日自动换。
 */
export function getDailyPlanetStories({ pet, date } = {}) {
  const today = date instanceof Date ? date : new Date();
  const rnd = mulberry32(hashSeed(`${pet?.id || "anon"}_${localDateStr(today)}`));
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

  // 上午：特殊日子优先（生日 > 相遇纪念日 > 进入星球纪念日），否则 morning 池
  const special =
    sameMonthDay(pet?.birthday, today) ? SPECIAL.birthday :
    sameMonthDay(pet?.created_at, today) ? SPECIAL.companion :
    sameMonthDay(pet?.memorial_started_at, today) ? SPECIAL.arrival : null;
  const morning = special || pick(MORNING);

  // 下午：有匹配性格则优先性格文案，否则 afternoon 池
  const persona = pet?.personality || "";
  const matched = PERSONALITY.filter((p) => p.keys.some((k) => persona.includes(k)));
  const afternoon = matched.length ? matched[Math.floor(rnd() * matched.length)] : pick(AFTERNOON);

  // 晚上：evening 池
  const evening = pick(EVENING);

  return [
    { time: "09:20", icon: "☀️", phase: "morning",   title: morning.title,   text: morning.text },
    { time: "14:10", icon: "🐾", phase: "afternoon", title: afternoon.title, text: afternoon.text },
    { time: "20:30", icon: "🌙", phase: "evening",   title: evening.title,   text: evening.text },
  ];
}
