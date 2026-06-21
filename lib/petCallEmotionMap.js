/**
 * lib/petCallEmotionMap.js
 *
 * 【AI 宠物来电】场景 → 情绪 → 猫/狗叫声 → 字幕语气 的自动映射。
 *
 * ⚠️ 这是「智能情绪声音」的唯一数据源，UI 只消费、不写死。
 *   - 第一版：字幕用固定模板（subtitle），叫声用约定路径（无文件则静默回退，不报错）。
 *   - 后续：接 AI 识别真实场景（喂食超时分级、记忆回访等）+ TTS，只需扩展本表与触发逻辑。
 *
 * 音频约定路径：public/sounds/dog/*.mp3、public/sounds/cat/*.mp3
 * 第一版项目可能尚无这些素材 —— playPetVoice 会 catch 静默并回退默认 cute sound，
 * 仍缺失则纯字幕，绝不报错、不阻塞通话页。
 */

/* 缺省叫声（找不到具体场景音频时回退） */
export const DEFAULT_SOUNDS = {
  dog: "/sounds/dog/cute-whine.mp3",
  cat: "/sounds/cat/soft-meow.mp3",
};

/* 触发场景（trigger context）→ 情绪 / 叫声 / 字幕语气 / 字幕文案。
   context 比"场景开关"更细（如喂食按超时程度分三档），便于后续真实触发精准匹配。 */
export const CALL_EMOTION_MAP = {
  miss_you: {
    emotion: "happy", dogSound: "/sounds/dog/happy-bark.mp3", catSound: "/sounds/cat/happy-meow.mp3",
    subtitleTone: "想念", subtitle: "主人～我想你啦！你今天过得怎么样呀？",
  },
  bedtime: {
    emotion: "sleepy", dogSound: "/sounds/dog/sleepy.mp3", catSound: "/sounds/cat/purr.mp3",
    subtitleTone: "温柔", subtitle: "今天辛苦啦，该睡觉了，我陪你一起晚安。",
  },
  feeding_soon: {
    emotion: "cute", dogSound: "/sounds/dog/cute-whine.mp3", catSound: "/sounds/cat/soft-meow.mp3",
    subtitleTone: "撒娇", subtitle: "主人～饭饭时间快到啦，我肚子有点咕咕叫。",
  },
  feeding_overdue_short: {
    emotion: "sad", dogSound: "/sounds/dog/whine.mp3", catSound: "/sounds/cat/meow-sad.mp3",
    subtitleTone: "委屈", subtitle: "主人，你是不是忘记我的饭饭啦？我等了好久哦。",
  },
  feeding_overdue_long: {
    emotion: "angry_cute", dogSound: "/sounds/dog/short-bark.mp3", catSound: "/sounds/cat/annoyed-meow.mp3",
    subtitleTone: "小生气", subtitle: "哼，我真的有点小生气啦，不过你现在来喂我，我还是会原谅你。",
  },
  medicine_due: {
    emotion: "caring", dogSound: "/sounds/dog/soft-bark.mp3", catSound: "/sounds/cat/soft-meow.mp3",
    subtitleTone: "提醒", subtitle: "该吃药啦，记得照顾我哦。",
  },
  medicine_overdue: {
    emotion: "worried", dogSound: "/sounds/dog/urgent-bark.mp3", catSound: "/sounds/cat/urgent-meow.mp3",
    subtitleTone: "着急", subtitle: "药药时间已经过啦，我有点担心，主人快来看看我。",
  },
  emotion_comfort: {
    emotion: "caring", dogSound: "/sounds/dog/gentle-whine.mp3", catSound: "/sounds/cat/purr.mp3",
    subtitleTone: "安慰", subtitle: "你今天是不是有点累？我陪你一会儿，不要一个人难过。",
  },
  memory_followup: {
    emotion: "caring", dogSound: "/sounds/dog/gentle-whine.mp3", catSound: "/sounds/cat/purr.mp3",
    subtitleTone: "关心", subtitle: "主人，你刚刚说要去办事情，现在办完了吗？我一直等你告诉我呢。",
  },
  anniversary: {
    emotion: "happy", dogSound: "/sounds/dog/happy-bark.mp3", catSound: "/sounds/cat/happy-meow.mp3",
    subtitleTone: "开心", subtitle: "今天是我们的特别日子，谢谢你一直陪着我。",
  },
  walk_time_soon: {
    emotion: "excited", dogSound: "/sounds/dog/happy-bark.mp3", catSound: "/sounds/cat/curious-meow.mp3",
    subtitleTone: "期待", subtitle: "主人，快到我们遛弯时间啦，要不要准备出门？",
  },
  walk_time_overdue: {
    emotion: "excited_waiting", dogSound: "/sounds/dog/happy-whine.mp3", catSound: "/sounds/cat/soft-meow.mp3",
    subtitleTone: "期待", subtitle: "主人，今天还去遛弯吗？我已经准备好摇尾巴啦。",
  },
  sick_care_checkin: {
    emotion: "caring", dogSound: "/sounds/dog/gentle-whine.mp3", catSound: "/sounds/cat/purr.mp3",
    subtitleTone: "关心", subtitle: "主人，我今天还需要你多照顾一下哦。",
  },
  sick_care_thanks: {
    emotion: "happy", dogSound: "/sounds/dog/happy-bark.mp3", catSound: "/sounds/cat/purr.mp3",
    subtitleTone: "安心", subtitle: "谢谢你今天照顾我，我感觉安心多啦。",
  },
};

/* 场景开关 id → 默认触发 context（第一版「立即体验」与通话页用）。
   喂食/用药的超时分级 context 留给后续真实触发逻辑选用。 */
export const SCENE_TO_TRIGGER = {
  miss_you: "miss_you",
  sleep: "bedtime",
  feeding: "feeding_soon",
  medication: "medicine_due",
  walk: "walk_time_soon",
  sick_care: "sick_care_checkin",
  emotion: "emotion_comfort",
  anniversary: "anniversary",
  memory_followup: "memory_followup",
};

export function triggerForScene(sceneId) {
  return SCENE_TO_TRIGGER[sceneId] || "miss_you";
}

/** 解析某个触发 context + 宠物类型 → 实际叫声 / 语气 / 字幕。 */
export function resolveCallEmotion(triggerContext, petType) {
  const ctx = CALL_EMOTION_MAP[triggerContext] || CALL_EMOTION_MAP.miss_you;
  const isCat = petType === "cat";
  return {
    emotion: ctx.emotion,
    sound: isCat ? ctx.catSound : ctx.dogSound,
    fallbackSound: isCat ? DEFAULT_SOUNDS.cat : DEFAULT_SOUNDS.dog,
    subtitleTone: ctx.subtitleTone,
    subtitle: ctx.subtitle,
  };
}

/**
 * 播放宠物叫声：狗用狗叫、猫用猫叫；
 * 文件缺失 / 播放失败 → 回退默认 cute sound → 仍失败则静默。绝不报错、不阻塞。
 */
export function playPetVoice(triggerContext, petType) {
  if (typeof window === "undefined" || typeof Audio === "undefined") return;
  const { sound, fallbackSound } = resolveCallEmotion(triggerContext, petType);
  const tryPlay = (src, onFail) => {
    try {
      const a = new Audio(src);
      const p = a.play();
      if (p && typeof p.catch === "function") p.catch(() => onFail && onFail());
    } catch {
      onFail && onFail();
    }
  };
  // 先放场景专属，失败回退默认 cute，再失败静默
  tryPlay(sound, () => tryPlay(fallbackSound, null));
}
