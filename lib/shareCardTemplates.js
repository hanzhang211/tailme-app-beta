/**
 * lib/shareCardTemplates.js
 *
 * 分享卡片模板配置（只做模板/展示，不含触发逻辑）。
 * 4 种类型：today-companion / feeding-complete / vaccine-complete / recovery
 *
 * 每种把【标题 / 状态文案 / 主文案 / 底部小字 / 主题配色 / 图标 / 装饰元素】全部拆成配置，
 * 方便后续单独改文案、调色；宠物主角图由组件以 petImage/petName/petType 注入、后续可替换成专属形象。
 * mainText / statText 支持 {name} {days} 占位（用 resolveText 渲染）。
 */
import { Heart, PawPrint, Star, Sparkles, Bone, ShieldCheck, Leaf, Sun, Utensils } from "lucide-react";

export const SHARE_CARD_TYPES = [
  {
    id: "today-companion",
    label: "今日陪伴卡",
    title: "今日陪伴卡",
    statText: "陪伴第 {days} 天",
    mainText: "{name}已经陪伴我 {days} 天",
    footer: "今天也有好好爱你 ❤",
    Icon: Heart,
    decos: ["heart", "paw", "star", "heart"],
    theme: {
      bg: "linear-gradient(165deg,#FFF6EC 0%,#FCE6CE 52%,#F7D3B0 100%)",
      accent: "#E68645", deep: "#C25E1C", sub: "#9A6E4A",
      badge: "#FFEAD6", deco: "#EFAE78", stage: "rgba(255,255,255,0.55)",
    },
  },
  {
    id: "feeding-complete",
    label: "喂食完成卡",
    title: "喂食完成卡",
    statText: "今日喂食 已完成 ✓",
    mainText: "今天的饭饭已经认真吃完啦",
    footer: "肚子饱饱，心情也好好",
    Icon: Utensils,
    decos: ["bone", "heart", "sparkle", "paw"],
    theme: {
      bg: "linear-gradient(165deg,#FFFBEA 0%,#FBEFC8 52%,#F4DEA2 100%)",
      accent: "#D89A2C", deep: "#9A7017", sub: "#8C7434",
      badge: "#FBEFC8", deco: "#E3C977", stage: "rgba(255,255,255,0.60)",
    },
  },
  {
    id: "vaccine-complete",
    label: "疫苗完成卡",
    title: "疫苗完成卡",
    statText: "疫苗接种 已完成 ✓",
    mainText: "已完成狂犬疫苗 + 犬核心疫苗 2 针",
    footer: "勇敢的小朋友，继续健康长大吧",
    Icon: ShieldCheck,
    decos: ["shield", "leaf", "star", "sparkle"],
    theme: {
      // 薄荷绿 —— 安心、健康
      bg: "linear-gradient(165deg,#F1FBF2 0%,#D8F0DB 52%,#BAE6C3 100%)",
      accent: "#52A86A", deep: "#3E8E58", sub: "#5C7E63",
      badge: "#DAF0DC", deco: "#A1D4AB", stage: "rgba(255,255,255,0.60)",
    },
  },
  {
    id: "recovery",
    label: "康复卡",
    title: "康复卡",
    statText: "已康复 ✓",
    mainText: "这次的小感冒已经康复啦",
    footer: "恢复元气，继续快乐摇尾巴",
    Icon: Leaf,
    decos: ["leaf", "sun", "heart", "sparkle"],
    theme: {
      // 鼠尾草绿 —— 放松、恢复
      bg: "linear-gradient(165deg,#F5F9F0 0%,#E3EFD7 52%,#CCE3BC 100%)",
      accent: "#6FAE76", deep: "#4E8E5A", sub: "#5F8567",
      badge: "#E6F1DC", deco: "#AED4A6", stage: "rgba(255,255,255,0.58)",
    },
  },
];

/** 装饰元素 key → 图标组件 */
export const DECO_ICONS = { heart: Heart, paw: PawPrint, star: Star, sparkle: Sparkles, bone: Bone, shield: ShieldCheck, leaf: Leaf, sun: Sun };

/** 渲染 {name}{days} 占位 */
export function resolveText(tpl, { name, days }) {
  return String(tpl || "").replace(/\{name\}/g, name).replace(/\{days\}/g, days);
}
