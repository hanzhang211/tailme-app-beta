/**
 * services/petAge.js
 *
 * 宠物年龄 / 生日 / 性格 工具。
 * - formatPetAge(birthday)：根据生日返回整数岁 / 整数月 / 整数天
 * - formatBirthday(birthday)：把 ISO 日期格式化成 "2023.05.12"
 * - PERSONALITIES：注册/补全时可选的 10 个性格标签
 */

export const PERSONALITIES = [
  "黏人小宝贝",
  "活力小太阳",
  "安静乖乖",
  "好奇探险家",
  "社牛小明星",
  "慢热小可爱",
  "贪吃小馋猫",
  "胆小但温柔",
  "爱撒娇",
  "独立酷宝",
];

/**
 * 计算"年/月/日"中合适的一档。
 * 输入 birthday 可为 "YYYY-MM-DD" 字符串或 Date。
 * 返回 string 或 null（输入无效时）。
 */
export function formatPetAge(birthday) {
  if (!birthday) return null;
  const b = birthday instanceof Date ? birthday : new Date(birthday);
  if (isNaN(b.getTime())) return null;

  const now = new Date();
  if (b > now) return "0天";   // 未来日期保护

  // 整数岁：到了生日才 +1
  let years = now.getFullYear() - b.getFullYear();
  const beforeBday =
    now.getMonth() < b.getMonth() ||
    (now.getMonth() === b.getMonth() && now.getDate() < b.getDate());
  if (beforeBday) years -= 1;
  if (years >= 1) return `${years}岁`;

  // 不足 1 岁 → 整数月
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  if (months >= 1) return `${months}个月`;

  // 不足 1 个月 → 整数天
  const days = Math.floor((now.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
  return `${Math.max(days, 0)}天`;
}

/**
 * 生日的展示格式："2023.05.12"
 */
export function formatBirthday(birthday) {
  if (!birthday) return null;
  const b = birthday instanceof Date ? birthday : new Date(birthday);
  if (isNaN(b.getTime())) return null;
  const y = b.getFullYear();
  const m = String(b.getMonth() + 1).padStart(2, "0");
  const d = String(b.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

/**
 * 给 HTML <input type="date" max=""> 用的今日字符串
 */
export function todayISO() {
  const t = new Date();
  return [
    t.getFullYear(),
    String(t.getMonth() + 1).padStart(2, "0"),
    String(t.getDate()).padStart(2, "0"),
  ].join("-");
}
