/**
 * services/warningTypes.js
 * 「宠物警示」共享常量：事件类型（分组）、风险等级、用户号脱敏、距离。
 * 前端文案统一「宠物警示」；内部仍叫 warning / danger_reports。
 */

// 事件类型分组（用户上报用分组 chips；report.event_type 存子项 id）
export const WARNING_GROUPS = [
  { id: "attack", label: "宠物攻击", icon: "🐕", types: [
    { id: "stray_attack", label: "流浪动物攻击" },
    { id: "pet_attack",   label: "其他宠物攻击" },
    { id: "fight_zone",   label: "宠物打架高发" },
  ]},
  { id: "poison", label: "有毒 / 误食", icon: "⚠️", types: [
    { id: "suspected_poison", label: "疑似投毒" },
    { id: "toxic_food",       label: "有毒食物" },
    { id: "bait",             label: "毒饵 / 老鼠药" },
    { id: "trash",            label: "垃圾堆误食风险" },
    { id: "chemical",         label: "不明液体 / 化学物" },
  ]},
  { id: "road", label: "道路 / 环境", icon: "🚧", types: [
    { id: "traffic",      label: "车流危险" },
    { id: "construction", label: "施工区域" },
    { id: "glass",        label: "玻璃碎片 / 尖锐物" },
    { id: "hot_ground",   label: "地面高温 / 烫脚" },
    { id: "slippery",     label: "积水 / 湿滑" },
    { id: "pit",          label: "窨井 / 坑洞" },
    { id: "noise",        label: "噪音惊吓" },
  ]},
  { id: "venue", label: "场所限制", icon: "🚫", types: [
    { id: "no_pets",       label: "禁止宠物进入" },
    { id: "guard",         label: "保安驱赶" },
    { id: "unfriendly",    label: "商户不友好" },
    { id: "complaints",    label: "行人投诉高发" },
    { id: "walk_conflict", label: "遛狗冲突" },
  ]},
  { id: "hygiene", label: "卫生 / 疾病", icon: "🦠", types: [
    { id: "disease", label: "疑似传染病风险" },
    { id: "pests",   label: "虫蚁 / 跳蚤较多" },
    { id: "feces",   label: "动物粪便堆积" },
    { id: "odor",    label: "异味严重" },
  ]},
  { id: "other", label: "其他", icon: "❓", types: [
    { id: "other", label: "其他宠物安全风险" },
  ]},
];

// 子项 id → { label, groupId, groupLabel, icon }
const TYPE_MAP = {};
WARNING_GROUPS.forEach((g) => g.types.forEach((t) => {
  TYPE_MAP[t.id] = { label: t.label, groupId: g.id, groupLabel: g.label, icon: g.icon };
}));

export function typeInfo(id) {
  return TYPE_MAP[id] || { label: "其他宠物安全风险", groupId: "other", groupLabel: "其他", icon: "⚠️" };
}
export function typeLabel(id) { return typeInfo(id).label; }
export function typeGroupId(id) { return typeInfo(id).groupId; }

// 地图筛选用：全部 + 6 大类
export const WARNING_FILTERS = [
  { id: "all", label: "全部", icon: "🐾" },
  ...WARNING_GROUPS.map((g) => ({ id: g.id, label: g.label, icon: g.icon })),
];

// 风险等级（仅 admin 设定）
export const RISK_LEVELS = [
  { id: "low",      label: "低风险", color: "#C98A4B", bg: "#F7E6D2", pin: "#F2B279" },
  { id: "medium",   label: "中风险", color: "#C0612A", bg: "#FBE6D4", pin: "#E68645" },
  { id: "high",     label: "高风险", color: "#C0392B", bg: "#FBDAD7", pin: "#E0552A" },
  { id: "critical", label: "高危",   color: "#fff",    bg: "#C0392B", pin: "#C0392B" },
];
export function riskInfo(id) {
  return RISK_LEVELS.find((r) => r.id === id) || { id: "medium", label: "中风险", color: "#C0612A", bg: "#FBE6D4", pin: "#E68645" };
}

/* 用户号脱敏：纯数字 944669285→944****285；其它(uuid)→前4+****+后4 */
export function maskUserId(id) {
  if (!id) return "用户";
  const s = String(id);
  if (/^\d+$/.test(s)) {
    if (s.length <= 6) return s;
    return `${s.slice(0, 3)}****${s.slice(-3)}`;
  }
  const clean = s.replace(/-/g, "");
  if (clean.length <= 8) return clean;
  return `${clean.slice(0, 4)}****${clean.slice(-4)}`;
}

/* 上报者展示文案（匿名 → 匿名用户；否则脱敏号）。绝不暴露头像/昵称/主页。 */
export function reporterLabel(report) {
  if (!report) return "匿名用户";
  if (report.anonymous) return "匿名用户";
  return `用户 ${maskUserId(report.reporter_user_id)}`;
}

/* haversine 距离（米） */
export function distanceMeters(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)));
}

/* 相对时间 */
export function fmtAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}天前` : new Date(iso).toLocaleDateString("zh-CN");
}
