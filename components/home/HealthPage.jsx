"use client";

/**
 * components/home/HealthPage.jsx — 宠物健康（Apple Widget 风格重设计）
 * 保留全部逻辑，仅升级 UI
 */

import { useEffect, useState } from "react";
import {
  listHealthRecords, addHealthRecord, deleteHealthRecord,
  updatePetHealth, RECORD_TYPES,
} from "@/services/petHealthService";
import { HealthIcon } from "@/components/icons/HomeModuleIcons";

const BG   = "#ECEEE8";
const PRI  = "#E68645";
const TEXT = "#1A1006";
const SUB  = "#7A8275";
const GREEN = "#5FA766";

const card = {
  background: "rgba(255,255,255,0.55)",
  borderRadius: 28,
  boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
  border: "1px solid rgba(255,255,255,0.55)",
};

const fmtDate = (d) => {
  if (!d) return "";
  const [y, m, day] = String(d).split("-");
  return `${y}-${m}-${day}`;
};
const typeMeta = (k) => RECORD_TYPES.find((t) => t.key === k) || RECORD_TYPES[3];

export default function HealthPage({ user, pet, onPetUpdate, onBack }) {
  const [records,    setRecords]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [err,        setErr]        = useState(null);
  const [addOpen,    setAddOpen]    = useState(false);
  const [neutered,   setNeutered]   = useState(!!pet?.neutered);
  const [vaccinated, setVaccinated] = useState(!!pet?.vaccinated);
  const [savingFlag, setSavingFlag] = useState(false);

  const reload = async () => {
    if (!pet?.id) { setLoading(false); return; }
    setLoading(true); setErr(null);
    try {
      const rs = await listHealthRecords(pet.id);
      setRecords(rs);
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

  const handleDelete = async (r) => {
    if (!confirm("删除这条记录？")) return;
    try { await deleteHealthRecord(r.id, user.id); reload(); }
    catch (e) { alert(e.message); }
  };

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
          <HealthIcon size={32} color={TEXT} />
          <span style={{ fontSize:17, fontWeight:800, color:TEXT }}>宠物健康</span>
        </div>
        <button onClick={() => setAddOpen(true)} disabled={!pet?.id}
          style={{ width:40, height:40, borderRadius:999,
                   background: pet?.id ? PRI : "#D6D5D8", color:"white",
                   border:"none", cursor: pet?.id ? "pointer" : "default",
                   fontSize:22, fontWeight:700,
                   display:"flex", alignItems:"center", justifyContent:"center",
                   boxShadow: pet?.id ? "0 4px 12px rgba(230,134,69,0.35)" : "none" }}>+</button>
      </div>

      {!pet?.id ? (
        <div style={{ ...card, margin:"16px", padding:"32px 20px",
                      textAlign:"center", color:"#9A9188", fontSize:13 }}>
          请先创建宠物档案
        </div>
      ) : (
        <div style={{ padding:"0 16px 90px", display:"flex", flexDirection:"column", gap:14 }}>

          {/* ── 当前状态 Hero ── */}
          <div style={{ ...card, padding:"24px 20px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", bottom:-15, right:-15, opacity:0.08,
                          transform:"scale(0.78)", transformOrigin:"bottom right",
                          pointerEvents:"none", color:TEXT }}>
              <svg width="100" height="100" viewBox="0 0 100 100" fill="none"
                   stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M50 10 L80 22 L80 55 Q80 80 50 90 Q20 80 20 55 L20 22 Z"/>
                <path d="M38 50 L45 50 L45 38 L55 38 L55 50 L62 50 L62 60 L55 60 L55 72 L45 72 L45 60 L38 60 Z"/>
              </svg>
            </div>
            <div style={{ fontSize:12, color:SUB, marginBottom:4, fontWeight:500 }}>当前状态</div>
            <div style={{ fontSize:40, fontWeight:800, color:TEXT, lineHeight:1.1, marginBottom:12 }}>
              {neutered ? "已绝育" : "未绝育"}
            </div>
            {vaccinated && (
              <div style={{ display:"inline-flex", alignItems:"center", gap:6,
                            background:"rgba(95,167,102,0.12)", borderRadius:999, padding:"5px 12px" }}>
                <span style={{ fontSize:11, color:GREEN, fontWeight:600 }}>疫苗齐全</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                     stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M7 12l4 4 6-7"/>
                </svg>
              </div>
            )}
            {!vaccinated && (
              <div style={{ display:"inline-flex", alignItems:"center", gap:6,
                            background:"rgba(230,134,69,0.12)", borderRadius:999, padding:"5px 12px" }}>
                <span style={{ fontSize:11, color:PRI, fontWeight:600 }}>疫苗待补</span>
              </div>
            )}
          </div>

          {/* ── 基础健康状态 ── */}
          <div style={{ ...card, padding:"20px" }}>
            <div style={{ fontSize:14, fontWeight:700, color:TEXT, marginBottom:14 }}>
              基础健康状态
            </div>
            <HealthStatusRow
              label="绝育状态" done={neutered} disabled={savingFlag}
              onToggle={(v) => toggleFlag("neutered", v)} />
            <div style={{ height:1, background:"rgba(0,0,0,0.06)", margin:"4px 0" }}/>
            <HealthStatusRow
              label="疫苗状态" done={vaccinated} disabled={savingFlag}
              onToggle={(v) => toggleFlag("vaccinated", v)} />
          </div>

          {/* ── 健康记录 ── */}
          <div>
            <div style={{ fontSize:12, color:SUB, marginBottom:10, paddingLeft:4, fontWeight:600 }}>
              健康记录
            </div>
            {loading && <div style={{ textAlign:"center", color:SUB, padding:20 }}>加载中...</div>}
            {err && <div style={{ color:"#D94040", fontSize:12, padding:10 }}>❌ {err}</div>}
            {!loading && !err && records.length === 0 && (
              <div style={{ ...card, padding:"32px 20px", textAlign:"center",
                            color:"#9A9188", fontSize:13, lineHeight:1.7 }}>
                还没有记录<br/>
                <span style={{ fontSize:11 }}>点击右上角 + 添加疫苗/驱虫/体检</span>
              </div>
            )}
            {records.map((r) => {
              const meta = typeMeta(r.record_type);
              return (
                <div key={r.id}
                  style={{ ...card, padding:"14px 16px", marginBottom:10,
                           display:"flex", gap:12, alignItems:"flex-start" }}>
                  <div style={{ width:40, height:40, borderRadius:14,
                                background:"rgba(95,167,102,0.12)",
                                display:"flex", alignItems:"center", justifyContent:"center",
                                fontSize:20, flexShrink:0 }}>
                    {meta.emoji}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:TEXT }}>{meta.label}</span>
                      {r.title && <span style={{ fontSize:12, color:SUB }}>· {r.title}</span>}
                    </div>
                    <div style={{ fontSize:11, color:SUB, marginTop:3 }}>
                      记录日期：{fmtDate(r.record_date)}
                    </div>
                    {r.next_due_date && (
                      <div style={{ fontSize:11, color:PRI, marginTop:3, fontWeight:600 }}>
                        下次提醒：{fmtDate(r.next_due_date)}
                      </div>
                    )}
                    {r.note && (
                      <div style={{ fontSize:12, color:TEXT, marginTop:6, lineHeight:1.5 }}>{r.note}</div>
                    )}
                  </div>
                  <button onClick={() => handleDelete(r)}
                    style={{ background:"transparent", border:"none", cursor:"pointer",
                             color:"#C5B9B0", fontSize:16, padding:"2px 4px" }}>🗑</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {addOpen && pet?.id && (
        <AddRecordModal user={user} pet={pet}
          onClose={() => setAddOpen(false)}
          onAdded={() => { setAddOpen(false); reload(); }} />
      )}
    </div>
  );
}

/* ── Premium health status row (toggleable) ── */
function HealthStatusRow({ label, done, onToggle, disabled }) {
  return (
    <div style={{ display:"flex", alignItems:"center", padding:"10px 0" }}>
      <div style={{ width:28, height:28, borderRadius:8,
                    background: done ? "rgba(95,167,102,0.15)" : "rgba(0,0,0,0.04)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    marginRight:12, flexShrink:0 }}>
        {done ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5L19 7"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="#C5B9B0" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="9"/>
          </svg>
        )}
      </div>
      <span style={{ flex:1, fontSize:13, color:TEXT, fontWeight:600 }}>{label}</span>
      <button onClick={() => !disabled && onToggle(!done)} disabled={disabled}
        style={{ fontSize:12, fontWeight:600, padding:"4px 12px", borderRadius:999,
                 background: done ? "rgba(95,167,102,0.12)" : "rgba(0,0,0,0.06)",
                 color: done ? GREEN : SUB, border:"none",
                 cursor: disabled ? "default" : "pointer" }}>
        {done ? "已完成" : "未完成"}
      </button>
    </div>
  );
}

/* ── AddRecordModal (logic unchanged) ── */
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
      await addHealthRecord({ userId: user.id, petId: pet.id, recordType,
                              title, recordDate, nextDueDate: nextDueDate || null, note });
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
                    maxHeight:"86vh", overflowY:"auto" }}>
        <div style={{ width:40, height:4, borderRadius:4, background:"#D6D5D8",
                      margin:"0 auto 16px" }}/>
        <div style={{ fontSize:17, fontWeight:800, color:TEXT, marginBottom:16 }}>新增记录</div>

        <Label>类型</Label>
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          {RECORD_TYPES.map((t) => (
            <button key={t.key} onClick={() => setRecordType(t.key)}
              style={{ flex:1, padding:"10px 0", borderRadius:14, fontSize:12,
                       background: recordType === t.key ? PRI : "white",
                       color: recordType === t.key ? "white" : TEXT,
                       border:`1px solid ${recordType === t.key ? PRI : "#D6D5D8"}`,
                       cursor:"pointer",
                       display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <span style={{ fontSize:18 }}>{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <Label>标题 / 名称（可选）</Label>
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="比如：狂犬疫苗 / 体内驱虫" maxLength={100} style={inputStyle()} />

        <Label>记录日期</Label>
        <input type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} style={inputStyle()} />

        <Label>下次提醒日期（可选）</Label>
        <input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} style={inputStyle()} />

        <Label>备注（可选）</Label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="医院、剂量、反应等" rows={3}
          style={{ ...inputStyle(), resize:"vertical", minHeight:80 }} />

        {err && <div style={{ color:"#D94040", fontSize:12, marginBottom:8 }}>❌ {err}</div>}
        <div style={{ display:"flex", gap:10, marginTop:10 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:"12px 0", borderRadius:14, fontSize:14, fontWeight:600,
                     background:"white", color:TEXT, border:"1px solid #D6D5D8", cursor:"pointer" }}>
            取消
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex:1, padding:"12px 0", borderRadius:14, fontSize:14, fontWeight:700,
                     background: !saving ? PRI : "#D6D5D8", color:"white", border:"none",
                     cursor: !saving ? "pointer" : "default" }}>
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
