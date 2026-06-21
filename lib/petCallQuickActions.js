/**
 * lib/petCallQuickActions.js
 *
 * 【AI 宠物来电】通话中页面的「快捷按钮」mapping —— 按 call_type 动态返回按钮数组。
 * 不把按钮逻辑写进 JSX；通话页只渲染本文件返回的数组，点击后由 PetCallCenter 执行 action。
 *
 * 按钮结构：
 *   { key, label, type:'primary'|'secondary'|'success'|'danger', action, replyText, petReply }
 *     replyText 点击后显示的「用户气泡」；petReply 紧接着的「宠物气泡」（无则不显示宠物回复）。
 *
 * action 取值（由 PetCallCenter.handleAction 执行，复用现有业务/页面，不重建）：
 *   confirm_medicine | go_medicine | confirm_feeding | go_feeding |
 *   go_walk | go_walk_nearby | open_chat | go_card |
 *   save_memory_done | save_memory_pending | snooze | dismiss | end_call | continue
 */

/* call_type（含别名）→ 场景分组 */
function groupOf(callType) {
  switch (callType) {
    case "medicine_due": case "medicine_overdue":
    case "medication_due": case "medication_overdue":
      return "medicine";
    case "feeding_overdue_short": case "feeding_overdue_long": case "feeding_due":
      return "feeding";
    case "walk_time_soon": case "walk_time_overdue": case "walk_reminder":
      return "walk";
    case "miss_you": case "long_time_no_open": case "miss_owner":
      return "miss_you";
    case "emotion_comfort": case "emotional_support": case "mood_support":
    case "sad_support": case "stress_support":
      return "emotion";
    case "bedtime": case "sleep_companion": case "goodnight":
      return "sleep";
    case "anniversary": case "birthday": case "adoption_day":
      return "anniversary";
    case "memory_followup": case "ai_memory_followup":
      return "memory";
    default:
      return "default";
  }
}

const QUICK_ACTIONS = {
  /* 用药提醒 */
  medicine: [
    { key: "done",   label: "已经喂过啦", type: "success",   action: "confirm_medicine", replyText: "已经喂过啦，乖乖休息吧", petReply: "谢谢主人照顾我，我感觉安心多啦～" },
    { key: "go",     label: "现在去喂药", type: "primary",   action: "go_medicine",      replyText: "我现在去喂药",       petReply: "好呀，我乖乖等你～" },
    { key: "snooze", label: "稍后提醒我", type: "secondary", action: "snooze",           replyText: "稍后提醒我",         petReply: "那主人别忘啦，我会乖乖等你～" },
    { key: "end",    label: "先挂了",     type: "danger",    action: "end_call",         replyText: "先挂了" },
  ],
  /* 喂食提醒 */
  feeding: [
    { key: "done",   label: "已经喂过啦", type: "success",   action: "confirm_feeding", replyText: "已经喂过啦",   petReply: "嘿嘿，饭饭真香，谢谢主人～" },
    { key: "go",     label: "现在去喂食", type: "primary",   action: "go_feeding",      replyText: "我现在去喂食", petReply: "好耶！我已经准备好吃饭饭啦～" },
    { key: "snooze", label: "稍后提醒我", type: "secondary", action: "snooze",          replyText: "稍后提醒我",   petReply: "好的，我再等等你～" },
    { key: "end",    label: "先挂了",     type: "danger",    action: "end_call",        replyText: "先挂了" },
  ],
  /* 遛弯提醒 */
  walk: [
    { key: "go",     label: "现在去遛弯",   type: "primary",   action: "go_walk",        replyText: "现在去遛弯",   petReply: "好耶！我已经准备好摇尾巴啦～" },
    { key: "nearby", label: "查看附近伙伴", type: "secondary", action: "go_walk_nearby", replyText: "看看附近伙伴", petReply: "说不定今天能遇到新朋友哦～" },
    { key: "skip",   label: "今天不去啦",   type: "secondary", action: "dismiss",        replyText: "今天不去啦",   petReply: "好吧，那我们在家也要开心哦～" },
    { key: "snooze", label: "稍后提醒我",   type: "secondary", action: "snooze",         replyText: "稍后提醒我",   petReply: "好的，我等你准备好～" },
  ],
  /* 想你来电 */
  miss_you: [
    { key: "miss",  label: "我也想你",   type: "primary",   action: "continue",  replyText: "我也想你",   petReply: "嘿嘿，那你要多来看看我哦～" },
    { key: "chat",  label: "陪我聊聊",   type: "secondary", action: "open_chat", replyText: "陪我聊聊",   petReply: "好呀，我一直都在这里陪你～" },
    { key: "later", label: "晚点再找你", type: "secondary", action: "snooze",    replyText: "晚点再找你", petReply: "那我乖乖等你回来～" },
    { key: "end",   label: "先挂了",     type: "danger",    action: "end_call",  replyText: "先挂了" },
  ],
  /* 情绪陪伴 */
  emotion: [
    { key: "tired", label: "我有点累", type: "secondary", action: "continue",  replyText: "我有点累", petReply: "今天辛苦啦，不用一直很坚强，我陪你一会儿。" },
    { key: "chat",  label: "陪我聊聊", type: "secondary", action: "open_chat", replyText: "陪我聊聊", petReply: "好呀，你慢慢说，我认真听着呢。" },
    { key: "cheer", label: "给我打气", type: "primary",   action: "continue",  replyText: "给我打气", petReply: "你已经做得很好啦，明天也会一点点变好的。" },
    { key: "end",   label: "先挂了",   type: "danger",    action: "end_call",  replyText: "先挂了" },
  ],
  /* 睡前陪伴 */
  sleep: [
    { key: "night",    label: "陪我晚安",   type: "primary",   action: "continue", replyText: "陪我晚安",   petReply: "晚安主人，今天辛苦啦，我会在梦里陪着你。" },
    { key: "awake",    label: "我还不困",   type: "secondary", action: "continue", replyText: "我还不困",   petReply: "那也要早点休息哦，我陪你安静一会儿。" },
    { key: "tomorrow", label: "明天提醒我", type: "secondary", action: "snooze",   replyText: "明天提醒我", petReply: "好的，那明天这个时候我再来陪你～" },
    { key: "end",      label: "先挂了",     type: "danger",    action: "end_call", replyText: "先挂了" },
  ],
  /* 纪念日来电 */
  anniversary: [
    { key: "card",  label: "生成纪念卡", type: "primary",   action: "go_card",  replyText: "生成纪念卡", petReply: "我们今天也要留下一个可爱的回忆～" },
    { key: "happy", label: "我也很开心", type: "secondary", action: "continue", replyText: "我也很开心", petReply: "谢谢你一直陪着我，你是我最重要的人。" },
    { key: "share", label: "分享给朋友", type: "secondary", action: "go_card",  replyText: "分享给朋友", petReply: "快把我们的快乐分享出去吧～" },
    { key: "end",   label: "先挂了",     type: "danger",    action: "end_call", replyText: "先挂了" },
  ],
  /* AI 记忆回访 */
  memory: [
    { key: "done",    label: "办完啦",   type: "success",   action: "save_memory_done",    replyText: "办完啦",   petReply: "太好啦！不管结果怎么样，你都已经很棒了～" },
    { key: "pending", label: "还没呢",   type: "secondary", action: "save_memory_pending", replyText: "还没呢",   petReply: "没关系，我陪你慢慢来，别太着急。" },
    { key: "nervous", label: "有点紧张", type: "secondary", action: "continue",            replyText: "有点紧张", petReply: "深呼吸一下，我会在这里给你加油。" },
    { key: "chat",    label: "跟你说说", type: "secondary", action: "open_chat",           replyText: "跟你说说", petReply: "好呀，你慢慢说，我都听着呢。" },
  ],
  /* 兜底（未知 call_type） */
  default: [
    { key: "miss",  label: "我也想你", type: "primary",   action: "continue",  replyText: "我也想你", petReply: "嘿嘿，有你在我就很开心啦～" },
    { key: "chat",  label: "陪我聊聊", type: "secondary", action: "open_chat", replyText: "陪我聊聊", petReply: "好呀，我一直都在这里陪你～" },
    { key: "tired", label: "今天很累", type: "secondary", action: "continue",  replyText: "今天很累", petReply: "辛苦啦，靠在我身边歇一会儿吧。" },
    { key: "end",   label: "先挂了",   type: "danger",    action: "end_call",  replyText: "先挂了" },
  ],
};

/** 按 call_type 返回该场景的快捷按钮数组（未知 → 兜底）。 */
export function getPetCallQuickActions(callType) {
  return QUICK_ACTIONS[groupOf(callType)] || QUICK_ACTIONS.default;
}
