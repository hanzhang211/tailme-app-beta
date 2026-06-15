"use client";

/**
 * components/profile/MyReviews.jsx
 * 用户端「审核」页（全屏浮层，从「我的」页进入）。
 * 真实读取当前用户自己上传的「宠物友好」「宠物警示」记录（service_role API），
 * 支持下架 / 重新上架 / 永久删除 / 撤回。地图端只显示 approved（既有逻辑，无需改）。
 *
 * 状态：pending 审核中 / approved 已通过 / offline 已下架 / rejected 已驳回（deleted 不返回）。
 */

import { useCallback, useEffect, useState } from "react";
import BackButton from "@/components/icons/BackButton";
import { listMyReports, takeOffline, relist, removeReport, withdrawReport } from "@/services/myReportsService";
import { listMyPostModeration } from "@/services/myPostModerationService";
import { riskInfo, typeInfo, fmtAgo } from "@/services/warningTypes";

const C = { pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", text:"#1A1006", sub:"#8A8074", border:"#E4DDD2" };

const STATUS_META = {
  pending:  { label:"审核中", color:"#C0612A", bg:"#FBE6D4" },
  approved: { label:"已通过", color:"#3E8E5A", bg:"#E2F1E6" },
  offline:  { label:"已下架", color:"#8A8074", bg:"#ECE7DE" },
  rejected: { label:"已驳回", color:"#C0392B", bg:"#FBDAD7" },
};
const statusMeta = (s) => STATUS_META[s] || STATUS_META.pending;

const STATUS_FILTERS = [
  { id:"all", label:"全部" },
  { id:"pending", label:"审核中" },
  { id:"approved", label:"已通过" },
  { id:"offline", label:"已下架" },
  { id:"rejected", label:"已驳回" },
];

const PERKS = [
  { key:"has_water_bowl", label:"提供水碗" },
  { key:"has_food_bowl", label:"提供喂食碗" },
  { key:"allow_pet_inside", label:"可进店" },
  { key:"good_for_rest", label:"适合休息" },
];

function reportTitle(r, kind) {
  if (kind === "warning") return r.admin_title || r.title || typeInfo(r.event_type).label;
  return r.title || r.place_name || "宠物友好地点";
}
function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* 无图占位 */
function Placeholder({ kind }) {
  return (
    <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center",
                  background: kind === "warning" ? "#FBE6D4" : C.tint }}>
      {kind === "warning" ? (
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
          <path d="M12 3.2 1.8 20.4h20.4L12 3.2Z" stroke="#C0612A" strokeWidth="1.8" strokeLinejoin="round"/>
          <path d="M12 9.6v4.2" stroke="#C0612A" strokeWidth="1.9" strokeLinecap="round"/>
          <circle cx="12" cy="16.8" r="1.05" fill="#C0612A"/>
        </svg>
      ) : (
        <svg width="34" height="34" viewBox="0 0 24 24" fill={C.pri}>
          <ellipse cx="6.2" cy="11" rx="2" ry="2.6"/><ellipse cx="11" cy="8.4" rx="2.1" ry="2.8"/>
          <ellipse cx="16.4" cy="9.6" rx="2" ry="2.6"/><ellipse cx="19.2" cy="13.6" rx="1.7" ry="2.2"/>
          <path d="M12.4 13c2.4 0 4.4 1.7 4.4 3.8 0 1.7-1.5 2.5-3.2 2.5-1 0-1.4-.3-2.2-.3s-1.2.3-2.2.3c-1.7 0-3.2-.8-3.2-2.5 0-2.1 2-3.8 4.4-3.8Z"/>
        </svg>
      )}
    </div>
  );
}

function Badge({ children, color, bg, bold }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", padding:"3px 9px", borderRadius:999,
                   fontSize:11, fontWeight: bold ? 800 : 700, color, background:bg, whiteSpace:"nowrap", lineHeight:1.4 }}>
      {children}
    </span>
  );
}

/* 小操作按钮 */
function ActBtn({ children, onClick, variant = "outline", disabled }) {
  const styles = {
    outline: { background:"#fff", color:C.pri, border:`1.4px solid #F0C9A8` },
    danger:  { background:"#fff", color:"#C0392B", border:`1.4px solid #EBBCB4` },
    ghost:   { background:"#fff", color:C.sub, border:`1.4px solid ${C.border}` },
    solid:   { background:C.pri, color:"#fff", border:"1.4px solid "+C.pri },
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...styles, padding:"7px 16px", borderRadius:999, fontSize:12.5, fontWeight:700,
               cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1, whiteSpace:"nowrap" }}>
      {children}
    </button>
  );
}

/* 记录卡片 */
function ReportCard({ r, kind, onOpen, onAction, busy }) {
  const sm = statusMeta(r.status);
  const cover = Array.isArray(r.images) && r.images[0];
  const rk = kind === "warning" && r.risk_level ? riskInfo(r.risk_level) : null;
  const ti = kind === "warning" ? typeInfo(r.event_type) : null;
  const friendlyPerks = kind === "friendly" ? PERKS.filter((p) => r[p.key]) : [];

  return (
    <div onClick={() => onOpen(r)}
      style={{ background:"#fff", borderRadius:20, padding:12, display:"flex", gap:12,
               boxShadow:"0 2px 14px rgba(0,0,0,0.05)", cursor:"pointer" }}>
      {/* 封面 */}
      <div style={{ width:92, height:92, borderRadius:14, overflow:"hidden", flexShrink:0, position:"relative" }}>
        {cover ? <img src={cover} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
               : <Placeholder kind={kind} />}
        <span style={{ position:"absolute", top:6, left:6 }}>
          <Badge color={kind === "warning" ? "#C0612A" : "#3E8E5A"} bg="rgba(255,255,255,0.92)">
            {kind === "warning" ? "⚠️ 宠物警示" : "🐾 宠物友好"}
          </Badge>
        </span>
      </div>

      {/* 右侧信息 */}
      <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column" }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
          <div style={{ flex:1, minWidth:0, fontSize:15, fontWeight:800, color:C.text,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {reportTitle(r, kind)}
          </div>
          <Badge color={sm.color} bg={sm.bg}>{sm.label}</Badge>
        </div>

        {/* 标签行 */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:6 }}>
          {rk && <Badge color={rk.color} bg={rk.bg} bold>{rk.label}</Badge>}
          {ti && <Badge color={C.sub} bg={C.bg}>{ti.icon} {ti.label}</Badge>}
          {friendlyPerks.slice(0, 3).map((p) => <Badge key={p.key} color={C.sub} bg={C.bg}>{p.label}</Badge>)}
        </div>

        {(r.place_name || r.address) && (
          <div style={{ fontSize:11.5, color:C.sub, marginTop:6, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            📍 {r.place_name || r.address}
          </div>
        )}
        <div style={{ fontSize:11, color:C.sub, marginTop:3 }}>上传时间 {fmtAgo(r.created_at)}</div>

        {/* 操作按钮 */}
        <div style={{ display:"flex", gap:8, marginTop:9, flexWrap:"wrap" }} onClick={(e) => e.stopPropagation()}>
          {r.status === "approved" && <ActBtn onClick={() => onAction("offline", r)} disabled={busy}>下架</ActBtn>}
          {r.status === "offline" && <>
            <ActBtn variant="solid" onClick={() => onAction("relist", r)} disabled={busy}>重新上架</ActBtn>
            <ActBtn variant="danger" onClick={() => onAction("delete", r)} disabled={busy}>永久删除</ActBtn>
          </>}
          {r.status === "pending" && <ActBtn variant="ghost" onClick={() => onAction("withdraw", r)} disabled={busy}>撤回</ActBtn>}
          <ActBtn variant="ghost" onClick={() => onOpen(r)}>查看详情</ActBtn>
        </div>
      </div>
    </div>
  );
}

/* 确认弹窗 */
function ConfirmDialog({ data, onClose }) {
  if (!data) return null;
  return (
    <div onClick={onClose}
      style={{ position:"fixed", inset:0, zIndex:480, background:"rgba(0,0,0,0.4)",
               display:"flex", alignItems:"center", justifyContent:"center", padding:"0 36px" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background:"#fff", borderRadius:20, padding:"22px 20px 16px", width:"100%", maxWidth:320 }}>
        <div style={{ fontSize:16, fontWeight:800, color:C.text, marginBottom:8 }}>{data.title}</div>
        <div style={{ fontSize:13.5, color:C.sub, lineHeight:1.6, marginBottom:18 }}>{data.msg}</div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:"11px 0", borderRadius:999, border:`1.4px solid ${C.border}`,
                     background:"#fff", color:C.sub, fontSize:14, fontWeight:700, cursor:"pointer" }}>取消</button>
          <button onClick={data.onConfirm}
            style={{ flex:1, padding:"11px 0", borderRadius:999, border:"none",
                     background: data.danger ? "#C0392B" : C.pri, color:"#fff", fontSize:14, fontWeight:800, cursor:"pointer" }}>
            {data.confirmLabel || "确定"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* 详情底部抽屉 */
function DetailSheet({ detail, onClose, onAction, busy }) {
  if (!detail) return null;
  const { report: r, kind } = detail;
  const sm = statusMeta(r.status);
  const rk = kind === "warning" && r.risk_level ? riskInfo(r.risk_level) : null;
  const ti = kind === "warning" ? typeInfo(r.event_type) : null;
  const friendlyPerks = kind === "friendly" ? PERKS.filter((p) => r[p.key]) : [];
  const imgs = Array.isArray(r.images) ? r.images : [];

  const Row = ({ label, children }) => (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:11.5, color:C.sub, marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:14, color:C.text, lineHeight:1.6 }}>{children}</div>
    </div>
  );

  return (
    <div onClick={onClose}
      style={{ position:"fixed", inset:0, zIndex:460, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"flex-end" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background:"#fff", borderRadius:"24px 24px 0 0", width:"100%", maxHeight:"86%",
                 display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"14px 18px 12px", borderBottom:`1px solid ${C.bg}`, display:"flex", alignItems:"center", gap:10 }}>
          <Badge color={kind === "warning" ? "#C0612A" : "#3E8E5A"} bg={kind === "warning" ? "#FBE6D4" : "#E2F1E6"}>
            {kind === "warning" ? "⚠️ 宠物警示" : "🐾 宠物友好"}
          </Badge>
          <Badge color={sm.color} bg={sm.bg}>{sm.label}</Badge>
          <div style={{ flex:1 }} />
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, color:C.sub, cursor:"pointer", lineHeight:1 }}>×</button>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"16px 18px 8px" }}>
          <div style={{ fontSize:19, fontWeight:800, color:C.text, marginBottom:14 }}>{reportTitle(r, kind)}</div>

          {(rk || ti) && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
              {rk && <Badge color={rk.color} bg={rk.bg} bold>{rk.label}</Badge>}
              {ti && <Badge color={C.sub} bg={C.bg}>{ti.icon} {ti.label}</Badge>}
            </div>
          )}

          {friendlyPerks.length > 0 && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
              {friendlyPerks.map((p) => <Badge key={p.key} color={C.pri} bg={C.tint}>{p.label}</Badge>)}
            </div>
          )}

          {(r.place_name || r.address) && <Row label="地址">📍 {r.place_name}{r.place_name && r.address ? " · " : ""}{r.address}</Row>}
          {r.description && <Row label="描述">{r.description}</Row>}

          {imgs.length > 0 && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11.5, color:C.sub, marginBottom:6 }}>图片</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {imgs.map((u, i) => (
                  <img key={i} src={u} alt="" style={{ width:92, height:92, borderRadius:12, objectFit:"cover" }} />
                ))}
              </div>
            </div>
          )}

          <Row label="上传时间">{fmtTime(r.created_at)}</Row>
          {r.reviewed_at && <Row label="审核时间">{fmtTime(r.reviewed_at)}</Row>}
          {r.status === "rejected" && r.rejection_reason && (
            <div style={{ background:"#FBDAD7", borderRadius:14, padding:"12px 14px", marginBottom:14 }}>
              <div style={{ fontSize:11.5, color:"#C0392B", marginBottom:4, fontWeight:700 }}>驳回原因</div>
              <div style={{ fontSize:13.5, color:"#7A2218", lineHeight:1.6 }}>{r.rejection_reason}</div>
            </div>
          )}
          {r.admin_note && (
            <div style={{ background:C.bg, borderRadius:14, padding:"12px 14px", marginBottom:14 }}>
              <div style={{ fontSize:11.5, color:C.sub, marginBottom:4, fontWeight:700 }}>审核备注</div>
              <div style={{ fontSize:13.5, color:C.text, lineHeight:1.6 }}>{r.admin_note}</div>
            </div>
          )}
        </div>

        {/* 操作栏 */}
        <div style={{ padding:"12px 18px calc(12px + env(safe-area-inset-bottom))", borderTop:`1px solid ${C.bg}`,
                      display:"flex", gap:10, justifyContent:"flex-end" }}>
          {r.status === "approved" && <ActBtn onClick={() => onAction("offline", r)} disabled={busy}>下架</ActBtn>}
          {r.status === "offline" && <>
            <ActBtn variant="danger" onClick={() => onAction("delete", r)} disabled={busy}>永久删除</ActBtn>
            <ActBtn variant="solid" onClick={() => onAction("relist", r)} disabled={busy}>重新上架</ActBtn>
          </>}
          {r.status === "pending" && <ActBtn variant="ghost" onClick={() => onAction("withdraw", r)} disabled={busy}>撤回提交</ActBtn>}
          {r.status === "rejected" && <ActBtn variant="ghost" onClick={onClose}>知道了</ActBtn>}
        </div>
      </div>
    </div>
  );
}

/* ── 举报记录状态 ── */
const REPORT_STATUS_META = {
  pending:  { label:"审核中", color:"#C0612A", bg:"#FBE6D4" },
  resolved: { label:"已处理", color:"#3E8E5A", bg:"#E2F1E6" },
  rejected: { label:"未通过", color:"#8A8074", bg:"#ECE7DE" },
};

/* 我被下架的帖子卡片（只读，重新上架是后台权利）*/
function MyPostCard({ p }) {
  const cover = p.cover_thumbnail_url
    || (Array.isArray(p.thumbnail_urls) && p.thumbnail_urls[0])
    || (Array.isArray(p.display_image_urls) && p.display_image_urls[0]) || null;
  const summary = (p.title || p.content || "").trim();
  return (
    <div style={{ background:"#fff", borderRadius:20, padding:12, display:"flex", gap:12, boxShadow:"0 2px 14px rgba(0,0,0,0.05)" }}>
      <div style={{ width:92, height:92, borderRadius:14, overflow:"hidden", flexShrink:0, background:C.tint,
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
        {cover ? <img src={cover} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
               : <span style={{ fontSize:30 }}>📝</span>}
      </div>
      <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column" }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
          <div style={{ flex:1, minWidth:0, fontSize:14.5, fontWeight:700, color:C.text, lineHeight:1.5,
                        display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
            {summary || "（无文字内容）"}
          </div>
          <Badge color="#C0392B" bg="#FBDAD7">已下架</Badge>
        </div>
        <div style={{ fontSize:11.5, color:C.sub, marginTop:6, lineHeight:1.5 }}>
          该帖子已被管理员下架。如有疑问可联系我们。
        </div>
        <div style={{ fontSize:11, color:C.sub, marginTop:"auto", paddingTop:8 }}>发布于 {fmtAgo(p.created_at)}</div>
      </div>
    </div>
  );
}

/* 我的举报记录卡片 */
function MyReportCard({ r }) {
  const sm = REPORT_STATUS_META[r.status] || REPORT_STATUS_META.pending;
  const post = r.post;
  const cover = post ? (post.cover_thumbnail_url
    || (Array.isArray(post.thumbnail_urls) && post.thumbnail_urls[0])
    || (Array.isArray(post.display_image_urls) && post.display_image_urls[0])) : null;
  const summary = post ? (post.title || post.content || "").trim() : "";
  const postState = !post ? { label:"该帖已删除", color:"#C0392B" }
    : post.status === "hidden" ? { label:"该帖已下架", color:"#C0392B" }
    : { label:"该帖仍在展示", color:C.sub };
  return (
    <div style={{ background:"#fff", borderRadius:20, padding:12, boxShadow:"0 2px 14px rgba(0,0,0,0.05)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
        <span style={{ fontSize:14, fontWeight:800, color:C.text }}>举报：{r.reason}</span>
        <Badge color={sm.color} bg={sm.bg}>{sm.label}</Badge>
        <span style={{ marginLeft:"auto", fontSize:11, color:C.sub }}>{fmtAgo(r.created_at)}</span>
      </div>
      <div style={{ display:"flex", gap:10, alignItems:"center", background:C.bg, borderRadius:12, padding:10 }}>
        <div style={{ width:48, height:48, borderRadius:10, overflow:"hidden", flexShrink:0, background:C.tint,
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
          {cover ? <img src={cover} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : "🐾"}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12.5, color:C.text, lineHeight:1.4,
                        display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
            {post ? (summary || "（无文字内容）") : "（该帖已删除）"}
          </div>
          <div style={{ fontSize:11, fontWeight:700, color:postState.color, marginTop:3 }}>{postState.label}</div>
        </div>
      </div>
      {r.detail && <div style={{ fontSize:11.5, color:C.sub, marginTop:8, lineHeight:1.5 }}>补充说明：{r.detail}</div>}
      {r.status === "pending" && <div style={{ fontSize:11.5, color:C.sub, marginTop:8 }}>我们正在审核处理，感谢你的反馈 🐾</div>}
      {r.status === "rejected" && <div style={{ fontSize:11.5, color:C.sub, marginTop:8 }}>经审核，该内容暂未违反社区规范。</div>}
    </div>
  );
}

/* 空状态 */
function Empty({ kind }) {
  const txt = {
    friendly:  { t:"还没有提交过内容", d:<>你上传的宠物友好地点和宠物警示<br/>会显示在这里</> },
    warning:   { t:"还没有提交过内容", d:<>你上传的宠物友好地点和宠物警示<br/>会显示在这里</> },
    myposts:   { t:"没有被下架的帖子", d:<>如果你的帖子被管理员下架<br/>会显示在这里</> },
    myreports: { t:"还没有举报记录", d:<>你举报过的帖子和处理结果<br/>会显示在这里</> },
  }[kind] || { t:"还没有提交过内容", d:"" };
  return (
    <div style={{ textAlign:"center", padding:"70px 30px" }}>
      <div style={{ width:84, height:84, borderRadius:"50%", background:C.tint, margin:"0 auto 16px",
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
        <svg width="42" height="42" viewBox="0 0 24 24" fill={C.pri}>
          <ellipse cx="6.2" cy="11" rx="2" ry="2.6"/><ellipse cx="11" cy="8.4" rx="2.1" ry="2.8"/>
          <ellipse cx="16.4" cy="9.6" rx="2" ry="2.6"/><ellipse cx="19.2" cy="13.6" rx="1.7" ry="2.2"/>
          <path d="M12.4 13c2.4 0 4.4 1.7 4.4 3.8 0 1.7-1.5 2.5-3.2 2.5-1 0-1.4-.3-2.2-.3s-1.2.3-2.2.3c-1.7 0-3.2-.8-3.2-2.5 0-2.1 2-3.8 4.4-3.8Z"/>
        </svg>
      </div>
      <div style={{ fontSize:15, fontWeight:800, color:C.text, marginBottom:6 }}>{txt.t}</div>
      <div style={{ fontSize:13, color:C.sub, lineHeight:1.6 }}>{txt.d}</div>
    </div>
  );
}

export default function MyReviews({ user, onClose, toast }) {
  const userId = user?.id || null;
  const [kind, setKind] = useState("friendly");   // friendly | warning
  const [status, setStatus] = useState("all");
  const [data, setData] = useState({ friendly:null, warning:null, myposts:null, myreports:null }); // null=未加载
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);      // { report, kind }
  const [confirm, setConfirm] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const reload = useCallback(async (k) => {
    if (!userId) { setData((d) => ({ ...d, [k]: [] })); return; }
    setLoading(true);
    try {
      if (k === "friendly" || k === "warning") {
        const rows = await listMyReports(userId, k);
        setData((d) => ({ ...d, [k]: rows }));
      } else {
        const { posts, reports } = await listMyPostModeration(userId);
        setData((d) => ({ ...d, myposts: posts, myreports: reports }));
      }
    }
    catch (e) { toast?.(e.message || "加载失败", "error"); setData((d) => ({ ...d, [k]: [] })); }
    finally { setLoading(false); }
  }, [userId, toast]);

  useEffect(() => { reload(kind); }, [kind, reload]);

  const list = data[kind];
  // 友好/警示按状态筛选；我的帖子/举报记录不筛选
  const filtered = (kind === "friendly" || kind === "warning")
    ? (list || []).filter((r) => status === "all" || r.status === status)
    : (list || []);

  const runAction = async (action, r) => {
    const map = {
      offline:  { fn: takeOffline,    msg: "已下架" },
      relist:   { fn: relist,         msg: "已重新上架" },
      delete:   { fn: removeReport,   msg: "已永久删除" },
      withdraw: { fn: withdrawReport, msg: "已撤回" },
    };
    const m = map[action];
    setBusyId(r.id);
    try {
      await m.fn(userId, kind, r.id);
      toast?.(m.msg);
      setDetail(null); setConfirm(null);
      await reload(kind);
    } catch (e) { toast?.(e.message || "操作失败", "error"); }
    finally { setBusyId(null); }
  };

  // 带确认弹窗的操作
  const onAction = (action, r) => {
    if (action === "offline") {
      setConfirm({ title:"确认下架？", msg:"下架后，这条信息将不会继续展示在地图中。你之后可以重新上架或永久删除。",
                   confirmLabel:"下架", onConfirm:() => runAction("offline", r) });
    } else if (action === "delete") {
      setConfirm({ title:"永久删除？", msg:"永久删除后无法恢复，确定删除吗？", danger:true,
                   confirmLabel:"永久删除", onConfirm:() => runAction("delete", r) });
    } else if (action === "withdraw") {
      setConfirm({ title:"撤回提交？", msg:"撤回后这条审核中的提交将被删除，确定撤回吗？", danger:true,
                   confirmLabel:"撤回", onConfirm:() => runAction("withdraw", r) });
    } else {
      runAction(action, r); // relist 无需确认
    }
  };

  const TABS = [
    { id:"friendly", label:"宠物友好", icon:"🐾" },
    { id:"warning", label:"宠物警示", icon:"⚠️" },
    { id:"myposts", label:"我的帖子", icon:"📝" },
    { id:"myreports", label:"举报记录", icon:"🚩" },
  ];

  return (
    <div style={{ position:"fixed", inset:0, zIndex:400, background:C.bg, display:"flex", flexDirection:"column" }}>
      {/* 顶栏 */}
      <div style={{ padding:"calc(env(safe-area-inset-top) + 12px) 16px 12px", display:"flex", alignItems:"center", background:C.bg }}>
        <BackButton onClick={onClose} size={34} />
        <div style={{ flex:1, textAlign:"center", fontSize:17, fontWeight:800, color:C.text }}>审核</div>
        <div style={{ width:34 }} />
      </div>

      {/* Tab 胶囊（横向滚动，4 个）*/}
      <div style={{ padding:"4px 16px 10px" }}>
        <div style={{ display:"flex", background:"#fff", borderRadius:14, padding:4, gap:4,
                      boxShadow:"0 2px 10px rgba(0,0,0,0.04)", overflowX:"auto", scrollbarWidth:"none" }}>
          {TABS.map((t) => {
            const on = kind === t.id;
            return (
              <button key={t.id} onClick={() => { setKind(t.id); setStatus("all"); }}
                style={{ flex:"1 0 auto", padding:"10px 14px", borderRadius:11, border:"none", cursor:"pointer",
                         whiteSpace:"nowrap",
                         background: on ? C.tint : "transparent", color: on ? C.pri : C.sub,
                         fontSize:14, fontWeight: on ? 800 : 600 }}>
                {t.icon} {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 状态筛选 chips（仅友好/警示）*/}
      {(kind === "friendly" || kind === "warning") && (
        <div style={{ display:"flex", gap:8, overflowX:"auto", padding:"0 16px 10px", flexShrink:0 }}>
          {STATUS_FILTERS.map((f) => {
            const on = status === f.id;
            return (
              <button key={f.id} onClick={() => setStatus(f.id)}
                style={{ padding:"7px 15px", borderRadius:999, fontSize:13, fontWeight: on ? 800 : 600, cursor:"pointer",
                         whiteSpace:"nowrap", border:`1.4px solid ${on ? C.pri : C.border}`,
                         background: on ? C.tint : "#fff", color: on ? C.pri : C.sub }}>
                {f.label}
              </button>
            );
          })}
        </div>
      )}

      {/* 列表 */}
      <div style={{ flex:1, overflowY:"auto", padding:"4px 16px calc(24px + env(safe-area-inset-bottom))",
                    display:"flex", flexDirection:"column", gap:12 }}>
        {list === null && <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:"50px 0" }}>加载中…</div>}
        {list !== null && filtered.length === 0 && <Empty kind={kind} />}
        {kind === "myposts" && filtered.map((p) => <MyPostCard key={p.id} p={p} />)}
        {kind === "myreports" && filtered.map((r) => <MyReportCard key={r.id} r={r} />)}
        {(kind === "friendly" || kind === "warning") && filtered.map((r) => (
          <ReportCard key={r.id} r={r} kind={kind} busy={busyId === r.id}
            onOpen={(rep) => setDetail({ report: rep, kind })} onAction={onAction} />
        ))}
      </div>

      <DetailSheet detail={detail} busy={busyId === detail?.report?.id}
        onClose={() => setDetail(null)} onAction={onAction} />
      <ConfirmDialog data={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
