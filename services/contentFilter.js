/**
 * services/contentFilter.js
 *
 * 文本过滤：广告关键词 + 用户名敏感词。
 * 命中广告词 → 内容仍可入库，但 status 预设为 'flagged'，由 admin 决定放行/删。
 * 命中敏感词 → 用户名不允许创建，前端直接拒。
 *
 * 注意：这是钝刀。绕过容易，配合举报 + admin 审核才能闭环。
 *      未来可接入阿里云内容安全 API。
 */

/* 广告 / 拉客 类——命中后 flagged 不显示 */
const AD_KEYWORDS = [
  "加微信","加v","加vx","加 v","加 vx","加✚","加+v","➕v","➕微",
  "vx","VX","wx","Wx","微信号","威信","薇信",
  "贷款","借款","网贷","下款","秒到账","低息",
  "兼职","返利","刷单","推广","代理","加盟",
  "私聊","私我","sili","s聊",
  "广告","佣金","日入","月入","躺赚","赚钱副业",
];

/* 用户名 / 显示名禁用词——情色 + 辱骂粗口 + 政治敏感 */
const USERNAME_BLOCK = [
  // 辱骂
  "傻逼","煞笔","sb","cnm","tmd","fuck","shit","bitch",
  "草泥马","操你","日你","你妈","你爹","jb","jj","屌","逼",
  // 情色
  "av","岛国","裸聊","约炮","小姐","包养","卖淫","嫖娼","成人","porn","sex",
  // 政治 / 暴恐（粗筛）
  "习近平","共产党","台独","港独","法轮功","六四",
  // 客服/官方仿冒
  "admin","管理员","客服","官方","系统","root","tailme",
];

/**
 * 文本归一化：小写 + 去空白/符号，便于检测 "加 v"、"加_V" 等绕过
 */
function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[\s_·.\-•·,，。!！?？*~`'"()（）【】\[\]{}<>《》]/g, "");
}

/**
 * 帖子/评论/消息内容检查
 * @returns { flagged: boolean, hits: string[] }
 */
export function checkContent(text) {
  const norm = normalize(text);
  const hits = [];
  for (const kw of AD_KEYWORDS) {
    if (norm.includes(normalize(kw))) hits.push(kw);
  }
  return { flagged: hits.length > 0, hits };
}

/**
 * 用户名校验
 * @returns { ok: boolean, reason?: string }
 */
export function checkUsername(name) {
  const raw = String(name || "").trim();
  if (raw.length < 2) return { ok: false, reason: "用户名至少 2 个字符" };
  if (raw.length > 20) return { ok: false, reason: "用户名不能超过 20 字符" };
  // 仅允许中英文数字下划线
  if (!/^[一-龥A-Za-z0-9_]+$/.test(raw)) {
    return { ok: false, reason: "只能包含中英文、数字、下划线" };
  }
  const norm = normalize(raw);
  for (const kw of USERNAME_BLOCK) {
    if (norm.includes(normalize(kw))) {
      return { ok: false, reason: "用户名包含不允许的词汇" };
    }
  }
  return { ok: true };
}
