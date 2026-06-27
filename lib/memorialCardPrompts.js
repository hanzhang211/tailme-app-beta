/**
 * lib/memorialCardPrompts.js
 *
 * 「爪爪星球 · 今日的它」8 张纪念卡片的 AI 生成配置（独立抽离，方便后续单独调 prompt）。
 *
 * 内容：
 *  - CARD_TYPES：8 个固定 cardType（顺序固定）。
 *  - STORY_TYPE_TO_CARD：把现有 13 种 story type 折叠到 8 个 cardType
 *      （语义对齐 lib/pawPlanetDailyStories.js 的 TYPE_IMAGE，确保「哪天显示哪张」逻辑完全不变）。
 *  - BASE_PROMPT：统一基础 prompt（日系手绘治愈动画风 + 同一只宠物一致性 + 禁止项 + 构图）。
 *  - SCENE_PROMPTS：8 段单卡场景 prompt。
 *  - buildCardPrompt(cardType)：基础 prompt 叠加该卡场景 prompt，得到最终单张生成 prompt。
 *  - IMAGE_SIZE：火山 Seedream 出图尺寸（见下方说明，必须 ≥ 最小总像素，否则接口报错）。
 *
 * ⚠️ 火山 Seedream 尺寸约束：size 总像素需落在约 [3,686,400, 10,404,496] 区间。
 *    1280×720（92 万像素）会被接口拒绝；故出图用 16:9 的 2560×1440（≈369 万像素，刚好达标），
 *    最终成品再由 Supabase Image Transform 降到 1280×720 WebP（在 API 路由里完成）。
 */

/* ── 8 个固定 cardType（顺序固定，用于遍历生成） ───────────────── */
export const CARD_TYPES = [
  "memory_album",
  "birthday",
  "planet_friends",
  "planet_mailbox",
  "ball_play",
  "sleeping_nest",
  "snack_time",
  "sunshine_walk",
];

/* ── 现有 story type（13 种）→ cardType（8 种）──────────────────
   严格对齐 pawPlanetDailyStories.js 里 TYPE_IMAGE 的语义折叠：
     sunshine/walk_flower      → sunshine_walk  （户外晒太阳 / 花园散步）
     wake_up/sleep_home/
       stargazing/quiet_rest   → sleeping_nest  （小屋 / 睡觉 / 夜晚安静）
     friends/explore           → planet_friends （交朋友 / 探索户外）
     play_ball                 → ball_play
     snack                     → snack_time
     mailbox                   → planet_mailbox
     album                     → memory_album
     anniversary               → birthday       （相遇纪念日 / 生日 / 里程碑）
   这样「今日 3 条动态选哪张图」的算法不变，只是图源从静态图换成该宠物的 AI 缓存图。 */
export const STORY_TYPE_TO_CARD = {
  sunshine:    "sunshine_walk",
  walk_flower: "sunshine_walk",
  wake_up:     "sleeping_nest",
  friends:     "planet_friends",
  play_ball:   "ball_play",
  snack:       "snack_time",
  explore:     "planet_friends",
  sleep_home:  "sleeping_nest",
  stargazing:  "sleeping_nest",
  quiet_rest:  "sleeping_nest",
  mailbox:     "planet_mailbox",
  album:       "memory_album",
  anniversary: "birthday",
};

export function cardTypeOfStory(type) {
  return STORY_TYPE_TO_CARD[type] || "sunshine_walk";
}

/* ── 出图尺寸（见文件头说明）────────────────────────────────── */
export const IMAGE_SIZE = "2560x1440"; // 16:9，满足 Seedream 最小总像素要求

/* ── 统一基础 prompt（用户提供，原样使用）────────────────────── */
export const BASE_PROMPT = `请严格参考我提供的宠物参考图，生成一组 8 张统一系列插画；同时参考我提供的设计风格图，整体采用“日系手绘治愈动画风”。

整体风格要求：
请做成温柔、明亮、治愈、轻童话的日系手绘动画插画风格，像温暖的手绘动画场景，带有绘本感、轻复古感与乡村童话感。画面要有柔和自然光、奶油米白与浅橙色点缀、浅绿色草地、柔软云朵、温暖阳光、细腻花草、小屋、小路、星星、小信箱等元素。整体色调柔和、干净、温暖，像一部安静的治愈系动画。请保留手绘笔触感、柔和纹理感、轻微纸感或水彩感，不要做成写实摄影风，不要做成3D塑料玩具感，不要赛博风，不要强烈商业海报风。

宠物主体要求：
主角始终是同一只宠物，必须保持高度一致性。请严格保留参考宠物的主要特征：毛色、脸型、耳朵、眼睛、身体比例、神态特征。宠物整体请做成卡通化、手绘化、日系动画中的可爱宠物角色，但仍然能看出就是同一只真实宠物。不要忽然变成别的品种，不要忽然写实，不要忽然Q版失真。宠物必须自然融入场景，而不是像贴纸贴在背景上。

内容基调要求：
这组图不是告别、天堂、死亡主题，而是“它在爪爪星球里温柔生活的日常”。要表达的是：它今天也有自己的小日常，它被温柔地记住了，想念被安放在一个明亮治愈的小星球里。整体要有陪伴感、日常感、被记住的温柔感。

禁止出现：
不要真人，不要任何人物，不要宗教感，不要墓园感，不要墓碑，不要死亡、天堂、天使、翅膀、永别、复活、告别、阴暗、哭泣、恐怖、过度悲伤氛围，不要复杂品牌 logo，不要杂乱文字，不要数字生日蜡烛。

构图要求：
每张图都要是完整独立场景，适合做卡片展示。统一横版 16:9 构图，适合 1280×720 使用。留出较干净的视觉空间，方便后续卡片 UI 叠加。画面精致统一，有系列感。

额外强调：
- 8 张图都必须是同一只宠物。
- 所有画面统一为日系手绘治愈动画风。
- 不要人物。
- 不要悲伤、宗教、天堂、墓园、告别感。
- 要像一套统一的治愈系动画插画卡片。
- 每张图都要完整、自然、柔和、精致、适合卡片展示。`;

/* ── 8 段单卡场景 prompt（用户提供，原样使用）────────────────── */
export const SCENE_PROMPTS = {
  memory_album: `回忆相册。不要出现任何人物。画面主体是一块温暖可爱的回忆相册板 / 记忆展示板，放在柔和温暖的小场景里。板子上整齐贴着几张这只宠物的小照片，照片内容是它的日常瞬间，比如坐着、趴着、看向前方、晒太阳、抱着小球。板子边缘可以有纸胶带、小夹子、星星贴纸、小云朵装饰。主角宠物可以坐在相册板旁边，抬头看着这些照片，神情温柔可爱。整体氛围像“它的小相册里收藏着闪闪发光的日子”。`,

  birthday: `值得纪念的日子 / 生日。主角宠物戴着小巧可爱的生日帽，开心微笑，神情明亮可爱。它旁边放着一个小小的生日蛋糕，蛋糕简洁可爱，上面只有一根点亮的蜡烛，不要任何生日数字。可加入少量柔和彩带、小星星、小云朵、暖光，氛围是温柔轻庆祝，不要太喧闹。整体像“今天是值得记住的日子，它也在自己的小星球里轻轻开心着”。`,

  planet_friends: `主角宠物在柔软草地或小花园里，认识新的小伙伴。伙伴必须是卡通风格的猫猫和狗狗，软萌、圆润、可爱，颜色柔和，像日系动画里的治愈小动物。画面重点要表现主角宠物正在和这些猫猫、狗狗伙伴一起玩耍的感觉，比如一起追逐小球、并排奔跑、围在一起互动、开心地玩游戏，整体要有明显的陪伴感和动态感，而不是只是安静地站在一起。主角宠物和同伴之间要有自然互动，表情开心、轻松、友好，氛围温暖又有活力。整体表达“它在爪爪星球认识了新的猫猫和狗狗朋友，并且正开心地和它们一起玩”。`,

  planet_mailbox: `星球信箱。主角宠物站在一个可爱的星球小信箱前，两只前爪扒在信箱边缘，身体微微站起，像正在取信或看信。信箱要有童话感，可以带星星元素、圆角造型、柔和橙色细节，旁边露出一封信。宠物表情要灵动、期待、可爱，像真的收到了信。整体表达“主人写给它的信，被送到了它的小信箱里”。`,

  ball_play: `玩球日常。主角宠物在柔软草地上开心地玩一个小球，球可以是暖橙色。动作自然生动，可以是用前爪碰球、追着球跑、低头看球，神情开心，充满轻松小日常。周围有柔和阳光、小花、小草、云朵、少量闪光点，像在一个温暖的小星球花园里。整体表达“它今天也像以前一样开心地玩球”。`,

  sleeping_nest: `睡觉小窝。主角宠物安静地睡在一个柔软温暖的小窝里。小窝舒适可爱，可以是奶油色或浅橙色，有软垫、小毯子、被温柔包裹的感觉。宠物闭着眼睛，姿态放松，睡得很香。画面里有柔和阳光洒落下来，像被阳光轻轻抱住一样。整体安静、安心、柔软、治愈。`,

  snack_time: `零食时光。主角宠物站在一张小木桌或小凳子旁边，桌上放着几包它喜欢的小零食。零食包装要简洁可爱，暖橙色系，不要复杂品牌文字。宠物神情开心期待，尾巴微微翘起，像收到喜欢的小零食一样满足。整体氛围轻松可爱，干净温暖，表达“它今天也收到了喜欢的小零食”。`,

  sunshine_walk: `阳光散步。主角宠物走在温暖明亮的小路上，像在属于它的小星球里散步。周围有柔软草地、小花、暖阳、轻云朵、远处小屋或温柔自然景色，带一点日系乡村动画氛围。宠物动作自然放松，神情平和或微笑，像在享受今天的小日常。整体表达“它在温暖阳光里轻轻走过自己的小星球”。`,
};

/* ── 每张卡的简短场景名（拼进 prompt 开头，让单张生成聚焦本张）── */
const SCENE_TITLE = {
  memory_album:   "回忆相册",
  birthday:       "值得纪念的日子 / 生日",
  planet_friends: "认识新朋友",
  planet_mailbox: "星球信箱",
  ball_play:      "玩球日常",
  sleeping_nest:  "睡觉小窝",
  snack_time:     "零食时光",
  sunshine_walk:  "阳光散步",
};

/**
 * 拼出某张卡的最终生成 prompt：
 *   逐张调用火山时只要一张，故开头点明「这是 8 张系列中的这一张，请只生成这一张」，
 *   再接完整 BASE_PROMPT（提供风格/一致性/禁止项约束）与本张场景 prompt。
 */
export function buildCardPrompt(cardType) {
  const scene = SCENE_PROMPTS[cardType];
  if (!scene) return BASE_PROMPT;
  return [
    `【本张：8 张治愈系列卡片中的「${SCENE_TITLE[cardType] || cardType}」这一张，请只生成这一张完整的横版插画】`,
    "",
    BASE_PROMPT,
    "",
    "【这一张的具体场景】",
    scene,
  ].join("\n");
}
