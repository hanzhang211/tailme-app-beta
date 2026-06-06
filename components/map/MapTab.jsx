"use client";

/**
 * components/map/MapTab.jsx — 宠物设施地图（友好地图 / 宠物警示 双模式）
 *
 * 双 Key 架构（不变）：
 *   轨道 A（地图）: getMyLocation → loadMapSDK → new AMap.Map → 渲染底图
 *   轨道 B（POI）:  getMyLocation → searchPetPOI（REST API）→ 渲染卡片列表
 *
 * 在此之上新增「主模式切换」：
 *   友好地图 = 真实 POI（不破坏）+ 合作商户(mock)
 *   宠物警示 = 真实警示数据(仅展示 approved)，含上报入口与详情
 * 切换不跳页，只换 pins / 分类 chips / 统计 / 列表。
 */

import { useState, useEffect, useRef, useMemo } from "react";
import {
  getMyLocation, loadMapSDK, searchPetPOI,
  getCoords, fmtDist, fmtTel, openNavigation,
} from "@/services/amapService";
import { FRIENDLY_CATEGORIES, listPartners } from "@/services/facilityMock";
import { WARNING_FILTERS, typeGroupId, riskInfo, distanceMeters } from "@/services/warningTypes";
import { listApprovedWarnings } from "@/services/warningService";
import MapIcon from "@/components/MapIcon";
import {
  FacilityModeSwitch, FacilityCategoryChips, FriendlyPlaceCard,
  WarningCard, WarningUploadEntry, WarningDetail,
} from "./FacilityParts";
import DangerReportForm from "./DangerReportForm";

/* ── theme ─────────────────────────────────────────────── */
const C = {
  pri: "#E68645", grad: "#E68645", accent: "#E68645", tint: "#F2E5DA", bg: "#EEE9E1",
  text: "#1A1006", sub: "#8A8074", light: "#D6D5D8", border: "#D6D5D8",
  err: "#FFF0F0", errT: "#C0392B", danger: "#D9542B",
};

/* ── marker html ────────────────────────────────────────── */
const ME_MARKER = `
  <div style="position:relative;width:26px;height:26px;display:flex;align-items:center;justify-content:center">
    <div style="position:absolute;width:26px;height:26px;border-radius:50%;background:rgba(66,133,244,0.22);animation:tm-pulse 2s ease-out infinite"></div>
    <div style="width:14px;height:14px;border-radius:50%;background:#4285F4;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(66,133,244,0.55)"></div>
  </div>`;
const poiMarker = (icon) =>
  `<div style="width:32px;height:32px;border-radius:50%;background:#E68645;border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;box-shadow:0 3px 8px rgba(0,0,0,0.4)">${icon}</div>`;
const partnerMarker = () =>
  `<div style="width:36px;height:36px;border-radius:50%;background:#E68645;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;box-shadow:0 4px 10px rgba(230,134,69,0.55)">🐾</div>`;
const warnMarker = (color = "#E0552A") =>
  `<div style="width:34px;height:34px;border-radius:50%;background:${color};border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:#fff;cursor:pointer;box-shadow:0 3px 9px rgba(192,57,43,0.5)">!</div>`;

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

  /* ── 模式 / 分类 / 选中 ─────────────────────────────── */
  const [mode, setMode] = useState("friendly");          // friendly | warning
  const [friendlyCat, setFriendlyCat] = useState("all");
  const [warningCat, setWarningCat] = useState("all");   // all + 6 大类
  const [selPoi, setSelPoi] = useState(null);
  const [selWarning, setSelWarning] = useState(null);
  const [showForm, setShowForm] = useState(false);

  /* 宠物警示真实数据（仅 approved）*/
  const [warnings, setWarnings] = useState(null);
  const [warnLoading, setWarnLoading] = useState(false);
  const [warnVer, setWarnVer] = useState(0);

  useEffect(() => {
    let alive = true;
    setWarnLoading(true);
    listApprovedWarnings()
      .then((rows) => { if (alive) setWarnings(rows); })
      .catch(() => { if (alive) setWarnings([]); })
      .finally(() => { if (alive) setWarnLoading(false); });
    return () => { alive = false; };
  }, [warnVer]);

  const friendlyCatObj = FRIENDLY_CATEGORIES.find((c) => c.id === friendlyCat) || FRIENDLY_CATEGORIES[0];

  /* 友好：真实 POI 过滤 */
  const pois = useMemo(() => {
    if (!allPois) return null;
    if (friendlyCat === "partner") return [];
    return allPois.filter(friendlyCatObj.poiTest);
  }, [allPois, friendlyCat]); // eslint-disable-line

  const baseLoc = location || { lng: 121.4737, lat: 31.2304 };

  /* 合作商户（mock，偏移叠加定位） */
  const partners = useMemo(
    () => listPartners(friendlyCat).map((p) => {
      const lng = baseLoc.lng + p.offset[0], lat = baseLoc.lat + p.offset[1];
      return { ...p, lng, lat, location: `${lng},${lat}` };
    }),
    [friendlyCat, baseLoc.lng, baseLoc.lat]);

  /* 警示：真实坐标 + 按大类过滤 + 计算距离 */
  const warns = useMemo(() => {
    if (!warnings) return [];
    return warnings
      .filter((r) => warningCat === "all" || typeGroupId(r.event_type) === warningCat)
      .map((r) => ({
        ...r,
        _distance: (r.latitude != null && r.longitude != null)
          ? distanceMeters({ lat: baseLoc.lat, lng: baseLoc.lng }, { lat: r.latitude, lng: r.longitude })
          : null,
      }));
  }, [warnings, warningCat, baseLoc.lat, baseLoc.lng]);

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
          new AMap.Marker({ map, position: new AMap.LngLat(loc.lng, loc.lat),
            content: ME_MARKER, offset: new AMap.Pixel(-13, -13), zIndex: 200 });
          map.on("complete", () => { if (alive) setMapPhase("ready"); });
          setTimeout(() => { if (alive && mapPhase === "loading") setMapPhase("ready"); }, 12000);
        } catch (e) {
          if (alive) { setMapPhase("error"); setMapErr("new AMap.Map() 失败: " + e.message); }
        }
      }).catch((e) => { if (alive) { setMapPhase("error"); setMapErr(e.message); } });

      setPoiLoading(true);
      try {
        const results = await searchPetPOI(loc.lat, loc.lng);
        if (alive) setAllPois(results);
      } catch (e) { if (alive) setPoiErr(e.message); }
      finally { if (alive) setPoiLoading(false); }
    })();

    return () => {
      alive = false;
      mksRef.current.forEach((m) => { try { m.setMap(null); } catch {} });
      mksRef.current = [];
      if (mapRef.current) { try { mapRef.current.destroy(); } catch {} mapRef.current = null; }
    };
  }, []); // eslint-disable-line

  /* ── markers 随模式 / 分类更新 ──────────────────────── */
  useEffect(() => {
    const AMap = window?.AMap;
    if (!AMap || !mapRef.current) return;
    mksRef.current.forEach((m) => { try { m.setMap(null); } catch {} });
    mksRef.current = [];

    const add = (lng, lat, content, onClick, z = 100) => {
      const mk = new AMap.Marker({ map: mapRef.current, position: new AMap.LngLat(lng, lat),
        content, offset: new AMap.Pixel(-17, -17), zIndex: z });
      if (onClick) mk.on("click", onClick);
      mksRef.current.push(mk);
    };

    if (mode === "friendly") {
      partners.forEach((p) => add(p.lng, p.lat, partnerMarker(), () => {
        setSelPoi(null);
        mapRef.current?.setCenter(new AMap.LngLat(p.lng, p.lat));
      }, 120));
      (pois || []).slice(0, 60).forEach((poi) => {
        const c = getCoords(poi.location); if (!c) return;
        add(c.lng, c.lat, poiMarker(friendlyCatObj.icon), () => {
          setSelPoi(poi);
          mapRef.current?.setCenter(new AMap.LngLat(c.lng, c.lat));
        });
      });
    } else {
      warns.forEach((r) => {
        if (r.latitude == null || r.longitude == null) return;
        add(r.longitude, r.latitude, warnMarker(riskInfo(r.risk_level).pin), () => {
          setSelWarning(r);
          mapRef.current?.setCenter(new AMap.LngLat(r.longitude, r.latitude));
        });
      });
    }
  }, [mode, partners, pois, warns, friendlyCatObj.icon]);

  /* 切换模式：清空选中 */
  const switchMode = (m) => { setMode(m); setSelPoi(null); setSelWarning(null); };

  const friendlyCount = (partners.length) + (pois?.length || 0);

  /* ════════════════════════════════════════════════════ */
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column",
                  background: C.bg, position: "relative", overflow: "hidden" }}>

      {/* 顶部标题 */}
      <div style={{ background: "#fff", padding: "52px 18px 12px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MapIcon size={40} color={C.pri} />
          <span style={{ fontSize: 20, fontWeight: 800, color: C.text }}>宠物设施地图</span>
        </div>
        <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>查看附近宠物友好设施与宠物警示</div>
        <div style={{ fontSize: 11.5, color: C.sub, marginTop: 5 }}>
          {locating ? "正在定位..." :
            location?.source === "gps"
              ? `📍 当前定位${location.city ? ` · ${location.city}` : ""}`
              : "📍 GPS 失败 · 已显示上海市中心"}
        </div>

        {/* 主模式切换 */}
        <div style={{ marginTop: 12 }}>
          <FacilityModeSwitch mode={mode} onChange={switchMode} />
        </div>
      </div>

      {/* 分类 chips */}
      <div style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)", borderBottom: `1px solid ${C.border}`,
                    padding: "10px 14px", flexShrink: 0 }}>
        {mode === "friendly" ? (
          <FacilityCategoryChips categories={FRIENDLY_CATEGORIES} activeId={friendlyCat}
            onPick={(id) => { setFriendlyCat(id); setSelPoi(null); }} />
        ) : (
          <FacilityCategoryChips categories={WARNING_FILTERS} activeId={warningCat}
            onPick={(id) => { setWarningCat(id); setSelWarning(null); }} accent={C.danger} />
        )}
      </div>

      {/* 地图区域 */}
      <div style={{ position: "relative", flexShrink: 0, height: 256, margin: "10px 14px 4px",
                    borderRadius: 22, overflow: "hidden", boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
                    background: mapPhase === "error" ? C.err : "#e8ede8" }}>
        <div ref={divRef} style={{ width: "100%", height: "100%" }} />

        {/* 当前定位 chip / 上报提示 */}
        {mapPhase === "ready" && (
          <div style={{ position: "absolute", top: 10, left: 10, zIndex: 6,
                        background: "rgba(255,255,255,0.86)", backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)", borderRadius: 14, padding: "6px 12px",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.08)" }}>
            {mode === "friendly" ? (
              <div style={{ fontSize: 11.5, fontWeight: 600, color: C.text, display: "flex", alignItems: "center", gap: 4 }}>
                📍 {locating ? "定位中…" : (location?.source === "gps" ? "当前定位" : "上海市中心")}
                {location?.city ? ` · ${location.city}` : ""}
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: C.danger, display: "flex", alignItems: "center", gap: 4 }}>⚠️ 用户上传</div>
                <div style={{ fontSize: 10, color: C.sub, marginTop: 1 }}>Admin 审核后展示</div>
              </div>
            )}
          </div>
        )}

        {/* 宠物警示模式：地图内悬浮上报按钮 */}
        {mode === "warning" && mapPhase === "ready" && (
          <button onClick={() => setShowForm(true)}
            style={{ position: "absolute", right: 12, bottom: 12, zIndex: 6, display: "flex",
                     flexDirection: "column", alignItems: "center", gap: 1, width: 54, height: 54,
                     borderRadius: "50%", background: C.danger, color: "#fff", border: "2.5px solid #fff",
                     boxShadow: "0 4px 12px rgba(217,84,43,0.5)", cursor: "pointer" }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>＋</span>
            <span style={{ fontSize: 9, fontWeight: 700 }}>上报</span>
          </button>
        )}

        {mapPhase === "loading" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center", gap: 8,
                        background: "rgba(255,255,255,0.92)", zIndex: 5 }}>
            <div style={{ fontSize: 24, animation: "tm-spin 1.2s linear infinite" }}>⟳</div>
            <div style={{ fontSize: 12, color: C.sub }}>加载地图底图...</div>
          </div>
        )}
        {mapPhase === "error" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center", gap: 6, background: C.err,
                        padding: "16px 20px", zIndex: 5 }}>
            <div style={{ fontSize: 22 }}>🗺️</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.errT, textAlign: "center" }}>地图底图加载失败</div>
            <div style={{ fontSize: 10, color: C.errT, textAlign: "center", lineHeight: 1.5, maxWidth: 260,
                          wordBreak: "break-all", whiteSpace: "pre-wrap" }}>{mapErr}</div>
            <div style={{ fontSize: 10, color: C.sub, textAlign: "center" }}>列表仍然可用（见下方）</div>
          </div>
        )}
      </div>

      {/* 列表区域 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px 88px" }}>

        {/* 统计 */}
        <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 10, fontWeight: 600,
                      display: "flex", alignItems: "center", gap: 6, minHeight: 20 }}>
          {mode === "friendly" ? (
            poiLoading ? (
              <><span style={{ animation: "tm-spin 1s linear infinite", display: "inline-block" }}>⟳</span> 搜索附近宠物友好设施...</>
            ) : (
              <><span style={{ color: C.accent }}>●</span> 共发现 {friendlyCount} 个宠物友好设施</>
            )
          ) : warnLoading && warnings == null ? (
            <><span style={{ animation: "tm-spin 1s linear infinite", display: "inline-block" }}>⟳</span> 加载宠物警示...</>
          ) : (
            <><span style={{ color: C.danger }}>●</span> 共发现 {warns.length} 条宠物警示</>
          )}
        </div>

        {/* ── 友好地图 ───────────────────────────────── */}
        {mode === "friendly" && (
          <>
            {partners.map((p) => (
              <FriendlyPlaceCard key={p.id} place={p}
                onNavigate={(pl) => openNavigation({ name: pl.name, location: pl.location })} />
            ))}

            {poiErr && (
              <div style={{ background: C.err, border: `1.5px solid ${C.errT}44`, borderRadius: 16,
                            padding: "12px 14px", marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.errT, marginBottom: 6 }}>❌ POI 搜索失败</div>
                <div style={{ fontSize: 11, color: C.errT, lineHeight: 1.6, wordBreak: "break-all", whiteSpace: "pre-wrap" }}>{poiErr}</div>
              </div>
            )}

            {!poiLoading && !poiErr && (pois?.length ?? 0) === 0 && partners.length === 0 && (
              <EmptyState cat={friendlyCatObj} hasOthers={(allPois?.length ?? 0) > 0} />
            )}

            {(pois || []).map((poi) => (
              <PoiCard key={poi.id} poi={poi} icon={friendlyCatObj.icon}
                selected={selPoi?.id === poi.id}
                onSelect={() => {
                  setSelPoi(poi);
                  const c = getCoords(poi.location);
                  if (c && mapRef.current && window.AMap) mapRef.current.setCenter(new window.AMap.LngLat(c.lng, c.lat));
                }} />
            ))}
          </>
        )}

        {/* ── 宠物警示 ───────────────────────────────── */}
        {mode === "warning" && (
          <>
            <WarningUploadEntry onClick={() => setShowForm(true)} />
            {warns.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 24px", color: C.sub }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🐾</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>
                  {warnLoading ? "加载中…" : "附近暂无宠物警示"}
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.7 }}>发现风险地点？点上方「上报宠物警示」帮助其他宠物家长</div>
              </div>
            ) : warns.map((r) => (
              <WarningCard key={r.id} report={r} selected={selWarning?.id === r.id}
                onSelect={() => {
                  setSelWarning(r);
                  if (r.latitude != null && mapRef.current && window.AMap)
                    mapRef.current.setCenter(new window.AMap.LngLat(r.longitude, r.latitude));
                }}
                onView={() => setSelWarning(r)} />
            ))}
          </>
        )}
      </div>

      {/* 友好 POI 详情 */}
      {selPoi && <PoiDetail poi={selPoi} onClose={() => setSelPoi(null)} />}
      {/* 宠物警示详情 */}
      {selWarning && <WarningDetail report={selWarning} onClose={() => setSelWarning(null)} />}
      {/* 上报页面 */}
      {showForm && (
        <DangerReportForm location={location}
          onClose={() => setShowForm(false)}
          onSubmitted={() => setWarnVer((v) => v + 1)} />
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

/* ════════════════════════════════════════════════════════
   友好 POI 列表卡片（保留原能力）
════════════════════════════════════════════════════════ */
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
      style={{ background: selected ? C.tint : "#fff", borderRadius: 20, padding: 14, marginBottom: 12,
               boxShadow: "0 4px 16px rgba(0,0,0,0.06)", cursor: "pointer", display: "flex", gap: 13,
               border: `1.5px solid ${selected ? C.pri : "transparent"}`, transition: "all .15s" }}>
      <div style={{ width: 72, height: 72, borderRadius: 16, flexShrink: 0, overflow: "hidden",
                    background: C.tint, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {photo && imgOk
          ? <img src={photo} alt={poi.name} loading="lazy" onError={() => setImgOk(false)}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          : <span style={{ fontSize: 30 }}>{icon}</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 2,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{poi.name}</div>
        {rating && <div style={{ fontSize: 12, fontWeight: 700, color: "#F0A030", marginBottom: 2 }}>⭐ {rating}</div>}
        <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 6,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📍 {addr}</div>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {type && (
            <span style={{ fontSize: 10, background: C.tint, color: C.accent, padding: "3px 9px", borderRadius: 999,
                           fontWeight: 600, flexShrink: 0, maxWidth: 96, overflow: "hidden",
                           textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{type}</span>
          )}
          <span style={{ flex: 1 }} />
          {dist && <span style={{ fontSize: 12, fontWeight: 700, color: C.sub, flexShrink: 0 }}>{dist}</span>}
          <button onClick={(e) => { e.stopPropagation(); openNavigation(poi); }}
            style={{ flexShrink: 0, fontSize: 12, fontWeight: 800, color: "#fff", background: C.grad, border: "none",
                     borderRadius: 999, padding: "5px 12px", cursor: "pointer", boxShadow: "0 3px 10px rgba(230,134,69,0.3)" }}>
            导航 →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 友好 POI 详情底部弹窗（保留）──────────────────────── */
function PoiDetail({ poi, onClose }) {
  const dist = fmtDist(poi.distance);
  const tel = fmtTel(poi.tel);
  const type = poi.type?.split(";").slice(-1)[0] ?? "";
  const addr = poi.address || [poi.pname, poi.cityname, poi.adname].filter(Boolean).join("") || "";

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(26,16,6,0.44)",
                  display: "flex", alignItems: "flex-end" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ width: "100%", background: "#fff", borderRadius: "22px 22px 0 0", padding: "0 0 44px",
                    boxSizing: "border-box", maxHeight: "74%", overflowY: "auto", animation: "tm-up .22s ease-out" }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: "#E0D4C8", margin: "14px auto 18px" }} />
        <div style={{ padding: "0 20px" }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: C.text, marginBottom: 6 }}>{poi.name}</div>
          {type && (
            <span style={{ display: "inline-block", fontSize: 11, background: C.tint, color: C.accent,
                           padding: "3px 10px", borderRadius: 20, marginBottom: 16, fontWeight: 600 }}>{type}</span>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
            {addr && <Row icon="📍" text={addr} />}
            {dist && <Row icon="📏" text={`距您约 ${dist}`} />}
            {tel && <Row icon="📞" text={tel} extra={
              <a href={`tel:${tel}`} style={{ marginLeft: 10, color: C.accent, fontWeight: 700, textDecoration: "none", fontSize: 12 }}>拨打</a>
            } />}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => openNavigation(poi)}
              style={{ flex: 1, padding: "14px 0", borderRadius: 16, background: C.grad, color: "#fff",
                       fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer" }}>🗺️ 打开高德地图导航</button>
            <button onClick={onClose}
              style={{ width: 48, height: 48, borderRadius: 13, background: C.light, border: `1.5px solid ${C.border}`,
                       cursor: "pointer", fontSize: 18, color: C.sub, flexShrink: 0 }}>✕</button>
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
      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>
        附近暂未找到{cat.id === "all" ? "宠物相关" : cat.label}设施
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.7 }}>
        {hasOthers && cat.id !== "all" ? "该分类无结果，可切换「全部」查看其他设施" : "已搜索 10km 范围，暂无相关设施"}
      </div>
    </div>
  );
}
