"use client";

/**
 * components/profile/VerifyGateModal.jsx
 * 未认证用户尝试使用「遛弯 / 上传友好地点 / 上传宠物警示」时的拦截弹窗。
 * 文案随认证状态变化：unverified→去认证；pending→审核中（仅确定）；rejected→重新提交。
 */

const C = { pri: "#E68645", bg: "#EEE9E1", text: "#1A1006", sub: "#8A8074", border: "#E4DDD2" };

export default function VerifyGateModal({ status = "unverified", onClose, onGoVerify }) {
  const isPending = status === "pending";
  const isRejected = status === "rejected";

  const desc = isPending
    ? "认证审核中，审核通过后即可使用遛弯、上传宠物友好地点、宠物警示等功能。"
    : isRejected
      ? "认证未通过，请重新提交认证后使用遛弯、上传宠物友好地点、宠物警示等功能。"
      : "为了保护宠物家长和毛孩子的安全，使用遛弯、上传宠物友好地点、宠物警示等功能前，需要先完成资料认证。";

  const cta = isRejected ? "重新认证" : "去认证";

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.45)",
               display: "flex", alignItems: "center", justifyContent: "center", padding: "0 34px" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 22, padding: "24px 22px 18px", width: "100%", maxWidth: 330, textAlign: "center" }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#FBE6D4", margin: "0 auto 14px",
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <rect x="5" y="10.5" width="14" height="9.5" rx="2.4" fill={C.pri} />
            <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke={C.pri} strokeWidth="1.9" fill="none" strokeLinecap="round" />
            <circle cx="12" cy="15" r="1.5" fill="#fff" />
          </svg>
        </div>
        <div style={{ fontSize: 16.5, fontWeight: 800, color: C.text, marginBottom: 10 }}>
          {isPending ? "认证审核中" : "完成认证后即可使用该功能"}
        </div>
        <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.65, marginBottom: 20 }}>{desc}</div>

        {isPending ? (
          <button onClick={onClose}
            style={{ width: "100%", padding: "12px 0", borderRadius: 999, border: "none",
                     background: C.pri, color: "#fff", fontSize: 14.5, fontWeight: 800, cursor: "pointer" }}>
            我知道了
          </button>
        ) : (
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose}
              style={{ flex: 1, padding: "12px 0", borderRadius: 999, border: `1.4px solid ${C.border}`,
                       background: "#fff", color: C.sub, fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}>取消</button>
            <button onClick={() => { onClose?.(); onGoVerify?.(); }}
              style={{ flex: 1, padding: "12px 0", borderRadius: 999, border: "none",
                       background: C.pri, color: "#fff", fontSize: 14.5, fontWeight: 800, cursor: "pointer" }}>{cta}</button>
          </div>
        )}
      </div>
    </div>
  );
}
