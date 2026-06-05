/**
 * services/shopMock.js
 *
 * 「宠物商城」前期 mock 数据 + 查询函数。
 * 视觉先行、结构清晰，后续可整体替换为 Supabase（保持下方查询函数签名即可平滑迁移）。
 *
 * 说明：mock 阶段没有真实商品图，cover/images 用 { emoji, tone } 占位
 *      （ShopUI 的 ProductImage 会渲染暖色渐变 + emoji；真实接入时把 cover 换成 url 即可）。
 */

// 渐变色调（全部暖色奶油系，贴合 TailMe 风格）
export const TONES = {
  cream: ["#FBEAD0", "#F1D4A8"],
  peach: ["#FBE3DA", "#F4CDBE"],
  sage:  ["#E9EEDD", "#D9E2C6"],
  latte: ["#F0E6D8", "#E2D2BC"],
  rose:  ["#F7E0DE", "#EFC9C6"],
  sky:   ["#E6ECEF", "#D5E0E6"],
};

export const CATEGORIES = [
  { id: "all",     name: "全部",   emoji: "🐾" },
  { id: "dogfood", name: "狗粮",   emoji: "🦴" },
  { id: "catfood", name: "猫粮",   emoji: "🐟" },
  { id: "snack",   name: "零食",   emoji: "🍖" },
  { id: "feeder",  name: "喂食器", emoji: "🍽️" },
  { id: "waterer", name: "饮水器", emoji: "💧" },
  { id: "litter",  name: "猫砂尿垫", emoji: "🪣" },
  { id: "toy",     name: "玩具",   emoji: "🧸" },
  { id: "leash",   name: "牵引绳", emoji: "🦮" },
  { id: "clean",   name: "清洁护理", emoji: "🧴" },
  { id: "deworm",  name: "驱虫药", emoji: "💊" },
  { id: "health",  name: "保健品", emoji: "🌿" },
  { id: "travel",  name: "出行用品", emoji: "🎒" },
];

// 商城首页固定 2×5 宫格分类（顺序严格按设计稿；key 用于匹配 SVG 图标）
export const GRID_CATEGORIES = [
  { id: "dogfood", name: "狗粮",   key: "dogfood" },
  { id: "catfood", name: "猫粮",   key: "catfood" },
  { id: "snack",   name: "零食",   key: "snack" },
  { id: "feeder",  name: "喂食器", key: "feeder" },
  { id: "deworm",  name: "驱虫药", key: "deworm" },
  { id: "leash",   name: "牵引绳", key: "leash" },
  { id: "toy",     name: "玩具",   key: "toy" },
  { id: "clean",   name: "清洁护理", key: "clean" },
  { id: "health",  name: "保健品", key: "health" },
  { id: "litter",  name: "猫砂",   key: "litter" },
];

// 收货地址（mock）
export const ADDRESSES = [
  { id: "a1", name: "小可爱", phone: "188****8888", tag: "家",
    addr: "广东省深圳市南山区科技园北区 xx 栋 xx 室", isDefault: true },
  { id: "a2", name: "宠友",   phone: "139****1234", tag: "公司",
    addr: "广东省广州市天河区天河路 xx 号 xx 座" },
  { id: "a3", name: "麻麻",   phone: "0755-12345678", tag: "学校",
    addr: "广东省深圳市福田区莲花街道 xx 中心 xx 楼" },
];

export const STORES = [
  { id: "s1", name: "TailMe 官方旗舰店", emoji: "🐾", official: true,
    desc: "TailMe 官方 · 全价粮与智能宠物用品", productCount: 125, fans: "3.6万", rating: 4.9 },
  { id: "s2", name: "萌宠生活馆", emoji: "🐱", official: false,
    desc: "精选零食与毛孩子日常好物", productCount: 88, fans: "1.2万", rating: 4.8 },
  { id: "s3", name: "毛孩子优选", emoji: "🦴", official: false,
    desc: "高性价比口粮专营店", productCount: 64, fans: "8900", rating: 4.7 },
  { id: "s4", name: "喵汪出行馆", emoji: "🎒", official: false,
    desc: "出行 · 牵引 · 清洁护理一站购", productCount: 47, fans: "5400", rating: 4.8 },
];

// 商品（cover/images 用占位 {emoji,tone}）
export const PRODUCTS = [
  { id: "p1",  title: "TailMe 全价犬粮 成犬通用 2kg", price: 169, original: 199, emoji: "🦴", tone: "cream",
    categoryId: "dogfood", storeId: "s1", soldCount: 12000, tags: ["高蛋白易消化", "亮泽毛发", "均衡营养"],
    desc: "精选鸡肉与三文鱼，高蛋白易消化，添加深海鱼油，帮助毛发亮泽、肠胃舒适。" },
  { id: "p2",  title: "TailMe 全价猫粮 鸡肉配方 1.5kg", price: 139, original: 169, emoji: "🐟", tone: "sage",
    categoryId: "catfood", storeId: "s1", soldCount: 9800, tags: ["低敏营养", "呵护肠胃"],
    desc: "低敏配方，添加益生元，呵护猫咪娇嫩肠胃，适口性好不挑食。" },
  { id: "p3",  title: "冻干鸡肉猫咪零食 80g", price: 39.9, original: 49, emoji: "🍗", tone: "latte",
    categoryId: "snack", storeId: "s2", soldCount: 23000, tags: ["0 添加", "高蛋白", "纯肉冻干"],
    desc: "100% 纯鸡胸肉冻干，0 添加 0 谷物，锁住原始营养，训练奖励两相宜。" },
  { id: "p4",  title: "智能定时喂食器 3L", price: 229, original: 299, emoji: "🍽️", tone: "sky",
    categoryId: "feeder", storeId: "s1", soldCount: 5400, tags: ["定时定量", "远程喂食"],
    desc: "App 远程控制，定时定量，断电记忆，让毛孩子按时吃饭更安心。" },
  { id: "p5",  title: "宠物循环活水饮水机 2L", price: 119, emoji: "💧", tone: "sky",
    categoryId: "waterer", storeId: "s1", soldCount: 4100, tags: ["静音", "三重过滤"],
    desc: "静音循环活水，三重过滤更鲜活，鼓励多喝水，呵护泌尿健康。" },
  { id: "p6",  title: "膨润土豆腐混合猫砂 6L", price: 49.9, original: 59, emoji: "🪣", tone: "latte",
    categoryId: "litter", storeId: "s3", soldCount: 31000, tags: ["强力结团", "低尘除臭"],
    desc: "豆腐砂与膨润土黄金配比，强力结团易铲，低粉尘高吸附，清新除臭。" },
  { id: "p7",  title: "逗猫棒羽毛玩具套装", price: 25.9, emoji: "🪶", tone: "rose",
    categoryId: "toy", storeId: "s2", soldCount: 18000, tags: ["互动解闷"],
    desc: "多配件可替换，逗趣互动消耗精力，缓解独处无聊。" },
  { id: "p8",  title: "狗狗发声磨牙球玩具", price: 29.9, emoji: "🧸", tone: "sage",
    categoryId: "toy", storeId: "s2", soldCount: 9600, tags: ["耐咬", "洁齿"],
    desc: "食品级耐咬材质，内置发声器，磨牙洁齿又解闷。" },
  { id: "p9",  title: "防爆冲胸背牵引绳套装", price: 69, original: 89, emoji: "🦮", tone: "cream",
    categoryId: "leash", storeId: "s4", soldCount: 7700, tags: ["防爆冲", "反光"],
    desc: "宽幅减压胸背，分散拉力不勒颈，夜间反光出行更安全。" },
  { id: "p10", title: "宠物香波 留香除味 500ml", price: 45, emoji: "🧴", tone: "peach",
    categoryId: "clean", storeId: "s4", soldCount: 6200, tags: ["温和", "持久留香"],
    desc: "弱酸温和配方，深层清洁不刺激，淡淡奶香持久留香。" },
  { id: "p11", title: "体内外一体驱虫滴剂 3支", price: 128, original: 158, emoji: "💊", tone: "sage",
    categoryId: "deworm", storeId: "s1", soldCount: 8800, tags: ["内外同驱", "温和"],
    desc: "一次滴用内外同驱，温和不刺激，按体重精准分装。" },
  { id: "p12", title: "关节呵护软骨素 钙片 120粒", price: 88, emoji: "🌿", tone: "sage",
    categoryId: "health", storeId: "s3", soldCount: 5300, tags: ["护关节", "补钙"],
    desc: "氨糖软骨素 + 钙，呵护中老年犬猫关节，行动更轻松。" },
  { id: "p13", title: "宠物外出便携背包 透气太空舱", price: 159, original: 199, emoji: "🎒", tone: "sky",
    categoryId: "travel", storeId: "s4", soldCount: 4600, tags: ["透气", "可折叠"],
    desc: "大视野透气太空舱，可折叠承重稳，出行通勤看世界。" },
  { id: "p14", title: "幼犬奶糕粮 1kg", price: 79, original: 99, emoji: "🦴", tone: "cream",
    categoryId: "dogfood", storeId: "s3", soldCount: 14000, tags: ["幼犬专用", "易吸收"],
    desc: "高能量奶糕配方，遇水可泡软，助力幼犬断奶过渡。" },
  { id: "p15", title: "成猫室内全价粮 化毛球 2kg", price: 109, emoji: "🐟", tone: "latte",
    categoryId: "catfood", storeId: "s2", soldCount: 7200, tags: ["化毛球", "控体重"],
    desc: "添加膳食纤维助化毛球，控卡路里配方更适合室内猫。" },
  { id: "p16", title: "猫咪洁齿磨牙小饼干 200g", price: 19.9, emoji: "🍪", tone: "peach",
    categoryId: "snack", storeId: "s3", soldCount: 26000, tags: ["洁齿", "酥脆"],
    desc: "酥脆颗粒摩擦洁齿，清新口气，低脂不负担。" },
  { id: "p17", title: "可水洗宠物尿垫 100片", price: 35.9, original: 45, emoji: "🪣", tone: "sky",
    categoryId: "litter", storeId: "s4", soldCount: 33000, tags: ["强吸水", "锁味"],
    desc: "多层强吸水锁味，遇液成胶不回渗，干爽好打理。" },
  { id: "p18", title: "宠物自动旋转逗趣玩具", price: 59, emoji: "🛸", tone: "rose",
    categoryId: "toy", storeId: "s2", soldCount: 5100, tags: ["自动", "充电"],
    desc: "自动旋转随机轨迹，USB 充电，独自在家也不无聊。" },
];

// 评价（按 productId 取；缺省给一组通用好评）
const REVIEWS = [
  { id: "r1", productId: "p1", userName: "可乐麻麻", userEmoji: "🐩", rating: 5, time: "2天前",
    content: "我家狗狗很爱吃，便便正常，毛发也亮了，已经回购好几次啦！" },
  { id: "r2", productId: "p1", userName: "豆豆爸",   userEmoji: "🐕", rating: 5, time: "5天前",
    content: "颗粒大小适中，泡软也方便，肠胃一直很稳定，推荐。" },
  { id: "r3", productId: "p1", userName: "花卷",     userEmoji: "🦴", rating: 4, time: "1周前",
    content: "性价比不错，物流也快，会持续观察毛发情况～" },
  { id: "r4", productId: "p3", userName: "橘座大人", userEmoji: "🐱", rating: 5, time: "昨天",
    content: "纯肉冻干闻着就香，主子吃得停不下来，训练神器！" },
  { id: "r5", productId: "p4", userName: "二哈管家", userEmoji: "🐺", rating: 5, time: "3天前",
    content: "出差再也不怕喂饭了，App 远程很灵敏，断电也记得住。" },
];

const DEFAULT_REVIEWS = [
  { id: "d1", userName: "毛孩子家长", userEmoji: "🐾", rating: 5, time: "3天前",
    content: "东西和描述一致，包装很用心，毛孩子很喜欢，好评！" },
  { id: "d2", userName: "汤圆妈",     userEmoji: "🐈", rating: 5, time: "1周前",
    content: "回购了，品质稳定，客服态度也很好，会一直支持。" },
];

/* ── 查询函数（迁移真实数据时只需替换内部实现）─────────── */

export function listProducts({ categoryId = "all", q = "" } = {}) {
  const kw = q.trim().toLowerCase();
  return PRODUCTS.filter((p) => {
    if (categoryId && categoryId !== "all" && p.categoryId !== categoryId) return false;
    if (!kw) return true;
    const store = STORES.find((s) => s.id === p.storeId);
    return p.title.toLowerCase().includes(kw) || (store?.name || "").toLowerCase().includes(kw);
  });
}

export function getProduct(id) { return PRODUCTS.find((p) => p.id === id) || null; }
export function getStore(id) { return STORES.find((s) => s.id === id) || null; }
export function getCategory(id) { return CATEGORIES.find((c) => c.id === id) || null; }

export function listProductsByStore(storeId, { excludeId, limit } = {}) {
  let rows = PRODUCTS.filter((p) => p.storeId === storeId && p.id !== excludeId);
  if (limit) rows = rows.slice(0, limit);
  return rows;
}

export function listReviews(productId) {
  const own = REVIEWS.filter((r) => r.productId === productId);
  return own.length ? own : DEFAULT_REVIEWS;
}

// 搜索：返回匹配的店铺（用于「店铺名」搜索结果卡）
export function searchStores(q) {
  const kw = q.trim().toLowerCase();
  if (!kw) return [];
  return STORES.filter((s) => s.name.toLowerCase().includes(kw) || (s.desc || "").toLowerCase().includes(kw));
}

export function fmtSold(n) {
  if (n >= 10000) return `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)}万+`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k+`;
  return `${n}`;
}
