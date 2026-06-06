/**
 * services/dangerMock.js
 *
 * 「宠物设施地图 · 避雷地图」的危险提醒数据（mock）。
 * 结构按未来接 Supabase 设计：每条 report 有 status(pending/approved/rejected)，
 * 只有 approved 才在用户端避雷地图展示；pending 进入 admin 审核。
 *
 * 坐标同样用相对当前定位的 offset:[dLng,dLat]，渲染时叠加用户定位。
 *
 * ⚠️ mock 阶段为纯前端内存数据：admin 审核 / 用户上报会修改本模块内的数组，
 *    单次会话内可联动；刷新或跨路由不持久（接 Supabase 后即真实持久）。
 */

// 危险/避雷事件类型（与参考设计一致）
export const DANGER_TYPES = [
  { id: "spook",    label: "宠物受惊",   icon: "😨" },
  { id: "food",     label: "误食风险",   icon: "⚠️" },
  { id: "merchant", label: "不友好商家", icon: "🚫" },
  { id: "vehicle",  label: "车辆危险",   icon: "🚗" },
];

export const DANGER_CATEGORIES = [
  { id: "all", label: "全部", icon: "🐾" },
  ...DANGER_TYPES.map((t) => ({ id: t.id, label: t.label, icon: t.icon })),
];

export const RISK_LEVELS = ["注意", "中风险", "高风险"];
export const RISK_STYLE = {
  "注意":   { color: "#8A8074", bg: "#F1ECE3" },
  "中风险": { color: "#C0612A", bg: "#FBE6D4" },
  "高风险": { color: "#C0392B", bg: "#FBDAD7" },
};

export function dangerType(id) {
  return DANGER_TYPES.find((t) => t.id === id) || { id, label: "其他", icon: "⚠️" };
}

// 已审核通过（展示在用户端避雷地图）
let APPROVED = [
  { id: "d1", typeId: "spook", title: "遛狗惊吓事件", risk: "中风险",
    desc: "有人反映该区域有爆竹惊吓宠物，遛狗请避开或牵引。", address: "富阳国际贸易中心附近",
    offset: [0.0035, 0.0040], distance: 128, ago: "2小时前", reviewed: true, images: [], reporter: "匿名用户" },
  { id: "d2", typeId: "vehicle", title: "车辆快速经过", risk: "中风险",
    desc: "路口有车辆频繁快速经过，存在被撞风险，建议短牵引通过。", address: "富春中学路口",
    offset: [-0.0042, 0.0022], distance: 235, ago: "1天前", reviewed: true, images: [], reporter: "匿名用户" },
  { id: "d3", typeId: "food", title: "绿化带疑似有毒零食", risk: "高风险",
    desc: "绿化带散落不明零食，疑似投毒，请勿让宠物靠近误食。", address: "泰望府小区南侧绿化带",
    offset: [0.0050, -0.0030], distance: 310, ago: "3小时前", reviewed: true, images: [], reporter: "匿名用户" },
  { id: "d4", typeId: "merchant", title: "商家拒绝宠物进入并驱赶", risk: "注意",
    desc: "该店明确拒绝携宠进入且态度恶劣，介意可绕行。", address: "春江路商业街",
    offset: [-0.0028, -0.0035], distance: 188, ago: "5小时前", reviewed: true, images: [], reporter: "匿名用户" },
  { id: "d5", typeId: "spook", title: "流浪犬聚集", risk: "中风险",
    desc: "桥下有流浪犬聚集，小型犬经过请注意。", address: "滨江步道桥下",
    offset: [0.0018, 0.0055], distance: 402, ago: "2天前", reviewed: true, images: [], reporter: "匿名用户" },
];

// 待审核（进入 admin）
let PENDING = [
  { id: "dp1", typeId: "food", title: "路边发现疑似有毒食物", risk: "高风险",
    desc: "人行道边有大量散落火腿肠，颜色发暗，疑似有问题。", address: "文教路与金桥北路交叉口",
    offset: [0.002, 0.001], distance: 90, ago: "刚刚", reviewed: false, images: [], reporter: "用户 138****8866",
    contact: "138****8866", createdAt: Date.now() - 5 * 60 * 1000, status: "pending" },
];

/* ── 用户端查询（仅 approved）─────────────────────────── */
export function listDangerReports(catId = "all") {
  return APPROVED.filter((r) => catId === "all" || r.typeId === catId);
}
export function getDangerReport(id) {
  return APPROVED.find((r) => r.id === id) || PENDING.find((r) => r.id === id) || null;
}

/* ── 用户上报（进入 pending）──────────────────────────── */
export function submitDangerReport(payload) {
  const report = {
    id: "dp" + Date.now(),
    typeId: payload.typeId,
    title: payload.title || dangerType(payload.typeId).label,
    risk: payload.risk || "注意",
    desc: payload.desc || "",
    address: payload.address || "未填写地址",
    offset: payload.offset || [0.001, 0.001],
    distance: payload.distance || 0,
    ago: "刚刚",
    reviewed: false,
    images: payload.images || [],
    reporter: payload.reporter || "匿名用户",
    contact: payload.contact || "",
    createdAt: Date.now(),
    status: "pending",
  };
  PENDING = [report, ...PENDING];
  return report;
}

/* ── Admin 审核（mock 内存操作）───────────────────────── */
export function adminListDanger(status = "pending") {
  if (status === "approved") return APPROVED.map((r) => ({ ...r, status: "approved" }));
  if (status === "all") return [...PENDING, ...APPROVED.map((r) => ({ ...r, status: "approved" }))];
  return PENDING;
}
export function adminReviewDanger(id, action) {
  const idx = PENDING.findIndex((r) => r.id === id);
  if (idx < 0) return;
  const [r] = PENDING.splice(idx, 1);
  if (action === "approve") {
    APPROVED = [{ ...r, status: "approved", reviewed: true, ago: "刚刚" }, ...APPROVED];
  }
  // reject / delete：直接从 pending 移除（reject 可记录，mock 从简）
}

export function fmtRelative(ts) {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  return `${Math.floor(h / 24)}天前`;
}
