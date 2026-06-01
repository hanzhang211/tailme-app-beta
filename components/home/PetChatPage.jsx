"use client";

import { ChevronLeft, Sparkles } from "lucide-react";
import PetAvatar from "@/components/PetAvatar";

/* 颜色：保持 TailMe 米白 + 橙色 */
const C = {
  pri:    "#E68645",
  tint:   "#F2E5DA",
  bg:     "#EEE9E1",
  surface:"#F2E5DA",
  border: "#D6D5D8",
  text:   "#1A1006",
  sub:    "#8A8074",
};

/**
 * AI 宠物聊天 —— 占位页面（暂不接任何 AI API）
 * props:
 *   pet     当前选中的宠物（activePet），名字/性格/头像都取自它
 *   onBack  返回首页
 */
export default function PetChatPage({ pet, onBack }) {
  const name = pet?.name || "毛孩子";

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:C.bg }}>
      {/* 顶部栏：返回 + 宠物头像 + 标题 */}
      <div style={{ display:"flex", alignItems:"center", gap:10,
                    padding:"52px 16px 14px", background:C.bg,
                    borderBottom:`1px solid ${C.border}` }}>
        <button onClick={onBack}
          style={{ width:38, height:38, borderRadius:"50%", flexShrink:0,
                   background:"#FFFFFF", border:`1px solid ${C.border}`,
                   display:"flex", alignItems:"center", justifyContent:"center",
                   cursor:"pointer" }}>
          <ChevronLeft size={20} color={C.text} strokeWidth={2.2} />
        </button>

        <PetAvatar pet={pet} size={40} bg={C.tint} />

        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:16, fontWeight:800, color:C.text, lineHeight:1.2,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            和 {name} 聊聊
          </div>
          {pet?.personality && (
            <div style={{ display:"inline-flex", alignItems:"center", gap:3, marginTop:3,
                          background:"rgba(255,255,255,0.7)", border:`1px solid ${C.border}`,
                          borderRadius:999, padding:"2px 8px",
                          fontSize:11, fontWeight:600, color:C.pri }}>
              ✨ {pet.personality}
            </div>
          )}
        </div>
      </div>

      {/* 中间占位区 */}
      <div style={{ flex:1, display:"flex", flexDirection:"column",
                    alignItems:"center", justifyContent:"center",
                    padding:"24px 36px", textAlign:"center" }}>
        <div style={{ width:84, height:84, borderRadius:"50%", background:C.tint,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      marginBottom:18, boxShadow:"0 6px 18px rgba(230,134,69,0.14)" }}>
          <Sparkles size={34} color={C.pri} strokeWidth={1.8} />
        </div>
        <div style={{ fontSize:16, fontWeight:700, color:C.text, lineHeight:1.5,
                      marginBottom:8 }}>
          这里会成为你和毛孩子的专属聊天空间
        </div>
        <div style={{ fontSize:13, color:C.sub, lineHeight:1.6 }}>
          很快就能和 {name} 说说话啦～
        </div>
      </div>

      {/* 底部：disabled 输入框 */}
      <div style={{ padding:"10px 16px 28px", background:C.bg,
                    borderTop:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:8,
                      background:"#FFFFFF", border:`1px solid ${C.border}`,
                      borderRadius:999, padding:"4px 6px 4px 16px", opacity:0.7 }}>
          <input
            disabled
            placeholder="AI 对话功能即将上线"
            style={{ flex:1, border:"none", outline:"none", background:"transparent",
                     fontSize:14, color:C.sub, cursor:"not-allowed" }} />
          <button disabled
            style={{ width:38, height:38, borderRadius:"50%", flexShrink:0, border:"none",
                     background:C.border, color:"#FFFFFF", fontWeight:700,
                     display:"flex", alignItems:"center", justifyContent:"center",
                     cursor:"not-allowed" }}>
            <Sparkles size={16} color="#FFFFFF" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
