/**
 * services/facilityMock.js
 *
 * 「宠物设施地图」分类（用于真实 POI 过滤）。
 * 真实 POI 由 services/amapService 提供；本文件只保留分类定义。
 * （合作商户 mock 已下线）
 */

export const FRIENDLY_CATEGORIES = [
  { id: "all",      label: "全部",      icon: "🐾", poiTest: () => true },
  { id: "hospital", label: "医院/诊所", icon: "🏥", poiTest: (p) => /医院|诊所|兽医/.test(p.name) },
  { id: "shop",     label: "食品/用品", icon: "🛍️", poiTest: (p) => /食品|用品|宠物店|超市|狗粮|猫粮/.test(p.name) },
  { id: "grooming", label: "美容/寄养", icon: "✂️", poiTest: (p) => /美容|寄养|洗澡|spa/i.test(p.name) },
  { id: "park",     label: "公园/可遛弯", icon: "🌳", poiTest: (p) => /公园|绿地|广场|湿地|郊野/.test(p.name) },
];
