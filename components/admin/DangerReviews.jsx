"use client";

/**
 * components/admin/DangerReviews.jsx
 * 平台审核员：「宠物警示审核」，嵌入 /admin。真实 Supabase 数据（走 service_role API）。
 * Admin 可改事件名称 / 事件类型 / 设风险等级 / 备注，并 通过 / 驳回 / 删除。
 * 只有审核通过(approved)的宠物警示才会出现在用户端地图。
 */

import { useEffect, useState } from "react";
import { adminListWarnings, adminReviewWarning } from "@/services/warningAdminService";
import { adminListFriendly, adminEditFriendlyTitle, adminDeleteFriendly } from "@/services/friendlyAdminService";
import { WARNING_GROUPS, typeInfo, riskInfo, maskUserId, fmtAgo, RISK_LEVELS } from "@/services/warningTypes";

const C = {
  pri: "#E68645", tint: "#F2E5DA", bg: "#EEE9E1", card: "#FFFFFF",
  text: "#1A1006", sub: "#8A8074", border: "#D6D5D8", line: "#EFE9DF",
  errT: "#D94040", ok: "#2E7D32", danger: "#D9542B",
};
const TABS = [
  { key: "pending", label: "待审核" },
  { key: "approved", label: "已通过" },
  { key: "rejected", label: "已驳回" },
  { key: "all", label: "全部" },
];
const ALL_TYPES = WARNING_GROUPS.flatMap((g) => g.types.map((t) => ({ ...t, group: g.label })));

export function DangerReviewManager({ adminId }) {
  const [tab, setTab] = useState("pending");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [openId, setOpenId] = useState(null);

  const reload = async () => {
    if (!adminId) return;
    setLoading(true); setErr(null);
    try { setList(await adminListWarnings(adminId, tab)); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, [tab, adminId]); // eslint-disable-line

  return (
    <div style={{ background: C.card, borderRadius: 18, padding: "16px 14px",
                  border: `1px solid ${C.border}`, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 2 }}>⚠️ 宠物警示审核</div>
      <div style={{ fontSize: 11, color: C.sub, marginBottom: 12 }}>
        审核用户上报的宠物警示 · 可改名称/类型、设风险等级 · 仅「通过」会展示在用户端地图
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ flex: 1, padding: "7px 0", borderRadius: 12, fontSize: 12, fontWeight: on ? 800 : 600,
                       background: on ? C.pri : C.tint, color: on ? "#fff" : C.text, border: "none", cursor: "pointer" }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {loading && <div style={{ textAlign: "center", color: C.sub, fontSize: 12, padding: 20 }}>加载中...</div>}
      {err && <div style={{ color: C.errT, fontSize: 12, padding: 6 }}>❌ {err}</div>}
      {!loading && !err && list.length === 0 && (
        <div style={{ textAlign: "center", color: C.sub, fontSize: 13, padding: 24 }}>暂无记录 ✓</div>
      )}

      {list.map((r) => (
        <ReviewRow key={r.id} report={r} adminId={adminId}
          open={openId === r.id} onToggle={() => setOpenId(openId === r.id ? null : r.id)}
          onDone={reload} />
      ))}
    </div>
  );
}

function ReviewRow({ report, adminId, open, onToggle, onDone }) {
  const t = typeInfo(report.event_type);
  const rk = riskInfo(report.risk_level);
  const status = report.status || "pending";
  const pending = status === "pending";

  const [title, setTitle] = useState(report.admin_title || report.title || t.label);
  const [eventType, setEventType] = useState(report.event_type);
  const [risk, setRisk] = useState(report.risk_level || "medium");
  const [note, setNote] = useState(report.admin_note || "");
  const [busy, setBusy] = useState(false);

  const act = async (action) => {
    setBusy(true);
    try {
      if (action === "approve") {
        await adminReviewWarning({ adminId, id: report.id, action,
          patch: { admin_title: title.trim(), event_type: eventType, risk_level: risk, admin_note: note.trim() } });
      } else if (action === "reject") {
        const reason = prompt("请输入驳回原因：");
        if (!reason?.trim()) { setBusy(false); return; }
        await adminReviewWarning({ adminId, id: report.id, action, patch: { rejection_reason: reason.trim() } });
      } else {
        if (!confirm("删除这条宠物警示？")) { setBusy(false); return; }
        await adminReviewWarning({ adminId, id: report.id, action: "delete" });
      }
      onDone();
    } catch (e) { alert(e.message); }
    finally { setBusy(false); }
  };

  const statusBadge = {
    pending:  { t: "待审核", c: "#9C5A00", b: "#FFF4D6" },
    approved: { t: "已通过", c: C.ok, b: "#E6F4E1" },
    rejected: { t: "已驳回", c: C.errT, b: "#FFE2E2" },
    deleted:  { t: "已删除", c: C.sub, b: C.line },
  }[status] || { t: status, c: C.sub, b: C.line };

  return (
    <div style={{ background: C.bg, borderRadius: 12, padding: "11px 12px", marginBottom: 8, border: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14 }}>{t.icon}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{report.admin_title || report.title || t.label}</span>
        {report.risk_level && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, color: rk.color, background: rk.bg }}>{rk.label}</span>}
        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, color: statusBadge.c, background: statusBadge.b }}>{statusBadge.t}</span>
      </div>
      <div style={{ fontSize: 11.5, color: C.text, lineHeight: 1.6, marginBottom: 6 }}>{report.description}</div>
      <div style={{ fontSize: 11, color: C.sub, marginBottom: report.images?.length ? 8 : 6 }}>
        📍 {report.address || "未填"} · 类型：{t.label} · 由用户 {maskUserId(report.reporter_user_id)} 上传
        {report.contact_info ? ` · 联系：${report.contact_info}` : ""} · {fmtAgo(report.created_at)}
      </div>
      {report.images?.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          {report.images.map((u, i) => (
            <a key={i} href={u} target="_blank" rel="noreferrer">
              <img src={u} alt="" style={{ width: 50, height: 50, borderRadius: 8, objectFit: "cover" }} />
            </a>
          ))}
        </div>
      )}
      {report.rejection_reason && (
        <div style={{ fontSize: 11.5, color: C.errT, background: "#FFF0F0", borderRadius: 8, padding: "7px 10px", marginBottom: 8 }}>
          驳回原因：{report.rejection_reason}
        </div>
      )}

      {pending && (
        <>
          <button onClick={onToggle}
            style={{ background: "none", border: "none", color: C.pri, fontSize: 11.5, fontWeight: 700, cursor: "pointer", padding: "2px 0" }}>
            {open ? "收起审核 ▲" : "审核 / 编辑 ▼"}
          </button>
          {open && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
              <Field label="事件名称（可改）">
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={40} style={inp} />
              </Field>
              <Field label="事件类型（可改）">
                <select value={eventType} onChange={(e) => setEventType(e.target.value)} style={{ ...inp, appearance: "none" }}>
                  {ALL_TYPES.map((x) => <option key={x.id} value={x.id}>{x.group} · {x.label}</option>)}
                </select>
              </Field>
              <Field label="风险等级（必选）">
                <div style={{ display: "flex", gap: 6 }}>
                  {RISK_LEVELS.map((rl) => {
                    const on = risk === rl.id;
                    return (
                      <button key={rl.id} onClick={() => setRisk(rl.id)}
                        style={{ flex: 1, padding: "7px 0", borderRadius: 9, fontSize: 11.5, fontWeight: on ? 800 : 600,
                                 cursor: "pointer", border: `1.5px solid ${on ? rl.pin : C.border}`,
                                 background: on ? rl.bg : "#fff", color: on ? rl.color : C.sub }}>
                        {rl.label}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="审核备注（可选）">
                <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={100} placeholder="内部备注" style={inp} />
              </Field>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn tone="ok" disabled={busy} onClick={() => act("approve")}>通过并发布</Btn>
                <Btn tone="warn" disabled={busy} onClick={() => act("reject")}>驳回</Btn>
                <Btn tone="err" disabled={busy} onClick={() => act("delete")}>删除</Btn>
              </div>
            </div>
          )}
        </>
      )}
      {!pending && status !== "deleted" && (
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <Btn tone="err" disabled={busy} onClick={() => act("delete")}>删除</Btn>
        </div>
      )}
    </div>
  );
}

/* ── 友好地点管理（改标题 / 删除）─────────────────────── */
export function FriendlyManager({ adminId }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const reload = async () => {
    if (!adminId) return;
    setLoading(true); setErr(null);
    try { setList(await adminListFriendly(adminId, "approved")); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, [adminId]); // eslint-disable-line

  const editTitle = async (r) => {
    const title = prompt("修改标题（地图显示前 6 个字）：", r.title || "");
    if (title == null || !title.trim()) return;
    try { await adminEditFriendlyTitle({ adminId, id: r.id, title: title.trim() }); reload(); }
    catch (e) { alert(e.message); }
  };
  const del = async (r) => {
    if (!confirm("删除这个友好地点？")) return;
    try { await adminDeleteFriendly({ adminId, id: r.id }); reload(); }
    catch (e) { alert(e.message); }
  };

  return (
    <div style={{ background: C.card, borderRadius: 18, padding: "16px 14px", border: `1px solid ${C.border}`, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 2 }}>🐾 友好地点管理</div>
      <div style={{ fontSize: 11, color: C.sub, marginBottom: 12 }}>用户提交即展示 · admin 可改标题（防止过长）或删除</div>
      {loading && <div style={{ textAlign: "center", color: C.sub, fontSize: 12, padding: 20 }}>加载中...</div>}
      {err && <div style={{ color: C.errT, fontSize: 12, padding: 6 }}>❌ {err}</div>}
      {!loading && !err && list.length === 0 && <div style={{ textAlign: "center", color: C.sub, fontSize: 13, padding: 24 }}>暂无友好地点</div>}
      {list.map((r) => (
        <div key={r.id} style={{ background: C.bg, borderRadius: 12, padding: "11px 12px", marginBottom: 8, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 40, height: 40, borderRadius: 10, background: C.tint, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            {r.images?.[0] ? <img src={r.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🐾"}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title || r.place_name}</div>
            <div style={{ fontSize: 11, color: C.sub, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              📍 {r.address || r.place_name || "—"} · {maskUserId(r.reporter_user_id)} · {fmtAgo(r.created_at)}
            </div>
          </div>
          <button onClick={() => editTitle(r)} style={{ padding: "6px 10px", borderRadius: 10, fontSize: 11.5, fontWeight: 700, background: C.tint, color: "#9C5A00", border: "none", cursor: "pointer" }}>改标题</button>
          <button onClick={() => del(r)} style={{ padding: "6px 10px", borderRadius: 10, fontSize: 11.5, fontWeight: 700, background: "#FFE2E2", color: C.errT, border: "none", cursor: "pointer" }}>删除</button>
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}
const inp = {
  width: "100%", borderRadius: 9, padding: "8px 10px", fontSize: 12.5, boxSizing: "border-box",
  border: `1.5px solid ${C.border}`, background: "#fff", color: C.text, outline: "none", fontFamily: "inherit",
};
function Btn({ children, onClick, tone, disabled }) {
  const tones = { ok: { bg: "#E6F4E1", c: C.ok }, warn: { bg: C.tint, c: "#9C5A00" }, err: { bg: "#FFE2E2", c: C.errT } };
  const s = tones[tone] || tones.warn;
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: "7px 14px", borderRadius: 10, fontSize: 11.5, fontWeight: 700,
               background: s.bg, color: s.c, border: "none", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1 }}>
      {children}
    </button>
  );
}
