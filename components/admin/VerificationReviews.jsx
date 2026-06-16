"use client";

/**
 * components/admin/VerificationReviews.jsx
 * Admin「用户认证」审核：tab 切换（待审核/已通过/已驳回/全部），
 * 每条展示用户号 + 证明材料图 + 同框照 + 联系方式，可通过/驳回（填备注/原因）。
 * 数据走 /api/admin/verifications（service_role，图片为短期签名 URL）。
 */

import { useEffect, useState } from "react";
import { adminListVerifications, adminReviewVerification } from "@/services/verificationAdminService";

const C = { pri: "#E68645", tint: "#F2E5DA", bg: "#EEE9E1", card: "#fff", text: "#1A1006", sub: "#8A8074", border: "#D6D5D8" };

const TABS = [
  { key: "pending", label: "待审核" },
  { key: "approved", label: "已通过" },
  { key: "rejected", label: "已驳回" },
  { key: "all", label: "全部" },
];
const SM = {
  pending: { label: "待审核", color: "#C0612A", bg: "#FBE6D4" },
  approved: { label: "已通过", color: "#3E8E5A", bg: "#E2F1E6" },
  rejected: { label: "已驳回", color: "#C0392B", bg: "#FBDAD7" },
};

function fmt(iso) {
  if (!iso) return "";
  const d = new Date(iso), p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function VerificationManager({ adminId }) {
  const [tab, setTab] = useState("pending");
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [reject, setReject] = useState(null); // 正在驳回的 submission
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [viewer, setViewer] = useState(null); // 大图预览 url

  const load = async () => {
    if (!adminId) return;
    setList(null); setErr("");
    try { setList(await adminListVerifications(adminId, tab)); }
    catch (e) { setErr(e.message || "加载失败"); setList([]); }
  };
  useEffect(() => { load(); }, [adminId, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const review = async (id, action, extra = {}) => {
    setBusyId(id); setErr("");
    try {
      await adminReviewVerification({ adminId, id, action, ...extra });
      setReject(null); setReason(""); setNote("");
      await load();
    } catch (e) { setErr(e.message || "操作失败"); }
    finally { setBusyId(null); }
  };

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 12 }}>🪪 用户认证审核</div>

      {/* tab */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: "7px 15px", borderRadius: 999, fontSize: 13, fontWeight: on ? 800 : 600, cursor: "pointer",
                       border: `1.4px solid ${on ? C.pri : C.border}`, background: on ? C.tint : "#fff", color: on ? C.pri : C.sub }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {err && <div style={{ color: "#D94040", fontSize: 13, marginBottom: 10 }}>{err}</div>}
      {list === null && <div style={{ color: C.sub, fontSize: 13, padding: "30px 0", textAlign: "center" }}>加载中…</div>}
      {list && list.length === 0 && <div style={{ color: C.sub, fontSize: 13, padding: "30px 0", textAlign: "center" }}>暂无记录</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {(list || []).map((s) => {
          const sm = SM[s.status] || SM.pending;
          return (
            <div key={s.id} style={{ background: C.card, borderRadius: 16, padding: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>用户号 {s.user_no || s.username || s.user_id?.slice(0, 8)}</span>
                <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, color: sm.color, background: sm.bg }}>{sm.label}</span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: C.sub }}>{fmt(s.created_at)}</span>
              </div>

              {/* 图片 */}
              <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 6 }}>宠物证明材料</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                {(s.doc_urls || []).map((u, i) => (
                  <img key={i} src={u} alt="" loading="lazy" decoding="async" onClick={() => setViewer(u)}
                    style={{ width: 76, height: 76, borderRadius: 10, objectFit: "cover", cursor: "pointer" }} />
                ))}
                {(!s.doc_urls || s.doc_urls.length === 0) && <span style={{ fontSize: 12, color: C.sub }}>（无）</span>}
              </div>
              <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 6 }}>同框认证照片</div>
              <div style={{ marginBottom: 10 }}>
                {s.selfie_url
                  ? <img src={s.selfie_url} alt="" loading="lazy" decoding="async" onClick={() => setViewer(s.selfie_url)}
                      style={{ width: 76, height: 76, borderRadius: 10, objectFit: "cover", cursor: "pointer" }} />
                  : <span style={{ fontSize: 12, color: C.sub }}>（无）</span>}
              </div>

              {s.contact_info && <div style={{ fontSize: 12.5, color: C.text, marginBottom: 8 }}>联系方式：{s.contact_info}</div>}
              {s.status === "rejected" && s.rejection_reason &&
                <div style={{ fontSize: 12.5, color: "#C0392B", marginBottom: 8 }}>驳回原因：{s.rejection_reason}</div>}
              {s.admin_note && <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>备注：{s.admin_note}</div>}

              {/* 操作 */}
              {s.status === "pending" && reject?.id !== s.id && (
                <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                  <button onClick={() => review(s.id, "approve", { adminNote: note })} disabled={busyId === s.id}
                    style={{ flex: 1, padding: "9px 0", borderRadius: 999, border: "none", background: C.pri, color: "#fff", fontSize: 13.5, fontWeight: 800, cursor: "pointer" }}>
                    通过认证
                  </button>
                  <button onClick={() => { setReject(s); setReason(""); }} disabled={busyId === s.id}
                    style={{ flex: 1, padding: "9px 0", borderRadius: 999, border: `1.4px solid #EBBCB4`, background: "#fff", color: "#C0392B", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
                    驳回
                  </button>
                </div>
              )}

              {/* 驳回输入 */}
              {reject?.id === s.id && (
                <div style={{ marginTop: 8 }}>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="请填写驳回原因（用户可见）"
                    style={{ width: "100%", minHeight: 60, borderRadius: 10, border: `1.4px solid ${C.border}`, padding: "10px 12px", fontSize: 13, boxSizing: "border-box", outline: "none", resize: "vertical" }} />
                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <button onClick={() => { setReject(null); setReason(""); }}
                      style={{ flex: 1, padding: "9px 0", borderRadius: 999, border: `1.4px solid ${C.border}`, background: "#fff", color: C.sub, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>取消</button>
                    <button onClick={() => reason.trim() && review(s.id, "reject", { rejectionReason: reason })} disabled={busyId === s.id || !reason.trim()}
                      style={{ flex: 1, padding: "9px 0", borderRadius: 999, border: "none", background: "#C0392B", color: "#fff", fontSize: 13.5, fontWeight: 800, cursor: reason.trim() ? "pointer" : "default", opacity: reason.trim() ? 1 : 0.6 }}>确认驳回</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 大图预览 */}
      {viewer && (
        <div onClick={() => setViewer(null)}
          style={{ position: "fixed", inset: 0, zIndex: 5000, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <img src={viewer} alt="" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 12 }} />
        </div>
      )}
    </div>
  );
}
