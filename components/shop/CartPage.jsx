"use client";

/**
 * components/shop/CartPage.jsx
 * 购物车：保障提示 + 按店铺分组 + 全选/单选 + 数量 +/- + 编辑删除 + 底部结算栏。
 */

import { useMemo, useState } from "react";
import BackButton from "@/components/icons/BackButton";
import { useShopData } from "./ShopDataContext";
import { SC, ProductImage, Money, Check, Stepper } from "./ShopUI";

export default function CartPage({ cart, onBack, onSetQty, onToggleItem, onToggleStore, onToggleAll, onRemove, onCheckout, onOpenProduct }) {
  const { getProduct, getStore } = useShopData();
  const [editStores, setEditStores] = useState(() => new Set());
  const toggleEdit = (sid) =>
    setEditStores((s) => { const n = new Set(s); n.has(sid) ? n.delete(sid) : n.add(sid); return n; });

  const groups = useMemo(() => {
    const map = new Map();
    cart.forEach((it) => {
      const p = getProduct(it.productId); if (!p) return;
      if (!map.has(p.storeId)) map.set(p.storeId, { store: getStore(p.storeId), items: [] });
      map.get(p.storeId).items.push({ ...it, product: p });
    });
    return [...map.values()];
  }, [cart, getProduct, getStore]);

  const selItems   = cart.filter((x) => x.selected);
  const selCount   = selItems.length;
  const total      = selItems.reduce((s, x) => s + (getProduct(x.productId)?.price || 0) * x.qty, 0);
  const discount   = selItems.reduce((s, x) => { const p = getProduct(x.productId); return p?.original ? s + (p.original - p.price) * x.qty : s; }, 0);
  const allSelected = cart.length > 0 && cart.every((x) => x.selected);
  const fmt = (n) => (Number.isInteger(n) ? n : n.toFixed(1));

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:SC.bg }}>
      {/* 顶栏 */}
      <div style={{ flexShrink:0, display:"flex", alignItems:"center", gap:10, background:"#fff",
                    borderBottom:`1px solid ${SC.border}`, padding:"52px 14px 12px" }}>
        <BackButton onClick={onBack} size={36} />
        <div style={{ flex:1, textAlign:"center", fontSize:16, fontWeight:800, color:SC.text }}>购物车 ({cart.length})</div>
        <div style={{ width:36 }} />
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"12px 12px 16px" }}>
        {/* 购物保障 */}
        <div style={{ display:"flex", alignItems:"center", gap:8, background:"#FBEFE0", borderRadius:14,
                      padding:"10px 14px", marginBottom:12, fontSize:12.5, color:"#9A6B3C", fontWeight:600 }}>
          🛡️ 购物保障 · 7天无理由退货 · 极速退款
        </div>

        {cart.length === 0 ? (
          <div style={{ textAlign:"center", color:SC.sub, fontSize:14, padding:"64px 20px", lineHeight:2 }}>
            <div style={{ fontSize:42, marginBottom:8 }}>🛒</div>
            购物车还是空的<br />去挑点好物给毛孩子吧～
          </div>
        ) : groups.map(({ store, items }) => {
          const storeSel = items.every((it) => it.selected);
          const editing  = editStores.has(store.id);
          return (
            <div key={store.id} style={{ background:"#fff", borderRadius:18, padding:"12px 14px", marginBottom:12,
                                         boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
              {/* 店铺头 */}
              <div style={{ display:"flex", alignItems:"center", gap:10, paddingBottom:10,
                            borderBottom:`1px solid ${SC.border}` }}>
                <Check on={storeSel} onClick={() => onToggleStore(store.id, !storeSel)} />
                <span style={{ fontSize:14, fontWeight:800, color:SC.text }}>{store.emoji} {store.name}</span>
                <span style={{ fontSize:12, color:SC.sub }}>›</span>
                <div style={{ flex:1 }} />
                <button onClick={() => toggleEdit(store.id)}
                  style={{ background:"transparent", border:"none", cursor:"pointer", fontSize:12.5,
                           color: editing ? SC.pri : SC.sub, fontWeight: editing ? 800 : 600 }}>
                  {editing ? "完成" : "编辑"}
                </button>
              </div>

              {/* 商品行 */}
              {items.map((it) => (
                <div key={it.productId} style={{ display:"flex", alignItems:"center", gap:11, padding:"12px 0",
                                                 borderBottom:`1px solid #F4EEE4` }}>
                  <Check on={it.selected} onClick={() => onToggleItem(it.productId)} />
                  <button onClick={() => onOpenProduct?.(it.productId)}
                    style={{ width:74, height:74, borderRadius:12, overflow:"hidden", flexShrink:0, border:"none", padding:0, cursor:"pointer" }}>
                    <ProductImage src={it.product.cover} emoji={it.product.emoji} toneId={it.product.tone} radius={0} />
                  </button>
                  <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:5 }}>
                    <div style={{ fontSize:13.5, fontWeight:700, color:SC.text, lineHeight:1.35,
                                  display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                      {it.product.title}
                    </div>
                    <div style={{ fontSize:11, color:SC.sub, background:"#F4EEE4", borderRadius:6,
                                  padding:"2px 7px", alignSelf:"flex-start" }}>
                      {it.product.tags?.[0] || "默认规格"}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:2 }}>
                      <Money value={it.product.price} size={16} />
                      {editing
                        ? <button onClick={() => onRemove([it.productId])}
                            style={{ fontSize:12.5, fontWeight:700, color:"#D9534F", background:"transparent",
                                     border:`1px solid #EBC7C5`, borderRadius:8, padding:"4px 12px", cursor:"pointer" }}>
                            删除
                          </button>
                        : <Stepper value={it.qty}
                            onDec={() => onSetQty(it.productId, it.qty - 1)}
                            onInc={() => onSetQty(it.productId, it.qty + 1)} />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* 底部结算栏 */}
      <div style={{ flexShrink:0, display:"flex", alignItems:"center", gap:12, background:"#fff",
                    borderTop:`1px solid ${SC.border}`, padding:"10px 16px calc(10px + env(safe-area-inset-bottom))" }}>
        <Check on={allSelected} onClick={() => onToggleAll(!allSelected)} />
        <span style={{ fontSize:13, color:SC.text }}>全选</span>
        <div style={{ flex:1, textAlign:"right" }}>
          <div style={{ fontSize:13, color:SC.text }}>合计：<Money value={fmt(total)} size={18} /></div>
          {discount > 0 && <div style={{ fontSize:11, color:SC.sub, marginTop:1 }}>已优惠 ¥{fmt(discount)}</div>}
        </div>
        <button onClick={onCheckout} disabled={selCount === 0}
          style={{ padding:"12px 26px", borderRadius:999, fontSize:15, fontWeight:800, border:"none",
                   background: selCount ? SC.pri : "#E5D8C8", color:"#fff", cursor: selCount ? "pointer" : "default",
                   boxShadow: selCount ? "0 4px 14px rgba(230,134,69,0.35)" : "none" }}>
          下单 ({selCount})
        </button>
      </div>
    </div>
  );
}
