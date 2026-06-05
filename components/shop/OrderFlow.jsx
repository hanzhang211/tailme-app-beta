"use client";

/**
 * components/shop/OrderFlow.jsx
 * 下单流程：ConfirmOrder(确认订单) / AddressPicker(选择地址) / PaySuccess(支付成功)。
 * 参考淘宝逻辑，mock 数据驱动，TailMe 暖色风格。
 */

import { useMemo } from "react";
import BackButton from "@/components/icons/BackButton";
import { useShopData } from "./ShopDataContext";
import { SC, ProductImage, Money, Check } from "./ShopUI";

const fmt = (n) => (Number.isInteger(n) ? n : n.toFixed(1));

function TopBar({ title, onBack, right }) {
  return (
    <div style={{ flexShrink:0, display:"flex", alignItems:"center", gap:10, background:"#fff",
                  borderBottom:`1px solid ${SC.border}`, padding:"52px 14px 12px" }}>
      <BackButton onClick={onBack} size={36} />
      <div style={{ flex:1, textAlign:"center", fontSize:16, fontWeight:800, color:SC.text }}>{title}</div>
      <div style={{ width:36, display:"flex", justifyContent:"flex-end" }}>{right}</div>
    </div>
  );
}

/* ── 确认订单 ───────────────────────────────── */
export function ConfirmOrder({ cart, address, onBack, onPickAddress, onSubmit }) {
  const { getProduct, getStore } = useShopData();
  const items = useMemo(() => cart.filter((x) => x.selected).map((x) => ({ ...x, product: getProduct(x.productId) })).filter((x) => x.product), [cart, getProduct]);
  const goods    = items.reduce((s, x) => s + x.product.price * x.qty, 0);
  const discount = items.reduce((s, x) => x.product.original ? s + (x.product.original - x.product.price) * x.qty : s, 0);
  const total    = goods; // 运费 0；合计 = 商品金额（已优惠为划线价口径）

  // 按店铺分组
  const groups = useMemo(() => {
    const map = new Map();
    items.forEach((it) => {
      if (!map.has(it.product.storeId)) map.set(it.product.storeId, { store: getStore(it.product.storeId), items: [] });
      map.get(it.product.storeId).items.push(it);
    });
    return [...map.values()];
  }, [items, getStore]);

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:SC.bg }}>
      <TopBar title="确认订单" onBack={onBack} />
      <div style={{ flex:1, overflowY:"auto", padding:"12px 12px 16px" }}>
        {/* 收货地址 */}
        <button onClick={onPickAddress}
          style={{ width:"100%", textAlign:"left", background:"#fff", border:"none", borderRadius:18,
                   padding:"14px", marginBottom:12, cursor:"pointer", boxShadow:"0 2px 12px rgba(0,0,0,0.05)",
                   display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:20 }}>📍</span>
          {address ? (
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:800, color:SC.text }}>
                {address.name} <span style={{ fontWeight:600, color:SC.sub, marginLeft:6 }}>{address.phone}</span>
              </div>
              <div style={{ fontSize:12.5, color:"#6B5F50", marginTop:3, lineHeight:1.5 }}>{address.addr}</div>
            </div>
          ) : <div style={{ flex:1, fontSize:14, color:SC.sub }}>请选择收货地址</div>}
          <span style={{ fontSize:16, color:SC.sub }}>›</span>
        </button>

        {/* 商品（按店铺） */}
        {groups.map(({ store, items: its }) => (
          <div key={store.id} style={{ background:"#fff", borderRadius:18, padding:"12px 14px", marginBottom:12,
                                       boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize:14, fontWeight:800, color:SC.text, paddingBottom:10, borderBottom:`1px solid ${SC.border}` }}>
              {store.emoji} {store.name}
            </div>
            {its.map((it) => (
              <div key={it.productId} style={{ display:"flex", gap:11, padding:"12px 0", borderBottom:`1px solid #F4EEE4` }}>
                <div style={{ width:64, height:64, borderRadius:12, overflow:"hidden", flexShrink:0 }}>
                  <ProductImage src={it.product.cover} emoji={it.product.emoji} toneId={it.product.tone} radius={0} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:SC.text, lineHeight:1.35,
                                display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                    {it.product.title}
                  </div>
                  <div style={{ fontSize:11, color:SC.sub, marginTop:3 }}>{it.product.tags?.[0] || "默认规格"}</div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:5 }}>
                    <Money value={it.product.price} size={15} />
                    <span style={{ fontSize:12, color:SC.sub }}>×{it.qty}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* 金额明细 */}
        <div style={{ background:"#fff", borderRadius:18, padding:"6px 14px", boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
          <AmtRow label="商品金额" value={`¥${fmt(goods + discount)}`} />
          <AmtRow label="运费" value="¥0" />
          {discount > 0 && <AmtRow label="优惠" value={`-¥${fmt(discount)}`} accent />}
        </div>
      </div>

      {/* 底部 */}
      <div style={{ flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
                    background:"#fff", borderTop:`1px solid ${SC.border}`, padding:"10px 16px calc(10px + env(safe-area-inset-bottom))" }}>
        <div style={{ fontSize:14, color:SC.text }}>合计：<Money value={fmt(total)} size={20} /></div>
        <button onClick={onSubmit} disabled={items.length === 0}
          style={{ padding:"12px 30px", borderRadius:999, fontSize:15, fontWeight:800, border:"none",
                   background: items.length ? SC.pri : "#E5D8C8", color:"#fff", cursor: items.length ? "pointer" : "default",
                   boxShadow: items.length ? "0 4px 14px rgba(230,134,69,0.35)" : "none" }}>
          提交订单
        </button>
      </div>
    </div>
  );
}

function AmtRow({ label, value, accent }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 0",
                  fontSize:13, color: accent ? SC.pri : SC.text }}>
      <span style={{ color: accent ? SC.pri : SC.sub }}>{label}</span>
      <span style={{ fontWeight:700 }}>{value}</span>
    </div>
  );
}

/* ── 选择地址 ───────────────────────────────── */
export function AddressPicker({ addresses, selectedId, onPick, onBack, onNew }) {
  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:SC.bg }}>
      <TopBar title="选择地址" onBack={onBack} />
      <div style={{ flex:1, overflowY:"auto", padding:"12px 12px 16px" }}>
        <div style={{ background:"#fff", borderRadius:18, padding:"4px 14px", boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
          {addresses.map((a, i) => (
            <button key={a.id} onClick={() => onPick(a.id)}
              style={{ width:"100%", textAlign:"left", display:"flex", alignItems:"center", gap:12, background:"transparent",
                       border:"none", cursor:"pointer", padding:"14px 0",
                       borderBottom: i < addresses.length - 1 ? `1px solid #F4EEE4` : "none" }}>
              <Check on={selectedId === a.id} onClick={() => onPick(a.id)} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:14.5, fontWeight:800, color:SC.text }}>{a.name}</span>
                  <span style={{ fontSize:12.5, color:SC.sub }}>{a.phone}</span>
                  {a.tag && <span style={{ fontSize:10.5, color:SC.pri, background:"#FBEEE1", borderRadius:6, padding:"1px 6px" }}>{a.tag}</span>}
                  {a.isDefault && <span style={{ fontSize:10.5, color:"#fff", background:SC.pri, borderRadius:6, padding:"1px 6px" }}>默认</span>}
                </div>
                <div style={{ fontSize:12.5, color:"#6B5F50", marginTop:4, lineHeight:1.5 }}>{a.addr}</div>
              </div>
            </button>
          ))}
        </div>
        <button onClick={onNew}
          style={{ width:"100%", marginTop:14, padding:"13px 0", borderRadius:14, fontSize:14, fontWeight:700,
                   background:"#fff", color:SC.pri, border:`1.5px dashed ${SC.pri}`, cursor:"pointer" }}>
          ＋ 新建地址
        </button>
      </div>
    </div>
  );
}

/* ── 支付成功 ───────────────────────────────── */
export function PaySuccess({ onHome, onViewOrder }) {
  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:SC.bg }}>
      <TopBar title="支付结果" onBack={onHome} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 30px" }}>
        <div style={{ width:84, height:84, borderRadius:"50%", background:"#FBEFE0",
                      display:"flex", alignItems:"center", justifyContent:"center", marginBottom:18 }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill={SC.pri} opacity="0.15" />
            <path d="M7 12.5 L10.5 16 L17 8.5" stroke={SC.pri} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ fontSize:20, fontWeight:900, color:SC.text }}>支付成功</div>
        <div style={{ fontSize:13, color:SC.sub, marginTop:8, textAlign:"center", lineHeight:1.6 }}>
          订单已提交，感谢您的购买 🐾<br />我们会尽快为毛孩子安排发货
        </div>
        <div style={{ display:"flex", gap:12, marginTop:28, width:"100%", maxWidth:300 }}>
          <button onClick={onViewOrder}
            style={{ flex:1, padding:"12px 0", borderRadius:999, fontSize:14, fontWeight:700,
                     background:"#fff", color:SC.text, border:`1.5px solid ${SC.border}`, cursor:"pointer" }}>
            查看订单
          </button>
          <button onClick={onHome}
            style={{ flex:1, padding:"12px 0", borderRadius:999, fontSize:14, fontWeight:800,
                     background:SC.pri, color:"#fff", border:"none", cursor:"pointer" }}>
            继续购物
          </button>
        </div>
      </div>
    </div>
  );
}
