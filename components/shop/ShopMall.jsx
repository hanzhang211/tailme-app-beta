"use client";

/**
 * components/shop/ShopMall.jsx
 *
 * 宠物商城（全屏浮层）。内部用一个简单的视图栈管理：
 *   home → product(详情) → store(店铺) ，可层层返回，home 再返回则关闭整个商城。
 * 首页：返回键 + 标题 + 搜索 + 横滑分类 + 排序 + 双列商品网格 + 店铺搜索结果。
 * mock 数据驱动（services/shopMock）。
 */

import { useMemo, useState } from "react";
import BackButton from "@/components/icons/BackButton";
import { listProducts, getStore, searchStores } from "@/services/shopMock";
import {
  SC, SearchBar, CategoryGrid, ProductCard, ProductGrid, StoreCard, ShopStyles,
} from "./ShopUI";
import ProductDetail from "./ProductDetail";
import StorePage from "./StorePage";

const SORTS = [
  { key: "recommend", label: "推荐" },
  { key: "sales",     label: "销量" },
  { key: "new",       label: "新品" },
  { key: "price",     label: "价格" },
];

export default function ShopMall({ onClose, toast }) {
  // 视图栈：底为 home
  const [stack, setStack] = useState([{ name: "home" }]);
  const top = stack[stack.length - 1];
  const push = (v) => setStack((s) => [...s, v]);
  const pop  = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const back = () => { if (stack.length > 1) pop(); else onClose?.(); };

  // 首页筛选状态（提到外层以便返回时保留）
  const [cat, setCat]   = useState("all");
  const [q, setQ]       = useState("");
  const [sort, setSort] = useState("recommend");
  const [priceDir, setPriceDir] = useState("asc"); // 价格排序方向：asc 低→高 / desc 高→低

  return (
    <div style={{ position:"fixed", inset:0, zIndex:300, background:SC.bg }}>
      <ShopStyles />
      {top.name === "product" ? (
        <ProductDetail productId={top.id} toast={toast}
          onBack={back}
          onOpenStore={(id) => push({ name: "store", id })}
          onOpenProduct={(id) => push({ name: "product", id })} />
      ) : top.name === "store" ? (
        <StorePage storeId={top.id} onBack={back}
          onOpenProduct={(id) => push({ name: "product", id })} />
      ) : (
        <ShopHome
          cat={cat} setCat={setCat} q={q} setQ={setQ} sort={sort} setSort={setSort}
          priceDir={priceDir} setPriceDir={setPriceDir}
          onBack={back}
          onOpenProduct={(id) => push({ name: "product", id })}
          onOpenStore={(id) => push({ name: "store", id })} />
      )}
    </div>
  );
}

function ShopHome({ cat, setCat, q, setQ, sort, setSort, priceDir, setPriceDir, onBack, onOpenProduct, onOpenStore }) {
  const products = useMemo(() => {
    let rows = listProducts({ categoryId: cat, q });
    if (sort === "sales") rows = [...rows].sort((a, b) => b.soldCount - a.soldCount);
    else if (sort === "price") rows = [...rows].sort((a, b) => priceDir === "asc" ? a.price - b.price : b.price - a.price);
    else if (sort === "new") rows = [...rows].reverse();
    return rows;
  }, [cat, q, sort, priceDir]);

  const onSortClick = (key) => {
    if (key === "price") {
      // 首次点击：低→高；之后每次点击切换方向
      if (sort !== "price") { setSort("price"); setPriceDir("asc"); }
      else setPriceDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
    }
  };

  const stores = useMemo(() => (q.trim() ? searchStores(q) : []), [q]);

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" }}>
      {/* 顶栏 */}
      <div style={{ flexShrink:0, background:SC.bg, padding:"52px 14px 8px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
          <BackButton onClick={onBack} size={36} />
          <div style={{ flex:1, textAlign:"center", fontSize:18, fontWeight:900, color:SC.text }}>宠物商城</div>
          <div style={{ width:36 }} />
        </div>
        <SearchBar value={q} onChange={setQ} onSubmit={() => {}} />
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"6px 14px 28px" }}>
        {/* 分类（固定 2×5 宫格；再次点击已选分类即取消筛选） */}
        <div style={{ margin:"6px 0 14px" }}>
          <CategoryGrid active={cat} onPick={(id) => setCat((c) => (c === id ? "all" : id))} />
        </div>

        {/* 排序 */}
        <div style={{ display:"flex", alignItems:"center", gap:18, padding:"2px 2px 12px",
                      borderBottom:`1px solid ${SC.border}`, marginBottom:14 }}>
          {SORTS.map((s) => {
            const on = sort === s.key;
            const isPrice = s.key === "price";
            return (
              <button key={s.key} onClick={() => onSortClick(s.key)}
                style={{ display:"flex", alignItems:"center", gap:4,
                         background:"transparent", border:"none", cursor:"pointer", padding:0,
                         fontSize:14, fontWeight: on ? 900 : 600, color: on ? SC.pri : SC.sub }}>
                {s.label}
                {isPrice && <PriceArrows active={on} dir={priceDir} />}
              </button>
            );
          })}
        </div>

        {/* 店铺搜索结果 */}
        {stores.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:800, color:SC.sub, margin:"0 2px 8px" }}>相关店铺</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {stores.map((s) => (
                <StoreCard key={s.id} store={s} onEnter={() => onOpenStore(s.id)} />
              ))}
            </div>
          </div>
        )}

        {/* 商品网格 */}
        {products.length === 0 ? (
          <div style={{ textAlign:"center", color:SC.sub, fontSize:14, padding:"56px 20px", lineHeight:2 }}>
            <div style={{ fontSize:40, marginBottom:8 }}>🐾</div>
            没有找到相关商品<br />换个关键词或分类看看吧～
          </div>
        ) : (
          <ProductGrid>
            {products.map((p) => (
              <ProductCard key={p.id} product={p} store={getStore(p.storeId)}
                onClick={() => onOpenProduct(p.id)} />
            ))}
          </ProductGrid>
        )}
      </div>
    </div>
  );
}

/* 价格排序的上下箭头：低→高时上箭头橙色高亮，高→低时下箭头橙色高亮，未选中均为灰 */
function PriceArrows({ active, dir }) {
  const ON = SC.pri, OFF = "#C7BEB0";
  const up   = active && dir === "asc"  ? ON : OFF;
  const down = active && dir === "desc" ? ON : OFF;
  return (
    <span style={{ display:"inline-flex", flexDirection:"column", alignItems:"center", lineHeight:0, gap:1 }}>
      <svg width="9" height="6" viewBox="0 0 10 6" aria-hidden="true">
        <path d="M5 0 L10 6 H0 Z" fill={up} />
      </svg>
      <svg width="9" height="6" viewBox="0 0 10 6" aria-hidden="true">
        <path d="M5 6 L0 0 H10 Z" fill={down} />
      </svg>
    </span>
  );
}
