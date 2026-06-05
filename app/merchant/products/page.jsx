"use client";

/**
 * /merchant/products — 商品管理列表（按状态筛选）
 */

import { useEffect, useMemo, useState } from "react";
import MerchantShell, { useMerchant } from "@/components/merchant/MerchantShell";
import { listMyProducts } from "@/services/merchantService";
import { MC, Card, SectionTitle, StatusBadge, Btn, Empty } from "@/components/merchant/ui";

const FILTERS = [
  { key: "all", label: "全部" },
  { key: "pending_review", label: "待审核" },
  { key: "approved", label: "已上线" },
  { key: "rejected", label: "已驳回" },
  { key: "draft", label: "草稿" },
  { key: "offline", label: "已下架" },
];

export default function ProductsRoute() {
  return <MerchantShell active="products"><ProductList /></MerchantShell>;
}

function ProductList() {
  const { store } = useMerchant();
  const [products, setProducts] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (store?.id) listMyProducts(store.id).then(setProducts).catch(() => setProducts([]));
    else setProducts([]);
  }, [store?.id]);

  const rows = useMemo(() => {
    if (!products) return [];
    return filter === "all" ? products : products.filter((p) => p.status === filter);
  }, [products, filter]);

  const countOf = (k) => (products || []).filter((p) => p.status === k).length;

  return (
    <>
      <SectionTitle sub="管理你发布的商品，提交审核通过后展示到商城"
        right={<Btn onClick={() => (window.location.href = "/merchant/products/new")}>＋ 发布商品</Btn>}>
        商品管理
      </SectionTitle>

      {/* 筛选 */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {FILTERS.map((f) => {
          const on = filter === f.key;
          const n = f.key === "all" ? (products?.length || 0) : countOf(f.key);
          return (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{ padding: "7px 15px", borderRadius: 999, fontSize: 13, fontWeight: on ? 800 : 600, cursor: "pointer",
                       border: `1px solid ${on ? MC.pri : MC.border}`, background: on ? MC.pri : "#fff",
                       color: on ? "#fff" : MC.sub }}>
              {f.label} {products != null && <span style={{ opacity: 0.85 }}>({n})</span>}
            </button>
          );
        })}
      </div>

      <Card pad={0}>
        {products == null ? (
          <div style={{ color: MC.sub, fontSize: 13, padding: 40, textAlign: "center" }}>加载中…</div>
        ) : rows.length === 0 ? (
          <Empty icon="📦" title="没有商品" desc="切换筛选或点击「发布商品」上架新品" />
        ) : (
          <div>
            {rows.map((p, i) => (
              <a key={p.id} href={`/merchant/products/${p.id}/edit`}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", textDecoration: "none",
                         borderTop: i ? `1px solid ${MC.line}` : "none" }}>
                <span style={{ width: 56, height: 56, borderRadius: 12, background: MC.tint, flexShrink: 0,
                               display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", fontSize: 22 }}>
                  {p.main_image ? <img src={p.main_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🐾"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: MC.text, overflow: "hidden",
                                textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title || "未命名商品"}</div>
                  <div style={{ fontSize: 12.5, color: MC.sub, marginTop: 4, display: "flex", gap: 12 }}>
                    <span style={{ color: MC.priDark, fontWeight: 700 }}>¥{p.price}</span>
                    <span>库存 {p.stock}</span>
                    {p.original_price ? <span style={{ textDecoration: "line-through" }}>¥{p.original_price}</span> : null}
                  </div>
                </div>
                <StatusBadge status={p.status} />
                <span style={{ color: MC.sub, fontSize: 18 }}>›</span>
              </a>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
