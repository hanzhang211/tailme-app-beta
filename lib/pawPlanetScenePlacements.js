/**
 * lib/pawPlanetScenePlacements.js
 *
 * 爪爪星球「场景背景 + 当前宠物主角图叠加」的前端合成配置（纯展示，不接 AI 生成）。
 * 背景直接用现有 public/planet_<key>_card.jpg（已确认的场景图），宠物按 petPlacement 叠加。
 *
 * 每个场景：
 *   sceneKey / title
 *   backgroundImage   场景背景图（缺失/失败 → fallbackGradient）
 *   fallbackGradient  兜底渐变
 *   petPlacement: { x, y(锚点%), scale(宠物宽占卡片宽%), translateX/Y(px 微调), zIndex }
 *
 * 调整宠物位置：只改本文件对应场景的 petPlacement。
 */

export const PAW_PLANET_SCENE_PLACEMENTS = {
  album: {
    sceneKey: "album",
    title: "回忆相册",
    backgroundImage: "/planet_album_card.jpg",
    fallbackGradient: "linear-gradient(160deg,#FBE7D6 0%,#F3C9A8 100%)",
    // 右侧、横向中线，再放大
    petPlacement: { x: "80%", y: "50%", scale: "32%", translateX: 0, translateY: 0, zIndex: 2 },
  },
  anniversary: {
    sceneKey: "anniversary",
    title: "特别纪念日",
    backgroundImage: "/planet_anniversary_card.jpg",
    fallbackGradient: "linear-gradient(160deg,#FCE2E6 0%,#F4C0CE 100%)",
    petPlacement: { x: "64%", y: "62%", scale: "33%", translateX: 0, translateY: 0, zIndex: 2 },
  },
  friends: {
    sceneKey: "friends",
    title: "交朋友",
    backgroundImage: "/planet_friends_card.jpg",
    fallbackGradient: "linear-gradient(160deg,#E6F2D9 0%,#C7E3B0 100%)",
    // 夹在两只狗中间，再上移放大
    petPlacement: { x: "49%", y: "48%", scale: "29%", translateX: 0, translateY: 0, zIndex: 2 },
  },
  mailbox: {
    sceneKey: "mailbox",
    title: "星球信箱",
    backgroundImage: "/planet_mailbox_card.jpg",
    fallbackGradient: "linear-gradient(160deg,#E5ECF6 0%,#C9D6EC 100%)",
    petPlacement: { x: "66%", y: "50%", scale: "33%", translateX: 0, translateY: 0, zIndex: 2 },
  },
  play_ball: {
    sceneKey: "play_ball",
    title: "玩小球",
    backgroundImage: "/planet_play_ball_card.jpg",
    fallbackGradient: "linear-gradient(160deg,#E9F3D8 0%,#CDE6AE 100%)",
    // 移到中间，再放大
    petPlacement: { x: "50%", y: "58%", scale: "35%", translateX: 0, translateY: 0, zIndex: 2 },
  },
  sleep_home: {
    sceneKey: "sleep_home",
    title: "小屋睡觉",
    backgroundImage: "/planet_sleep_home_card.jpg",
    fallbackGradient: "linear-gradient(160deg,#ECE7F4 0%,#CDC2E6 100%)",
    // 大小不变，再左移
    petPlacement: { x: "56%", y: "62%", scale: "22%", translateX: 0, translateY: 0, zIndex: 2 },
  },
  snack: {
    sceneKey: "snack",
    title: "吃零食",
    backgroundImage: "/planet_snack_card.jpg",
    fallbackGradient: "linear-gradient(160deg,#FBF3D6 0%,#F2DDA0 100%)",
    // 略上移，再放大
    petPlacement: { x: "64%", y: "54%", scale: "30%", translateX: 0, translateY: 0, zIndex: 2 },
  },
  sunshine: {
    sceneKey: "sunshine",
    title: "晒太阳",
    backgroundImage: "/planet_sunshine_card.jpg",
    fallbackGradient: "linear-gradient(160deg,#FFF3D8 0%,#FBD9A6 100%)",
    // 位置不变，再放大
    petPlacement: { x: "50%", y: "58%", scale: "37%", translateX: 0, translateY: 0, zIndex: 2 },
  },
};

/** 场景顺序（tab / grid 展示用） */
export const PAW_PLANET_SCENE_ORDER = [
  "album", "anniversary", "friends", "mailbox", "play_ball", "sleep_home", "snack", "sunshine",
];

/** 「今日的它」故事类型 → 场景 key（与 storyImage 的图片映射保持一致，含别名） */
const TYPE_TO_SCENE = {
  sunshine: "sunshine", walk_flower: "sunshine",
  wake_up: "sleep_home", sleep_home: "sleep_home", stargazing: "sleep_home", quiet_rest: "sleep_home",
  friends: "friends", explore: "friends",
  play_ball: "play_ball",
  snack: "snack",
  mailbox: "mailbox",
  album: "album",
  anniversary: "anniversary",
};

/** 由故事类型取得场景配置（背景 + 宠物位置）；未知类型回退 sunshine */
export function placementForType(type) {
  return PAW_PLANET_SCENE_PLACEMENTS[TYPE_TO_SCENE[type] || "sunshine"];
}
