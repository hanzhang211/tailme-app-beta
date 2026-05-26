/**
 * services/amapService.js
 *
 * 高德 JSAPI v2.0
 * 加载方式：script.onload + 轮询 window.AMap（不使用 callback 参数）
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

  if (window.AMap && typeof window.AMap.Map === "function") {
    return Promise.resolve(window.AMap);
  }

  if (_promise) return _promise;

  const key  = process.env.NEXT_PUBLIC_AMAP_KEY;
  const code = process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE;

  if (!key) {
    return Promise.reject(new Error("缺少 NEXT_PUBLIC_AMAP_KEY"));
  }

  _promise = new Promise((resolve, reject) => {

    /* 1. 注入安全密钥（必须在 script 之前） */
    if (code) {
      window._AMapSecurityConfig = { securityJsCode: code };
    }

    /* 2. 防止重复插入 */
    const exists = document.querySelector("script[data-amap-key]");
    if (!exists) {
      const script = document.createElement("script");
      script.setAttribute("data-amap-key", key);
      script.src =
        "https://webapi.amap.com/maps?v=2.0" +
        "&key=" + key +
        "&plugin=AMap.Geolocation,AMap.PlaceSearch,AMap.Scale,AMap.ToolBar";

      script.onerror = (e) => {
        _promise = null;
        reject(new Error(
          "高德脚本加载失败（onerror）。" +
          "请检查：域名白名单 / Key 类型是否为 Web端(JS API) / 网络。" +
          "\nsrc=" + script.src
        ));
      };

      document.head.appendChild(script);
    }

    /* 3. script.onload 后轮询 window.AMap，最多 10 秒 */
    const startTime = Date.now();
    const TIMEOUT   = 10000;
    const INTERVAL  = 100;

    function poll() {
      if (window.AMap && typeof window.AMap.Map === "function") {
        resolve(window.AMap);
        return;
      }

      const elapsed = Date.now() - startTime;
      if (elapsed >= TIMEOUT) {
        _promise = null;
        reject(new Error(
          "高德 JSAPI 脚本已加载但 window.AMap 在 " + TIMEOUT / 1000 + "s 内未就绪。\n" +
          "window.AMap = " + JSON.stringify(window.AMap) + "\n" +
          "window._AMapSecurityConfig = " + JSON.stringify(window._AMapSecurityConfig ?? null) + "\n" +
          "Key 前6位: " + key.slice(0, 6)
        ));
        return;
      }

      setTimeout(poll, INTERVAL);
    }

    /* 稍微等一帧再开始轮询，让 script 有机会执行 */
    setTimeout(poll, 0);
  });

  return _promise;
}

/* ═══════════════════════════════════════════════════════════
   获取用户位置
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
   分类
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
