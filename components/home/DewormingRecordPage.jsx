"use client";

/**
 * DewormingRecordPage.jsx — 驱虫记录页（狗 / 猫共用）
 *
 * 数据：pet_deworm_records（真实 Supabase）。
 * 顶部状态卡 + 体内/体外 tab 切换 + 记录卡列表 + 底部「添加驱虫记录」。
 */

import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ShieldCheck, Plus, Bug } from "lucide-react";
import {
  listDewormRecords, addDewormRecord, buildDewormOverview, dewormStatus,
} from "@/services/petDewormService";
import { StatusTag } from "@/components/home/VaccineRecordPage";
import { toastColors } from "@/services/toastTheme";

const BG    = "#ECEEE8";
const GREEN = "#5FA766";
const PRI   = "#E68645";
const TEXT  = "#1A1006";
const SUB   = "#7A8275";

const fmtSlash = (d) => (d ? String(d).slice(0, 10).replace(/-/g, "/") : "");

const dewormCache = {};

export default function DewormingRecordPage({ pet, user, onBack }) {
  const cached = pet?.id ? dewormCache[pet.id] : null;
  const [records, setRecords] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [tab, setTab]         = useState("internal"); // internal | external
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast]     = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), type === "error" ? 3500 : 2200);
  };

  const reload = async () => {
    if (!pet?.id) { setLoading(false); return; }
    try {
      const rs = await listDewormRecords(pet.id);
      setRecords(rs);
      dewormCache[pet.id] = rs;
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
    const today = new Date().toISOString().slice(0, 10);
    const optimistic = {
      id: tempId, pet_id: pet?.id, user_id: user?.id,
      deworm_type: form.dewormType,
      product_name: form.productName || null,
      product_desc: form.productDesc || null,
      target_pests: form.targetPests || null,
      done_date: form.doneDate || today,
      next_due_date: form.nextDueDate || null,
    };
    setAddOpen(false);
    setTab(form.dewormType); // 切到对应 tab，确保新记录可见
    setRecords((prev) => { const next = [optimistic, ...prev]; dewormCache[pet.id] = next; return next; });
    showToast("驱虫记录已添加 ✨");
    (async () => {
      try {
        const real = await addDewormRecord({ userId: user?.id, petId: pet?.id, ...form });
        setRecords((prev) => { const next = prev.map((r) => (r.id === tempId ? real : r)); dewormCache[pet.id] = next; return next; });
      } catch (e) {
        setRecords((prev) => { const next = prev.filter((r) => r.id !== tempId); dewormCache[pet.id] = next; return next; });
        showToast(e.message || "添加失败，请重试", "error");
      }
    })();
  };

  const ov = useMemo(() => buildDewormOverview(records), [records]);
  const list = tab === "internal" ? ov.internal : ov.external;

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
        <span style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>驱虫记录</span>
        <div style={{ width: 40 }} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px",
                    display: "flex", flexDirection: "column", gap: 14 }}>

        {/* 顶部状态卡 */}
        <div style={{ background: "#FFFFFF", borderRadius: 22, padding: "20px 22px",
                      boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
                      display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, color: SUB, marginBottom: 8 }}>接虫状态</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: TEXT, lineHeight: 1.15 }}>
              {ov.headline}
            </div>
            <div style={{ fontSize: 12, color: SUB, marginTop: 8 }}>
              {ov.nextDate ? `下次时间 ${fmtSlash(ov.nextDate)}` : "暂无下次计划"}
            </div>
          </div>
          <div style={{ width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                        background: ov.bothProtected ? GREEN : "rgba(95,167,102,0.14)",
                        display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={28} color={ov.bothProtected ? "#fff" : GREEN} strokeWidth={1.9} />
          </div>
        </div>

        {/* Tab 切换 */}
        <div style={{ display: "flex", gap: 4, padding: "0 4px" }}>
          {[
            { key: "internal", label: "体内驱虫" },
            { key: "external", label: "体外驱虫" },
          ].map((t) => {
            const on = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ flex: 1, padding: "10px 0", border: "none", background: "transparent",
                         cursor: "pointer", position: "relative",
                         fontSize: 14.5, fontWeight: on ? 800 : 600,
                         color: on ? GREEN : SUB }}>
                {t.label}
                <div style={{ position: "absolute", left: "50%", bottom: 2,
                              transform: "translateX(-50%)", width: 30, height: 3,
                              borderRadius: 4, background: on ? GREEN : "transparent" }} />
              </button>
            );
          })}
        </div>

        {/* 记录列表 */}
        {loading ? (
          <div style={{ textAlign: "center", color: SUB, fontSize: 12, padding: 20 }}>加载中…</div>
        ) : list.length === 0 ? (
          <div style={{ background: "#FFFFFF", borderRadius: 22, padding: "34px 20px",
                        boxShadow: "0 6px 18px rgba(0,0,0,0.05)", textAlign: "center" }}>
            <Bug size={30} color="rgba(95,167,102,0.4)" strokeWidth={1.5} />
            <div style={{ fontSize: 13, color: SUB, marginTop: 10 }}>
              还没有{tab === "internal" ? "体内" : "体外"}驱虫记录
            </div>
            <div style={{ fontSize: 12, color: "#B5AFA9", marginTop: 4 }}>点击下方按钮添加</div>
          </div>
        ) : (
          list.map((r) => <DewormCard key={r.id} rec={r} />)
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
          <Plus size={20} strokeWidth={2.6} /> 添加驱虫记录
        </button>
      </div>

      {addOpen && (
        <AddDewormModal pet={pet} user={user} defaultType={tab}
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

/* ── 驱虫记录卡 ───────────────────────────────── */
function DewormCard({ rec }) {
  const status = dewormStatus(rec);
  const title = rec.product_name
    ? (rec.product_desc ? `${rec.product_name}（${rec.product_desc}）` : rec.product_name)
    : (rec.product_desc || "驱虫记录");
  return (
    <div style={{ background: "#FFFFFF", borderRadius: 20, padding: "16px 18px",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                    marginBottom: 8 }}>
        <span style={{ fontSize: 12.5, color: SUB }}>{fmtSlash(rec.done_date)}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <StatusTag status={status} />
          <ChevronRight size={15} color="#C2C8BE" strokeWidth={2} />
        </div>
      </div>
      <div style={{ fontSize: 15.5, fontWeight: 700, color: TEXT, marginBottom: 6 }}>
        {title || "驱虫记录"}
      </div>
      {rec.target_pests && (
        <div style={{ fontSize: 12.5, color: SUB, marginBottom: 6 }}>
          适用：{rec.target_pests}
        </div>
      )}
      <div style={{ fontSize: 12.5, color: SUB }}>
        下次时间：{rec.next_due_date ? fmtSlash(rec.next_due_date) : "未设置"}
      </div>
    </div>
  );
}

/* ── 添加驱虫记录弹层 ─────────────────────────── */
function AddDewormModal({ pet, user, defaultType, onClose, onSubmit, onError }) {
  const [type, setType]   = useState(defaultType || "internal");
  const [product, setProduct] = useState("");
  const [desc, setDesc]   = useState("");
  const [pests, setPests] = useState("");
  const [doneDate, setDoneDate] = useState(new Date().toISOString().slice(0, 10));
  const [nextDate, setNextDate] = useState("");
  const save = () => {
    onSubmit?.({
      dewormType: type, productName: product, productDesc: desc,
      targetPests: pests, doneDate, nextDueDate: nextDate,
    });
  };

  return (
    <Sheet onClose={onClose}>
      <div style={{ fontSize: 18, fontWeight: 800, color: TEXT, marginBottom: 16 }}>添加驱虫记录</div>

      <SLabel>驱虫类型</SLabel>
      <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
        {[
          { key: "internal", label: "体内驱虫" },
          { key: "external", label: "体外驱虫" },
        ].map((t) => {
          const on = type === t.key;
          return (
            <button key={t.key} onClick={() => setType(t.key)}
              style={{ flex: 1, height: 42, borderRadius: 12, cursor: "pointer",
                       border: on ? `1.5px solid ${GREEN}` : "1px solid rgba(0,0,0,0.12)",
                       background: on ? "rgba(95,167,102,0.12)" : "#fff",
                       color: on ? GREEN : TEXT, fontSize: 14, fontWeight: 700 }}>
              {t.label}
            </button>
          );
        })}
      </div>

      <SLabel>药品名称</SLabel>
      <input value={product} maxLength={40} onChange={(e) => setProduct(e.target.value)}
        placeholder="比如：海乐妙 / 福来恩" style={inputStyle} />

      <SLabel>类型说明（可选）</SLabel>
      <input value={desc} maxLength={40} onChange={(e) => setDesc(e.target.value)}
        placeholder="比如：猫用体内驱虫 / 体外驱虫滴剂" style={inputStyle} />

      <SLabel>适用虫类（可选）</SLabel>
      <input value={pests} maxLength={60} onChange={(e) => setPests(e.target.value)}
        placeholder="比如：蛔虫、钩虫、绦虫等" style={inputStyle} />

      <SLabel>驱虫日期</SLabel>
      <input type="date" value={doneDate} onChange={(e) => setDoneDate(e.target.value)}
        style={inputStyle} />

      <SLabel>下次时间（可选）</SLabel>
      <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)}
        style={inputStyle} />

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
