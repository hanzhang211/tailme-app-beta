"use client";

/**
 * components/paw-planet/AddMemoryForm.jsx
 * 「添加回忆卡片」表单（回忆相册内部弹层）。
 * 图片(必填) + 标题(必填) + 日期(可选,默认今天) + 分类(可选) + 描述(可选)。
 * 提交：上传图片 → 写 memorial_memories → onSaved(row)。
 * props: { petName, userId, petId, toast, onClose, onSaved }
 */

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import BackButton from "@/components/icons/BackButton";
import { PLANET_C as C } from "@/lib/pawPlanetMock";
import { uploadMemoryImage, addMemory } from "@/services/memorialMemoryService";

const CATEGORIES = [
  { key: "daily", label: "日常" },
  { key: "birthday", label: "生日" },
  { key: "travel", label: "旅行" },
  { key: "favorite", label: "最爱" },
];

const todayStr = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export default function AddMemoryForm({ petName = "毛孩子", userId, petId, toast, onClose, onSaved }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayStr());
  const [category, setCategory] = useState(null);
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type?.startsWith("image/")) { toast?.("请选择图片文件"); return; }
    setFile(f);
    try { setPreview(URL.createObjectURL(f)); } catch { setPreview(null); }
  };

  const canSave = !!file && title.trim().length > 0 && !saving;

  const submit = async () => {
    if (!file) { toast?.("请先上传一张照片"); return; }
    if (!title.trim()) { toast?.("给这段回忆起个标题吧～"); return; }
    if (saving) return;
    setSaving(true);
    try {
      const imageUrl = await uploadMemoryImage(file, userId, petId);
      const row = await addMemory({ userId, petId, title, description: desc, imageUrl, memoryDate: date || null, category });
      onSaved?.(row);
      toast?.("回忆已收藏进相册啦");
      setTimeout(() => onClose?.(), 500);
    } catch (e) {
      toast?.(e?.message || "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 30, background: "#F4ECE0", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "max(env(safe-area-inset-top), 28px) 16px 8px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <BackButton onClick={onClose} />
        <div style={{ flex: 1, textAlign: "center", marginRight: 38, fontSize: 17, fontWeight: 800, color: C.text }}>添加回忆卡片</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 20px" }}>
        {/* 图片（必填） */}
        <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} style={{ display: "none" }} />
        <button onClick={() => fileRef.current?.click()}
          style={{ width: "100%", aspectRatio: "4 / 3", borderRadius: 18, cursor: "pointer", overflow: "hidden",
                   border: preview ? "none" : `1.5px dashed ${C.border}`, background: preview ? "#000" : "#fff",
                   display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
          {preview ? (
            <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: C.sub }}>
              <ImagePlus size={32} color={C.pri} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>上传一张照片（必填）</span>
            </span>
          )}
        </button>
        {preview && (
          <button onClick={() => fileRef.current?.click()}
            style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: C.pri, background: "none", border: "none", cursor: "pointer" }}>
            重新选择图片
          </button>
        )}

        {/* 标题（必填） */}
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.sub, margin: "16px 0 6px" }}>标题</div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={30}
          placeholder="例如：第一次去公园 / 抱着睡觉的那天"
          style={{ width: "100%", padding: "12px 14px", borderRadius: 14, border: `1px solid ${C.border}`,
                   background: "#fff", outline: "none", fontSize: 14, color: C.text }} />

        {/* 日期（可选，默认今天） */}
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.sub, margin: "16px 0 6px" }}>日期（可选）</div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          style={{ width: "100%", padding: "12px 14px", borderRadius: 14, border: `1px solid ${C.border}`,
                   background: "#fff", outline: "none", fontSize: 14, color: C.text }} />

        {/* 分类（可选，可不选） */}
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.sub, margin: "16px 0 6px" }}>分类（可选，可不选）</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {CATEGORIES.map((c) => {
            const on = category === c.key;
            return (
              <button key={c.key} onClick={() => setCategory(on ? null : c.key)}
                style={{ padding: "8px 16px", borderRadius: 14, cursor: "pointer", fontSize: 13, fontWeight: 700,
                         background: on ? C.pri : "#fff", color: on ? "#fff" : C.sub,
                         border: `1px solid ${on ? C.pri : C.border}` }}>
                {c.label}
              </button>
            );
          })}
        </div>

        {/* 描述（可选） */}
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.sub, margin: "16px 0 6px" }}>描述（可选）</div>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} maxLength={200}
          placeholder="那天阳光很好，它一直趴在我身边……"
          style={{ width: "100%", padding: "12px 14px", borderRadius: 14, border: `1px solid ${C.border}`,
                   background: "#fff", outline: "none", fontSize: 14, color: C.text, resize: "none", fontFamily: "inherit", lineHeight: 1.7 }} />
      </div>

      <div style={{ padding: "10px 16px 14px", flexShrink: 0 }}>
        <button onClick={submit} disabled={!canSave}
          style={{ width: "100%", padding: "15px 0", borderRadius: 16, border: "none",
                   cursor: canSave ? "pointer" : "default", opacity: canSave ? 1 : 0.55,
                   background: C.pri, color: "#fff", fontSize: 15.5, fontWeight: 800,
                   boxShadow: "0 6px 18px rgba(230,134,69,0.32)" }}>
          {saving ? "收藏中..." : "收藏进相册"}
        </button>
      </div>
    </div>
  );
}
