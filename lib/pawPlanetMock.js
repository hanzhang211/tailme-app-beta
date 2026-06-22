/**
 * lib/pawPlanetMock.js
 *
 * 「爪爪星球」第一版的 mock 数据 + 主题色常量。
 *
 * ⚠️ 第一版全部为 mock（结构对齐规划中的 Supabase 表，方便后续直接接真实数据）：
 *   today    → memorial_daily_stories（今日动态）
 *   letters  → memorial_letters（星球信箱）
 *   memories → memorial_memories（回忆相册）
 *   timeline → memorial_timeline（回忆时间线）
 *   story    → 星球故事叙事文案
 * 图片暂无素材，image_url 留 null，组件用柔和占位块；后续填真实 URL 即可。
 */

/* 爪爪星球主题色（夜空紫蓝 + 奶油暖橙），各组件统一引用 */
export const PLANET_C = {
  night1: "#2D3163", night2: "#5F5A9D", night3: "#8E84C8",
  cloud: "#F7DCCF", cream: "#FFF8F3", pri: "#E68645", deep: "#C25E1C",
  card: "#F6E3D1", brown: "#CFA27A", text: "#2B211D", sub: "#8A7E70", border: "#EFE0CE",
  cardPurple1: "#3A3E7A", cardPurple2: "#6E69B0",
};

export const GALLERY_CATEGORIES = ["全部", "日常", "生日", "旅行", "最爱"];

export const MEMORIAL_CARD_LINES = [
  "谢谢你来过我的生命里",
  "你永远是我最重要的小宝贝",
  "有你的每一天，都闪闪发光",
  "在爪爪星球，我也会一直想你",
];

/** 按宠物名生成 mock（文案带上名字，更有陪伴感） */
export function buildPlanetMock(name = "毛孩子") {
  return {
    today: {
      summary: "今天状态很好哦",
      items: [
        { time: "09:20", phase: "morning", text: `${name}在小山坡上晒太阳，温暖的阳光真舒服呀～` },
        { time: "14:10", phase: "noon", text: "和新朋友多多一起玩小球，跑得可开心啦！" },
        { time: "20:30", phase: "night", text: `玩累了，回到小窝睡着啦，晚安${name}～` },
      ],
    },
    story: [
      `${name}已经在爪爪星球住下啦。`,
      "那是一个温柔的小星球，有软软的云、绿绿的草地，还有一座刚好属于它的小房子。",
      "白天它在山坡上晒太阳，和新认识的朋友追着小球跑；累了就回到小窝里，安安稳稳地睡上一觉。",
      "它在这里过得很好，也一直被好好爱着。想它的时候，就来爪爪星球看看它吧。",
    ],
  };
}
