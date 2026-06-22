/**
 * lib/pawPlanetScenePlacements.js
 *
 * 爪爪星球「8 张场景背景 + 当前宠物主角图叠加」的前端合成配置（纯展示，不接 AI 生成）。
 *
 * 每个场景：
 *   sceneKey         场景标识（与「今天的它」故事类型一致）
 *   title            中文名
 *   backgroundImage  无主角背景图路径（文件后续放入 public/paw-planet/backgrounds/；不存在时用 fallbackGradient）
 *   fallbackGradient 背景图缺失/加载失败时的主题渐变
 *   petPlacement:
 *     x, y           宠物锚点（相对卡片宽/高的百分比，中心点）
 *     scale          宠物宽度占【卡片宽度】的百分比（最稳、不变形）
 *     translateX/Y   像素级微调（默认 0）
 *     zIndex         叠放层级（背景 0 / 宠物 2 / 文案 3）
 *
 * 调整宠物位置：只改本文件对应场景的 petPlacement，无需动组件。
 * 替换背景图：把同名 png 放进 public/paw-planet/backgrounds/ 即可。
 */

export const PAW_PLANET_SCENE_PLACEMENTS = {
  album: {
    sceneKey: "album",
    title: "回忆相册",
    backgroundImage: "/paw-planet/backgrounds/planet_album_bg.png",
    fallbackGradient: "linear-gradient(160deg,#FBE7D6 0%,#F3C9A8 100%)",
    petPlacement: { x: "68%", y: "52%", scale: "24%", translateX: 0, translateY: 0, zIndex: 2 },
  },
  anniversary: {
    sceneKey: "anniversary",
    title: "特别纪念日",
    backgroundImage: "/paw-planet/backgrounds/planet_anniversary_bg.png",
    fallbackGradient: "linear-gradient(160deg,#FCE2E6 0%,#F4C0CE 100%)",
    petPlacement: { x: "70%", y: "58%", scale: "24%", translateX: 0, translateY: 0, zIndex: 2 },
  },
  friends: {
    sceneKey: "friends",
    title: "交朋友",
    backgroundImage: "/paw-planet/backgrounds/planet_friends_bg.png",
    fallbackGradient: "linear-gradient(160deg,#E6F2D9 0%,#C7E3B0 100%)",
    petPlacement: { x: "50%", y: "58%", scale: "25%", translateX: 0, translateY: 0, zIndex: 2 },
  },
  mailbox: {
    sceneKey: "mailbox",
    title: "星球信箱",
    backgroundImage: "/paw-planet/backgrounds/planet_mailbox_bg.png",
    fallbackGradient: "linear-gradient(160deg,#E5ECF6 0%,#C9D6EC 100%)",
    petPlacement: { x: "70%", y: "58%", scale: "23%", translateX: 0, translateY: 0, zIndex: 2 },
  },
  play_ball: {
    sceneKey: "play_ball",
    title: "玩小球",
    backgroundImage: "/paw-planet/backgrounds/planet_play_ball_bg.png",
    fallbackGradient: "linear-gradient(160deg,#E9F3D8 0%,#CDE6AE 100%)",
    petPlacement: { x: "32%", y: "60%", scale: "25%", translateX: 0, translateY: 0, zIndex: 2 },
  },
  sleep_home: {
    sceneKey: "sleep_home",
    title: "小屋睡觉",
    backgroundImage: "/paw-planet/backgrounds/planet_sleep_home_bg.png",
    fallbackGradient: "linear-gradient(160deg,#ECE7F4 0%,#CDC2E6 100%)",
    petPlacement: { x: "64%", y: "62%", scale: "22%", translateX: 0, translateY: 0, zIndex: 2 },
  },
  snack: {
    sceneKey: "snack",
    title: "吃零食",
    backgroundImage: "/paw-planet/backgrounds/planet_snack_bg.png",
    fallbackGradient: "linear-gradient(160deg,#FBF3D6 0%,#F2DDA0 100%)",
    petPlacement: { x: "64%", y: "58%", scale: "24%", translateX: 0, translateY: 0, zIndex: 2 },
  },
  sunshine: {
    sceneKey: "sunshine",
    title: "晒太阳",
    backgroundImage: "/paw-planet/backgrounds/planet_sunshine_bg.png",
    fallbackGradient: "linear-gradient(160deg,#FFF3D8 0%,#FBD9A6 100%)",
    petPlacement: { x: "50%", y: "58%", scale: "26%", translateX: 0, translateY: 0, zIndex: 2 },
  },
};

/** 场景顺序（tab / grid 展示用） */
export const PAW_PLANET_SCENE_ORDER = [
  "album", "anniversary", "friends", "mailbox", "play_ball", "sleep_home", "snack", "sunshine",
];
