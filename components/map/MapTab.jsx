"use client";

/**
 * components/map/MapTab.jsx
 *
 * 高德地图地图 Tab —— TailMe 宠物友好地图
 *
 * 功能：
 *   - 动态加载高德 JS API（无 SSR 报错）
 *   - 自动定位 → 地图渲染 → POI 周边搜索
 *   - 分类筛选（6个分类）
 *   - POI 列表 + Marker 联动
 *   - 底部弹窗详情 + "用高德地图打开"
 *   - 无真实搜索结果时显示"暂未找到"，不展示假数据
 *
 * 依赖：
 *   services/amapService.js
 *   NEXT_PUBLIC_AMAP_KEY 环境变量
 */

import { useState, useEffect, useRef } from "react";
import {
  loadAmapScript,
  getUserLocation,
  searchByCategory,
  POI_CATEGORIES,
  getCoords,
  formatDistance,
  formatTel,
  openInAMap,
} from "@/services/amapService";

/* ──────────────────────────── Theme ──────────────────────────── */
const C = {
  pri:    "#FF7A5A",
  grad:   "linear-gradient(135deg,#FF7A5A 0%,#FFB347 100%)",
  bg:     "#FFFBF4",
  card:   "#FFFFFF",
  text:   "#1A1006",
  sub:    "#9B8B76",
  light:  "#FFF8ED",
  border: "#F0E8D8",
};

/* ══════════════════════════════════════════════════════════════
   MAP TAB  (主组件)
══════════════════════════════════════════════════════════════ */
export default function MapTab() {
  /* ── refs ─────────────────────────────────────────────────── */
  const containerRef  = useRef(null);  // 地图 DOM 容器
  const mapRef        = useRef(null);  // AMap.Map 实例
  const poiMarkersRef = useRef([]);    // POI markers（切换分类时清除）

  /* ── 地图初始化状态 ───────────────────────────────────────── */
  const [mapState, setMapState]   = useState("loading"); // loading | ready | error
  const [mapError, setMapError]   = useState(null);
  const [location, setLocation]   = useState(null);  // { lng, lat, source, city }

  /* ── 搜索状态 ─────────────────────────────────────────────── */
  const [activeCat, setActiveCat] = useState(POI_CATEGORIES[0]);
  const [pois, setPois]           = useState(null); // null=未搜/加载中, []=空结果
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState(null);

  /* ── 详情状态 ─────────────────────────────────────────────── */
  const [selPoi, setSelPoi] = useState(null);

  /* ══════════════════════════════════════════════════════════
     EFFECT 1 — 初始化地图（只跑一次）
  ══════════════════════════════════════════════════════════ */
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        /* 1. 加载高德脚本 */
        const AMap = await loadAmapScript();
        if (!alive || !containerRef.current) return;

        /* 2. 获取用户位置（GPS → IP → 上海）*/
        const loc = await getUserLocation(AMap);
        if (!alive) return;
        setLocation(loc);

        /* 3. 创建地图 */
        const map = new AMap.Map(containerRef.current, {
          zoom:          14,
          center:        [loc.lng, loc.lat],
          mapStyle:      "amap://styles/light",
          resizeEnable:  true,
          features:      ["bg", "road", "building", "point"],
        });
        mapRef.current = map;

        /* 4. 用户位置 marker（暖红圆点） */
        new AMap.Marker({
          map,
          position: [loc.lng, loc.lat],
          content:  `<div style="
            width:18px;height:18px;border-radius:50%;
            background:#FF7A5A;border:3px solid #fff;
            box-shadow:0 2px 10px rgba(255,122,90,0.55);
          "></div>`,
          anchor: "center",
          zIndex: 200,
          title:  "您的位置",
        });

        if (alive) setMapState("ready");
      } catch (err) {
        if (alive) {
          setMapState("error");
          setMapError(err.message);
        }
      }
    })();

    return () => {
      alive = false;
      /* 清理 markers */
      poiMarkersRef.current.forEach((m) => m.setMap(null));
      poiMarkersRef.current = [];
      /* 销毁地图实例 */
      if (mapRef.current) {
        try { mapRef.current.destroy(); } catch {}
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ══════════════════════════════════════════════════════════
     EFFECT 2 — 分类/位置变化时重新搜索
  ══════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (mapState !== "ready" || !location) return;

    let alive = true;
    setSearching(true);
    setSearchErr(null);
    setPois(null);
    setSelPoi(null);

    /* 清除上次 POI markers */
    poiMarkersRef.current.forEach((m) => m.setMap(null));
    poiMarkersRef.current = [];

    (async () => {
      try {
        const AMap = window.AMap;
        const results = await searchByCategory(AMap, activeCat, location);
        if (!alive) return;

        setPois(results);

        /* 为每个 POI 添加 marker */
        results.slice(0, 40).forEach((poi) => {
          const coords = getCoords(poi.location);
          if (!coords) return;

          const marker = new AMap.Marker({
            map:      mapRef.current,
            position: [coords.lng, coords.lat],
            content:  `<div style="
              width:32px;height:32px;border-radius:50%;
              background:#fff;border:2.5px solid #FF7A5A;
              display:flex;align-items:center;justify-content:center;
              font-size:14px;
              box-shadow:0 2px 8px rgba(0,0,0,0.18);
              cursor:pointer;
            ">${activeCat.icon}</div>`,
            anchor: "center",
            zIndex:  100,
            title:   poi.name,
          });

          marker.on("click", () => setSelPoi(poi));
          poiMarkersRef.current.push(marker);
        });
      } catch (err) {
        if (alive) setSearchErr(err.message);
      } finally {
        if (alive) setSearching(false);
      }
    })();

    return () => { alive = false; };
  }, [mapState, location, activeCat]);

  /* ── 点击地图空白关闭详情 ──────────────────────────────────── */
  useEffect(() => {
    if (!mapRef.current || !selPoi) return;
    const handler = () => setSelPoi(null);
    mapRef.current.on("click", handler);
    return () => mapRef.current?.off("click", handler);
  }, [selPoi]);

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */
  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      background: C.bg, position: "relative", overflow: "hidden",
    }}>

      {/* ── 顶部标题栏 ───────────────────────────────────────── */}
      <div style={{ background: "white", padding: "52px 18px 12px", flexShrink: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>
          🗺️ 宠物友好地图
        </div>
        <LocationHint state={mapState} location={location} />
      </div>

      {/* ── 分类筛选栏 ───────────────────────────────────────── */}
      <CategoryFilter
        categories={POI_CATEGORIES}
        active={activeCat}
        onChange={(cat) => {
          setActiveCat(cat);
          setSelPoi(null);
        }}
      />

      {/* ── 地图区域 ─────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, height: 240, position: "relative", background: "#E4EDE4" }}>
        {/* 高德地图挂载容器 */}
        <div
          ref={containerRef}
          style={{ width: "100%", height: "100%" }}
        />

        {/* 加载遮罩 */}
        {mapState === "loading" && (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "rgba(255,251,244,0.88)", gap: 8,
          }}>
            <div style={{ fontSize: 26, animation: "tm-spin 1.2s linear infinite" }}>⟳</div>
            <div style={{ fontSize: 12, color: C.sub }}>地图加载中...</div>
          </div>
        )}

        {/* 错误遮罩 */}
        {mapState === "error" && (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: C.bg, padding: 20, gap: 10,
          }}>
            <div style={{ fontSize: 32 }}>⚠️</div>
            <div style={{ fontSize: 13, color: "#D94040", textAlign: "center", lineHeight: 1.5 }}>
              {mapError || "地图加载失败"}
            </div>
            <div style={{ fontSize: 11, color: C.sub, textAlign: "center" }}>
              请检查 NEXT_PUBLIC_AMAP_KEY 配置
            </div>
          </div>
        )}

        {/* 定位来源角标 */}
        {mapState === "ready" && location?.source === "default" && (
          <div style={{
            position: "absolute", bottom: 8, left: 8,
            background: "rgba(255,122,90,0.9)", color: "white",
            borderRadius: 12, padding: "3px 10px", fontSize: 10, fontWeight: 600,
          }}>
            📍 定位失败 · 已显示上海市中心
          </div>
        )}
      </div>

      {/* ── POI 列表 ─────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px 80px" }}>

        {/* 搜索状态提示 */}
        <div style={{
          fontSize: 11, color: C.sub, marginBottom: 10,
          fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
        }}>
          {searching ? (
            <>
              <span style={{ animation: "tm-spin 1s linear infinite", display: "inline-block" }}>⟳</span>
              搜索{activeCat.label}中...
            </>
          ) : searchErr ? (
            <span style={{ color: "#D94040" }}>⚠️ {searchErr}</span>
          ) : pois === null ? (
            "等待地图就绪..."
          ) : (
            `找到 ${pois.length} 个${activeCat.id === "all" ? "宠物相关" : activeCat.label}地点`
          )}
        </div>

        {/* 无结果 */}
        {!searching && pois !== null && pois.length === 0 && !searchErr && (
          <EmptyState category={activeCat} />
        )}

        {/* POI 卡片列表 */}
        {(pois || []).map((poi) => (
          <PoiCard
            key={poi.id}
            poi={poi}
            icon={activeCat.icon}
            selected={selPoi?.id === poi.id}
            onSelect={() => {
              setSelPoi(poi);
              /* 地图移动到 marker */
              const coords = getCoords(poi.location);
              if (coords && mapRef.current) {
                mapRef.current.setCenter([coords.lng, coords.lat]);
              }
            }}
          />
        ))}
      </div>

      {/* ── 详情底部弹窗 ─────────────────────────────────────── */}
      {selPoi && (
        <PoiDetailSheet
          poi={selPoi}
          onClose={() => setSelPoi(null)}
        />
      )}

      {/* ── 动画 keyframes ───────────────────────────────────── */}
      <style>{`
        @keyframes tm-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        /* 隐藏滚动条（移动端） */
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SUB-COMPONENT: LocationHint
══════════════════════════════════════════════════════════════ */
function LocationHint({ state, location }) {
  if (state === "loading") {
    return <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>正在定位...</div>;
  }
  if (state === "error") {
    return <div style={{ fontSize: 12, color: "#D94040", marginTop: 2 }}>地图加载失败</div>;
  }
  if (!location) return null;

  return (
    <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
      {location.source === "gps"
        ? `📍 已获取当前位置${location.city ? ` · ${location.city}` : ""}`
        : "📍 默认显示上海市中心"}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SUB-COMPONENT: CategoryFilter
══════════════════════════════════════════════════════════════ */
function CategoryFilter({ categories, active, onChange }) {
  return (
    <div style={{
      background: "white",
      borderBottom: `1px solid ${C.border}`,
      padding: "8px 14px",
      display: "flex",
      gap: 8,
      overflowX: "auto",
      scrollbarWidth: "none",
      flexShrink: 0,
    }}>
      {categories.map((cat) => {
        const isActive = active.id === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onChange(cat)}
            style={{
              flexShrink: 0,
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all .2s",
              whiteSpace: "nowrap",
              background: isActive
                ? "linear-gradient(135deg,#FF7A5A 0%,#FFB347 100%)"
                : C.light,
              color:  isActive ? "white" : "#5A4A35",
              border: `1.5px solid ${isActive ? "transparent" : C.border}`,
            }}
          >
            {cat.icon} {cat.label}
          </button>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SUB-COMPONENT: PoiCard (列表卡片)
══════════════════════════════════════════════════════════════ */
function PoiCard({ poi, icon, selected, onSelect }) {
  const dist     = formatDistance(poi.distance);
  const typeLabel = poi.type ? poi.type.split(";").slice(-1)[0] : "";

  return (
    <div
      onClick={onSelect}
      style={{
        background:    "white",
        borderRadius:  18,
        padding:       14,
        marginBottom:  10,
        boxShadow:     "0 2px 12px rgba(0,0,0,0.06)",
        cursor:        "pointer",
        display:       "flex",
        gap:           12,
        alignItems:    "flex-start",
        border:        `1.5px solid ${selected ? C.pri : "transparent"}`,
        transition:    "border-color .15s",
      }}
    >
      {/* 图标 */}
      <div style={{
        width: 46, height: 46, borderRadius: 14,
        background: C.light, display: "flex",
        alignItems: "center", justifyContent: "center",
        fontSize: 22, flexShrink: 0,
      }}>
        {icon}
      </div>

      {/* 文字 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 700, color: C.text,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {poi.name}
        </div>
        <div style={{
          fontSize: 11, color: C.sub, marginTop: 3,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          📍 {poi.address || poi.adname || "地址未知"}
        </div>
        {typeLabel && (
          <div style={{ marginTop: 6 }}>
            <span style={{
              fontSize: 10, background: "#FFF3E0", color: C.pri,
              padding: "2px 8px", borderRadius: 20, fontWeight: 500,
            }}>
              {typeLabel}
            </span>
          </div>
        )}
      </div>

      {/* 距离 */}
      {dist && (
        <div style={{ flexShrink: 0, paddingTop: 2 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.pri }}>{dist}</div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SUB-COMPONENT: PoiDetailSheet (底部详情弹窗)
══════════════════════════════════════════════════════════════ */
function PoiDetailSheet({ poi, onClose }) {
  const dist      = formatDistance(poi.distance);
  const tel       = formatTel(poi.tel);
  const typeLabel = poi.type ? poi.type.split(";").slice(-1)[0] : "";
  const addr      = poi.address || poi.adname || "";

  return (
    <div
      style={{
        position:   "absolute",
        inset:      0,
        zIndex:     50,
        background: "rgba(26,16,6,0.46)",
        display:    "flex",
        alignItems: "flex-end",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width:         "100%",
        background:    "white",
        borderRadius:  "24px 24px 0 0",
        padding:       "20px 20px 40px",
        boxSizing:     "border-box",
        maxHeight:     "72%",
        overflowY:     "auto",
      }}>
        {/* 拖拽指示条 */}
        <div style={{
          width: 40, height: 4, borderRadius: 4,
          background: "#E0D4C8", margin: "0 auto 20px",
        }} />

        {/* 名称 */}
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 8 }}>
          {poi.name}
        </div>

        {/* 分类标签 */}
        {typeLabel && (
          <span style={{
            display: "inline-block", fontSize: 11,
            background: "#FFF3E0", color: C.pri,
            padding: "3px 10px", borderRadius: 20,
            marginBottom: 14, fontWeight: 600,
          }}>
            {typeLabel}
          </span>
        )}

        {/* 信息列表 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {addr && (
            <InfoRow icon="📍" text={addr} />
          )}
          {dist && (
            <InfoRow icon="📏" text={`距您约 ${dist}`} />
          )}
          {tel && (
            <InfoRow
              icon="📞"
              text={tel}
              link={`tel:${tel}`}
              linkLabel="拨打"
            />
          )}
        </div>

        {/* 操作按钮 */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => openInAMap(poi)}
            style={{
              flex:         1,
              padding:      "14px 0",
              borderRadius: 16,
              background:   C.grad,
              color:        "white",
              fontSize:     14,
              fontWeight:   700,
              border:       "none",
              cursor:       "pointer",
            }}
          >
            🗺️ 用高德地图打开
          </button>
          <button
            onClick={onClose}
            style={{
              width:        48,
              height:       48,
              borderRadius: 14,
              background:   C.light,
              border:       `1.5px solid ${C.border}`,
              cursor:       "pointer",
              fontSize:     16,
              color:        C.sub,
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── InfoRow helper ──────────────────────────────────────────── */
function InfoRow({ icon, text, link, linkLabel }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 8,
      fontSize: 13, color: C.sub, lineHeight: 1.5,
    }}>
      <span style={{ flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>
        {text}
        {link && (
          <a
            href={link}
            style={{ marginLeft: 10, color: C.pri, fontWeight: 600, textDecoration: "none" }}
          >
            {linkLabel}
          </a>
        )}
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SUB-COMPONENT: EmptyState
══════════════════════════════════════════════════════════════ */
function EmptyState({ category }) {
  return (
    <div style={{
      textAlign:  "center",
      padding:    "44px 24px",
      color:      C.sub,
    }}>
      <div style={{ fontSize: 40, marginBottom: 14 }}>{category.icon}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>
        附近暂未找到{category.label === "全部" ? "宠物相关" : category.label}地点
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.6 }}>
        {category.id === "petfriendly"
          ? "宠物友好餐厅/咖啡收录较少\n可尝试其他分类"
          : "可尝试切换其他分类\n或稍后再试"}
      </div>
    </div>
  );
}
