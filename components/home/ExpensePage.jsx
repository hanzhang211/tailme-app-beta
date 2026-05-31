"use client";

/**
 * components/home/ExpensePage.jsx — 宠物记账（Apple Widget 风格重设计）
 * 保留全部逻辑，仅升级 UI
 */

import { useEffect, useRef, useState } from "react";
import {
  listExpenses, addExpense, deleteExpense,
  getMonthlyTotal, getYearlyTotal, getMonthlyByCategory,
  EXPENSE_CATEGORIES,
} from "@/services/petExpenseService";
import { AccountingIcon } from "@/components/icons/HomeModuleIcons";
import {
  PawPrint, Calendar, ChevronLeft, ChevronRight,
  Syringe, ShieldCheck, Stethoscope, BriefcaseMedical,
  HeartPulse, ShowerHead, Milk, Cookie, CircleDot,
  PillBottle, Cable, ShieldPlus, House, GraduationCap, Ellipsis,
} from "lucide-react";

const CATEGORY_ICONS = {
  "疫苗":       Syringe,
  "驱虫药":     ShieldCheck,
  "体检":       Stethoscope,
  "看病/医疗":  BriefcaseMedical,
  "绝育":       HeartPulse,
  "洗澡美容":   ShowerHead,
  "狗粮/猫粮":  Milk,
  "零食":       Cookie,
  "玩具":       CircleDot,
  "用品":       PillBottle,
  "牵引绳/衣服": Cable,
  "保险":       ShieldPlus,
  "寄养/托管":  House,
  "训练课程":   GraduationCap,
  "其他":       Ellipsis,
};

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

/* ── AddExpenseModal — iOS Premium 风格 ── */
function AddExpenseModal({ user, pets, onClose, onAdded }) {
  const [amount,   setAmount]   = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[6]);
  const [date,     setDate]     = useState(new Date().toISOString().slice(0, 10));
  const [petId,    setPetId]    = useState(pets?.[0]?.id || "");
  const [note,     setNote]     = useState("");
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState(null);
  const dateRef = useRef(null);

  const handleSave = async () => {
    setErr(null); setSaving(true);
    try {
      await addExpense({ userId: user.id, petId: petId || null,
                         amount, category, note, expenseDate: date });
      onAdded();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const fmtDisplayDate = (d) => {
    if (!d) return "";
    return d.replace(/-/g, "/");
  };

  const canSave = !!amount && !saving;

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:1000,
               display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, background:"#F6F1EA",
                    borderRadius:"32px 32px 0 0", maxHeight:"92vh", overflowY:"auto",
                    paddingBottom:"env(safe-area-inset-bottom, 20px)" }}>

        {/* 拖拽条 */}
        <div style={{ display:"flex", justifyContent:"center", paddingTop:14, paddingBottom:4 }}>
          <div style={{ width:64, height:6, borderRadius:999, background:"#D8D5D2" }}/>
        </div>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", padding:"10px 20px 16px" }}>
          <button onClick={onClose}
            style={{ width:48, height:48, borderRadius:999, background:"white",
                     border:"none", cursor:"pointer", marginRight:14, flexShrink:0,
                     display:"flex", alignItems:"center", justifyContent:"center",
                     boxShadow:"0 6px 16px rgba(0,0,0,0.05)" }}>
            <ChevronLeft size={22} color="#1A1006" strokeWidth={2.5}/>
          </button>
          <PawPrint size={26} color="#8A7B6A" strokeWidth={1.8} style={{ marginRight:8, flexShrink:0 }}/>
          <span style={{ fontSize:28, fontWeight:800, color:"#1F1F1F" }}>新增记账</span>
        </div>

        <div style={{ padding:"0 20px 24px", display:"flex", flexDirection:"column", gap:24 }}>

          {/* 主卡片 */}
          <div style={{ background:"rgba(255,255,255,0.62)", borderRadius:28,
                        padding:20, boxShadow:"0 8px 24px rgba(0,0,0,0.06)",
                        border:"1px solid rgba(255,255,255,0.65)",
                        display:"flex", flexDirection:"column", gap:24 }}>

            {/* ── 金额 ── */}
            <div>
              <SectionTitle>金额</SectionTitle>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:20, top:"50%", transform:"translateY(-50%)",
                               fontSize:26, fontWeight:700, color:"#1F1F1F", pointerEvents:"none" }}>
                  ¥
                </span>
                <input type="number" inputMode="decimal" min="0" step="0.01"
                  value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  style={{ width:"100%", height:72, borderRadius:20, paddingLeft:46, paddingRight:20,
                           fontSize:30, fontWeight:700, color:"#1F1F1F",
                           background:"rgba(255,255,255,0.72)",
                           border:"1px solid rgba(138,123,106,0.22)",
                           outline:"none", boxSizing:"border-box", fontFamily:"inherit",
                           caretColor:"#E68645" }}
                  onFocus={(e) => e.target.style.border = "1px solid #E68645"}
                  onBlur={(e) => e.target.style.border = "1px solid rgba(138,123,106,0.22)"}
                />
              </div>
            </div>

            {/* ── 分类 ── */}
            <div>
              <SectionTitle>分类</SectionTitle>
              <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                {EXPENSE_CATEGORIES.map((c) => {
                  const Icon = CATEGORY_ICONS[c] || Ellipsis;
                  const on = category === c;
                  return (
                    <button key={c} onClick={() => setCategory(c)}
                      style={{ height:52, borderRadius:18, paddingLeft:14, paddingRight:16,
                               display:"flex", alignItems:"center", gap:7,
                               fontSize:15, fontWeight:600,
                               background: on
                                 ? "linear-gradient(135deg, #E68645, #F09A5B)"
                                 : "rgba(255,255,255,0.62)",
                               color: on ? "white" : "#2B2B2B",
                               border: on ? "none" : "1px solid rgba(138,123,106,0.22)",
                               cursor:"pointer",
                               boxShadow: on ? "0 8px 18px rgba(230,134,69,0.24)" : "none",
                               transition:"all .15s" }}>
                      <Icon size={20} color={on ? "white" : "#8A7B6A"} strokeWidth={1.8}/>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── 日期 ── */}
            <div>
              <SectionTitle>日期</SectionTitle>
              <div style={{ position:"relative" }}>
                <button onClick={() => dateRef.current?.showPicker?.() || dateRef.current?.click()}
                  style={{ width:"100%", height:64, borderRadius:20,
                           background:"rgba(255,255,255,0.72)",
                           border:"1px solid rgba(138,123,106,0.22)",
                           padding:"0 20px", display:"flex", alignItems:"center", gap:12,
                           cursor:"pointer", boxSizing:"border-box" }}>
                  <Calendar size={20} color="#8A7B6A" strokeWidth={1.8} style={{ flexShrink:0 }}/>
                  <span style={{ flex:1, textAlign:"left", fontSize:17, fontWeight:600,
                                 color:"#1F1F1F" }}>
                    {fmtDisplayDate(date)}
                  </span>
                  <ChevronRight size={18} color="#2B2B2B" strokeWidth={2}/>
                </button>
                <input ref={dateRef} type="date" value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{ position:"absolute", inset:0, opacity:0, cursor:"pointer",
                           zIndex:1, width:"100%", height:"100%" }}/>
              </div>
            </div>

            {/* ── 关联宠物 ── */}
            {pets && pets.length > 1 && (
              <div>
                <SectionTitle>关联宠物</SectionTitle>
                <select value={petId} onChange={(e) => setPetId(e.target.value)}
                  style={{ width:"100%", height:52, borderRadius:18,
                           background:"rgba(255,255,255,0.72)",
                           border:"1px solid rgba(138,123,106,0.22)",
                           padding:"0 16px", fontSize:15, fontWeight:600, color:"#2B2B2B",
                           outline:"none", boxSizing:"border-box", fontFamily:"inherit",
                           appearance:"none" }}>
                  <option value="">不指定</option>
                  {pets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}

            {/* ── 备注 ── */}
            <div>
              <SectionTitle>备注（可选）</SectionTitle>
              <div style={{ position:"relative" }}>
                <textarea value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 100))}
                  placeholder="比如：某宠物医院体检"
                  rows={3}
                  style={{ width:"100%", minHeight:92, borderRadius:20,
                           background:"rgba(255,255,255,0.72)",
                           border:"1px solid rgba(138,123,106,0.22)",
                           padding:"18px 20px", fontSize:15, color:"#1F1F1F",
                           outline:"none", boxSizing:"border-box", resize:"none",
                           fontFamily:"inherit", lineHeight:1.6 }}
                  onFocus={(e) => e.target.style.border = "1px solid #E68645"}
                  onBlur={(e) => e.target.style.border = "1px solid rgba(138,123,106,0.22)"}
                />
                <div style={{ position:"absolute", bottom:10, right:14,
                              fontSize:13, color:"#9A9188" }}>
                  {note.length}/100
                </div>
              </div>
            </div>
          </div>

          {/* 错误 */}
          {err && <div style={{ color:"#D94040", fontSize:13, textAlign:"center" }}>❌ {err}</div>}

          {/* 底部按钮 */}
          <div style={{ display:"flex", gap:14 }}>
            <button onClick={onClose}
              style={{ flex:1, height:64, borderRadius:22, fontSize:20, fontWeight:700,
                       background:"rgba(255,255,255,0.75)", color:"#1F1F1F",
                       border:"1px solid rgba(138,123,106,0.16)", cursor:"pointer" }}>
              取消
            </button>
            <button onClick={handleSave} disabled={!canSave}
              style={{ flex:1, height:64, borderRadius:22, fontSize:20, fontWeight:700,
                       background: canSave
                         ? "linear-gradient(135deg, #E68645, #F09A5B)"
                         : "#D6D5D8",
                       color:"white", border:"none",
                       cursor: canSave ? "pointer" : "default",
                       boxShadow: canSave ? "0 10px 20px rgba(230,134,69,0.25)" : "none",
                       transition:"all .15s" }}>
              {saving ? "保存中…" : "保存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Section title with orange dot ── */
function SectionTitle({ children }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
      <div style={{ width:6, height:6, borderRadius:999, background:"#E68645", flexShrink:0 }}/>
      <span style={{ fontSize:17, fontWeight:700, color:"#1F1F1F" }}>{children}</span>
    </div>
  );
}

function Label({ children }) {
  return <div style={{ fontSize:12, fontWeight:600, color:TEXT, marginBottom:6 }}>{children}</div>;
}
