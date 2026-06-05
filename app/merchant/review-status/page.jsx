"use client";

/**
 * /merchant/review-status — 审核记录
 * 店铺资质审核状态 + 各商品审核状态与平台反馈，一目了然。
 */

import { useEffect, useState } from "react";
import MerchantShell, { useMerchant } from "@/components/merchant/MerchantShell";
import { listMyProducts } from "@/services/merchantService";
import { MC, Card, SectionTitle, StatusBadge, Empty } from "@/components/merchant/ui";

export default function ReviewStatusRoute() {
  return <MerchantShell active="review-status"><ReviewStatus /></MerchantShell>;
}

function fmt(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function ReviewStatus() {
  const { store } = useMerchant();
  const [products, setProducts] = useState(null);

  useEffect(() => {
    if (store?.id) listMyProducts(store.id).then(setProducts).catch(() => setProducts([]));
    else setProducts([]);
  }, [store?.id]);

  return (
    <>
      <SectionTitle sub="查看店铺与商品的审核进度及平台反馈">审核记录</SectionTitle>

      {/* 店铺审核 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: MC.ink }}>店铺资质审核</div>
            <div style={{ fontSize: 12.5, color: MC.sub, marginTop: 4 }}>
              {store?.reviewed_at ? `最近审核 ${fmt(store.reviewed_at)}` : `提交于 ${fmt(store?.created_at)}`}
            </div>
          </div>
          <StatusBadge kind="store" status={store?.status} />
        </div>
        {store?.status === "rejected" && store?.reject_reason && (
          <div style={{ marginTop: 12, fontSize: 13, color: MC.err, background: MC.errBg, borderRadius: 12, padding: "10px 14px" }}>
            驳回原因：{store.reject_reason}
          </div>
        )}
      </Card>

      {/* 商品审核 */}
      <Card pad={0}>
        <div style={{ padding: "16px 18px 10px", fontSize: 14.5, fontWeight: 800, color: MC.ink }}>商品审核记录</div>
        {products == null ? (
          <div style={{ color: MC.sub, fontSize: 13, padding: 30, textAlign: "center" }}>加载中…</div>
        ) : products.length === 0 ? (
          <Empty icon="📋" title="暂无商品审核记录" />
        ) : (
          products.map((p, i) => (
            <div key={p.id} style={{ padding: "14px 18px", borderTop: i ? `1px solid ${MC.line}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 42, height: 42, borderRadius: 10, background: MC.tint, flexShrink: 0,
                               display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", fontSize: 18 }}>
                  {p.main_image ? <img src={p.main_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🐾"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: MC.text, overflow: "hidden",
                                textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title || "未命名商品"}</div>
                  <div style={{ fontSize: 12, color: MC.sub, marginTop: 3 }}>
                    {p.submitted_at ? `提交 ${fmt(p.submitted_at)}` : "未提交"}{p.reviewed_at ? ` · 审核 ${fmt(p.reviewed_at)}` : ""}
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </div>
              {p.reject_reason && (
                <div style={{ marginTop: 10, marginLeft: 54, fontSize: 12.5, color: MC.err, background: MC.errBg,
                              borderRadius: 10, padding: "8px 12px" }}>
                  平台反馈：{p.reject_reason}
                </div>
              )}
            </div>
          ))
        )}
      </Card>
    </>
  );
}
