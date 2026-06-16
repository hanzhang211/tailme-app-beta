"use client";

/**
 * app/admin/page.jsx
 *
 * Admin 面板：
 *  - 校验当前 user 的 role === 'admin'（非 admin 拒绝访问）
 *  - 全局统计
 *  - flagged / hidden 内容管理（posts / comments / messages）
 *  - 隐藏 / 恢复 / 删除
 */

import { useCallback, useEffect, useState } from "react";
import {
  getAdminStats,
  getUserById,
  getOrCreateUserByPhone,
} from "@/services/supabaseService";
import {
  listFlagged,
  adminModerate,
} from "@/services/communityService";
import {
  listRecipes,
  adminCreateRecipe,
  adminDeleteRecipe,
} from "@/services/petRecipeService";
import { avatarForBreed } from "@/services/breedAvatar";
import { StoreReviewManager, ProductReviewManager } from "@/components/admin/MerchantReviews";
import { DangerReviewManager, FriendlyManager } from "@/components/admin/DangerReviews";
import { VerificationManager } from "@/components/admin/VerificationReviews";
import { ReportManager } from "@/components/admin/ReportReviews";
import { ChatReportManager } from "@/components/admin/ChatReports";
import { BanManager } from "@/components/admin/BanManager";

const C = {
  pri:    "#E68645",
  tint:   "#F2E5DA",
  bg:     "#EEE9E1",
  card:   "#FFFFFF",
  text:   "#1A1006",
  sub:    "#8A8074",
  light:  "#D6D5D8",
  border: "#D6D5D8",
  err:    "#FFF0F0",
  errT:   "#D94040",
};

const LS_KEY = "tailme_user_id";

function fmt(val) {
  if (val === null || val === undefined) return null;
  return Number(val).toLocaleString("zh-CN");
}

function fmtTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("zh-CN", {
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminPage() {
  /* ── auth gate ─────────────────────────────────────────── */
  const [authStatus, setAuthStatus] = useState("loading"); // loading|ok|denied|nologin
  const [me, setMe]                 = useState(null);

  const checkAuth = useCallback(() => {
    const uid = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
    if (!uid) { setMe(null); setAuthStatus("nologin"); return; }
    setAuthStatus("loading");
    getUserById(uid)
      .then((u) => {
        setMe(u);
        setAuthStatus(u?.role === "admin" ? "ok" : "denied");
      })
      .catch(() => setAuthStatus("denied"));
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const switchAccount = () => {
    if (typeof window !== "undefined") localStorage.removeItem(LS_KEY);
    setMe(null);
    setAuthStatus("nologin");
  };

  if (authStatus === "loading") {
    return <Centered>正在校验权限...</Centered>;
  }
  if (authStatus === "nologin" || authStatus === "denied") {
    return <AdminLogin onLoggedIn={checkAuth} denied={authStatus === "denied"} me={me} onSwitch={switchAccount} />;
  }

  return <AdminMain me={me} onSwitch={switchAccount} />;
}

/* ── Admin 手机号登录 / 切换账号 ─────────────────────────── */
function AdminLogin({ onLoggedIn, denied, me, onSwitch }) {
  const [step, setStep]   = useState(1); // 1=手机号 2=验证码
  const [phone, setPhone] = useState("");
  const [code, setCode]   = useState("");
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState("");
  const isValidPhone = /^1[3-9]\d{9}$/.test(phone.trim());

  const verify = async () => {
    setErr("");
    if (code.trim() !== "123456") { setErr("验证码错误（MVP 固定测试码：123456）"); return; }
    setBusy(true);
    try {
      const user = await getOrCreateUserByPhone(phone.trim());
      localStorage.setItem(LS_KEY, user.id);
      onLoggedIn();
    } catch (e) {
      setErr(e.message || "登录失败");
    } finally { setBusy(false); }
  };

  const inputStyle = {
    width:"100%", borderRadius:12, padding:"11px 13px", fontSize:14, marginBottom:12,
    border:`1.5px solid ${C.border}`, background:"#fff", color:C.text, outline:"none",
    boxSizing:"border-box", fontFamily:"inherit",
  };
  const btnStyle = (on) => ({
    width:"100%", padding:"12px 0", borderRadius:12, fontSize:14, fontWeight:700, border:"none",
    background: on ? C.pri : C.light, color:"#fff", cursor: on ? "pointer" : "default",
  });

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center",
                  padding:20, fontFamily:"-apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif" }}>
      <div style={{ width:"100%", maxWidth:380 }}>
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{ fontSize:34 }}>🛠</div>
          <div style={{ fontSize:20, fontWeight:800, color:C.text, marginTop:4 }}>TailMe 管理员后台</div>
        </div>
        <div style={{ background:C.card, borderRadius:18, padding:24, border:`1px solid ${C.border}`,
                      boxShadow:"0 2px 14px rgba(0,0,0,0.05)" }}>
          {denied && me && (
            <div style={{ background:C.err, color:C.errT, border:`1px solid ${C.errT}`, borderRadius:12,
                          padding:"10px 14px", fontSize:12.5, marginBottom:16, lineHeight:1.6 }}>
              账号 {me.username || me.phone} 没有管理员权限。请切换到管理员手机号登录。
            </div>
          )}
          {step === 1 ? (
            <>
              <div style={{ fontSize:16, fontWeight:800, color:C.text, marginBottom:14 }}>管理员登录</div>
              <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="请输入手机号" inputMode="numeric" maxLength={11} style={inputStyle} />
              {err && <div style={{ color:C.errT, fontSize:12.5, marginBottom:10 }}>{err}</div>}
              <button onClick={() => { setErr(""); isValidPhone ? setStep(2) : setErr("请输入正确的手机号"); }}
                disabled={!isValidPhone} style={btnStyle(isValidPhone)}>获取验证码</button>
            </>
          ) : (
            <>
              <div style={{ fontSize:16, fontWeight:800, color:C.text, marginBottom:6 }}>输入验证码</div>
              <div style={{ fontSize:12, color:C.sub, marginBottom:14 }}>已发送至 +86 {phone}（测试码 123456）</div>
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="请输入 6 位验证码" inputMode="numeric" maxLength={6} style={inputStyle} />
              {err && <div style={{ color:C.errT, fontSize:12.5, marginBottom:10 }}>{err}</div>}
              <button onClick={verify} disabled={busy} style={btnStyle(!busy)}>{busy ? "登录中…" : "登录"}</button>
              <button onClick={() => { setStep(1); setCode(""); setErr(""); }}
                style={{ width:"100%", marginTop:12, background:"none", border:"none", color:C.sub, fontSize:12.5, cursor:"pointer" }}>
                ← 重新输入手机号
              </button>
            </>
          )}
        </div>
        <div style={{ textAlign:"center", marginTop:14 }}>
          <a href="/" style={{ color:C.sub, fontSize:12.5, textDecoration:"none" }}>← 返回 TailMe App</a>
        </div>
      </div>
    </div>
  );
}

function Centered({ children }) {
  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex",
                  alignItems:"center", justifyContent:"center",
                  color:C.text, fontSize:14, padding:20, textAlign:"center" }}>
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
function AdminMain({ me, onSwitch }) {
  const [stats, setStats]       = useState(null);
  const [fatalError, setFatal]  = useState(null);
  const [loading, setLoad]      = useState(true);
  const [refreshAt, setRefresh] = useState(0);

  useEffect(() => {
    setLoad(true);
    setFatal(null);
    getAdminStats()
      .then(setStats)
      .catch((err) => setFatal(err.message))
      .finally(() => setLoad(false));
  }, [refreshAt]);

  const tiles = stats
    ? [
        { icon: "👤", label: "注册用户",   val: stats.total_users,    err: stats.errors?.users    },
        { icon: "🐾", label: "宠物数量",   val: stats.total_pets,     err: stats.errors?.pets     },
        { icon: "💬", label: "聊天消息",   val: stats.chat_messages,  err: stats.errors?.messages },
        { icon: "🏪", label: "商铺数量",   val: stats.partner_shops,  err: stats.errors?.shops    },
      ]
    : [];

  const queriedAt = stats?.queried_at
    ? new Date(stats.queried_at).toLocaleString("zh-CN")
    : null;

  return (
    <div style={{ minHeight:"100vh", background:C.bg,
                  fontFamily:"-apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif" }}>

      {/* Header */}
      <div style={{ background:C.pri, padding:"40px 24px 24px", color:"white" }}>
        <div style={{ fontSize:11, opacity:0.85, marginBottom:4 }}>爪爪日记 TailMe</div>
        <div style={{ fontSize:24, fontWeight:800 }}>🛠 Admin Dashboard</div>
        <div style={{ fontSize:12, opacity:0.85, marginTop:4 }}>
          {loading ? "查询中..." : fatalError ? "连接失败" : `实时数据 · ${queriedAt}`}
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:8, gap:10 }}>
          <div style={{ fontSize:11, opacity:0.75 }}>
            管理员：{me?.username || me?.phone}
          </div>
          <button onClick={onSwitch}
            style={{ padding:"5px 12px", borderRadius:10, fontSize:11.5, fontWeight:700, cursor:"pointer",
                     background:"rgba(255,255,255,0.18)", color:"#fff", border:"1px solid rgba(255,255,255,0.35)" }}>
            切换手机号
          </button>
        </div>
      </div>

      <div style={{ padding:"20px 16px 60px" }}>

        {loading && (
          <div style={{ textAlign:"center", padding:60, color:C.sub, fontSize:14 }}>
            ⟳ 正在查询...
          </div>
        )}

        {!loading && fatalError && (
          <div style={{ background:C.err, border:`1.5px solid ${C.errT}`, borderRadius:16,
                        padding:"18px 16px", marginBottom:16 }}>
            <div style={{ fontSize:15, fontWeight:800, color:C.errT, marginBottom:8 }}>
              ❌ Database connection failed
            </div>
            <div style={{ fontSize:12, color:C.errT, fontFamily:"monospace",
                          lineHeight:1.7, wordBreak:"break-all" }}>
              {fatalError}
            </div>
          </div>
        )}

        {/* 统计 tiles */}
        {!loading && !fatalError && stats && (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24 }}>
              {tiles.map(({ icon, label, val, err }) => {
                const display = fmt(val);
                const hasError = val === null;
                return (
                  <div key={label} style={{
                    background: hasError ? C.err : C.card,
                    borderRadius:20, padding:"16px 14px",
                    boxShadow:"0 2px 12px rgba(0,0,0,0.05)",
                    border: hasError ? `1px solid ${C.errT}` : `1px solid ${C.border}`,
                  }}>
                    <div style={{ fontSize:24, marginBottom:4 }}>{icon}</div>
                    <div style={{ fontSize:11, color:C.sub }}>{label}</div>
                    {hasError ? (
                      <>
                        <div style={{ fontSize:20, fontWeight:800, color:C.errT, marginTop:2 }}>—</div>
                        <div style={{ fontSize:10, color:C.errT, marginTop:4, lineHeight:1.4 }}>
                          {err ?? "Query failed"}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize:24, fontWeight:800, color:C.text, marginTop:2, lineHeight:1 }}>
                        {display}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display:"flex", gap:12, marginBottom:28 }}>
              <button
                onClick={() => setRefresh(Date.now())}
                style={{ flex:1, padding:"12px 0", borderRadius:14, background:C.pri,
                         color:"white", fontSize:13, fontWeight:700, border:"none", cursor:"pointer" }}>
                🔄 刷新统计
              </button>
              <a href="/"
                style={{ flex:1, padding:"12px 0", borderRadius:14, background:C.tint,
                         color:C.pri, fontSize:13, fontWeight:700, border:`1.5px solid ${C.border}`,
                         cursor:"pointer", textAlign:"center", textDecoration:"none",
                         display:"block", boxSizing:"border-box" }}>
                ← 返回 App
              </a>
            </div>
          </>
        )}

        {/* 审核 / 管理 —— Tab 切换 */}
        <AdminTabs me={me} />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   审核 / 管理 Tab 切换（类似社群 关注/推荐/同城）
────────────────────────────────────────────────────────── */
function AdminTabs({ me }) {
  const TABS = [
    { key: "merchant", label: "商家资质", render: () => <StoreReviewManager adminId={me?.id} /> },
    { key: "product",  label: "商品",     render: () => <ProductReviewManager adminId={me?.id} /> },
    { key: "verify",   label: "用户认证", render: () => <VerificationManager adminId={me?.id} /> },
    { key: "warning",  label: "宠物警示", render: () => <DangerReviewManager adminId={me?.id} /> },
    { key: "friendly", label: "友好地点", render: () => <FriendlyManager adminId={me?.id} /> },
    { key: "content",  label: "内容",     render: () => <FlaggedModeration adminId={me?.id} /> },
    { key: "reports",  label: "举报管理", render: () => <ReportManager adminId={me?.id} /> },
    { key: "chatreports", label: "聊天审核", render: () => <ChatReportManager adminId={me?.id} /> },
    { key: "ban",      label: "用户封禁", render: () => <BanManager adminId={me?.id} /> },
    { key: "recipe",   label: "食谱",     render: () => <RecipeManager adminId={me?.id} /> },
  ];
  const [active, setActive] = useState("merchant");
  const cur = TABS.find((t) => t.key === active) || TABS[0];

  return (
    <div>
      {/* Tab 胶囊（横向滚动）*/}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 16,
                    scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {TABS.map((t) => {
          const on = active === t.key;
          return (
            <button key={t.key} onClick={() => setActive(t.key)}
              style={{ flexShrink: 0, padding: "8px 16px", borderRadius: 999, fontSize: 13, fontWeight: on ? 800 : 600,
                       cursor: "pointer", whiteSpace: "nowrap", border: `1px solid ${on ? C.pri : C.border}`,
                       background: on ? C.pri : "#fff", color: on ? "#fff" : C.sub,
                       boxShadow: on ? "0 3px 10px rgba(230,134,69,0.28)" : "none" }}>
              {t.label}
            </button>
          );
        })}
      </div>
      {cur.render()}
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
function FlaggedModeration({ adminId }) {
  const [table,   setTable]   = useState("posts"); // posts | comments | messages
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState(null);

  const reload = async () => {
    if (!adminId) return;
    setLoading(true);
    setErr(null);
    try {
      const data = await listFlagged({ adminId, table });
      setItems(data);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [adminId, table]); // eslint-disable-line react-hooks/exhaustive-deps

  const typeKey = { posts: "post", comments: "comment", messages: "message" }[table];

  const doAction = async (item, action) => {
    const label = action === "delete" ? "永久删除" : action === "hide" ? "隐藏" : "恢复";
    if (action === "delete" && !confirm(`${label}这条 ${typeKey}？此操作不可撤销。`)) return;
    try {
      await adminModerate({ adminId, targetType: typeKey, targetId: item.id, action });
      reload();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div style={{ background:C.card, borderRadius:18, padding:"16px 14px",
                  border:`1px solid ${C.border}`, boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize:15, fontWeight:800, color:C.text, marginBottom:4 }}>
        🛡 内容审核
      </div>
      <div style={{ fontSize:11, color:C.sub, marginBottom:12 }}>
        flagged = 关键词命中待审核 · hidden = 已隐藏
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        {[
          { key:"posts",    label:"帖子" },
          { key:"comments", label:"评论" },
          { key:"messages", label:"消息" },
        ].map((t) => {
          const on = table === t.key;
          return (
            <button key={t.key} onClick={() => setTable(t.key)}
              style={{ flex:1, padding:"7px 0", borderRadius:14, fontSize:12, fontWeight:600,
                       background:on ? C.pri : C.tint, color:on ? "white" : C.text,
                       border:"none", cursor:"pointer" }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {loading && <div style={{ textAlign:"center", color:C.sub, fontSize:12, padding:20 }}>加载中...</div>}
      {err     && <div style={{ color:C.errT, fontSize:12 }}>❌ {err}</div>}
      {!loading && !err && items.length === 0 && (
        <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:24 }}>
          暂无 flagged / hidden 内容 ✓
        </div>
      )}

      {items.map((it) => (
        <div key={it.id} style={{
          background:C.bg, borderRadius:12, padding:"10px 12px", marginBottom:8,
          border:`1px solid ${C.border}`,
        }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                        marginBottom:6, gap:8 }}>
            <div style={{ fontSize:11, color:C.sub, display:"flex", gap:8, alignItems:"center",
                          minWidth:0, flex:1 }}>
              <span style={{ fontSize:14 }}>{avatarForBreed(it.pet?.breed)}</span>
              <span style={{ fontWeight:700, color:C.text }}>
                {it.user?.username || "未命名"}
              </span>
              <span>{fmtTime(it.created_at)}</span>
            </div>
            <span style={{ fontSize:10, padding:"2px 8px", borderRadius:10,
                           background: it.status === "flagged" ? "#FFF4D6" : C.light,
                           color: it.status === "flagged" ? "#9C5A00" : C.sub,
                           fontWeight:600, flexShrink:0 }}>
              {it.status}
            </span>
          </div>
          <div style={{ fontSize:13, color:C.text, lineHeight:1.55,
                        wordBreak:"break-word", whiteSpace:"pre-wrap", marginBottom:8 }}>
            {it.content}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {it.status === "flagged" || it.status === "hidden" ? (
              <button onClick={() => doAction(it, "restore")}
                style={{ padding:"6px 12px", borderRadius:10, fontSize:11, fontWeight:600,
                         background:"#E6F4E1", color:"#4CAF50", border:"none", cursor:"pointer" }}>
                ✓ 恢复
              </button>
            ) : (
              <button onClick={() => doAction(it, "hide")}
                style={{ padding:"6px 12px", borderRadius:10, fontSize:11, fontWeight:600,
                         background:C.tint, color:C.text, border:"none", cursor:"pointer" }}>
                隐藏
              </button>
            )}
            <button onClick={() => doAction(it, "delete")}
              style={{ padding:"6px 12px", borderRadius:10, fontSize:11, fontWeight:600,
                       background:"#FFE2E2", color:C.errT, border:"none", cursor:"pointer" }}>
              永久删除
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
function RecipeManager({ adminId }) {
  const [list,    setList]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState(null);
  const [open,    setOpen]    = useState(false);
  const [editing, setEditing] = useState(null);

  const reload = async () => {
    setLoading(true);
    setErr(null);
    try {
      const rs = await listRecipes();
      setList(rs);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const handleDelete = async (r) => {
    if (!confirm(`删除「${r.title}」？此操作不可撤销。`)) return;
    try {
      await adminDeleteRecipe(adminId, r.id);
      reload();
    } catch (e) { alert(e.message); }
  };

  return (
    <div style={{ background:C.card, borderRadius:18, padding:"16px 14px",
                  border:`1px solid ${C.border}`, boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:800, color:C.text, marginBottom:2 }}>
            🍱 食谱管理
          </div>
          <div style={{ fontSize:11, color:C.sub }}>
            仅管理员可发布；普通用户只能浏览
          </div>
        </div>
        <button onClick={() => { setEditing(null); setOpen(true); }}
          style={{ padding:"7px 14px", borderRadius:14, fontSize:12, fontWeight:700,
                   background:C.pri, color:"white", border:"none", cursor:"pointer" }}>
          + 新建
        </button>
      </div>

      {loading && <div style={{ textAlign:"center", color:C.sub, fontSize:12, padding:20 }}>加载中...</div>}
      {err && <div style={{ color:C.errT, fontSize:12, padding:6 }}>❌ {err}</div>}
      {!loading && !err && list.length === 0 && (
        <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:20 }}>
          还没有食谱
        </div>
      )}

      {list.map((r) => (
        <div key={r.id} style={{
          background:C.bg, borderRadius:12, padding:"10px 12px", marginBottom:8,
          border:`1px solid ${C.border}`,
          display:"flex", alignItems:"center", gap:10,
        }}>
          <div style={{ width:36, height:36, borderRadius:10, background:C.tint,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:20, flexShrink:0 }}>{r.emoji || "🍱"}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.text,
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {r.title}
            </div>
            <div style={{ fontSize:11, color:C.sub, marginTop:2,
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {r.suitable_for || "无适用说明"}
            </div>
          </div>
          <button onClick={() => { setEditing(r); setOpen(true); }}
            style={{ padding:"6px 10px", borderRadius:10, fontSize:11, fontWeight:600,
                     background:C.tint, color:C.text, border:"none", cursor:"pointer" }}>
            编辑
          </button>
          <button onClick={() => handleDelete(r)}
            style={{ padding:"6px 10px", borderRadius:10, fontSize:11, fontWeight:600,
                     background:"#FFE2E2", color:C.errT, border:"none", cursor:"pointer" }}>
            删除
          </button>
        </div>
      ))}

      {open && (
        <RecipeEditor
          adminId={adminId}
          initial={editing}
          onClose={() => setOpen(false)}
          onSaved={() => { setOpen(false); reload(); }}
        />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
function RecipeEditor({ adminId, initial, onClose, onSaved }) {
  const [title,        setTitle]        = useState(initial?.title || "");
  const [emoji,        setEmoji]        = useState(initial?.emoji || "🍱");
  const [suitableFor,  setSuitableFor]  = useState(initial?.suitable_for || "");
  const [ingredients,  setIngredients]  = useState(initial?.ingredients || "");
  const [steps,        setSteps]        = useState(initial?.steps || "");
  const [nutrition,    setNutrition]    = useState(initial?.nutrition || "");
  const [notes,        setNotes]        = useState(initial?.notes || "");
  const [saving,       setSaving]       = useState(false);
  const [err,          setErr]          = useState(null);

  const isEdit = !!initial?.id;

  const handleSave = async () => {
    setErr(null);
    if (!title.trim()) { setErr("标题不能为空"); return; }
    setSaving(true);
    try {
      const payload = {
        title:        title.trim(),
        emoji:        emoji.trim() || "🍱",
        suitable_for: suitableFor.trim() || null,
        ingredients:  ingredients.trim() || null,
        steps:        steps,        // 保留换行
        nutrition:    nutrition.trim() || null,
        notes:        notes.trim() || null,
      };
      if (isEdit) {
        // 走 PUT
        const res = await fetch("/api/admin/recipes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminId, recipeId: initial.id, patch: payload }),
        });
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({ error: "更新失败" }));
          throw new Error(error);
        }
      } else {
        await adminCreateRecipe(adminId, payload);
      }
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width:"100%", borderRadius:12, padding:"10px 12px", fontSize:13,
    border:`1.5px solid ${C.border}`, background:"white", color:C.text,
    outline:"none", boxSizing:"border-box", marginBottom:10, fontFamily:"inherit",
  };

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000,
               display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ width:"100%", maxWidth:520, background:C.bg, borderRadius:18,
                    padding:"18px 18px 22px", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ fontSize:17, fontWeight:800, color:C.text, marginBottom:14 }}>
          {isEdit ? "✏️ 编辑食谱" : "➕ 新建食谱"}
        </div>

        <div style={{ display:"flex", gap:10, marginBottom:10 }}>
          <input value={emoji} onChange={(e) => setEmoji(e.target.value)}
            placeholder="🍱" maxLength={4}
            style={{ ...inputStyle, width:60, textAlign:"center", fontSize:20, marginBottom:0 }} />
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="标题（必填）" maxLength={60}
            style={{ ...inputStyle, marginBottom:0 }} />
        </div>

        <input value={suitableFor} onChange={(e) => setSuitableFor(e.target.value)}
          placeholder="适合宠物 / 年龄段"
          maxLength={120}
          style={inputStyle} />

        <textarea value={ingredients} onChange={(e) => setIngredients(e.target.value)}
          placeholder="食材，例：鸡胸肉 100g、南瓜 80g..."
          rows={2}
          style={{ ...inputStyle, resize:"vertical", minHeight:50 }} />

        <textarea value={steps} onChange={(e) => setSteps(e.target.value)}
          placeholder={"做法步骤，每行一步\n1. ...\n2. ..."}
          rows={5}
          style={{ ...inputStyle, resize:"vertical", minHeight:100, fontFamily:"inherit" }} />

        <textarea value={nutrition} onChange={(e) => setNutrition(e.target.value)}
          placeholder="营养说明"
          rows={2}
          style={{ ...inputStyle, resize:"vertical", minHeight:50 }} />

        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="注意事项"
          rows={2}
          style={{ ...inputStyle, resize:"vertical", minHeight:50 }} />

        {err && <div style={{ color:C.errT, fontSize:12, marginBottom:6 }}>❌ {err}</div>}

        <div style={{ display:"flex", gap:10, marginTop:6 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:"11px 0", borderRadius:14, fontSize:13, fontWeight:600,
                     background:"white", color:C.text, border:`1px solid ${C.border}`,
                     cursor:"pointer" }}>取消</button>
          <button onClick={handleSave} disabled={saving || !title.trim()}
            style={{ flex:1, padding:"11px 0", borderRadius:14, fontSize:13, fontWeight:700,
                     background: title.trim() && !saving ? C.pri : C.light,
                     color:"white", border:"none",
                     cursor: title.trim() && !saving ? "pointer" : "default" }}>
            {saving ? "保存中..." : isEdit ? "保存" : "发布"}
          </button>
        </div>
      </div>
    </div>
  );
}

