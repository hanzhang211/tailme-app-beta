/**
 * lib/petCallTemplates.js
 *
 * 【AI 宠物来电】第一版的固定话术 / 配置常量。
 *
 * ⚠️ 这是后续接入「AI 生成话术 / TTS 语音」的唯一替换点：
 *   - 第一版：宠物开场白与对话推进，全部从下面 flow 数组按顺序取（本地模板）。
 *   - 后续：把 getOpeningLine / getNextLine 换成 async，内部改调 /api/pet-ai-chat
 *     （注入宠物性格 + 历史消息 + 来电风格），调用方（usePetCall）无需改动。
 *
 * 图标用 lucide 组件引用（非 JSX，仅引用），由 CallTypeSelector / 各屏直接渲染。
 */

import { PhoneCall, MoonStar, Utensils, Pill, Heart, Gift, Brain } from "lucide-react";

/* ── 6 种来电类型（id 与数据库 call_type 一致）──────────────────
   每种：图标 / 标题 / 副文案 / 主题色 / flow（宠物依次会说的话）。
   ─────────────────────────────────────────────────────────── */
export const CALL_TYPES = [
  {
    id: "miss_you", label: "想你来电", sub: "想你时给你打电话",
    Icon: PhoneCall, tint: "#E68645",
    flow: [
      "主人～我想你啦！你今天过得怎么样呀？",
      "你今天有没有按时吃饭呀？我可担心你了！",
      "真棒！那要记得多喝水，不要太晚睡哦～",
      "因为你是我最重要的主人呀！我会一直一直陪着你哦 💕",
    ],
  },
  {
    id: "sleep", label: "睡前陪伴", sub: "睡前陪你聊天",
    Icon: MoonStar, tint: "#8C7BD0",
    flow: [
      "主人，该休息啦，今天也辛苦你啦。",
      "把手机放下，闭上眼睛，我陪你一起放松一下～",
      "梦里也要梦到我哦，晚安，我最爱的主人 🌙",
    ],
  },
  {
    id: "feeding", label: "喂食提醒", sub: "饭饭时间到啦",
    Icon: Utensils, tint: "#CE9A33",
    flow: [
      "饭饭时间到啦，我肚子咕咕叫啦～",
      "记得给我准备好吃的，也别忘了你自己吃饭哦！",
      "一起好好吃饭，才有力气抱抱呀 🍚",
    ],
  },
  {
    id: "medication", label: "用药提醒", sub: "提醒你照顾我",
    Icon: Pill, tint: "#3FB984",
    flow: [
      "该吃药啦，记得好好照顾我哦。",
      "乖乖吃药才能快点好起来，我会一直陪着你～",
      "你也要照顾好自己呀，我们都要健健康康的 💊",
    ],
  },
  {
    id: "emotion", label: "情绪陪伴", sub: "安慰你，陪着你",
    Icon: Heart, tint: "#E07A9B",
    flow: [
      "主人，你今天是不是有点累呀？我能感觉到呢。",
      "没关系的，把烦恼说给我听，我一直都在。",
      "抱抱你，不管发生什么，我都会陪着你哦 🧡",
    ],
  },
  {
    id: "anniversary", label: "纪念日来电", sub: "特别的日子",
    Icon: Gift, tint: "#D9728A",
    flow: [
      "主人，今天是我们的特别日子呀！",
      "谢谢你把我带回家，给我这么多的爱。",
      "以后的每一天，也要一直一直在一起哦 🎂",
    ],
  },
  {
    id: "memory_followup", label: "AI 记忆回访", sub: "晚点关心你办得怎么样",
    Icon: Brain, tint: "#7AA6E0",
    flow: [
      "主人，你刚刚说要去办事情，现在办完了吗？我一直等你告诉我呢。",
      "辛苦啦！不管顺不顺利，我都为你骄傲～",
      "记得早点休息哦，我会一直在这里陪着你 🧡",
    ],
  },
];

/* ── 7 个来电场景（设置页开关；id 与 CALL_TYPES / scenes 字段一致）────────
   用户只开关场景，不再手动选风格/声音；情绪与叫声由 lib/petCallEmotionMap 自动匹配。 */
export const CALL_SCENES = [
  { id: "miss_you",        label: "想你来电",    desc: "太久没打开 App 时，宠物会主动找你",        Icon: PhoneCall },
  { id: "sleep",           label: "睡前陪伴",    desc: "睡前用温柔的声音陪你",                    Icon: MoonStar },
  { id: "feeding",         label: "喂食提醒",    desc: "饭饭时间到了或超时后提醒你",              Icon: Utensils },
  { id: "medication",      label: "用药提醒",    desc: "该吃药时提醒你照顾它",                    Icon: Pill },
  { id: "emotion",         label: "情绪陪伴",    desc: "当你说自己难过或压力大时，宠物会关心你",  Icon: Heart },
  { id: "anniversary",     label: "纪念日来电",  desc: "生日、领养纪念日等特别日子主动来电",      Icon: Gift },
  { id: "memory_followup", label: "AI 记忆回访", desc: "你在聊天里提到要做的事，宠物会晚点关心你办得怎么样", Icon: Brain },
];

/* 场景开关默认值（新用户全部开启）。 */
export const DEFAULT_SCENES = {
  miss_you: true, sleep: true, feeding: true, medication: true,
  emotion: true, anniversary: true, memory_followup: true,
};

/* 通话中的快捷回复（第一版固定四个；end=true 的会触发挂断）。
   第一版点任意非 end 回复 → 宠物推进到 flow 下一句，对话连贯。 */
export const QUICK_REPLIES = [
  { id: "miss", text: "我也想你" },
  { id: "tired", text: "今天很累" },
  { id: "chat", text: "陪我聊聊" },
  { id: "bye", text: "先挂了", end: true },
];

/* 来电风格（chip）/ 声音 / 重复规则。第一版仅作设置项保存，声音为 UI 占位。 */
export const CALL_STYLES = [
  { id: "coquettish", label: "撒娇" },
  { id: "gentle", label: "温柔" },
  { id: "funny", label: "搞笑" },
  { id: "encourage", label: "鼓励" },
];

export const VOICE_TYPES = [
  { id: "cute_female", label: "可爱女声" },
  { id: "gentle_female", label: "温柔声音" },
];

export const REPEAT_RULES = [
  { id: "daily", label: "每天" },
  { id: "weekly", label: "每周" },
  { id: "once", label: "仅一次" },
];

/* ── helpers ────────────────────────────────────────────────── */
export function getCallType(id) {
  return CALL_TYPES.find((t) => t.id === id) || CALL_TYPES[0];
}
export function callTypeLabel(id) {
  return getCallType(id).label;
}
export function styleLabel(id) {
  return (CALL_STYLES.find((s) => s.id === id) || CALL_STYLES[0]).label;
}
export function voiceLabel(id) {
  return (VOICE_TYPES.find((v) => v.id === id) || VOICE_TYPES[0]).label;
}
export function repeatLabel(id) {
  return (REPEAT_RULES.find((r) => r.id === id) || REPEAT_RULES[0]).label;
}

/** 宠物开场白（第一版：flow[0]）。后续可换成 async AI 生成。 */
export function getOpeningLine(typeId /*, style, pet */) {
  return getCallType(typeId).flow[0];
}
/** 宠物对话推进到第 step 句（越界则停在最后一句）。后续可换成 async AI 回复。 */
export function getNextLine(typeId, step) {
  const flow = getCallType(typeId).flow;
  return flow[Math.min(Math.max(step, 0), flow.length - 1)];
}
