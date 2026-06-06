"use client";

/**
 * components/map/DangerReportForm.jsx
 * 「上报宠物警示」独立页面（全屏浮层）。真实写库 + 真实传图。
 *  - 事件类型：分组 chips（选大类 → 展开子项）；「其他」可补充说明
 *  - 用户不可选风险等级（由 admin 审核设定）
 *  - 匿名展示开关（默认匿名）
 *  - 图片真实上传到 Supabase Storage（pet-warning-reports）
 *  - 提交 status=pending，审核通过后才展示
 */

import { useState } from "react";
import BackButton from "@/components/icons/BackButton";
import { WARNING_GROUPS, typeInfo } from "@/services/warningTypes";
import { submitWarning, uploadWarningImage } from "@/services/warningService";

const C = {
  pri: "#E68645", danger: "#D9542B", dangerTint: "#FBE6DC", bg: "#EEE9E1", tint: "#F2E5DA",
  text: "#1A1006", sub: "#8A8074", border: "#E4DDD2",
};
const LS_KEY = "tailme_user_id";

export default function DangerReportForm({ location, onClose, onSubmitted }) {
  const [groupId, setGroupId] = useState(WARNING_GROUPS[0].id);
  const [eventType, setEventType] = useState(WARNING_GROUPS[0].types[0].id);
  const [otherText, setOtherText] = useState("");
  const [addr, setAddr] = useState(location?.city ? `${location.city}（当前定位附近）` : "");
  const [desc, setDesc] = useState("");
  const [contact, setContact] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [images, setImages] = useState([]);     // 已上传的 public url
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const group = WARNING_GROUPS.find((g) => g.id === groupId) || WARNING_GROUPS[0];
  const isOther = eventType === "other";

  const pickGroup = (gid) => {
    setGroupId(gid);
    const g = WARNING_GROUPS.find((x) => x.id === gid);
    setEventType(g.types[0].id);
  };

  const pickImages = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 5 - images.length);
    e.target.value = "";
    if (!files.length) return;
    setUploading(true); setErr("");
    try {
      const uid = (typeof window !== "undefined" && localStorage.getItem(LS_KEY)) || "anon";
      const urls = [];
      for (const f of files) urls.push(await uploadWarningImage(f, uid));
      setImages((prev) => [...prev, ...urls].slice(0, 5));
    } catch (e2) { setErr(e2.message || "图片上传失败"); }
    finally { setUploading(false); }
  };

  const useCurrent = () => setAddr(location?.city ? `${location.city}（当前定位附近）` : "当前定位附近");

  const submit = async () => {
    setErr("");
    if (isOther && !otherText.trim()) { setErr("请补充「其他」的简短说明"); return; }
    if (!desc.trim()) { setErr("请填写事件描述"); return; }
    setBusy(true);
    try {
      const uid = (typeof window !== "undefined" && localStorage.getItem(LS_KEY)) || null;
      await submitWarning({
        reporterUserId: uid,
        title: isOther ? otherText.trim() : typeInfo(eventType).label,
        eventType,
        eventTypeOther: isOther ? otherText.trim() : null,
        description: desc.trim(),
        address: addr || null,
        latitude: location?.lat ?? null,
        longitude: location?.lng ?? null,
        images,
        contactInfo: contact.trim() || null,
        anonymous,
      });
      setDone(true);
      onSubmitted?.();
    } catch (e2) { setErr(e2.message || "提交失败"); }
    finally { setBusy(false); }
  };

  if (done) {
    return (
      <Shell onClose={onClose}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                      justifyContent: "center", padding: "0 30px", textAlign: "center" }}>
          <div style={{ width: 84, height: 84, borderRadius: "50%", background: "#FBEFE0",
                        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill={C.pri} opacity="0.15" />
              <path d="M7 12.5 L10.5 16 L17 8.5" stroke={C.pri} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, color: C.text }}>已提交审核</div>
          <div style={{ fontSize: 13, color: C.sub, marginTop: 8, lineHeight: 1.7 }}>
            审核通过后会展示给附近宠物家长 🐾<br />感谢你的分享
          </div>
          <button onClick={onClose}
            style={{ marginTop: 26, padding: "12px 40px", borderRadius: 999, background: C.pri, color: "#fff",
                     fontSize: 15, fontWeight: 800, border: "none", cursor: "pointer" }}>完成</button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell onClose={onClose}>
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 30px" }}>
        <Card>
          {/* 事件类型：大类 */}
          <Label>事件类型</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {WARNING_GROUPS.map((g) => {
              const on = groupId === g.id;
              return (
                <button key={g.id} onClick={() => pickGroup(g.id)}
                  style={{ padding: "8px 13px", borderRadius: 999, fontSize: 13, fontWeight: on ? 800 : 600,
                           cursor: "pointer", border: `1.5px solid ${on ? C.danger : C.border}`,
                           background: on ? C.danger : "#fff", color: on ? "#fff" : C.text }}>
                  {g.icon} {g.label}
                </button>
              );
            })}
          </div>
          {/* 事件类型：子项 */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: isOther ? 10 : 18 }}>
            {group.types.map((t) => {
              const on = eventType === t.id;
              return (
                <button key={t.id} onClick={() => setEventType(t.id)}
                  style={{ padding: "7px 13px", borderRadius: 999, fontSize: 12.5, fontWeight: on ? 800 : 600,
                           cursor: "pointer", border: `1.5px solid ${on ? C.pri : C.border}`,
                           background: on ? C.tint : "#fff", color: on ? C.pri : C.sub }}>
                  {t.label}
                </button>
              );
            })}
          </div>
          {isOther && (
            <input value={otherText} onChange={(e) => setOtherText(e.target.value)} maxLength={30}
              placeholder="请简短补充是什么风险" style={{ ...inputStyle, marginBottom: 18 }} />
          )}

          {/* 发生地点 */}
          <Label>发生地点</Label>
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            <input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="选择或输入地点"
              style={inputStyle} />
            <button onClick={useCurrent}
              style={{ flexShrink: 0, padding: "0 14px", borderRadius: 12, border: `1.5px solid ${C.border}`,
                       background: C.tint, color: C.pri, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>📍 当前</button>
          </div>

          {/* 事件描述 */}
          <Label>事件描述</Label>
          <div style={{ position: "relative", marginBottom: 18 }}>
            <textarea value={desc} maxLength={200} onChange={(e) => setDesc(e.target.value)}
              placeholder="请简单描述发生了什么，方便其他宠物家长避开"
              style={{ ...inputStyle, minHeight: 92, resize: "vertical", lineHeight: 1.6 }} />
            <span style={{ position: "absolute", right: 12, bottom: 8, fontSize: 11, color: C.sub }}>{desc.length}/200</span>
          </div>

          {/* 上传图片 */}
          <Label>上传图片</Label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
            {images.map((u, i) => (
              <div key={i} style={{ position: "relative", width: 84, height: 84, borderRadius: 14, overflow: "hidden" }}>
                <img src={u} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <span onClick={() => setImages((p) => p.filter((_, x) => x !== i))}
                  style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%",
                           background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 13, display: "flex",
                           alignItems: "center", justifyContent: "center", cursor: "pointer" }}>×</span>
              </div>
            ))}
            {images.length < 5 && (
              <label style={{ width: 84, height: 84, borderRadius: 14, border: `1.5px dashed ${C.border}`,
                              background: C.tint, display: "flex", flexDirection: "column", alignItems: "center",
                              justifyContent: "center", cursor: uploading ? "wait" : "pointer", color: C.sub }}>
                <span style={{ fontSize: 22, color: C.pri }}>{uploading ? "…" : "＋"}</span>
                <span style={{ fontSize: 10, marginTop: 2 }}>{uploading ? "上传中" : "添加"}</span>
                <input type="file" accept="image/*" multiple disabled={uploading} onChange={pickImages} style={{ display: "none" }} />
              </label>
            )}
          </div>
          <div style={{ fontSize: 11, color: C.sub, marginBottom: 18 }}>最多上传 5 张图片</div>

          {/* 联系方式（可选）*/}
          <Label>联系方式（可选）</Label>
          <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="仅管理员核实可见，不对外公开"
            style={{ ...inputStyle, marginBottom: 16 }} />

          {/* 匿名开关 */}
          <button onClick={() => setAnonymous((v) => !v)}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                     background: C.bg, borderRadius: 12, padding: "12px 14px", border: "none", cursor: "pointer", marginBottom: 16 }}>
            <span style={{ textAlign: "left" }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>匿名展示</span>
              <span style={{ display: "block", fontSize: 11, color: C.sub, marginTop: 2 }}>开启后仅显示脱敏用户号为「匿名用户」</span>
            </span>
            <span style={{ width: 44, height: 26, borderRadius: 999, background: anonymous ? C.pri : "#CFC6B8",
                           position: "relative", transition: "background .2s", flexShrink: 0 }}>
              <span style={{ position: "absolute", top: 3, left: anonymous ? 21 : 3, width: 20, height: 20,
                             borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
            </span>
          </button>

          {err && <div style={{ color: C.danger, fontSize: 12.5, marginBottom: 10 }}>{err}</div>}

          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.tint, borderRadius: 12,
                        padding: "11px 14px", fontSize: 12, color: "#9A6B3C", fontWeight: 600, lineHeight: 1.5 }}>
            🛡️ 提交后将进入审核，审核通过后会展示给附近宠物家长
          </div>
        </Card>
      </div>

      <div style={{ flexShrink: 0, display: "flex", gap: 12, background: "#fff", borderTop: `1px solid ${C.border}`,
                    padding: "12px 16px calc(12px + env(safe-area-inset-bottom))" }}>
        <button onClick={onClose}
          style={{ padding: "13px 26px", borderRadius: 999, fontSize: 15, fontWeight: 700, cursor: "pointer",
                   background: "#fff", color: C.text, border: `1.5px solid ${C.border}` }}>取消</button>
        <button onClick={submit} disabled={busy || uploading}
          style={{ flex: 1, padding: "13px 0", borderRadius: 999, fontSize: 15, fontWeight: 800,
                   cursor: busy || uploading ? "default" : "pointer",
                   background: busy || uploading ? "#E5D8C8" : C.pri, color: "#fff", border: "none",
                   boxShadow: busy ? "none" : "0 4px 14px rgba(230,134,69,0.35)" }}>
          {busy ? "提交中…" : "提交审核"}
        </button>
      </div>
    </Shell>
  );
}

function Shell({ children, onClose }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 80, background: C.bg, display: "flex", flexDirection: "column",
                  animation: "tm-up .24s ease-out" }}>
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 10, background: "#fff",
                    borderBottom: `1px solid ${C.border}`, padding: "52px 14px 12px" }}>
        <BackButton onClick={onClose} size={36} />
        <div style={{ flex: 1, textAlign: "center", fontSize: 16, fontWeight: 800, color: C.text }}>上报宠物警示</div>
        <div style={{ width: 36 }} />
      </div>
      {children}
    </div>
  );
}
function Card({ children }) {
  return <div style={{ background: "#fff", borderRadius: 20, padding: "18px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>{children}</div>;
}
function Label({ children }) {
  return <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 9 }}>{children}</div>;
}
const inputStyle = {
  width: "100%", borderRadius: 12, padding: "11px 13px", fontSize: 14, boxSizing: "border-box",
  border: `1.5px solid ${C.border}`, background: "#fff", color: C.text, outline: "none", fontFamily: "inherit",
};
