"use client";

/**
 * components/admin/MerchantReviews.jsx
 * 平台审核员用的两块审核面板，嵌入 /admin 页：
 *   - StoreReviewManager  商家资质审核
 *   - ProductReviewManager 商品审核
 * 读取走 anon（storeReviewService）；通过/驳回走 /api/admin/* service_role。
 */

import { useEffect, useState } from "react";
import {
  adminListStores, adminReviewStore,
  adminListProducts, adminReviewProduct, adminGetProductDocs, adminMapStores,
} from "@/services/storeReviewService";
import { PRODUCT_CATEGORIES } from "@/services/merchantService";

const C = {
  pri: "#E68645", tint: "#F2E5DA", bg: "#EEE9E1", card: "#FFFFFF",
  text: "#1A1006", sub: "#8A8074", border: "#D6D5D8", line: "#EFE9DF",
  errT: "#D94040", ok: "#2E7D32",
};

const STORE_TABS = [
  { key: "pending_review", label: "待审核" },
  { key: "approved", label: "已通过" },
  { key: "rejected", label: "不通过" },
  { key: "all", label: "全部" },
];
const PROD_TABS = [
  { key: "pending_review", label: "待审核" },
  { key: "approved", label: "审核通过" },
  { key: "rejected", label: "审核不通过" },
  { key: "all", label: "全部" },
];

const STORE_BADGE = {
  pending_review: { t: "审核中", c: "#9C5A00", b: "#FFF4D6" },
  approved: { t: "已通过", c: C.ok, b: "#E6F4E1" },
  rejected: { t: "不通过", c: C.errT, b: "#FFE2E2" },
};
const PROD_BADGE = {
  draft: { t: "草稿", c: C.sub, b: "#EFEAE1" },
  pending_review: { t: "待审核", c: "#9C5A00", b: "#FFF4D6" },
  approved: { t: "已上线", c: C.ok, b: "#E6F4E1" },
  rejected: { t: "已驳回", c: C.errT, b: "#FFE2E2" },
  offline: { t: "已下架", c: C.sub, b: "#E4DDD2" },
};

function fmt(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function Badge({ map, status }) {
  const s = map[status] || { t: status, c: C.sub, b: C.line };
  return <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 9px", borderRadius: 999, color: s.c, background: s.b }}>{s.t}</span>;
}
function Tabs({ tabs, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
      {tabs.map((t) => {
        const on = value === t.key;
        return (
          <button key={t.key} onClick={() => onChange(t.key)}
            style={{ padding: "6px 13px", borderRadius: 12, fontSize: 12, fontWeight: on ? 800 : 600, cursor: "pointer",
                     background: on ? C.pri : C.tint, color: on ? "#fff" : C.text, border: "none" }}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
function DocLink({ label, url }) {
  if (!url) return <span style={{ fontSize: 11, color: C.sub }}>{label}：未上传</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer"
      style={{ fontSize: 11, color: C.pri, fontWeight: 600, textDecoration: "none" }}>
      {label} · 查看文件 ↗
    </a>
  );
}

/* ── 商家资质审核 ───────────────────────────────────── */
export function StoreReviewManager({ adminId }) {
  const [tab, setTab] = useState("pending_review");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const reload = async () => {
    setLoading(true); setErr(null);
    try { setList(await adminListStores(tab)); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, [tab]); // eslint-disable-line

  const act = async (store, action) => {
    let reason = null;
    if (action === "reject") {
      reason = prompt("请输入驳回原因：");
      if (!reason?.trim()) return;
    } else if (!confirm(`通过店铺「${store.name}」的资质审核？`)) return;
    try { await adminReviewStore({ adminId, storeId: store.id, action, reason }); reload(); }
    catch (e) { alert(e.message); }
  };

  return (
    <Panel title="🏪 商家资质审核" sub="审核商家提交的店铺与公司资质，通过后店铺方可经营">
      <Tabs tabs={STORE_TABS} value={tab} onChange={setTab} />
      {loading && <Loading />}
      {err && <ErrLine msg={err} />}
      {!loading && !err && list.length === 0 && <EmptyLine text="暂无店铺 ✓" />}
      {list.map((s) => (
        <div key={s.id} style={rowStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, background: C.tint, flexShrink: 0, overflow: "hidden",
                           display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
              {s.logo_url ? <img src={s.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🏪"}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text }}>{s.name}</div>
              <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{s.company_name || "未填公司"} · {fmt(s.created_at)}</div>
            </div>
            <Badge map={STORE_BADGE} status={s.status} />
          </div>
          <div style={{ fontSize: 11.5, color: C.text, lineHeight: 1.7, marginBottom: 8 }}>
            {s.intro && <div style={{ color: C.sub }}>{s.intro}</div>}
            <div>联系方式：{s.contact || "—"}</div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 10 }}>
            <DocLink label="营业执照" url={s.license_url} />
            <DocLink label="品牌授权" url={s.brand_auth_url} />
            <DocLink label="食品/生产许可" url={s.food_license_url} />
          </div>
          {s.reject_reason && <div style={reasonStyle}>驳回原因：{s.reject_reason}</div>}
          {s.status === "pending_review" && (
            <div style={{ display: "flex", gap: 8 }}>
              <BtnSm tone="ok" onClick={() => act(s, "approve")}>通过</BtnSm>
              <BtnSm tone="err" onClick={() => act(s, "reject")}>驳回</BtnSm>
            </div>
          )}
        </div>
      ))}
    </Panel>
  );
}

/* ── 商品审核 ───────────────────────────────────────── */
export function ProductReviewManager({ adminId }) {
  const [tab, setTab] = useState("pending_review");
  const [list, setList] = useState([]);
  const [storeMap, setStoreMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [docs, setDocs] = useState({}); // productId -> docs[]

  const reload = async () => {
    setLoading(true); setErr(null);
    try {
      const rows = await adminListProducts(tab);
      setList(rows);
      setStoreMap(await adminMapStores([...new Set(rows.map((r) => r.store_id))]));
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, [tab]); // eslint-disable-line

  const toggle = async (p) => {
    if (openId === p.id) { setOpenId(null); return; }
    setOpenId(p.id);
    if (!docs[p.id]) {
      try { const d = await adminGetProductDocs(p.id); setDocs((m) => ({ ...m, [p.id]: d })); } catch {}
    }
  };

  const act = async (p, action) => {
    let reason = null;
    if (action === "reject") { reason = prompt("请输入驳回原因："); if (!reason?.trim()) return; }
    else if (action === "changes") { reason = prompt("请说明需要补充的材料："); if (!reason?.trim()) return; }
    else if (!confirm(`通过商品「${p.title}」的审核？通过后将在商城展示（需店铺也已通过）。`)) return;
    try { await adminReviewProduct({ adminId, productId: p.id, action, reason }); reload(); }
    catch (e) { alert(e.message); }
  };

  const catName = (id) => PRODUCT_CATEGORIES.find((c) => c.id === id)?.name || id;

  return (
    <Panel title="📦 商品审核" sub="审核商家提交的商品，通过后才会在用户端商城展示">
      <Tabs tabs={PROD_TABS} value={tab} onChange={setTab} />
      {loading && <Loading />}
      {err && <ErrLine msg={err} />}
      {!loading && !err && list.length === 0 && <EmptyLine text="暂无商品 ✓" />}
      {list.map((p) => {
        const open = openId === p.id;
        const st = storeMap[p.store_id];
        return (
          <div key={p.id} style={rowStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 44, height: 44, borderRadius: 10, background: C.tint, flexShrink: 0, overflow: "hidden",
                             display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                {p.main_image ? <img src={p.main_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🐾"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.text, overflow: "hidden",
                              textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>
                  ¥{p.price} · {catName(p.category_id)} · {st?.name || "店铺"}
                  {p.risk_level === "high" && <span style={{ color: C.errT, fontWeight: 700, marginLeft: 6 }}>高风险</span>}
                </div>
              </div>
              <Badge map={PROD_BADGE} status={p.status} />
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center" }}>
              <button onClick={() => toggle(p)} style={{ background: "none", border: "none", color: C.pri, fontSize: 11.5,
                       fontWeight: 700, cursor: "pointer", padding: 0 }}>
                {open ? "收起详情 ▲" : "查看详情 / 证明材料 ▼"}
              </button>
              <span style={{ fontSize: 11, color: C.sub }}>{p.submitted_at ? `提交 ${fmt(p.submitted_at)}` : ""}</span>
            </div>

            {open && (
              <div style={{ marginTop: 10, padding: "10px 12px", background: C.bg, borderRadius: 10 }}>
                {p.description && <div style={{ fontSize: 12, color: C.text, lineHeight: 1.7, marginBottom: 8 }}>{p.description}</div>}
                {(p.gallery?.length || p.detail_images?.length) ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                    {[...(p.gallery || []), ...(p.detail_images || [])].slice(0, 8).map((u, i) => (
                      <a key={i} href={u} target="_blank" rel="noreferrer">
                        <img src={u} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />
                      </a>
                    ))}
                  </div>
                ) : null}
                <div style={{ fontSize: 11.5, fontWeight: 700, color: C.text, marginBottom: 4 }}>证明材料</div>
                {docs[p.id]?.length ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    {docs[p.id].map((d) => <DocLink key={d.id} label={d.doc_type} url={d.file_url} />)}
                  </div>
                ) : <div style={{ fontSize: 11, color: C.sub }}>未上传证明材料</div>}
              </div>
            )}

            {p.reject_reason && <div style={reasonStyle}>{p.reject_reason}</div>}

            {p.status === "pending_review" && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <BtnSm tone="ok" onClick={() => act(p, "approve")}>通过</BtnSm>
                <BtnSm tone="err" onClick={() => act(p, "reject")}>驳回</BtnSm>
                <BtnSm tone="soft" onClick={() => act(p, "changes")}>要求补充材料</BtnSm>
              </div>
            )}
          </div>
        );
      })}
    </Panel>
  );
}

/* ── 小组件 ─────────────────────────────────────────── */
const rowStyle = { background: C.bg, borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: `1px solid ${C.border}` };
const reasonStyle = { fontSize: 11.5, color: C.errT, background: "#FFF0F0", borderRadius: 8, padding: "7px 10px", margin: "8px 0", lineHeight: 1.6 };

function Panel({ title, sub, children }) {
  return (
    <div style={{ background: C.card, borderRadius: 18, padding: "16px 14px",
                  border: `1px solid ${C.border}`, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 11, color: C.sub, marginBottom: 12 }}>{sub}</div>
      {children}
    </div>
  );
}
function Loading() { return <div style={{ textAlign: "center", color: C.sub, fontSize: 12, padding: 20 }}>加载中...</div>; }
function ErrLine({ msg }) { return <div style={{ color: C.errT, fontSize: 12, padding: 6 }}>❌ {msg}</div>; }
function EmptyLine({ text }) { return <div style={{ textAlign: "center", color: C.sub, fontSize: 13, padding: 22 }}>{text}</div>; }
function BtnSm({ children, onClick, tone }) {
  const tones = {
    ok: { bg: "#E6F4E1", c: C.ok }, err: { bg: "#FFE2E2", c: C.errT }, soft: { bg: C.tint, c: "#9C5A00" },
  };
  const t = tones[tone] || tones.soft;
  return (
    <button onClick={onClick} style={{ padding: "6px 14px", borderRadius: 10, fontSize: 11.5, fontWeight: 700,
             background: t.bg, color: t.c, border: "none", cursor: "pointer" }}>{children}</button>
  );
}
