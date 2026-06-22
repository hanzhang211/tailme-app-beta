"use client";

/**
 * components/paw-planet/GalleryView.jsx
 * 「回忆相册」——梦幻紫星空视觉（仅样式改造；上传/分类筛选/删除/详情/生成纪念卡逻辑保持不变）。
 * 数据：Supabase memorial_memories。分类 tab 中文显示，库里存英文 key（daily/birthday/travel/favorite/null）。
 * props: { petName, avatar, petId, userId, toast, onBack, onOpen }
 */

import { useState, useEffect, useCallback } from "react";
import { Plus, Star, X } from "lucide-react";
import BackButton from "@/components/icons/BackButton";
import PetTrashIcon from "@/components/icons/PetTrashIcon";
import FloatingStars from "@/components/paw-planet/FloatingStars";
import { PLANET_PURPLE as P, GlassCircle, MemoryAlbumPlaceholder } from "@/components/paw-planet/PlanetDecor";
import { PLANET_C as C, GALLERY_CATEGORIES } from "@/lib/pawPlanetMock";
import { listMemories, deleteMemory } from "@/services/memorialMemoryService";
import AddMemoryForm from "@/components/paw-planet/AddMemoryForm";

const CAT_LABEL_TO_KEY = { "日常": "daily", "生日": "birthday", "旅行": "travel", "最爱": "favorite" };
const CAT_KEY_TO_LABEL = { daily: "日常", birthday: "生日", travel: "旅行", favorite: "最爱" };

function fmtDate(m) {
  const raw = m?.memory_date || m?.created_at;
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return String(raw);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

export default function GalleryView({ petName = "毛孩子", avatar, petId, userId, toast, onBack, onOpen }) {
  const [cat, setCat] = useState("全部");
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [detail, setDetail] = useState(null);

  const refresh = useCallback(() => {
    if (!petId) { setMemories([]); setLoading(false); return; }
    setLoading(true);
    listMemories(petId).then(setMemories).catch(() => setMemories([])).finally(() => setLoading(false));
  }, [petId]);
  useEffect(() => { refresh(); }, [refresh]);

  // 全部=全部；其余按英文 key 过滤；无分类(null)只出现在「全部」
  const list = cat === "全部" ? memories : memories.filter((m) => m.category === CAT_LABEL_TO_KEY[cat]);

  const onSaved = (row) => { if (row) setMemories((prev) => [row, ...prev]); };

  // 删除（与社群帖子删除同款：confirm → 删除 → 移除 → toast）
  const handleDelete = async (m) => {
    if (!m?.id) return;
    if (!confirm("删除这张回忆卡片？此操作不可撤销。")) return;
    try {
      await deleteMemory(m);
      setMemories((prev) => prev.filter((x) => x.id !== m.id));
      setDetail(null);
      toast?.("回忆卡片已删除");
    } catch {
      toast?.("删除失败，请重试");
    }
  };

  const PlaceholderImg = ({ src, alt, style }) => (
    <img src={src || avatar} alt={alt}
         onError={(e) => { if (avatar && e.currentTarget.src !== avatar) e.currentTarget.src = avatar; }}
         style={style} />
  );

  return (
    <div style={{ height: "100%", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", background: P.bg }}>
      <FloatingStars />

      {/* header：右上角「+」= 添加回忆卡片 */}
      <div style={{ position: "relative", zIndex: 1, padding: "max(env(safe-area-inset-top), 28px) 16px 8px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <BackButton onClick={onBack} bg={P.glassBtn} color="#fff" border={false} shadow={false} />
        <div style={{ flex: 1, textAlign: "center", fontSize: 18, fontWeight: 800, color: "#fff" }}>回忆相册</div>
        <GlassCircle onClick={() => setShowAdd(true)} ariaLabel="添加回忆卡片">
          <Plus size={20} color="#fff" strokeWidth={2.6} />
        </GlassCircle>
      </div>

      {/* 分类 tab */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 8, overflowX: "auto", padding: "4px 16px 10px", flexShrink: 0 }}>
        {GALLERY_CATEGORIES.map((g) => {
          const on = cat === g;
          return (
            <button key={g} onClick={() => setCat(g)}
              style={{ flexShrink: 0, padding: "7px 16px", borderRadius: 16, cursor: "pointer", fontSize: 13, fontWeight: 700,
                       background: on ? P.chipOn : "rgba(255,255,255,0.08)", color: "#fff",
                       border: `1px solid ${on ? "transparent" : "rgba(255,255,255,0.4)"}`,
                       boxShadow: on ? "0 4px 14px rgba(182,165,255,0.5)" : "none",
                       backdropFilter: "blur(4px)", WebkitTapHighlightColor: "transparent" }}>
              {g}
            </button>
          );
        })}
      </div>

      <div style={{ position: "relative", zIndex: 1, flex: 1, overflowY: "auto", padding: "4px 16px 20px" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: P.sub, marginTop: 70, fontSize: 13 }}>加载中…</div>
        ) : list.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <MemoryAlbumPlaceholder />
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginTop: 18 }}>还没有回忆卡片</div>
            <div style={{ fontSize: 13, marginTop: 10, lineHeight: 1.7, color: P.sub }}>上传一张照片，把你们的<br />美好时光收藏起来吧</div>
            <button onClick={() => setShowAdd(true)}
              style={{ marginTop: 22, padding: "13px 30px", borderRadius: 16, border: "none", cursor: "pointer",
                       background: "rgba(255,255,255,0.95)", color: "#7466D8", fontSize: 14.5, fontWeight: 800,
                       boxShadow: "0 8px 22px rgba(120,100,216,0.35)" }}>
              添加回忆卡片
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {list.map((m) => (
              <div key={m.id} onClick={() => setDetail(m)}
                style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: "#fff", cursor: "pointer", boxShadow: "0 6px 18px rgba(25,20,80,0.22)" }}>
                <div style={{ height: 120, background: "#EDE6FB", overflow: "hidden" }}>
                  <PlaceholderImg src={m.thumb_url || m.image_url} alt={m.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
                <div style={{ padding: "8px 10px" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#3A3460", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                    <span style={{ fontSize: 10.5, color: "#9991C7" }}>{fmtDate(m)}</span>
                    {m.category && CAT_KEY_TO_LABEL[m.category] && (
                      <span style={{ fontSize: 9.5, fontWeight: 700, color: "#7466D8", background: "#EDE6FB", borderRadius: 8, padding: "1px 6px" }}>
                        {CAT_KEY_TO_LABEL[m.category]}
                      </span>
                    )}
                  </div>
                </div>
                {/* 右下角删除（不触发打开详情） */}
                <button onClick={(e) => { e.stopPropagation(); handleDelete(m); }} aria-label="删除回忆卡片"
                  style={{ position: "absolute", bottom: 6, right: 6, width: 26, height: 26, borderRadius: "50%",
                           background: "rgba(255,255,255,0.92)", border: "1px solid #E2D7F6", cursor: "pointer",
                           display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(40,30,90,0.18)" }}>
                  <PetTrashIcon size={14} color="#8C83B9" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部：生成纪念卡片（纪念卡，逻辑保持不动） */}
      <div style={{ position: "relative", zIndex: 1, padding: "10px 16px 14px", flexShrink: 0 }}>
        <button onClick={() => onOpen?.("card")}
          style={{ width: "100%", padding: "14px 0", borderRadius: 18, border: "none", cursor: "pointer",
                   background: P.btn, color: "#fff", fontSize: 15, fontWeight: 800,
                   display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: P.btnGlow }}>
          <Star size={17} color="#fff" fill="#fff" /> 生成纪念卡片
        </button>
      </div>

      {/* 添加回忆卡片表单 */}
      {showAdd && (
        <AddMemoryForm petName={petName} userId={userId} petId={petId} toast={toast}
          onClose={() => setShowAdd(false)} onSaved={onSaved} />
      )}

      {/* 回忆详情弹窗 */}
      {detail && (
        <div onClick={() => setDetail(null)}
          style={{ position: "absolute", inset: 0, zIndex: 40, background: "rgba(20,16,60,0.62)",
                   display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 340, maxHeight: "86%", overflowY: "auto", background: "#FAF8FF", borderRadius: 20, position: "relative" }}>
            <button onClick={() => handleDelete(detail)} aria-label="删除回忆卡片"
              style={{ position: "absolute", top: 10, left: 10, zIndex: 1, width: 30, height: 30, borderRadius: "50%",
                       background: "rgba(30,22,80,0.45)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PetTrashIcon size={16} color="#fff" />
            </button>
            <button onClick={() => setDetail(null)} aria-label="关闭"
              style={{ position: "absolute", top: 10, right: 10, zIndex: 1, width: 30, height: 30, borderRadius: "50%",
                       background: "rgba(30,22,80,0.45)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={16} color="#fff" />
            </button>
            <PlaceholderImg src={detail.image_url} alt={detail.title}
              style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", display: "block", borderRadius: "20px 20px 0 0" }} />
            <div style={{ padding: "14px 16px 18px" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#3A3460" }}>{detail.title}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                <span style={{ fontSize: 12, color: "#9991C7" }}>{fmtDate(detail)}</span>
                {detail.category && CAT_KEY_TO_LABEL[detail.category] && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "#7466D8", background: "#EDE6FB", borderRadius: 8, padding: "2px 8px" }}>
                    {CAT_KEY_TO_LABEL[detail.category]}
                  </span>
                )}
              </div>
              {detail.description && (
                <div style={{ fontSize: 13.5, color: "#4A4470", lineHeight: 1.8, marginTop: 12, whiteSpace: "pre-wrap" }}>{detail.description}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
