/**
 * services/amapService.js
 *
 * 高德地图 JS API 封装。
 * - 动态加载脚本（SSR 安全，不访问 window/document 于模块顶层）
 * - 定位（GPS → IP → 上海市中心兜底）
 * - POI 周边搜索（多关键词合并去重）
 * - 不含任何 mock / fake 数据
 *
 * 使用的环境变量：
 *   NEXT_PUBLIC_AMAP_KEY
 */

/* ══════════════════════════════════════════════════════════════
   合作商家数据结构预留（partner_shops 表）
   正式接入时从 Supabase 查询，替换 services/supabaseService.js 中的对应函数：
   {
     id, shop_name, address, lat, lng, phone,
     tags: string[],
     is_partner: boolean,
     discount_info: string | null,
     opening_hours: string | null,
     created_at
   }
══════════════════════════════════════════════════════════════ */

/* ── 脚本单例加载 ─────────────────────────────────────────────
   确保整个应用只加载一次高德脚本。
   SSR 环境直接 reject，调用方在 useEffect 中调用即可。
   ─────────────────────────────────────────────────────────── */
let _loadPromise = null;

export function loadAmapScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Server-side rendering: AMap is browser-only."));
  }
  if (window.AMap) return Promise.resolve(window.AMap);
  if (_loadPromise) return _loadPromise;

  const key = process.env.NEXT_PUBLIC_AMAP_KEY;
  if (!key) {
    return Promise.reject(new Error("缺少 NEXT_PUBLIC_AMAP_KEY 环境变量"));
  }

  _loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "text/javascript";
    // AMap JSAPI 2.0，plugins 在 URL 中声明，onload 后立即可用
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}&plugin=AMap.Geolocation,AMap.PlaceSearch`;
    script.async = true;

    script.onload = () => {
      if (window.AMap) {
        resolve(window.AMap);
      } else {
        _loadPromise = null;
        reject(new Error("高德地图加载完成但 window.AMap 不存在，请检查 API Key 是否有效。"));
      }
    };
    script.onerror = () => {
      _loadPromise = null;
      reject(new Error("高德地图脚本加载失败，请检查网络连接或 API Key 是否在高德控制台已授权。"));
    };

    document.head.appendChild(script);
  });

  return _loadPromise;
}

/* ── 获取用户位置 ─────────────────────────────────────────────
   优先级：高精度 GPS → IP 定位 → 上海市中心（兜底）
   ─────────────────────────────────────────────────────────── */
export function getUserLocation(AMap) {
  return new Promise((resolve) => {
    try {
      const geo = new AMap.Geolocation({
        enableHighAccuracy: true,
        timeout: 8000,
        noIpLocate: 0,       // 0 = GPS 失败时允许 IP 定位
        GeoLocationFirst: true,
      });

      geo.getCurrentPosition((status, result) => {
        if (status === "complete" && result?.position) {
          resolve({
            lng: result.position.getLng(),
            lat: result.position.getLat(),
            source: "gps",
            city: result.addressComponent?.city || "",
          });
        } else {
          // 定位失败 → 上海市中心
          resolve({ lng: 121.4737, lat: 31.2304, source: "default", city: "上海市" });
        }
      });
    } catch {
      resolve({ lng: 121.4737, lat: 31.2304, source: "default", city: "上海市" });
    }
  });
}

/* ── POI 分类配置 ─────────────────────────────────────────────
   keywords：高德 searchNearBy 使用的关键词列表
   "全部" 分类使用前4个代表性关键词
   ─────────────────────────────────────────────────────────── */
export const POI_CATEGORIES = [
  {
    id: "all",
    label: "全部",
    icon: "🐾",
    keywords: ["宠物医院", "宠物美容", "宠物用品店", "宠物寄养"],
  },
  {
    id: "hospital",
    label: "医院",
    icon: "🏥",
    keywords: ["宠物医院", "动物医院", "兽医诊所", "宠物诊所"],
  },
  {
    id: "shop",
    label: "食品/用品",
    icon: "🛍️",
    keywords: ["宠物食品", "宠物用品店", "宠物店", "宠物超市"],
  },
  {
    id: "grooming",
    label: "美容/寄养",
    icon: "✂️",
    keywords: ["宠物美容", "宠物寄养", "宠物洗澡", "宠物spa"],
  },
  {
    id: "training",
    label: "训练",
    icon: "🎓",
    keywords: ["宠物训练", "宠物学校", "狗狗训练", "宠物行为"],
  },
  {
    id: "petfriendly",
    label: "宠物友好",
    icon: "☕",
    // 高德对此类 POI 收录较少，若无结果显示"暂未找到"，不展示假数据
    keywords: ["宠物友好咖啡", "可带宠物咖啡", "宠物咖啡馆", "宠物餐厅"],
  },
];

/* ── 单关键词周边搜索 ─────────────────────────────────────────
   radius: 搜索半径（米），默认 3000m
   ─────────────────────────────────────────────────────────── */
export function searchNearby(AMap, keyword, location, radius = 3000) {
  return new Promise((resolve, reject) => {
    try {
      const ps = new AMap.PlaceSearch({
        pageSize: 20,
        pageIndex: 1,
        citylimit: false,
      });

      ps.searchNearBy(
        keyword,
        [location.lng, location.lat],
        radius,
        (status, result) => {
          if (status === "complete" && result.info === "OK") {
            resolve(result.poiList?.pois || []);
          } else if (result.info === "NO_DATA" || result.info === "no_data") {
            resolve([]); // 无结果，不报错
          } else {
            // 其他错误（如 INVALID_USER_KEY）向上抛
            reject(new Error(`高德搜索错误: ${result.info}`));
          }
        }
      );
    } catch (err) {
      reject(err);
    }
  });
}

/* ── 分类搜索（多关键词合并去重）─────────────────────────────
   "全部" 类型搜4个关键词，其他类型搜前2个（避免 API 配额）
   按距离升序排列
   ─────────────────────────────────────────────────────────── */
export async function searchByCategory(AMap, category, location, radius = 3000) {
  const kws =
    category.id === "all"
      ? category.keywords                 // 全部：搜所有关键词
      : category.keywords.slice(0, 2);    // 其他：最多2个关键词

  const results = await Promise.all(
    kws.map((kw) => searchNearby(AMap, kw, location, radius).catch(() => []))
  );

  // 去重（以 poi.id 为唯一键）
  const seen = new Set();
  const merged = results.flat().filter((poi) => {
    if (seen.has(poi.id)) return false;
    seen.add(poi.id);
    return true;
  });

  // 按距离升序
  return merged.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
}

/* ── 工具函数 ─────────────────────────────────────────────── */

/** 安全提取 AMap.LngLat 坐标（兼容 object 和 LngLat 实例） */
export function getCoords(location) {
  if (!location) return null;
  const lng =
    typeof location.getLng === "function" ? location.getLng() : location.lng;
  const lat =
    typeof location.getLat === "function" ? location.getLat() : location.lat;
  return { lng, lat };
}

/** 格式化距离显示 */
export function formatDistance(meters) {
  if (meters == null) return "";
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

/** 跳转高德地图导航/详情（callnative=1 优先打开 App） */
export function openInAMap(poi) {
  const coords = getCoords(poi.location);
  if (!coords) return;
  const url =
    `https://uri.amap.com/marker?` +
    `position=${coords.lng},${coords.lat}` +
    `&name=${encodeURIComponent(poi.name || "")}` +
    `&address=${encodeURIComponent(poi.address || poi.adname || "")}` +
    `&coordinate=gaode&callnative=1`;
  window.open(url, "_blank");
}

/** 电话号码格式化（高德返回可能是数组） */
export function formatTel(tel) {
  if (!tel) return null;
  if (Array.isArray(tel)) return tel[0] || null;
  return String(tel).split(";")[0] || null;
}
