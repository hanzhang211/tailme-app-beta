"use client";

/**
 * components/home/RecipePage.jsx — 宠物食谱（Apple Widget 风格重设计）
 * 保留全部逻辑，仅升级 UI
 */

import { useEffect, useState } from "react";
import { listRecipes } from "@/services/petRecipeService";
import { RecipeIcon } from "@/components/icons/HomeModuleIcons";
import {
  Camera, ChevronLeft, Leaf, Soup, HeartPulse, Lightbulb,
} from "lucide-react";

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
          <RecipeIcon size={32} color={TEXT} />
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

/* ── helpers ── */
function parseSteps(text) {
  if (!text) return [];
  return text.split("\n")
    .map((s) => s.replace(/^\d+[\.\、\s]+/, "").trim())
    .filter((s) => s.length > 0);
}
function parseIngredients(text) {
  if (!text) return [];
  return text.split(/[、，,]/).map((s) => s.trim()).filter((s) => s.length > 0);
}
function deriveChips(recipe) {
  const chips = [];
  const txt = (recipe.nutrition || "") + (recipe.suitable_for || "");
  if (txt.includes("蛋白") || txt.includes("低脂") || txt.includes("高蛋白"))
    chips.push({ label:"低脂高蛋白", Icon:Leaf });
  chips.push({ label:"易消化", Icon:Soup });
  chips.push({ label:"健康营养", Icon:HeartPulse });
  return chips.slice(0, 3);
}

/* ── RecipeDetail — iOS Premium 风格 ── */
function RecipeDetail({ recipe, onClose }) {
  const steps       = parseSteps(recipe.steps);
  const ingredients = parseIngredients(recipe.ingredients);
  const chips       = deriveChips(recipe);
  const imageUrl    = recipe.imageUrl || recipe.image_url || null;

  // suitable_for: try splitting at " / " for two info cards
  const sfParts = (recipe.suitable_for || "").split(" / ");
  const stage   = sfParts[0]?.trim() || null;
  const ageInfo = sfParts[1]?.trim() || null;

  const CARD = {
    background: "rgba(255,255,255,0.62)",
    borderRadius: 28,
    padding: 20,
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
    border: "1px solid rgba(255,255,255,0.65)",
  };

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:1000,
               display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, background:"#F4ECD9",
                    borderRadius:"32px 32px 0 0", maxHeight:"92vh", overflowY:"auto",
                    paddingBottom:"env(safe-area-inset-bottom, 20px)" }}>

        {/* 拖拽条 */}
        <div style={{ display:"flex", justifyContent:"center", paddingTop:14, paddingBottom:6 }}>
          <div style={{ width:64, height:6, borderRadius:999, background:"#D8D5D2" }}/>
        </div>

        {/* 返回按钮 + 标题 */}
        <div style={{ padding:"0 20px 16px", position:"relative",
                      display:"flex", alignItems:"center", justifyContent:"center" }}>
          <button onClick={onClose}
            style={{ position:"absolute", left:20, width:48, height:48, borderRadius:999,
                     background:"white", border:"none", cursor:"pointer",
                     display:"flex", alignItems:"center", justifyContent:"center",
                     boxShadow:"0 6px 16px rgba(0,0,0,0.05)" }}>
            <ChevronLeft size={22} color="#1A1006" strokeWidth={2.5}/>
          </button>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:30, fontWeight:800, color:"#1F1F1F",
                          maxWidth:240, wordBreak:"break-word", lineHeight:1.2 }}>
              {recipe.title}
            </div>
            <div style={{ display:"inline-flex", alignItems:"center",
                          background:"rgba(230,134,69,0.12)", borderRadius:999,
                          padding:"6px 14px", marginTop:8 }}>
              <span style={{ fontSize:14, fontWeight:700, color:PRI }}>今日推荐</span>
            </div>
          </div>
        </div>

        <div style={{ padding:"0 16px 28px", display:"flex", flexDirection:"column", gap:16 }}>

          {/* ── 照片区域 ── */}
          <div style={{ width:"100%", height:220, borderRadius:28, overflow:"hidden",
                        background:"rgba(255,255,255,0.45)",
                        border:"1.5px dashed rgba(230,134,69,0.35)",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        flexShrink:0 }}>
            {imageUrl ? (
              <img src={imageUrl} alt={recipe.title}
                style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
                <Camera size={36} color="rgba(230,134,69,0.45)" strokeWidth={1.5}/>
                <div style={{ fontSize:14, fontWeight:600, color:"rgba(138,123,106,0.6)" }}>
                  食物照片
                </div>
                <div style={{ fontSize:12, color:"rgba(138,123,106,0.45)" }}>
                  管理员上传后显示
                </div>
              </div>
            )}
          </div>

          {/* ── 主内容卡片 ── */}
          <div style={{ ...CARD, display:"flex", flexDirection:"column", gap:24 }}>

            {/* 食谱简介 */}
            <div>
              <RTitle>食谱简介</RTitle>
              <div style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:14 }}>
                {recipe.nutrition && (
                  <div style={{ flex:1, fontSize:14, color:"#3D3530", lineHeight:1.7 }}>
                    {recipe.nutrition}
                  </div>
                )}
                {(stage || ageInfo) && (
                  <div style={{ flexShrink:0, display:"flex", flexDirection:"column", gap:8,
                                minWidth:120 }}>
                    {stage && (
                      <div style={{ background:"rgba(255,255,255,0.5)",
                                    border:"1px solid rgba(138,123,106,0.14)",
                                    borderRadius:16, padding:"10px 12px" }}>
                        <div style={{ fontSize:10, color:SUB, marginBottom:3 }}>适用阶段</div>
                        <div style={{ fontSize:12, fontWeight:700, color:"#2B2B2B" }}>{stage}</div>
                      </div>
                    )}
                    {ageInfo && (
                      <div style={{ background:"rgba(255,255,255,0.5)",
                                    border:"1px solid rgba(138,123,106,0.14)",
                                    borderRadius:16, padding:"10px 12px" }}>
                        <div style={{ fontSize:10, color:SUB, marginBottom:3 }}>适合群体</div>
                        <div style={{ fontSize:12, fontWeight:700, color:"#2B2B2B" }}>{ageInfo}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Chips */}
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {chips.map(({ label, Icon }) => (
                  <div key={label}
                    style={{ height:44, borderRadius:999, paddingLeft:12, paddingRight:14,
                             display:"inline-flex", alignItems:"center", gap:6,
                             background:"rgba(255,255,255,0.55)",
                             border:"1px solid rgba(138,123,106,0.14)",
                             color:"#7A5B3A", fontSize:15, fontWeight:600 }}>
                    <Icon size={18} color={PRI} strokeWidth={1.8}/>
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* 食材准备 */}
            {ingredients.length > 0 && (
              <div>
                <RTitle>食材准备</RTitle>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {ingredients.map((ing, i) => (
                    <div key={i}
                      style={{ background:"rgba(244,236,217,0.55)", borderRadius:20,
                               padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
                      <span style={{ fontSize:24, flexShrink:0 }}>{recipe.emoji || "🥗"}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:"#2B2B2B" }}>{ing}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 制作步骤 */}
            {steps.length > 0 && (
              <div>
                <RTitle>制作步骤</RTitle>
                <div style={{ background:"rgba(244,236,217,0.55)", borderRadius:20,
                              overflow:"hidden" }}>
                  {steps.map((step, i) => (
                    <div key={i}
                      style={{ padding:"14px 16px", display:"flex", gap:12, alignItems:"flex-start",
                               borderBottom: i < steps.length - 1
                                 ? "1px solid rgba(138,123,106,0.12)" : "none" }}>
                      <div style={{ width:28, height:28, borderRadius:999,
                                    background:"#E6A348", color:"white",
                                    fontWeight:800, fontSize:13,
                                    display:"flex", alignItems:"center", justifyContent:"center",
                                    flexShrink:0, marginTop:1 }}>
                        {i + 1}
                      </div>
                      <div style={{ flex:1, fontSize:14, color:"#2B2B2B",
                                    lineHeight:1.6, paddingTop:4 }}>
                        {step}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 营养价值 */}
            {recipe.nutrition && (
              <div>
                <RTitle>营养说明</RTitle>
                <div style={{ background:"rgba(244,236,217,0.55)", borderRadius:20,
                              padding:18 }}>
                  <div style={{ fontSize:14, color:"#3D3530", lineHeight:1.7 }}>
                    {recipe.nutrition}
                  </div>
                </div>
              </div>
            )}

            {/* 温馨提示 */}
            {recipe.notes && (
              <div style={{ background:"rgba(255,255,255,0.45)",
                            border:"1px solid rgba(230,134,69,0.16)",
                            borderRadius:20, padding:16,
                            display:"flex", gap:12, alignItems:"flex-start" }}>
                <Lightbulb size={22} color="#E6A348" strokeWidth={1.8}
                           style={{ flexShrink:0, marginTop:2 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15, fontWeight:700, color:"#2B2B2B", marginBottom:6 }}>
                    温馨提示
                  </div>
                  <div style={{ fontSize:13, color:"#3D3530", lineHeight:1.7 }}>
                    {recipe.notes}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 关闭按钮 */}
          <button onClick={onClose}
            style={{ width:"100%", height:56, borderRadius:18, fontSize:18, fontWeight:800,
                     background:"linear-gradient(135deg, #E68645, #F09A5B)", color:"white",
                     border:"none", cursor:"pointer",
                     boxShadow:"0 10px 20px rgba(230,134,69,0.22)" }}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

/* Section title with orange dot */
function RTitle({ children }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
      <div style={{ width:7, height:7, borderRadius:999, background:PRI, flexShrink:0 }}/>
      <span style={{ fontSize:18, fontWeight:800, color:"#1F1F1F" }}>{children}</span>
    </div>
  );
}
