"use client";

/**
 * components/home/HealthPage.jsx
 *
 * 宠物健康：绝育/疫苗状态开关 + 记录列表（疫苗/驱虫/体检/其他）
 */

import { useEffect, useState } from "react";
import {
  listHealthRecords, addHealthRecord, deleteHealthRecord,
  updatePetHealth, RECORD_TYPES,
} from "@/services/petHealthService";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", text:"#1A1006",
  sub:"#8A8074", light:"#D6D5D8", border:"#D6D5D8",
};

const fmtDate = (d) => {
  if (!d) return "";
  const [y, m, day] = String(d).split("-");
  return `${y}-${m}-${day}`;
};
const typeMeta = (k) => RECORD_TYPES.find((t) => t.key === k) || RECORD_TYPES[3];

export default function HealthPage({ user, pet, onPetUpdate, onBack }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  // 本地镜像（避免每次切换都打到 DB）
  const [neutered,   setNeutered]   = useState(!!pet?.neutered);
  const [vaccinated, setVaccinated] = useState(!!pet?.vaccinated);
  const [savingFlag, setSavingFlag] = useState(false);

  const reload = async () => {
    if (!pet?.id) { setLoading(false); return; }
    setLoading(true);
    setErr(null);
    try {
      const rs = await listHealthRecords(pet.id);
      setRecords(rs);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [pet?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setNeutered(!!pet?.neutered); setVaccinated(!!pet?.vaccinated); }, [pet?.neutered, pet?.vaccinated]);

  const toggleFlag = async (key, next) => {
    if (!pet?.id || !user?.id) return;
    if (key === "neutered")   setNeutered(next);
    if (key === "vaccinated") setVaccinated(next);
    setSavingFlag(true);
    try {
      await updatePetHealth(pet.id, user.id, { [key]: next });
      onPetUpdate?.({ ...pet, [key]: next });
    } catch (e) {
      // 回滚
      if (key === "neutered")   setNeutered(!next);
      if (key === "vaccinated") setVaccinated(!next);
      alert(e.message);
    } finally {
      setSavingFlag(false);
    }
  };

  const handleDelete = async (r) => {
    if (!confirm("删除这条记录？")) return;
    try {
      await deleteHealthRecord(r.id, user.id);
      reload();
    } catch (e) { alert(e.message); }
  };

  return (
    <div style={{ height:"100%", overflowY:"auto", background:C.bg }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"52px 16px 12px", background:"white",
                    borderBottom:`1px solid ${C.border}` }}>
        <button onClick={onBack}
          style={{ background:"transparent", border:"none", cursor:"pointer",
                   fontSize:22, color:C.text, padding:"2px 6px" }}>‹</button>
        <div style={{ fontSize:17, fontWeight:800, color:C.text }}>🏥 宠物健康</div>
        <button onClick={() => setAddOpen(true)} disabled={!pet?.id}
          style={{ width:36, height:36, borderRadius:"50%",
                   background: pet?.id ? C.pri : C.light,
                   color:"white", border:"none",
                   cursor: pet?.id ? "pointer" : "default",
                   fontSize:20, fontWeight:700,
                   display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
      </div>

      {!pet?.id ? (
        <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:"40px 20px" }}>
          请先创建宠物档案
        </div>
      ) : (
        <>
          {/* 基础状态 */}
          <div style={{ padding:"14px 14px 0" }}>
            <div style={{ background:"white", borderRadius:18, padding:"14px 16px",
                          border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:10 }}>
                {pet.name} 的基础状态
              </div>
              <FlagRow
                label="绝育" emoji="✅"
                on={neutered}
                disabled={savingFlag}
                onToggle={(v) => toggleFlag("neutered", v)} />
              <FlagRow
                label="疫苗齐全" emoji="💉"
                on={vaccinated}
                disabled={savingFlag}
                onToggle={(v) => toggleFlag("vaccinated", v)} />
            </div>
          </div>

          {/* 记录列表 */}
          <div style={{ padding:"14px 14px 90px" }}>
            <div style={{ fontSize:12, color:C.sub, marginBottom:8, paddingLeft:4 }}>
              健康记录
            </div>
            {loading && <div style={{ textAlign:"center", color:C.sub, padding:20 }}>加载中...</div>}
            {err && <div style={{ color:"#D94040", fontSize:12, padding:10 }}>❌ {err}</div>}
            {!loading && !err && records.length === 0 && (
              <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:"40px 0" }}>
                还没有记录，点右上角 + 添加疫苗/驱虫/体检
              </div>
            )}
            {records.map((r) => {
              const meta = typeMeta(r.record_type);
              return (
                <div key={r.id}
                  style={{ background:"white", borderRadius:14, padding:"12px 14px",
                           marginBottom:8, border:`1px solid ${C.border}`,
                           display:"flex", gap:12, alignItems:"flex-start" }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:C.tint,
                                display:"flex", alignItems:"center", justifyContent:"center",
                                fontSize:18, flexShrink:0 }}>
                    {meta.emoji}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:C.text }}>
                        {meta.label}
                      </span>
                      {r.title && (
                        <span style={{ fontSize:12, color:C.sub }}>· {r.title}</span>
                      )}
                    </div>
                    <div style={{ fontSize:11, color:C.sub, marginTop:3 }}>
                      记录日期：{fmtDate(r.record_date)}
                    </div>
                    {r.next_due_date && (
                      <div style={{ fontSize:11, color:C.pri, marginTop:3, fontWeight:600 }}>
                        下次提醒：{fmtDate(r.next_due_date)}
                      </div>
                    )}
                    {r.note && (
                      <div style={{ fontSize:12, color:C.text, marginTop:6, lineHeight:1.5 }}>
                        {r.note}
                      </div>
                    )}
                  </div>
                  <button onClick={() => handleDelete(r)}
                    style={{ background:"transparent", border:"none", cursor:"pointer",
                             color:C.sub, fontSize:14, padding:"2px 4px" }}>🗑</button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {addOpen && pet?.id && (
        <AddRecordModal
          user={user}
          pet={pet}
          onClose={() => setAddOpen(false)}
          onAdded={() => { setAddOpen(false); reload(); }}
        />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────── */
function FlagRow({ label, emoji, on, onToggle, disabled }) {
  return (
    <div style={{ display:"flex", alignItems:"center", padding:"8px 0" }}>
      <span style={{ fontSize:18, marginRight:10 }}>{emoji}</span>
      <span style={{ flex:1, fontSize:13, color:C.text }}>{label}</span>
      <button onClick={() => !disabled && onToggle(!on)} disabled={disabled}
        style={{ width:46, height:26, borderRadius:14, position:"relative",
                 background: on ? C.pri : C.light,
                 border:"none", cursor: disabled ? "default" : "pointer",
                 transition:"background .15s" }}>
        <div style={{ position:"absolute", top:2, left: on ? 22 : 2,
                      width:22, height:22, borderRadius:"50%", background:"white",
                      boxShadow:"0 1px 3px rgba(0,0,0,0.2)",
                      transition:"left .15s" }} />
      </button>
    </div>
  );
}

function AddRecordModal({ user, pet, onClose, onAdded }) {
  const [recordType,  setRecordType]  = useState("vaccine");
  const [title,       setTitle]       = useState("");
  const [recordDate,  setRecordDate]  = useState(new Date().toISOString().slice(0, 10));
  const [nextDueDate, setNextDueDate] = useState("");
  const [note,        setNote]        = useState("");
  const [saving,      setSaving]      = useState(false);
  const [err,         setErr]         = useState(null);

  const handleSave = async () => {
    setErr(null);
    setSaving(true);
    try {
      await addHealthRecord({
        userId:      user.id,
        petId:       pet.id,
        recordType,
        title,
        recordDate,
        nextDueDate: nextDueDate || null,
        note,
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
                    maxHeight:"86vh", overflowY:"auto" }}>
        <div style={{ width:40, height:4, borderRadius:4, background:C.light,
                      margin:"0 auto 16px" }}/>
        <div style={{ fontSize:17, fontWeight:800, color:C.text, marginBottom:16 }}>
          ➕ 新增记录
        </div>

        <Label>类型</Label>
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          {RECORD_TYPES.map((t) => (
            <button key={t.key} onClick={() => setRecordType(t.key)}
              style={{ flex:1, padding:"10px 0", borderRadius:14, fontSize:12,
                       background: recordType === t.key ? C.pri : "white",
                       color:      recordType === t.key ? "white" : C.text,
                       border:`1px solid ${recordType === t.key ? C.pri : C.border}`,
                       cursor:"pointer",
                       display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <span style={{ fontSize:18 }}>{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <Label>标题 / 名称（可选）</Label>
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="比如：狂犬疫苗 / 体内驱虫"
          maxLength={100}
          style={inputStyle()} />

        <Label>记录日期</Label>
        <input type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)}
          style={inputStyle()} />

        <Label>下次提醒日期（可选）</Label>
        <input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)}
          style={inputStyle()} />

        <Label>备注（可选）</Label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="医院、剂量、反应等"
          rows={3}
          style={{ ...inputStyle(), resize:"vertical", minHeight:80 }} />

        {err && <div style={{ color:"#D94040", fontSize:12, marginBottom:8 }}>❌ {err}</div>}

        <div style={{ display:"flex", gap:10, marginTop:10 }}>
          <button onClick={onClose}
            style={{ flex:1, padding:"12px 0", borderRadius:14, fontSize:14, fontWeight:600,
                     background:"white", color:C.text, border:`1px solid ${C.border}`,
                     cursor:"pointer" }}>取消</button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex:1, padding:"12px 0", borderRadius:14, fontSize:14, fontWeight:700,
                     background: !saving ? C.pri : C.light,
                     color:"white", border:"none",
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
