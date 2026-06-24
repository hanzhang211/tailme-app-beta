"use client";

/**
 * components/home/PetInfoEditModal.jsx
 *
 * 首页基础信息卡（品种 / 年龄 / 体重 / 性别）的单字段编辑弹窗（底部抽屉，非独立页面）。
 * 米色底 + 橙色主色，沿用主页设计语言。保存走 updatePet（局部字段更新）→ onSaved(updated)。
 *
 *   breed  —— 顶部搜索框 + 品种列表，点选即保存（品种多，用搜索）
 *   age    —— 原生 <input type="date">（保留原生调节），存 birthday
 *   weight —— 数字输入 + kg 单位
 *   gender —— 男孩 / 女孩
 *
 * props: { field: "breed"|"age"|"weight"|"gender", pet, onClose, onSaved }
 * 不改数据来源 / 不动其它逻辑，仅本弹窗。
 */

import { useState } from "react";
import { Search } from "lucide-react";
import { updatePet } from "@/services/supabaseService";
import { DOG_BREEDS, CAT_BREEDS, isCatPet } from "@/services/breedAvatar";
import { todayISO, PERSONALITIES } from "@/services/petAge";

const C = { bg: "#EEE9E1", pri: "#E68645", text: "#1A1006", sub: "#8A8074", border: "#7A6F62", soft: "#E5DACB" };
const TITLES = { breed: "选择品种", age: "修改生日", weight: "修改体重", gender: "选择性别", personality: "选择性格" };

export default function PetInfoEditModal({ field, pet, onClose, onSaved }) {
  const isCat = isCatPet(pet);
  const breedList = isCat ? CAT_BREEDS : DOG_BREEDS;

  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);
  const [query, setQuery]       = useState("");
  const [birthday, setBirthday] = useState(pet?.birthday || "");
  const [weight, setWeight]     = useState(pet?.weight != null ? String(pet.weight) : "");
  const [gender, setGender]     = useState(pet?.gender || "");
  const [persSel, setPersSel]   = useState(
    pet?.personality ? pet.personality.split(/[、,，/]/).map((s) => s.trim()).filter(Boolean) : []
  );

  const save = async (fields) => {
    if (saving) return;
    setSaving(true); setError(null);
    try {
      const updated = await updatePet(pet.id, fields);
      onSaved?.(updated);            // 成功后父组件关闭弹窗 + 刷新
    } catch (e) {
      setError(e.message || "保存失败，请重试");
      setSaving(false);             // 失败留在弹窗，可重试
    }
  };

  const saveAge = () => { if (!birthday) { setError("请选择生日"); return; } save({ birthday }); };
  const saveWeight = () => {
    const w = parseFloat(weight);
    if (!weight || isNaN(w) || w <= 0) { setError("请输入有效体重"); return; }
    save({ weight: w });
  };
  const saveGender = () => { if (!gender) { setError("请选择性别"); return; } save({ gender }); };
  const togglePers = (p) => setPersSel((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  const savePersonality = () => save({ personality: persSel.join("、") || null });

  const filtered = breedList.filter((b) => b.includes(query.trim()));

  return (
    <div onClick={(e) => e.target === e.currentTarget && !saving && onClose?.()}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.45)",
               display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 430, background: C.bg, borderRadius: "22px 22px 0 0",
                    padding: "16px 20px calc(24px + env(safe-area-inset-bottom))",
                    maxHeight: "82%", display: "flex", flexDirection: "column",
                    animation: "pim-up .25s ease-out" }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: "#D8CCBC", margin: "0 auto 14px", flexShrink: 0 }} />
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 14, flexShrink: 0 }}>{TITLES[field]}</div>
        {error && <div style={{ fontSize: 12, color: "#C0392B", marginBottom: 10, flexShrink: 0 }}>{error}</div>}

        {/* 品种：搜索框 + 列表（点选即保存）*/}
        {field === "breed" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", flexShrink: 0,
                          borderRadius: 14, border: `1.5px solid ${C.border}`, padding: "10px 12px", marginBottom: 12 }}>
              <Search size={17} color={C.sub} strokeWidth={2} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} autoFocus
                placeholder={`搜索${isCat ? "猫咪" : "狗狗"}品种`}
                style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: C.text }} />
            </div>
            <div style={{ overflowY: "auto", flex: 1, marginRight: -6, paddingRight: 6 }}>
              {filtered.length === 0
                ? <div style={{ textAlign: "center", color: C.sub, fontSize: 13, padding: "24px 0" }}>没有找到「{query}」</div>
                : filtered.map((b) => {
                    const on = b === pet?.breed;
                    return (
                      <button key={b} onClick={() => save({ breed: b })} disabled={saving}
                        style={{ width: "100%", textAlign: "left", padding: "13px 14px", marginBottom: 8,
                                 borderRadius: 14, fontSize: 14, fontWeight: on ? 800 : 600,
                                 background: on ? C.pri : "#fff", color: on ? "#fff" : C.text,
                                 border: `1.5px solid ${on ? C.pri : C.soft}`, cursor: "pointer", transition: "all .12s" }}>
                        {b}
                      </button>
                    );
                  })}
            </div>
          </>
        )}

        {/* 年龄：原生日期选择 */}
        {field === "age" && (
          <>
            <input type="date" value={birthday} max={todayISO()}
              onChange={(e) => { setBirthday(e.target.value); setError(null); }}
              style={{ width: "100%", boxSizing: "border-box", padding: "13px 14px", borderRadius: 14,
                       border: `1.5px solid ${C.border}`, fontSize: 15, color: C.text, background: "#fff", outline: "none" }} />
            <div style={{ fontSize: 11, color: C.sub, marginTop: 8, lineHeight: 1.6 }}>
              不知道准确生日也没关系，挑一个属于你们的纪念日就好
            </div>
            <SaveBtn onClick={saveAge} saving={saving} />
          </>
        )}

        {/* 体重：数字输入 */}
        {field === "weight" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff",
                          borderRadius: 14, border: `1.5px solid ${C.border}`, padding: "12px 14px" }}>
              <input type="number" inputMode="decimal" value={weight} autoFocus min="0" step="0.1"
                onChange={(e) => { setWeight(e.target.value); setError(null); }} placeholder="请输入体重"
                style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 16, color: C.text }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: C.sub }}>kg</span>
            </div>
            <SaveBtn onClick={saveWeight} saving={saving} />
          </>
        )}

        {/* 性别：男孩 / 女孩 */}
        {field === "gender" && (
          <>
            <div style={{ display: "flex", gap: 12 }}>
              {[{ v: "male", label: "男孩" }, { v: "female", label: "女孩" }].map(({ v, label }) => {
                const on = gender === v;
                return (
                  <button key={v} onClick={() => { setGender(v); setError(null); }}
                    style={{ flex: 1, padding: "16px 0", borderRadius: 16, fontSize: 15, fontWeight: on ? 800 : 600,
                             background: on ? C.pri : "#fff", color: on ? "#fff" : C.text,
                             border: `1.5px solid ${on ? C.pri : C.border}`, cursor: "pointer", transition: "all .15s" }}>
                    {label}
                  </button>
                );
              })}
            </div>
            <SaveBtn onClick={saveGender} saving={saving} />
          </>
        )}

        {/* 性格：多选 PERSONALITIES（「、」拼接存储）*/}
        {field === "personality" && (
          <>
            <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 12 }}>可多选，挑出最像 TA 的性格</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {PERSONALITIES.map((p) => {
                const on = persSel.includes(p);
                return (
                  <button key={p} onClick={() => { togglePers(p); setError(null); }}
                    style={{ padding: "10px 6px", borderRadius: 12, fontSize: 12.5, fontWeight: on ? 800 : 600,
                             background: on ? C.pri : "#fff", color: on ? "#fff" : C.text,
                             border: `1.5px solid ${on ? C.pri : C.soft}`, cursor: "pointer", transition: "all .15s" }}>
                    {p}
                  </button>
                );
              })}
            </div>
            <SaveBtn onClick={savePersonality} saving={saving} />
          </>
        )}
      </div>
      <style>{`@keyframes pim-up{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </div>
  );
}

function SaveBtn({ onClick, saving }) {
  return (
    <button onClick={onClick} disabled={saving}
      style={{ width: "100%", marginTop: 18, padding: "15px 0", borderRadius: 16, border: "none",
               background: "#E68645", color: "#fff", fontSize: 15, fontWeight: 800,
               cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1,
               boxShadow: "0 6px 18px rgba(230,134,69,0.32)" }}>
      {saving ? "保存中…" : "保存"}
    </button>
  );
}
