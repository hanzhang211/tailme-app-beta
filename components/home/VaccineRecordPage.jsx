"use client";

/**
 * VaccineRecordPage.jsx — 疫苗记录页（狗 / 猫共用，数据驱动差异）
 *
 * 数据：pet_vaccine_records（真实 Supabase）。
 * 顶部圆环进度 + 核心疫苗分项 + 狂犬单卡 + 底部「添加疫苗记录」。
 * 设计语言：绿色主调，橙色仅用于「待补 / 即将到期」提醒。
 */

import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ShieldCheck, ShieldAlert, Check, Plus } from "lucide-react";
import {
  listVaccineRecords, addVaccineRecord, buildVaccineOverview,
} from "@/services/petVaccineService";
import { vaccinePlan } from "@/services/petHealthPlan";
import { toastColors } from "@/services/toastTheme";

const BG    = "#ECEEE8";
const GREEN = "#5FA766";
const PRI   = "#E68645";
const TEXT  = "#1A1006";
const SUB   = "#7A8275";

const fmtSlash = (d) => (d ? String(d).slice(0, 10).replace(/-/g, "/") : "");

/* 疫苗内存缓存：再次打开秒显 */
const vaxCache = {};

export default function VaccineRecordPage({ pet, user, onBack }) {
  const cached = pet?.id ? vaxCache[pet.id] : null;
  const [records, setRecords] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast]     = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), type === "error" ? 3500 : 2200);
  };

  const reload = async () => {
    if (!pet?.id) { setLoading(false); return; }
    try {
      const rs = await listVaccineRecords(pet.id);
      setRecords(rs);
      vaxCache[pet.id] = rs;
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [pet?.id]); // eslint-disable-line

  // 乐观添加：瞬间关弹层 + 本地插入 + toast；insert 后台跑，成功替换/失败回滚（无等待）
  const handleAdd = (form) => {
    const tempId = "temp_" + Date.now();
    const optimistic = {
      id: tempId, pet_id: pet?.id, user_id: user?.id,
      vaccine_group: form.vaccineGroup, vaccine_code: form.vaccineCode,
      vaccine_name: form.vaccineName,
      dose_no: form.doseNo ? Number(form.doseNo) : null,
      dose_date: form.doseDate || null,
      next_due_date: form.nextDueDate || null,
      note: form.note || null,
    };
    setAddOpen(false);
    setRecords((prev) => { const next = [optimistic, ...prev]; vaxCache[pet.id] = next; return next; });
    showToast("疫苗记录已添加 ✨");
    (async () => {
      try {
        const real = await addVaccineRecord({ userId: user?.id, petId: pet?.id, ...form });
        setRecords((prev) => { const next = prev.map((r) => (r.id === tempId ? real : r)); vaxCache[pet.id] = next; return next; });
      } catch (e) {
        setRecords((prev) => { const next = prev.filter((r) => r.id !== tempId); vaxCache[pet.id] = next; return next; });
        showToast(e.message || "添加失败，请重试", "error");
      }
    })();
  };

  const ov = useMemo(
    () => buildVaccineOverview(records, pet?.pet_type),
    [records, pet?.pet_type]
  );

  const pct = ov.progress.total
    ? Math.round((ov.progress.done / ov.progress.total) * 100)
    : 0;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: BG }}>

      {/* Header */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center",
                    justifyContent: "space-between", padding: "52px 16px 14px" }}>
        <button onClick={onBack}
          style={{ width: 40, height: 40, borderRadius: 999, background: "rgba(255,255,255,0.7)",
                   border: "none", cursor: "pointer", display: "flex",
                   alignItems: "center", justifyContent: "center",
                   boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <ChevronLeft size={22} color={TEXT} strokeWidth={2.5} />
        </button>
        <span style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>疫苗记录</span>
        <div style={{ width: 40 }} />
      </div>

      {/* 滚动内容 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px",
                    display: "flex", flexDirection: "column", gap: 14 }}>

        {/* 顶部概览卡：接种进度 + 圆环 */}
        <div style={{ background: "#FFFFFF", borderRadius: 22, padding: "20px 22px",
                      boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
                      display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, color: SUB, marginBottom: 8 }}>接种进度</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 34, fontWeight: 800, color: TEXT, lineHeight: 1 }}>
                {ov.progress.done}
              </span>
              <span style={{ fontSize: 16, fontWeight: 600, color: SUB }}>
                / {ov.progress.total} 针
              </span>
            </div>
            <div style={{ fontSize: 12, color: SUB, marginTop: 10 }}>
              {ov.nextDueDate ? `下次补种 ${fmtSlash(ov.nextDueDate)}` : "暂无补种计划"}
            </div>
          </div>
          <ProgressRing pct={pct} />
        </div>

        {/* 核心疫苗 */}
        <SectionTitle title={ov.core.sectionTitle} note={ov.core.sectionNote} />
        <div style={{ background: "#FFFFFF", borderRadius: 22,
                      boxShadow: "0 6px 18px rgba(0,0,0,0.05)", overflow: "hidden" }}>
          {ov.core.items.map((it, i) => (
            <VaccineItemRow key={it.code} item={it} divider={i < ov.core.items.length - 1} />
          ))}
        </div>

        {/* 狂犬疫苗 */}
        <SectionTitle title={ov.rabies.sectionTitle} note={ov.rabies.sectionNote} />
        <div style={{ background: "#FFFFFF", borderRadius: 22, padding: "16px 18px",
                      boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
                      display: "flex", alignItems: "center", gap: 14 }}>
          <IconBubble status={ov.rabies.status.key} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{ov.rabies.name}</div>
            <div style={{ fontSize: 12, color: SUB, marginTop: 4 }}>
              {ov.rabies.lastDate
                ? `最近接种 ${fmtSlash(ov.rabies.lastDate)}`
                : (ov.rabies.hint || "暂无接种记录")}
            </div>
          </div>
          <StatusTag status={ov.rabies.status} />
          <ChevronRight size={16} color="#C2C8BE" strokeWidth={2} style={{ flexShrink: 0 }} />
        </div>

        {loading && (
          <div style={{ textAlign: "center", color: SUB, fontSize: 12, padding: 8 }}>加载中…</div>
        )}
        <div style={{ height: 4 }} />
      </div>

      {/* 底部固定按钮 */}
      <div style={{ flexShrink: 0, padding: "10px 16px 26px", background: BG }}>
        <button onClick={() => setAddOpen(true)} disabled={!pet?.id}
          style={{ width: "100%", height: 50, borderRadius: 16, border: "none",
                   background: pet?.id ? GREEN : "#C5C8CE", color: "white",
                   fontSize: 16, fontWeight: 700, cursor: pet?.id ? "pointer" : "default",
                   display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                   boxShadow: pet?.id ? "0 6px 16px rgba(95,167,102,0.32)" : "none" }}>
          <Plus size={20} strokeWidth={2.6} /> 添加疫苗记录
        </button>
      </div>

      {addOpen && (
        <AddVaccineModal pet={pet} user={user}
          onClose={() => setAddOpen(false)}
          onSubmit={handleAdd}
          onError={(m) => showToast(m, "error")} />
      )}

      {toast && (
        <div style={{ position: "fixed", left: "50%", bottom: 90, transform: "translateX(-50%)",
                      zIndex: 2000, background: toastColors(toast.type).bg,
                      color: toastColors(toast.type).color, padding: "11px 22px",
                      borderRadius: 999, fontSize: 14, fontWeight: 700,
                      boxShadow: "0 6px 20px rgba(0,0,0,0.22)", maxWidth: "80%", textAlign: "center" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ── 圆环进度 ─────────────────────────────────── */
function ProgressRing({ pct }) {
  const R = 28, STROKE = 7;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - Math.max(0, Math.min(1, pct / 100)));
  return (
    <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={R} fill="none" stroke="#E6ECE4" strokeWidth={STROKE} />
        <circle cx="36" cy="36" r={R} fill="none" stroke={GREEN} strokeWidth={STROKE}
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset}
          transform="rotate(-90 36 36)" style={{ transition: "stroke-dashoffset .5s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 15, fontWeight: 800, color: GREEN }}>
        {pct}%
      </div>
    </div>
  );
}

/* ── 核心疫苗单项行 ───────────────────────────── */
function VaccineItemRow({ item, divider }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 18px",
                  borderBottom: divider ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
      <IconBubble status={item.status.key} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 6 }}>{item.name}</div>
        {item.doses.length === 0 ? (
          <div style={{ fontSize: 12.5, color: SUB }}>暂无接种记录</div>
        ) : (
          item.doses.map((d, i) => {
            const date = d.dose_date || d.next_due_date;
            const due  = !d.dose_date && d.next_due_date;
            return (
              <div key={i} style={{ fontSize: 12.5, lineHeight: 1.7,
                                    color: due ? PRI : SUB, fontWeight: due ? 700 : 500 }}>
                第{d.dose_no || i + 1}针 {fmtSlash(date)}
              </div>
            );
          })
        )}
      </div>
      <StatusTag status={item.status} />
      <ChevronRight size={16} color="#C2C8BE" strokeWidth={2}
        style={{ flexShrink: 0, marginTop: 2 }} />
    </div>
  );
}

/* ── 左侧绿色 icon 气泡 ───────────────────────── */
function IconBubble({ status }) {
  const pending = status !== "done";
  return (
    <div style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                  background: pending ? "rgba(230,134,69,0.12)" : "rgba(95,167,102,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
      {pending
        ? <ShieldAlert size={20} color={PRI} strokeWidth={1.9} />
        : <ShieldCheck size={20} color={GREEN} strokeWidth={1.9} />}
    </div>
  );
}

/* ── 状态标签 ─────────────────────────────────── */
export function StatusTag({ status }) {
  const green = status.tone === "green";
  return (
    <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, padding: "4px 10px",
                   borderRadius: 999, whiteSpace: "nowrap",
                   background: green ? "rgba(95,167,102,0.14)" : "rgba(230,134,69,0.14)",
                   color: green ? GREEN : PRI,
                   display: "inline-flex", alignItems: "center", gap: 4 }}>
      {green && <Check size={12} strokeWidth={2.8} />}
      {status.label}
    </span>
  );
}

/* ── Section 小标题 ───────────────────────────── */
function SectionTitle({ title, note }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 4px" }}>
      <div style={{ width: 7, height: 7, borderRadius: 999, background: GREEN }} />
      <span style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>{title}</span>
      {note && <span style={{ fontSize: 12, color: SUB }}>（{note}）</span>}
    </div>
  );
}

/* ── 添加疫苗记录弹层 ─────────────────────────── */
function AddVaccineModal({ pet, user, onClose, onSubmit, onError }) {
  const plan = vaccinePlan(pet?.pet_type);
  // 可选疫苗 = 核心疫苗 + 狂犬
  const options = [
    ...plan.core.vaccines.map((v) => ({ group: "core", code: v.code, name: v.name })),
    { group: "rabies", code: plan.rabies.code, name: plan.rabies.name },
  ];
  const [sel, setSel]         = useState(options[0]);
  const [doseNo, setDoseNo]   = useState("1");
  const [doseDate, setDoseDate]   = useState(new Date().toISOString().slice(0, 10));
  const [nextDate, setNextDate]   = useState("");
  const [note, setNote]       = useState("");

  const save = () => {
    if (!sel) { onError?.("请选择疫苗"); return; }
    onSubmit?.({
      vaccineGroup: sel.group, vaccineCode: sel.code, vaccineName: sel.name,
      doseNo, doseDate, nextDueDate: nextDate, note,
    });
  };

  return (
    <Sheet onClose={onClose}>
      <div style={{ fontSize: 18, fontWeight: 800, color: TEXT, marginBottom: 16 }}>添加疫苗记录</div>

      <SLabel>选择疫苗</SLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {options.map((o) => {
          const on = sel?.code === o.code && sel?.group === o.group;
          return (
            <button key={o.group + o.code} onClick={() => setSel(o)}
              style={{ padding: "8px 14px", borderRadius: 999, cursor: "pointer",
                       border: on ? `1.5px solid ${GREEN}` : "1px solid rgba(0,0,0,0.12)",
                       background: on ? "rgba(95,167,102,0.12)" : "#fff",
                       color: on ? GREEN : TEXT, fontSize: 13, fontWeight: 700 }}>
              {o.name}
            </button>
          );
        })}
      </div>

      <SLabel>第几针</SLabel>
      <input type="number" min="1" value={doseNo} onChange={(e) => setDoseNo(e.target.value)}
        style={inputStyle} />

      <SLabel>接种日期</SLabel>
      <input type="date" value={doseDate} onChange={(e) => setDoseDate(e.target.value)}
        style={inputStyle} />

      <SLabel>下次补种日期（可选）</SLabel>
      <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)}
        style={inputStyle} />

      <SLabel>备注（可选）</SLabel>
      <input value={note} maxLength={100} onChange={(e) => setNote(e.target.value)}
        placeholder="比如：医院名称 / 疫苗品牌" style={inputStyle} />

      <button onClick={save}
        style={{ width: "100%", height: 48, borderRadius: 14, border: "none", marginTop: 18,
                 background: GREEN, color: "white", fontSize: 15, fontWeight: 700,
                 cursor: "pointer" }}>
        保存
      </button>
    </Sheet>
  );
}

function Sheet({ onClose, children }) {
  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 1500, background: "rgba(0,0,0,0.35)",
               display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 430, background: "#F7F8F5",
                 borderRadius: "24px 24px 0 0", padding: "22px 20px 30px",
                 maxHeight: "88vh", overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}

function SLabel({ children }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: "12px 0 6px" }}>{children}</div>
  );
}

const inputStyle = {
  width: "100%", height: 44, borderRadius: 12, padding: "0 14px",
  border: "1px solid rgba(138,123,106,0.22)", background: "#fff",
  fontSize: 14, color: TEXT, outline: "none", boxSizing: "border-box",
};
