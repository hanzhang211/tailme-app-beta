"use client";

/**
 * app/admin/page.jsx
 *
 * 真实 Supabase 数据。无任何 mock / fallback。
 * - count = 数字（含 0）→ 直接显示
 * - count = null        → 显示具体错误原因
 * - Supabase 连接失败   → 显示 "Database connection failed"
 */

import { useEffect, useState } from "react";
import { getAdminStats } from "@/services/supabaseService";

const C = {
  pri: "#FF7A5A",
  grad: "linear-gradient(135deg,#FF7A5A 0%,#FFB347 100%)",
  bg: "#FFFBF4",
  card: "#FFFFFF",
  text: "#1A1006",
  sub: "#9B8B76",
  border: "#F0E8D8",
  warn: "#FFF8ED",
  err: "#FFF0F0",
  errText: "#D94040",
};

function fmt(val) {
  if (val === null || val === undefined) return null;
  return Number(val).toLocaleString("zh-CN");
}

export default function AdminPage() {
  const [stats, setStats]       = useState(null);
  const [fatalError, setFatal]  = useState(null);
  const [loading, setLoad]      = useState(true);
  const [refreshAt, setRefresh] = useState(0);

  useEffect(() => {
    setLoad(true);
    setFatal(null);
    getAdminStats()
      .then(setStats)
      .catch((err) => setFatal(err.message))
      .finally(() => setLoad(false));
  }, [refreshAt]);

  const tiles = stats
    ? [
        { icon: "👤", label: "注册用户",   key: "total_users",    val: stats.total_users,    err: stats.errors?.users    },
        { icon: "🐾", label: "宠物数量",   key: "total_pets",     val: stats.total_pets,     err: stats.errors?.pets     },
        { icon: "🔬", label: "健康上传",   key: "health_uploads", val: stats.health_uploads, err: stats.errors?.uploads  },
        { icon: "💬", label: "聊天消息",   key: "chat_messages",  val: stats.chat_messages,  err: stats.errors?.messages },
        { icon: "🏪", label: "商铺数量",   key: "partner_shops",  val: stats.partner_shops,  err: stats.errors?.shops    },
      ]
    : [];

  const queriedAt = stats?.queried_at
    ? new Date(stats.queried_at).toLocaleString("zh-CN")
    : null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif" }}>

      {/* Header */}
      <div style={{ background: C.grad, padding: "48px 24px 28px", color: "white" }}>
        <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4 }}>爪爪日记 TailMe</div>
        <div style={{ fontSize: 24, fontWeight: 800 }}>🛠 Admin Dashboard</div>
        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
          {loading ? "查询数据库中..." : fatalError ? "连接失败" : `实时数据 · ${queriedAt}`}
        </div>
      </div>

      <div style={{ padding: "20px 16px" }}>

        {loading && (
          <div style={{ textAlign: "center", padding: 60, color: C.sub, fontSize: 14 }}>
            ⟳ 正在查询 Supabase...
          </div>
        )}

        {/* 致命错误：Supabase 完全不可用 */}
        {!loading && fatalError && (
          <div style={{ background: C.err, border: `1.5px solid ${C.errText}`, borderRadius: 16, padding: "18px 16px", marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.errText, marginBottom: 8 }}>
              ❌ Database connection failed
            </div>
            <div style={{ fontSize: 12, color: C.errText, fontFamily: "monospace", lineHeight: 1.7, wordBreak: "break-all" }}>
              {fatalError}
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: C.sub }}>
              请检查 <code>NEXT_PUBLIC_SUPABASE_URL</code> 和 <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> 是否正确配置。
            </div>
          </div>
        )}

        {/* 统计数据 */}
        {!loading && !fatalError && stats && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              {tiles.map(({ icon, label, val, err }) => {
                const display = fmt(val);
                const hasError = val === null;
                return (
                  <div key={label} style={{
                    background: hasError ? C.err : C.card,
                    borderRadius: 20, padding: "18px 16px",
                    boxShadow: "0 2px 14px rgba(0,0,0,0.05)",
                    border: hasError ? `1px solid ${C.errText}` : "none",
                  }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
                    <div style={{ fontSize: 11, color: C.sub }}>{label}</div>
                    {hasError ? (
                      <>
                        <div style={{ fontSize: 22, fontWeight: 800, color: C.errText, marginTop: 2 }}>—</div>
                        <div style={{ fontSize: 10, color: C.errText, marginTop: 4, lineHeight: 1.4 }}>
                          {err ?? "Query failed"}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 28, fontWeight: 800, color: C.text, marginTop: 2, lineHeight: 1 }}>
                        {display}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 操作栏 */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setRefresh(Date.now())}
                style={{ flex: 1, padding: "13px 0", borderRadius: 16, background: C.grad, color: "white", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }}
              >
                🔄 刷新
              </button>
              <a
                href="/"
                style={{ flex: 1, padding: "13px 0", borderRadius: 16, background: C.warn, color: C.pri, fontSize: 13, fontWeight: 700, border: `1.5px solid ${C.border}`, cursor: "pointer", textAlign: "center", textDecoration: "none", display: "block", boxSizing: "border-box" }}
              >
                ← 返回 App
              </a>
            </div>
          </>
        )}

        {/* 失败后仍可重试 */}
        {!loading && fatalError && (
          <button
            onClick={() => setRefresh(Date.now())}
            style={{ width: "100%", marginTop: 12, padding: "13px 0", borderRadius: 16, background: C.grad, color: "white", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }}
          >
            🔄 重试
          </button>
        )}

      </div>
    </div>
  );
}
