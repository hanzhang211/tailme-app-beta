"use client";

/**
 * CheckupRecordForm.jsx — 添加 / 编辑「体检记录」底部弹层
 *
 * 数据：pet_checkup_records（真实 Supabase）。图片复用 pet-avatars(checkups/ 前缀)。
 * 取代旧的通用「新增健康记录」体检入口。add / edit 共用（传 initial 即编辑）。
 */

import React, { useRef, useState } from "react";
import { X, ChevronRight, Plus } from "lucide-react";
import {
  addCheckupRecord, updateCheckupRecord, uploadCheckupImage, CHECKUP_RESULTS,
} from "@/services/petCheckupService";

const GREEN = "#4FA85D";
const PRI   = "#E68645";
const TEXT  = "#1A1006";
const SUB   = "#7A8275";
const BORDER = "rgba(138,123,106,0.18)";

export default function CheckupRecordForm({ pet, user, initial, onClose, onSaved, onError }) {
  const editing = !!initial?.id;
  const [images, setImages]   = useState(initial?.image_urls || []);
  const [uploading, setUploading] = useState(0);
  const [date,   setDate]   = useState(initial?.checkup_date || new Date().toISOString().slice(0, 10));
  const [clinic, setClinic] = useState(initial?.clinic_name || "");
  const [items,  setItems]  = useState(initial?.checkup_items || "");
  const [result, setResult] = useState(initial?.result_status || "normal");
  const [nextDate, setNextDate] = useState(initial?.next_due_date || "");
  const [notes,  setNotes]  = useState(initial?.notes || "");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const onPick = async (e) => {
    const files = Array.from(e.target.files || []);
    if (fileRef.current) fileRef.current.value = "";
    for (const f of files) {
      setUploading((u) => u + 1);
      try {
        const url = await uploadCheckupImage(f, user?.id, pet?.id);
        setImages((prev) => [...prev, url]);
      } catch (err) {
        onError?.(err.message || "图片上传失败");
      } finally {
        setUploading((u) => u - 1);
      }
    }
  };

  const removeImage = (url) => setImages((prev) => prev.filter((u) => u !== url));

  const save = async () => {
    if (!date) { onError?.("请选择体检日期"); return; }
    if (uploading > 0) { onError?.("图片还在上传，请稍候"); return; }
    setSaving(true);
    try {
      const payload = {
        checkupDate: date, clinicName: clinic, checkupItems: items,
        resultStatus: result, nextDueDate: nextDate, notes, imageUrls: images,
      };
      const saved = editing
        ? await updateCheckupRecord(initial.id, user?.id, payload)
        : await addCheckupRecord({ userId: user?.id, petId: pet?.id, ...payload });
      onSaved?.(saved);
    } catch (e) {
      onError?.(e.message || "保存失败");
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 1500, background: "rgba(0,0,0,0.4)",
               display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 430, background: "#fff", borderRadius: "24px 24px 0 0",
                 height: "94vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ flexShrink: 0, padding: "16px 18px 10px", textAlign: "center", position: "relative" }}>
          <button onClick={onClose}
            style={{ position: "absolute", left: 14, top: 14, width: 32, height: 32, borderRadius: 999,
                     border: "none", background: "transparent", cursor: "pointer",
                     display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={20} color={TEXT} strokeWidth={2.2} />
          </button>
          <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>{editing ? "编辑体检记录" : "添加体检记录"}</div>
          <div style={{ fontSize: 12, color: SUB, marginTop: 4 }}>记录体检时间、机构、结果和图片</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 12,
                        padding: "6px 14px", borderRadius: 999, background: "rgba(79,168,93,0.12)" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: GREEN }}>
              当前宠物：{pet?.name || "—"}
            </span>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "6px 16px 16px" }}>
          {/* 体检图片 */}
          <SLabel>体检图片</SLabel>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
            {images.map((url) => (
              <div key={url} style={{ position: "relative", width: 78, height: 78, borderRadius: 12,
                                      overflow: "hidden", background: "#F2F1ED" }}>
                <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button onClick={() => removeImage(url)}
                  style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: 999,
                           border: "none", background: "rgba(0,0,0,0.5)", color: "#fff", cursor: "pointer",
                           display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                  <X size={13} strokeWidth={2.6} />
                </button>
              </div>
            ))}
            {Array.from({ length: uploading }).map((_, i) => (
              <div key={"up" + i} style={{ width: 78, height: 78, borderRadius: 12, background: "#F2F1ED",
                                           display: "flex", alignItems: "center", justifyContent: "center",
                                           fontSize: 11, color: SUB }}>上传中…</div>
            ))}
            <button onClick={() => fileRef.current?.click()}
              style={{ width: 78, height: 78, borderRadius: 12, cursor: "pointer",
                       border: `1.5px dashed ${GREEN}`, background: "rgba(79,168,93,0.06)",
                       display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
              <Plus size={20} color={GREEN} strokeWidth={2.2} />
              <span style={{ fontSize: 11, color: GREEN, fontWeight: 600 }}>上传图片</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={onPick} style={{ display: "none" }} />
          </div>

          {/* 表单卡片 */}
          <div style={{ background: "#fff", borderRadius: 18, border: `1px solid rgba(0,0,0,0.06)` }}>
            <Row label="体检日期" required>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={dateInput} />
            </Row>
            <Divider />
            <Row label="体检机构" optional>
              <input value={clinic} maxLength={40} onChange={(e) => setClinic(e.target.value)}
                placeholder="例如：瑞鹏宠物医院" style={textInput} />
            </Row>
            <Divider />
            <Row label="体检项目">
              <input value={items} maxLength={60} onChange={(e) => setItems(e.target.value)}
                placeholder="例如：血常规、便检、B超" style={textInput} />
            </Row>
            <Divider />
            <div style={{ padding: "13px 16px" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 10 }}>体检结果</div>
              <div style={{ display: "flex", gap: 8 }}>
                {CHECKUP_RESULTS.map((r) => {
                  const on = result === r.key;
                  return (
                    <button key={r.key} onClick={() => setResult(r.key)}
                      style={{ flex: 1, height: 40, borderRadius: 12, cursor: "pointer",
                               border: on ? "none" : `1px solid ${BORDER}`,
                               background: on ? GREEN : "#fff", color: on ? "#fff" : TEXT,
                               fontSize: 13.5, fontWeight: 700 }}>
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <Divider />
            <Row label="下次提醒" optional>
              <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} style={dateInput} />
            </Row>
          </div>

          {/* 详细说明 */}
          <div style={{ marginTop: 14 }}>
            <SLabel optional>详细说明</SLabel>
            <div style={{ position: "relative" }}>
              <textarea value={notes} maxLength={200} rows={3} onChange={(e) => setNotes(e.target.value)}
                placeholder="例如：医生建议三个月后复查"
                style={{ width: "100%", borderRadius: 14, padding: "12px 14px", fontSize: 14, color: TEXT,
                         border: `1px solid ${BORDER}`, background: "#fff", outline: "none",
                         boxSizing: "border-box", resize: "none", fontFamily: "inherit" }} />
              <span style={{ position: "absolute", right: 12, bottom: 10, fontSize: 11, color: "#B5AFA9" }}>
                {notes.length}/200
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ flexShrink: 0, display: "flex", gap: 12, padding: "12px 16px 26px",
                      borderTop: "1px solid rgba(0,0,0,0.05)" }}>
          <button onClick={onClose}
            style={{ flex: 1, height: 50, borderRadius: 16, cursor: "pointer", fontSize: 15, fontWeight: 700,
                     background: "#fff", color: GREEN, border: `1.5px solid ${GREEN}` }}>
            取消
          </button>
          <button onClick={save} disabled={saving}
            style={{ flex: 1.4, height: 50, borderRadius: 16, border: "none",
                     cursor: saving ? "default" : "pointer", fontSize: 15, fontWeight: 700,
                     background: saving ? "#C5C8CE" : GREEN, color: "#fff" }}>
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, required, optional, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px" }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, flexShrink: 0, minWidth: 76 }}>
        {label}
        {required && <span style={{ color: PRI, marginLeft: 2 }}>*</span>}
        {optional && <span style={{ color: SUB, fontWeight: 400, fontSize: 12 }}>（可选）</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "flex-end" }}>{children}</div>
    </div>
  );
}
function Divider() {
  return <div style={{ height: 1, background: "rgba(0,0,0,0.05)", margin: "0 16px" }} />;
}
function SLabel({ children, optional }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: "10px 2px 8px" }}>
      {children}{optional && <span style={{ color: SUB, fontWeight: 400, fontSize: 12 }}>（可选）</span>}
    </div>
  );
}

const textInput = {
  flex: 1, border: "none", outline: "none", background: "transparent", textAlign: "right",
  fontSize: 14, color: TEXT, fontFamily: "inherit", minWidth: 0,
};
const dateInput = {
  border: "none", outline: "none", background: "transparent", textAlign: "right",
  fontSize: 14, color: TEXT, fontFamily: "inherit",
};
