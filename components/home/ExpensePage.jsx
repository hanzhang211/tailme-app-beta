"use client";

/**
 * components/home/ExpensePage.jsx — 宠物记账（Apple Widget 风格重设计）
 * 保留全部逻辑，仅升级 UI
 */

import { useEffect, useState } from "react";
import {
  listExpenses, addExpense, deleteExpense,
  getMonthlyTotal, getYearlyTotal, getMonthlyByCategory,
  EXPENSE_CATEGORIES,
} from "@/services/petExpenseService";
import { AccountingIcon } from "@/components/icons/HomeModuleIcons";

const BG   = "#F2E5DA";
const PRI  = "#E68645";
const TEXT = "#1A1006";
const SUB  = "#8A7B6A";

const card = {
  background: "rgba(255,255,255,0.55)",
  borderRadius: 28,
  boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
  border: "1px solid rgba(255,255,255,0.55)",
};

const fmtMoney = (n) => `¥${Number(n || 0).toFixed(2)}`;
const fmtDate  = (d) => {
  if (!d) return "";
  const [, m, day] = String(d).split("-");
  return `${m}/${day}`;
};

export default function ExpensePage({ user, pets, onBack }) {
  const [list,       setList]       = useState([]);
  const [monthTotal, setMonthTotal] = useState(0);
  const [yearTotal,  setYearTotal]  = useState(0);
  const [byCategory, setByCategory] = useState({});
  const [loading,    setLoading]    = useState(true);
  const [err,        setErr]        = useState(null);
  const [addOpen,    setAddOpen]    = useState(false);

  const reload = async () => {
    if (!user?.id) return;
    setLoading(true); setErr(null);
    try {
      const [items, mt, yt, cat] = await Promise.all([
        listExpenses(user.id),
        getMonthlyTotal(user.id),
        getYearlyTotal(user.id),
        getMonthlyByCategory(user.id),
      ]);
      setList(items); setMonthTotal(mt); setYearTotal(yt); setByCategory(cat);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { reload(); }, [user?.id]); // eslint-disable-line

  const handleDelete = async (item) => {
    if (!confirm("删除这条记账？")) return;
    try { await deleteExpense(item.id, user.id); reload(); }
    catch (e) { alert(e.message); }
  };

  const categoryRows = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <div style={{ height:"100%", overflowY:"auto", background:BG }}>

      {/* ── Header ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"52px 16px 14px" }}>
        <button onClick={onBack}
          style={{ width:40, height:40, borderRadius:999,
                   background:"rgba(255,255,255,0.6)", border:"none", cursor:"pointer",
                   fontSize:22, color:TEXT, display:"flex", alignItems:"center",
                   justifyContent:"center", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>‹</button>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <AccountingIcon size={20} color={TEXT} />
          <span style={{ fontSize:17, fontWeight:800, color:TEXT }}>宠物记账</span>
        </div>
        <button onClick={() => setAddOpen(true)}
          style={{ width:40, height:40, borderRadius:999, background:PRI, color:"white",
                   border:"none", cursor:"pointer", fontSize:22, fontWeight:700,
                   display:"flex", alignItems:"center", justifyContent:"center",
                   boxShadow:"0 4px 12px rgba(230,134,69,0.35)" }}>+</button>
      </div>

      <div style={{ padding:"0 16px 90px", display:"flex", flexDirection:"column", gap:14 }}>

        {/* ── 本月支出 Hero ── */}
        <div style={{ ...card, padding:"24px 20px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", bottom:-15, right:-15, opacity:0.08,
                        transform:"scale(0.78)", transformOrigin:"bottom right",
                        pointerEvents:"none", color:TEXT }}>
            <svg width="100" height="100" viewBox="0 0 100 100" fill="none"
                 stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
              <ellipse cx="27" cy="38" rx="8" ry="11"/>
              <ellipse cx="50" cy="28" rx="9" ry="12"/>
              <ellipse cx="73" cy="38" rx="8" ry="11"/>
              <path d="M33 58 Q22 78 38 88 Q55 95 72 88 Q88 78 77 58 Q70 48 55 48 Q40 48 33 58Z"/>
            </svg>
          </div>
          <div style={{ fontSize:12, color:SUB, marginBottom:4, fontWeight:500 }}>本月支出</div>
          <div style={{ fontSize:44, fontWeight:800, color:"#111", lineHeight:1.1, marginBottom:14 }}>
            {fmtMoney(monthTotal)}
          </div>
          <div style={{ display:"inline-flex", alignItems:"center", gap:6,
                        background:"rgba(230,134,69,0.12)", borderRadius:999, padding:"5px 12px" }}>
            <span style={{ fontSize:11, color:PRI, fontWeight:600 }}>本年支出 {fmtMoney(yearTotal)}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                 stroke={PRI} strokeWidth="2.5" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="7" y1="10" x2="17" y2="10"/>
              <line x1="7" y1="14" x2="13" y2="14"/>
            </svg>
          </div>
        </div>

        {/* ── 分类统计 ── */}
        {categoryRows.length > 0 && (
          <div style={{ ...card, padding:"20px" }}>
            <div style={{ fontSize:14, fontWeight:700, color:TEXT, marginBottom:14 }}>本月按分类</div>
            {categoryRows.map(([cat, amt]) => {
              const pct = monthTotal > 0 ? (amt / monthTotal) * 100 : 0;
              return (
                <div key={cat} style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                                fontSize:13, marginBottom:5 }}>
                    <span style={{ fontWeight:600, color:TEXT }}>{cat}</span>
                    <span style={{ color:SUB }}>{fmtMoney(amt)}</span>
                  </div>
                  <div style={{ height:7, borderRadius:999,
                                background:"rgba(230,134,69,0.16)", overflow:"hidden" }}>
                    <div style={{ width:`${pct}%`, height:"100%", background:PRI,
                                  borderRadius:999, transition:"width .3s" }}/>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── 记录列表 ── */}
        <div>
          <div style={{ fontSize:12, color:SUB, marginBottom:10, paddingLeft:4, fontWeight:600 }}>
            所有记录
          </div>
          {loading && <div style={{ textAlign:"center", color:SUB, padding:24 }}>加载中...</div>}
          {err && <div style={{ color:"#D94040", fontSize:12, padding:10 }}>❌ {err}</div>}
          {!loading && !err && list.length === 0 && (
            <div style={{ ...card, padding:"32px 20px", textAlign:"center",
                          color:"#9A9188", fontSize:13 }}>
              还没有记账，点右上角 + 开始记录
            </div>
          )}
          {list.map((it) => (
            <div key={it.id}
              style={{ ...card, padding:"14px 16px", marginBottom:10,
                       display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:TEXT }}>{it.category}</span>
                  {it.pet?.name && (
                    <span style={{ fontSize:10, padding:"2px 8px", borderRadius:10,
                                   background:"rgba(230,134,69,0.12)", color:PRI, fontWeight:600 }}>
                      {it.pet.name}
                    </span>
                  )}
                </div>
                {it.note && (
                  <div style={{ fontSize:12, color:SUB, overflow:"hidden",
                                textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {it.note}
                  </div>
                )}
                <div style={{ fontSize:11, color:SUB, marginTop:3 }}>{fmtDate(it.expense_date)}</div>
              </div>
              <div style={{ fontSize:16, fontWeight:800, color:PRI }}>{fmtMoney(it.amount)}</div>
              <button onClick={() => handleDelete(it)}
                style={{ background:"transparent", border:"none", cursor:"pointer",
                         color:"#C5B9B0", fontSize:16, padding:"2px 4px" }}>🗑</button>
            </div>
          ))}
        </div>
      </div>

      {addOpen && (
        <AddExpenseModal user={user} pets={pets}
          onClose={() => setAddOpen(false)}
          onAdded={() => { setAddOpen(false); reload(); }} />
      )}
    </div>
  );
}

/* ── AddExpenseModal (logic unchanged, minor style polish) ── */
function AddExpenseModal({ user, pets, onClose, onAdded }) {
  const [amount,   setAmount]   = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[6]);
  const [date,     setDate]     = useState(new Date().toISOString().slice(0, 10));
  const [petId,    setPetId]    = useState(pets?.[0]?.id || "");
  const [note,     setNote]     = useState("");
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState(null);

  const handleSave = async () => {
    setErr(null); setSaving(true);
    try {
      await addExpense({ userId: user.id, petId: petId || null,
                         amount, category, note, expenseDate: date });
      onAdded();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000,
               display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, background:"#EEE9E1",
                    borderRadius:"22px 22px 0 0", padding:"18px 18px 28px",
                    maxHeight:"80vh", overflowY:"auto" }}>
        <div style={{ width:40, height:4, borderRadius:4, background:"#D6D5D8",
                      margin:"0 auto 16px" }}/>
        <div style={{ fontSize:17, fontWeight:800, color:TEXT, marginBottom:16 }}>新增记账</div>

        <Label>金额</Label>
        <input type="number" inputMode="decimal" min="0" step="0.01"
          value={amount} onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00" style={inputStyle()} />

        <Label>分类</Label>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
          {EXPENSE_CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              style={{ padding:"6px 12px", borderRadius:14, fontSize:12,
                       background: category === c ? PRI : "white",
                       color: category === c ? "white" : TEXT,
                       border:`1px solid ${category === c ? PRI : "#D6D5D8"}`,
                       cursor:"pointer" }}>
              {c}
            </button>
          ))}
        </div>

        <Label>日期</Label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle()} />

        {pets && pets.length > 1 && (
          <>
            <Label>关联宠物</Label>
            <select value={petId} onChange={(e) => setPetId(e.target.value)} style={inputStyle()}>
              <option value="">不指定</option>
              {pets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </>
        )}

        <Label>备注（可选）</Label>
        <input value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="比如：某宠物医院体检" maxLength={200} style={inputStyle()} />

        {err && <div style={{ color:"#D94040", fontSize:12, marginBottom:8 }}>❌ {err}</div>}
        <div style={{ display:"flex", gap:10, marginTop:10 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:"12px 0", borderRadius:14, fontSize:14, fontWeight:600,
                     background:"white", color:TEXT, border:"1px solid #D6D5D8", cursor:"pointer" }}>
            取消
          </button>
          <button onClick={handleSave} disabled={saving || !amount}
            style={{ flex:1, padding:"12px 0", borderRadius:14, fontSize:14, fontWeight:700,
                     background: amount && !saving ? PRI : "#D6D5D8",
                     color:"white", border:"none",
                     cursor: amount && !saving ? "pointer" : "default" }}>
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = () => ({
  width:"100%", borderRadius:14, padding:"10px 12px", fontSize:14,
  border:"1.5px solid #D6D5D8", background:"white", color:TEXT,
  outline:"none", boxSizing:"border-box", marginBottom:14, fontFamily:"inherit",
});

function Label({ children }) {
  return <div style={{ fontSize:12, fontWeight:600, color:TEXT, marginBottom:6 }}>{children}</div>;
}
