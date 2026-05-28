"use client";

/**
 * components/home/ExpensePage.jsx
 *
 * 宠物记账：返回按钮 + 月/年总额 + 分类统计 + 列表 + 添加弹窗
 */

import { useEffect, useState } from "react";
import {
  listExpenses, addExpense, deleteExpense,
  getMonthlyTotal, getYearlyTotal, getMonthlyByCategory,
  EXPENSE_CATEGORIES,
} from "@/services/petExpenseService";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", text:"#1A1006",
  sub:"#8A8074", light:"#D6D5D8", border:"#D6D5D8",
};

const fmtMoney = (n) => `¥${Number(n || 0).toFixed(2)}`;
const fmtDate  = (d) => {
  if (!d) return "";
  const [y, m, day] = String(d).split("-");
  return `${m}/${day}`;
};

export default function ExpensePage({ user, pets, onBack }) {
  const [list,         setList]         = useState([]);
  const [monthTotal,   setMonthTotal]   = useState(0);
  const [yearTotal,    setYearTotal]    = useState(0);
  const [byCategory,   setByCategory]   = useState({});
  const [loading,      setLoading]      = useState(true);
  const [err,          setErr]          = useState(null);
  const [addOpen,      setAddOpen]      = useState(false);

  const reload = async () => {
    if (!user?.id) return;
    setLoading(true);
    setErr(null);
    try {
      const [items, mt, yt, cat] = await Promise.all([
        listExpenses(user.id),
        getMonthlyTotal(user.id),
        getYearlyTotal(user.id),
        getMonthlyByCategory(user.id),
      ]);
      setList(items);
      setMonthTotal(mt);
      setYearTotal(yt);
      setByCategory(cat);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (item) => {
    if (!confirm("删除这条记账？")) return;
    try {
      await deleteExpense(item.id, user.id);
      reload();
    } catch (e) { alert(e.message); }
  };

  const categoryRows = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div style={{ height:"100%", overflowY:"auto", background:C.bg }}>
      {/* header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"52px 16px 12px", background:"white",
                    borderBottom:`1px solid ${C.border}` }}>
        <button onClick={onBack}
          style={{ background:"transparent", border:"none", cursor:"pointer",
                   fontSize:22, color:C.text, padding:"2px 6px" }}>‹</button>
        <div style={{ fontSize:17, fontWeight:800, color:C.text }}>💰 宠物记账</div>
        <button onClick={() => setAddOpen(true)}
          style={{ width:36, height:36, borderRadius:"50%", background:C.pri,
                   color:"white", border:"none", cursor:"pointer",
                   fontSize:20, fontWeight:700,
                   display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
      </div>

      {/* 总额卡片 */}
      <div style={{ padding:"14px 14px 0" }}>
        <div style={{ display:"flex", gap:10 }}>
          <div style={{ flex:1, background:C.tint, borderRadius:18, padding:"14px 16px",
                        border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, color:C.sub }}>本月花费</div>
            <div style={{ fontSize:24, fontWeight:800, color:C.pri, marginTop:4 }}>
              {fmtMoney(monthTotal)}
            </div>
          </div>
          <div style={{ flex:1, background:"white", borderRadius:18, padding:"14px 16px",
                        border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, color:C.sub }}>本年累计</div>
            <div style={{ fontSize:24, fontWeight:800, color:C.text, marginTop:4 }}>
              {fmtMoney(yearTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* 分类统计 */}
      {categoryRows.length > 0 && (
        <div style={{ padding:"14px 14px 0" }}>
          <div style={{ background:"white", borderRadius:18, padding:"14px 16px",
                        border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:10 }}>
              本月按分类
            </div>
            {categoryRows.map(([cat, amt]) => {
              const pct = monthTotal > 0 ? (amt / monthTotal) * 100 : 0;
              return (
                <div key={cat} style={{ marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                                fontSize:12, color:C.text, marginBottom:3 }}>
                    <span>{cat}</span>
                    <span style={{ color:C.sub }}>{fmtMoney(amt)}</span>
                  </div>
                  <div style={{ height:6, borderRadius:4, background:C.tint, overflow:"hidden" }}>
                    <div style={{ width:`${pct}%`, height:"100%", background:C.pri,
                                  transition:"width .2s" }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 记账列表 */}
      <div style={{ padding:"14px 14px 90px" }}>
        <div style={{ fontSize:12, color:C.sub, marginBottom:8, paddingLeft:4 }}>
          所有记录
        </div>
        {loading && <div style={{ textAlign:"center", color:C.sub, padding:20 }}>加载中...</div>}
        {err && <div style={{ color:"#D94040", fontSize:12, padding:10 }}>❌ {err}</div>}
        {!loading && !err && list.length === 0 && (
          <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:"40px 0" }}>
            还没有记账，点右上角 + 开始记录
          </div>
        )}
        {list.map((it) => (
          <div key={it.id}
            style={{ background:"white", borderRadius:14, padding:"12px 14px",
                     marginBottom:8, border:`1px solid ${C.border}`,
                     display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{it.category}</span>
                {it.pet?.name && (
                  <span style={{ fontSize:10, padding:"2px 8px", borderRadius:10,
                                 background:C.tint, color:C.sub }}>
                    {it.pet.name}
                  </span>
                )}
              </div>
              {it.note && (
                <div style={{ fontSize:12, color:C.sub, marginTop:3,
                              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {it.note}
                </div>
              )}
              <div style={{ fontSize:11, color:C.sub, marginTop:3 }}>
                {fmtDate(it.expense_date)}
              </div>
            </div>
            <div style={{ fontSize:16, fontWeight:800, color:C.pri }}>
              {fmtMoney(it.amount)}
            </div>
            <button onClick={() => handleDelete(it)}
              style={{ background:"transparent", border:"none", cursor:"pointer",
                       color:C.sub, fontSize:14, padding:"2px 4px" }}>🗑</button>
          </div>
        ))}
      </div>

      {addOpen && (
        <AddExpenseModal
          user={user}
          pets={pets}
          onClose={() => setAddOpen(false)}
          onAdded={() => { setAddOpen(false); reload(); }}
        />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────── */
function AddExpenseModal({ user, pets, onClose, onAdded }) {
  const [amount,   setAmount]   = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[6]); // 默认狗粮/猫粮
  const [date,     setDate]     = useState(new Date().toISOString().slice(0, 10));
  const [petId,    setPetId]    = useState(pets?.[0]?.id || "");
  const [note,     setNote]     = useState("");
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState(null);

  const handleSave = async () => {
    setErr(null);
    setSaving(true);
    try {
      await addExpense({
        userId:      user.id,
        petId:       petId || null,
        amount,
        category,
        note,
        expenseDate: date,
      });
      onAdded();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000,
               display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, background:C.bg,
                    borderRadius:"22px 22px 0 0", padding:"18px 18px 28px",
                    maxHeight:"80vh", overflowY:"auto" }}>
        <div style={{ width:40, height:4, borderRadius:4, background:C.light,
                      margin:"0 auto 16px" }}/>
        <div style={{ fontSize:17, fontWeight:800, color:C.text, marginBottom:16 }}>
          ➕ 新增记账
        </div>

        <Label>金额</Label>
        <input
          type="number" inputMode="decimal" min="0" step="0.01"
          value={amount} onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          style={inputStyle()} />

        <Label>分类</Label>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
          {EXPENSE_CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              style={{ padding:"6px 12px", borderRadius:14, fontSize:12,
                       background: category === c ? C.pri : "white",
                       color:      category === c ? "white" : C.text,
                       border:`1px solid ${category === c ? C.pri : C.border}`,
                       cursor:"pointer" }}>
              {c}
            </button>
          ))}
        </div>

        <Label>日期</Label>
        <input
          type="date" value={date} onChange={(e) => setDate(e.target.value)}
          style={inputStyle()} />

        {pets && pets.length > 1 && (
          <>
            <Label>关联宠物</Label>
            <select value={petId} onChange={(e) => setPetId(e.target.value)}
              style={inputStyle()}>
              <option value="">不指定</option>
              {pets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </>
        )}

        <Label>备注（可选）</Label>
        <input
          value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="比如：某宠物医院体检"
          maxLength={200}
          style={inputStyle()} />

        {err && <div style={{ color:"#D94040", fontSize:12, marginBottom:8 }}>❌ {err}</div>}

        <div style={{ display:"flex", gap:10, marginTop:10 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:"12px 0", borderRadius:14, fontSize:14, fontWeight:600,
                     background:"white", color:C.text, border:`1px solid ${C.border}`,
                     cursor:"pointer" }}>取消</button>
          <button onClick={handleSave} disabled={saving || !amount}
            style={{ flex:1, padding:"12px 0", borderRadius:14, fontSize:14, fontWeight:700,
                     background: amount && !saving ? C.pri : C.light,
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
  border:"1.5px solid #D6D5D8", background:"white", color:"#1A1006",
  outline:"none", boxSizing:"border-box", marginBottom:14, fontFamily:"inherit",
});

function Label({ children }) {
  return (
    <div style={{ fontSize:12, fontWeight:600, color:"#1A1006", marginBottom:6 }}>
      {children}
    </div>
  );
}
