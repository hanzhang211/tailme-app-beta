"use client";

/**
 * components/home/RecipePage.jsx
 *
 * 宠物食谱：返回按钮 + 食谱网格 + 详情弹窗
 * 内置食谱来自 DB seed（is_builtin=true）
 * 后期支持用户自建：service 已暴露 createRecipe/updateRecipe/deleteRecipe（UI 暂未开放入口）
 */

import { useEffect, useState } from "react";
import { listRecipes } from "@/services/petRecipeService";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", text:"#1A1006",
  sub:"#8A8074", light:"#D6D5D8", border:"#D6D5D8",
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

  return (
    <div style={{ height:"100%", overflowY:"auto", background:C.bg }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"52px 16px 12px", background:"white",
                    borderBottom:`1px solid ${C.border}` }}>
        <button onClick={onBack}
          style={{ background:"transparent", border:"none", cursor:"pointer",
                   fontSize:22, color:C.text, padding:"2px 6px" }}>‹</button>
        <div style={{ fontSize:17, fontWeight:800, color:C.text }}>🍱 宠物食谱</div>
        <div style={{ width:36 }} />
      </div>

      <div style={{ padding:"14px 14px 0" }}>
        <div style={{ fontSize:12, color:C.sub, marginBottom:10, paddingLeft:4 }}>
          为毛孩子精心准备的家常菜谱
        </div>
      </div>

      <div style={{ padding:"6px 12px 90px" }}>
        {loading && <div style={{ textAlign:"center", color:C.sub, padding:30 }}>加载中...</div>}
        {err && <div style={{ color:"#D94040", fontSize:12, padding:14 }}>❌ {err}</div>}
        {!loading && !err && list.length === 0 && (
          <div style={{ textAlign:"center", color:C.sub, padding:40 }}>暂无食谱</div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {list.map((r) => (
            <button key={r.id} onClick={() => setDetail(r)}
              style={{ background:"white", borderRadius:18, padding:"14px 12px",
                       border:`1px solid ${C.border}`, cursor:"pointer", textAlign:"left",
                       boxShadow:"0 2px 8px rgba(0,0,0,0.04)",
                       display:"flex", flexDirection:"column", gap:8 }}>
              <div style={{ width:56, height:56, borderRadius:14, background:C.tint,
                            display:"flex", alignItems:"center", justifyContent:"center",
                            fontSize:32, alignSelf:"center" }}>
                {r.emoji || "🍱"}
              </div>
              <div style={{ fontSize:13, fontWeight:700, color:C.text, lineHeight:1.4 }}>
                {r.title}
              </div>
              {r.suitable_for && (
                <div style={{ fontSize:11, color:C.sub, lineHeight:1.4,
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

      {detail && <RecipeDetail recipe={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

/* ────────────────────────────────────────────── */
function RecipeDetail({ recipe, onClose }) {
  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000,
               display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, background:C.bg,
                    borderRadius:"22px 22px 0 0", padding:"18px 18px 28px",
                    maxHeight:"86vh", overflowY:"auto" }}>
        <div style={{ width:40, height:4, borderRadius:4, background:C.light,
                      margin:"0 auto 16px" }}/>

        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
          <div style={{ width:64, height:64, borderRadius:18, background:C.tint,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:36, flexShrink:0 }}>
            {recipe.emoji || "🍱"}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:18, fontWeight:800, color:C.text }}>{recipe.title}</div>
            {recipe.suitable_for && (
              <div style={{ fontSize:12, color:C.sub, marginTop:3 }}>{recipe.suitable_for}</div>
            )}
          </div>
        </div>

        <Section label="🥘 食材" body={recipe.ingredients} />
        <Section label="👩‍🍳 做法" body={recipe.steps} preserve />
        <Section label="🌱 营养" body={recipe.nutrition} />
        <Section label="⚠️ 注意" body={recipe.notes} warn />

        <button onClick={onClose}
          style={{ width:"100%", marginTop:6, padding:"12px 0", borderRadius:14,
                   fontSize:14, fontWeight:700, background:C.pri, color:"white",
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
      <div style={{ fontSize:12, fontWeight:700, color: warn ? "#D94040" : C.text,
                    marginBottom:6 }}>
        {label}
      </div>
      <div style={{ fontSize:13, color:C.text, lineHeight:1.7,
                    background:"white", borderRadius:12, padding:"10px 12px",
                    border:`1px solid ${C.border}`,
                    whiteSpace: preserve ? "pre-wrap" : "normal",
                    wordBreak:"break-word" }}>
        {body}
      </div>
    </div>
  );
}
