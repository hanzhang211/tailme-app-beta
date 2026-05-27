/**
 * services/breedAvatar.js
 *
 * breed -> emoji 头像。
 * 与 app/page.jsx 中的 BREEDS 列表对应。
 * 无匹配项返回通用 🐾。
 */

const BREED_EMOJI = {
  "腊肠犬":   "🌭",
  "柴犬":     "🦊",
  "柯基":     "🍑",
  "金毛":     "☀️",
  "拉布拉多": "🦮",
  "边牧":     "🐺",
  "法斗":     "🐶",
  "比熊":     "☁️",
  "贵宾":     "🎀",
  "泰迪":     "🧸",
  "阿拉斯加": "🐺",
  "哈士奇":   "❄️",
  "德牧":     "🐺",
  "博美":     "🦊",
  "马尔济斯": "☁️",
  "巴哥":     "🐶",
  "吉娃娃":   "🌶️",
  "秋田":     "🦊",
  "雪纳瑞":   "🐶",
  "约克夏":   "🎀",
  "杜宾":     "🐺",
  "萨摩耶":   "⛄",
  "罗威纳":   "🐺",
  "伯恩山":   "🏔️",
  "斗牛犬":   "🐶",
  "灵缇":     "💨",
  "纽芬兰":   "🐻",
  "牛头梗":   "🥚",
  "可卡":     "🌸",
  "其他":     "🐾",
};

/**
 * 取 breed 对应 emoji；找不到或 falsy 返回 🐾
 */
export function avatarForBreed(breed) {
  if (!breed) return "🐾";
  return BREED_EMOJI[breed] || "🐾";
}

/**
 * 取 pet 对象的 emoji（处理 pet 可能为 null 的情况）
 */
export function avatarForPet(pet) {
  return avatarForBreed(pet?.breed);
}
