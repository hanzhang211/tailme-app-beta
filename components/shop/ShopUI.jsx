"use client";

/**
 * components/shop/ShopUI.jsx
 *
 * 宠物商城共用 UI 组件 + 配色，统一沿用 TailMe 设计语言：
 *  米白背景 / 白色圆角卡片 / 橙色强调 / 轻阴影 / 大圆角 / 温暖宠物风。
 * 导出：SC(配色)、ProductImage、Money、Tag、Stars、SearchBar、CategoryChips、ProductCard、StoreCard、ReviewItem
 */

import { TONES, CATEGORIES, GRID_CATEGORIES, fmtSold } from "@/services/shopMock";
import CategoryIcon from "./CategoryIcon";

export const SC = {
  bg:"#EEE9E1", card:"#FFFFFF", tint:"#F2E5DA", pri:"#E68645",
  text:"#2A2520", sub:"#8A8074", soft:"#EFE6D8", border:"#ECE3D6",
  star:"#F0A93B",
};

const tone = (id) => TONES[id] || TONES.cream;

/* 商品 / 图片占位：有 url 用图，否则暖色渐变 + emoji（mock 阶段） */
export function ProductImage({ src, emoji = "🐾", toneId = "cream", radius = 16, style }) {
  if (src) {
    return <img src={src} alt="" loading="lazy"
      style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", ...style }} />;
  }
  const [a, b] = tone(toneId);
  return (
    <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center",
                  background:`linear-gradient(135deg, ${a}, ${b})`, borderRadius:radius, ...style }}>
      <span style={{ fontSize:"min(46px, 34%)", lineHeight:1, filter:"drop-shadow(0 2px 4px rgba(0,0,0,0.08))" }}>{emoji}</span>
    </div>
  );
}

export function Money({ value, size = 18, strong = true }) {
  return (
    <span style={{ color:SC.pri, fontWeight: strong ? 900 : 700, lineHeight:1 }}>
      <span style={{ fontSize: size * 0.66 }}>¥</span>
      <span style={{ fontSize: size }}>{value}</span>
    </span>
  );
}

export function Tag({ children, tone: t = "soft" }) {
  const map = {
    soft: { bg:"#FBEEE1", color:SC.pri },
    pri:  { bg:SC.pri, color:"#fff" },
    gray: { bg:"#F1ECE3", color:SC.sub },
  };
  const s = map[t] || map.soft;
  return (
    <span style={{ display:"inline-block", fontSize:10.5, fontWeight:700, lineHeight:1.4,
                   padding:"2px 7px", borderRadius:7, background:s.bg, color:s.color, whiteSpace:"nowrap" }}>
      {children}
    </span>
  );
}

export function Stars({ rating = 5, size = 12 }) {
  return (
    <span style={{ color:SC.star, fontSize:size, letterSpacing:1 }}>
      {"★★★★★".slice(0, Math.round(rating))}<span style={{ color:"#E2D9CC" }}>{"★★★★★".slice(Math.round(rating))}</span>
    </span>
  );
}

export function SearchBar({ value, onChange, placeholder = "搜索商品或店铺", onSubmit }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, background:"#fff",
                  border:`1px solid ${SC.border}`, borderRadius:999, padding:"10px 14px",
                  boxShadow:"0 1px 6px rgba(0,0,0,0.04)" }}>
      <SearchGlyph size={16} color={SC.sub} />
      <input value={value} onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && onSubmit) onSubmit(); }}
        placeholder={placeholder}
        style={{ flex:1, border:"none", outline:"none", background:"transparent",
                 fontSize:14, color:SC.text, minWidth:0 }} />
      <button onClick={onSubmit}
        style={{ width:30, height:30, borderRadius:"50%", border:"none", background:SC.tint,
                 display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
        <SearchGlyph size={15} color={SC.pri} />
      </button>
    </div>
  );
}

export function SearchGlyph({ size = 16, color = "#8A8074" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink:0 }}>
      <circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
      <path d="M20 20l-3.2-3.2" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* 固定 2×5 分类宫格（白色大圆角容器，无横向滚动）—— 与设计稿一致 */
export function CategoryGrid({ active, onPick }) {
  return (
    <div style={{ background:"#fff", borderRadius:22, padding:"18px 8px 12px",
                  boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", rowGap:16 }}>
        {GRID_CATEGORIES.map((c) => {
          const on = active === c.id;
          return (
            <button key={c.id} onClick={() => onPick(c.id)}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8,
                       background:"transparent", border:"none", cursor:"pointer", padding:0 }}>
              <span style={{ width:52, height:52, borderRadius:16, display:"flex",
                             alignItems:"center", justifyContent:"center", transition:"all .15s",
                             background: on ? "#FBE3CE" : "#F6ECDD",
                             border: on ? `1.6px solid ${SC.pri}` : "1.6px solid transparent" }}>
                <CategoryIcon name={c.key} size={32} />
              </span>
              <span style={{ fontSize:12.5, fontWeight: on ? 800 : 600, color: on ? SC.pri : SC.text }}>
                {c.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* 横向滑动分类（旧版，保留以备用） */
export function CategoryChips({ active, onPick }) {
  return (
    <div style={{ display:"flex", gap:10, overflowX:"auto", padding:"2px 0 2px", WebkitOverflowScrolling:"touch" }}
         className="shop-noscroll">
      {CATEGORIES.map((c) => {
        const on = active === c.id;
        return (
          <button key={c.id} onClick={() => onPick(c.id)}
            style={{ flexShrink:0, display:"flex", alignItems:"center", gap:6,
                     padding:"8px 14px", borderRadius:999, cursor:"pointer",
                     border:`1.5px solid ${on ? SC.pri : SC.border}`,
                     background: on ? SC.pri : "#fff", color: on ? "#fff" : SC.text,
                     fontSize:13, fontWeight: on ? 800 : 600, transition:"all .15s" }}>
            <span style={{ fontSize:15 }}>{c.emoji}</span>{c.name}
          </button>
        );
      })}
    </div>
  );
}

/* 商品卡片（双列网格用） */
export function ProductCard({ product, store, onClick }) {
  return (
    <button onClick={onClick}
      style={{ display:"flex", flexDirection:"column", textAlign:"left", padding:0, cursor:"pointer",
               background:"#fff", border:"none", borderRadius:18, overflow:"hidden",
               boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
      <div style={{ position:"relative", width:"100%", aspectRatio:"1 / 1" }}>
        <ProductImage src={product.cover} emoji={product.emoji} toneId={product.tone} radius={0} />
        {product.tags?.[0] && (
          <span style={{ position:"absolute", top:8, left:8 }}>
            <Tag tone="pri">{product.original ? "热卖" : product.tags[0].length <= 4 ? product.tags[0] : "推荐"}</Tag>
          </span>
        )}
      </div>
      <div style={{ padding:"9px 11px 12px", display:"flex", flexDirection:"column", gap:5 }}>
        <div style={{ fontSize:13.5, fontWeight:700, color:SC.text, lineHeight:1.35,
                      display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden", minHeight:37 }}>
          {product.title}
        </div>
        <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
          <Money value={product.price} size={17} />
          {product.original && (
            <span style={{ fontSize:11, color:SC.sub, textDecoration:"line-through" }}>¥{product.original}</span>
          )}
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:6 }}>
          <span style={{ fontSize:11, color:SC.sub, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {store?.name || ""}
          </span>
          <span style={{ fontSize:11, color:SC.sub, flexShrink:0 }}>已售 {fmtSold(product.soldCount)}</span>
        </div>
      </div>
    </button>
  );
}

/* 店铺卡片 */
export function StoreCard({ store, onEnter, compact }) {
  if (!store) return null;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, background:"#fff",
                  borderRadius:18, padding:"12px 14px", boxShadow: compact ? "none" : "0 2px 12px rgba(0,0,0,0.05)" }}>
      <div style={{ width:44, height:44, borderRadius:14, background:SC.tint, flexShrink:0,
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>
        {store.emoji}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:14.5, fontWeight:800, color:SC.text,
                         overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{store.name}</span>
          {store.official && <Tag tone="soft">官方</Tag>}
        </div>
        <div style={{ fontSize:11.5, color:SC.sub, marginTop:3,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          商品 {store.productCount} · 粉丝 {store.fans} · 评分 {store.rating}
        </div>
      </div>
      {onEnter && (
        <button onClick={onEnter}
          style={{ flexShrink:0, padding:"7px 14px", borderRadius:999, fontSize:12.5, fontWeight:800,
                   background:"#fff", color:SC.pri, border:`1.5px solid ${SC.pri}`, cursor:"pointer" }}>
          进店看看
        </button>
      )}
    </div>
  );
}

export function ReviewItem({ review }) {
  return (
    <div style={{ display:"flex", gap:10, padding:"10px 0" }}>
      <div style={{ width:34, height:34, borderRadius:"50%", background:SC.tint, flexShrink:0,
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
        {review.userEmoji || "🐾"}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
          <span style={{ fontSize:13, fontWeight:700, color:SC.text }}>{review.userName}</span>
          <span style={{ fontSize:11, color:SC.sub }}>{review.time}</span>
        </div>
        <div style={{ margin:"2px 0 4px" }}><Stars rating={review.rating} /></div>
        <div style={{ fontSize:13, color:"#5C5247", lineHeight:1.55 }}>{review.content}</div>
      </div>
    </div>
  );
}

/* 双列网格容器 */
export function ProductGrid({ children }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>{children}</div>
  );
}

/* 隐藏横向滚动条样式（一次性注入） */
export function ShopStyles() {
  return <style>{`.shop-noscroll::-webkit-scrollbar{display:none;} .shop-noscroll{scrollbar-width:none;-ms-overflow-style:none;}`}</style>;
}
