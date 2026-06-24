"use client";

/**
 * /merchant/login — 商家登录 / 入驻入口
 *
 * 账号体系沿用主 app（手机号 + 真实短信验证码登录）。
 * 登录后按 role 分流：
 *   merchant → /merchant/dashboard
 *   user     → 显示「成为商家」引导 → /merchant/store（填写资质入驻）
 *   admin    → 提示用管理员后台
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserById } from "@/services/supabaseService";
import { MC, Card, Btn, Input, Banner } from "@/components/merchant/ui";

const LS_KEY = "tailme_user_id";

export default function MerchantLogin() {
  const router = useRouter();
  const [phase, setPhase]   = useState("check"); // check | phone | code | enroll
  const [me, setMe]         = useState(null);
  const [phone, setPhone]   = useState("");
  const [code, setCode]     = useState("");
  const [busy, setBusy]     = useState(false);
  const [err, setErr]       = useState("");

  const isValidPhone = /^1[3-9]\d{9}$/.test(phone.trim());

  // 进入页面先看是否已登录
  useEffect(() => {
    const uid = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
    if (!uid) { setPhase("phone"); return; }
    getUserById(uid)
      .then((u) => routeByRole(u))
      .catch(() => setPhase("phone"));
  }, []); // eslint-disable-line

  function routeByRole(u) {
    setMe(u);
    if (u?.role === "merchant") { router.replace("/merchant/dashboard"); return; }
    setPhase("enroll");
  }

  const postAuth = async (url, payload) => {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let data = {};
    try { data = await r.json(); } catch {}
    return { ok: r.ok, data };
  };

  // 第一步：发送真实短信验证码 → /api/auth/send-code
  const sendCode = async () => {
    setErr("");
    if (!isValidPhone) { setErr("请输入正确的手机号"); return; }
    setBusy(true);
    try {
      const { ok, data } = await postAuth("/api/auth/send-code", { phone: phone.trim() });
      if (!ok) { setErr(data?.error || "短信发送失败，请稍后重试"); return; }
      setPhase("code"); setCode("");
    } catch {
      setErr("短信发送失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  };

  // 第二步：校验验证码 → /api/auth/verify-code；通过后取用户并按 role 分流
  const verify = async () => {
    setErr("");
    if (!/^\d{6}$/.test(code.trim())) { setErr("请输入 6 位验证码"); return; }
    setBusy(true);
    try {
      const { ok, data } = await postAuth("/api/auth/verify-code", { phone: phone.trim(), code: code.trim() });
      if (!ok) { setErr(data?.error || "验证码错误或已过期，请重新获取"); return; }
      localStorage.setItem(LS_KEY, data.userId);
      const user = await getUserById(data.userId);
      routeByRole(user);
    } catch {
      setErr("登录失败，请重试");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: MC.bg, display: "flex", alignItems: "center",
                  justifyContent: "center", padding: 20,
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 40 }}>🐾</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: MC.ink, marginTop: 6 }}>TailMe 商家后台</div>
          <div style={{ fontSize: 13, color: MC.sub, marginTop: 4 }}>爪爪日记 · 商家中心</div>
        </div>

        <Card pad={26}>
          {phase === "check" && <div style={{ textAlign: "center", color: MC.sub, fontSize: 14, padding: 20 }}>正在检查登录状态…</div>}

          {phase === "phone" && (
            <>
              <div style={{ fontSize: 17, fontWeight: 800, color: MC.ink, marginBottom: 16 }}>商家登录</div>
              <Input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="请输入手机号" inputMode="numeric" maxLength={11} style={{ marginBottom: 12 }} />
              {err && <div style={{ color: MC.err, fontSize: 12.5, marginBottom: 10 }}>{err}</div>}
              <Btn full onClick={sendCode} disabled={!isValidPhone || busy}>{busy ? "发送中…" : "获取验证码"}</Btn>
              <div style={{ fontSize: 12, color: MC.sub, marginTop: 14, lineHeight: 1.6 }}>
                与 TailMe App 同一账号。登录后若尚未入驻，可在此申请成为商家。
              </div>
            </>
          )}

          {phase === "code" && (
            <>
              <div style={{ fontSize: 17, fontWeight: 800, color: MC.ink, marginBottom: 6 }}>输入验证码</div>
              <div style={{ fontSize: 12.5, color: MC.sub, marginBottom: 16 }}>验证码已发送至 +86 {phone}</div>
              <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="请输入 6 位验证码" inputMode="numeric" maxLength={6} style={{ marginBottom: 12 }} />
              {err && <div style={{ color: MC.err, fontSize: 12.5, marginBottom: 10 }}>{err}</div>}
              <Btn full onClick={verify} disabled={busy}>{busy ? "登录中…" : "登录"}</Btn>
              <button onClick={() => { setPhase("phone"); setCode(""); setErr(""); }}
                style={{ width: "100%", marginTop: 12, background: "none", border: "none", color: MC.sub,
                         fontSize: 12.5, cursor: "pointer" }}>← 重新输入手机号</button>
            </>
          )}

          {phase === "enroll" && (
            <>
              <div style={{ fontSize: 17, fontWeight: 800, color: MC.ink, marginBottom: 12 }}>成为 TailMe 商家</div>
              {me?.role === "admin" ? (
                <>
                  <Banner tone="warn">当前账号是管理员，无法入驻为商家。请使用 <a href="/admin" style={{ color: MC.priDark, fontWeight: 800 }}>管理员后台</a>；如需测试商家流程，请换一个手机号登录。</Banner>
                  <div style={{ marginTop: 16 }}>
                    <Btn full variant="ghost" onClick={() => { localStorage.removeItem(LS_KEY); setMe(null); setPhone(""); setCode(""); setErr(""); setPhase("phone"); }}>
                      用其他手机号登录 →
                    </Btn>
                  </div>
                </>
              ) : (
                <>
                  <Banner tone="info">
                    你已登录（{me?.username || me?.phone}），但还不是商家。填写店铺资质并提交后，
                    平台审核通过即可开店上架商品。
                  </Banner>
                  <div style={{ marginTop: 16 }}>
                    <Btn full onClick={() => router.replace("/merchant/store")}>填写资质 · 申请入驻 →</Btn>
                  </div>
                  <button onClick={() => { localStorage.removeItem(LS_KEY); setMe(null); setPhase("phone"); }}
                    style={{ width: "100%", marginTop: 12, background: "none", border: "none", color: MC.sub,
                             fontSize: 12.5, cursor: "pointer" }}>切换账号</button>
                </>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
