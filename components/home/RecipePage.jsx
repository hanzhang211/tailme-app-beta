"use client";

/**
 * components/home/RecipePage.jsx — 宠物食谱（Apple Widget 风格重设计）
 * 保留全部逻辑，仅升级 UI
 */

import { useEffect, useState } from "react";
import { listRecipes } from "@/services/petRecipeService";
import { RecipeIcon } from "@/components/icons/HomeModuleIcons";

const BG   = "#F4ECD9";
const PRI  = "#E68645";
const TEXT = "#1A1006";
const SUB  = "#8A7B6A";

const card = {
  background: "rgba(255,255,255,0.55)",
  borderRadius: 28,
  boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
  border: "1px solid rgba(255,255,255,0.55)",
};

export default function RecipePage({ onBack }) {
  const [list,    setList]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState(null);
  const [detail,  setDetail]  = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rs = await listRecipes();
        if (alive) setList(rs);
      } catch (e) {
        if (alive) setErr(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const featured = list[0] || null;
  const hotList  = list.slice(0, 4);

  return (
    <div style={{ height:"100%", overflowY:"auto", background:BG }}>

      {/* ── Header ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"52px 16px 14px" }}>
        <button onClick={onBack}
          style={{ width:40, height:40, borderRadius:999,
                   background:"rgba(255,255,255,0.6)", border:"none", cursor:"pointer",
                   fontSize:22, color:TEXT, display:"flex", alignItems:"center",
                   justifyContent:"center", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>‹</button>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <RecipeIcon size={20} color={TEXT} />
          <span style={{ fontSize:17, fontWeight:800, color:TEXT }}>宠物食谱</span>
        </div>
        <div style={{ width:40 }} />
      </div>

      <div style={{ padding:"0 16px 90px", display:"flex", flexDirection:"column", gap:14 }}>

        {/* ── 今日推荐 Hero ── */}
        {!loading && featured && (
          <div style={{ ...card, padding:"24px 20px", position:"relative", overflow:"hidden",
                        cursor:"pointer" }}
               onClick={() => setDetail(featured)}>
            <div style={{ position:"absolute", bottom:-15, right:-15, opacity:0.08,
                          transform:"scale(0.78)", transformOrigin:"bottom right",
                          pointerEvents:"none", color:TEXT }}>
              <svg width="100" height="100" viewBox="0 0 100 100" fill="none"
                   stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 52 Q15 82 50 82 Q85 82 85 52"/>
                <ellipse cx="50" cy="52" rx="35" ry="10"/>
                <line x1="50" y1="82" x2="50" y2="91"/>
                <line x1="36" y1="91" x2="64" y2="91"/>
              </svg>
            </div>
            <div style={{ fontSize:12, color:SUB, marginBottom:4, fontWeight:500 }}>今日推荐</div>
            <div style={{ fontSize:36, fontWeight:800, color:TEXT, lineHeight:1.2, marginBottom:12 }}>
              {featured.title}
            </div>
            <div style={{ display:"inline-flex", alignItems:"center", gap:6,
                          background:"rgba(230,134,69,0.12)", borderRadius:999, padding:"5px 12px" }}>
              <span style={{ fontSize:11, color:PRI, fontWeight:600 }}>
                {featured.suitable_for || "营养均衡 · 适口性佳"}
              </span>
              <span style={{ fontSize:14 }}>😊</span>
            </div>
          </div>
        )}

        {/* ── 热门食谱 ── */}
        {hotList.length > 0 && (
          <div style={{ ...card, padding:"20px" }}>
            <div style={{ display:"flex", justifyContent:"space-between",
                          alignItems:"center", marginBottom:14 }}>
              <span style={{ fontSize:14, fontWeight:700, color:TEXT }}>热门食谱</span>
              <span style={{ fontSize:12, color:PRI, fontWeight:600 }}>全部 ›</span>
            </div>
            <div style={{ display:"flex", gap:10, overflowX:"auto",
                          scrollbarWidth:"none", WebkitOverflowScrolling:"touch" }}>
              {hotList.map((r) => (
                <button key={r.id} onClick={() => setDetail(r)}
                  style={{ flex:"0 0 auto", width:88,
                           background:"rgba(255,255,255,0.7)", borderRadius:20,
                           border:"none", cursor:"pointer", padding:"12px 8px",
                           display:"flex", flexDirection:"column", alignItems:"center", gap:6,
                           boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
                  <div style={{ width:48, height:48, borderRadius:14,
                                background:"rgba(244,236,217,0.8)",
                                display:"flex", alignItems:"center", justifyContent:"center",
                                fontSize:26 }}>
                    {r.emoji || "🍱"}
                  </div>
                  <div style={{ fontSize:11, fontWeight:700, color:TEXT, lineHeight:1.3,
                                textAlign:"center", width:"100%",
                                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {r.title}
                  </div>
                  {r.suitable_for && (
                    <div style={{ fontSize:9, color:SUB, textAlign:"center", lineHeight:1.3,
                                  overflow:"hidden", display:"-webkit-box",
                                  WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                      {r.suitable_for}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── 全部食谱网格 ── */}
        <div>
          <div style={{ fontSize:12, color:SUB, marginBottom:10, paddingLeft:4, fontWeight:600 }}>
            全部食谱
          </div>
          {loading && <div style={{ textAlign:"center", color:SUB, padding:30 }}>加载中...</div>}
          {err && <div style={{ color:"#D94040", fontSize:12, padding:14 }}>❌ {err}</div>}
          {!loading && !err && list.length === 0 && (
            <div style={{ ...card, padding:"32px 20px", textAlign:"center",
                          color:"#9A9188", fontSize:13 }}>
              暂无食谱
            </div>
          )}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {list.map((r) => (
              <button key={r.id} onClick={() => setDetail(r)}
                style={{ ...card, padding:"16px 12px", cursor:"pointer", textAlign:"left",
                         display:"flex", flexDirection:"column", gap:8, border:"none",
                         background:"rgba(255,255,255,0.55)" }}>
                <div style={{ width:52, height:52, borderRadius:14,
                              background:"rgba(244,236,217,0.9)",
                              display:"flex", alignItems:"center", justifyContent:"center",
                              fontSize:28, alignSelf:"center" }}>
                  {r.emoji || "🍱"}
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:TEXT, lineHeight:1.4 }}>
                  {r.title}
                </div>
                {r.suitable_for && (
                  <div style={{ fontSize:11, color:SUB, lineHeight:1.4,
                                overflow:"hidden", textOverflow:"ellipsis",
                                display:"-webkit-box", WebkitLineClamp:2,
                                WebkitBoxOrient:"vertical" }}>
                    {r.suitable_for}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {detail && <RecipeDetail recipe={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

/* ── RecipeDetail (logic unchanged) ── */
function RecipeDetail({ recipe, onClose }) {
  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000,
               display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, background:"#EEE9E1",
                    borderRadius:"22px 22px 0 0", padding:"18px 18px 28px",
                    maxHeight:"86vh", overflowY:"auto" }}>
        <div style={{ width:40, height:4, borderRadius:4, background:"#D6D5D8",
                      margin:"0 auto 16px" }}/>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
          <div style={{ width:64, height:64, borderRadius:18,
                        background:"rgba(244,236,217,0.9)",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:36, flexShrink:0 }}>
            {recipe.emoji || "🍱"}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:18, fontWeight:800, color:TEXT }}>{recipe.title}</div>
            {recipe.suitable_for && (
              <div style={{ fontSize:12, color:SUB, marginTop:3 }}>{recipe.suitable_for}</div>
            )}
          </div>
        </div>
        <Section label="🥘 食材" body={recipe.ingredients} />
        <Section label="👩‍🍳 做法" body={recipe.steps} preserve />
        <Section label="🌱 营养" body={recipe.nutrition} />
        <Section label="⚠️ 注意" body={recipe.notes} warn />
        <button onClick={onClose}
          style={{ width:"100%", marginTop:6, padding:"12px 0", borderRadius:14,
                   fontSize:14, fontWeight:700, background:PRI, color:"white",
                   border:"none", cursor:"pointer" }}>
          关闭
        </button>
      </div>
    </div>
  );
}

function Section({ label, body, preserve, warn }) {
  if (!body) return null;
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:12, fontWeight:700, color: warn ? "#D94040" : TEXT, marginBottom:6 }}>
        {label}
      </div>
      <div style={{ fontSize:13, color:TEXT, lineHeight:1.7,
                    background:"rgba(255,255,255,0.6)", borderRadius:12, padding:"10px 12px",
                    border:"1px solid rgba(255,255,255,0.55)",
                    whiteSpace: preserve ? "pre-wrap" : "normal", wordBreak:"break-word" }}>
        {body}
      </div>
    </div>
  );
}
