/**
 * services/amapService.js  ——  调试诊断版
 *
 * 环境变量（Vercel + .env.local 均需配置）：
 *   NEXT_PUBLIC_AMAP_KEY
 *   NEXT_PUBLIC_AMAP_SECURITY_CODE
 *
 * 此版本会把每一步的状态输出到控制台（console.log/error），
 * 并通过 getDebugLogs() 暴露给 UI 渲染，方便线上排查。
 */

/* ─────────────────────────────────────────────────────────
   调试日志（同时写 console + 内存数组，UI 可读取）
───────────────────────────────────────────────────────── */
const _logs = [];

function dbg(msg) {
  const line = "[AMap " + new Date().toISOString().slice(11, 23) + "] " + msg;
  _logs.push(line);
  console.log(line);
}

function dbgErr(msg) {
  const line = "[AMap ERR " + new Date().toISOString().slice(11, 23) + "] " + msg;
  _logs.push(line);
  console.error(line);
}

/** MapTab 可调用此函数，把日志渲染到错误 UI */
export function getDebugLogs() {
  return _logs.slice();
}

/* ─────────────────────────────────────────────────────────
   单例 Promise
───────────────────────────────────────────────────────── */
let _promise = null;

export function loadAMap() {

  /* SSR 保护 */
  if (typeof window === "undefined") {
    return Promise.reject(new Error("AMap 只能在浏览器环境中使用"));
  }

  /* 已加载完成 */
  if (window.AMap && typeof window.AMap.Map === "function") {
    dbg("✅ window.AMap 已存在，跳过加载");
    return Promise.resolve(window.AMap);
  }

  /* 复用进行中的 Promise */
  if (_promise) {
    dbg("已有进行中的 Promise，复用");
    return _promise;
  }

  /* ── 读取并诊断环境变量 ────────────────────────────────── */
  var key          = process.env.NEXT_PUBLIC_AMAP_KEY;
  var securityCode = process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE;

  dbg("NEXT_PUBLIC_AMAP_KEY = " + (
    key
      ? '"' + key.slice(0, 6) + "…" + key.slice(-4) + '"（共' + key.length + "字符）"
      : "❌ 未找到——请检查 Vercel Environment Variables"
  ));

  dbg("NEXT_PUBLIC_AMAP_SECURITY_CODE = " + (
    securityCode
      ? '"' + securityCode.slice(0, 4) + "…"  + '"（共' + securityCode.length + "字符）"
      : "⚠️  未配置——高德 v2.0 新建应用大概率需要此值"
  ));

  if (!key) {
    var e0 = new Error("缺少 NEXT_PUBLIC_AMAP_KEY，请在 Vercel 环境变量中配置");
    dbgErr(e0.message);
    return Promise.reject(e0);
  }

  _promise = new Promise(function(resolve, reject) {

    /* ── 1. 注入安全密钥（必须在 script 之前）──────────────── */
    if (securityCode) {
      window._AMapSecurityConfig = { securityJsCode: securityCode };
      dbg("window._AMapSecurityConfig 已设置: " + JSON.stringify(window._AMapSecurityConfig));
    } else {
      dbg("window._AMapSecurityConfig 未设置（无 NEXT_PUBLIC_AMAP_SECURITY_CODE）");
    }

    /* ── 2. callback 名称 ──────────────────────────────────── */
    var CB = "_tailme_amap_cb_";
    dbg("callback 函数名: window[\"" + CB + "\"]");

    /* ── 3. cleanup 辅助 ───────────────────────────────────── */
    function cleanup() {
      clearTimeout(timer);
      if (window[CB]) delete window[CB];
      _promise = null;
    }

    /* ── 4. 超时 40s ───────────────────────────────────────── */
    var timer = setTimeout(function() {
      dbgErr("⏰ 超时（40s）——诊断信息：");
      dbgErr("  window.AMap 存在? " + !!window.AMap);
      dbgErr("  window[\"" + CB + "\"] 存在? " + (typeof window[CB] === "function"));
      dbgErr("  window._AMapSecurityConfig = " + JSON.stringify(window._AMapSecurityConfig || null));

      /* 打印所有 amap script 标签 */
      var amapScripts = Array.prototype.filter.call(
        document.querySelectorAll("script"),
        function(s) { return s.src && s.src.indexOf("amap") !== -1; }
      );
      if (amapScripts.length === 0) {
        dbgErr("  DOM 中没有找到任何含 'amap' 的 script 标签（插入可能失败）");
      } else {
        amapScripts.forEach(function(s) {
          dbgErr("  script.src = " + s.src);
          dbgErr("  script.outerHTML = " + s.outerHTML);
        });
      }

      cleanup();
      reject(new Error(
        "高德地图加载超时（40s）\n" +
        "Key 前6位: " + key.slice(0, 6) + "\n" +
        "Security code: " + (securityCode ? "已配置（" + securityCode.length + "字符）" : "未配置") + "\n" +
        "详情请查看浏览器控制台中的 [AMap ...] 日志"
      ));
    }, 40000);

    /* ── 5. 注册 callback ──────────────────────────────────── */
    window[CB] = function() {
      dbg("✅ callback \"" + CB + "\" 已触发");
      clearTimeout(timer);
      delete window[CB];

      if (window.AMap && typeof window.AMap.Map === "function") {
        dbg("✅ window.AMap.Map 存在，加载完成");
        resolve(window.AMap);
      } else {
        dbgErr("callback 触发但 window.AMap.Map 不存在");
        dbgErr("window.AMap = " + JSON.stringify(window.AMap));
        _promise = null;
        reject(new Error(
          "高德 callback 触发但 window.AMap.Map 不存在\n" +
          "请确认 API Key 类型为「Web端(JS API)」而非「Web服务」"
        ));
      }
    };

    /* ── 6. 防止重复插入 ───────────────────────────────────── */
    var existing = document.querySelector(
      "script[src*=\"webapi.amap.com\"][src*=\"" + key + "\"]"
    );
    if (existing) {
      dbg("script 标签已存在，等待 callback。src = " + existing.getAttribute("src"));
      return;
    }

    /* ── 7. 构造 src ───────────────────────────────────────── */
    var src =
      "https://webapi.amap.com/maps" +
      "?v=2.0" +
      "&key=" + key +
      "&plugin=AMap.Geolocation,AMap.PlaceSearch,AMap.Scale,AMap.ToolBar" +
      "&callback=" + CB;

    dbg("准备插入 script，src = " + src);

    /* ── 8. 创建并插入 script ──────────────────────────────── */
    var script   = document.createElement("script");
    script.type  = "text/javascript";
    script.async = true;
    script.src   = src;

    script.onload = function() {
      dbg("script onload 触发（v2.0 onload 时 AMap 不一定就绪，等待 callback）");
      dbg("  window.AMap 存在? " + !!window.AMap);
    };

    script.onerror = function(evt) {
      var errSrc = (evt && evt.target && evt.target.src) ? evt.target.src : src;
      dbgErr("❌ script onerror 触发！");
      dbgErr("  src = " + errSrc);
      dbgErr("  这通常意味着：域名未在高德控制台白名单 / 网络拦截 / Key 无效");
      cleanup();
      reject(new Error(
        "高德脚本 onerror\n" +
        "src = " + errSrc + "\n" +
        "请检查：① 高德控制台白名单是否包含 tailmepuppy.cn\n" +
        "        ② API Key 类型是否为 Web端(JS API)\n" +
        "        ③ Vercel 网络是否可以访问 webapi.amap.com"
      ));
    };

    document.head.appendChild(script);
    dbg("script 已插入 DOM：" + script.outerHTML.slice(0, 200));
  });

  return _promise;
}

/* ═══════════════════════════════════════════════════════════
   获取用户位置
   GPS → IP → 上海市中心兜底
═══════════════════════════════════════════════════════════ */
export function getMyLocation(AMap) {
  return new Promise(function(resolve) {
    try {
      var geo = new AMap.Geolocation({
        enableHighAccuracy: true,
        timeout:            8000,
        noIpLocate:         0,
        showButton:         false,
        showCircle:         false,
        showMarker:         false,
        panToLocation:      false,
        zoomToAccuracy:     false,
      });
      geo.getCurrentPosition(function(status, result) {
        if (status === "complete" && result && result.position) {
          resolve({
            lng:    result.position.getLng(),
            lat:    result.position.getLat(),
            source: "gps",
            city:   (result.addressComponent && result.addressComponent.city) || "",
          });
        } else {
          resolve({ lng: 121.4737, lat: 31.2304, source: "default", city: "上海市" });
        }
      });
    } catch (err) {
      resolve({ lng: 121.4737, lat: 31.2304, source: "default", city: "上海市" });
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   POI 搜索
═══════════════════════════════════════════════════════════ */
export var ALL_KEYWORDS = [
  "宠物医院", "宠物诊所", "宠物店",   "宠物用品",
  "宠物食品", "宠物美容", "宠物寄养", "宠物训练",
  "动物医院", "狗粮",     "猫粮",
];

function searchOne(AMap, keyword, loc, radius) {
  return new Promise(function(resolve) {
    try {
      var ps = new AMap.PlaceSearch({ pageSize: 25, pageIndex: 1 });
      ps.searchNearBy(keyword, [loc.lng, loc.lat], radius, function(status, result) {
        var pois = result && result.poiList && result.poiList.pois;
        resolve(Array.isArray(pois) ? pois : []);
      });
    } catch (err) {
      resolve([]);
    }
  });
}

function mergeSearch(AMap, loc, radius) {
  return Promise.allSettled(
    ALL_KEYWORDS.map(function(kw) { return searchOne(AMap, kw, loc, radius); })
  ).then(function(settled) {
    var seen = new Set();
    var list = [];
    settled.forEach(function(r) {
      if (r.status !== "fulfilled") return;
      r.value.forEach(function(poi) {
        if (!poi || !poi.id || seen.has(poi.id)) return;
        seen.add(poi.id);
        list.push(poi);
      });
    });
    return list.sort(function(a, b) {
      return (a.distance != null ? a.distance : 99999) -
             (b.distance != null ? b.distance : 99999);
    });
  });
}

export function searchPetPOI(AMap, location) {
  return mergeSearch(AMap, location, 5000).then(function(result) {
    if (result.length < 5) {
      return mergeSearch(AMap, location, 10000);
    }
    return result;
  });
}

/* ═══════════════════════════════════════════════════════════
   分类
═══════════════════════════════════════════════════════════ */
export var CATEGORIES = [
  { id: "all",      label: "全部",     icon: "🐾", test: function() { return true; } },
  { id: "hospital", label: "医院/诊所", icon: "🏥", test: function(p) { return /医院|诊所|兽医/.test(p.name); } },
  { id: "shop",     label: "食品/用品", icon: "🛍️", test: function(p) { return /食品|用品|宠物店|超市|狗粮|猫粮/.test(p.name); } },
  { id: "grooming", label: "美容/寄养", icon: "✂️", test: function(p) { return /美容|寄养|洗澡|spa/i.test(p.name); } },
  { id: "training", label: "训练",     icon: "🎓", test: function(p) { return /训练|学校/.test(p.name); } },
];

/* ═══════════════════════════════════════════════════════════
   工具函数
═══════════════════════════════════════════════════════════ */
export function getCoords(loc) {
  if (!loc) return null;
  var lng = typeof loc.getLng === "function" ? loc.getLng() : Number(loc.lng);
  var lat = typeof loc.getLat === "function" ? loc.getLat() : Number(loc.lat);
  if (isNaN(lng) || isNaN(lat)) return null;
  return { lng: lng, lat: lat };
}

export function fmtDist(m) {
  var n = Number(m);
  if (!m || isNaN(n)) return "";
  return n < 1000 ? Math.round(n) + "m" : (n / 1000).toFixed(1) + "km";
}

export function fmtTel(tel) {
  if (!tel) return null;
  var t = Array.isArray(tel) ? tel[0] : String(tel);
  return t.split(";")[0].trim() || null;
}

export function openNavigation(poi) {
  var c = getCoords(poi.location);
  if (!c) return;
  var name = encodeURIComponent(poi.name || "");
  window.open(
    "https://uri.amap.com/navigation?to=" + c.lng + "," + c.lat + "," + name +
    "&mode=walk&coordinate=gaode&callnative=1",
    "_blank"
  );
}
