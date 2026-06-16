"use client";

/**
 * components/admin/BanManager.jsx
 * 平台审核员：「用户封禁管理」，嵌入 /admin。真实 Supabase 数据（service_role API）。
 * 按账号（user_no / 用户名）精确搜索用户 → 封禁 7天/30天/永久 或解除封禁。
 * 下方常驻「当前封禁中」列表。封禁与禁言相互独立（禁言在「聊天审核」里操作）。
 */

import { useEffect, useState } from "react";
import { adminSearchUsers, adminListBannedUsers, adminSetBan, BAN_OPTS } from "@/services/banAdminService";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", card:"#FFFFFF",
  text:"#1A1006", sub:"#8A8074", border:"#D6D5D8", line:"#EFE9DF",
  errT:"#D94040", ok:"#2E7D32",
};

function fmtDate(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function BanManager({ adminId }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null); // null=未搜索；[]=无结果
  const [searching, setSearching] = useState(false);
  const [banned, setBanned] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const loadBanned = async () => {
    if (!adminId) return;
    setLoading(true); setErr(null);
    try { setBanned(await adminListBannedUsers(adminId)); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadBanned(); }, [adminId]); // eslint-disable-line

  const doSearch = async () => {
    const kw = q.trim();
    if (!kw || !adminId) return;
    setSearching(true); setErr(null);
    try { setResults(await adminSearchUsers(adminId, kw)); }
    catch (e) { setErr(e.message); }
    finally { setSearching(false); }
  };

  // 任一操作完成后：刷新封禁中列表 + 刷新搜索结果（如有）
  const afterChange = async () => {
    await loadBanned();
    if (q.trim() && results) {
      try { setResults(await adminSearchUsers(adminId, q.trim())); } catch {}
    }
  };

  return (
    <div style={{ background:C.card, borderRadius:18, padding:"16px 14px",
                  border:`1px solid ${C.border}`, boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize:15, fontWeight:800, color:C.text, marginBottom:2 }}>🚫 用户封禁管理</div>
      <div style={{ fontSize:11, color:C.sub, marginBottom:12, lineHeight:1.6 }}>
        按账号搜索用户后封禁 7天 / 30天 / 永久。封禁中禁止：遛弯、上报友好·警示、社群发帖·评论、群聊发言；
        <b>私聊与浏览不受影响</b>。（禁言请到「聊天审核」操作）
      </div>

      {/* 搜索框 */}
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        <input value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doSearch()}
          placeholder="输入用户号（user_no）或用户名"
          style={{ flex:1, borderRadius:10, padding:"9px 12px", fontSize:13, boxSizing:"border-box",
                   border:`1.5px solid ${C.border}`, background:"#fff", color:C.text, outline:"none", fontFamily:"inherit" }} />
        <button onClick={doSearch} disabled={searching || !q.trim()}
          style={{ padding:"0 16px", borderRadius:10, fontSize:13, fontWeight:700, border:"none",
                   background: q.trim() ? C.pri : C.border, color:"#fff",
                   cursor: q.trim() && !searching ? "pointer" : "default" }}>
          {searching ? "搜索中…" : "搜索"}
        </button>
      </div>

      {err && <div style={{ color:C.errT, fontSize:12, padding:"0 0 8px" }}>❌ {err}</div>}

      {/* 搜索结果 */}
      {results !== null && (
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:12, fontWeight:800, color:C.sub, marginBottom:8 }}>
            搜索结果（{results.length}）
          </div>
          {results.length === 0 ? (
            <div style={{ textAlign:"center", color:C.sub, fontSize:12.5, padding:"14px 0" }}>没有匹配的用户</div>
          ) : (
            results.map((u) => <UserCard key={u.id} user={u} adminId={adminId} onChanged={afterChange} />)
          )}
        </div>
      )}

      {/* 封禁中列表 */}
      <div style={{ fontSize:12, fontWeight:800, color:C.sub, marginBottom:8 }}>
        当前封禁中{loading ? "…" : `（${banned.length}）`}
      </div>
      {!loading && banned.length === 0 && (
        <div style={{ textAlign:"center", color:C.sub, fontSize:12.5, padding:"14px 0" }}>暂无封禁用户 ✓</div>
      )}
      {banned.map((u) => <UserCard key={u.id} user={u} adminId={adminId} onChanged={afterChange} />)}
    </div>
  );
}

function UserCard({ user, adminId, onChanged }) {
  const [busy, setBusy] = useState(false);

  const bu = user.banned_until ? new Date(user.banned_until) : null;
  const isBanned = bu && bu.getTime() > Date.now();
  const banForever = isBanned && bu.getFullYear() >= 2099;
  const mu = user.muted_until ? new Date(user.muted_until) : null;
  const isMuted = mu && mu.getTime() > Date.now();

  const act = async (action, banDays, confirmMsg) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(true);
    try {
      await adminSetBan({ adminId, targetUserId: user.id, action, banDays });
      onChanged?.();
    } catch (e) { alert(e.message); }
    finally { setBusy(false); }
  };

  const name = user.username || "用户";

  return (
    <div style={{ background:C.bg, borderRadius:12, padding:"11px 12px", marginBottom:8, border:`1px solid ${C.border}` }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
        <span style={{ width:40, height:40, borderRadius:"50%", background:C.tint, flexShrink:0, overflow:"hidden",
                       display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
          {user.avatar_url ? <img src={user.avatar_url} alt="" loading="lazy" decoding="async" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : "🐾"}
        </span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {name}{user.user_no ? ` (${user.user_no})` : ""}
            {user.role === "admin" && <span style={{ fontSize:10, color:C.pri, marginLeft:6 }}>管理员</span>}
          </div>
          <div style={{ fontSize:10.5, marginTop:2, display:"flex", gap:8, flexWrap:"wrap" }}>
            {isBanned ? (
              <span style={{ color:C.errT, fontWeight:700 }}>
                🚫 封禁中{banForever ? "（永久）" : ` · 至 ${fmtDate(bu)}`}
              </span>
            ) : (
              <span style={{ color:C.ok }}>✓ 未封禁</span>
            )}
            {isMuted && <span style={{ color:"#9C5A00" }}>🔇 已禁言</span>}
          </div>
        </div>
      </div>

      {user.role === "admin" ? (
        <div style={{ fontSize:11, color:C.sub }}>管理员账号不可封禁</div>
      ) : (
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {BAN_OPTS.map((o) => (
            <Btn key={o.d} tone="err" disabled={busy}
              onClick={() => act("ban", o.d, `确定${o.label}该用户「${name}」？`)}>{o.label}</Btn>
          ))}
          {isBanned && (
            <Btn tone="ok" disabled={busy}
              onClick={() => act("unban", null, `解除「${name}」的封禁？`)}>解除封禁</Btn>
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
