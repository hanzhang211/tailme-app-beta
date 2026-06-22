"use client";

/**
 * components/paw-planet/AddMemoryForm.jsx
 * 「添加回忆卡片」表单（回忆相册内部弹层）——梦幻紫星空视觉（仅样式/装饰，逻辑保持不变）。
 * 图片(必填) + 标题(必填) + 日期(可选,默认今天) + 分类(可选) + 描述(可选)。
 * 提交：上传图片 → 写 memorial_memories → onSaved(row)。
 * props: { petName, userId, petId, toast, onClose, onSaved }
 */

import { useRef, useState } from "react";
import { ImagePlus, Star, PawPrint, Cake, Gift, Heart, Sparkles } from "lucide-react";
import BackButton from "@/components/icons/BackButton";
import FloatingStars from "@/components/paw-planet/FloatingStars";
import { PLANET_PURPLE as P } from "@/components/paw-planet/PlanetDecor";
import { uploadMemoryImage, addMemory } from "@/services/memorialMemoryService";

const CATEGORIES = [
  { key: "daily", label: "日常", Icon: PawPrint },
  { key: "birthday", label: "生日", Icon: Cake },
  { key: "travel", label: "旅行", Icon: Gift },
  { key: "favorite", label: "最爱", Icon: Heart },
];

const todayStr = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/* 表单浅紫白玻璃输入框统一样式 */
const FIELD = {
  width: "100%", padding: "13px 15px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.5)",
  background: "rgba(248,245,255,0.92)", outline: "none", fontSize: 14, color: "#6F65B8",
  boxShadow: "0 6px 18px rgba(20,18,70,0.18)",
};

function FieldLabel({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: "#fff", margin: "18px 0 7px" }}>
      <Star size={13} color="#FFE89A" fill="#FFE89A" /> {children}
    </div>
  );
}

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
    <div style={{ position: "absolute", inset: 0, zIndex: 30, background: P.bg, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <FloatingStars />
      {/* 柔和爪印背景装饰（不挡交互） */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <PawPrint size={26} color="rgba(255,255,255,0.12)" style={{ position: "absolute", top: "30%", left: "5%" }} />
        <PawPrint size={20} color="rgba(255,255,255,0.1)" style={{ position: "absolute", top: "56%", right: "6%" }} />
        <PawPrint size={22} color="rgba(255,255,255,0.1)" style={{ position: "absolute", top: "74%", left: "9%" }} />
      </div>

      {/* header */}
      <div style={{ position: "relative", zIndex: 1, padding: "max(env(safe-area-inset-top), 28px) 16px 8px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <BackButton onClick={onClose} bg={P.glassBtn} color="#fff" border={false} shadow={false} />
        <div style={{ flex: 1, textAlign: "center", marginRight: 38, fontSize: 18, fontWeight: 800, color: "#fff" }}>
          添加回忆卡片 <Sparkles size={14} color="#FFE89A" style={{ verticalAlign: "middle", marginLeft: 2 }} />
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1, flex: 1, overflowY: "auto", padding: "8px 16px 22px" }}>
        {/* 图片（必填） */}
        <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} style={{ display: "none" }} />
        <button onClick={() => fileRef.current?.click()}
          style={{ width: "100%", aspectRatio: "4 / 3", borderRadius: 28, cursor: "pointer", overflow: "hidden",
                   border: preview ? "none" : "1.5px dashed rgba(185,167,244,0.85)",
                   background: preview ? "#000" : "rgba(248,245,255,0.9)",
                   boxShadow: "0 18px 60px rgba(20,18,70,0.28)",
                   display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
          {preview ? (
            <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "#6F65B8" }}>
              <ImagePlus size={34} color="#7466D8" strokeWidth={2.2} />
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>上传一张照片（必填）</span>
            </span>
          )}
        </button>
        {preview && (
          <button onClick={() => fileRef.current?.click()}
            style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: "#fff", background: "none", border: "none", cursor: "pointer" }}>
            重新选择图片
          </button>
        )}

        {/* 标题（必填） */}
        <FieldLabel>标题</FieldLabel>
        <input className="pp-mem-field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={30}
          placeholder="例如：第一次去公园 / 抱着睡觉的那天" style={FIELD} />

        {/* 日期（可选，默认今天） */}
        <FieldLabel>日期（可选）</FieldLabel>
        <input className="pp-mem-field" type="date" value={date} onChange={(e) => setDate(e.target.value)}
          style={{ ...FIELD, colorScheme: "light" }} />

        {/* 分类（可选，可不选） */}
        <FieldLabel>分类（可选，可不选）</FieldLabel>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {CATEGORIES.map((c) => {
            const on = category === c.key;
            const Icon = c.Icon;
            return (
              <button key={c.key} onClick={() => setCategory(on ? null : c.key)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 16px", borderRadius: 999, cursor: "pointer",
                         fontSize: 13, fontWeight: 700, color: "#fff",
                         background: on ? "linear-gradient(90deg,#B6A5FF,#8C7BF2)" : "rgba(255,255,255,0.2)",
                         border: `1px solid ${on ? "transparent" : "rgba(255,255,255,0.35)"}`,
                         boxShadow: on ? "0 4px 14px rgba(140,123,242,0.5)" : "none", backdropFilter: "blur(4px)" }}>
                <Icon size={14} color="#fff" /> {c.label}
              </button>
            );
          })}
        </div>

        {/* 描述（可选） */}
        <FieldLabel>描述（可选）</FieldLabel>
        <div style={{ position: "relative" }}>
          <textarea className="pp-mem-field" value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} maxLength={200}
            placeholder="那天阳光很好，它一直趴在我身边……"
            style={{ ...FIELD, borderRadius: 24, resize: "none", fontFamily: "inherit", lineHeight: 1.7 }} />
          <PawPrint size={18} color="rgba(140,123,216,0.4)" style={{ position: "absolute", right: 14, bottom: 12, pointerEvents: "none" }} />
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1, padding: "10px 16px 14px", flexShrink: 0 }}>
        <button onClick={submit} disabled={!canSave}
          style={{ width: "100%", padding: "16px 0", borderRadius: 28, border: "none",
                   cursor: canSave ? "pointer" : "default", opacity: canSave ? 1 : 0.55,
                   background: "linear-gradient(90deg,#8C7BF2,#A88CFF,#7466D8)", color: "#fff", fontSize: 15.5, fontWeight: 800,
                   display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                   boxShadow: "0 0 32px rgba(170,145,255,0.55)" }}>
          <Sparkles size={16} color="#fff" /> {saving ? "收藏中..." : "收藏进相册"}
        </button>
      </div>

      <style>{`.pp-mem-field::placeholder{ color:#A69BDA; opacity:1; }`}</style>
    </div>
  );
}
