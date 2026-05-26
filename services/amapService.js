/**
 * services/amapService.js
 *
 * 高德地图 JSAPI v2.0 封装
 *
 * 关键：v2.0 的脚本 onload 时 window.AMap 可能还未挂载，
 *      必须通过 URL 中的 &callback=xxx 参数等待高德内部初始化完成。
 *
 * 环境变量（必须是这个名字）：
 *   process.env.NEXT_PUBLIC_AMAP_KEY
 */

/* ════════════════════════════════════════════════════════════
   脚本加载（单例，callback 模式）
════════════════════════════════════════════════════════════ */
let _promise = null;

export function loadAMap() {
  /* SSR 保护 */
  if (typeof window === "undefined") {
    return Promise.reject(new Error("AMap 只能在浏览器环境中使用"));
  }

  /* 已加载完成 */
  if (window.AMap && typeof window.AMap.Map === "function") {
    return Promise.resolve(window.AMap);
  }

  /* 正在加载中，返回同一个 Promise */
  if (_promise) return _promise;

  /* 读取 Key */
  const key = process.env.NEXT_PUBLIC_AMAP_KEY;
  if (!key) {
    return Promise.reject(
      new Error("缺少环境变量 NEXT_PUBLIC_AMAP_KEY，请检查 .env.local")
    );
  }

  _promise = new Promise((resolve, reject) => {
    /* ── callback 名称（挂在 window 上）─────────────────────── */
    const CB = "_tailme_amap_ready_";

    /* ── 防止重复插入 script ──────────────────────────────────
       如果已有同 key 的 script 标签（HMR 热更新场景），
       只需等待 callback 触发即可。                            */
    const existing = document.querySelector(
      `script[src*="webapi.amap.com"][src*="${key}"]`
    );

    /* ── 注册 callback ────────────────────────────────────────
       高德 v2.0 完全初始化后会调用 window[CB]()，
       此时 window.AMap 以及 plugin 均已就绪。                 */
    window[CB] = () => {
      delete window[CB];                          // 清理全局污染
      if (window.AMap && window.AMap.Map) {
        resolve(window.AMap);
      } else {
        _promise = null;
        reject(
          new Error(
            "高德地图初始化回调触发但 window.AMap 仍不存在，" +
            "请确认 API Key 已在高德控制台绑定当前域名（含 localhost）"
          )
        );
      }
    };

    /* ── 设置超时保底 ─────────────────────────────────────────
       15 秒内 callback 未触发视为失败                          */
    const timer = setTimeout(() => {
      if (window[CB]) {
        delete window[CB];
        _promise = null;
        reject(new Error("高德地图加载超时（15s），请检查网络"));
      }
    }, 15000);

    /* ── 成功后清 timer ───────────────────────────────────────*/
    const origCB = window[CB];
    window[CB] = () => {
      clearTimeout(timer);
      origCB();
    };

    if (existing) {
      /* script 已存在，等 callback 即可，不再插入 */
      return;
    }

    /* ── 插入 script ──────────────────────────────────────────
       URL 格式：v2.0 + plugin 列表 + callback 参数
       高德 v2.0 会在全部异步初始化完成后调用 callback。        */
    const s = document.createElement("script");
    s.type = "text/javascript";
    s.async = true;
    s.src =
      `https://webapi.amap.com/maps` +
      `?v=2.0` +
      `&key=${key}` +
      `&plugin=AMap.Geolocation,AMap.PlaceSearch,AMap.Scale,AMap.ToolBar` +
      `&callback=${CB}`;

    s.onerror = () => {
      clearTimeout(timer);
      if (window[CB]) delete window[CB];
      _promise = null;
      reject(
        new Error(
          "高德地图脚本加载失败：网络错误或 API Key 未授权此域名\n" +
          "请登录高德控制台 → 我的应用 → 白名单 → 添加 localhost:3000 或线上域名"
        )
      );
    };

    document.head.appendChild(s);
  });

  return _promise;
}

/* ════════════════════════════════════════════════════════════
   获取用户位置
   GPS → IP 定位 → 上海市中心（兜底）
════════════════════════════════════════════════════════════ */
export function getMyLocation(AMap) {
  return new Promise((resolve) => {
    try {
      const geo = new AMap.Geolocation({
        enableHighAccuracy: true,
        timeout:            8000,
        showButton:         false,
        showCircle:         false,
        showMarker:         false,
        panToLocation:      false,
        zoomToAccuracy:     false,
        noIpLocate:         0,        // 0 = GPS 失败允许 IP 定位
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

/* ════════════════════════════════════════════════════════════
   POI 搜索
════════════════════════════════════════════════════════════ */

/* 11 个宠物相关关键词 */
export const ALL_KEYWORDS = [
  "宠物医院", "宠物诊所", "宠物店",    "宠物用品",
  "宠物食品", "宠物美容", "宠物寄养",  "宠物训练",
  "动物医院", "狗粮",     "猫粮",
];

/* 单关键词搜索（永不 reject，失败返回空数组）*/
function searchOne(AMap, keyword, loc, radius) {
  return new Promise((resolve) => {
    try {
      const ps = new AMap.PlaceSearch({ pageSize: 25, pageIndex: 1 });
      ps.searchNearBy(
        keyword,
        [loc.lng, loc.lat],
        radius,
        (status, result) => {
          /* 无论 status 是什么，只要有 pois 数组就取 */
          const pois = result?.poiList?.pois;
          resolve(Array.isArray(pois) ? pois : []);
        }
      );
    } catch {
      resolve([]);
    }
  });
}

/* 合并所有关键词，去重，按距离排序 */
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

/**
 * 搜索附近宠物 POI
 * 先搜 5000m，结果 < 5 个自动扩大到 10000m
 */
export async function searchPetPOI(AMap, location) {
  let result = await mergeSearch(AMap, location, 5000);
  if (result.length < 5) {
    result = await mergeSearch(AMap, location, 10000);
  }
  return result;
}

/* ════════════════════════════════════════════════════════════
   分类（客户端过滤，不重新搜索）
════════════════════════════════════════════════════════════ */
export const CATEGORIES = [
  { id: "all",      label: "全部",     icon: "🐾", test: () => true },
  { id: "hospital", label: "医院/诊所", icon: "🏥", test: (p) => /医院|诊所|兽医/.test(p.name) },
  { id: "shop",     label: "食品/用品", icon: "🛍️", test: (p) => /食品|用品|宠物店|超市|狗粮|猫粮/.test(p.name) },
  { id: "grooming", label: "美容/寄养", icon: "✂️", test: (p) => /美容|寄养|洗澡|spa/i.test(p.name) },
  { id: "training", label: "训练",     icon: "🎓", test: (p) => /训练|学校/.test(p.name) },
];

/* ════════════════════════════════════════════════════════════
   工具函数
════════════════════════════════════════════════════════════ */
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

/*
 * ══════════════════════════════════════════════════════════
 * partner_shops 表数据结构预留（后期 Supabase 接入）
 * {
 *   id, shop_name, address, lat, lng, phone,
 *   tags: string[], is_partner: boolean,
 *   discount_info: string | null,
 *   opening_hours: string | null,
 *   created_at
 * }
 * ══════════════════════════════════════════════════════════
 */
