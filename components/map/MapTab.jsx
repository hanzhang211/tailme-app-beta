"use client";

/**
 * components/map/MapTab.jsx
 *
 * TailMe 宠物地图 Tab — 高德 JSAPI v2.0
 *
 * 初始化流程：
 *   loadAMap (callback 模式) → getMyLocation → new AMap.Map →
 *   searchPetPOI (11个关键词) → 渲染 Markers → 分类过滤 → 详情弹窗
 */

import { useState, useEffect, useRef, useMemo } from "react";
import {
  loadAMap,
  getMyLocation,
  searchPetPOI,
  CATEGORIES,
  getCoords,
  fmtDist,
  fmtTel,
  openNavigation,
} from "@/services/amapService";

/* ── Theme ──────────────────────────────────────────────── */
const C = {
  pri:    "#FF7A5A",
  grad:   "linear-gradient(135deg,#FF7A5A 0%,#FFB347 100%)",
  bg:     "#FFFBF4",
  text:   "#1A1006",
  sub:    "#9B8B76",
  light:  "#FFF8ED",
  border: "#F0E8D8",
};

/* ── Marker HTML ─────────────────────────────────────────── */
/* 蓝色脉冲点 = 用户位置 */
const ME_HTML = `
  <div style="position:relative;width:26px;height:26px;display:flex;align-items:center;justify-content:center">
    <div style="position:absolute;width:26px;height:26px;border-radius:50%;background:rgba(66,133,244,0.22);animation:tm-pulse 2s ease-out infinite"></div>
    <div style="width:14px;height:14px;border-radius:50%;background:#4285F4;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(66,133,244,0.55)"></div>
  </div>`;

/* 橙色圆点 = POI */
const mkHtml = (icon) =>
  `<div style="width:32px;height:32px;border-radius:50%;background:#FF7A5A;border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;box-shadow:0 3px 8px rgba(255,122,90,0.5)">${icon}</div>`;

/* ════════════════════════════════════════════════════════════
   MapTab（主组件）
════════════════════════════════════════════════════════════ */
export default function MapTab() {
  const divRef   = useRef(null);   // 地图 DOM 容器
  const mapRef   = useRef(null);   // AMap.Map 实例
  const mksRef   = useRef([]);     // POI Markers（切换分类时清除）

  /* 阶段：init → map → search → done | error */
  const [phase,     setPhase]     = useState("init");
  const [errMsg,    setErrMsg]    = useState(null);
  const [location,  setLocation]  = useState(null);
  const [allPois,   setAllPois]   = useState(null);
  const [activeCat, setActiveCat] = useState(CATEGORIES[0]);
  const [selPoi,    setSelPoi]    = useState(null);

  /* 客户端分类过滤（不重新搜索） */
  const pois = useMemo(() => {
    if (!allPois) return null;
    return activeCat.id === "all"
      ? allPois
      : allPois.filter(activeCat.test);
  }, [allPois, activeCat]);

  /* ════════════════════════════════════════════════════════
     EFFECT — 初始化（只跑一次）
  ════════════════════════════════════════════════════════ */
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        /* 1. 加载高德（callback 模式，window.AMap 保证就绪）*/
        setPhase("init");
        const AMap = await loadAMap();
        if (!alive || !divRef.current) return;

        /* 2. 定位 */
        const loc = await getMyLocation(AMap);
        if (!alive) return;
        setLocation(loc);

        /* 3. 创建地图
           ⚠ divRef.current 必须有明确 height（256px），
             AMap 内部用 getBoundingClientRect() 计算画布尺寸   */
        const map = new AMap.Map(divRef.current, {
          zoom:          14,
          center:        new AMap.LngLat(loc.lng, loc.lat),
          resizeEnable:  true,
          expandZoomRange: true,
          zooms:         [4, 20],
        });
        mapRef.current = map;
        setPhase("map");

        /* 4. 用户位置 Marker（蓝色脉冲点）*/
        new AMap.Marker({
          map,
          position: new AMap.LngLat(loc.lng, loc.lat),
          content:  ME_HTML,
          offset:   new AMap.Pixel(-13, -13),
          zIndex:   200,
          title:    "我的位置",
        });

        /* 5. 搜索 POI */
        setPhase("search");
        const results = await searchPetPOI(AMap, loc);
        if (!alive) return;

        setAllPois(results);
        setPhase("done");

      } catch (e) {
        if (alive) {
          setErrMsg(e.message);
          setPhase("error");
        }
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

  /* ════════════════════════════════════════════════════════
     EFFECT — 分类变化时更新 Markers
  ════════════════════════════════════════════════════════ */
  useEffect(() => {
    const AMap = typeof window !== "undefined" ? window.AMap : null;
    if (!AMap || !mapRef.current || !pois) return;

    /* 清除旧 Markers */
    mksRef.current.forEach((m) => { try { m.setMap(null); } catch {} });
    mksRef.current = [];

    /* 添加新 Markers（最多 60 个）*/
    const icon = activeCat.icon;
    pois.slice(0, 60).forEach((poi) => {
      const c = getCoords(poi.location);
      if (!c) return;

      const mk = new AMap.Marker({
        map:      mapRef.current,
        position: new AMap.LngLat(c.lng, c.lat),
        content:  mkHtml(icon),
        offset:   new AMap.Pixel(-16, -16),
        zIndex:   100,
        title:    poi.name,
      });

      /* IIFE 固定每个 marker 自己的 poi 引用 */
      ((p) => mk.on("click", () => {
        setSelPoi(p);
        const cc = getCoords(p.location);
        if (cc) mapRef.current?.setCenter(new AMap.LngLat(cc.lng, cc.lat));
      }))(poi);

      mksRef.current.push(mk);
    });
  }, [pois, activeCat.icon]);

  /* ════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════ */
  const loading = phase === "init" || phase === "map" || phase === "search";

  const PHASE_MSG = {
    init:   "加载高德地图中...",
    map:    "正在定位...",
    search: "搜索附近宠物地点（11个关键词）...",
  };

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column",
                  background:C.bg, position:"relative", overflow:"hidden" }}>

      {/* ─── 顶部标题 ──────────────────────────────────────── */}
      <div style={{ background:"#fff", padding:"52px 18px 12px", flexShrink:0 }}>
        <div style={{ fontSize:20, fontWeight:800, color:C.text }}>🗺️ 宠物友好地图</div>
        <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>
          {!location ? "正在定位..." :
            location.source === "gps"
              ? `📍 当前位置${location.city ? ` · ${location.city}` : ""}`
              : "📍 GPS 失败 · 已定位至上海市中心"}
        </div>
      </div>

      {/* ─── 分类筛选 ──────────────────────────────────────── */}
      <div style={{ background:"#fff", borderBottom:`1px solid ${C.border}`,
                    padding:"8px 14px", display:"flex", gap:8,
                    overflowX:"auto", scrollbarWidth:"none", flexShrink:0 }}>
        {CATEGORIES.map((cat) => {
          const on = activeCat.id === cat.id;
          return (
            <button key={cat.id}
              onClick={() => { setActiveCat(cat); setSelPoi(null); }}
              style={{
                flexShrink:0, padding:"7px 15px", borderRadius:20,
                fontSize:12, fontWeight:600, cursor:"pointer",
                whiteSpace:"nowrap", transition:"all .18s",
                background: on ? C.grad : C.light,
                color:      on ? "#fff" : "#5A4A35",
                border:     `1.5px solid ${on ? "transparent" : C.border}`,
              }}>
              {cat.icon} {cat.label}
            </button>
          );
        })}
      </div>

      {/* ─── 地图容器 ──────────────────────────────────────────
          ⚠ height 必须是明确像素值，不能是 "100%" 或 flex:1。
          AMap 初始化时调用 getBoundingClientRect() 测量宽高，
          如果为 0 则底图不绘制（白屏）。                         */}
      <div style={{ position:"relative", flexShrink:0, height:256, background:"#e8ede8" }}>
        <div ref={divRef} style={{ width:"100%", height:"100%" }} />

        {/* loading / error 遮罩 */}
        {(loading || phase === "error") && (
          <div style={{ position:"absolute", inset:0, display:"flex",
                        flexDirection:"column", alignItems:"center",
                        justifyContent:"center", gap:10,
                        background: phase==="error" ? C.bg : "rgba(255,251,244,0.86)",
                        padding:20 }}>
            {phase === "error" ? (
              <>
                <div style={{ fontSize:30 }}>⚠️</div>
                <div style={{ fontSize:13, color:"#D94040", textAlign:"center",
                              lineHeight:1.6, maxWidth:280 }}>
                  {errMsg}
                </div>
                <div style={{ fontSize:11, color:C.sub, textAlign:"center", lineHeight:1.6 }}>
                  请到高德控制台 → 我的应用 → 白名单<br/>
                  添加 <b>localhost:3000</b> 或线上域名
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize:24, animation:"tm-spin 1.2s linear infinite" }}>⟳</div>
                <div style={{ fontSize:12, color:C.sub }}>{PHASE_MSG[phase]}</div>
              </>
            )}
          </div>
        )}

        {/* 定位来源角标 */}
        {phase === "done" && location?.source === "default" && (
          <div style={{ position:"absolute", bottom:8, left:8,
                        background:"rgba(255,122,90,0.9)", color:"#fff",
                        borderRadius:10, padding:"3px 10px", fontSize:10, fontWeight:600 }}>
            GPS 失败 · 已显示上海
          </div>
        )}
      </div>

      {/* ─── POI 列表 ──────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:"auto", padding:"10px 14px 88px" }}>

        {/* 状态提示 */}
        <div style={{ fontSize:11, color:C.sub, marginBottom:10,
                      fontWeight:600, display:"flex", alignItems:"center",
                      gap:6, minHeight:20 }}>
          {phase === "search" ? (
            <><span style={{ animation:"tm-spin 1s linear infinite", display:"inline-block" }}>⟳</span>
              搜索中（11个关键词）...</>
          ) : phase === "done" && pois !== null ? (
            <><span style={{ color:C.pri }}>●</span>
              {activeCat.id === "all"
                ? `共 ${pois.length} 个宠物相关地点`
                : `${activeCat.label}：${pois.length} 个地点`}</>
          ) : null}
        </div>

        {/* 空结果 */}
        {phase === "done" && pois?.length === 0 && (
          <EmptyState cat={activeCat} hasOthers={(allPois?.length ?? 0) > 0} />
        )}

        {/* 卡片 */}
        {(pois || []).map((poi) => (
          <PoiCard key={poi.id} poi={poi} icon={activeCat.icon}
            selected={selPoi?.id === poi.id}
            onSelect={() => {
              setSelPoi(poi);
              const c = getCoords(poi.location);
              const AMap = window.AMap;
              if (c && mapRef.current && AMap)
                mapRef.current.setCenter(new AMap.LngLat(c.lng, c.lat));
            }} />
        ))}
      </div>

      {/* ─── 详情底部弹窗 ───────────────────────────────────── */}
      {selPoi && (
        <PoiDetail poi={selPoi} onClose={() => setSelPoi(null)} />
      )}

      <style>{`
        @keyframes tm-spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes tm-pulse { 0%{transform:scale(1);opacity:.8} 100%{transform:scale(2.4);opacity:0} }
        @keyframes tm-up    { from{transform:translateY(100%)} to{transform:translateY(0)} }
      `}</style>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   POI 列表卡片
════════════════════════════════════════════════════════════ */
function PoiCard({ poi, icon, selected, onSelect }) {
  const dist = fmtDist(poi.distance);
  const type = poi.type?.split(";").slice(-1)[0] ?? "";
  const addr = poi.address
    || [poi.pname, poi.cityname, poi.adname].filter(Boolean).join("")
    || "地址未知";

  return (
    <div onClick={onSelect}
      style={{ background:"#fff", borderRadius:18, padding:"13px 14px", marginBottom:10,
               boxShadow:"0 2px 12px rgba(0,0,0,0.06)", cursor:"pointer",
               border:`1.5px solid ${selected ? C.pri : "transparent"}`,
               display:"flex", gap:12, alignItems:"flex-start", transition:"border-color .15s" }}>

      <div style={{ width:44, height:44, borderRadius:13, flexShrink:0,
                    background: selected ? "#FFF3E0" : C.light,
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
        {icon}
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:700, color:C.text,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:3 }}>
          {poi.name}
        </div>
        <div style={{ fontSize:11, color:C.sub,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          📍 {addr}
        </div>
        {type && (
          <div style={{ marginTop:6 }}>
            <span style={{ fontSize:10, background:"#FFF3E0", color:C.pri,
                           padding:"2px 8px", borderRadius:20, fontWeight:500 }}>
              {type}
            </span>
          </div>
        )}
      </div>

      {dist && (
        <div style={{ flexShrink:0, paddingTop:2 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.pri }}>{dist}</div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   POI 详情底部弹窗
════════════════════════════════════════════════════════════ */
function PoiDetail({ poi, onClose }) {
  const dist = fmtDist(poi.distance);
  const tel  = fmtTel(poi.tel);
  const type = poi.type?.split(";").slice(-1)[0] ?? "";
  const addr = poi.address
    || [poi.pname, poi.cityname, poi.adname].filter(Boolean).join("")
    || "";

  return (
    <div style={{ position:"absolute", inset:0, zIndex:60,
                  background:"rgba(26,16,6,0.44)", display:"flex", alignItems:"flex-end" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>

      <div style={{ width:"100%", background:"#fff", borderRadius:"22px 22px 0 0",
                    padding:"0 0 44px", boxSizing:"border-box",
                    maxHeight:"74%", overflowY:"auto",
                    animation:"tm-up .22s ease-out" }}>

        {/* 拖拽条 */}
        <div style={{ width:40, height:4, borderRadius:4, background:"#E0D4C8",
                      margin:"14px auto 18px" }} />

        <div style={{ padding:"0 20px" }}>
          <div style={{ fontSize:19, fontWeight:800, color:C.text, marginBottom:6 }}>
            {poi.name}
          </div>

          {type && (
            <span style={{ display:"inline-block", fontSize:11, background:"#FFF3E0",
                           color:C.pri, padding:"3px 10px", borderRadius:20,
                           marginBottom:16, fontWeight:600 }}>
              {type}
            </span>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:22 }}>
            {addr && <Row icon="📍" text={addr} />}
            {dist && <Row icon="📏" text={`距您约 ${dist}`} />}
            {tel  && <Row icon="📞" text={tel}
                         extra={<a href={`tel:${tel}`}
                           style={{ marginLeft:10, color:C.pri, fontWeight:700,
                                    textDecoration:"none", fontSize:12 }}>拨打</a>} />}
          </div>

          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => openNavigation(poi)}
              style={{ flex:1, padding:"14px 0", borderRadius:16, background:C.grad,
                       color:"#fff", fontSize:14, fontWeight:700, border:"none", cursor:"pointer" }}>
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

/* ════════════════════════════════════════════════════════════
   空结果
════════════════════════════════════════════════════════════ */
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
          : "已搜索 10km 范围，暂无相关地点\n换个位置后刷新可重新搜索"}
      </div>
    </div>
  );
}
