"use client";

/**
 * components/shop/ProductDetail.jsx
 * 商品详情页：主图轮播 / 价格信息 / 店铺卡 / 评价 / 店铺推荐 / 详情图 / 底部操作栏。
 * mock 数据驱动，风格统一 TailMe 暖色。
 */

import { useMemo, useState } from "react";
import BackButton from "@/components/icons/BackButton";
import { getProduct, getStore, listReviews, listProductsByStore, fmtSold } from "@/services/shopMock";
import { SC, ProductImage, Money, Tag, StoreCard, ReviewItem } from "./ShopUI";

export default function ProductDetail({ productId, onBack, onOpenStore, onOpenProduct, onAddToCart, onBuyNow, toast }) {
  const product = getProduct(productId);
  const store   = product ? getStore(product.storeId) : null;
  const reviews = useMemo(() => (product ? listReviews(product.id) : []), [productId]);
  const recommend = useMemo(
    () => (product ? listProductsByStore(product.storeId, { excludeId: product.id, limit: 6 }) : []),
    [productId]);

  // mock 多图：用商品 emoji + 几种色调拼出轮播
  const images = useMemo(() => {
    if (!product) return [];
    const tones = [product.tone, "latte", "sage", "peach", "sky", "cream"];
    return tones.slice(0, 6).map((t) => ({ emoji: product.emoji, tone: t }));
  }, [productId]);
  const [idx, setIdx] = useState(0);
  const [faved, setFaved] = useState(false);
  const toggleFav = () => { setFaved((v) => !v); tip(faved ? "已取消收藏" : "已收藏 ⭐"); };

  const detailBlocks = useMemo(() => {
    if (!product) return [];
    return [
      { title: "科学营养配比", sub: "助力毛孩子健康成长", emoji: product.emoji, tone: "cream" },
      { title: "精选优质原料", sub: "看得见的安心好物", emoji: "🌿", tone: "sage" },
      { title: "毛孩子都爱吃", sub: "适口性测试好评如潮", emoji: "🐾", tone: "peach" },
    ];
  }, [productId]);

  const tip = (m) => (toast ? toast(m, "info") : null);

  if (!product) {
    return (
      <div style={{ height:"100%", background:SC.bg, display:"flex", flexDirection:"column" }}>
        <Header onBack={onBack} />
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:SC.sub }}>商品不存在</div>
      </div>
    );
  }

  return (
    <div style={{ height:"100%", background:SC.bg, display:"flex", flexDirection:"column" }}>
      <Header onBack={onBack} onShare={() => tip("分享链接已复制 ✨")} />

      <div style={{ flex:1, overflowY:"auto", paddingBottom:80 }}>
        {/* 主图轮播 */}
        <div style={{ position:"relative", width:"100%", aspectRatio:"1 / 1", background:"#fff" }}>
          <div onScroll={(e) => {
                 const w = e.currentTarget.clientWidth || 1;
                 setIdx(Math.round(e.currentTarget.scrollLeft / w));
               }}
            style={{ position:"absolute", inset:0, display:"flex", overflowX:"auto",
                     scrollSnapType:"x mandatory" }} className="shop-noscroll">
            {images.map((im, i) => (
              <div key={i} style={{ flex:"0 0 100%", width:"100%", height:"100%", scrollSnapAlign:"center" }}>
                <ProductImage emoji={im.emoji} toneId={im.tone} radius={0} />
              </div>
            ))}
          </div>
          <div style={{ position:"absolute", right:12, bottom:12, background:"rgba(0,0,0,0.45)", color:"#fff",
                        fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:999 }}>
            {idx + 1}/{images.length}
          </div>
        </div>

        {/* 价格 / 标题 / 标签 */}
        <Section flush>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
            <Money value={product.price} size={26} />
            <button onClick={toggleFav}
              style={{ background:"transparent", border:"none", cursor:"pointer", display:"flex",
                       flexDirection:"column", alignItems:"center", gap:3, flexShrink:0,
                       color: faved ? SC.pri : SC.sub }}>
              <StarIcon filled={faved} color={faved ? SC.pri : SC.sub} size={20} />
              <span style={{ fontSize:10 }}>收藏</span>
            </button>
          </div>
          {product.original && (
            <div style={{ fontSize:12, color:SC.sub, marginTop:2 }}>
              <span style={{ textDecoration:"line-through" }}>¥{product.original}</span>
              <span style={{ marginLeft:10 }}>已售 {fmtSold(product.soldCount)}</span>
            </div>
          )}
          <div style={{ fontSize:16, fontWeight:800, color:SC.text, lineHeight:1.4, margin:"10px 0 8px" }}>
            {product.title}
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {product.tags.map((t) => <Tag key={t}>{t}</Tag>)}
          </div>
        </Section>

        {/* 店铺卡 */}
        <Section>
          <StoreCard store={store} compact onEnter={() => onOpenStore?.(store.id)} />
        </Section>

        {/* 评价 */}
        <Section>
          <RowTitle title={`用户评价 (${product.soldCount > 1000 ? fmtSold(reviews.length * 437) : reviews.length})`}
                    onMore={() => tip("查看全部评价（mock）")} />
          {reviews.map((r) => <ReviewItem key={r.id} review={r} />)}
        </Section>

        {/* 店铺推荐 */}
        {recommend.length > 0 && (
          <Section>
            <RowTitle title="店铺推荐" onMore={() => onOpenStore?.(store.id)} />
            <div style={{ display:"flex", gap:10, overflowX:"auto", paddingBottom:2 }} className="shop-noscroll">
              {recommend.map((p) => (
                <button key={p.id} onClick={() => onOpenProduct?.(p.id)}
                  style={{ flex:"0 0 116px", width:116, textAlign:"left", border:"none", background:"transparent",
                           cursor:"pointer", padding:0 }}>
                  <div style={{ width:116, height:116, borderRadius:14, overflow:"hidden" }}>
                    <ProductImage emoji={p.emoji} toneId={p.tone} radius={0} />
                  </div>
                  <div style={{ fontSize:12, color:SC.text, marginTop:6, overflow:"hidden",
                                textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.title}</div>
                  <div style={{ marginTop:2 }}><Money value={p.price} size={14} /></div>
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* 商品详情图 */}
        <Section>
          <RowTitle title="商品详情" />
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {detailBlocks.map((b, i) => (
              <div key={i} style={{ position:"relative", width:"100%", aspectRatio:"16 / 9",
                                    borderRadius:16, overflow:"hidden" }}>
                <ProductImage emoji={b.emoji} toneId={b.tone} radius={0} />
                <div style={{ position:"absolute", left:16, bottom:14 }}>
                  <div style={{ fontSize:17, fontWeight:900, color:SC.text }}>{b.title}</div>
                  <div style={{ fontSize:12.5, color:"#6B5F50", marginTop:2 }}>{b.sub}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign:"center", color:SC.sub, fontSize:12, padding:"16px 0 4px" }}>—— 已经到底啦 🐾 ——</div>
        </Section>
      </div>

      {/* 底部操作栏：联系店铺 · 收藏 · 加入购物车 · 立即购买 */}
      <div style={{ flexShrink:0, display:"flex", alignItems:"center", gap:6, background:"#fff",
                    borderTop:`1px solid ${SC.border}`, padding:"9px 12px calc(9px + env(safe-area-inset-bottom))" }}>
        <ActionItem icon={<ChatLineIcon color={SC.sub} />} label="联系店铺"
          onClick={() => tip("正在为你接入店铺客服…")} />
        <ActionItem icon={<StarIcon filled={faved} color={faved ? SC.pri : SC.sub} />} label="收藏"
          color={faved ? SC.pri : SC.sub} onClick={toggleFav} />
        <ActionItem icon={<CartLineIcon color={SC.pri} />} label="加入购物车" color={SC.pri}
          onClick={() => (onAddToCart ? onAddToCart(product.id) : tip("已加入购物车 🛒"))} />
        <button onClick={() => (onBuyNow ? onBuyNow(product.id) : tip("下单功能开发中 ✨"))}
          style={{ flex:1, marginLeft:6, padding:"13px 0", borderRadius:999, fontSize:15, fontWeight:800, cursor:"pointer",
                   background:SC.pri, color:"#fff", border:"none", boxShadow:"0 4px 14px rgba(230,134,69,0.35)" }}>
          立即购买
        </button>
      </div>
    </div>
  );
}

/* 底部操作项：竖排 图标 + 文字 */
function ActionItem({ icon, label, color = SC.sub, onClick }) {
  return (
    <button onClick={onClick}
      style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3,
               background:"transparent", border:"none", cursor:"pointer", flexShrink:0, padding:"2px 8px", color }}>
      {icon}
      <span style={{ fontSize:10.5, fontWeight:600, lineHeight:1 }}>{label}</span>
    </button>
  );
}

/* 线性图标（圆角风格，与 TailMe 一致） */
function ChatLineIcon({ size = 22, color = "#8A8074" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H10l-4 3.2V16H6.5A2.5 2.5 0 0 1 4 13.5z"
            stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="9" cy="10" r="1" fill={color} /><circle cx="12" cy="10" r="1" fill={color} /><circle cx="15" cy="10" r="1" fill={color} />
    </svg>
  );
}
function StarIcon({ size = 22, color = "#8A8074", filled }) {
  const d = "M12 3.6l2.45 4.96 5.47.8-3.96 3.86.93 5.45L12 16.1l-4.89 2.57.93-5.45L4.08 9.36l5.47-.8z";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"} aria-hidden="true">
      <path d={d} stroke={color} strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
function CartLineIcon({ size = 22, color = "#8A8074" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3.5 5H6l2.1 9.4a1.6 1.6 0 0 0 1.56 1.25h7.2a1.6 1.6 0 0 0 1.56-1.2L20.2 8H6.6"
            stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="19.4" r="1.5" fill={color} /><circle cx="17.4" cy="19.4" r="1.5" fill={color} />
    </svg>
  );
}

function Header({ onBack, onShare }) {
  return (
    <div style={{ flexShrink:0, display:"flex", alignItems:"center", gap:10, background:"#fff",
                  borderBottom:`1px solid ${SC.border}`, padding:"52px 14px 12px" }}>
      <BackButton onClick={onBack} size={36} />
      <div style={{ flex:1, textAlign:"center", fontSize:16, fontWeight:800, color:SC.text }}>商品详情</div>
      <button onClick={onShare}
        style={{ width:36, height:36, borderRadius:"50%", border:`1px solid ${SC.border}`, background:"#fff",
                 cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, color:SC.text }}>
        ↗
      </button>
    </div>
  );
}

function Section({ children, flush }) {
  return (
    <div style={{ background:"#fff", margin:"10px 12px 0", borderRadius:18,
                  padding: flush ? "14px 14px 16px" : "14px", boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}>
      {children}
    </div>
  );
}

function RowTitle({ title, onMore }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
      <div style={{ fontSize:15, fontWeight:800, color:SC.text }}>{title}</div>
      {onMore && (
        <button onClick={onMore} style={{ background:"transparent", border:"none", cursor:"pointer",
                 fontSize:12.5, color:SC.sub }}>查看全部 ›</button>
      )}
    </div>
  );
}
