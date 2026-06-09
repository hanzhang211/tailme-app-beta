/**
 * services/amapService.js  — 双 Key 架构
 *
 * 环境变量：
 *   NEXT_PUBLIC_AMAP_JS_KEY       Web端(JS API) Key  → 地图底图 + 定位
 *   NEXT_PUBLIC_AMAP_SECURITY_CODE Web端安全密钥
 *   NEXT_PUBLIC_AMAP_WEB_KEY      Web服务 Key         → POI 搜索（REST API）
 *
 * 架构：
 *   地图 SDK  ── JS  Key + script 标签（可选，失败不影响 POI 列表）
 *   POI 搜索  ── Web Key + fetch restapi.amap.com（必须，独立于地图）
 *   定位       ── 优先 navigator.geolocation（不需要任何 Key）
 */

/* ══════════════════════════════════════════════════════════
   1. 浏览器原生定位（不依赖 AMap SDK）
══════════════════════════════════════════════════════════ */
export function getMyLocation() {
  return new Promise((resolve) => {
    const fallback = { lng: 121.4737, lat: 31.2304, source: "default", city: "上海市" };

    if (typeof window === "undefined" || !navigator?.geolocation) {
      resolve(fallback);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lng:    pos.coords.longitude,
        lat:    pos.coords.latitude,
        source: "gps",
        city:   "",
      }),
      () => resolve(fallback),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });
}

/**
 * 逆地理编码：经纬度 → 城市名（市级）。用 Web 服务 Key（与 POI 同一个）。
 * 直辖市时 city 可能为空，回退 province。失败返回 ""。
 */
export async function reverseGeoCity(lat, lng) {
  const key = process.env.NEXT_PUBLIC_AMAP_WEB_KEY;
  if (!key || lat == null || lng == null) return "";
  try {
    const url = `https://restapi.amap.com/v3/geocode/regeo?key=${key}&location=${lng},${lat}&extensions=base`;
    const res = await fetch(url);
    if (!res.ok) return "";
    const data = await res.json();
    if (data.status !== "1") return "";
    const comp = data.regeocode?.addressComponent;
    if (!comp) return "";
    let city = comp.city;
    if (Array.isArray(city)) city = city[0];
    if (!city) { let p = comp.province; city = Array.isArray(p) ? "" : p; }
    return city || "";
  } catch {
    return "";
  }
}

/* ══════════════════════════════════════════════════════════
   2. 地图 SDK 加载（可选，失败不影响 POI）
      使用 script onload + 轮询 window.AMap
══════════════════════════════════════════════════════════ */
let _sdkPromise = null;

export function loadMapSDK() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("SSR"));
  }
  if (window.AMap?.Map) return Promise.resolve(window.AMap);
  if (_sdkPromise) return _sdkPromise;

  const jsKey  = process.env.NEXT_PUBLIC_AMAP_JS_KEY;
  const secKey = process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE;

  if (!jsKey) {
    return Promise.reject(new Error("缺少 NEXT_PUBLIC_AMAP_JS_KEY"));
  }

  // 注入安全密钥（必须在 script 之前）
  if (secKey) {
    window._AMapSecurityConfig = { securityJsCode: secKey };
  }

  _sdkPromise = new Promise((resolve, reject) => {
    // 防止重复插入
    const existing = document.querySelector(`script[data-amap-js="${jsKey}"]`);
    if (!existing) {
      const s = document.createElement("script");
      s.setAttribute("data-amap-js", jsKey);
      s.src =
        "https://webapi.amap.com/maps?v=2.0" +
        "&key="    + jsKey +
        "&plugin=AMap.Geolocation,AMap.Scale,AMap.ToolBar,AMap.MarkerCluster";
      s.async = true;
      s.onerror = () => {
        _sdkPromise = null;
        reject(new Error("地图 JS SDK onerror — 检查 JS Key 白名单配置"));
      };
      document.head.appendChild(s);
    }

    // 轮询 window.AMap，最多 12s
    const t0      = Date.now();
    const timer   = setInterval(() => {
      if (window.AMap?.Map) {
        clearInterval(timer);
        resolve(window.AMap);
        return;
      }
      if (Date.now() - t0 > 12000) {
        clearInterval(timer);
        _sdkPromise = null;
        reject(new Error(
          "地图 SDK 12s 未就绪（window.AMap 仍为 undefined）\n" +
          "JS Key 前6位: " + jsKey.slice(0, 6) + "\n" +
          "Security code: " + (secKey ? "已配置" : "未配置")
        ));
      }
    }, 200);
  });

  return _sdkPromise;
}

/* ══════════════════════════════════════════════════════════
   3. POI 搜索 — Web服务 REST API（独立于 JS SDK）
      直接 fetch restapi.amap.com，不依赖 window.AMap
══════════════════════════════════════════════════════════ */
const REST_BASE = "https://restapi.amap.com/v3/place/around";

/** 单关键词单页搜索，失败返回空数组 */
async function searchOneREST(lat, lng, keyword, radius, page = 1) {
  const key = process.env.NEXT_PUBLIC_AMAP_WEB_KEY;
  if (!key) {
    console.warn("[amapService] 缺少 NEXT_PUBLIC_AMAP_WEB_KEY，POI 搜索跳过");
    return [];
  }

  const url =
    REST_BASE +
    "?key="      + key +
    "&location=" + lng + "," + lat +   // 高德格式：经度在前
    "&keywords=" + encodeURIComponent(keyword) +
    "&radius="   + radius +
    "&offset=25" +
    "&page="     + page +
    "&extensions=all";   // all：返回 photos / biz_ext.rating 等（base 不返回）

  try {
    const res  = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (data.status !== "1" || !Array.isArray(data.pois)) return [];

    // 归一化：distance 转 number，location 保持字符串
    return data.pois.map((p) => ({
      ...p,
      distance: parseFloat(p.distance) || 0,
    }));
  } catch {
    return [];
  }
}

/** 单关键词多页搜索（page 1..pages 合并） */
async function searchKeywordPaged(lat, lng, keyword, radius, pages = 2) {
  const reqs = [];
  for (let pg = 1; pg <= pages; pg++) reqs.push(searchOneREST(lat, lng, keyword, radius, pg));
  const arrs = await Promise.allSettled(reqs);
  const out = [];
  arrs.forEach((r) => { if (r.status === "fulfilled") out.push(...r.value); });
  return out;
}

/** 11 个关键词多页并发搜索，合并去重，按距离排序 */
async function mergeSearchREST(lat, lng, radius, pages = 2) {
  const results = await Promise.allSettled(
    ALL_KEYWORDS.map((kw) => searchKeywordPaged(lat, lng, kw, radius, pages))
  );
  const seen = new Set();
  const list = [];
  results.forEach((r) => {
    if (r.status !== "fulfilled") return;
    r.value.forEach((poi) => {
      if (!poi?.id || seen.has(poi.id)) return;
      seen.add(poi.id);
      list.push(poi);
    });
  });
  return list.sort((a, b) => (a.distance ?? 99999) - (b.distance ?? 99999));
}

/**
 * 搜索附近宠物 POI（主入口）
 * 先搜 5000m，< 5 个自动扩至 10000m
 */
export async function searchPetPOI(lat, lng) {
  // 城市中等范围（~18km），每关键词翻 2 页；过少再扩到 30km
  let result = await mergeSearchREST(lat, lng, 18000, 2);
  if (result.length < 5) {
    result = await mergeSearchREST(lat, lng, 30000, 2);
  }
  return result;
}

/* 通用多关键词搜索：多页并行 + 去重(id/name+address) + 距离排序 */
async function searchByKeywords(lat, lng, keywords, radius, pages = 2) {
  const results = await Promise.allSettled(
    (keywords || []).map((kw) => searchKeywordPaged(lat, lng, kw, radius, pages))
  );
  const seen = new Set();
  const list = [];
  results.forEach((r) => {
    if (r.status !== "fulfilled") return;
    r.value.forEach((poi) => {
      const key = poi?.id || `${poi?.name}-${poi?.address}`;
      if (!key || seen.has(key)) return;
      seen.add(key);
      list.push(poi);
    });
  });
  return list.sort((a, b) => (a.distance ?? 99999) - (b.distance ?? 99999));
}

/**
 * 按分类搜索宠物 POI：
 *  - 用该分类 keywords 多关键词搜索(5km)
 *  - 结果过少且配置了 fallback → 合并 fallback 大类
 *  - 仍过少 → 扩到 10km
 *  - 去重 + 距离排序
 * category.id === "all" 时走通用 searchPetPOI。
 */
export async function searchCategoryPOI(lat, lng, category) {
  if (!category || category.id === "all") return searchPetPOI(lat, lng);

  const mergeInto = (list, extra) => {
    const seen = new Set(list.map((p) => p.id || `${p.name}-${p.address}`));
    extra.forEach((p) => {
      const k = p.id || `${p.name}-${p.address}`;
      if (!seen.has(k)) { seen.add(k); list.push(p); }
    });
    return list;
  };

  let list = await searchByKeywords(lat, lng, category.keywords, 18000, 2);
  if (list.length < 8 && category.fallback?.length) {
    mergeInto(list, await searchByKeywords(lat, lng, category.fallback, 18000, 2));
  }
  if (list.length < 5) {
    const wide = await searchByKeywords(lat, lng, [...(category.keywords || []), ...(category.fallback || [])], 30000, 2);
    mergeInto(list, wide);
  }
  return list.sort((a, b) => (a.distance ?? 99999) - (b.distance ?? 99999));
}

/**
 * 地点搜索（滴滴式输入提示）。用高德 inputtips，返回带坐标的候选地点。
 * @returns [{ id, name, address, district, lng, lat }]
 */
export async function searchPlaces(keyword, lat, lng) {
  const key = process.env.NEXT_PUBLIC_AMAP_WEB_KEY;
  if (!key || !keyword?.trim()) return [];
  let url = `https://restapi.amap.com/v3/assistant/inputtips?key=${key}&keywords=${encodeURIComponent(keyword.trim())}&datatype=poi`;
  if (lat != null && lng != null) url += `&location=${lng},${lat}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (data.status !== "1" || !Array.isArray(data.tips)) return [];
    return data.tips
      .filter((t) => typeof t.location === "string" && t.location.includes(","))
      .map((t) => {
        const [plng, plat] = t.location.split(",").map(Number);
        const district = [t.district].flat().filter(Boolean).join("");
        return {
          id: t.id || `${t.name}-${t.location}`,
          name: Array.isArray(t.name) ? t.name[0] : t.name,
          address: (Array.isArray(t.address) ? t.address[0] : t.address) || district || "",
          district,
          lng: plng, lat: plat,
        };
      })
      .filter((t) => !isNaN(t.lng) && !isNaN(t.lat));
  } catch {
    return [];
  }
}

/* ══════════════════════════════════════════════════════════
   4. 常量与工具函数
══════════════════════════════════════════════════════════ */
export const ALL_KEYWORDS = [
  "宠物医院", "宠物诊所", "宠物店",   "宠物用品",
  "宠物食品", "宠物美容", "宠物寄养", "宠物训练",
  "动物医院", "狗粮",     "猫粮",
];

export const CATEGORIES = [
  { id: "all",      label: "全部",     icon: "🐾", test: () => true },
  { id: "hospital", label: "医院/诊所", icon: "🏥", test: (p) => /医院|诊所|兽医/.test(p.name) },
  { id: "shop",     label: "食品/用品", icon: "🛍️", test: (p) => /食品|用品|宠物店|超市|狗粮|猫粮/.test(p.name) },
  { id: "grooming", label: "美容/寄养", icon: "✂️", test: (p) => /美容|寄养|洗澡|spa/i.test(p.name) },
  { id: "training", label: "训练",     icon: "🎓", test: (p) => /训练|学校/.test(p.name) },
];

/**
 * 从 POI 取坐标。
 * REST API 返回 "lng,lat" 字符串；
 * JS  API 返回 AMap.LngLat 对象 —— 两种都处理。
 */
export function getCoords(loc) {
  if (!loc) return null;
  // REST API: "121.47,31.23"
  if (typeof loc === "string") {
    const [lng, lat] = loc.split(",").map(Number);
    if (isNaN(lng) || isNaN(lat)) return null;
    return { lng, lat };
  }
  // JS API: AMap.LngLat 或 {lng, lat}
  const lng = typeof loc.getLng === "function" ? loc.getLng() : Number(loc.lng);
  const lat = typeof loc.getLat === "function" ? loc.getLat() : Number(loc.lat);
  if (isNaN(lng) || isNaN(lat)) return null;
  return { lng, lat };
}

export function fmtDist(m) {
  const n = Number(m);
  if (!m && m !== 0 || isNaN(n)) return "";
  return n < 1000 ? `${Math.round(n)}m` : `${(n / 1000).toFixed(1)}km`;
}

export function fmtTel(tel) {
  if (!tel) return null;
  const t = Array.isArray(tel) ? tel[0] : String(tel);
  return t.split(";")[0].trim() || null;
}

/** 打开高德地图导航（callnative=1 优先唤起 App）*/
export function openNavigation(poi) {
  const c = getCoords(poi.location);
  if (!c) return;
  const name = encodeURIComponent(poi.name || "");
  window.open(
    `https://uri.amap.com/navigation?to=${c.lng},${c.lat},${name}` +
    `&mode=walk&coordinate=gaode&callnative=1`,
    "_blank"
  );
}
