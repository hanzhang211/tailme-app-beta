"use client";

/**
 * components/merchant/MerchantShell.jsx
 *
 * 商家后台外壳：权限守卫 + 左侧导航 + 顶栏，并通过 context 提供 { me, store, reloadStore }。
 *  - 未登录 → 跳 /merchant/login
 *  - 已登录但 role !== 'merchant' → 跳 /merchant/login（那里引导入驻）
 *  - role === 'merchant' → 渲染后台
 *
 * 账号体系沿用主 app：localStorage('tailme_user_id')。
 */

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getUserById } from "@/services/supabaseService";
import { getMyStore } from "@/services/merchantService";
import { MC, StatusBadge } from "./ui";

const LS_KEY = "tailme_user_id";

const MerchantCtx = createContext(null);
export const useMerchant = () => useContext(MerchantCtx);

const NAV = [
  { key: "dashboard",     label: "首页概览", icon: "🏠", href: "/merchant/dashboard" },
  { key: "store",         label: "店铺管理", icon: "🏪", href: "/merchant/store" },
  { key: "products",      label: "商品管理", icon: "📦", href: "/merchant/products" },
  { key: "review-status", label: "审核记录", icon: "📋", href: "/merchant/review-status" },
];

export default function MerchantShell({ active, children }) {
  const router = useRouter();
  const [status, setStatus] = useState("loading"); // loading | ok | redirecting
  const [me, setMe]   = useState(null);
  const [store, setStore] = useState(null);

  const reloadStore = useCallback(async (uid) => {
    const id = uid || me?.id;
    if (!id) return null;
    const s = await getMyStore(id);
    setStore(s);
    return s;
  }, [me?.id]);

  useEffect(() => {
    const uid = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
    if (!uid) { setStatus("redirecting"); router.replace("/merchant/login"); return; }
    (async () => {
      try {
        const u = await getUserById(uid);
        if (!u || u.role !== "merchant") { setStatus("redirecting"); router.replace("/merchant/login"); return; }
        setMe(u);
        const s = await getMyStore(uid);
        // 已是商家但还没建店铺（如通过 SQL 直接授予 merchant）→ 去创建店铺
        if (!s) { setStatus("redirecting"); router.replace("/merchant/store"); return; }
        setStore(s);
        setStatus("ok");
      } catch {
        setStatus("redirecting");
        router.replace("/merchant/login");
      }
    })();
  }, [router]);

  if (status !== "ok") {
    return (
      <div style={{ minHeight: "100vh", background: MC.bg, display: "flex", alignItems: "center",
                    justifyContent: "center", color: MC.sub, fontSize: 14 }}>
        正在进入商家后台…
      </div>
    );
  }

  return (
    <MerchantCtx.Provider value={{ me, store, setStore, reloadStore }}>
      <div style={{ minHeight: "100vh", background: MC.bg, display: "flex",
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif", color: MC.text }}>
        <Sidebar active={active} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <TopBar me={me} store={store} />
          <div style={{ padding: "26px 32px 56px", maxWidth: 1080, width: "100%" }}>
            {children}
          </div>
        </div>
      </div>
    </MerchantCtx.Provider>
  );
}

function Sidebar({ active }) {
  return (
    <div style={{ width: 220, flexShrink: 0, background: MC.sidebar, color: "#fff",
                  minHeight: "100vh", padding: "26px 14px", boxSizing: "border-box",
                  position: "sticky", top: 0, alignSelf: "flex-start", height: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 8px 22px" }}>
        <span style={{ fontSize: 24 }}>🐾</span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>TailMe 商家后台</div>
          <div style={{ fontSize: 10.5, color: MC.sidebarSub, marginTop: 2 }}>爪爪日记 · 商家中心</div>
        </div>
      </div>
      {NAV.map((n) => {
        const on = active === n.key;
        return (
          <a key={n.key} href={n.href}
            style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 14px", borderRadius: 12,
                     marginBottom: 4, textDecoration: "none", fontSize: 14, fontWeight: on ? 800 : 600,
                     color: on ? "#fff" : MC.sidebarSub, background: on ? MC.pri : "transparent" }}>
            <span style={{ fontSize: 16 }}>{n.icon}</span>{n.label}
          </a>
        );
      })}
      <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <a href="/" style={{ display: "block", padding: "10px 14px", fontSize: 12.5, color: MC.sidebarSub, textDecoration: "none" }}>
          ← 返回 TailMe App
        </a>
      </div>
    </div>
  );
}

function TopBar({ me, store }) {
  return (
    <div style={{ height: 62, flexShrink: 0, background: "#fff", borderBottom: `1px solid ${MC.border}`,
                  display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px",
                  position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: MC.ink }}>{store?.name || "我的店铺"}</span>
        {store && <StatusBadge kind="store" status={store.status} />}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: MC.sub }}>
        <span style={{ width: 30, height: 30, borderRadius: "50%", background: MC.tint, display: "flex",
                       alignItems: "center", justifyContent: "center", fontSize: 15 }}>👤</span>
        {me?.username || me?.phone || "商家"}
      </div>
    </div>
  );
}
