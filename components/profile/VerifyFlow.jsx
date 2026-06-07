"use client";

/**
 * components/profile/VerifyFlow.jsx
 * 「资料认证」全屏浮层：说明 + 示例 + 宠物证明材料(1-5) + 同框认证照(1) + 联系方式 → 提交。
 * 提交成功显示成功页。图片经 service_role API 传到私有 bucket，仅本人/admin 可见。
 * rejected 状态可重新提交（顶部显示驳回原因）。
 */

import { useRef, useState } from "react";
import BackButton from "@/components/icons/BackButton";
import { uploadVerifyImage, submitVerification } from "@/services/verificationService";

const C = { pri: "#E68645", tint: "#F2E5DA", warm: "#FBE6D4", bg: "#EEE9E1", text: "#1A1006", sub: "#8A8074", border: "#E4DDD2" };

function Label({ children, hint }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <span style={{ fontSize: 14.5, fontWeight: 800, color: C.text }}>{children}</span>
      {hint && <span style={{ fontSize: 11.5, color: C.sub, marginLeft: 8 }}>{hint}</span>}
    </div>
  );
}

/* 示例占位卡（温和 SVG，无真实图） */
function SampleDoc() {
  return (
    <svg width="100%" height="92" viewBox="0 0 160 92" fill="none">
      <rect width="160" height="92" rx="10" fill="#F4ECDD" />
      <rect x="34" y="18" width="92" height="56" rx="6" fill="#fff" stroke="#E0CDB0" strokeWidth="2" />
      <rect x="44" y="28" width="30" height="22" rx="3" fill="#F2D9B4" />
      <rect x="80" y="30" width="36" height="4.5" rx="2.2" fill="#D9C09A" />
      <rect x="80" y="40" width="28" height="4.5" rx="2.2" fill="#E4D2B2" />
      <rect x="44" y="58" width="72" height="4.5" rx="2.2" fill="#E4D2B2" />
      <circle cx="124" cy="64" r="9" fill="none" stroke="#E68645" strokeWidth="2" opacity="0.6" />
    </svg>
  );
}
function SampleSelfie() {
  return (
    <svg width="100%" height="92" viewBox="0 0 160 92" fill="none">
      <rect width="160" height="92" rx="10" fill="#F7E6D2" />
      <circle cx="62" cy="40" r="15" fill="#F4C99B" />
      <path d="M44 78c0-11 8-18 18-18s18 7 18 18Z" fill="#EBB07A" />
      <path d="M58 30l-2-8m8 8l1-8" stroke="#C77B3C" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="104" cy="58" rx="16" ry="14" fill="#D9A06A" />
      <circle cx="98" cy="48" r="5" fill="#D9A06A" /><circle cx="112" cy="49" r="5" fill="#D9A06A" />
      <circle cx="100" cy="56" r="1.5" fill="#5A3B22" /><circle cx="108" cy="56" r="1.5" fill="#5A3B22" />
      <text x="78" y="30" fontSize="16" fontWeight="800" fill="#E68645">✌️</text>
    </svg>
  );
}

function AddBox({ onPick, busy, small }) {
  const ref = useRef();
  return (
    <>
      <button onClick={() => !busy && ref.current?.click()} disabled={busy}
        style={{ width: small ? 92 : 84, height: small ? 92 : 84, borderRadius: 14, cursor: busy ? "default" : "pointer",
                 border: `1.6px dashed ${C.pri}`, background: "#FFFDFB", color: C.pri,
                 display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, flexShrink: 0 }}>
        {busy ? "…" : "＋"}
      </button>
      <input ref={ref} type="file" accept="image/*" multiple={!small} style={{ display: "none" }}
        onChange={(e) => { const fs = Array.from(e.target.files || []); e.target.value = ""; if (fs.length) onPick(fs); }} />
    </>
  );
}

function Thumb({ url, onRemove }) {
  return (
    <div style={{ position: "relative", width: 84, height: 84, borderRadius: 14, overflow: "hidden", flexShrink: 0 }}>
      <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <button onClick={onRemove}
        style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: "50%", border: "none",
                 background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 13, cursor: "pointer", lineHeight: 1 }}>×</button>
    </div>
  );
}

export default function VerifyFlow({ user, rejectedReason, onClose, onSubmitted }) {
  const userId = user?.id || null;
  const [docs, setDocs] = useState([]);       // [{ url, path }]
  const [selfie, setSelfie] = useState(null); // { url, path }
  const [contact, setContact] = useState("");
  const [busyDoc, setBusyDoc] = useState(false);
  const [busySelfie, setBusySelfie] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const pickDocs = async (files) => {
    setErr(""); setBusyDoc(true);
    try {
      const room = 5 - docs.length;
      for (const f of files.slice(0, room)) {
        const url = URL.createObjectURL(f);
        const path = await uploadVerifyImage(f, userId);
        setDocs((p) => [...p, { url, path }].slice(0, 5));
      }
    } catch (e) { setErr(e.message || "上传失败"); }
    finally { setBusyDoc(false); }
  };

  const pickSelfie = async (files) => {
    setErr(""); setBusySelfie(true);
    try {
      const f = files[0];
      const url = URL.createObjectURL(f);
      const path = await uploadVerifyImage(f, userId);
      setSelfie({ url, path });
    } catch (e) { setErr(e.message || "上传失败"); }
    finally { setBusySelfie(false); }
  };

  const submit = async () => {
    setErr("");
    if (docs.length === 0) { setErr("请至少上传 1 张宠物证明材料"); return; }
    if (!selfie) { setErr("请上传同框认证照片"); return; }
    setSubmitting(true);
    try {
      await submitVerification({
        userId, documentPaths: docs.map((d) => d.path), selfiePath: selfie.path, contactInfo: contact.trim() || null,
      });
      setDone(true);
      onSubmitted?.();
    } catch (e) { setErr(e.message || "提交失败"); }
    finally { setSubmitting(false); }
  };

  /* ── 提交成功页 ── */
  if (done) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 2200, background: C.bg, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "calc(env(safe-area-inset-top) + 12px) 16px 12px", display: "flex", alignItems: "center" }}>
          <BackButton onClick={onClose} size={34} />
          <div style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: 800, color: C.text }}>资料认证</div>
          <div style={{ width: 34 }} />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 40px", textAlign: "center" }}>
          <div style={{ width: 96, height: 96, borderRadius: "50%", background: C.warm, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M5 12.5l4.2 4.2L19 7" stroke={C.pri} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ fontSize: 21, fontWeight: 800, color: C.text, marginBottom: 12 }}>已提交认证</div>
          <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.7, marginBottom: 34 }}>
            我们会在 1-3 个工作日内完成审核，<br />审核结果将通过消息通知你。
          </div>
          <button onClick={onClose}
            style={{ width: "100%", maxWidth: 320, padding: "13px 0", borderRadius: 999, border: "none",
                     background: C.pri, color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
            我知道了
          </button>
        </div>
      </div>
    );
  }

  /* ── 认证表单页 ── */
  const card = { background: "#fff", borderRadius: 18, padding: "16px 16px", marginBottom: 14, boxShadow: "0 2px 14px rgba(0,0,0,0.05)" };
  const inputStyle = { width: "100%", borderRadius: 12, padding: "12px 14px", fontSize: 14, border: `1.4px solid ${C.border}`,
                       background: "#fff", boxSizing: "border-box", color: C.text, outline: "none" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2200, background: C.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "calc(env(safe-area-inset-top) + 12px) 16px 10px", display: "flex", alignItems: "center", background: C.bg }}>
        <BackButton onClick={onClose} size={34} />
        <div style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: 800, color: C.text }}>资料认证</div>
        <div style={{ width: 34 }} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 14px calc(100px + env(safe-area-inset-bottom))" }}>
        {/* 驳回原因（重新提交时） */}
        {rejectedReason && (
          <div style={{ background: "#FBDAD7", borderRadius: 14, padding: "12px 14px", marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "#C0392B", fontWeight: 800, marginBottom: 4 }}>上次认证未通过</div>
            <div style={{ fontSize: 13, color: "#7A2218", lineHeight: 1.6 }}>{rejectedReason}</div>
          </div>
        )}

        {/* 说明卡 */}
        <div style={{ ...card, background: C.warm }}>
          <div style={{ fontSize: 13.5, color: "#8A5A2E", lineHeight: 1.7 }}>
            为了保护宠物家长和毛孩子的安全，使用遛弯、上传宠物友好地点、宠物警示等功能前，需要先完成资料认证。
          </div>
        </div>

        {/* 示例区 */}
        <div style={card}>
          <Label>示例参考</Label>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <SampleDoc />
              <div style={{ fontSize: 11, color: C.sub, textAlign: "center", marginTop: 6 }}>宠物疫苗本示例</div>
            </div>
            <div style={{ flex: 1 }}>
              <SampleSelfie />
              <div style={{ fontSize: 11, color: C.sub, textAlign: "center", marginTop: 6 }}>手比数字 2 的同框照示例</div>
            </div>
          </div>
        </div>

        {/* 上传区 1：宠物证明材料 */}
        <div style={card}>
          <Label hint="1-5 张">1. 宠物证明材料</Label>
          <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 12 }}>可上传疫苗本、犬证、猫证、免疫证明等材料</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {docs.map((d, i) => <Thumb key={i} url={d.url} onRemove={() => setDocs((p) => p.filter((_, x) => x !== i))} />)}
            {docs.length < 5 && <AddBox onPick={pickDocs} busy={busyDoc} />}
          </div>
        </div>

        {/* 上传区 2：同框认证照 */}
        <div style={card}>
          <Label hint="1 张">2. 同框认证照片</Label>
          <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 4 }}>请上传你和宠物的同框照片，并用手比出数字 2</div>
          <div style={{ fontSize: 11.5, color: C.pri, marginBottom: 12 }}>这张照片只用于审核，不会展示给其他用户</div>
          <div style={{ display: "flex", gap: 10 }}>
            {selfie ? <Thumb url={selfie.url} onRemove={() => setSelfie(null)} />
                    : <AddBox onPick={pickSelfie} busy={busySelfie} small />}
          </div>
        </div>

        {/* 联系方式 */}
        <div style={card}>
          <Label hint="可选">联系方式</Label>
          <input value={contact} onChange={(e) => setContact(e.target.value)}
            placeholder="请输入手机号或微信号，仅后台可见" style={inputStyle} />
        </div>

        {/* 底部三提示 */}
        <div style={{ display: "flex", gap: 8, padding: "4px 2px 2px" }}>
          {[["🔒", "资料仅用于审核"], ["🏅", "认证通过有标识"], ["🕒", "审核 1-3 个工作日"]].map(([ic, t]) => (
            <div key={t} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 18 }}>{ic}</div>
              <div style={{ fontSize: 10.5, color: C.sub, marginTop: 4, lineHeight: 1.3 }}>{t}</div>
            </div>
          ))}
        </div>

        {err && <div style={{ color: "#D9542B", fontSize: 12.5, marginTop: 12, textAlign: "center" }}>{err}</div>}
      </div>

      {/* 提交 */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0,
                    padding: "12px 16px calc(14px + env(safe-area-inset-bottom))", background: C.bg, borderTop: `1px solid ${C.border}` }}>
        <button onClick={submit} disabled={submitting || busyDoc || busySelfie}
          style={{ width: "100%", padding: "14px 0", borderRadius: 999, border: "none",
                   background: C.pri, color: "#fff", fontSize: 15.5, fontWeight: 800,
                   cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.7 : 1 }}>
          {submitting ? "提交中…" : "提交认证"}
        </button>
      </div>
    </div>
  );
}
