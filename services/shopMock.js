/**
 * services/shopMock.js
 *
 * 商城的「静态常量」：色调 / 分类 / 收货地址 / 工具函数。
 *
 * ⚠️ 商品与店铺数据已迁移到真实 Supabase：见 services/shopService.js +
 *    components/shop/ShopDataContext.jsx（只展示 status='approved' 且店铺也 approved 的商品）。
 *    本文件不再保留 mock 的 PRODUCTS / STORES / REVIEWS。
 *    ADDRESSES 暂留作下单流程占位（尚无真实地址表）。
 */

// 渐变色调（全部暖色奶油系，贴合 TailMe 风格）
export const TONES = {
  cream: ["#FBEAD0", "#F1D4A8"],
  peach: ["#FBE3DA", "#F4CDBE"],
  sage:  ["#E9EEDD", "#D9E2C6"],
  latte: ["#F0E6D8", "#E2D2BC"],
  rose:  ["#F7E0DE", "#EFC9C6"],
  sky:   ["#E6ECEF", "#D5E0E6"],
};

export const CATEGORIES = [
  { id: "all",     name: "全部",   emoji: "🐾" },
  { id: "dogfood", name: "狗粮",   emoji: "🦴" },
  { id: "catfood", name: "猫粮",   emoji: "🐟" },
  { id: "snack",   name: "零食",   emoji: "🍖" },
  { id: "feeder",  name: "喂食器", emoji: "🍽️" },
  { id: "waterer", name: "饮水器", emoji: "💧" },
  { id: "litter",  name: "猫砂尿垫", emoji: "🪣" },
  { id: "toy",     name: "玩具",   emoji: "🧸" },
  { id: "leash",   name: "牵引绳", emoji: "🦮" },
  { id: "clean",   name: "清洁护理", emoji: "🧴" },
  { id: "deworm",  name: "驱虫药", emoji: "💊" },
  { id: "health",  name: "保健品", emoji: "🌿" },
  { id: "travel",  name: "出行用品", emoji: "🎒" },
];

// 商城首页固定 2×5 宫格分类（顺序严格按设计稿；key 用于匹配 SVG 图标）
export const GRID_CATEGORIES = [
  { id: "dogfood", name: "狗粮",   key: "dogfood" },
  { id: "catfood", name: "猫粮",   key: "catfood" },
  { id: "snack",   name: "零食",   key: "snack" },
  { id: "feeder",  name: "喂食器", key: "feeder" },
  { id: "deworm",  name: "驱虫药", key: "deworm" },
  { id: "leash",   name: "牵引绳", key: "leash" },
  { id: "toy",     name: "玩具",   key: "toy" },
  { id: "clean",   name: "清洁护理", key: "clean" },
  { id: "health",  name: "保健品", key: "health" },
  { id: "litter",  name: "猫砂",   key: "litter" },
];

// 收货地址（mock）
export const ADDRESSES = [
  { id: "a1", name: "小可爱", phone: "188****8888", tag: "家",
    addr: "广东省深圳市南山区科技园北区 xx 栋 xx 室", isDefault: true },
  { id: "a2", name: "宠友",   phone: "139****1234", tag: "公司",
    addr: "广东省广州市天河区天河路 xx 号 xx 座" },
  { id: "a3", name: "麻麻",   phone: "0755-12345678", tag: "学校",
    addr: "广东省深圳市福田区莲花街道 xx 中心 xx 楼" },
];
export function fmtSold(n) {
  if (n >= 10000) return `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)}万+`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k+`;
  return `${n}`;
}
