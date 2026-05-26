"use client";

/**
 * components/map/MapTab.jsx
 *
 * 高德 JSAPI v2.0 + @amap/amap-jsapi-loader
 *
 * phase 流程：
 *   "sdk"    — AMapLoader.load() 中
 *   "locate" — getMyLocation 中
 *   "tiles"  — new AMap.Map() + 等待 complete 事件
 *   "search" — searchPetPOI 中
 *   "done"   — 全部就绪
 *   "error"  — 任意步骤失败，errMsg + errStep 记录现场
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

/* ── theme ──────────────────────────────────────────────── */
const C = {
  pri:    "#FF7A5A",
  grad:   "linear-gradient(135deg,#FF7A5A 0%,#FFB347 100%)",
  bg:     "#FFFBF4",
  text:   "#1A1006",
  sub:    "#9B8B76",
  light:  "#FFF8ED",
  border: "#F0E8D8",
  err:    "#FFF0F0",
  errTxt: "#C0392B",
};

/* ── marker html ─────────────────────────────────────────── */
const ME_MARKER = `
  <div style="position:relative;width:26px;height:26px;display:flex;align-items:center;justify-content:center">
    <div style="position:absolute;width:26px;height:26px;border-radius:50%;
      background:rgba(66,133,244,0.22);animation:tm-pulse 2s ease-out infinite"></div>
    <div style="width:14px;height:14px;border-radius:50%;background:#4285F4;
      border:2.5px solid #fff;box-shadow:0 2px 6px rgba(66,133,244,0.55)"></div>
  </div>`;

const poiMarker = (icon) =>
  `<div style="width:32px;height:32px;border-radius:50%;background:#FF7A5A;
    border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;
    font-size:13px;cursor:pointer;box-shadow:0 3px 8px rgba(255,122,90,0.5)">${icon}</div>`;

/* ── phase labels ─────────────────────────────────────────── */
const PHASE_LABEL = {
  sdk:    "加载高德 SDK...",
  locate: "获取位置中...",
  tiles:  "渲染地图...",
  search: "搜索附近宠物地点（11个关键词）...",
  done:   "",
  error:  "",
};

/* ════════════════════════════════════════════════════════════
   MapTab
════════════════════════════════════════════════════════════ */
export default function MapTab() {
  const divRef  = useRef(null);
  const mapRef  = useRef(null);
  const mksRef  = useRef([]);

  const [phase,     setPhase]     = useState("sdk");
  const [errMsg,    setErrMsg]    = useState(null);
  const [errStep,   setErrStep]   = useState(null);
  const [location,  setLocation]  = useState(null);
  const [allPois,   setAllPois]   = useState(null);
  const [activeCat, setActiveCat] = useState(CATEGORIES[0]);
  const [selPoi,    setSelPoi]    = useState(null);
  const [tileReady, setTileReady] = useState(false);

  const pois = useMemo(() => {
    if (!allPois) return null;
    return activeCat.id === "all" ? allPois : allPois.filter(activeCat.test);
  }, [allPois, activeCat]);

  /* ── 初始化（只跑一次）────────────────────────────────── */
  useEffect(() => {
    let alive = true;

    const fail = (step, err) => {
      if (!alive) return;
      const msg = err?.message || String(err);
      console.error("[MapTab] step=" + step, err);
      setErrStep(step);
      setErrMsg(msg);
      setPhase("error");
    };

    (async () => {
      /* ── step 1: SDK ──────────────────────────────────── */
      setPhase("sdk");
      let AMap;
      try {
        AMap = await loadAMap();
      } catch (e) {
        fail("SDK 加载 (AMapLoader.load)", e);
        return;
      }
      if (!alive) return;

      /* ── step 2: 定位 ─────────────────────────────────── */
      setPhase("locate");
      let loc;
      try {
        loc = await getMyLocation(AMap);
      } catch (e) {
        fail("用户定位", e);
        return;
      }
      if (!alive) return;
      setLocation(loc);

      /* ── step 3: 创建地图 + 等待瓦片 ─────────────────── */
      setPhase("tiles");
      if (!divRef.current) {
        fail("地图容器", new Error("divRef.current 为 null，DOM 容器未挂载"));
        return;
      }

      let map;
      try {
        map = new AMap.Map(divRef.current, {
          zoom:           14,
          center:         new AMap.LngLat(loc.lng, loc.lat),
          resizeEnable:   true,
          expandZoomRange: true,
          zooms:          [3, 20],
        });
        mapRef.current = map;
      } catch (e) {
        fail("new AMap.Map()", e);
        return;
      }

      /* 等瓦片 complete，最多 12s */
      await new Promise((res, rej) => {
        const t = setTimeout(() => {
          rej(new Error(
            "地图瓦片 complete 事件在 12s 内未触发。\n" +
            "可能原因：① Key/Security code 与域名不匹配  " +
            "② 网络无法访问 webrd0?.is.autonavi.com  " +
            "③ 容器高度为 0"
          ));
        }, 12000);

        map.on("complete", () => {
          clearTimeout(t);
          if (alive) setTileReady(true);
          res();
        });

        /* complete 不一定触发（离线/Key无效），监听 error 事件兜底 */
        map.on("error", (e) => {
          clearTimeout(t);
          rej(new Error("AMap.Map error 事件：" + (e?.info || JSON.stringify(e))));
        });
      }).catch((e) => {
        if (alive) fail("地图瓦片加载 (map complete)", e);
        return Promise.reject(e);   // 让外层 catch 拦截
      });

      if (!alive) return;

      /* 用户位置 marker */
      try {
        new AMap.Marker({
          map,
          position: new AMap.LngLat(loc.lng, loc.lat),
          content:  ME_MARKER,
          offset:   new AMap.Pixel(-13, -13),
          zIndex:   200,
          title:    "我的位置",
        });
      } catch { /* marker 失败不阻塞 */ }

      /* ── step 4: 搜索 POI ─────────────────────────────── */
      setPhase("search");
      let results;
      try {
        results = await searchPetPOI(AMap, loc);
      } catch (e) {
        fail("POI 搜索 (searchPetPOI)", e);
        return;
      }
      if (!alive) return;

      setAllPois(results);
      setPhase("done");

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

  /* ── markers 随分类更新 ────────────────────────────────── */
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

  /* ── helpers ─────────────────────────────────────────────*/
  const isLoading = ["sdk","locate","tiles","search"].includes(phase);
  const isError   = phase === "error";
  const isDone    = phase === "done";

  /* ════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════ */
  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column",
                  background:C.bg, position:"relative", overflow:"hidden" }}>

      {/* 顶部标题 */}
      <div style={{ background:"#fff", padding:"52px 18px 12px", flexShrink:0 }}>
        <div style={{ fontSize:20, fontWeight:800, color:C.text }}>🗺️ 宠物友好地图</div>
        <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>
          {isError ? (
            <span style={{ color:C.errTxt }}>⚠️ 加载失败 — 见下方错误详情</span>
          ) : !location ? "正在定位..." :
            location.source === "gps"
              ? `📍 当前位置${location.city ? ` · ${location.city}` : ""}`
              : "📍 GPS 失败 · 已定位至上海市中心"}
        </div>
      </div>

      {/* 分类筛选 */}
      <div style={{ background:"#fff", borderBottom:`1px solid ${C.border}`,
                    padding:"8px 14px", display:"flex", gap:8,
                    overflowX:"auto", scrollbarWidth:"none", flexShrink:0 }}>
        {CATEGORIES.map((cat) => {
          const on = activeCat.id === cat.id;
          return (
            <button key={cat.id}
              onClick={() => { setActiveCat(cat); setSelPoi(null); }}
              style={{ flexShrink:0, padding:"7px 15px", borderRadius:20, fontSize:12,
                       fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", transition:"all .18s",
                       background: on ? C.grad : C.light,
                       color:      on ? "#fff" : "#5A4A35",
                       border:     `1.5px solid ${on ? "transparent" : C.border}` }}>
              {cat.icon} {cat.label}
            </button>
          );
        })}
      </div>

      {/* 地图容器
          ⚠ height 必须是明确像素值。
          AMap 在 new AMap.Map() 时调用 getBoundingClientRect()，
          高度为 0 则底图不绘制。                               */}
      <div style={{ position:"relative", flexShrink:0, height:256, background:"#e8ede8" }}>

        {/* AMap 挂载点 */}
        <div ref={divRef} style={{ width:"100%", height:"100%" }} />

        {/* 瓦片加载中遮罩 */}
        {(isLoading && !tileReady) && (
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
                        alignItems:"center", justifyContent:"center",
                        background:"rgba(255,251,244,0.88)", gap:8, zIndex:10 }}>
            <div style={{ fontSize:26, animation:"tm-spin 1.2s linear infinite" }}>⟳</div>
            <div style={{ fontSize:12, color:C.sub, textAlign:"center", maxWidth:220 }}>
              {PHASE_LABEL[phase] || "加载中..."}
            </div>
          </div>
        )}

        {/* 地图区错误遮罩 */}
        {isError && (
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
                        alignItems:"center", justifyContent:"center",
                        background:C.err, padding:16, gap:8, zIndex:10 }}>
            <div style={{ fontSize:28 }}>⚠️</div>
            <div style={{ fontSize:12, fontWeight:700, color:C.errTxt }}>
              地图初始化失败
            </div>
            <div style={{ fontSize:11, color:C.errTxt, textAlign:"center", lineHeight:1.5 }}>
              出错步骤：{errStep}
            </div>
          </div>
        )}

        {/* 定位来源角标 */}
        {isDone && location?.source === "default" && (
          <div style={{ position:"absolute", bottom:8, left:8, zIndex:5,
                        background:"rgba(255,122,90,0.88)", color:"#fff",
                        borderRadius:10, padding:"3px 10px", fontSize:10, fontWeight:600 }}>
            GPS 失败 · 已显示上海
          </div>
        )}
      </div>

      {/* 错误详情卡片（地图区下方，完整展示错误信息）*/}
      {isError && (
        <div style={{ margin:"10px 14px 0", background:C.err,
                      border:`1.5px solid ${C.errTxt}44`, borderRadius:18,
                      padding:"14px 16px", flexShrink:0 }}>
          <div style={{ fontSize:13, fontWeight:800, color:C.errTxt, marginBottom:8 }}>
            ❌ 出错步骤：{errStep}
          </div>
          <div style={{ fontSize:12, color:C.errTxt, lineHeight:1.7,
                        wordBreak:"break-all", whiteSpace:"pre-wrap" }}>
            {errMsg}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop:12, width:"100%", padding:"11px 0", borderRadius:14,
                     background:C.grad, color:"#fff", fontSize:13, fontWeight:700,
                     border:"none", cursor:"pointer" }}>
            🔄 重新加载
          </button>
        </div>
      )}

      {/* POI 列表 */}
      <div style={{ flex:1, overflowY:"auto", padding:"10px 14px 88px" }}>

        {/* 状态栏 */}
        {!isError && (
          <div style={{ fontSize:11, color:C.sub, marginBottom:10,
                        fontWeight:600, display:"flex", alignItems:"center",
                        gap:6, minHeight:20 }}>
            {phase === "search" ? (
              <><span style={{ animation:"tm-spin 1s linear infinite",
                               display:"inline-block" }}>⟳</span>
                搜索中（11个关键词）...</>
            ) : isDone && pois !== null ? (
              <><span style={{ color:C.pri }}>●</span>
                {activeCat.id === "all"
                  ? `共 ${pois.length} 个宠物相关地点`
                  : `${activeCat.label}：${pois.length} 个地点`}</>
            ) : isLoading ? (
              <><span style={{ animation:"tm-spin 1s linear infinite",
                               display:"inline-block" }}>⟳</span>
                {PHASE_LABEL[phase]}</>
            ) : null}
          </div>
        )}

        {/* 空结果 */}
        {isDone && pois?.length === 0 && (
          <EmptyState cat={activeCat} hasOthers={(allPois?.length ?? 0) > 0} />
        )}

        {/* POI 卡片 */}
        {(pois || []).map((poi) => (
          <PoiCard key={poi.id} poi={poi} icon={activeCat.icon}
            selected={selPoi?.id === poi.id}
            onSelect={() => {
              setSelPoi(poi);
              const c = getCoords(poi.location);
              if (c && mapRef.current && window.AMap)
                mapRef.current.setCenter(new window.AMap.LngLat(c.lng, c.lat));
            }} />
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
               display:"flex", gap:12, alignItems:"flex-start",
               transition:"border-color .15s" }}>

      <div style={{ width:44, height:44, borderRadius:13, flexShrink:0,
                    background: selected ? "#FFF3E0" : C.light,
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
        {icon}
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:3,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
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
            {tel && (
              <Row icon="📞" text={tel}
                extra={
                  <a href={`tel:${tel}`}
                    style={{ marginLeft:10, color:C.pri, fontWeight:700,
                             textDecoration:"none", fontSize:12 }}>
                    拨打
                  </a>
                } />
            )}
          </div>

          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => openNavigation(poi)}
              style={{ flex:1, padding:"14px 0", borderRadius:16, background:C.grad,
                       color:"#fff", fontSize:14, fontWeight:700,
                       border:"none", cursor:"pointer" }}>
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
          : "已搜索 10km 范围，暂无相关地点"}
      </div>
    </div>
  );
}
