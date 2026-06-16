"use client";

/**
 * components/admin/ChatReports.jsx
 * 平台审核员：「聊天举报管理」，嵌入 /admin。真实 Supabase 数据（service_role API）。
 * 私聊/群聊分开切换 + 状态筛选 + 详情（原因/说明/截图/被举报消息）+ 处理（已处理/驳回/备注/禁言）。
 */

import { useEffect, useState } from "react";
import { adminListChatReports, adminHandleChatReport } from "@/services/reportAdminService";
import { adminSetBan, BAN_OPTS } from "@/services/banAdminService";
import { fmtAgo } from "@/services/warningTypes";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", card:"#FFFFFF",
  text:"#1A1006", sub:"#8A8074", border:"#D6D5D8", line:"#EFE9DF",
  errT:"#D94040", ok:"#2E7D32",
};

const CHAT_TABS   = [{ key:"private", label:"私聊" }, { key:"group", label:"群聊" }];
const STATUS_TABS = [
  { key:"pending",  label:"待处理" },
  { key:"resolved", label:"已处理" },
  { key:"rejected", label:"已驳回" },
  { key:"all",      label:"全部" },
];
const MUTE_OPTS = [
  { d:1,     label:"禁言1天" },
  { d:3,     label:"禁言3天" },
  { d:7,     label:"禁言7天" },
  { d:36500, label:"永久禁言" },
];

function fmtDate(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function ChatReportManager({ adminId }) {
  const [chatType, setChatType] = useState("private");
  const [tab, setTab] = useState("pending");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [openId, setOpenId] = useState(null);

  const reload = async () => {
    if (!adminId) return;
    setLoading(true); setErr(null);
    try { setList(await adminListChatReports(adminId, chatType, tab)); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, [chatType, tab, adminId]); // eslint-disable-line

  return (
    <div style={{ background:C.card, borderRadius:18, padding:"16px 14px",
                  border:`1px solid ${C.border}`, boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize:15, fontWeight:800, color:C.text, marginBottom:2 }}>💬 聊天举报管理</div>
      <div style={{ fontSize:11, color:C.sub, marginBottom:12 }}>
        用户在私聊/群聊举报的内容 · 可标记已处理 / 驳回 / 禁言用户（1/3/7天/永久）
      </div>

      {/* 私聊 / 群聊切换 */}
      <div style={{ display:"flex", gap:8, marginBottom:10 }}>
        {CHAT_TABS.map((t) => {
          const on = chatType === t.key;
          return (
            <button key={t.key} onClick={() => setChatType(t.key)}
              style={{ flex:1, padding:"8px 0", borderRadius:12, fontSize:13, fontWeight:on?800:600,
                       background:on?C.pri:C.tint, color:on?"#fff":C.text, border:"none", cursor:"pointer" }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 状态筛选 */}
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        {STATUS_TABS.map((t) => {
          const on = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ flex:1, padding:"6px 0", borderRadius:10, fontSize:11.5, fontWeight:on?800:600,
                       background:on?"#FFF5EC":"#fff", color:on?C.pri:C.sub,
                       border:`1px solid ${on?C.pri:C.border}`, cursor:"pointer" }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {loading && <div style={{ textAlign:"center", color:C.sub, fontSize:12, padding:20 }}>加载中...</div>}
      {err && <div style={{ color:C.errT, fontSize:12, padding:6 }}>❌ {err}</div>}
      {!loading && !err && list.length === 0 && (
        <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:24 }}>暂无举报 ✓</div>
      )}

      {list.map((r) => (
        <ChatReportRow key={r.id} report={r} adminId={adminId}
          open={openId === r.id} onToggle={() => setOpenId(openId === r.id ? null : r.id)}
          onDone={reload} />
      ))}
    </div>
  );
}

function ChatReportRow({ report, adminId, open, onToggle, onDone }) {
  const status = report.status || "pending";
  const pending = status === "pending";
  const [note, setNote] = useState(report.admin_note || "");
  const [busy, setBusy] = useState(false);

  const reporter = report.reporter;
  const reported = report.reported;
  const isGroup = report.chat_type === "group";
  const mutedUntil = reported?.muted_until ? new Date(reported.muted_until) : null;
  const isMuted = mutedUntil && mutedUntil.getTime() > Date.now();
  const muteForever = isMuted && mutedUntil.getFullYear() >= 2099;

  const badge = {
    pending:  { t:"待处理", c:"#9C5A00", b:"#FFF4D6" },
    resolved: { t:"已处理", c:C.ok, b:"#E6F4E1" },
    rejected: { t:"已驳回", c:C.errT, b:"#FFE2E2" },
  }[status] || { t:status, c:C.sub, b:C.line };

  const act = async (action, muteDays, confirmMsg) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(true);
    try {
      await adminHandleChatReport({ adminId, id: report.id, action, adminNote: note.trim() || null, muteDays });
      onDone();
    } catch (e) { alert(e.message); }
    finally { setBusy(false); }
  };

  // 封禁被举报用户（与禁言独立）
  const [banBusy, setBanBusy] = useState(false);
  const reportedBu = reported?.banned_until ? new Date(reported.banned_until) : null;
  const reportedBanned = reportedBu && reportedBu.getTime() > Date.now();
  const reportedBanForever = reportedBanned && reportedBu.getFullYear() >= 2099;
  const doBan = async (action, banDays, confirmMsg) => {
    if (!reported?.id) return;
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBanBusy(true);
    try {
      await adminSetBan({ adminId, targetUserId: reported.id, action, banDays });
      onDone();
    } catch (e) { alert(e.message); }
    finally { setBanBusy(false); }
  };

  const uLabel = (u) => u ? `${u.username || "用户"}${u.user_no ? ` (${u.user_no})` : ""}` : "—";

  return (
    <div style={{ background:C.bg, borderRadius:12, padding:"11px 12px", marginBottom:8, border:`1px solid ${C.border}` }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
        <span style={{ fontSize:13, fontWeight:800, color:C.text }}>举报：{report.reason}</span>
        <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:10, color:badge.c, background:badge.b }}>{badge.t}</span>
        <span style={{ fontSize:10, color:C.sub, marginLeft:"auto" }}>{fmtAgo(report.created_at)}</span>
      </div>

      <div style={{ fontSize:11, color:C.sub, marginBottom:4 }}>
        举报人：{uLabel(reporter)} · 被举报：{uLabel(reported)}
      </div>
      {isMuted && (
        <div style={{ fontSize:10.5, fontWeight:700, color:C.errT, marginBottom:4 }}>
          🔇 该用户已被禁言{muteForever ? "（永久）" : `至 ${fmtDate(mutedUntil)}`}
        </div>
      )}

      <button onClick={onToggle}
        style={{ background:"none", border:"none", color:C.pri, fontSize:11.5, fontWeight:700, cursor:"pointer", padding:"2px 0" }}>
        {open ? "收起详情 ▲" : "查看详情 / 处理 ▼"}
      </button>

      {open && (
        <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:10 }}>
          {report.detail && (
            <div style={{ fontSize:11.5, color:C.text, lineHeight:1.6, background:"#fff", borderRadius:8, padding:"8px 10px", border:`1px solid ${C.border}` }}>
              <span style={{ color:C.sub }}>补充说明：</span>{report.detail}
            </div>
          )}
          {report.message_content && (
            <div style={{ background:"#fff", borderRadius:8, padding:"8px 10px", border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:11, color:C.sub, marginBottom:4 }}>被举报的{isGroup ? "群聊" : "私聊"}消息：</div>
              <div style={{ fontSize:11.5, color:C.text, lineHeight:1.6, whiteSpace:"pre-wrap" }}>{report.message_content}</div>
            </div>
          )}
          {report.evidence_images?.length > 0 && (
            <div>
              <div style={{ fontSize:11, color:C.sub, marginBottom:4 }}>举报截图：</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {report.evidence_images.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer">
                    <img src={u} alt="" loading="lazy" decoding="async" style={{ width:54, height:54, borderRadius:8, objectFit:"cover" }} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {!pending && report.admin_note && (
            <div style={{ fontSize:11.5, color:C.sub, background:C.line, borderRadius:8, padding:"7px 10px" }}>
              处理备注：{report.admin_note}
            </div>
          )}

          {pending && (
            <>
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200}
                placeholder="处理备注（可选）"
                style={{ width:"100%", borderRadius:9, padding:"8px 10px", fontSize:12.5, boxSizing:"border-box",
                         border:`1.5px solid ${C.border}`, background:"#fff", color:C.text, outline:"none", fontFamily:"inherit" }} />
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                <Btn tone="ok" disabled={busy} onClick={() => act("resolve")}>标记已处理</Btn>
                <Btn tone="warn" disabled={busy} onClick={() => act("reject")}>驳回</Btn>
              </div>
              {reported && (
                <div>
                  <div style={{ fontSize:11, color:C.sub, marginBottom:6 }}>禁言被举报用户：</div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {MUTE_OPTS.map((o) => (
                      <Btn key={o.d} tone="err" disabled={busy}
                        onClick={() => act("mute", o.d, `确定${o.label}该用户？`)}>{o.label}</Btn>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {isMuted && (
            <Btn tone="warn" disabled={busy} onClick={() => act("unmute", null, "解除该用户禁言？")}>解除禁言</Btn>
          )}

          {reported?.id && (
            <div style={{ borderTop:`1px dashed ${C.border}`, paddingTop:10 }}>
              <div style={{ fontSize:11, color:C.sub, marginBottom:4 }}>
                封禁该用户：
                {reportedBanned && (
                  <span style={{ color:C.errT, fontWeight:700, marginLeft:4 }}>
                    已封禁{reportedBanForever ? "（永久）" : ` 至 ${fmtDate(reportedBu)}`}
                  </span>
                )}
              </div>
              <div style={{ fontSize:10.5, color:C.sub, marginBottom:6, lineHeight:1.5 }}>
                封禁＝禁遛弯/上报/发帖评论/群聊发言（私聊保留）；禁言＝禁私聊+群聊发言
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {BAN_OPTS.map((o) => (
                  <Btn key={o.d} tone="err" disabled={banBusy}
                    onClick={() => doBan("ban", o.d, `确定${o.label}该用户？`)}>{o.label}</Btn>
                ))}
                {reportedBanned && (
                  <Btn tone="ok" disabled={banBusy} onClick={() => doBan("unban", null, "解除该用户封禁？")}>解除封禁</Btn>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Btn({ children, onClick, tone, disabled }) {
  const tones = { ok:{ bg:"#E6F4E1", c:C.ok }, warn:{ bg:C.tint, c:"#9C5A00" }, err:{ bg:"#FFE2E2", c:C.errT } };
  const s = tones[tone] || tones.warn;
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ padding:"7px 14px", borderRadius:10, fontSize:11.5, fontWeight:700,
               background:s.bg, color:s.c, border:"none", cursor:disabled?"default":"pointer", opacity:disabled?0.6:1 }}>
      {children}
    </button>
  );
}
