"use client";

/**
 * components/profile/PetEditor.jsx
 *
 * 添加 / 编辑宠物档案的 modal。
 *  - pet 为 null  → 新增模式（调 savePetProfile）
 *  - pet 为对象   → 编辑模式（调 updatePet）
 */

import { useState } from "react";
import { savePetProfile, updatePet, deletePet } from "@/services/supabaseService";
import { PERSONALITIES, todayISO } from "@/services/petAge";
import { DOG_BREEDS, CAT_BREEDS } from "@/services/breedAvatar";
import PetTrashIcon from "@/components/icons/PetTrashIcon";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", text:"#1A1006",
  sub:"#8A8074", light:"#D6D5D8", border:"#7A6F62",
};

export default function PetEditor({ pet, userId, onClose, onSaved, onDeleted, toast }) {
  const isEdit = !!pet;
  const [f, setF] = useState({
    pet_type:    pet?.pet_type || "dog",
    name:        pet?.name || "",
    breed:       pet?.breed || "",
    birthday:    pet?.birthday || "",
    weight:      pet?.weight ?? "",
    gender:      pet?.gender || "",
    personality: pet?.personality || "",
    neutered:    pet ? (pet.neutered    ? "yes" : "no") : "",
    vaccinated:  pet ? (pet.vaccinated  ? "yes" : "no") : "",
  });
  const breedList = f.pet_type === "cat" ? CAT_BREEDS : DOG_BREEDS;
  const setType = (t) => setF((p) => ({ ...p, pet_type: t, breed: "" }));
  const upd = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true); setError(null);
    try {
      await deletePet(pet.id, userId);
      onDeleted?.(pet);            // 通知上层：更新列表 + 首页同步移除
      onClose?.();
    } catch (e) {
      setError(e.message);
      toast?.(e.message || "删除失败，请重试", "error");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  // 只要求名字和品种，其余字段可选（避免旧数据缺字段导致按钮永久 disabled）
  const canSave = !saving && f.name?.trim() && f.breed;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true); setError(null);
    try {
      if (isEdit) {
        const baseFields = {
          name:        f.name.trim(),
          breed:       f.breed,
          birthday:    f.birthday    || null,
          weight:      f.weight      ? parseFloat(f.weight) : null,
          gender:      f.gender      || null,
          personality: f.personality || null,
          neutered:    f.neutered    === "yes",
          vaccinated:  f.vaccinated  === "yes",
        };
        let updated;
        try {
          // 先尝试带 pet_type（若列存在则成功）
          updated = await updatePet(pet.id, { ...baseFields, pet_type: f.pet_type });
        } catch (schemaErr) {
          if (schemaErr.message?.includes("pet_type") || schemaErr.message?.includes("schema")) {
            // 列不存在时降级：不带 pet_type 重试
            updated = await updatePet(pet.id, baseFields);
          } else {
            throw schemaErr;
          }
        }
        toast?.("已保存 ✨", "success");
        onSaved?.(updated);
      } else {
        const saved = await savePetProfile(f, userId);
        toast?.("毛孩子已加入 🐾", "success");
        onSaved?.(saved);
      }
    } catch (e) {
      setError(e.message);
      toast?.(e.message || "保存失败，请重试", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={(e) => e.target === e.currentTarget && !saving && onClose?.()}
      style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.45)",
               display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, maxHeight:"92vh", background:C.bg,
                    borderRadius:"22px 22px 0 0", display:"flex", flexDirection:"column",
                    animation:"compose-up .25s ease-out" }}>

        {/* 头部 */}
        <div style={{ padding:"14px 16px 8px", display:"flex", alignItems:"center",
                      borderBottom:`1px solid ${C.light}`, flexShrink:0, gap:10 }}>
          <button onClick={onClose} disabled={saving}
            style={{ background:"transparent", border:"none", fontSize:14, color:C.sub,
                     cursor: saving ? "default" : "pointer" }}>
            取消
          </button>
          <div style={{ flex:1, textAlign:"center", fontSize:15, fontWeight:700, color:C.text }}>
            {isEdit ? "编辑毛孩子档案" : "添加毛孩子"}
          </div>
          <button onClick={handleSave} disabled={!canSave}
            style={{ padding:"6px 14px", borderRadius:14, fontSize:13, fontWeight:700,
                     background: canSave ? C.pri : C.light,
                     color: canSave ? "white" : C.sub,
                     border:"none",
                     cursor: canSave ? "pointer" : "default", minWidth:60 }}>
            {saving ? "…" : "保存"}
          </button>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"18px 16px 100px" }}>
          <Field label="TA 是？">
            <div style={{ display:"flex", gap:8 }}>
              <ChipBtn on={f.pet_type === "dog"} onClick={() => setType("dog")}>🐶 小狗</ChipBtn>
              <ChipBtn on={f.pet_type === "cat"} onClick={() => setType("cat")}>🐱 小猫</ChipBtn>
            </div>
          </Field>

          <Field label="名字">
            <input value={f.name} onChange={(e) => upd("name", e.target.value)}
              placeholder="比如：豆豆、可乐、花花..."
              style={inpStyle()} />
          </Field>

          <Field label={f.pet_type === "cat" ? "猫咪品种" : "狗狗品种"}>
            <div style={{ position:"relative" }}>
              <select value={f.breed} onChange={(e) => upd("breed", e.target.value)}
                style={{ ...inpStyle(), appearance:"none",
                         color: f.breed ? C.text : C.sub }}>
                <option value="">选择品种</option>
                {breedList.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)",
                             color:C.sub, pointerEvents:"none", fontSize:12 }}>▾</span>
            </div>
          </Field>

          <Field label="生日 🎂">
            <input type="date" value={f.birthday}
              onChange={(e) => upd("birthday", e.target.value)}
              max={todayISO()} style={inpStyle()} />
            <div style={{ fontSize:11, color:C.sub, marginTop:6, lineHeight:1.55 }}>
              不知道准确生日也没关系，挑一个属于你们的纪念日就好 💛
            </div>
          </Field>

          <div style={{ display:"flex", gap:12, marginBottom:14 }}>
            <div style={{ flex:1 }}>
              <Field label="体重（kg）" inner>
                <input type="number" min="0" max="80" step="0.1"
                  value={f.weight} onChange={(e) => upd("weight", e.target.value)}
                  placeholder="8.5" style={inpStyle()} />
              </Field>
            </div>
            <div style={{ flex:1 }}>
              <Field label="性别" inner>
                <div style={{ display:"flex", gap:6 }}>
                  <ChipBtn on={f.gender === "male"}   onClick={() => upd("gender", "male")}>男孩</ChipBtn>
                  <ChipBtn on={f.gender === "female"} onClick={() => upd("gender", "female")}>女孩</ChipBtn>
                </div>
              </Field>
            </div>
          </div>

          <Field label="性格 ✨">
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {PERSONALITIES.map((p) => (
                <ChipBtn key={p} on={f.personality === p} onClick={() => upd("personality", p)}>
                  {p}
                </ChipBtn>
              ))}
            </div>
          </Field>

          <Field label="是否已绝育">
            <div style={{ display:"flex", gap:10 }}>
              <ChipBtn on={f.neutered === "yes"} onClick={() => upd("neutered","yes")}>已绝育 ✅</ChipBtn>
              <ChipBtn on={f.neutered === "no"}  onClick={() => upd("neutered","no")}>未绝育</ChipBtn>
            </div>
          </Field>

          <Field label="疫苗是否齐全">
            <div style={{ display:"flex", gap:10 }}>
              <ChipBtn on={f.vaccinated === "yes"} onClick={() => upd("vaccinated","yes")}>已齐全 💉</ChipBtn>
              <ChipBtn on={f.vaccinated === "no"}  onClick={() => upd("vaccinated","no")}>未完成 ⚠️</ChipBtn>
            </div>
          </Field>

          {error && (
            <div style={{ background:"#FFF0F0", color:"#D94040", borderRadius:12,
                          padding:"10px 14px", fontSize:12, lineHeight:1.5, marginTop:10 }}>
              ❌ {error}
            </div>
          )}

          {/* 删除毛孩子（仅编辑模式） */}
          {isEdit && (
            <button onClick={() => setConfirmDelete(true)} disabled={saving || deleting}
              style={{ width:"100%", marginTop:22, padding:"13px 0", borderRadius:14,
                       background:"transparent", border:"1.5px solid #E2B4B4",
                       color:"#D94040", fontSize:14, fontWeight:700,
                       cursor: (saving || deleting) ? "default" : "pointer",
                       display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
              <PetTrashIcon size={16} active /> 删除这只毛孩子
            </button>
          )}
        </div>
      </div>

      {/* 删除确认弹窗 */}
      {confirmDelete && (
        <div onClick={(e) => e.target === e.currentTarget && !deleting && setConfirmDelete(false)}
          style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,0.5)",
                   display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div style={{ width:"100%", maxWidth:320, background:"#FFFFFF", borderRadius:20,
                        padding:"22px 20px", textAlign:"center" }}>
            <div style={{ fontSize:32, marginBottom:8 }}>🥺</div>
            <div style={{ fontSize:16, fontWeight:800, color:C.text, marginBottom:8 }}>
              确定要删除 {pet?.name || "这只毛孩子"} 吗？
            </div>
            <div style={{ fontSize:13, color:C.sub, lineHeight:1.6, marginBottom:20 }}>
              删除后将无法恢复，TA 的喂食计划、健康/用药记录、AI 聊天记忆等相关资料也会一并清除。
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setConfirmDelete(false)} disabled={deleting}
                style={{ flex:1, padding:"11px 0", borderRadius:12, border:`1.5px solid ${C.light}`,
                         background:"#FFFFFF", color:C.text, fontSize:14, fontWeight:700,
                         cursor: deleting ? "default" : "pointer" }}>
                再想想
              </button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ flex:1, padding:"11px 0", borderRadius:12, border:"none",
                         background:"#D94040", color:"white", fontSize:14, fontWeight:700,
                         cursor: deleting ? "default" : "pointer" }}>
                {deleting ? "删除中…" : "确定删除"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes compose-up { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}

function Field({ label, children, inner }) {
  return (
    <div style={{ marginBottom: inner ? 0 : 14 }}>
      <div style={{ fontSize:12, color:C.sub, fontWeight:600, marginBottom:6 }}>{label}</div>
      {children}
    </div>
  );
}

function ChipBtn({ on, onClick, children }) {
  return (
    <button onClick={onClick}
      style={{ flex:1, padding:"10px 8px", borderRadius:14, fontSize:13,
               fontWeight: on ? 700 : 600,
               background: on ? C.pri : "#FFFFFF",
               color: on ? "white" : C.text,
               border:`1.5px solid ${on ? C.pri : C.border}`,
               cursor:"pointer", transition:"all .15s" }}>
      {children}
    </button>
  );
}

function inpStyle() {
  return {
    width:"100%", borderRadius:14, padding:"11px 13px", fontSize:14,
    border:`1.5px solid ${C.border}`, background:"#FFFFFF", color:C.text,
    outline:"none", boxSizing:"border-box",
  };
}
