"use client";

/**
 * components/admin/DangerReviews.jsx
 * 平台审核员：危险提醒（避雷）审核面板，嵌入 /admin。
 * mock 阶段读写 services/dangerMock 的内存数据；后续接 Supabase 后改为真实表。
 * 只有审核通过(approved)的提醒才会出现在用户端「避雷地图」。
 */

import { useEffect, useState } from "react";
import { adminListDanger, adminReviewDanger, dangerType, RISK_STYLE, fmtRelative } from "@/services/dangerMock";

const C = {
  pri: "#E68645", tint: "#F2E5DA", bg: "#EEE9E1", card: "#FFFFFF",
  text: "#1A1006", sub: "#8A8074", border: "#D6D5D8", line: "#EFE9DF",
  errT: "#D94040", ok: "#2E7D32", danger: "#D9542B",
};

const TABS = [
  { key: "pending", label: "待审核" },
  { key: "approved", label: "已通过" },
  { key: "all", label: "全部" },
];

export function DangerReviewManager() {
  const [tab, setTab] = useState("pending");
  const [list, setList] = useState([]);
  const [tick, setTick] = useState(0);

  useEffect(() => { setList(adminListDanger(tab)); }, [tab, tick]);

  const act = (r, action) => {
    const verb = action === "approve" ? "通过" : action === "reject" ? "驳回" : "删除";
    if (action !== "approve" && !confirm(`${verb}这条避雷提醒？`)) return;
    adminReviewDanger(r.id, action);
    setTick((t) => t + 1);
  };

  return (
    <div style={{ background: C.card, borderRadius: 18, padding: "16px 14px",
                  border: `1px solid ${C.border}`, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 2 }}>⚠️ 危险提醒审核</div>
      <div style={{ fontSize: 11, color: C.sub, marginBottom: 12 }}>
        审核用户上报的避雷提醒 · 仅「通过」的会展示在用户端避雷地图
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ flex: 1, padding: "7px 0", borderRadius: 12, fontSize: 12, fontWeight: on ? 800 : 600,
                       background: on ? C.pri : C.tint, color: on ? "#fff" : C.text, border: "none", cursor: "pointer" }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {list.length === 0 && (
        <div style={{ textAlign: "center", color: C.sub, fontSize: 13, padding: 24 }}>暂无记录 ✓</div>
      )}

      {list.map((r) => {
        const t = dangerType(r.typeId);
        const rk = RISK_STYLE[r.risk] || RISK_STYLE["注意"];
        const pending = (r.status || "pending") === "pending";
        return (
          <div key={r.id} style={{ background: C.bg, borderRadius: 12, padding: "11px 12px", marginBottom: 8,
                                   border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14 }}>{t.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{r.title}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                             color: rk.color, background: rk.bg }}>{r.risk}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                             color: pending ? "#9C5A00" : C.ok, background: pending ? "#FFF4D6" : "#E6F4E1" }}>
                {pending ? "待审核" : "已通过"}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: C.text, lineHeight: 1.6, marginBottom: 6 }}>{r.desc}</div>
            <div style={{ fontSize: 11, color: C.sub, marginBottom: r.images?.length ? 8 : 6 }}>
              📍 {r.address} · {r.reporter || "匿名"} · {r.createdAt ? fmtRelative(r.createdAt) : r.ago}
              {r.contact ? ` · 联系：${r.contact}` : ""}
            </div>
            {r.images?.length > 0 && (
              <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                {r.images.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer">
                    <img src={u} alt="" style={{ width: 46, height: 46, borderRadius: 8, objectFit: "cover" }} />
                  </a>
                ))}
              </div>
            )}
            {pending && (
              <div style={{ display: "flex", gap: 8 }}>
                <Btn tone="ok" onClick={() => act(r, "approve")}>通过</Btn>
                <Btn tone="warn" onClick={() => act(r, "reject")}>驳回</Btn>
                <Btn tone="err" onClick={() => act(r, "delete")}>删除</Btn>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Btn({ children, onClick, tone }) {
  const tones = {
    ok: { bg: "#E6F4E1", c: C.ok }, warn: { bg: C.tint, c: "#9C5A00" }, err: { bg: "#FFE2E2", c: C.errT },
  };
  const s = tones[tone] || tones.warn;
  return (
    <button onClick={onClick} style={{ padding: "6px 14px", borderRadius: 10, fontSize: 11.5, fontWeight: 700,
             background: s.bg, color: s.c, border: "none", cursor: "pointer" }}>{children}</button>
  );
}
