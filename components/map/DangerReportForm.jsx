"use client";

/**
 * components/map/DangerReportForm.jsx
 * 「上报危险地点」独立页面（全屏浮层）。mock：本地预览图片 + 写入 pending。
 * 提交后展示成功反馈，进入审核（仅 admin 通过后才会出现在避雷地图）。
 */

import { useState } from "react";
import BackButton from "@/components/icons/BackButton";
import { DANGER_TYPES, RISK_LEVELS, submitDangerReport } from "@/services/dangerMock";

const C = {
  pri: "#E68645", danger: "#D9542B", dangerTint: "#FBE6DC", bg: "#EEE9E1", tint: "#F2E5DA",
  text: "#1A1006", sub: "#8A8074", border: "#E4DDD2",
};

export default function DangerReportForm({ location, onClose, onSubmitted }) {
  const [typeId, setTypeId] = useState(DANGER_TYPES[0].id);
  const [risk, setRisk] = useState("注意");
  const [addr, setAddr] = useState(location?.city ? `${location.city}（当前定位附近）` : "");
  const [desc, setDesc] = useState("");
  const [contact, setContact] = useState("");
  const [images, setImages] = useState([]); // 本地预览 URL
  const [done, setDone] = useState(false);

  const pickImages = (e) => {
    const files = Array.from(e.target.files || []);
    const urls = files.map((f) => URL.createObjectURL(f));
    setImages((prev) => [...prev, ...urls].slice(0, 5));
    e.target.value = "";
  };

  const useCurrent = () => setAddr(location?.city ? `${location.city}（当前定位附近）` : "当前定位附近");

  const submit = () => {
    const t = DANGER_TYPES.find((x) => x.id === typeId);
    submitDangerReport({
      typeId, risk, address: addr || "未填写地址", desc, contact, images,
      title: t.label, reporter: contact ? `用户 ${contact}` : "匿名用户",
      offset: [0.0012, 0.0009], distance: 0,
    });
    setDone(true);
    onSubmitted?.();
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
            感谢你的分享，会尽快处理 🐾<br />审核通过后将展示给附近宠物家长
          </div>
          <button onClick={onClose}
            style={{ marginTop: 26, padding: "12px 40px", borderRadius: 999, background: C.pri, color: "#fff",
                     fontSize: 15, fontWeight: 800, border: "none", cursor: "pointer" }}>
            完成
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell onClose={onClose}>
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 30px" }}>
        <Card>
          {/* 危险类型 */}
          <Label>危险类型</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
            {DANGER_TYPES.map((t) => {
              const on = typeId === t.id;
              return (
                <button key={t.id} onClick={() => setTypeId(t.id)}
                  style={{ padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: on ? 800 : 600,
                           cursor: "pointer", border: `1.5px solid ${on ? C.danger : C.border}`,
                           background: on ? C.danger : "#fff", color: on ? "#fff" : C.text }}>
                  {t.icon} {t.label}
                </button>
              );
            })}
          </div>

          {/* 风险等级 */}
          <Label>风险等级</Label>
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            {RISK_LEVELS.map((r) => {
              const on = risk === r;
              return (
                <button key={r} onClick={() => setRisk(r)}
                  style={{ flex: 1, padding: "9px 0", borderRadius: 12, fontSize: 13, fontWeight: on ? 800 : 600,
                           cursor: "pointer", border: `1.5px solid ${on ? C.pri : C.border}`,
                           background: on ? C.tint : "#fff", color: on ? C.pri : C.sub }}>
                  {r}
                </button>
              );
            })}
          </div>

          {/* 发生地点 */}
          <Label>发生地点</Label>
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            <input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="选择或输入地点定位"
              style={inputStyle} />
            <button onClick={useCurrent}
              style={{ flexShrink: 0, padding: "0 14px", borderRadius: 12, border: `1.5px solid ${C.border}`,
                       background: C.tint, color: C.pri, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              📍 当前
            </button>
          </div>

          {/* 事件说明 */}
          <Label>事件说明</Label>
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
                              justifyContent: "center", cursor: "pointer", color: C.sub }}>
                <span style={{ fontSize: 24, color: C.pri }}>＋</span>
                <input type="file" accept="image/*" multiple onChange={pickImages} style={{ display: "none" }} />
              </label>
            )}
          </div>
          <div style={{ fontSize: 11, color: C.sub, marginBottom: 18 }}>最多上传 5 张图片</div>

          {/* 联系方式（可选）*/}
          <Label>联系方式（可选）</Label>
          <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="仅用于管理员核实，不对外公开"
            style={{ ...inputStyle, marginBottom: 18 }} />

          {/* 提示 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.tint, borderRadius: 12,
                        padding: "11px 14px", fontSize: 12, color: "#9A6B3C", fontWeight: 600, lineHeight: 1.5 }}>
            🛡️ 提交后将进入审核，审核通过后才会展示给其他用户
          </div>
        </Card>
      </div>

      {/* 底部按钮 */}
      <div style={{ flexShrink: 0, display: "flex", gap: 12, background: "#fff", borderTop: `1px solid ${C.border}`,
                    padding: "12px 16px calc(12px + env(safe-area-inset-bottom))" }}>
        <button onClick={onClose}
          style={{ padding: "13px 26px", borderRadius: 999, fontSize: 15, fontWeight: 700, cursor: "pointer",
                   background: "#fff", color: C.text, border: `1.5px solid ${C.border}` }}>取消</button>
        <button onClick={submit}
          style={{ flex: 1, padding: "13px 0", borderRadius: 999, fontSize: 15, fontWeight: 800, cursor: "pointer",
                   background: C.pri, color: "#fff", border: "none", boxShadow: "0 4px 14px rgba(230,134,69,0.35)" }}>
          提交审核
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
        <div style={{ flex: 1, textAlign: "center", fontSize: 16, fontWeight: 800, color: C.text }}>上报危险地点</div>
        <div style={{ width: 36 }} />
      </div>
      {children}
    </div>
  );
}
function Card({ children }) {
  return <div style={{ background: "#fff", borderRadius: 20, padding: "18px 16px",
                       boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>{children}</div>;
}
function Label({ children }) {
  return <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 9 }}>{children}</div>;
}
const inputStyle = {
  width: "100%", borderRadius: 12, padding: "11px 13px", fontSize: 14, boxSizing: "border-box",
  border: `1.5px solid ${C.border}`, background: "#fff", color: C.text, outline: "none", fontFamily: "inherit",
};
