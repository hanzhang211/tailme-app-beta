"use client";

/**
 * components/home/NewsPage.jsx
 *
 * 活动 / 资讯列表 + 详情 modal
 */

import { useEffect, useState } from "react";
import { listNews } from "@/services/petNewsService";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", text:"#1A1006",
  sub:"#8A8074", light:"#D6D5D8", border:"#D6D5D8",
};

const fmtRel = (iso) => {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const diff = (Date.now() - t) / 1000;
  if (diff < 60)    return "刚刚";
  if (diff < 3600)  return `${Math.floor(diff/60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff/3600)} 小时前`;
  if (diff < 86400 * 7) return `${Math.floor(diff/86400)} 天前`;
  return new Date(iso).toLocaleDateString("zh");
};

export default function NewsPage({ onBack }) {
  const [list,    setList]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState(null);
  const [detail,  setDetail]  = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rs = await listNews();
        if (alive) setList(rs);
      } catch (e) {
        if (alive) setErr(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div style={{ height:"100%", overflowY:"auto", background:C.bg }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"52px 16px 12px", background:"white",
                    borderBottom:`1px solid ${C.border}` }}>
        <button onClick={onBack}
          style={{ background:"transparent", border:"none", cursor:"pointer",
                   fontSize:22, color:C.text, padding:"2px 6px" }}>‹</button>
        <div style={{ fontSize:17, fontWeight:800, color:C.text }}>📰 活动推送</div>
        <div style={{ width:36 }} />
      </div>

      <div style={{ padding:"12px 14px 90px" }}>
        {loading && <div style={{ textAlign:"center", color:C.sub, padding:30 }}>加载中...</div>}
        {err && <div style={{ color:"#D94040", fontSize:12, padding:14 }}>❌ {err}</div>}
        {!loading && !err && list.length === 0 && (
          <div style={{ textAlign:"center", color:C.sub, padding:40 }}>暂无资讯</div>
        )}

        {list.map((n) => (
          <button key={n.id} onClick={() => setDetail(n)}
            style={{ width:"100%", display:"flex", gap:12, alignItems:"flex-start",
                     background:"white", border:`1px solid ${C.border}`, borderRadius:18,
                     padding:"12px 12px", marginBottom:10,
                     cursor:"pointer", textAlign:"left",
                     boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
            <NewsCover news={n} size={72} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:700, color:C.text, lineHeight:1.4,
                            display:"-webkit-box", WebkitLineClamp:2,
                            WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                {n.title}
              </div>
              {n.summary && (
                <div style={{ fontSize:12, color:C.sub, lineHeight:1.5, marginTop:4,
                              display:"-webkit-box", WebkitLineClamp:2,
                              WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                  {n.summary}
                </div>
              )}
              <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:6,
                            fontSize:11, color:C.sub }}>
                {n.source && <span>{n.source}</span>}
                {n.source && <span>·</span>}
                <span>{fmtRel(n.published_at)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {detail && <NewsDetail news={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

/* ────────────────────────────────────────────── */
export function NewsCover({ news, size = 72 }) {
  if (!news) return null;
  if (news.cover_image_url) {
    return (
      <div style={{ width:size, height:size, borderRadius:12, overflow:"hidden",
                    flexShrink:0, background:C.tint }}>
        <img src={news.cover_image_url} alt=""
             loading="lazy" decoding="async"
             style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
      </div>
    );
  }
  return (
    <div style={{ width:size, height:size, borderRadius:12, background:C.tint,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize: Math.round(size * 0.5), flexShrink:0 }}>
      {news.emoji || "📰"}
    </div>
  );
}

/* ────────────────────────────────────────────── */
function NewsDetail({ news, onClose }) {
  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000,
               display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, background:C.bg,
                    borderRadius:"22px 22px 0 0", padding:"18px 18px 28px",
                    maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ width:40, height:4, borderRadius:4, background:C.light,
                      margin:"0 auto 16px" }}/>

        {news.cover_image_url ? (
          <div style={{ width:"100%", borderRadius:14, overflow:"hidden",
                        background:C.tint, marginBottom:14, aspectRatio:"16/9" }}>
            <img src={news.cover_image_url} alt=""
                 style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
          </div>
        ) : (
          <div style={{ width:"100%", borderRadius:14, background:C.tint,
                        aspectRatio:"16/9", display:"flex",
                        alignItems:"center", justifyContent:"center",
                        fontSize:56, marginBottom:14 }}>
            {news.emoji || "📰"}
          </div>
        )}

        <div style={{ fontSize:19, fontWeight:800, color:C.text, lineHeight:1.4 }}>
          {news.title}
        </div>
        <div style={{ display:"flex", gap:6, marginTop:6, fontSize:11, color:C.sub }}>
          {news.source && <span>{news.source}</span>}
          {news.source && <span>·</span>}
          <span>{fmtRel(news.published_at)}</span>
        </div>

        {news.summary && (
          <div style={{ fontSize:13, color:C.text, marginTop:14, lineHeight:1.7,
                        fontStyle:"italic",
                        background:"white", border:`1px solid ${C.border}`,
                        borderRadius:12, padding:"10px 12px",
                        wordBreak:"break-word" }}>
            {news.summary}
          </div>
        )}

        {news.content && (
          <div style={{ fontSize:14, color:C.text, marginTop:14, lineHeight:1.8,
                        whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
            {news.content}
          </div>
        )}

        <button onClick={onClose}
          style={{ width:"100%", marginTop:18, padding:"12px 0", borderRadius:14,
                   fontSize:14, fontWeight:700, background:C.pri, color:"white",
                   border:"none", cursor:"pointer" }}>
          关闭
        </button>
      </div>
    </div>
  );
}
