"use client";

/**
 * components/map/FacilityParts.jsx
 * 「宠物设施地图」拆分组件（TailMe 暖色风）：
 *   FacilityModeSwitch   友好地图 / 宠物警示 切换
 *   FacilityCategoryChips 分类胶囊
 *   FriendlyPlaceCard    合作商户卡片
 *   WarningCard          宠物警示卡片
 *   WarningUploadEntry   上报宠物警示入口
 *   WarningDetail        宠物警示详情底部弹层（脱敏用户号）
 */

import { useState } from "react";
import { fmtDist, openNavigation } from "@/services/amapService";
import { typeInfo, riskInfo, reporterLabel, fmtAgo } from "@/services/warningTypes";

const C = {
  pri: "#E68645", tint: "#F2E5DA", bg: "#EEE9E1", text: "#1A1006", sub: "#8A8074",
  border: "#E4DDD2", danger: "#D9542B", dangerTint: "#FBE6DC",
};

const warnTitle = (r) => r.admin_title || r.title || typeInfo(r.event_type).label;

/* ══════════ 分类线性 SVG 图标（统一风格，替代 emoji）══════════ */
export function CategoryIcon({ id, size = 24, color = "#2A2A2A" }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
              strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round", style: { color, display: "block" } };
  switch (id) {
    case "bath": return (<svg {...p}><path d="M12 3v4"/><path d="M5 11a7 7 0 0 1 14 0Z"/><path d="M8 15v1.6M12 16v1.6M16 15v1.6"/></svg>);
    case "neuter": return (<svg {...p}><circle cx="6" cy="6.5" r="2.2"/><circle cx="6" cy="17.5" r="2.2"/><path d="M8 7.5l12 9M8 16.5l12-9"/></svg>);
    case "hospital": return (<svg {...p}><rect x="3" y="8" width="18" height="12" rx="2.2"/><path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M12 11.5v5M9.5 14h5"/></svg>);
    case "vaccine": return (<svg {...p}><path d="M4 20l4-4"/><path d="M14.5 3.5l6 6"/><path d="M17 6l-9 9 3 3 9-9z"/><path d="M11 9l3 3"/></svg>);
    case "grooming": return (<svg {...p}><circle cx="6" cy="7" r="2"/><circle cx="6" cy="17" r="2"/><path d="M8 8l11 8M8 16l11-8"/><path d="M20 4l.6 1.6L22 6l-1.4.4L20 8l-.6-1.6L18 6l1.4-.4z"/></svg>);
    case "petting": return (<svg {...p}><ellipse cx="9" cy="13.5" rx="2.4" ry="3"/><ellipse cx="15" cy="13.5" rx="2.4" ry="3"/><ellipse cx="11" cy="9.5" rx="1.7" ry="2.2"/><ellipse cx="16.5" cy="10" rx="1.5" ry="2"/><path d="M5 6c2 2 4 2 6 1"/></svg>);
    case "buy": return (<svg {...p}><circle cx="9" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/><path d="M3 4h2l2.2 11h10l1.8-7H6.2"/><circle cx="12" cy="9" r="0.6" fill="currentColor"/><circle cx="14" cy="9" r="0.6" fill="currentColor"/></svg>);
    case "checkup": return (<svg {...p}><path d="M6 3v6a4 4 0 0 0 8 0V3"/><path d="M10 17a4.5 4.5 0 0 0 9 0v-3"/><circle cx="19" cy="12.5" r="2"/></svg>);
    case "deworm": return (<svg {...p}><ellipse cx="12" cy="13" rx="4.5" ry="5.5"/><path d="M12 8.5V7M10 9L8 7M14 9l2-2"/><path d="M7.5 12H5M16.5 12H19M7.5 15.5l-2 1M16.5 15.5l2 1"/></svg>);
    case "supplies": return (<svg {...p}><path d="M7 8h10l-1 11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z"/><path d="M9 8c0-2.2 1.3-4 3-4s3 1.8 3 4"/><circle cx="12" cy="13.5" r="1.6"/></svg>);
    case "park": return (<svg {...p}><path d="M7 21V4"/><path d="M7 5h10l-2.2 3L17 11H7"/></svg>);
    case "training": return (<svg {...p}><circle cx="9" cy="14" r="5"/><path d="M13.5 12l7-3v4.2l-6 1"/><path d="M9 9V6h3"/></svg>);
    case "boarding": return (<svg {...p}><path d="M4 11l8-6 8 6"/><path d="M6 10v9h12v-9"/><circle cx="12" cy="14.5" r="1.4"/><circle cx="9.6" cy="13" r="0.7" fill="currentColor"/><circle cx="14.4" cy="13" r="0.7" fill="currentColor"/></svg>);
    case "transport": return (<svg {...p}><rect x="4" y="7" width="16" height="12" rx="2"/><path d="M9 7V5h6v2"/><circle cx="12" cy="13" r="2.4"/><path d="M4 11h2M18 11h2"/></svg>);
    case "photo": return (<svg {...p}><rect x="3" y="7" width="18" height="12" rx="2.4"/><circle cx="12" cy="13" r="3.2"/><path d="M8.5 7l1.3-2h4.4L15.5 7"/></svg>);
    default: return (<svg {...p}><ellipse cx="8" cy="12" rx="1.8" ry="2.4"/><ellipse cx="16" cy="12" rx="1.8" ry="2.4"/><ellipse cx="11" cy="8.5" rx="1.6" ry="2.1"/><ellipse cx="15" cy="9" rx="1.4" ry="1.9"/><path d="M12 13.5c2.2 0 4 1.5 4 3.4 0 1.5-1.3 2.2-2.8 2.2-.9 0-1.2-.3-1.9-.3s-1 .3-1.9.3C7.9 19.1 6.5 18.4 6.5 16.9c0-1.9 1.8-3.4 4-3.4z"/></svg>);
  }
}

export function GridIcon({ size = 16, color = "#E68645" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ color, display: "block" }}>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" /><rect x="13" y="3.5" width="7.5" height="7.5" rx="2" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="2" /><rect x="13" y="13" width="7.5" height="7.5" rx="2" />
    </svg>
  );
}

export function PawIcon({ size = 24, color = "#E68645" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ color, display: "block" }}>
      <ellipse cx="6.2" cy="11" rx="2" ry="2.6"/><ellipse cx="11" cy="8.4" rx="2.1" ry="2.8"/>
      <ellipse cx="16.4" cy="9.6" rx="2" ry="2.6"/><ellipse cx="19.2" cy="13.6" rx="1.7" ry="2.2"/>
      <path d="M12.4 13c2.4 0 4.4 1.7 4.4 3.8 0 1.7-1.5 2.5-3.2 2.5-1 0-1.4-.3-2.2-.3s-1.2.3-2.2.3c-1.7 0-3.2-.8-3.2-2.5 0-2.1 2-3.8 4.4-3.8Z"/>
    </svg>
  );
}

/* ── 顶部 3 主 Tab：设施地图 / 友好地图 / 宠物警示 ───────── */
export function FacilityTopTabs({ tab, onChange }) {
  const opts = [
    { id: "facility", label: "设施地图" },
    { id: "friendly", label: "友好地图" },
    { id: "warning",  label: "宠物警示" },
  ];
  const idx = Math.max(0, opts.findIndex((o) => o.id === tab));
  return (
    <div style={{ position: "relative", display: "flex", background: "#fff", borderRadius: 999,
                  padding: 4, boxShadow: "0 2px 10px rgba(0,0,0,0.06)", border: `1px solid ${C.border}` }}>
      <div style={{ position: "absolute", top: 4, bottom: 4, left: 4, width: "calc((100% - 8px)/3)",
                    borderRadius: 999, background: C.pri, transition: "transform .25s cubic-bezier(.4,0,.2,1)",
                    transform: `translateX(${idx * 100}%)`, boxShadow: "0 3px 10px rgba(230,134,69,0.32)" }} />
      {opts.map((o) => {
        const on = o.id === tab;
        return (
          <button key={o.id} onClick={() => onChange(o.id)}
            style={{ position: "relative", zIndex: 1, flex: 1, padding: "10px 0", border: "none",
                     background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 800,
                     color: on ? "#fff" : C.sub, transition: "color .2s" }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── 主模式切换（旧，保留备用）────────────────────────── */
export function FacilityModeSwitch({ mode, onChange }) {
  const opts = [
    { id: "friendly", label: "友好地图" },
    { id: "warning",  label: "宠物警示" },
  ];
  const idx = Math.max(0, opts.findIndex((o) => o.id === mode));
  return (
    <div style={{ position: "relative", display: "flex", background: "#fff", borderRadius: 999,
                  padding: 4, boxShadow: "0 2px 10px rgba(0,0,0,0.06)", border: `1px solid ${C.border}` }}>
      <div style={{ position: "absolute", top: 4, bottom: 4, left: 4, width: "calc(50% - 4px)",
                    borderRadius: 999, background: C.pri, transition: "transform .25s cubic-bezier(.4,0,.2,1)",
                    transform: `translateX(${idx * 100}%)`, boxShadow: "0 3px 10px rgba(230,134,69,0.32)" }} />
      {opts.map((o) => {
        const on = o.id === mode;
        return (
          <button key={o.id} onClick={() => onChange(o.id)}
            style={{ position: "relative", zIndex: 1, flex: 1, padding: "10px 0", border: "none",
                     background: "transparent", cursor: "pointer", fontSize: 14.5, fontWeight: 800,
                     color: on ? "#fff" : C.sub, transition: "color .2s" }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── 分类胶囊 ─────────────────────────────────────────── */
/* ── 分类筛选：一行快捷分类(纯文字) + 「全部分类」宫格面板 ───────── */
export function FacilityCategoryFilter({ categories, quickIds, gridCategories, activeId, onPick, accent = C.pri }) {
  const [open, setOpen] = useState(false);
  const quick = quickIds.map((id) => categories.find((c) => c.id === id)).filter(Boolean);
  const activeIsQuick = quickIds.includes(activeId);
  const moreActive = open || !activeIsQuick;

  return (
    <div style={{ position: "relative", zIndex: 7 }}>
      {/* 快捷行：一行内完整显示，不换行、不横滑 */}
      <div style={{ display: "flex", flexWrap: "nowrap", gap: 5, alignItems: "center" }}>
        {quick.map((c) => {
          const on = activeId === c.id;
          return (
            <button key={c.id} onClick={() => { onPick(c.id); setOpen(false); }}
              style={{ flexShrink: 0, padding: "7px 10px", borderRadius: 999, cursor: "pointer", whiteSpace: "nowrap",
                       fontSize: 12, fontWeight: on ? 800 : 600, transition: "all .15s",
                       background: on ? accent : "#FFFDF9", color: on ? "#fff" : "#2A2A2A",
                       border: `1px solid ${on ? "transparent" : "#E8DED3"}`,
                       boxShadow: on ? `0 3px 10px ${accent}44` : "0 1px 4px rgba(0,0,0,0.04)" }}>
              {c.label}
            </button>
          );
        })}
        {/* 全部分类（永远显示在右侧，不换行）*/}
        <button onClick={() => setOpen((o) => !o)}
          style={{ flexShrink: 0, marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, padding: "7px 10px",
                   borderRadius: 999, cursor: "pointer", whiteSpace: "nowrap", fontSize: 12, fontWeight: 800, transition: "all .15s",
                   background: "#FFFDF9", color: accent, border: `1.4px solid ${accent}`,
                   boxShadow: moreActive ? `0 3px 10px ${accent}33` : "none" }}>
          <GridIcon size={13} color={accent} />全部分类
          <span style={{ fontSize: 10, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", lineHeight: 1 }}>⌄</span>
        </button>
      </div>

      {/* 全部分类宫格面板 */}
      {open && (
        <>
          <div onClick={() => setOpen(false)}
               style={{ position: "fixed", inset: 0, zIndex: 6, background: "transparent" }} />
          <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, zIndex: 8,
                        background: "#FFFDF9", borderRadius: 22, padding: "13px 10px",
                        boxShadow: "0 12px 34px rgba(0,0,0,0.14)", border: `1px solid ${C.border}`,
                        animation: "tm-cat-panel .2s ease-out" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px 5px" }}>
              {gridCategories.map((c) => {
                const on = activeId === c.id;
                return (
                  <button key={c.id} onClick={() => { onPick(c.id); setOpen(false); }}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7,
                             height: 70, borderRadius: 14, cursor: "pointer", transition: "all .15s",
                             background: on ? "#FFF3E8" : "#fff",
                             border: `1.4px solid ${on ? accent : "#EFE7DC"}` }}>
                    <CategoryIcon id={c.id} size={24} color={on ? accent : "#3A352F"} />
                    <span style={{ fontSize: 12, fontWeight: on ? 800 : 600, color: on ? accent : "#2A2A2A" }}>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <style>{`@keyframes tm-cat-panel{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
        </>
      )}
    </div>
  );
}

/* ── 合作商户卡片 ─────────────────────────────────────── */
export function FriendlyPlaceCard({ place, selected, onSelect, onNavigate }) {
  return (
    <div onClick={onSelect}
      style={{ background: selected ? C.tint : "#fff", borderRadius: 20, padding: 14, marginBottom: 12,
               boxShadow: "0 4px 16px rgba(0,0,0,0.06)", cursor: "pointer", display: "flex", gap: 13,
               border: `1.5px solid ${selected ? C.pri : "transparent"}`, transition: "all .15s" }}>
      <div style={{ width: 72, height: 72, borderRadius: 16, flexShrink: 0, overflow: "hidden",
                    background: C.tint, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {place.coverUrl
          ? <img src={place.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: 32 }}>{place.cover || "🐾"}</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: C.text, overflow: "hidden",
                       textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{place.name}</span>
        {place.rating && <div style={{ fontSize: 12, fontWeight: 700, color: "#F0A030", marginTop: 2 }}>⭐ {place.rating}</div>}
        <div style={{ fontSize: 11.5, color: C.sub, margin: "3px 0 6px", overflow: "hidden",
                      textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📍 {place.address}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          <Chip tone="pri">合作商户</Chip>
          {(place.services || []).map((s) => <Chip key={s}>{s}</Chip>)}
        </div>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ flex: 1 }} />
          {place.distance != null && <span style={{ fontSize: 12, fontWeight: 700, color: C.sub }}>{fmtDist(place.distance)}</span>}
          <button onClick={(e) => { e.stopPropagation(); onNavigate?.(place); }}
            style={{ fontSize: 12, fontWeight: 800, color: "#fff", background: C.pri, border: "none",
                     borderRadius: 999, padding: "6px 14px", cursor: "pointer", boxShadow: "0 3px 10px rgba(230,134,69,0.3)" }}>
            导航 →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 宠物警示卡片 ─────────────────────────────────────── */
export function WarningCard({ report, selected, onSelect, onView }) {
  const t = typeInfo(report.event_type);
  const rk = riskInfo(report.risk_level);
  return (
    <div onClick={onSelect}
      style={{ background: selected ? C.dangerTint : "#fff", borderRadius: 20, padding: 14, marginBottom: 12,
               boxShadow: "0 4px 16px rgba(0,0,0,0.06)", cursor: "pointer", display: "flex", gap: 13,
               border: `1.5px solid ${selected ? C.danger : "transparent"}`, transition: "all .15s" }}>
      <div style={{ width: 72, height: 72, borderRadius: 16, flexShrink: 0, overflow: "hidden",
                    background: C.dangerTint, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {report.images?.[0]
          ? <img src={report.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: 30 }}>{t.icon}</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, overflow: "hidden",
                      textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{warnTitle(report)}</div>
        <div style={{ fontSize: 11.5, color: C.sub, margin: "3px 0 6px", lineHeight: 1.45,
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {report.description}
        </div>
        <div style={{ fontSize: 11, color: C.sub, marginBottom: 7 }}>
          {report._distance != null ? `${fmtDist(report._distance)} · ` : ""}{fmtAgo(report.reviewed_at || report.created_at)}
        </div>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <RiskBadge level={report.risk_level} />
          <Chip>{t.label}</Chip>
          <span style={{ flex: 1 }} />
          <button onClick={(e) => { e.stopPropagation(); onView?.(report); }}
            style={{ fontSize: 12, fontWeight: 800, color: C.danger, background: "#fff", border: `1.5px solid ${C.danger}`,
                     borderRadius: 999, padding: "5px 13px", cursor: "pointer" }}>
            查看详情
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 上报宠物警示入口 ─────────────────────────────────── */
export function WarningUploadEntry({ onClick }) {
  return (
    <button onClick={onClick}
      style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12,
               background: "#fff", border: `1.5px dashed ${C.danger}`, borderRadius: 18, padding: "13px 15px",
               marginBottom: 14, cursor: "pointer" }}>
      <span style={{ width: 40, height: 40, borderRadius: 12, background: C.dangerTint, flexShrink: 0,
                     display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>⚠️</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.danger }}>上报宠物警示</div>
        <div style={{ fontSize: 11.5, color: C.sub, marginTop: 2, lineHeight: 1.4 }}>
          提交宠物相关风险，审核通过后展示给附近宠物家长
        </div>
      </div>
      <span style={{ fontSize: 18, color: C.danger }}>＋</span>
    </button>
  );
}

/* ── 宠物警示详情（底部弹层）──────────────────────────── */
export function WarningDetail({ report, onClose }) {
  if (!report) return null;
  const t = typeInfo(report.event_type);
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(26,16,6,0.44)",
                  display: "flex", alignItems: "flex-end" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ width: "100%", background: "#fff", borderRadius: "22px 22px 0 0", padding: "0 0 40px",
                    maxHeight: "80%", overflowY: "auto", animation: "tm-up .22s ease-out" }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: "#E0D4C8", margin: "14px auto 12px" }} />
        <div style={{ padding: "0 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.sub, marginBottom: 8 }}>宠物警示详情</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <RiskBadge level={report.risk_level} />
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                           color: C.danger, background: C.dangerTint }}>{t.icon} {t.label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                           color: "#2E7D32", background: "#E6F4E1" }}>已审核</span>
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, color: C.text, marginBottom: 12 }}>{warnTitle(report)}</div>
          {report.images?.length > 0 && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 14 }} className="shop-noscroll">
              {report.images.map((u, i) => (
                <img key={i} src={u} alt="" style={{ width: 124, height: 124, borderRadius: 14, objectFit: "cover", flexShrink: 0 }} />
              ))}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            <Row icon="📍" text={report.address || "未提供具体地址"} />
            {report._distance != null && <Row icon="📏" text={`距您约 ${fmtDist(report._distance)}`} />}
            {report.description && <Row icon="📝" text={report.description} />}
            <Row icon="🕓" text={`提交于 ${fmtAgo(report.created_at)}${report.reviewed_at ? ` · 审核于 ${fmtAgo(report.reviewed_at)}` : ""}`} />
            <Row icon="👤" text={`由${report.anonymous ? "匿名用户" : reporterLabel(report)}上传`} />
          </div>
          <button onClick={onClose}
            style={{ width: "100%", padding: "14px 0", borderRadius: 16, background: C.pri, color: "#fff",
                     fontSize: 14, fontWeight: 800, border: "none", cursor: "pointer" }}>我知道了</button>
        </div>
      </div>
    </div>
  );
}

/* ── 友好地点详情（底部弹层，含导航）─────────────────── */
const FRIENDLY_PERKS = [
  { key: "has_water_bowl",   label: "提供水碗",   icon: "💧" },
  { key: "has_food_bowl",    label: "提供喂食碗", icon: "🥣" },
  { key: "allow_pet_inside", label: "允许进店",   icon: "🚪" },
  { key: "good_for_rest",    label: "适合休息",   icon: "🛋️" },
];
export function FriendlyDetail({ report, onClose, onNavigate }) {
  if (!report) return null;
  const perks = FRIENDLY_PERKS.filter((p) => report[p.key]);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1500, background: "rgba(26,16,6,0.44)", display: "flex", alignItems: "flex-end" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ width: "100%", background: "#fff", borderRadius: "22px 22px 0 0", padding: "0 0 40px", maxHeight: "80%", overflowY: "auto", animation: "tm-up .22s ease-out" }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: "#E0D4C8", margin: "14px auto 12px" }} />
        <div style={{ padding: "0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Chip tone="pri">🐾 宠物友好</Chip>
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, color: C.text, marginBottom: 12 }}>{report.title || report.place_name || "宠物友好地点"}</div>
          {report.images?.length > 0 && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 14 }} className="shop-noscroll">
              {report.images.map((u, i) => <img key={i} src={u} alt="" style={{ width: 124, height: 124, borderRadius: 14, objectFit: "cover", flexShrink: 0 }} />)}
            </div>
          )}
          {perks.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {perks.map((p) => <Chip key={p.key} tone="pri">{p.icon} {p.label}</Chip>)}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            <Row icon="📍" text={report.address || report.place_name || "未提供地址"} />
            {report._distance != null && <Row icon="📏" text={`距您约 ${fmtDist(report._distance)}`} />}
            {report.description && <Row icon="📝" text={report.description} />}
            <Row icon="🕓" text={`提交于 ${fmtAgo(report.created_at)}`} />
            <Row icon="👤" text={`由${report.anonymous ? "匿名用户" : reporterLabel(report)}上传`} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => onNavigate?.(report)}
              style={{ flex: 1, padding: "14px 0", borderRadius: 16, background: C.pri, color: "#fff", fontSize: 14, fontWeight: 800, border: "none", cursor: "pointer" }}>
              🗺️ 导航前往
            </button>
            <button onClick={onClose}
              style={{ width: 48, height: 48, borderRadius: 13, background: "#EDE6DB", border: `1.5px solid ${C.border}`, cursor: "pointer", fontSize: 18, color: C.sub, flexShrink: 0 }}>✕</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 小件 ─────────────────────────────────────────────── */
export function RiskBadge({ level }) {
  const rk = riskInfo(level);
  return (
    <span style={{ fontSize: 10.5, fontWeight: 800, padding: "3px 9px", borderRadius: 999,
                   color: rk.color, background: rk.bg }}>{rk.label}</span>
  );
}
function Chip({ children, tone = "soft" }) {
  const map = { soft: { bg: "#F4EEE4", color: C.sub }, pri: { bg: "#FBEEE1", color: C.pri } };
  const s = map[tone] || map.soft;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
                   background: s.bg, color: s.color, whiteSpace: "nowrap" }}>{children}</span>
  );
}
function Row({ icon, text }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#5A4A35", lineHeight: 1.55 }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <span style={{ flex: 1 }}>{text}</span>
    </div>
  );
}
