"use client";

/**
 * components/paw-planet/GalleryView.jsx
 * 「回忆相册」——用户上传图片/标题/分类生成回忆卡片（真实数据，Supabase memorial_memories）。
 * 分类 tab 中文显示，库里存英文 key（daily/birthday/travel/favorite/null）。
 * props: { petName, avatar, petId, userId, toast, onBack, onOpen }
 */

import { useState, useEffect, useCallback } from "react";
import { Plus, Star, X } from "lucide-react";
import BackButton from "@/components/icons/BackButton";
import PetTrashIcon from "@/components/icons/PetTrashIcon";
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
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F4ECE0" }}>
      {/* header：右上角「+」= 添加回忆卡片 */}
      <div style={{ padding: "max(env(safe-area-inset-top), 28px) 16px 8px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <BackButton onClick={onBack} />
        <div style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: 800, color: C.text }}>回忆相册</div>
        <button onClick={() => setShowAdd(true)} aria-label="添加回忆卡片"
          style={{ width: 38, height: 38, borderRadius: "50%", background: C.pri, border: "none", cursor: "pointer",
                   display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                   boxShadow: "0 3px 10px rgba(230,134,69,0.3)" }}>
          <Plus size={20} color="#fff" strokeWidth={2.6} />
        </button>
      </div>

      {/* 分类 tab */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "4px 16px 10px", flexShrink: 0 }}>
        {GALLERY_CATEGORIES.map((g) => {
          const on = cat === g;
          return (
            <button key={g} onClick={() => setCat(g)}
              style={{ flexShrink: 0, padding: "7px 16px", borderRadius: 16, cursor: "pointer", fontSize: 13, fontWeight: 700,
                       background: on ? C.pri : "#fff", color: on ? "#fff" : C.sub,
                       border: `1px solid ${on ? C.pri : C.border}`, WebkitTapHighlightColor: "transparent" }}>
              {g}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 16px 20px" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: C.sub, marginTop: 70, fontSize: 13 }}>加载中…</div>
        ) : list.length === 0 ? (
          <div style={{ textAlign: "center", color: C.sub, marginTop: 56 }}>
            <div style={{ fontSize: 38, marginBottom: 10 }}>🖼️</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>还没有回忆卡片</div>
            <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.6 }}>上传一张照片，把你们的<br />美好时光收藏起来吧</div>
            <button onClick={() => setShowAdd(true)}
              style={{ marginTop: 18, padding: "11px 22px", borderRadius: 14, border: "none", cursor: "pointer",
                       background: C.pri, color: "#fff", fontSize: 14, fontWeight: 800, boxShadow: "0 6px 16px rgba(230,134,69,0.3)" }}>
              添加回忆卡片
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {list.map((m) => (
              <div key={m.id} onClick={() => setDetail(m)}
                style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: "#fff", cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
                <div style={{ height: 120, background: C.cream, overflow: "hidden" }}>
                  <PlaceholderImg src={m.image_url} alt={m.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
                <div style={{ padding: "8px 10px" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                    <span style={{ fontSize: 10.5, color: C.sub }}>{fmtDate(m)}</span>
                    {m.category && CAT_KEY_TO_LABEL[m.category] && (
                      <span style={{ fontSize: 9.5, fontWeight: 700, color: C.pri, background: "#FFE9D8", borderRadius: 8, padding: "1px 6px" }}>
                        {CAT_KEY_TO_LABEL[m.category]}
                      </span>
                    )}
                  </div>
                </div>
                {/* 右下角删除（不触发打开详情） */}
                <button onClick={(e) => { e.stopPropagation(); handleDelete(m); }} aria-label="删除回忆卡片"
                  style={{ position: "absolute", bottom: 6, right: 6, width: 26, height: 26, borderRadius: "50%",
                           background: "rgba(255,255,255,0.92)", border: `1px solid ${C.border}`, cursor: "pointer",
                           display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }}>
                  <PetTrashIcon size={14} color={C.sub} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部：生成纪念卡片（纪念卡，保持不动） */}
      <div style={{ padding: "10px 16px 14px", flexShrink: 0 }}>
        <button onClick={() => onOpen?.("card")}
          style={{ width: "100%", padding: "14px 0", borderRadius: 16, border: "none", cursor: "pointer",
                   background: C.pri, color: "#fff", fontSize: 15, fontWeight: 800,
                   display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                   boxShadow: "0 6px 18px rgba(230,134,69,0.32)" }}>
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
          style={{ position: "absolute", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.5)",
                   display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 340, maxHeight: "86%", overflowY: "auto", background: "#fff", borderRadius: 20, position: "relative" }}>
            <button onClick={() => handleDelete(detail)} aria-label="删除回忆卡片"
              style={{ position: "absolute", top: 10, left: 10, zIndex: 1, width: 30, height: 30, borderRadius: "50%",
                       background: "rgba(0,0,0,0.4)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PetTrashIcon size={16} color="#fff" />
            </button>
            <button onClick={() => setDetail(null)} aria-label="关闭"
              style={{ position: "absolute", top: 10, right: 10, zIndex: 1, width: 30, height: 30, borderRadius: "50%",
                       background: "rgba(0,0,0,0.4)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={16} color="#fff" />
            </button>
            <PlaceholderImg src={detail.image_url} alt={detail.title}
              style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", display: "block", borderRadius: "20px 20px 0 0" }} />
            <div style={{ padding: "14px 16px 18px" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{detail.title}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                <span style={{ fontSize: 12, color: C.sub }}>{fmtDate(detail)}</span>
                {detail.category && CAT_KEY_TO_LABEL[detail.category] && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: C.pri, background: "#FFE9D8", borderRadius: 8, padding: "2px 8px" }}>
                    {CAT_KEY_TO_LABEL[detail.category]}
                  </span>
                )}
              </div>
              {detail.description && (
                <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.8, marginTop: 12, whiteSpace: "pre-wrap" }}>{detail.description}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
