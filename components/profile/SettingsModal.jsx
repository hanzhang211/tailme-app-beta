"use client";

/**
 * components/profile/SettingsModal.jsx
 *
 * 底部弹起的设置 sheet。
 *  - 添加宠物（不足 4 只时可点）
 *  - 编辑 / 删除已有宠物
 *  - 退出登录
 */

import PetAvatar from "@/components/PetAvatar";
import { isCatPet } from "@/services/breedAvatar";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", text:"#1A1006",
  sub:"#8A8074", light:"#D6D5D8", border:"#7A6F62", err:"#D94040",
};

const MAX_PETS = 4;

export default function SettingsModal({
  pets, onAddPet, onEditPet, onDeletePet, onLogout, onClose, toast,
}) {
  const canAdd = pets.length < MAX_PETS;

  const handleAdd = () => {
    if (!canAdd) {
      toast?.(`最多可以添加 ${MAX_PETS} 位毛孩子哦`, "warn");
      return;
    }
    onAddPet?.();
  };

  const handleDelete = async (pet) => {
    if (!confirm(`确定要删除 ${pet.name || "这只毛孩子"} 的档案吗？`)) return;
    await onDeletePet?.(pet);
  };

  const handleLogout = () => {
    if (!confirm("确定要退出当前账号吗？")) return;
    onLogout?.();
  };

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose?.()}
      style={{ position:"fixed", inset:0, zIndex:180, background:"rgba(0,0,0,0.4)",
               display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, background:C.bg,
                    borderRadius:"22px 22px 0 0", padding:"14px 0 22px",
                    maxHeight:"84vh", overflowY:"auto",
                    animation:"compose-up .25s ease-out" }}>

        <div style={{ width:40, height:4, borderRadius:4, background:C.light,
                      margin:"0 auto 16px" }} />

        <Section title="管理毛孩子">
          {pets.map((pet) => (
            <div key={pet.id}
              style={{ display:"flex", alignItems:"center", padding:"12px 18px",
                       background:"white", margin:"0 14px 8px",
                       borderRadius:14, border:`1px solid ${C.light}` }}>
              {/* 头像：有真实/AI 头像优先显示，没有则按猫/狗类型占位；加载失败 PetAvatar 自动 fallback */}
              <div style={{ marginRight:12, flexShrink:0 }}>
                <PetAvatar pet={pet} size={52} bg={C.tint}
                  fallbackImg={isCatPet(pet) ? "/cat.png" : "/dog.png"} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:700, color:C.text,
                              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {pet.name || "未命名"}
                </div>
                <div style={{ fontSize:11, color:C.sub, marginTop:2 }}>
                  {pet.breed || "未填品种"}
                </div>
              </div>
              <button onClick={() => onEditPet?.(pet)}
                style={{ background:C.tint, color:C.text, border:"none", padding:"6px 12px",
                         borderRadius:10, fontSize:12, fontWeight:600, cursor:"pointer",
                         marginRight:8 }}>
                编辑
              </button>
              <button onClick={() => handleDelete(pet)}
                style={{ background:"transparent", color:C.err, border:`1px solid ${C.err}33`,
                         padding:"6px 12px", borderRadius:10, fontSize:12, fontWeight:600,
                         cursor:"pointer" }}>
                删除
              </button>
            </div>
          ))}

          <button onClick={handleAdd}
            style={{ width:"calc(100% - 28px)", margin:"4px 14px 0",
                     padding:"12px 0", borderRadius:14,
                     background: canAdd ? C.pri : C.light,
                     color: canAdd ? "white" : C.sub,
                     border:"none", cursor:"pointer", fontSize:13, fontWeight:700,
                     display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            + 添加毛孩子（{pets.length}/{MAX_PETS}）
          </button>
        </Section>

        <Section title="账号">
          <button onClick={handleLogout}
            style={{ width:"calc(100% - 28px)", margin:"4px 14px",
                     padding:"13px 0", borderRadius:14, background:"white",
                     color:C.err, border:`1px solid ${C.err}33`,
                     cursor:"pointer", fontSize:13, fontWeight:700 }}>
            退出登录
          </button>
        </Section>

        <button onClick={onClose}
          style={{ width:"calc(100% - 28px)", margin:"6px 14px 0",
                   padding:"11px 0", borderRadius:14, background:"transparent",
                   color:C.sub, border:`1px solid ${C.light}`,
                   cursor:"pointer", fontSize:13, fontWeight:600 }}>
          关闭
        </button>
      </div>
      <style>{`@keyframes compose-up { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize:11, color:C.sub, fontWeight:600,
                    padding:"4px 18px 8px", letterSpacing:0.4 }}>
        {title}
      </div>
      {children}
    </div>
  );
}
