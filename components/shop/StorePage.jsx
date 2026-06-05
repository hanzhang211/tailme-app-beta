"use client";

/**
 * components/shop/StorePage.jsx
 * 店铺主页（基础版）：店铺头部信息 + 该店铺商品双列网格。
 */

import BackButton from "@/components/icons/BackButton";
import { getStore, listProductsByStore } from "@/services/shopMock";
import { SC, ProductCard, ProductGrid, Tag, Stars } from "./ShopUI";

export default function StorePage({ storeId, onBack, onOpenProduct }) {
  const store = getStore(storeId);
  const products = store ? listProductsByStore(storeId) : [];

  return (
    <div style={{ minHeight:"100%", background:SC.bg, display:"flex", flexDirection:"column" }}>
      {/* 顶栏 */}
      <div style={{ flexShrink:0, display:"flex", alignItems:"center", gap:10, background:"#fff",
                    borderBottom:`1px solid ${SC.border}`, padding:"52px 14px 12px" }}>
        <BackButton onClick={onBack} size={36} />
        <div style={{ flex:1, textAlign:"center", fontSize:16, fontWeight:800, color:SC.text }}>店铺主页</div>
        <div style={{ width:36 }} />
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"12px 12px 28px" }}>
        {!store ? (
          <div style={{ textAlign:"center", color:SC.sub, padding:"60px 0" }}>店铺不存在</div>
        ) : (
          <>
            {/* 店铺头部 */}
            <div style={{ background:"linear-gradient(135deg, #F7E9D6, #F2E2CE)", borderRadius:20,
                          padding:"18px 16px", display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:64, height:64, borderRadius:20, background:"#fff", flexShrink:0,
                            display:"flex", alignItems:"center", justifyContent:"center", fontSize:34,
                            boxShadow:"0 2px 10px rgba(0,0,0,0.08)" }}>
                {store.emoji}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:18, fontWeight:900, color:SC.text }}>{store.name}</span>
                  {store.official && <Tag tone="pri">官方</Tag>}
                </div>
                <div style={{ fontSize:12.5, color:"#7A6E5E", marginTop:4 }}>{store.desc}</div>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginTop:8, fontSize:12, color:SC.sub }}>
                  <span>商品 <b style={{ color:SC.text }}>{store.productCount}</b></span>
                  <span>粉丝 <b style={{ color:SC.text }}>{store.fans}</b></span>
                  <span style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <Stars rating={store.rating} size={11} /><b style={{ color:SC.text }}>{store.rating}</b>
                  </span>
                </div>
              </div>
            </div>

            {/* 全部商品 */}
            <div style={{ fontSize:15, fontWeight:800, color:SC.text, margin:"18px 2px 12px" }}>
              全部商品 <span style={{ fontSize:12, fontWeight:600, color:SC.sub }}>（{products.length}）</span>
            </div>
            <ProductGrid>
              {products.map((p) => (
                <ProductCard key={p.id} product={p} store={store} onClick={() => onOpenProduct?.(p.id)} />
              ))}
            </ProductGrid>
          </>
        )}
      </div>
    </div>
  );
}
