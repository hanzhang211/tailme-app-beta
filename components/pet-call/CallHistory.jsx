"use client";

/**
 * components/pet-call/CallHistory.jsx
 *
 * 通话记录页（参考设计图第 8 屏）：列表（头像 / 来电类型 / 日期时间 / 通话时长 / 电话 icon）
 * + 清空记录（二次确认）。
 *
 * props: { userId, avatar, onBack, toast }
 */

import { useState, useEffect, useCallback } from "react";
import { Phone, PhoneMissed } from "lucide-react";
import BackButton from "@/components/icons/BackButton";
import { listCallRecords, clearCallRecords } from "@/services/petCallService";
import { callTypeLabel } from "@/lib/petCallTemplates";
import { formatDuration } from "@/hooks/usePetCall";

const C = { pri: "#E68645", text: "#2A2520", sub: "#8A8178", bg: "#EEE9E1", border: "#EFE3D5" };
const WEEK = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function formatWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  const y = new Date(now); y.setDate(now.getDate() - 1);
  const isYest = d.getFullYear() === y.getFullYear() && d.getMonth() === y.getMonth() && d.getDate() === y.getDate();
  if (sameDay) return `今天 ${hm}`;
  if (isYest) return `昨天 ${hm}`;
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`;
}

export default function CallHistory({ userId, avatar, onBack, toast }) {
  const [records, setRecords] = useState(null); // null=loading
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await listCallRecords(userId);
      setRecords(rows);
    } catch (e) {
      setRecords([]);
      toast?.(e.message || "加载失败");
    }
  }, [userId, toast]);

  useEffect(() => { load(); }, [load]);

  const doClear = async () => {
    try {
      await clearCallRecords(userId);
      setRecords([]);
      setConfirming(false);
      toast?.("已清空通话记录 🐾");
    } catch (e) {
      toast?.(e.message || "清空失败");
    }
  };

  return (
    <div style={{ position: "absolute", inset: 0, background: C.bg, display: "flex", flexDirection: "column" }}>
      {/* header */}
      <div style={{ padding: "max(env(safe-area-inset-top), 28px) 16px 10px", display: "flex",
                    alignItems: "center", gap: 12, flexShrink: 0 }}>
        <BackButton onClick={onBack} />
        <div style={{ fontSize: 18, fontWeight: 900, color: C.text }}>通话记录</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 24px" }}>
        {records === null ? (
          <div style={{ textAlign: "center", color: C.sub, fontSize: 13, marginTop: 60 }}>加载中…</div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: "center", color: C.sub, marginTop: 80 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📞</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>还没有通话记录</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>去和毛孩子打个电话吧～</div>
          </div>
        ) : (
          records.map((r) => {
            const missed = r.status === "missed" || r.status === "declined";
            return (
              <div key={r.id}
                style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff",
                         borderRadius: 16, border: `1px solid ${C.border}`, padding: "12px 14px",
                         marginBottom: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
                <img src={avatar} alt=""
                     style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover", background: "#F2E5DA", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: missed ? "#C0612A" : C.text }}>
                    {callTypeLabel(r.call_type)}
                  </div>
                  <div style={{ fontSize: 11.5, color: C.sub, marginTop: 3 }}>
                    {formatWhen(r.started_at || r.created_at)}
                    {missed ? " · 未接听" : ` · 通话 ${formatDuration(r.duration_seconds)}`}
                  </div>
                </div>
                <span style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                               background: missed ? "#FBE6D4" : "#FFF1E6",
                               display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {missed ? <PhoneMissed size={16} color="#C0612A" /> : <Phone size={16} color={C.pri} />}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* 清空记录 */}
      {records && records.length > 0 && (
        <div style={{ padding: "10px 16px max(env(safe-area-inset-bottom), 20px)", background: C.bg }}>
          <button onClick={() => setConfirming(true)}
            style={{ width: "100%", padding: "13px 0", borderRadius: 14, cursor: "pointer",
                     background: "#fff", border: `1.5px solid ${C.pri}`, color: C.pri, fontSize: 14.5, fontWeight: 800 }}>
            清空记录
          </button>
        </div>
      )}

      {/* 二次确认 */}
      {confirming && (
        <div style={{ position: "fixed", inset: 0, zIndex: 360, background: "rgba(0,0,0,0.4)",
                      display: "flex", alignItems: "center", justifyContent: "center", padding: 30 }}
             onClick={() => setConfirming(false)}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 300, background: "#fff", borderRadius: 22, padding: "22px 20px 16px",
                     textAlign: "center", boxShadow: "0 12px 40px rgba(0,0,0,0.25)" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 8 }}>清空通话记录</div>
            <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.6, marginBottom: 20 }}>
              确定清空所有通话记录吗？<br />清空后无法恢复。
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirming(false)}
                style={{ flex: 1, padding: "12px 0", borderRadius: 13, cursor: "pointer",
                         background: "#F2EDE5", border: "none", color: C.text, fontSize: 14, fontWeight: 700 }}>
                取消
              </button>
              <button onClick={doClear}
                style={{ flex: 1, padding: "12px 0", borderRadius: 13, cursor: "pointer",
                         background: "#D9542B", border: "none", color: "#fff", fontSize: 14, fontWeight: 700 }}>
                清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
