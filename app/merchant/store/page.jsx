"use client";

/**
 * /merchant/store — 店铺资质管理
 *  - 非商家（role=user，未入驻）→ 独立的「申请入驻」表单（不套后台外壳）。
 *  - 商家（role=merchant）→ 后台外壳内的资质管理（查看状态 / 编辑 / 重新送审）。
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserById } from "@/services/supabaseService";
import { saveStore, getMyStore } from "@/services/merchantService";
import MerchantShell, { useMerchant } from "@/components/merchant/MerchantShell";
import StoreFormFields from "@/components/merchant/StoreFormFields";
import { MC, Card, Btn, Banner, SectionTitle, StatusBadge, useToast } from "@/components/merchant/ui";

const LS_KEY = "tailme_user_id";

export default function StoreRoute() {
  const router = useRouter();
  const [phase, setPhase] = useState("loading"); // loading | enroll | merchant
  const [me, setMe] = useState(null);

  useEffect(() => {
    const uid = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
    if (!uid) { router.replace("/merchant/login"); return; }
    (async () => {
      try {
        const u = await getUserById(uid);
        if (!u) { router.replace("/merchant/login"); return; }
        if (u.role === "admin") { router.replace("/merchant/login"); return; } // admin 与商家分开
        setMe(u);
        if (u.role === "merchant") {
          // 已是商家：有店铺 → 管理；无店铺（如 SQL 直接授予）→ 创建店铺
          const s = await getMyStore(uid);
          setPhase(s ? "merchant" : "enroll");
          return;
        }
        setPhase("enroll"); // 普通用户：申请入驻
      } catch {
        router.replace("/merchant/login");
      }
    })();
  }, [router]);

  if (phase === "loading") {
    return <div style={{ minHeight: "100vh", background: MC.bg, display: "flex", alignItems: "center",
                         justifyContent: "center", color: MC.sub, fontSize: 14 }}>加载中…</div>;
  }
  if (phase === "enroll") return <EnrollForm userId={me.id} onDone={() => router.replace("/merchant/dashboard")} />;
  return <MerchantShell active="store"><StoreManage /></MerchantShell>;
}

/* ── 申请入驻（独立页面）─────────────────────────────── */
function EnrollForm({ userId, onDone }) {
  const { toast, ToastHost } = useToast();
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.name?.trim()) return toast("请填写店铺名称", "error");
    if (!form.company_name?.trim()) return toast("请填写公司名称", "error");
    if (!form.license_url) return toast("请上传营业执照", "error");
    setBusy(true);
    try {
      await saveStore({ userId, storeId: null, fields: form });
      toast("入驻申请已提交，等待平台审核", "success");
      setTimeout(onDone, 900);
    } catch (e) {
      toast(e.message || "提交失败", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: MC.bg, padding: "40px 20px 60px",
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 34 }}>🐾</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: MC.ink, marginTop: 4 }}>申请成为 TailMe 商家</div>
          <div style={{ fontSize: 13, color: MC.sub, marginTop: 6 }}>填写店铺与资质信息，提交后由平台审核</div>
        </div>
        <Card pad={26}>
          <Banner tone="info">提交后店铺状态为「审核中」，平台审核通过即可上架商品。带 <span style={{ color: MC.err }}>*</span> 为必填。</Banner>
          <div style={{ marginTop: 18 }}>
            <StoreFormFields form={form} setForm={setForm} storeId={null} toast={toast} />
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
            <Btn variant="ghost" onClick={() => { window.location.href = "/merchant/login"; }}>取消</Btn>
            <Btn onClick={submit} disabled={busy} style={{ flex: 1 }}>{busy ? "提交中…" : "提交入驻申请"}</Btn>
          </div>
        </Card>
      </div>
      <ToastHost />
    </div>
  );
}

/* ── 商家资质管理（外壳内）─────────────────────────────── */
function StoreManage() {
  const { me, store, setStore } = useMerchant();
  const { toast, ToastHost } = useToast();
  const [form, setForm] = useState(() => store || {});
  const [busy, setBusy] = useState(false);

  useEffect(() => { setForm(store || {}); }, [store]);

  const save = async (submit) => {
    if (!form.name?.trim()) return toast("请填写店铺名称", "error");
    if (!form.company_name?.trim()) return toast("请填写公司名称", "error");
    setBusy(true);
    try {
      const updated = await saveStore({
        userId: me.id, storeId: store.id,
        fields: {
          name: form.name, logo_url: form.logo_url || null, intro: form.intro || null,
          contact: form.contact || null, company_name: form.company_name || null,
          license_url: form.license_url || null, brand_auth_url: form.brand_auth_url || null,
          food_license_url: form.food_license_url || null,
        },
        submit,
      });
      setStore(updated);
      toast(submit ? "已提交审核" : "已保存", "success");
    } catch (e) {
      toast(e.message || "保存失败", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SectionTitle sub="管理店铺信息与平台审核所需的资质材料"
        right={<StatusBadge kind="store" status={store?.status} />}>店铺管理</SectionTitle>

      {store?.status === "rejected" && store?.reject_reason && (
        <div style={{ marginBottom: 16 }}>
          <Banner tone="err">审核未通过：{store.reject_reason}。请修改后重新提交。</Banner>
        </div>
      )}
      {store?.status === "pending_review" && (
        <div style={{ marginBottom: 16 }}><Banner tone="warn">资料审核中，平台会尽快处理。审核期间仍可修改资料并重新提交。</Banner></div>
      )}
      {store?.status === "approved" && (
        <div style={{ marginBottom: 16 }}><Banner tone="ok">店铺已通过审核，可正常上架商品。修改资质并重新提交将再次进入审核。</Banner></div>
      )}

      <Card pad={26}>
        <StoreFormFields form={form} setForm={setForm} storeId={store?.id} toast={toast} />
        <div style={{ display: "flex", gap: 12, marginTop: 22, justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={() => save(false)} disabled={busy}>仅保存</Btn>
          <Btn onClick={() => save(true)} disabled={busy}>{busy ? "处理中…" : "保存并提交审核"}</Btn>
        </div>
      </Card>
      <ToastHost />
    </>
  );
}
