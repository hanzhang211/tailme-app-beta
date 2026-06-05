"use client";

/**
 * /merchant/dashboard — 商家首页概览
 * 店铺审核状态 + 商品数量/待审核/已上线/已驳回 + 最近提交记录。
 */

import { useEffect, useState } from "react";
import MerchantShell, { useMerchant } from "@/components/merchant/MerchantShell";
import { listMyProducts } from "@/services/merchantService";
import { MC, Card, SectionTitle, StatTile, StatusBadge, Btn, Empty, Banner } from "@/components/merchant/ui";

export default function DashboardRoute() {
  return <MerchantShell active="dashboard"><Dashboard /></MerchantShell>;
}

function Dashboard() {
  const { store } = useMerchant();
  const [products, setProducts] = useState(null);

  useEffect(() => {
    if (store?.id) listMyProducts(store.id).then(setProducts).catch(() => setProducts([]));
    else setProducts([]);
  }, [store?.id]);

  const count = (st) => (products || []).filter((p) => p.status === st).length;
  const total = products?.length || 0;
  const recent = (products || []).slice(0, 6);

  return (
    <>
      <SectionTitle sub={`欢迎回来，${store?.name || "商家"}`}
        right={<Btn onClick={() => (window.location.href = "/merchant/products/new")}>＋ 发布商品</Btn>}>
        首页概览
      </SectionTitle>

      {/* 店铺状态条 */}
      <div style={{ marginBottom: 18 }}>
        <Card pad={18} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 46, height: 46, borderRadius: 12, background: MC.tint, display: "flex",
                           alignItems: "center", justifyContent: "center", fontSize: 24, overflow: "hidden" }}>
              {store?.logo_url ? <img src={store.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🏪"}
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: MC.ink }}>{store?.name}</div>
              <div style={{ fontSize: 12, color: MC.sub, marginTop: 2 }}>店铺审核状态</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <StatusBadge kind="store" status={store?.status} />
            <Btn variant="ghost" onClick={() => (window.location.href = "/merchant/store")} style={{ padding: "9px 16px" }}>管理店铺</Btn>
          </div>
        </Card>
      </div>

      {store?.status !== "approved" && (
        <div style={{ marginBottom: 18 }}>
          <Banner tone={store?.status === "rejected" ? "err" : "warn"}>
            {store?.status === "rejected"
              ? `店铺审核未通过：${store?.reject_reason || "请前往店铺管理修改后重新提交"}`
              : "店铺尚在审核中，审核通过后商品才会展示到用户端商城（你现在仍可先发布商品并提交审核）。"}
          </Banner>
        </div>
      )}

      {/* 统计 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 22 }}>
        <StatTile icon="📦" label="商品总数" value={products == null ? "—" : total} />
        <StatTile icon="🕓" label="待审核" value={products == null ? "—" : count("pending_review")} accent="#9C5A00" />
        <StatTile icon="✅" label="已上线" value={products == null ? "—" : count("approved")} accent={MC.ok} />
        <StatTile icon="⛔" label="已驳回" value={products == null ? "—" : count("rejected")} accent={MC.err} />
      </div>

      {/* 最近提交 */}
      <Card>
        <SectionTitle sub="最近的商品与审核状态"
          right={<a href="/merchant/products" style={{ fontSize: 13, color: MC.pri, fontWeight: 700, textDecoration: "none" }}>查看全部 →</a>}>
          最近商品
        </SectionTitle>
        {products == null ? (
          <div style={{ color: MC.sub, fontSize: 13, padding: 20, textAlign: "center" }}>加载中…</div>
        ) : recent.length === 0 ? (
          <Empty icon="📦" title="还没有商品" desc="点击右上角「发布商品」开始上架吧" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {recent.map((p, i) => (
              <a key={p.id} href={`/merchant/products/${p.id}/edit`}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 6px", textDecoration: "none",
                         borderTop: i ? `1px solid ${MC.line}` : "none" }}>
                <span style={{ width: 46, height: 46, borderRadius: 10, background: MC.tint, flexShrink: 0,
                               display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", fontSize: 20 }}>
                  {p.main_image ? <img src={p.main_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🐾"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: MC.text, overflow: "hidden",
                                textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title || "未命名商品"}</div>
                  <div style={{ fontSize: 12, color: MC.sub, marginTop: 3 }}>¥{p.price} · 库存 {p.stock}</div>
                </div>
                <StatusBadge status={p.status} />
              </a>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
