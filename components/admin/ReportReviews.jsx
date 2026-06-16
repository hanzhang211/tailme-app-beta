"use client";

/**
 * components/admin/ReportReviews.jsx
 * 平台审核员：「帖子举报管理」，嵌入 /admin。真实 Supabase 数据（走 service_role API）。
 * 列表 + 筛选（待处理/已处理/已驳回/全部）+ 详情（原因/说明/截图/帖子全文）+ 处理（标记已处理/驳回/隐藏帖/删帖）。
 */

import { useEffect, useState } from "react";
import { adminListReports, adminHandleReport } from "@/services/reportAdminService";
import { adminSetBan, BAN_OPTS } from "@/services/banAdminService";
import { fmtAgo } from "@/services/warningTypes";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", card:"#FFFFFF",
  text:"#1A1006", sub:"#8A8074", border:"#D6D5D8", line:"#EFE9DF",
  errT:"#D94040", ok:"#2E7D32",
};

function fmtDate(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const TABS = [
  { key:"pending",  label:"待处理" },
  { key:"resolved", label:"已处理" },
  { key:"rejected", label:"已驳回" },
  { key:"all",      label:"全部" },
];

export function ReportManager({ adminId }) {
  const [tab, setTab] = useState("pending");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [openId, setOpenId] = useState(null);

  const reload = async () => {
    if (!adminId) return;
    setLoading(true); setErr(null);
    try { setList(await adminListReports(adminId, tab)); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, [tab, adminId]); // eslint-disable-line

  return (
    <div style={{ background:C.card, borderRadius:18, padding:"16px 14px",
                  border:`1px solid ${C.border}`, boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize:15, fontWeight:800, color:C.text, marginBottom:2 }}>🚩 帖子举报管理</div>
      <div style={{ fontSize:11, color:C.sub, marginBottom:12 }}>
        用户举报的帖子 · 可标记已处理 / 驳回 / 隐藏或删除被举报帖
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ flex:1, padding:"7px 0", borderRadius:12, fontSize:12, fontWeight:on?800:600,
                       background:on?C.pri:C.tint, color:on?"#fff":C.text, border:"none", cursor:"pointer" }}>
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
        <ReportRow key={r.id} report={r} adminId={adminId}
          open={openId === r.id} onToggle={() => setOpenId(openId === r.id ? null : r.id)}
          onDone={reload} />
      ))}
    </div>
  );
}

function ReportRow({ report, adminId, open, onToggle, onDone }) {
  const status = report.status || "pending";
  const pending = status === "pending";
  const [note, setNote] = useState(report.admin_note || "");
  const [busy, setBusy] = useState(false);

  const post = report.post;
  const reporter = report.reporter;
  const author = report.author;
  const thumb = post?.cover_thumbnail_url
    || (Array.isArray(post?.thumbnail_urls) && post.thumbnail_urls[0])
    || (Array.isArray(post?.display_image_urls) && post.display_image_urls[0])
    || null;
  const summary = (post?.title || post?.content || "").trim();

  const badge = {
    pending:  { t:"待处理", c:"#9C5A00", b:"#FFF4D6" },
    resolved: { t:"已处理", c:C.ok, b:"#E6F4E1" },
    rejected: { t:"已驳回", c:C.errT, b:"#FFE2E2" },
  }[status] || { t:status, c:C.sub, b:C.line };

  const act = async (action, confirmMsg) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(true);
    try {
      await adminHandleReport({ adminId, id: report.id, action, adminNote: note.trim() || null });
      onDone();
    } catch (e) { alert(e.message); }
    finally { setBusy(false); }
  };

  const detailImgs = (Array.isArray(post?.display_image_urls) && post.display_image_urls.length)
    ? post.display_image_urls : [];

  // 封禁被举报作者
  const [banBusy, setBanBusy] = useState(false);
  const authorBu = author?.banned_until ? new Date(author.banned_until) : null;
  const authorBanned = authorBu && authorBu.getTime() > Date.now();
  const authorBanForever = authorBanned && authorBu.getFullYear() >= 2099;
  const doBan = async (action, banDays, confirmMsg) => {
    if (!author?.id) return;
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBanBusy(true);
    try {
      await adminSetBan({ adminId, targetUserId: author.id, action, banDays });
      onDone();
    } catch (e) { alert(e.message); }
    finally { setBanBusy(false); }
  };

  return (
    <div style={{ background:C.bg, borderRadius:12, padding:"11px 12px", marginBottom:8, border:`1px solid ${C.border}` }}>
      {/* 原因 + 状态 + 时间 */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
        <span style={{ fontSize:13, fontWeight:800, color:C.text }}>举报：{report.reason}</span>
        <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:10, color:badge.c, background:badge.b }}>{badge.t}</span>
        <span style={{ fontSize:10, color:C.sub, marginLeft:"auto" }}>{fmtAgo(report.created_at)}</span>
      </div>

      {/* 帖子预览 */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
        <span style={{ width:44, height:44, borderRadius:10, background:C.tint, flexShrink:0, overflow:"hidden",
                       display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
          {thumb ? <img src={thumb} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : "🐾"}
        </span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {post ? (summary || "（无文字内容）") : "（帖子已删除）"}
          </div>
          <div style={{ fontSize:10.5, color:C.sub, marginTop:2 }}>
            作者：{author?.username || "—"}{author?.user_no ? ` (${author.user_no})` : ""}
            {post?.status === "hidden" ? " · 已隐藏" : ""}
          </div>
        </div>
      </div>

      {/* 举报人 */}
      <div style={{ fontSize:10.5, color:C.sub, marginBottom:6 }}>
        举报人：{reporter?.username || "—"}{reporter?.user_no ? ` (${reporter.user_no})` : ""}
      </div>

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
          {report.evidence_images?.length > 0 && (
            <div>
              <div style={{ fontSize:11, color:C.sub, marginBottom:4 }}>举报截图：</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {report.evidence_images.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer">
                    <img src={u} alt="" style={{ width:54, height:54, borderRadius:8, objectFit:"cover" }} />
                  </a>
                ))}
              </div>
            </div>
          )}
          {post && (
            <div style={{ background:"#fff", borderRadius:8, padding:"8px 10px", border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:11, color:C.sub, marginBottom:4 }}>被举报帖子全文：</div>
              {post.title && <div style={{ fontSize:12.5, fontWeight:700, color:C.text }}>{post.title}</div>}
              {post.content && <div style={{ fontSize:11.5, color:C.text, lineHeight:1.6, marginTop:2, whiteSpace:"pre-wrap" }}>{post.content}</div>}
              {detailImgs.length > 0 && (
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:6 }}>
                  {detailImgs.map((u, i) => (
                    <a key={i} href={u} target="_blank" rel="noreferrer">
                      <img src={u} alt="" style={{ width:54, height:54, borderRadius:8, objectFit:"cover" }} />
                    </a>
                  ))}
                </div>
              )}
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
                {post && post.status !== "hidden" && (
                  <Btn tone="warn" disabled={busy} onClick={() => act("hide-post", "隐藏这条被举报的帖子？")}>隐藏帖子</Btn>
                )}
                {post && (
                  <Btn tone="err" disabled={busy} onClick={() => act("delete-post", "彻底删除这条帖子？不可恢复")}>删除帖子</Btn>
                )}
              </div>
            </>
          )}

          {author?.id && (
            <div style={{ borderTop:`1px dashed ${C.border}`, paddingTop:10 }}>
              <div style={{ fontSize:11, color:C.sub, marginBottom:6 }}>
                封禁作者{author.username ? ` ${author.username}` : ""}{author.user_no ? ` (${author.user_no})` : ""}：
                {authorBanned && (
                  <span style={{ color:C.errT, fontWeight:700, marginLeft:4 }}>
                    已封禁{authorBanForever ? "（永久）" : ` 至 ${fmtDate(authorBu)}`}
                  </span>
                )}
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {BAN_OPTS.map((o) => (
                  <Btn key={o.d} tone="err" disabled={banBusy}
                    onClick={() => doBan("ban", o.d, `确定${o.label}该作者？`)}>{o.label}</Btn>
                ))}
                {authorBanned && (
                  <Btn tone="ok" disabled={banBusy} onClick={() => doBan("unban", null, "解除该作者封禁？")}>解除封禁</Btn>
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
