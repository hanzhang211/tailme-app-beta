"use client";

/**
 * components/home/HealthPage.jsx — 宠物健康（Apple Health 风格重设计）
 * 新增：生病记录、用药提醒、健康记录时间线
 * 全部数据存 Supabase，无 localStorage
 */

import { useEffect, useMemo, useState } from "react";
import {
  listHealthRecords, addHealthRecord, deleteHealthRecord,
  updatePetHealth, RECORD_TYPES,
  listDiseaseRecords, addDiseaseRecord, deleteDiseaseRecord,
  listMedicationReminders, addMedicationReminder, deleteMedicationReminder,
} from "@/services/petHealthService";
import { HealthIcon } from "@/components/icons/HomeModuleIcons";
import {
  ChevronLeft, Dog, Pill, Bell, Clock, CircleCheck,
  ClipboardList, HeartPulse, Syringe, ShieldCheck, Stethoscope,
} from "lucide-react";

const BG    = "#ECEEE8";
const PRI   = "#E68645";
const GREEN = "#5FA766";
const TEXT  = "#1A1006";
const SUB   = "#7A8275";

const CARD = {
  background: "rgba(255,255,255,0.62)",
  borderRadius: 24,
  boxShadow: "0 6px 20px rgba(0,0,0,0.05)",
  border: "1px solid rgba(255,255,255,0.65)",
};

/* ── helpers ── */
const fmtDate  = (d) => d ? String(d).slice(0, 10) : "";
const fmtShort = (d) => { if (!d) return ""; const [,m,day] = String(d).split("-"); return `${+m}月${+day}日`; };
const fmtFull  = (d) => d ? String(d).replace(/-/g, "/") : "";
const fmtTime  = (t) => t ? String(t).slice(0, 5) : "";

const isToday  = (d) => d === new Date().toISOString().slice(0, 10);

const DISEASE_STATUS = {
  treating:  { label:"治疗中", bg:"rgba(230,134,69,0.12)", color:PRI },
  recovered: { label:"已康复", bg:"rgba(95,167,102,0.12)", color:GREEN },
};

const typeMeta = (k) => RECORD_TYPES.find((t) => t.key === k) || RECORD_TYPES[3];
const typeIcon = (k) => {
  if (k === "vaccine") return <Syringe size={16} color={GREEN} strokeWidth={1.8}/>;
  if (k === "deworm")  return <ShieldCheck size={16} color={GREEN} strokeWidth={1.8}/>;
  if (k === "checkup") return <Stethoscope size={16} color={GREEN} strokeWidth={1.8}/>;
  return <ClipboardList size={16} color={GREEN} strokeWidth={1.8}/>;
};

/* ══════════════════════════════════════════════ */
export default function HealthPage({ user, pet, onPetUpdate, onBack }) {
  const [records,    setRecords]    = useState([]);
  const [diseases,   setDiseases]   = useState([]);
  const [meds,       setMeds]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [err,        setErr]        = useState(null);

  const [neutered,   setNeutered]   = useState(!!pet?.neutered);
  const [vaccinated, setVaccinated] = useState(!!pet?.vaccinated);
  const [savingFlag, setSavingFlag] = useState(false);

  // modals
  const [addRecordOpen,  setAddRecordOpen]  = useState(false);
  const [addDiseaseOpen, setAddDiseaseOpen] = useState(false);
  const [addMedOpen,     setAddMedOpen]     = useState(false);
  const [viewDisease,    setViewDisease]    = useState(null);
  const [viewMed,        setViewMed]        = useState(null);

  const reload = async () => {
    if (!pet?.id) { setLoading(false); return; }
    setLoading(true); setErr(null);
    try {
      const [rs, dis, ms] = await Promise.all([
        listHealthRecords(pet.id).catch(() => []),
        listDiseaseRecords(pet.id).catch(() => []),
        listMedicationReminders(pet.id).catch(() => []),
      ]);
      setRecords(rs); setDiseases(dis); setMeds(ms);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { reload(); }, [pet?.id]); // eslint-disable-line
  useEffect(() => {
    setNeutered(!!pet?.neutered);
    setVaccinated(!!pet?.vaccinated);
  }, [pet?.neutered, pet?.vaccinated]);

  const toggleFlag = async (key, next) => {
    if (!pet?.id || !user?.id) return;
    if (key === "neutered")   setNeutered(next);
    if (key === "vaccinated") setVaccinated(next);
    setSavingFlag(true);
    try {
      await updatePetHealth(pet.id, user.id, { [key]: next });
      onPetUpdate?.({ ...pet, [key]: next });
    } catch (e) {
      if (key === "neutered")   setNeutered(!next);
      if (key === "vaccinated") setVaccinated(!next);
      alert(e.message);
    } finally { setSavingFlag(false); }
  };

  const handleDeleteRecord  = async (r) => { if (!confirm("删除？")) return; try { await deleteHealthRecord(r.id, user.id); reload(); } catch (e) { alert(e.message); } };
  const handleDeleteDisease = async (d) => { if (!confirm("删除？")) return; try { await deleteDiseaseRecord(d.id, user.id); reload(); } catch (e) { alert(e.message); } };
  const handleDeleteMed     = async (m) => { if (!confirm("删除？")) return; try { await deleteMedicationReminder(m.id, user.id); reload(); } catch (e) { alert(e.message); } };

  // 合并时间线
  const timeline = useMemo(() => {
    const items = [
      ...records.map(r => ({ id:r.id, date:r.record_date, kind:"record",
        label: typeMeta(r.record_type).label + (r.title ? `・${r.title}` : ""),
        iconEl: typeIcon(r.record_type) })),
      ...diseases.map(d => ({ id:d.id, date:d.diagnosis_date, kind:"disease",
        label: `${d.disease_name} 开始治疗`,
        iconEl: <Dog size={16} color={GREEN} strokeWidth={1.8}/> })),
      ...meds.map(m => ({ id:m.id, date:m.start_date, kind:"medication",
        label: `开始服用 ${m.medicine_name}`,
        iconEl: <Pill size={16} color={GREEN} strokeWidth={1.8}/> })),
    ];
    return items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [records, diseases, meds]);

  return (
    <div style={{ height:"100%", overflowY:"auto", background:BG }}>

      {/* ── Header ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"52px 16px 14px" }}>
        <button onClick={onBack}
          style={{ width:40, height:40, borderRadius:999,
                   background:"rgba(255,255,255,0.6)", border:"none", cursor:"pointer",
                   display:"flex", alignItems:"center", justifyContent:"center",
                   boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
          <ChevronLeft size={22} color={TEXT} strokeWidth={2.5}/>
        </button>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <HealthIcon size={32} color={TEXT}/>
          <span style={{ fontSize:17, fontWeight:800, color:TEXT }}>宠物健康</span>
        </div>
        <button onClick={() => setAddRecordOpen(true)} disabled={!pet?.id}
          style={{ width:40, height:40, borderRadius:999,
                   background: pet?.id ? PRI : "#D6D5D8", color:"white",
                   border:"none", cursor: pet?.id ? "pointer" : "default", fontSize:22,
                   display:"flex", alignItems:"center", justifyContent:"center",
                   boxShadow: pet?.id ? "0 4px 12px rgba(230,134,69,0.35)" : "none" }}>+</button>
      </div>

      {!pet?.id ? (
        <div style={{ ...CARD, margin:"0 16px", padding:"32px 20px",
                      textAlign:"center", color:"#9A9188", fontSize:13 }}>
          请先创建宠物档案
        </div>
      ) : (
        <div style={{ padding:"0 16px 90px", display:"flex", flexDirection:"column", gap:14 }}>

          {/* ── 1. 当前状态 Hero ── */}
          <div style={{ ...CARD, padding:"22px 20px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", bottom:-15, right:-15, opacity:0.08,
                          transform:"scale(0.78)", transformOrigin:"bottom right", pointerEvents:"none" }}>
              <svg width="100" height="100" viewBox="0 0 100 100" fill="none"
                   stroke="#1A1006" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M50 10 L80 22 L80 55 Q80 80 50 90 Q20 80 20 55 L20 22 Z"/>
                <path d="M38 50 L45 50 L45 38 L55 38 L55 50 L62 50 L62 60 L55 60 L55 72 L45 72 L45 60 L38 60 Z"/>
              </svg>
            </div>
            <div style={{ fontSize:12, color:SUB, marginBottom:4 }}>当前状态</div>
            <div style={{ fontSize:40, fontWeight:800, color:TEXT, lineHeight:1.1, marginBottom:12 }}>
              {neutered ? "已绝育" : "未绝育"}
            </div>
            {vaccinated ? (
              <div style={{ display:"inline-flex", alignItems:"center", gap:6,
                            background:"rgba(95,167,102,0.12)", borderRadius:999, padding:"5px 12px" }}>
                <span style={{ fontSize:11, color:GREEN, fontWeight:600 }}>疫苗齐全</span>
                <CircleCheck size={14} color={GREEN} strokeWidth={2}/>
              </div>
            ) : (
              <div style={{ display:"inline-flex", alignItems:"center", gap:6,
                            background:"rgba(230,134,69,0.12)", borderRadius:999, padding:"5px 12px" }}>
                <span style={{ fontSize:11, color:PRI, fontWeight:600 }}>疫苗待补</span>
              </div>
            )}
          </div>

          {/* ── 2. 基础健康状态 ── */}
          <div style={{ ...CARD, padding:"18px 20px" }}>
            <HTitle>基础健康状态</HTitle>
            <HealthRow label="绝育状态" done={neutered} disabled={savingFlag}
              onToggle={(v) => toggleFlag("neutered", v)}
              icon={<CircleCheck size={18} color={neutered ? GREEN : "#C5B9B0"} strokeWidth={2}/>}/>
            <div style={{ height:1, background:"rgba(0,0,0,0.06)", margin:"2px 0" }}/>
            <HealthRow label="疫苗状态" done={vaccinated} disabled={savingFlag}
              onToggle={(v) => toggleFlag("vaccinated", v)}
              icon={<Syringe size={18} color={vaccinated ? GREEN : "#C5B9B0"} strokeWidth={1.8}/>}/>
          </div>

          {/* ── 3. 生病记录 ── */}
          <div style={{ ...CARD, padding:"18px 20px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <HTitle noMargin>生病记录</HTitle>
              <button onClick={() => setAddDiseaseOpen(true)}
                style={{ fontSize:12, fontWeight:700, color:GREEN, background:"transparent",
                         border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                ＋ 添加记录
              </button>
            </div>
            {diseases.length === 0 ? (
              <EmptyCard text="还没有疾病记录" sub="点击右侧 + 添加记录"/>
            ) : (
              diseases.map((d) => {
                const st = DISEASE_STATUS[d.status] || DISEASE_STATUS.treating;
                return (
                  <button key={d.id} onClick={() => setViewDisease(d)}
                    style={{ width:"100%", background:"rgba(236,238,232,0.55)",
                             borderRadius:18, padding:"14px 14px 14px 16px", marginBottom:8,
                             border:"none", cursor:"pointer", textAlign:"left",
                             display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:44, height:44, borderRadius:14,
                                  background:"rgba(95,167,102,0.1)",
                                  display:"flex", alignItems:"center", justifyContent:"center",
                                  flexShrink:0 }}>
                      <Dog size={24} color={GREEN} strokeWidth={1.6}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:15, fontWeight:700, color:TEXT }}>{d.disease_name}</div>
                      {d.symptoms && (
                        <div style={{ fontSize:12, color:SUB, marginTop:2,
                                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {d.symptoms}
                        </div>
                      )}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:999,
                                     background:st.bg, color:st.color }}>
                        {st.label}
                      </span>
                      <span style={{ color:SUB, fontSize:14 }}>›</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* ── 4. 用药提醒 ── */}
          <div style={{ ...CARD, padding:"18px 20px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <HTitle noMargin>用药提醒</HTitle>
              <button onClick={() => setAddMedOpen(true)}
                style={{ fontSize:12, fontWeight:700, color:GREEN, background:"transparent",
                         border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                ＋ 添加用药
              </button>
            </div>
            {meds.length === 0 ? (
              <EmptyCard text="还没有用药记录" sub="点击右侧 + 添加用药"/>
            ) : (
              meds.map((m) => {
                const nextTime = m.next_reminder_time ? fmtTime(m.next_reminder_time) : "";
                const todayReminder = isToday(m.end_date) || (!m.end_date && isToday(m.start_date));
                return (
                  <button key={m.id} onClick={() => setViewMed(m)}
                    style={{ width:"100%", background:"rgba(236,238,232,0.55)",
                             borderRadius:18, padding:"14px 16px", marginBottom:8,
                             border:"none", cursor:"pointer", textAlign:"left",
                             display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:44, height:44, borderRadius:14,
                                  background:"rgba(95,167,102,0.1)",
                                  display:"flex", alignItems:"center", justifyContent:"center",
                                  flexShrink:0 }}>
                      <Pill size={22} color={GREEN} strokeWidth={1.6}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:15, fontWeight:700, color:TEXT }}>{m.medicine_name}</div>
                      <div style={{ fontSize:12, color:SUB, marginTop:2 }}>
                        {[m.dosage, m.frequency].filter(Boolean).join("，")}
                      </div>
                      {(m.start_date || m.end_date) && (
                        <div style={{ fontSize:11, color:SUB, marginTop:2 }}>
                          {fmtShort(m.start_date)}{m.end_date ? ` – ${fmtShort(m.end_date)}` : ""}
                        </div>
                      )}
                    </div>
                    {nextTime && (
                      <div style={{ flexShrink:0, textAlign:"right" }}>
                        <div style={{ fontSize:10, color:SUB, marginBottom:3 }}>下次时间</div>
                        <div style={{ fontSize:13, fontWeight:800, color:GREEN }}>
                          {todayReminder ? `今天 ${nextTime}` : nextTime}
                        </div>
                        <div style={{ display:"inline-flex", alignItems:"center", gap:4, marginTop:4,
                                      background:"rgba(95,167,102,0.12)", borderRadius:999,
                                      padding:"2px 8px" }}>
                          <Bell size={10} color={GREEN}/>
                          <span style={{ fontSize:10, color:GREEN, fontWeight:600 }}>已设置提醒</span>
                        </div>
                      </div>
                    )}
                    <span style={{ color:SUB, fontSize:14, flexShrink:0 }}>›</span>
                  </button>
                );
              })
            )}
          </div>

          {/* ── 5. 健康记录时间线 ── */}
          <div style={{ ...CARD, padding:"18px 20px" }}>
            <HTitle>健康记录</HTitle>
            {loading && <div style={{ textAlign:"center", color:SUB, padding:16, fontSize:13 }}>加载中…</div>}
            {err && <div style={{ color:"#D94040", fontSize:12 }}>❌ {err}</div>}
            {!loading && timeline.length === 0 && (
              <EmptyCard
                icon={<ClipboardList size={32} color="rgba(95,167,102,0.4)" strokeWidth={1.5}/>}
                text="还没有记录"
                sub="点击右上角 + 添加疫苗/驱虫/体检/疾病/用药"/>
            )}
            {timeline.map((item, i) => (
              <div key={item.id + item.kind} style={{ display:"flex", gap:14, paddingBottom:14,
                                                      position:"relative" }}>
                {/* 竖线 */}
                {i < timeline.length - 1 && (
                  <div style={{ position:"absolute", left:13, top:28, bottom:0, width:2,
                                background:"rgba(95,167,102,0.2)", zIndex:0 }}/>
                )}
                {/* 节点 */}
                <div style={{ width:28, height:28, borderRadius:999,
                              background:"rgba(95,167,102,0.12)", flexShrink:0,
                              display:"flex", alignItems:"center", justifyContent:"center",
                              zIndex:1 }}>
                  {item.iconEl}
                </div>
                <div style={{ flex:1, paddingTop:4 }}>
                  <div style={{ fontSize:10, color:SUB, marginBottom:3 }}>{fmtFull(item.date)}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:TEXT }}>{item.label}</div>
                </div>
              </div>
            ))}
            {/* 原有健康记录的删除入口 */}
            {records.length > 0 && (
              <div style={{ borderTop:"1px solid rgba(0,0,0,0.06)", paddingTop:12, marginTop:4 }}>
                <div style={{ fontSize:11, color:SUB, marginBottom:8, fontWeight:600 }}>管理健康记录</div>
                {records.map((r) => {
                  const meta = typeMeta(r.record_type);
                  return (
                    <div key={r.id}
                      style={{ display:"flex", alignItems:"center", gap:8,
                               padding:"8px 0", borderBottom:"1px solid rgba(0,0,0,0.04)" }}>
                      <span style={{ fontSize:16, flexShrink:0 }}>{meta.emoji}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <span style={{ fontSize:12, fontWeight:600, color:TEXT }}>{meta.label}</span>
                        {r.title && <span style={{ fontSize:11, color:SUB }}> · {r.title}</span>}
                        <div style={{ fontSize:10, color:SUB }}>{fmtDate(r.record_date)}</div>
                      </div>
                      <button onClick={() => handleDeleteRecord(r)}
                        style={{ background:"transparent", border:"none", cursor:"pointer",
                                 color:"#C5B9B0", fontSize:14, padding:"2px 4px" }}>🗑</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {addRecordOpen && pet?.id && (
        <AddRecordModal user={user} pet={pet}
          onClose={() => setAddRecordOpen(false)}
          onAdded={() => { setAddRecordOpen(false); reload(); }}/>
      )}
      {addDiseaseOpen && pet?.id && (
        <AddDiseaseModal user={user} pet={pet}
          onClose={() => setAddDiseaseOpen(false)}
          onAdded={() => { setAddDiseaseOpen(false); reload(); }}/>
      )}
      {addMedOpen && pet?.id && (
        <AddMedicationModal user={user} pet={pet}
          onClose={() => setAddMedOpen(false)}
          onAdded={() => { setAddMedOpen(false); reload(); }}/>
      )}
      {viewDisease && (
        <DiseaseDetailSheet disease={viewDisease}
          onClose={() => setViewDisease(null)}
          onDelete={() => { handleDeleteDisease(viewDisease); setViewDisease(null); }}/>
      )}
      {viewMed && (
        <MedicationDetailSheet med={viewMed}
          onClose={() => setViewMed(null)}
          onDelete={() => { handleDeleteMed(viewMed); setViewMed(null); }}/>
      )}
    </div>
  );
}

/* ── Shared UI helpers ── */
function HTitle({ children, noMargin }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom: noMargin ? 0 : 14 }}>
      <div style={{ width:7, height:7, borderRadius:999, background:GREEN, flexShrink:0 }}/>
      <span style={{ fontSize:16, fontWeight:800, color:TEXT }}>{children}</span>
    </div>
  );
}

function EmptyCard({ icon, text, sub }) {
  return (
    <div style={{ textAlign:"center", padding:"24px 0 8px",
                  display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
      {icon}
      <div style={{ fontSize:13, color:"#9A9188", fontWeight:600 }}>{text}</div>
      {sub && <div style={{ fontSize:11, color:"#B5AFA9" }}>{sub}</div>}
    </div>
  );
}

function HealthRow({ label, done, onToggle, disabled, icon }) {
  return (
    <div style={{ display:"flex", alignItems:"center", padding:"10px 0" }}>
      <div style={{ width:32, height:32, borderRadius:10,
                    background: done ? "rgba(95,167,102,0.12)" : "rgba(0,0,0,0.04)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    marginRight:12, flexShrink:0 }}>
        {icon}
      </div>
      <span style={{ flex:1, fontSize:13, color:TEXT, fontWeight:600 }}>{label}</span>
      <button onClick={() => !disabled && onToggle(!done)} disabled={disabled}
        style={{ fontSize:12, fontWeight:700, padding:"5px 14px", borderRadius:999,
                 background: done ? "rgba(95,167,102,0.12)" : "rgba(0,0,0,0.06)",
                 color: done ? GREEN : SUB, border:"none",
                 cursor: disabled ? "default" : "pointer" }}>
        {done ? "已完成" : "未完成"}
      </button>
    </div>
  );
}

/* ── Bottom sheet helper ── */
function Sheet({ onClose, children }) {
  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:1000,
               display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, background:"#ECEEE8",
                    borderRadius:"28px 28px 0 0", maxHeight:"88vh", overflowY:"auto",
                    paddingBottom:"env(safe-area-inset-bottom, 20px)" }}>
        <div style={{ display:"flex", justifyContent:"center", paddingTop:14, paddingBottom:4 }}>
          <div style={{ width:48, height:5, borderRadius:999, background:"#D0CFC9" }}/>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── AddRecordModal (existing logic preserved) ── */
function AddRecordModal({ user, pet, onClose, onAdded }) {
  const [recordType,  setRecordType]  = useState("vaccine");
  const [title,       setTitle]       = useState("");
  const [recordDate,  setRecordDate]  = useState(new Date().toISOString().slice(0, 10));
  const [nextDueDate, setNextDueDate] = useState("");
  const [note,        setNote]        = useState("");
  const [saving,      setSaving]      = useState(false);
  const [err,         setErr]         = useState(null);

  const handleSave = async () => {
    setErr(null); setSaving(true);
    try {
      await addHealthRecord({ userId:user.id, petId:pet.id, recordType, title, recordDate,
                              nextDueDate:nextDueDate||null, note });
      onAdded();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Sheet onClose={onClose}>
      <div style={{ padding:"12px 20px 24px" }}>
        <div style={{ fontSize:20, fontWeight:800, color:TEXT, marginBottom:16 }}>新增健康记录</div>
        <SLabel>类型</SLabel>
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          {RECORD_TYPES.map((t) => (
            <button key={t.key} onClick={() => setRecordType(t.key)}
              style={{ flex:1, padding:"10px 0", borderRadius:14, fontSize:12,
                       background: recordType===t.key ? GREEN : "white",
                       color: recordType===t.key ? "white" : TEXT,
                       border:`1px solid ${recordType===t.key ? GREEN : "#D6D5D8"}`,
                       cursor:"pointer",
                       display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <span style={{ fontSize:18 }}>{t.emoji}</span>{t.label}
            </button>
          ))}
        </div>
        <SLabel>标题（可选）</SLabel>
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="比如：狂犬疫苗" maxLength={100} style={iStyle()}/>
        <SLabel>记录日期</SLabel>
        <input type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} style={iStyle()}/>
        <SLabel>下次提醒（可选）</SLabel>
        <input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} style={iStyle()}/>
        <SLabel>备注（可选）</SLabel>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
          placeholder="医院、剂量等" style={{ ...iStyle(), resize:"none" }}/>
        {err && <div style={{ color:"#D94040", fontSize:12, marginBottom:8 }}>❌ {err}</div>}
        <BtnRow onCancel={onClose} onSave={handleSave} saving={saving}/>
      </div>
    </Sheet>
  );
}

/* ── AddDiseaseModal ── */
function AddDiseaseModal({ user, pet, onClose, onAdded }) {
  const [name,    setName]    = useState("");
  const [syms,    setSyms]    = useState("");
  const [status,  setStatus]  = useState("treating");
  const [diag,    setDiag]    = useState(new Date().toISOString().slice(0, 10));
  const [recov,   setRecov]   = useState("");
  const [note,    setNote]    = useState("");
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState(null);

  const handleSave = async () => {
    if (!name.trim()) { setErr("请填写疾病名称"); return; }
    setErr(null); setSaving(true);
    try {
      await addDiseaseRecord({ userId:user.id, petId:pet.id, diseaseName:name,
                               symptoms:syms, status, diagnosisDate:diag,
                               recoveryDate:recov||null, notes:note });
      onAdded();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Sheet onClose={onClose}>
      <div style={{ padding:"12px 20px 24px" }}>
        <div style={{ fontSize:20, fontWeight:800, color:TEXT, marginBottom:16 }}>新增疾病记录</div>
        <SLabel>疾病名称 *</SLabel>
        <input value={name} onChange={(e) => setName(e.target.value)}
          placeholder="例：肠胃炎" maxLength={50} style={iStyle()}/>
        <SLabel>症状描述</SLabel>
        <textarea value={syms} onChange={(e) => setSyms(e.target.value)} rows={2}
          placeholder="轻微呕吐，食欲下降..." style={{ ...iStyle(), resize:"none" }}/>
        <SLabel>状态</SLabel>
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          {[{k:"treating",label:"治疗中"},{k:"recovered",label:"已康复"}].map(({k,label}) => (
            <button key={k} onClick={() => setStatus(k)}
              style={{ flex:1, height:44, borderRadius:14, fontSize:14, fontWeight:600,
                       background: status===k ? GREEN : "white",
                       color: status===k ? "white" : TEXT,
                       border:`1px solid ${status===k ? GREEN : "#D6D5D8"}`,
                       cursor:"pointer" }}>
              {label}
            </button>
          ))}
        </div>
        <SLabel>诊断日期</SLabel>
        <input type="date" value={diag} onChange={(e) => setDiag(e.target.value)} style={iStyle()}/>
        <SLabel>康复日期（可选）</SLabel>
        <input type="date" value={recov} onChange={(e) => setRecov(e.target.value)} style={iStyle()}/>
        <SLabel>备注</SLabel>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
          placeholder="治疗方案、用药等" style={{ ...iStyle(), resize:"none" }}/>
        {err && <div style={{ color:"#D94040", fontSize:12, marginBottom:8 }}>❌ {err}</div>}
        <BtnRow onCancel={onClose} onSave={handleSave} saving={saving} green/>
      </div>
    </Sheet>
  );
}

/* ── AddMedicationModal ── */
function AddMedicationModal({ user, pet, onClose, onAdded }) {
  const [name,  setName]  = useState("");
  const [dose,  setDose]  = useState("");
  const [freq,  setFreq]  = useState("");
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [end,   setEnd]   = useState("");
  const [time,  setTime]  = useState("");
  const [note,  setNote]  = useState("");
  const [saving,setSaving] = useState(false);
  const [err,   setErr]   = useState(null);

  const handleSave = async () => {
    if (!name.trim()) { setErr("请填写药物名称"); return; }
    setErr(null); setSaving(true);
    try {
      await addMedicationReminder({ userId:user.id, petId:pet.id, medicineName:name,
                                    dosage:dose, frequency:freq, startDate:start,
                                    endDate:end||null, nextReminderTime:time||null, notes:note });
      onAdded();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Sheet onClose={onClose}>
      <div style={{ padding:"12px 20px 24px" }}>
        <div style={{ fontSize:20, fontWeight:800, color:TEXT, marginBottom:16 }}>新增用药提醒</div>
        <SLabel>药物名称 *</SLabel>
        <input value={name} onChange={(e) => setName(e.target.value)}
          placeholder="例：蒙脱石散" maxLength={50} style={iStyle()}/>
        <div style={{ display:"flex", gap:10 }}>
          <div style={{ flex:1 }}>
            <SLabel>剂量</SLabel>
            <input value={dose} onChange={(e) => setDose(e.target.value)}
              placeholder="每次1包" style={iStyle()}/>
          </div>
          <div style={{ flex:1 }}>
            <SLabel>频率</SLabel>
            <input value={freq} onChange={(e) => setFreq(e.target.value)}
              placeholder="每日2次" style={iStyle()}/>
          </div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <div style={{ flex:1 }}>
            <SLabel>开始日期</SLabel>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} style={iStyle()}/>
          </div>
          <div style={{ flex:1 }}>
            <SLabel>结束日期</SLabel>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} style={iStyle()}/>
          </div>
        </div>
        <SLabel>提醒时间（可选）</SLabel>
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={iStyle()}/>
        <SLabel>备注</SLabel>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
          placeholder="注意事项等" style={{ ...iStyle(), resize:"none" }}/>
        {err && <div style={{ color:"#D94040", fontSize:12, marginBottom:8 }}>❌ {err}</div>}
        <BtnRow onCancel={onClose} onSave={handleSave} saving={saving} green/>
      </div>
    </Sheet>
  );
}

/* ── DiseaseDetailSheet ── */
function DiseaseDetailSheet({ disease: d, onClose, onDelete }) {
  const st = DISEASE_STATUS[d.status] || DISEASE_STATUS.treating;
  return (
    <Sheet onClose={onClose}>
      <div style={{ padding:"12px 20px 28px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:800, color:TEXT }}>{d.disease_name}</div>
            <span style={{ fontSize:12, fontWeight:700, padding:"3px 10px", borderRadius:999,
                           background:st.bg, color:st.color }}>
              {st.label}
            </span>
          </div>
          <button onClick={onDelete}
            style={{ background:"transparent", border:"none", cursor:"pointer",
                     color:"#C5B9B0", fontSize:18, padding:4 }}>🗑</button>
        </div>
        {d.symptoms && <DetailRow label="症状" value={d.symptoms}/>}
        <DetailRow label="诊断日期" value={fmtFull(d.diagnosis_date)}/>
        {d.recovery_date && <DetailRow label="康复日期" value={fmtFull(d.recovery_date)}/>}
        {d.notes && <DetailRow label="备注" value={d.notes}/>}
        <button onClick={onClose}
          style={{ width:"100%", marginTop:16, height:52, borderRadius:16,
                   background:`linear-gradient(135deg, ${GREEN}, #7BC985)`,
                   color:"white", border:"none", cursor:"pointer",
                   fontSize:16, fontWeight:700,
                   boxShadow:"0 8px 18px rgba(95,167,102,0.25)" }}>
          关闭
        </button>
      </div>
    </Sheet>
  );
}

/* ── MedicationDetailSheet ── */
function MedicationDetailSheet({ med: m, onClose, onDelete }) {
  return (
    <Sheet onClose={onClose}>
      <div style={{ padding:"12px 20px 28px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
          <div style={{ fontSize:22, fontWeight:800, color:TEXT }}>{m.medicine_name}</div>
          <button onClick={onDelete}
            style={{ background:"transparent", border:"none", cursor:"pointer",
                     color:"#C5B9B0", fontSize:18, padding:4 }}>🗑</button>
        </div>
        {m.dosage    && <DetailRow label="剂量"   value={m.dosage}/>}
        {m.frequency && <DetailRow label="频率"   value={m.frequency}/>}
        <DetailRow label="开始日期" value={fmtFull(m.start_date)}/>
        {m.end_date  && <DetailRow label="结束日期" value={fmtFull(m.end_date)}/>}
        {m.next_reminder_time && <DetailRow label="提醒时间" value={fmtTime(m.next_reminder_time)}/>}
        {m.notes     && <DetailRow label="备注"   value={m.notes}/>}
        <button onClick={onClose}
          style={{ width:"100%", marginTop:16, height:52, borderRadius:16,
                   background:`linear-gradient(135deg, ${GREEN}, #7BC985)`,
                   color:"white", border:"none", cursor:"pointer",
                   fontSize:16, fontWeight:700,
                   boxShadow:"0 8px 18px rgba(95,167,102,0.25)" }}>
          关闭
        </button>
      </div>
    </Sheet>
  );
}

/* ── tiny helpers ── */
function DetailRow({ label, value }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:11, color:SUB, marginBottom:3, fontWeight:600 }}>{label}</div>
      <div style={{ fontSize:14, color:TEXT, lineHeight:1.6 }}>{value}</div>
    </div>
  );
}

function BtnRow({ onCancel, onSave, saving, green }) {
  const activeColor = green
    ? `linear-gradient(135deg, ${GREEN}, #7BC985)`
    : `linear-gradient(135deg, ${PRI}, #F09A5B)`;
  return (
    <div style={{ display:"flex", gap:10, marginTop:6 }}>
      <button onClick={onCancel}
        style={{ flex:1, height:52, borderRadius:16, fontSize:15, fontWeight:700,
                 background:"white", color:TEXT, border:"1px solid #D6D5D8", cursor:"pointer" }}>
        取消
      </button>
      <button onClick={onSave} disabled={saving}
        style={{ flex:1, height:52, borderRadius:16, fontSize:15, fontWeight:700,
                 background: saving ? "#D6D5D8" : activeColor,
                 color:"white", border:"none", cursor: saving ? "default" : "pointer" }}>
        {saving ? "保存中…" : "保存"}
      </button>
    </div>
  );
}

function SLabel({ children }) {
  return <div style={{ fontSize:12, fontWeight:600, color:TEXT, marginBottom:6 }}>{children}</div>;
}

const iStyle = () => ({
  width:"100%", borderRadius:12, padding:"10px 12px", fontSize:14,
  border:"1.5px solid #D6D5D8", background:"white", color:TEXT,
  outline:"none", boxSizing:"border-box", marginBottom:14, fontFamily:"inherit",
});
