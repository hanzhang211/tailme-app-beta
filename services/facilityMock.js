/**
 * services/facilityMock.js
 *
 * 「宠物设施地图」分类配置。
 * 真实 POI 由 services/amapService 提供；本文件定义分类、关键词、fallback 与命中标签。
 *
 * 每个分类：
 *   id          唯一 id
 *   label       显示名
 *   icon        emoji 小图标
 *   keywords    点击该分类时用于高德多关键词搜索
 *   fallback    结果过少时回退的大类关键词
 *   match       用于给商家卡片打「命中分类标签」的正则（基于 POI 名称/类型）
 */

export const ALL_CATEGORY = { id: "all", label: "全部", icon: "🐾" };

export const PET_CATEGORIES = [
  { id: "bath",      label: "洗澡",    icon: "🚿", keywords: ["宠物洗澡", "宠物洗护", "宠物美容"], fallback: ["宠物服务", "宠物店"], match: /洗澡|洗护|spa/i },
  { id: "neuter",    label: "绝育",    icon: "✂️", keywords: ["宠物绝育", "猫绝育", "狗绝育", "宠物医院 绝育"], fallback: ["宠物医院", "动物医院"], match: /绝育/ },
  { id: "hospital",  label: "医院",    icon: "🏥", keywords: ["宠物医院", "动物医院", "兽医"], match: /医院|动物医院|兽医|诊所/ },
  { id: "vaccine",   label: "疫苗",    icon: "💉", keywords: ["宠物疫苗", "犬猫疫苗", "宠物医院 疫苗"], fallback: ["宠物医院", "动物医院"], match: /疫苗|免疫/ },
  { id: "grooming",  label: "美容",    icon: "💈", keywords: ["宠物美容", "宠物剪毛", "宠物洗护"], fallback: ["宠物服务", "宠物店"], match: /美容|剪毛|造型/ },
  { id: "petting",   label: "撸宠",    icon: "🐾", keywords: ["猫咖", "狗咖", "宠物咖啡", "撸猫馆", "撸狗馆"], match: /猫咖|狗咖|咖啡|撸猫|撸狗/ },
  { id: "buy",       label: "购宠",    icon: "🛒", keywords: ["猫舍", "犬舍", "宠物店", "宠物售卖"], fallback: ["宠物店", "宠物用品"], match: /猫舍|犬舍|售卖|活体/ },
  { id: "checkup",   label: "体检",    icon: "🩺", keywords: ["宠物体检", "宠物医院 体检"], fallback: ["宠物医院", "动物医院"], match: /体检/ },
  { id: "deworm",    label: "驱虫",    icon: "🐛", keywords: ["宠物驱虫", "宠物医院 驱虫"], fallback: ["宠物医院", "动物医院"], match: /驱虫/ },
  { id: "supplies",  label: "食品用品", icon: "🛍️", keywords: ["宠物用品", "宠物食品", "宠物店"], fallback: ["宠物店", "宠物用品"], match: /用品|食品|猫粮|狗粮|宠物店|超市/ },
  { id: "park",      label: "乐园",    icon: "🎡", keywords: ["宠物乐园", "狗狗公园", "宠物公园"], match: /乐园|公园|绿地/ },
  { id: "training",  label: "训练",    icon: "🎯", keywords: ["宠物训练", "训犬", "犬只训练"], match: /训练|训犬/ },
  { id: "boarding",  label: "寄养",    icon: "🏠", keywords: ["宠物寄养", "猫寄养", "狗寄养"], fallback: ["宠物服务", "宠物店"], match: /寄养|托管/ },
  { id: "transport", label: "托运",    icon: "📦", keywords: ["宠物托运", "宠物运输", "宠物出行"], match: /托运|运输/ },
  { id: "photo",     label: "摄影",    icon: "📷", keywords: ["宠物摄影", "宠物写真"], match: /摄影|写真/ },
];

// 默认快捷行（其余收进「全部分类」面板）
export const QUICK_CATEGORY_IDS = ["all", "hospital", "bath", "grooming", "supplies"];

export const CATEGORY_BY_ID = Object.fromEntries(
  [ALL_CATEGORY, ...PET_CATEGORIES].map((c) => [c.id, c])
);

/** 给一个 POI 计算命中的分类标签（最多 max 个，基于名称+类型）。 */
export function matchedCategoryLabels(poi, max = 3) {
  const text = `${poi?.name || ""} ${poi?.type || ""}`;
  const labels = [];
  for (const c of PET_CATEGORIES) {
    if (c.match && c.match.test(text)) {
      labels.push(c.label);
      if (labels.length >= max) break;
    }
  }
  return labels;
}
