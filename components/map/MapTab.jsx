"use client";

/**
 * components/map/MapTab.jsx  — 双 Key 架构
 *
 * 两条独立轨道，互不阻塞：
 *
 *   轨道 A（地图）: getMyLocation → loadMapSDK → new AMap.Map → 渲染底图
 *                  失败 → 显示灰色占位区，POI 列表照常显示
 *
 *   轨道 B（POI）:  getMyLocation → searchPetPOI（REST API）→ 渲染卡片列表
 *                  与地图 SDK 完全解耦，不依赖 window.AMap
 *
 * 定位只跑一次，结果共享给两条轨道。
 */

import { useState, useEffect, useRef, useMemo } from "react";
import {
  getMyLocation,
  loadMapSDK,
  searchPetPOI,
  CATEGORIES,
  getCoords,
  fmtDist,
  fmtTel,
  openNavigation,
} from "@/services/amapService";
import MapIcon from "@/components/MapIcon";

/* ── theme ─────────────────────────────────────────────── */
const C = {
  pri:    "#E68645",   // 橙色强调 / 按钮 / 选中态
  grad:   "#E68645",
  accent: "#E68645",
  tint:   "#F2E5DA",   // 浅粉米色 / 装饰背景 / 选中底
  bg:     "#EEE9E1",   // 米白主背景
  text:   "#1A1006",
  sub:    "#8A8074",
  light:  "#D6D5D8",   // 浅灰紫
  border: "#D6D5D8",
  err:    "#FFF0F0",
  errT:   "#C0392B",
};

/* ── marker html ────────────────────────────────────────── */
const ME_MARKER = `
  <div style="position:relative;width:26px;height:26px;
    display:flex;align-items:center;justify-content:center">
    <div style="position:absolute;width:26px;height:26px;border-radius:50%;
      background:rgba(66,133,244,0.22);animation:tm-pulse 2s ease-out infinite"></div>
    <div style="width:14px;height:14px;border-radius:50%;background:#4285F4;
      border:2.5px solid #fff;box-shadow:0 2px 6px rgba(66,133,244,0.55)"></div>
  </div>`;

const poiMarker = (icon) =>
  `<div style="width:32px;height:32px;border-radius:50%;background:#E68645;
    border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;
    font-size:13px;cursor:pointer;box-shadow:0 3px 8px rgba(0,0,0,0.4)">${icon}</div>`;

/* ════════════════════════════════════════════════════════
   MapTab
════════════════════════════════════════════════════════ */
export default function MapTab() {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const mksRef = useRef([]);

  /* ── 定位状态 ─────────────────────────────────────────*/
  const [location,  setLocation]  = useState(null);   // {lng,lat,source,city}
  const [locating,  setLocating]  = useState(true);

  /* ── 地图状态（轨道 A）────────────────────────────────*/
  const [mapPhase, setMapPhase] = useState("loading"); // loading|ready|error
  const [mapErr,   setMapErr]   = useState(null);

  /* ── POI 状态（轨道 B）────────────────────────────────*/
  const [allPois,    setAllPois]    = useState(null);
  const [poiLoading, setPoiLoading] = useState(false);
  const [poiErr,     setPoiErr]     = useState(null);

  /* ── UI 状态 ─────────────────────────────────────────*/
  const [activeCat, setActiveCat] = useState(CATEGORIES[0]);
  const [selPoi,    setSelPoi]    = useState(null);

  /* 客户端分类过滤 */
  const pois = useMemo(() => {
    if (!allPois) return null;
    return activeCat.id === "all" ? allPois : allPois.filter(activeCat.test);
  }, [allPois, activeCat]);

  /* ════════════════════════════════════════════════════
     EFFECT — 初始化（只跑一次）
  ════════════════════════════════════════════════════ */
  useEffect(() => {
    let alive = true;

    (async () => {
      /* ── Step 1: 定位（两条轨道共用）──────────────── */
      const loc = await getMyLocation();
      if (!alive) return;
      setLocation(loc);
      setLocating(false);

      /* ── 轨道 A: 地图 SDK（非阻塞）────────────────── */
      loadMapSDK()
        .then((AMap) => {
          if (!alive || !divRef.current) return;
          try {
            const map = new AMap.Map(divRef.current, {
              zoom:            14,
              center:          new AMap.LngLat(loc.lng, loc.lat),
              resizeEnable:    true,
              expandZoomRange: true,
              zooms:           [3, 20],
            });
            mapRef.current = map;

            // 用户位置 marker
            new AMap.Marker({
              map,
              position: new AMap.LngLat(loc.lng, loc.lat),
              content:  ME_MARKER,
              offset:   new AMap.Pixel(-13, -13),
              zIndex:   200,
            });

            map.on("complete", () => {
              if (alive) setMapPhase("ready");
            });

            // 12s 内 complete 未触发也认为地图基本可用
            setTimeout(() => {
              if (alive && mapPhase === "loading") setMapPhase("ready");
            }, 12000);

          } catch (e) {
            if (alive) {
              setMapPhase("error");
              setMapErr("new AMap.Map() 失败: " + e.message);
            }
          }
        })
        .catch((e) => {
          if (alive) {
            setMapPhase("error");
            setMapErr(e.message);
          }
        });

      /* ── 轨道 B: POI 搜索（REST API，不依赖 AMap）── */
      setPoiLoading(true);
      try {
        const results = await searchPetPOI(loc.lat, loc.lng);
        if (!alive) return;
        setAllPois(results);
      } catch (e) {
        if (alive) setPoiErr(e.message);
      } finally {
        if (alive) setPoiLoading(false);
      }
    })();

    return () => {
      alive = false;
      mksRef.current.forEach((m) => { try { m.setMap(null); } catch {} });
      mksRef.current = [];
      if (mapRef.current) {
        try { mapRef.current.destroy(); } catch {}
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── POI markers 随分类更新 ─────────────────────────*/
  useEffect(() => {
    const AMap = window?.AMap;
    if (!AMap || !mapRef.current || !pois) return;

    mksRef.current.forEach((m) => { try { m.setMap(null); } catch {} });
    mksRef.current = [];

    const icon = activeCat.icon;
    pois.slice(0, 60).forEach((poi) => {
      const c = getCoords(poi.location);
      if (!c) return;

      const mk = new AMap.Marker({
        map:      mapRef.current,
        position: new AMap.LngLat(c.lng, c.lat),
        content:  poiMarker(icon),
        offset:   new AMap.Pixel(-16, -16),
        zIndex:   100,
        title:    poi.name,
      });
      ((p) => mk.on("click", () => {
        setSelPoi(p);
        const cc = getCoords(p.location);
        if (cc) mapRef.current?.setCenter(new AMap.LngLat(cc.lng, cc.lat));
      }))(poi);
      mksRef.current.push(mk);
    });
  }, [pois, activeCat.icon]);

  /* ════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════ */
  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column",
                  background:C.bg, position:"relative", overflow:"hidden" }}>

      {/* 顶部标题 */}
      <div style={{ background:"#fff", padding:"52px 18px 12px", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <MapIcon size={40} color={C.pri} />
          <span style={{ fontSize:20, fontWeight:800, color:C.text }}>宠物友好地图</span>
        </div>
        <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>
          {locating ? "正在定位..." :
           location?.source === "gps"
             ? `📍 当前位置${location.city ? ` · ${location.city}` : ""}`
             : "📍 GPS 失败 · 已显示上海市中心"}
        </div>
      </div>

      {/* 分类筛选（Apple Maps 风胶囊 · 毛玻璃 · 横向滚动） */}
      <div style={{ background:"rgba(255,255,255,0.72)",
                    backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)",
                    borderBottom:`1px solid ${C.border}`,
                    padding:"10px 14px", display:"flex", gap:9,
                    overflowX:"auto", scrollbarWidth:"none", flexShrink:0 }}>
        {CATEGORIES.map((cat) => {
          const on = activeCat.id === cat.id;
          return (
            <button key={cat.id}
              onClick={() => { setActiveCat(cat); setSelPoi(null); }}
              style={{ flexShrink:0, padding:"8px 16px", borderRadius:999, fontSize:13,
                       fontWeight:700, cursor:"pointer", whiteSpace:"nowrap",
                       transition:"all .18s",
                       background: on ? C.grad : "rgba(255,255,255,0.7)",
                       color:      on ? "#fff" : C.text,
                       boxShadow:  on ? "0 4px 12px rgba(230,134,69,0.28)" : "0 1px 4px rgba(0,0,0,0.05)",
                       border:     `1px solid ${on ? "transparent" : "rgba(214,213,216,0.8)"}` }}>
              {cat.icon} {cat.label}
            </button>
          );
        })}
      </div>

      {/* 地图区域（高度固定 256px，失败时显示占位）· 四角圆角提升高级感
          ⚠ 必须是明确像素高度，AMap 初始化时需要非零尺寸  */}
      <div style={{ position:"relative", flexShrink:0, height:256,
                    margin:"10px 14px 4px", borderRadius:22, overflow:"hidden",
                    boxShadow:"0 6px 20px rgba(0,0,0,0.08)",
                    background: mapPhase === "error" ? C.err : "#e8ede8" }}>

        {/* AMap 挂载 div */}
        <div ref={divRef} style={{ width:"100%", height:"100%" }} />

        {/* 当前定位 chip（毛玻璃，轻字重） */}
        {mapPhase === "ready" && (
          <div style={{ position:"absolute", top:10, left:10, zIndex:6,
                        background:"rgba(255,255,255,0.82)",
                        backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)",
                        borderRadius:999, padding:"5px 12px",
                        fontSize:11.5, fontWeight:500, color:C.text,
                        boxShadow:"0 2px 10px rgba(0,0,0,0.08)",
                        display:"flex", alignItems:"center", gap:4 }}>
            📍 {locating ? "定位中…" : (location?.source === "gps" ? "当前定位" : "上海市中心")}
            {location?.city ? ` · ${location.city}` : ""}
          </div>
        )}

        {/* 地图加载中 */}
        {mapPhase === "loading" && (
          <div style={{ position:"absolute", inset:0, display:"flex",
                        flexDirection:"column", alignItems:"center",
                        justifyContent:"center", gap:8,
                        background:"rgba(255,255,255,0.92)", zIndex:5 }}>
            <div style={{ fontSize:24, animation:"tm-spin 1.2s linear infinite" }}>⟳</div>
            <div style={{ fontSize:12, color:C.sub }}>加载地图底图...</div>
          </div>
        )}

        {/* 地图加载失败占位 */}
        {mapPhase === "error" && (
          <div style={{ position:"absolute", inset:0, display:"flex",
                        flexDirection:"column", alignItems:"center",
                        justifyContent:"center", gap:6,
                        background:C.err, padding:"16px 20px", zIndex:5 }}>
            <div style={{ fontSize:22 }}>🗺️</div>
            <div style={{ fontSize:12, fontWeight:700, color:C.errT, textAlign:"center" }}>
              地图底图加载失败
            </div>
            <div style={{ fontSize:10, color:C.errT, textAlign:"center",
                          lineHeight:1.5, maxWidth:260,
                          wordBreak:"break-all", whiteSpace:"pre-wrap" }}>
              {mapErr}
            </div>
            <div style={{ fontSize:10, color:C.sub, textAlign:"center" }}>
              POI 列表仍然可用（见下方）
            </div>
          </div>
        )}

        {/* 定位来源角标 */}
        {mapPhase === "ready" && location?.source === "default" && (
          <div style={{ position:"absolute", bottom:8, left:8, zIndex:5,
                        background:"rgba(0,0,0,0.78)", color:"#fff",
                        borderRadius:10, padding:"3px 10px",
                        fontSize:10, fontWeight:600 }}>
            GPS 失败 · 已显示上海
          </div>
        )}
      </div>

      {/* POI 列表区域（独立于地图，始终显示） */}
      <div style={{ flex:1, overflowY:"auto", padding:"10px 14px 88px" }}>

        {/* POI 状态栏 */}
        <div style={{ fontSize:11, color:C.sub, marginBottom:10,
                      fontWeight:600, display:"flex", alignItems:"center",
                      gap:6, minHeight:20 }}>
          {poiLoading ? (
            <><span style={{ animation:"tm-spin 1s linear infinite",
                             display:"inline-block" }}>⟳</span>
              搜索附近宠物地点（11个关键词）...</>
          ) : poiErr ? (
            <span style={{ color:C.errT }}>⚠️ POI 搜索失败</span>
          ) : pois !== null ? (
            <><span style={{ color:C.accent }}>●</span>
              {activeCat.id === "all"
                ? `共发现 ${pois.length} 个宠物相关地点`
                : `${activeCat.label}：${pois.length} 个地点`}</>
          ) : null}
        </div>

        {/* POI 搜索失败详情 */}
        {poiErr && (
          <div style={{ background:C.err, border:`1.5px solid ${C.errT}44`,
                        borderRadius:16, padding:"12px 14px", marginBottom:12 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.errT, marginBottom:6 }}>
              ❌ POI 搜索失败
            </div>
            <div style={{ fontSize:11, color:C.errT, lineHeight:1.6,
                          wordBreak:"break-all", whiteSpace:"pre-wrap" }}>
              {poiErr}
            </div>
            <div style={{ fontSize:10, color:C.sub, marginTop:8, lineHeight:1.5 }}>
              请检查：① NEXT_PUBLIC_AMAP_WEB_KEY 是否配置
              ② 高德控制台该 Key 类型是否为「Web服务」
              ③ 控制台是否有 IP 白名单限制
            </div>
          </div>
        )}

        {/* 空结果 */}
        {!poiLoading && !poiErr && pois?.length === 0 && (
          <EmptyState cat={activeCat} hasOthers={(allPois?.length ?? 0) > 0} />
        )}

        {/* POI 卡片 */}
        {(pois || []).map((poi) => (
          <PoiCard
            key={poi.id}
            poi={poi}
            icon={activeCat.icon}
            selected={selPoi?.id === poi.id}
            onSelect={() => {
              setSelPoi(poi);
              // 如果地图已就绪，移动中心到该 POI
              const c = getCoords(poi.location);
              if (c && mapRef.current && window.AMap) {
                mapRef.current.setCenter(new window.AMap.LngLat(c.lng, c.lat));
              }
            }}
          />
        ))}
      </div>

      {/* 详情底部弹窗 */}
      {selPoi && <PoiDetail poi={selPoi} onClose={() => setSelPoi(null)} />}

      <style>{`
        @keyframes tm-spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes tm-pulse { 0%{transform:scale(1);opacity:.8} 100%{transform:scale(2.4);opacity:0} }
        @keyframes tm-up    { from{transform:translateY(100%)} to{transform:translateY(0)} }
      `}</style>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   POI 列表卡片
════════════════════════════════════════════════════════ */
function PoiCard({ poi, icon, selected, onSelect }) {
  const dist = fmtDist(poi.distance);
  const type = poi.type?.split(";").slice(-1)[0] ?? "";
  const addr = poi.address
    || [poi.pname, poi.cityname, poi.adname].filter(Boolean).join("")
    || "地址未知";
  // 商家封面图：优先高德 photos（需 extensions=all 才会返回）；无图则降级爪印占位
  const photo  = poi.photos?.[0]?.url || null;
  // 高德对无评分 POI 会返回 "[]" / 空串，需过滤，避免显示「⭐ []」
  const ratingRaw = poi.biz_ext?.rating ?? poi.rating;
  const rating = ratingRaw && ratingRaw !== "[]" && ratingRaw !== "" ? ratingRaw : null;
  const [imgOk, setImgOk] = useState(!!photo);

  return (
    <div onClick={onSelect}
      style={{ background: selected ? C.tint : "#fff", borderRadius:20, padding:14,
               marginBottom:12, boxShadow:"0 4px 16px rgba(0,0,0,0.06)",
               cursor:"pointer", display:"flex", gap:13, alignItems:"stretch",
               border:`1.5px solid ${selected ? C.pri : "transparent"}`,
               transition:"all .15s" }}>

      {/* 封面图 / 爪印占位（72×72，圆角 16，cover） */}
      <div style={{ width:72, height:72, borderRadius:16, flexShrink:0, overflow:"hidden",
                    background:C.tint, display:"flex", alignItems:"center", justifyContent:"center" }}>
        {photo && imgOk ? (
          <img src={photo} alt={poi.name} loading="lazy" onError={() => setImgOk(false)}
            style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
        ) : (
          <span style={{ fontSize:30 }}>{icon}</span>
        )}
      </div>

      {/* 信息区 */}
      <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column" }}>
        <div style={{ fontSize:15, fontWeight:800, color:C.text, marginBottom:2,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {poi.name}
        </div>
        {rating && (
          <div style={{ fontSize:12, fontWeight:700, color:"#F0A030", marginBottom:2 }}>
            ⭐ {rating}
          </div>
        )}
        <div style={{ fontSize:11.5, color:C.sub, marginBottom:6,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          📍 {addr}
        </div>

        {/* 标签 + 距离 + 导航 */}
        <div style={{ marginTop:"auto", display:"flex", alignItems:"center", gap:8 }}>
          {type && (
            <span style={{ fontSize:10, background:C.tint, color:C.accent,
                           padding:"3px 9px", borderRadius:999, fontWeight:600,
                           flexShrink:0, maxWidth:96, overflow:"hidden",
                           textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {type}
            </span>
          )}
          <span style={{ flex:1 }} />
          {dist && <span style={{ fontSize:12, fontWeight:700, color:C.sub, flexShrink:0 }}>{dist}</span>}
          <button onClick={(e) => { e.stopPropagation(); openNavigation(poi); }}
            style={{ flexShrink:0, fontSize:12, fontWeight:800, color:"#fff",
                     background:C.grad, border:"none", borderRadius:999,
                     padding:"5px 12px", cursor:"pointer",
                     boxShadow:"0 3px 10px rgba(230,134,69,0.3)" }}>
            导航 →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   POI 详情底部弹窗
════════════════════════════════════════════════════════ */
function PoiDetail({ poi, onClose }) {
  const dist = fmtDist(poi.distance);
  const tel  = fmtTel(poi.tel);
  const type = poi.type?.split(";").slice(-1)[0] ?? "";
  const addr = poi.address
    || [poi.pname, poi.cityname, poi.adname].filter(Boolean).join("")
    || "";

  return (
    <div style={{ position:"absolute", inset:0, zIndex:60,
                  background:"rgba(26,16,6,0.44)", display:"flex",
                  alignItems:"flex-end" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>

      <div style={{ width:"100%", background:"#fff",
                    borderRadius:"22px 22px 0 0",
                    padding:"0 0 44px", boxSizing:"border-box",
                    maxHeight:"74%", overflowY:"auto",
                    animation:"tm-up .22s ease-out" }}>

        <div style={{ width:40, height:4, borderRadius:4,
                      background:"#E0D4C8", margin:"14px auto 18px" }} />

        <div style={{ padding:"0 20px" }}>
          <div style={{ fontSize:19, fontWeight:800, color:C.text, marginBottom:6 }}>
            {poi.name}
          </div>

          {type && (
            <span style={{ display:"inline-block", fontSize:11,
                           background:C.tint, color:C.accent,
                           padding:"3px 10px", borderRadius:20,
                           marginBottom:16, fontWeight:600 }}>
              {type}
            </span>
          )}

          <div style={{ display:"flex", flexDirection:"column",
                        gap:10, marginBottom:22 }}>
            {addr && <Row icon="📍" text={addr} />}
            {dist && <Row icon="📏" text={`距您约 ${dist}`} />}
            {tel  && (
              <Row icon="📞" text={tel}
                extra={
                  <a href={`tel:${tel}`}
                    style={{ marginLeft:10, color:C.accent, fontWeight:700,
                             textDecoration:"none", fontSize:12 }}>
                    拨打
                  </a>
                } />
            )}
          </div>

          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => openNavigation(poi)}
              style={{ flex:1, padding:"14px 0", borderRadius:16,
                       background:C.grad, color:"#fff", fontSize:14,
                       fontWeight:700, border:"none", cursor:"pointer" }}>
              🗺️ 打开高德地图导航
            </button>
            <button onClick={onClose}
              style={{ width:48, height:48, borderRadius:13, background:C.light,
                       border:`1.5px solid ${C.border}`, cursor:"pointer",
                       fontSize:18, color:C.sub, flexShrink:0 }}>
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, text, extra }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:8,
                  fontSize:13, color:"#5A4A35", lineHeight:1.5 }}>
      <span style={{ flexShrink:0, marginTop:1 }}>{icon}</span>
      <span style={{ flex:1 }}>{text}{extra}</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   空结果
════════════════════════════════════════════════════════ */
function EmptyState({ cat, hasOthers }) {
  return (
    <div style={{ textAlign:"center", padding:"40px 24px", color:C.sub }}>
      <div style={{ fontSize:40, marginBottom:14 }}>{cat.icon}</div>
      <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:8 }}>
        附近暂未找到{cat.id === "all" ? "宠物相关" : cat.label}地点
      </div>
      <div style={{ fontSize:12, lineHeight:1.7 }}>
        {hasOthers && cat.id !== "all"
          ? "该分类无结果，可切换「全部」查看其他宠物地点"
          : "已搜索 10km 范围，暂无相关地点"}
      </div>
    </div>
  );
}
