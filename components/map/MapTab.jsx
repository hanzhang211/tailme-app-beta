"use client";

/**
 * components/map/MapTab.jsx — 宠物设施地图（3 主 Tab）
 *
 *   设施地图：真实 POI（保留定位/搜索/导航）+ 合作商户 + 分类 chips + 下方列表（原能力）
 *   友好地图：大地图模式，用户上报的宠物友好地点（真实，v1 提交即展示），label marker + 详情(含导航)
 *   宠物警示：大地图模式，仅展示 approved 警示（admin 审核），label marker + 详情；无 chips/列表
 *
 * 共用一个 AMap 实例；切 Tab 只换标记/布局，不重建地图。底部 tab、其它页面不受影响。
 */

import { useState, useEffect, useRef, useMemo } from "react";
import {
  getMyLocation, loadMapSDK, searchPetPOI,
  getCoords, fmtDist, fmtTel, openNavigation,
} from "@/services/amapService";
import { FRIENDLY_CATEGORIES } from "@/services/facilityMock";
import { typeInfo, riskInfo, distanceMeters } from "@/services/warningTypes";
import { listApprovedWarnings } from "@/services/warningService";
import { listFriendlyReports } from "@/services/friendlyService";
import MapIcon from "@/components/MapIcon";
import {
  FacilityTopTabs, FacilityCategoryChips,
  WarningDetail, FriendlyDetail,
} from "./FacilityParts";
import DangerReportForm from "./DangerReportForm";
import FriendlyReportForm from "./FriendlyReportForm";
import PlacePicker from "./PlacePicker";

const C = {
  pri: "#E68645", grad: "#E68645", accent: "#E68645", tint: "#F2E5DA", bg: "#EEE9E1",
  text: "#1A1006", sub: "#8A8074", light: "#D6D5D8", border: "#D6D5D8",
  err: "#FFF0F0", errT: "#C0392B", danger: "#D9542B",
};

const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// 地图 label 最多显示 6 个字，超出省略；完整标题在详情里看
const short6 = (s) => { const t = String(s || ""); return t.length > 6 ? t.slice(0, 6) + "…" : t; };

const ME_MARKER = `
  <div style="position:relative;width:26px;height:26px;display:flex;align-items:center;justify-content:center">
    <div style="position:absolute;width:26px;height:26px;border-radius:50%;background:rgba(66,133,244,0.22);animation:tm-pulse 2s ease-out infinite"></div>
    <div style="width:14px;height:14px;border-radius:50%;background:#4285F4;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(66,133,244,0.55)"></div>
  </div>`;
const poiMarker = (icon) =>
  `<div style="width:32px;height:32px;border-radius:50%;background:#E68645;border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;box-shadow:0 3px 8px rgba(0,0,0,0.4)">${icon}</div>`;
// 带文字 label 的 marker（友好/警示大地图用），anchor=bottom-center
const labelMarker = (text, color, lead = "") =>
  `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer">
     <div style="max-width:150px;background:#fff;border:1.5px solid ${color};color:${color};font-size:11px;font-weight:800;padding:4px 9px;border-radius:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 2px 8px rgba(0,0,0,0.18)">${lead}${esc(text)}</div>
     <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${color};margin-top:-1px"></div>
   </div>`;

/* ════════════════════════════════════════════════════════ */
export default function MapTab() {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const mksRef = useRef([]);

  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(true);
  const [mapPhase, setMapPhase] = useState("loading");
  const [mapErr, setMapErr] = useState(null);
  const [allPois, setAllPois] = useState(null);
  const [poiLoading, setPoiLoading] = useState(false);
  const [poiErr, setPoiErr] = useState(null);

  const [tab, setTab] = useState("facility");           // facility | friendly | warning
  const [facilityCat, setFacilityCat] = useState("all");
  const [selPoi, setSelPoi] = useState(null);

  const [warnings, setWarnings] = useState(null);
  const [warnVer, setWarnVer] = useState(0);
  const [selWarning, setSelWarning] = useState(null);
  const [showWarnForm, setShowWarnForm] = useState(false);

  const [friendlies, setFriendlies] = useState(null);
  const [friVer, setFriVer] = useState(0);
  const [selFriendly, setSelFriendly] = useState(null);
  const [showFriForm, setShowFriForm] = useState(false);

  const [showSearch, setShowSearch] = useState(false);
  const bigMap = tab !== "facility";

  /* 警示 / 友好 真实数据 */
  useEffect(() => {
    let alive = true;
    listApprovedWarnings().then((r) => alive && setWarnings(r)).catch(() => alive && setWarnings([]));
    return () => { alive = false; };
  }, [warnVer]);
  useEffect(() => {
    let alive = true;
    listFriendlyReports().then((r) => alive && setFriendlies(r)).catch(() => alive && setFriendlies([]));
    return () => { alive = false; };
  }, [friVer]);

  const facilityCatObj = FRIENDLY_CATEGORIES.find((c) => c.id === facilityCat) || FRIENDLY_CATEGORIES[0];
  const pois = useMemo(() => {
    if (!allPois) return null;
    if (facilityCat === "partner") return [];
    return allPois.filter(facilityCatObj.poiTest);
  }, [allPois, facilityCat]); // eslint-disable-line

  const baseLoc = location || { lng: 121.4737, lat: 31.2304 };

  const withDist = (rows) => (rows || []).map((r) => ({
    ...r,
    _distance: (r.latitude != null && r.longitude != null)
      ? distanceMeters({ lat: baseLoc.lat, lng: baseLoc.lng }, { lat: r.latitude, lng: r.longitude }) : null,
  }));
  const warns = useMemo(() => withDist(warnings), [warnings, baseLoc.lat, baseLoc.lng]);
  const fris  = useMemo(() => withDist(friendlies), [friendlies, baseLoc.lat, baseLoc.lng]);

  /* ── 初始化（只跑一次）─────────────────────────────── */
  useEffect(() => {
    let alive = true;
    (async () => {
      const loc = await getMyLocation();
      if (!alive) return;
      setLocation(loc); setLocating(false);
      loadMapSDK().then((AMap) => {
        if (!alive || !divRef.current) return;
        try {
          const map = new AMap.Map(divRef.current, {
            zoom: 14, center: new AMap.LngLat(loc.lng, loc.lat),
            resizeEnable: true, expandZoomRange: true, zooms: [3, 20],
          });
          mapRef.current = map;
          new AMap.Marker({ map, position: new AMap.LngLat(loc.lng, loc.lat), content: ME_MARKER, offset: new AMap.Pixel(-13, -13), zIndex: 200 });
          map.on("complete", () => { if (alive) setMapPhase("ready"); });
          setTimeout(() => { if (alive && mapPhase === "loading") setMapPhase("ready"); }, 12000);
        } catch (e) { if (alive) { setMapPhase("error"); setMapErr("new AMap.Map() 失败: " + e.message); } }
      }).catch((e) => { if (alive) { setMapPhase("error"); setMapErr(e.message); } });

      setPoiLoading(true);
      try { const r = await searchPetPOI(loc.lat, loc.lng); if (alive) setAllPois(r); }
      catch (e) { if (alive) setPoiErr(e.message); }
      finally { if (alive) setPoiLoading(false); }
    })();
    return () => {
      alive = false;
      mksRef.current.forEach((m) => { try { m.setMap(null); } catch {} });
      mksRef.current = [];
      if (mapRef.current) { try { mapRef.current.destroy(); } catch {} mapRef.current = null; }
    };
  }, []); // eslint-disable-line

  /* 切 Tab 后让地图重排（容器尺寸变化）*/
  useEffect(() => {
    const t = setTimeout(() => { try { mapRef.current?.resize(); } catch {} }, 60);
    return () => clearTimeout(t);
  }, [tab]);

  /* ── markers 随 Tab / 数据更新 ───────────────────────── */
  useEffect(() => {
    const AMap = window?.AMap;
    if (!AMap || !mapRef.current) return;
    mksRef.current.forEach((m) => { try { m.setMap(null); } catch {} });
    mksRef.current = [];
    const addCircle = (lng, lat, content, onClick, z = 100) => {
      const mk = new AMap.Marker({ map: mapRef.current, position: new AMap.LngLat(lng, lat), content, offset: new AMap.Pixel(-17, -17), zIndex: z });
      if (onClick) mk.on("click", onClick);
      mksRef.current.push(mk);
    };
    const addLabel = (lng, lat, content, onClick, z = 110) => {
      const mk = new AMap.Marker({ map: mapRef.current, position: new AMap.LngLat(lng, lat), content, anchor: "bottom-center", zIndex: z });
      if (onClick) mk.on("click", onClick);
      mksRef.current.push(mk);
    };

    if (tab === "facility") {
      (pois || []).slice(0, 60).forEach((poi) => {
        const c = getCoords(poi.location); if (!c) return;
        addCircle(c.lng, c.lat, poiMarker(facilityCatObj.icon), () => { setSelPoi(poi); mapRef.current?.setCenter(new AMap.LngLat(c.lng, c.lat)); });
      });
    } else if (tab === "friendly") {
      fris.forEach((r) => {
        if (r.latitude == null || r.longitude == null) return;
        addLabel(r.longitude, r.latitude, labelMarker(short6(r.title || r.place_name || "友好地点"), C.pri, "🐾 "),
          () => { setSelFriendly(r); mapRef.current?.setCenter(new AMap.LngLat(r.longitude, r.latitude)); });
      });
    } else {
      warns.forEach((r) => {
        if (r.latitude == null || r.longitude == null) return;
        addLabel(r.longitude, r.latitude, labelMarker(short6(r.admin_title || r.title || typeInfo(r.event_type).label), riskInfo(r.risk_level).pin),
          () => { setSelWarning(r); mapRef.current?.setCenter(new AMap.LngLat(r.longitude, r.latitude)); });
      });
    }

    // 大地图（友好/警示）：自动缩放到所有标记，避免点位远离当前定位而“看不到”
    if (tab !== "facility" && mksRef.current.length > 0) {
      try { mapRef.current.setFitView(mksRef.current, false, [80, 80, 80, 80], 16); } catch {}
    }
  }, [tab, pois, fris, warns, facilityCatObj.icon]);

  const switchTab = (t) => {
    setTab(t); setSelPoi(null); setSelWarning(null); setSelFriendly(null);
    if (t === "friendly") setFriVer((v) => v + 1);   // 切到该 Tab 时刷新，确保看到最新审核通过的点
    if (t === "warning") setWarnVer((v) => v + 1);
  };
  const recenter = () => { if (mapRef.current && window.AMap && location) mapRef.current.setCenter(new window.AMap.LngLat(location.lng, location.lat)); };
  const onSearchPick = (p) => { setShowSearch(false); if (mapRef.current && window.AMap) { mapRef.current.setCenter(new window.AMap.LngLat(p.lng, p.lat)); mapRef.current.setZoom(16); } };

  /* ════════════════════════════════════════════════════ */
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg, position: "relative", overflow: "hidden" }}>

      {/* 顶部标题 + 3 Tab */}
      <div style={{ background: "#fff", padding: "52px 18px 12px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MapIcon size={40} color={C.pri} />
          <span style={{ fontSize: 20, fontWeight: 800, color: C.text }}>宠物设施地图</span>
        </div>
        <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>查看附近宠物设施与宠物提醒</div>
        <div style={{ fontSize: 11.5, color: C.sub, marginTop: 5 }}>
          {locating ? "正在定位..." : location?.source === "gps" ? `📍 当前定位${location.city ? ` · ${location.city}` : ""}` : "📍 GPS 失败 · 已显示上海市中心"}
        </div>
        <div style={{ marginTop: 12 }}>
          <FacilityTopTabs tab={tab} onChange={switchTab} />
        </div>
      </div>

      {/* 设施地图：分类 chips */}
      {tab === "facility" && (
        <div style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                      borderBottom: `1px solid ${C.border}`, padding: "10px 14px", flexShrink: 0 }}>
          <FacilityCategoryChips categories={FRIENDLY_CATEGORIES} activeId={facilityCat}
            onPick={(id) => { setFacilityCat(id); setSelPoi(null); }} />
        </div>
      )}

      {/* 地图区域 */}
      <div style={{ position: "relative", flex: bigMap ? 1 : "none", flexShrink: bigMap ? 1 : 0,
                    height: bigMap ? "auto" : 256, margin: bigMap ? 0 : "10px 14px 4px",
                    borderRadius: bigMap ? 0 : 22, overflow: "hidden",
                    boxShadow: bigMap ? "none" : "0 6px 20px rgba(0,0,0,0.08)",
                    background: mapPhase === "error" ? C.err : "#e8ede8" }}>
        <div ref={divRef} style={{ width: "100%", height: "100%" }} />

        {/* 定位/提示 chip */}
        {mapPhase === "ready" && (
          <div style={{ position: "absolute", top: 10, left: 10, zIndex: 6, background: "rgba(255,255,255,0.86)",
                        backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", borderRadius: 14, padding: "6px 12px",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.08)" }}>
            {tab === "warning" ? (
              <div><div style={{ fontSize: 11.5, fontWeight: 800, color: C.danger, display: "flex", alignItems: "center", gap: 4 }}>⚠️ 用户上传</div>
                   <div style={{ fontSize: 10, color: C.sub, marginTop: 1 }}>Admin 审核后展示</div></div>
            ) : (
              <div style={{ fontSize: 11.5, fontWeight: 600, color: C.text, display: "flex", alignItems: "center", gap: 4 }}>
                📍 {locating ? "定位中…" : (location?.source === "gps" ? "当前定位" : "上海市中心")}{location?.city ? ` · ${location.city}` : ""}
              </div>
            )}
          </div>
        )}

        {/* 大地图悬浮控件（友好 / 警示）*/}
        {bigMap && mapPhase === "ready" && (
          <div style={{ position: "absolute", right: 14, bottom: 22, zIndex: 6, display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-end" }}>
            <RoundBtn icon="🔍" label="搜索" onClick={() => setShowSearch(true)} />
            <RoundBtn icon="📍" label="定位" onClick={recenter} />
            <button onClick={() => (tab === "friendly" ? setShowFriForm(true) : setShowWarnForm(true))}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 18px", borderRadius: 999, border: "none",
                       background: tab === "friendly" ? C.pri : C.danger, color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer",
                       boxShadow: `0 6px 18px ${tab === "friendly" ? "rgba(230,134,69,0.45)" : "rgba(217,84,43,0.45)"}` }}>
              ＋ {tab === "friendly" ? "上报友好地点" : "上报宠物警示"}
            </button>
          </div>
        )}

        {/* 大地图空态提示（数据为空时叠加，不挡操作）*/}
        {bigMap && mapPhase === "ready" && (
          (tab === "friendly" ? (friendlies && fris.length === 0) : (warnings && warns.length === 0)) && (
            <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 5,
                          background: "rgba(255,255,255,0.92)", borderRadius: 14, padding: "8px 16px", fontSize: 12, color: C.sub,
                          boxShadow: "0 2px 10px rgba(0,0,0,0.08)", whiteSpace: "nowrap" }}>
              {tab === "friendly" ? "还没有友好地点，点右下角上报一个吧 🐾" : "附近暂无宠物警示"}
            </div>
          )
        )}

        {mapPhase === "loading" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(255,255,255,0.92)", zIndex: 5 }}>
            <div style={{ fontSize: 24, animation: "tm-spin 1.2s linear infinite" }}>⟳</div>
            <div style={{ fontSize: 12, color: C.sub }}>加载地图底图...</div>
          </div>
        )}
        {mapPhase === "error" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, background: C.err, padding: "16px 20px", zIndex: 5 }}>
            <div style={{ fontSize: 22 }}>🗺️</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.errT, textAlign: "center" }}>地图底图加载失败</div>
            <div style={{ fontSize: 10, color: C.errT, textAlign: "center", lineHeight: 1.5, maxWidth: 260, wordBreak: "break-all", whiteSpace: "pre-wrap" }}>{mapErr}</div>
          </div>
        )}
      </div>

      {/* 设施地图：分类统计 + 列表 */}
      {tab === "facility" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px 88px" }}>
          <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 10, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, minHeight: 20 }}>
            {poiLoading
              ? <><span style={{ animation: "tm-spin 1s linear infinite", display: "inline-block" }}>⟳</span> 搜索附近宠物设施...</>
              : <><span style={{ color: C.accent }}>●</span> 共发现 {pois?.length || 0} 个宠物设施</>}
          </div>
          {poiErr && (
            <div style={{ background: C.err, border: `1.5px solid ${C.errT}44`, borderRadius: 16, padding: "12px 14px", marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.errT, marginBottom: 6 }}>❌ POI 搜索失败</div>
              <div style={{ fontSize: 11, color: C.errT, lineHeight: 1.6, wordBreak: "break-all", whiteSpace: "pre-wrap" }}>{poiErr}</div>
            </div>
          )}
          {!poiLoading && !poiErr && (pois?.length ?? 0) === 0 && (
            <EmptyState cat={facilityCatObj} hasOthers={(allPois?.length ?? 0) > 0} />
          )}
          {(pois || []).map((poi) => (
            <PoiCard key={poi.id} poi={poi} icon={facilityCatObj.icon} selected={selPoi?.id === poi.id}
              onSelect={() => { setSelPoi(poi); const c = getCoords(poi.location); if (c && mapRef.current && window.AMap) mapRef.current.setCenter(new window.AMap.LngLat(c.lng, c.lat)); }} />
          ))}
        </div>
      )}

      {/* 详情 / 表单 / 搜索 */}
      {selPoi && <PoiDetail poi={selPoi} onClose={() => setSelPoi(null)} />}
      {selFriendly && <FriendlyDetail report={selFriendly} onClose={() => setSelFriendly(null)}
        onNavigate={(r) => openNavigation({ name: r.title || r.place_name || "友好地点", location: `${r.longitude},${r.latitude}` })} />}
      {selWarning && <WarningDetail report={selWarning} onClose={() => setSelWarning(null)} />}

      {showFriForm && <FriendlyReportForm location={location} onClose={() => setShowFriForm(false)} onSubmitted={() => setFriVer((v) => v + 1)} />}
      {showWarnForm && <DangerReportForm location={location} onClose={() => setShowWarnForm(false)} onSubmitted={() => setWarnVer((v) => v + 1)} />}

      {showSearch && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1600, background: "rgba(26,16,6,0.4)", display: "flex", alignItems: "flex-end" }}
          onClick={(e) => e.target === e.currentTarget && setShowSearch(false)}>
          <div style={{ width: "100%", background: "#fff", borderRadius: "22px 22px 0 0", padding: "16px 16px 30px", maxHeight: "76%", overflowY: "auto", animation: "tm-up .22s ease-out" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>搜索地点</div>
              <span onClick={() => setShowSearch(false)} style={{ fontSize: 20, color: C.sub, cursor: "pointer" }}>×</span>
            </div>
            <PlacePicker location={location} placeholder="搜索门店、小区或地址" onPick={onSearchPick} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes tm-spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes tm-pulse { 0%{transform:scale(1);opacity:.8} 100%{transform:scale(2.4);opacity:0} }
        @keyframes tm-up    { from{transform:translateY(100%)} to{transform:translateY(0)} }
        .shop-noscroll::-webkit-scrollbar{display:none;}
        .shop-noscroll{scrollbar-width:none;-ms-overflow-style:none;}
      `}</style>
    </div>
  );
}

function RoundBtn({ icon, label, onClick }) {
  return (
    <button onClick={onClick}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, width: 48, height: 48, borderRadius: "50%",
               background: "#fff", border: `1px solid ${C.border}`, boxShadow: "0 3px 10px rgba(0,0,0,0.12)", cursor: "pointer" }}>
      <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 9, fontWeight: 700, color: C.sub }}>{label}</span>
    </button>
  );
}

/* ════════ 设施地图：POI 卡片（保留原能力）════════ */
function PoiCard({ poi, icon, selected, onSelect }) {
  const dist = fmtDist(poi.distance);
  const type = poi.type?.split(";").slice(-1)[0] ?? "";
  const addr = poi.address || [poi.pname, poi.cityname, poi.adname].filter(Boolean).join("") || "地址未知";
  const photo = poi.photos?.[0]?.url || null;
  const ratingRaw = poi.biz_ext?.rating ?? poi.rating;
  const rating = ratingRaw && ratingRaw !== "[]" && ratingRaw !== "" ? ratingRaw : null;
  const [imgOk, setImgOk] = useState(!!photo);
  return (
    <div onClick={onSelect}
      style={{ background: selected ? C.tint : "#fff", borderRadius: 20, padding: 14, marginBottom: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.06)", cursor: "pointer", display: "flex", gap: 13, border: `1.5px solid ${selected ? C.pri : "transparent"}`, transition: "all .15s" }}>
      <div style={{ width: 72, height: 72, borderRadius: 16, flexShrink: 0, overflow: "hidden", background: C.tint, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {photo && imgOk ? <img src={photo} alt={poi.name} loading="lazy" onError={() => setImgOk(false)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : <span style={{ fontSize: 30 }}>{icon}</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{poi.name}</div>
        {rating && <div style={{ fontSize: 12, fontWeight: 700, color: "#F0A030", marginBottom: 2 }}>⭐ {rating}</div>}
        <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📍 {addr}</div>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {type && <span style={{ fontSize: 10, background: C.tint, color: C.accent, padding: "3px 9px", borderRadius: 999, fontWeight: 600, flexShrink: 0, maxWidth: 96, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{type}</span>}
          <span style={{ flex: 1 }} />
          {dist && <span style={{ fontSize: 12, fontWeight: 700, color: C.sub, flexShrink: 0 }}>{dist}</span>}
          <button onClick={(e) => { e.stopPropagation(); openNavigation(poi); }}
            style={{ flexShrink: 0, fontSize: 12, fontWeight: 800, color: "#fff", background: C.grad, border: "none", borderRadius: 999, padding: "5px 12px", cursor: "pointer", boxShadow: "0 3px 10px rgba(230,134,69,0.3)" }}>导航 →</button>
        </div>
      </div>
    </div>
  );
}

function PoiDetail({ poi, onClose }) {
  const dist = fmtDist(poi.distance);
  const tel = fmtTel(poi.tel);
  const type = poi.type?.split(";").slice(-1)[0] ?? "";
  const addr = poi.address || [poi.pname, poi.cityname, poi.adname].filter(Boolean).join("") || "";
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1500, background: "rgba(26,16,6,0.44)", display: "flex", alignItems: "flex-end" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ width: "100%", background: "#fff", borderRadius: "22px 22px 0 0", padding: "0 0 44px", boxSizing: "border-box", maxHeight: "74%", overflowY: "auto", animation: "tm-up .22s ease-out" }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: "#E0D4C8", margin: "14px auto 18px" }} />
        <div style={{ padding: "0 20px" }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: C.text, marginBottom: 6 }}>{poi.name}</div>
          {type && <span style={{ display: "inline-block", fontSize: 11, background: C.tint, color: C.accent, padding: "3px 10px", borderRadius: 20, marginBottom: 16, fontWeight: 600 }}>{type}</span>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
            {addr && <Row icon="📍" text={addr} />}
            {dist && <Row icon="📏" text={`距您约 ${dist}`} />}
            {tel && <Row icon="📞" text={tel} extra={<a href={`tel:${tel}`} style={{ marginLeft: 10, color: C.accent, fontWeight: 700, textDecoration: "none", fontSize: 12 }}>拨打</a>} />}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => openNavigation(poi)} style={{ flex: 1, padding: "14px 0", borderRadius: 16, background: C.grad, color: "#fff", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer" }}>🗺️ 打开高德地图导航</button>
            <button onClick={onClose} style={{ width: 48, height: 48, borderRadius: 13, background: C.light, border: `1.5px solid ${C.border}`, cursor: "pointer", fontSize: 18, color: C.sub, flexShrink: 0 }}>✕</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, text, extra }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#5A4A35", lineHeight: 1.5 }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <span style={{ flex: 1 }}>{text}{extra}</span>
    </div>
  );
}

function EmptyState({ cat, hasOthers }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 24px", color: C.sub }}>
      <div style={{ fontSize: 40, marginBottom: 14 }}>{cat.icon}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>附近暂未找到{cat.id === "all" ? "宠物相关" : cat.label}设施</div>
      <div style={{ fontSize: 12, lineHeight: 1.7 }}>{hasOthers && cat.id !== "all" ? "该分类无结果，可切换「全部」查看其他设施" : "已搜索 10km 范围，暂无相关设施"}</div>
    </div>
  );
}
