"use client";

/**
 * components/map/DangerReportForm.jsx
 * 「上报宠物警示」独立页面：第一步选地点(滴滴式搜索) → 第二步填事件。
 * 真实写库(status=pending) + 真实传图；用户不可选风险等级(由 admin 设定)。
 */

import { useState } from "react";
import BackButton from "@/components/icons/BackButton";
import { submitWarning, uploadWarningImage } from "@/services/warningService";
import PlacePicker from "./PlacePicker";

const C = {
  pri: "#E68645", danger: "#D9542B", bg: "#EEE9E1", tint: "#F2E5DA",
  text: "#1A1006", sub: "#8A8074", border: "#E4DDD2",
};
const LS_KEY = "tailme_user_id";

export default function DangerReportForm({ location, onClose, onSubmitted }) {
  const [step, setStep] = useState("place");   // place | details | done
  const [place, setPlace] = useState(null);    // { placeName, address, lat, lng }
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
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
      const urls = []; for (const f of files) urls.push(await uploadWarningImage(f, uid));
      setImages((p) => [...p, ...urls].slice(0, 5));
    } catch (e2) { setErr(e2.message || "图片上传失败"); }
    finally { setUploading(false); }
  };

  const submit = async () => {
    setErr("");
    if (!title.trim()) { setErr("请填写标题"); return; }
    if (!desc.trim()) { setErr("请填写事件描述"); return; }
    setBusy(true);
    try {
      const uid = (typeof window !== "undefined" && localStorage.getItem(LS_KEY)) || null;
      await submitWarning({
        reporterUserId: uid,
        title: title.trim(),
        eventType: "other",      // 用户不再选类型；由 admin 审核时归类 + 设风险等级
        description: desc.trim(), placeName: place?.placeName || null, address: place?.address || null,
        latitude: place?.lat ?? location?.lat ?? null, longitude: place?.lng ?? location?.lng ?? null,
        images, contactInfo: contact.trim() || null, anonymous,
      });
      setStep("done"); onSubmitted?.();
    } catch (e2) { setErr(e2.message || "提交失败"); }
    finally { setBusy(false); }
  };

  if (step === "done") {
    return (
      <Shell title="上报宠物警示" onClose={onClose}>
        <Success text="审核通过后会展示给附近宠物家长 🐾" onClose={onClose} />
      </Shell>
    );
  }

  if (step === "place") {
    return (
      <Shell title="上报宠物警示 · 选择地点" onClose={onClose}>
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 30px" }}>
          <div style={{ fontSize: 13, color: C.sub, marginBottom: 12 }}>先选择事件发生的地点</div>
          <PlacePicker location={location} placeholder="搜索门店、小区或地址"
            onPick={(p) => { setPlace(p); setStep("details"); }} />
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="上报宠物警示" onClose={onClose}>
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 30px" }}>
        <Card>
          {/* 已选地点 */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.bg, borderRadius: 12,
                        padding: "11px 13px", marginBottom: 18 }}>
            <span style={{ fontSize: 16 }}>📍</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{place?.placeName}</div>
              <div style={{ fontSize: 11, color: C.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{place?.address}</div>
            </div>
            <button onClick={() => setStep("place")} style={{ background: "none", border: "none", color: C.pri, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>重选</button>
          </div>

          <Label>标题</Label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={30}
            placeholder="给这个警示起个标题，如：路口车流快、绿化带有毒饵"
            style={{ ...inputStyle, marginBottom: 6 }} />
          <div style={{ fontSize: 11, color: C.sub, marginBottom: 18 }}>
            地图上显示前 6 个字，点开看完整 · 类型与风险等级由平台审核时判定
          </div>

          <Label>事件描述</Label>
          <div style={{ position: "relative", marginBottom: 18 }}>
            <textarea value={desc} maxLength={200} onChange={(e) => setDesc(e.target.value)}
              placeholder="请简单描述发生了什么，方便其他宠物家长避开"
              style={{ ...inputStyle, minHeight: 92, resize: "vertical", lineHeight: 1.6 }} />
            <span style={{ position: "absolute", right: 12, bottom: 8, fontSize: 11, color: C.sub }}>{desc.length}/200</span>
          </div>

          <Label>上传图片</Label>
          <ImageRow images={images} uploading={uploading} onPick={pickImages} onRemove={(i) => setImages((p) => p.filter((_, x) => x !== i))} />

          <Label>联系方式（可选）</Label>
          <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="仅管理员核实可见，不对外公开" style={{ ...inputStyle, marginBottom: 16 }} />

          <AnonToggle on={anonymous} onToggle={() => setAnonymous((v) => !v)} />

          {err && <div style={{ color: C.danger, fontSize: 12.5, marginBottom: 10 }}>{err}</div>}
          <Tip />
        </Card>
      </div>
      <Footer onClose={onClose} onSubmit={submit} busy={busy || uploading} />
    </Shell>
  );
}

/* ── 复用小件 ─────────────────────────────────────────── */
export function Shell({ title, children, onClose }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 80, background: C.bg, display: "flex", flexDirection: "column", animation: "tm-up .24s ease-out" }}>
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 10, background: "#fff", borderBottom: `1px solid ${C.border}`, padding: "52px 14px 12px" }}>
        <BackButton onClick={onClose} size={36} />
        <div style={{ flex: 1, textAlign: "center", fontSize: 16, fontWeight: 800, color: C.text }}>{title}</div>
        <div style={{ width: 36 }} />
      </div>
      {children}
    </div>
  );
}
export function Success({ text, onClose }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 30px", textAlign: "center" }}>
      <div style={{ width: 84, height: 84, borderRadius: "50%", background: "#FBEFE0", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill={C.pri} opacity="0.15" />
          <path d="M7 12.5 L10.5 16 L17 8.5" stroke={C.pri} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div style={{ fontSize: 19, fontWeight: 800, color: C.text }}>已提交</div>
      <div style={{ fontSize: 13, color: C.sub, marginTop: 8, lineHeight: 1.7 }}>{text}</div>
      <button onClick={onClose} style={{ marginTop: 26, padding: "12px 40px", borderRadius: 999, background: C.pri, color: "#fff", fontSize: 15, fontWeight: 800, border: "none", cursor: "pointer" }}>完成</button>
    </div>
  );
}
export function Card({ children }) { return <div style={{ background: "#fff", borderRadius: 20, padding: "18px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>{children}</div>; }
export function Label({ children }) { return <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 9 }}>{children}</div>; }
export const inputStyle = { width: "100%", borderRadius: 12, padding: "11px 13px", fontSize: 14, boxSizing: "border-box", border: `1.5px solid ${C.border}`, background: "#fff", color: C.text, outline: "none", fontFamily: "inherit" };
export function ImageRow({ images, uploading, onPick, onRemove }) {
  return (
    <>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
        {images.map((u, i) => (
          <div key={i} style={{ position: "relative", width: 84, height: 84, borderRadius: 14, overflow: "hidden" }}>
            <img src={u} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <span onClick={() => onRemove(i)} style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>×</span>
          </div>
        ))}
        {images.length < 5 && (
          <label style={{ width: 84, height: 84, borderRadius: 14, border: `1.5px dashed ${C.border}`, background: C.tint, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: uploading ? "wait" : "pointer", color: C.sub }}>
            <span style={{ fontSize: 22, color: C.pri }}>{uploading ? "…" : "＋"}</span>
            <span style={{ fontSize: 10, marginTop: 2 }}>{uploading ? "上传中" : "添加"}</span>
            <input type="file" accept="image/*" multiple disabled={uploading} onChange={onPick} style={{ display: "none" }} />
          </label>
        )}
      </div>
      <div style={{ fontSize: 11, color: C.sub, marginBottom: 18 }}>最多上传 5 张图片</div>
    </>
  );
}
export function AnonToggle({ on, onToggle }) {
  return (
    <button onClick={onToggle} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: C.bg, borderRadius: 12, padding: "12px 14px", border: "none", cursor: "pointer", marginBottom: 16 }}>
      <span style={{ textAlign: "left" }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>匿名展示</span>
        <span style={{ display: "block", fontSize: 11, color: C.sub, marginTop: 2 }}>开启后展示为「匿名用户」</span>
      </span>
      <span style={{ width: 44, height: 26, borderRadius: 999, background: on ? C.pri : "#CFC6B8", position: "relative", transition: "background .2s", flexShrink: 0 }}>
        <span style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
      </span>
    </button>
  );
}
export function Tip() {
  return <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.tint, borderRadius: 12, padding: "11px 14px", fontSize: 12, color: "#9A6B3C", fontWeight: 600, lineHeight: 1.5 }}>🛡️ 提交后将进入审核，审核通过后会展示给附近宠物家长</div>;
}
export function Footer({ onClose, onSubmit, busy, label = "提交审核" }) {
  return (
    <div style={{ flexShrink: 0, display: "flex", gap: 12, background: "#fff", borderTop: `1px solid ${C.border}`, padding: "12px 16px calc(12px + env(safe-area-inset-bottom))" }}>
      <button onClick={onClose} style={{ padding: "13px 26px", borderRadius: 999, fontSize: 15, fontWeight: 700, cursor: "pointer", background: "#fff", color: C.text, border: `1.5px solid ${C.border}` }}>取消</button>
      <button onClick={onSubmit} disabled={busy} style={{ flex: 1, padding: "13px 0", borderRadius: 999, fontSize: 15, fontWeight: 800, cursor: busy ? "default" : "pointer", background: busy ? "#E5D8C8" : C.pri, color: "#fff", border: "none", boxShadow: busy ? "none" : "0 4px 14px rgba(230,134,69,0.35)" }}>{busy ? "提交中…" : label}</button>
    </div>
  );
}
