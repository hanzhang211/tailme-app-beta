"use client";

/**
 * components/map/FriendlyReportForm.jsx
 * 「上报友好地点」：第一步选地点(滴滴式搜索) → 第二步填友好内容。
 * v1：提交即展示（friendlyService 写 status='approved'）。
 */

import { useState } from "react";
import { submitFriendly, uploadFriendlyImage } from "@/services/friendlyService";
import PlacePicker from "./PlacePicker";
import { Shell, Success, Card, Label, inputStyle, ImageRow, AnonToggle, Footer } from "./DangerReportForm";

const C = { pri: "#E68645", bg: "#EEE9E1", tint: "#F2E5DA", text: "#1A1006", sub: "#8A8074", border: "#E4DDD2" };
const LS_KEY = "tailme_user_id";

const PERKS = [
  { key: "hasWaterBowl",   label: "提供水碗",   icon: "💧" },
  { key: "hasFoodBowl",    label: "提供喂食碗", icon: "🥣" },
  { key: "allowPetInside", label: "允许进店",   icon: "🚪" },
  { key: "goodForRest",    label: "适合休息",   icon: "🛋️" },
];

export default function FriendlyReportForm({ location, onClose, onSubmitted }) {
  const [step, setStep] = useState("place");
  const [place, setPlace] = useState(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [perks, setPerks] = useState({ hasWaterBowl: false, hasFoodBowl: false, allowPetInside: true, goodForRest: false });
  const [contact, setContact] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const pickImages = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 5 - images.length);
    e.target.value = ""; if (!files.length) return;
    setUploading(true); setErr("");
    try {
      const uid = (typeof window !== "undefined" && localStorage.getItem(LS_KEY)) || "anon";
      const urls = []; for (const f of files) urls.push(await uploadFriendlyImage(f, uid));
      setImages((p) => [...p, ...urls].slice(0, 5));
    } catch (e2) { setErr(e2.message || "图片上传失败"); }
    finally { setUploading(false); }
  };

  const submit = async () => {
    setErr("");
    if (!desc.trim()) { setErr("请填写友好内容"); return; }
    setBusy(true);
    try {
      const uid = (typeof window !== "undefined" && localStorage.getItem(LS_KEY)) || null;
      await submitFriendly({
        reporterUserId: uid,
        title: title.trim() || place?.placeName || "宠物友好地点",
        description: desc.trim(),
        placeName: place?.placeName || null, address: place?.address || null,
        latitude: place?.lat ?? location?.lat ?? null, longitude: place?.lng ?? location?.lng ?? null,
        images, contactInfo: contact.trim() || null, anonymous, ...perks,
      });
      setStep("done"); onSubmitted?.();
    } catch (e2) { setErr(e2.message || "提交失败"); }
    finally { setBusy(false); }
  };

  if (step === "done") {
    return <Shell title="上报友好地点" onClose={onClose}><Success text="已提交审核，审核通过后会展示给附近宠物家长 🐾" onClose={onClose} /></Shell>;
  }
  if (step === "place") {
    return (
      <Shell title="上报友好地点 · 选择地点" onClose={onClose}>
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 30px" }}>
          <div style={{ fontSize: 13, color: C.sub, marginBottom: 12 }}>先选择友好地点</div>
          <PlacePicker location={location} placeholder="搜索门店、小区或地址"
            onPick={(p) => { setPlace(p); setTitle(p.placeName || ""); setStep("details"); }} />
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="上报友好地点" onClose={onClose}>
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 30px" }}>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.bg, borderRadius: 12, padding: "11px 13px", marginBottom: 18 }}>
            <span style={{ fontSize: 16 }}>📍</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{place?.placeName}</div>
              <div style={{ fontSize: 11, color: C.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{place?.address}</div>
            </div>
            <button onClick={() => setStep("place")} style={{ background: "none", border: "none", color: C.pri, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>重选</button>
          </div>

          <Label>标题</Label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={30} placeholder="例如：暖爪咖啡可进店" style={{ ...inputStyle, marginBottom: 6 }} />
          <div style={{ fontSize: 11, color: C.sub, marginBottom: 18 }}>地图上显示前 6 个字，点开看完整</div>

          <Label>友好服务</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
            {PERKS.map((p) => {
              const on = perks[p.key];
              return <button key={p.key} onClick={() => setPerks((s) => ({ ...s, [p.key]: !s[p.key] }))}
                style={{ padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: on ? 800 : 600, cursor: "pointer",
                         border: `1.5px solid ${on ? C.pri : C.border}`, background: on ? C.tint : "#fff", color: on ? C.pri : C.sub }}>{p.icon} {p.label}</button>;
            })}
          </div>

          <Label>友好内容</Label>
          <div style={{ position: "relative", marginBottom: 18 }}>
            <textarea value={desc} maxLength={200} onChange={(e) => setDesc(e.target.value)}
              placeholder="比如：店员很友好，可以给狗狗水碗，允许小型犬进店"
              style={{ ...inputStyle, minHeight: 92, resize: "vertical", lineHeight: 1.6 }} />
            <span style={{ position: "absolute", right: 12, bottom: 8, fontSize: 11, color: C.sub }}>{desc.length}/200</span>
          </div>

          <Label>上传图片（可选）</Label>
          <ImageRow images={images} uploading={uploading} onPick={pickImages} onRemove={(i) => setImages((p) => p.filter((_, x) => x !== i))} />

          <Label>联系方式（可选）</Label>
          <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="仅管理员可见，不对外公开" style={{ ...inputStyle, marginBottom: 16 }} />

          <AnonToggle on={anonymous} onToggle={() => setAnonymous((v) => !v)} />
          {err && <div style={{ color: "#D9542B", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.tint, borderRadius: 12, padding: "11px 14px", fontSize: 12, color: "#9A6B3C", fontWeight: 600, lineHeight: 1.5 }}>
            🐾 提交后将进入审核，审核通过后会展示在友好地图
          </div>
        </Card>
      </div>
      <Footer onClose={onClose} onSubmit={submit} busy={busy || uploading} label="提交发布" />
    </Shell>
  );
}
