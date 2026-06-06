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

import { fmtDist } from "@/services/amapService";
import { typeInfo, riskInfo, reporterLabel, fmtAgo } from "@/services/warningTypes";

const C = {
  pri: "#E68645", tint: "#F2E5DA", bg: "#EEE9E1", text: "#1A1006", sub: "#8A8074",
  border: "#E4DDD2", danger: "#D9542B", dangerTint: "#FBE6DC",
};

const warnTitle = (r) => r.admin_title || r.title || typeInfo(r.event_type).label;

/* ── 主模式切换：友好地图 / 宠物警示 ───────────────────── */
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
export function FacilityCategoryChips({ categories, activeId, onPick, accent = C.pri }) {
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", padding: "2px 0" }}
         className="shop-noscroll">
      {categories.map((c) => {
        const on = activeId === c.id;
        return (
          <button key={c.id} onClick={() => onPick(c.id)}
            style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 5, padding: "8px 14px",
                     borderRadius: 999, cursor: "pointer", whiteSpace: "nowrap", fontSize: 13,
                     fontWeight: on ? 800 : 600, transition: "all .15s",
                     background: on ? accent : "#fff", color: on ? "#fff" : C.text,
                     border: `1px solid ${on ? "transparent" : C.border}`,
                     boxShadow: on ? `0 3px 10px ${accent}44` : "0 1px 4px rgba(0,0,0,0.04)" }}>
            <span style={{ fontSize: 14 }}>{c.icon}</span>{c.label}
          </button>
        );
      })}
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
