/**
 * services/facilityMock.js
 *
 * 「宠物设施地图 · 友好地图」的辅助数据：
 *  - FRIENDLY_CATEGORIES：友好模式分类（含真实 POI 过滤用的 poiTest + 合作商户标记）
 *  - PARTNER_MERCHANTS：合作商户 mock（突出「提供水碗 / 喂食碗 / 可进店」友好服务）
 *
 * 说明：真实 POI 仍由 services/amapService 提供（不破坏现有能力）；
 *      合作商户是平台合作的友好商家，mock 阶段用本文件，后续可接 Supabase。
 *      坐标用「相对当前定位的偏移」offset:[dLng,dLat]，渲染时叠加用户定位 → 始终出现在地图可视范围内。
 */

export const FRIENDLY_CATEGORIES = [
  { id: "all",      label: "全部",      icon: "🐾", poiTest: () => true },
  { id: "partner",  label: "合作商户",  icon: "🤝", partner: true, poiTest: () => false },
  { id: "hospital", label: "医院/诊所", icon: "🏥", poiTest: (p) => /医院|诊所|兽医/.test(p.name) },
  { id: "shop",     label: "食品/用品", icon: "🛍️", poiTest: (p) => /食品|用品|宠物店|超市|狗粮|猫粮/.test(p.name) },
  { id: "grooming", label: "美容/寄养", icon: "✂️", poiTest: (p) => /美容|寄养|洗澡|spa/i.test(p.name) },
  { id: "park",     label: "公园/可遛弯", icon: "🌳", poiTest: (p) => /公园|绿地|广场|湿地|郊野/.test(p.name) },
];

export const PARTNER_MERCHANTS = [
  { id: "pm1", name: "暖爪咖啡（富阳店）", rating: 4.8, category: "宠物友好咖啡店",
    address: "富春街道文教路 88 号", cover: "☕", services: ["可进店", "水碗", "喂食碗"],
    offset: [0.0042, 0.0018], distance: 68 },
  { id: "pm2", name: "毛球宠物生活馆", rating: 4.6, category: "宠物用品店",
    address: "金桥北路 123 号", cover: "🐾", services: ["水碗", "喂食碗"],
    offset: [-0.0050, 0.0030], distance: 176 },
  { id: "pm3", name: "喵汪友好诊所", rating: 4.9, category: "宠物诊所",
    address: "体育馆路 9 号", cover: "🏥", services: ["可进店", "水碗"],
    offset: [0.0061, -0.0040], distance: 240 },
  { id: "pm4", name: "爪爪宠物美容", rating: 4.7, category: "宠物美容/寄养",
    address: "春江路 56 号", cover: "✂️", services: ["可进店", "水碗"],
    offset: [-0.0032, -0.0026], distance: 312 },
];

// 合作商户仅在「全部」「合作商户」分类下展示
export function listPartners(catId) {
  return catId === "all" || catId === "partner" ? PARTNER_MERCHANTS : [];
}
