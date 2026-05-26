/**
 * services/amapService.js
 *
 * 高德 JSAPI v2.0 — 使用官方 @amap/amap-jsapi-loader 初始化
 *
 * 前置：npm install @amap/amap-jsapi-loader
 *
 * 环境变量：
 *   NEXT_PUBLIC_AMAP_KEY
 *   NEXT_PUBLIC_AMAP_SECURITY_CODE
 */

let _promise = null;

export function loadAMap() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("AMap 只能在浏览器中使用"));
  }

  /* 已加载完成 */
  if (window.AMap && typeof window.AMap.Map === "function") {
    return Promise.resolve(window.AMap);
  }

  /* 复用进行中的 Promise */
  if (_promise) return _promise;

  const key  = process.env.NEXT_PUBLIC_AMAP_KEY;
  const code = process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE;

  if (!key) {
    return Promise.reject(new Error("缺少 NEXT_PUBLIC_AMAP_KEY"));
  }

  /* 必须在 AMapLoader.load() 之前设置 */
  if (code) {
    window._AMapSecurityConfig = { securityJsCode: code };
  }

  _promise = import("@amap/amap-jsapi-loader")
    .then((mod) => {
      const AMapLoader = mod.default ?? mod;
      return AMapLoader.load({
        key,
        version: "2.0",
        plugins: [
          "AMap.Geolocation",
          "AMap.PlaceSearch",
          "AMap.Scale",
          "AMap.ToolBar",
        ],
      });
    })
    .then((AMap) => {
      /* 挂到 window，方便 MapTab 的 useEffect 直接访问 */
      window.AMap = AMap;
      return AMap;
    })
    .catch((err) => {
      _promise = null;
      throw new Error("高德地图加载失败：" + (err?.message || String(err)));
    });

  return _promise;
}

/* ═══════════════════════════════════════════════════════════
   获取用户位置
   GPS → IP 定位 → 上海市中心（兜底）
═══════════════════════════════════════════════════════════ */
export function getMyLocation(AMap) {
  return new Promise((resolve) => {
    try {
      const geo = new AMap.Geolocation({
        enableHighAccuracy: true,
        timeout:            8000,
        noIpLocate:         0,
        showButton:         false,
        showCircle:         false,
        showMarker:         false,
        panToLocation:      false,
        zoomToAccuracy:     false,
      });
      geo.getCurrentPosition((status, result) => {
        if (status === "complete" && result?.position) {
          resolve({
            lng:    result.position.getLng(),
            lat:    result.position.getLat(),
            source: "gps",
            city:   result.addressComponent?.city || "",
          });
        } else {
          resolve({ lng: 121.4737, lat: 31.2304, source: "default", city: "上海市" });
        }
      });
    } catch {
      resolve({ lng: 121.4737, lat: 31.2304, source: "default", city: "上海市" });
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   POI 搜索
═══════════════════════════════════════════════════════════ */
export const ALL_KEYWORDS = [
  "宠物医院", "宠物诊所", "宠物店",   "宠物用品",
  "宠物食品", "宠物美容", "宠物寄养", "宠物训练",
  "动物医院", "狗粮",     "猫粮",
];

function searchOne(AMap, keyword, loc, radius) {
  return new Promise((resolve) => {
    try {
      const ps = new AMap.PlaceSearch({ pageSize: 25, pageIndex: 1 });
      ps.searchNearBy(keyword, [loc.lng, loc.lat], radius, (status, result) => {
        const pois = result?.poiList?.pois;
        resolve(Array.isArray(pois) ? pois : []);
      });
    } catch {
      resolve([]);
    }
  });
}

async function mergeSearch(AMap, loc, radius) {
  const settled = await Promise.allSettled(
    ALL_KEYWORDS.map((kw) => searchOne(AMap, kw, loc, radius))
  );
  const seen = new Set();
  const list = [];
  settled.forEach((r) => {
    if (r.status !== "fulfilled") return;
    r.value.forEach((poi) => {
      if (!poi?.id || seen.has(poi.id)) return;
      seen.add(poi.id);
      list.push(poi);
    });
  });
  return list.sort((a, b) => (a.distance ?? 99999) - (b.distance ?? 99999));
}

export async function searchPetPOI(AMap, location) {
  let result = await mergeSearch(AMap, location, 5000);
  if (result.length < 5) result = await mergeSearch(AMap, location, 10000);
  return result;
}

/* ═══════════════════════════════════════════════════════════
   分类（客户端过滤，不重新搜索）
═══════════════════════════════════════════════════════════ */
export const CATEGORIES = [
  { id: "all",      label: "全部",     icon: "🐾", test: () => true },
  { id: "hospital", label: "医院/诊所", icon: "🏥", test: (p) => /医院|诊所|兽医/.test(p.name) },
  { id: "shop",     label: "食品/用品", icon: "🛍️", test: (p) => /食品|用品|宠物店|超市|狗粮|猫粮/.test(p.name) },
  { id: "grooming", label: "美容/寄养", icon: "✂️", test: (p) => /美容|寄养|洗澡|spa/i.test(p.name) },
  { id: "training", label: "训练",     icon: "🎓", test: (p) => /训练|学校/.test(p.name) },
];

/* ═══════════════════════════════════════════════════════════
   工具函数
═══════════════════════════════════════════════════════════ */
export function getCoords(loc) {
  if (!loc) return null;
  const lng = typeof loc.getLng === "function" ? loc.getLng() : Number(loc.lng);
  const lat = typeof loc.getLat === "function" ? loc.getLat() : Number(loc.lat);
  if (isNaN(lng) || isNaN(lat)) return null;
  return { lng, lat };
}

export function fmtDist(m) {
  const n = Number(m);
  if (!m || isNaN(n)) return "";
  return n < 1000 ? `${Math.round(n)}m` : `${(n / 1000).toFixed(1)}km`;
}

export function fmtTel(tel) {
  if (!tel) return null;
  const t = Array.isArray(tel) ? tel[0] : String(tel);
  return t.split(";")[0].trim() || null;
}

export function openNavigation(poi) {
  const c = getCoords(poi.location);
  if (!c) return;
  const name = encodeURIComponent(poi.name || "");
  window.open(
    `https://uri.amap.com/navigation?to=${c.lng},${c.lat},${name}&mode=walk&coordinate=gaode&callnative=1`,
    "_blank"
  );
}
