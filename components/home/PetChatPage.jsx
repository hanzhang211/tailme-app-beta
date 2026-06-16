"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, Send } from "lucide-react";
import PetAvatar from "@/components/PetAvatar";
import PetTypingIndicator from "@/components/PetTypingIndicator";
import { formatPetAge } from "@/services/petAge";
import {
  sendPetChat, buildOpeningMessage,
  levelFromExp, aiLevelTitle,
} from "@/services/petAiChat";
import { updatePetAiGrowth } from "@/services/supabaseService";

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
 * AI 宠物聊天页（第一版 · DeepSeek）
 * props:
 *   user         当前用户（取 user.id 存记忆/成长）
 *   pet          当前选中宠物（activePet）—— AI 以它的身份说话
 *   onBack       返回首页
 *   onPetUpdate  成长值/等级变化后回写到上层
 */
export default function PetChatPage({ user, pet, onBack, onPetUpdate }) {
  const name = pet?.name || "毛孩子";
  const ageText = formatPetAge(pet?.birthday);

  // 成长等级（来自 pet.ai_exp）
  const exp = pet?.ai_exp || 0;
  const level = levelFromExp(exp);
  const [liveExp, setLiveExp] = useState(exp);
  const liveLevel = levelFromExp(liveExp);
  const title = aiLevelTitle(liveLevel);

  // 消息：{ role:"user"|"pet", text }
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const lastChatKey = pet?.id ? `tailme_petchat_last_${pet.id}` : null;

  // 进入页面：生成开场问候（记忆改由服务端读写，前端不再直连）
  useEffect(() => {
    setLiveExp(pet?.ai_exp || 0);
    const lastChatAt = lastChatKey ? localStorage.getItem(lastChatKey) : null;
    const opening = buildOpeningMessage(pet, { now: new Date(), lastChatAt });
    setMessages([{ role: "pet", text: opening }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pet?.id]);

  // 自动滚到底部
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg = { role: "user", text };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);

    const now = new Date();
    try {
      const { reply } = await sendPetChat({
        message: text,
        userId: user?.id,
        petId: pet?.id,
        pet: {
          name: pet?.name,
          pet_type: pet?.pet_type,
          breed: pet?.breed,
          ageText,
          gender: pet?.gender,
          weight: pet?.weight,
          personality: pet?.personality,
        },
        recentMessages: history.slice(-10),
        growthLevel: liveLevel,
        clientHour: now.getHours(),
        clientMinute: now.getMinutes(),
      });

      setMessages((prev) => [...prev, { role: "pet", text: reply }]);

      // 记录上次聊天时间
      if (lastChatKey) localStorage.setItem(lastChatKey, now.toISOString());

      // 成长：每发一条 +1 exp
      const nextExp = (pet?.ai_exp || liveExp) + 1;
      setLiveExp(nextExp);
      if (pet?.id) {
        const nextLevel = levelFromExp(nextExp);
        const updated = await updatePetAiGrowth(pet.id, nextExp, nextLevel).catch(() => null);
        if (updated) onPetUpdate?.(updated);
      }
      // 长期记忆已由服务端(/api/pet-ai-chat)用 service_role 读写，前端无需处理
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "pet", text: "呜…我刚刚走神了一下，能再说一次吗？🥺", error: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:C.bg }}>
      {/* 顶部栏：返回 + 宠物头像 + 名字/性格/等级 */}
      <div style={{ display:"flex", alignItems:"center", gap:10,
                    padding:"max(env(safe-area-inset-top), 28px) 16px 14px", background:C.bg,
                    borderBottom:`1px solid ${C.border}` }}>
        <button onClick={onBack}
          style={{ width:38, height:38, borderRadius:"50%", flexShrink:0,
                   background:"#FFFFFF", border:`1px solid ${C.border}`,
                   display:"flex", alignItems:"center", justifyContent:"center",
                   cursor:"pointer" }}>
          <ChevronLeft size={20} color={C.text} strokeWidth={2.2} />
        </button>

        <PetAvatar pet={pet} size={42} bg={C.tint} />

        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:16, fontWeight:800, color:C.text, lineHeight:1.2,
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              和 {name} 聊聊
            </span>
            <span style={{ flexShrink:0, fontSize:10.5, fontWeight:800, color:C.pri,
                           background:"rgba(230,134,69,0.12)", borderRadius:999,
                           padding:"2px 8px", whiteSpace:"nowrap" }}>
              Lv.{liveLevel} {title}
            </span>
          </div>
          {pet?.personality && (
            <div style={{ marginTop:3, fontSize:11.5, fontWeight:600, color:C.sub }}>
              ✨ {pet.personality}
            </div>
          )}
        </div>
      </div>

      {/* 消息列表 */}
      <div ref={scrollRef}
           style={{ flex:1, overflowY:"auto", padding:"16px 14px 8px",
                    display:"flex", flexDirection:"column", gap:12 }}>
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} style={{ alignSelf:"flex-end", maxWidth:"78%" }}>
              <div style={{ background:C.pri, color:"#FFFFFF",
                            borderRadius:"18px 18px 4px 18px", padding:"10px 14px",
                            fontSize:14.5, lineHeight:1.5, wordBreak:"break-word",
                            boxShadow:"0 2px 8px rgba(230,134,69,0.18)" }}>
                {m.text}
              </div>
            </div>
          ) : (
            <div key={i} style={{ alignSelf:"flex-start", maxWidth:"82%",
                                  display:"flex", alignItems:"flex-end", gap:8 }}>
              <div style={{ flexShrink:0, marginBottom:2 }}>
                <PetAvatar pet={pet} size={30} bg={C.tint} />
              </div>
              <div style={{ background:"#FFFFFF", color:C.text,
                            border:`1px solid ${C.border}`,
                            borderRadius:"18px 18px 18px 4px", padding:"10px 14px",
                            fontSize:14.5, lineHeight:1.6, wordBreak:"break-word",
                            whiteSpace:"pre-wrap",
                            boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
                {m.text}
              </div>
            </div>
          )
        )}

        {loading && (
          <div style={{ alignSelf:"flex-start", maxWidth:"82%",
                        display:"flex", alignItems:"flex-end", gap:8 }}>
            <div style={{ flexShrink:0, marginBottom:2 }}>
              <PetAvatar pet={pet} size={30} bg={C.tint} />
            </div>
            <div style={{ padding:"8px 4px" }}>
              <PetTypingIndicator />
            </div>
          </div>
        )}
      </div>

      {/* 输入区 */}
      <div style={{ padding:"10px 16px 28px", background:C.bg,
                    borderTop:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:8,
                      background:"#FFFFFF", border:`1px solid ${C.border}`,
                      borderRadius:999, padding:"4px 6px 4px 16px" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={`和 ${name} 说点什么吧…`}
            style={{ flex:1, border:"none", outline:"none", background:"transparent",
                     fontSize:14, color:C.text }} />
          <button onClick={handleSend} disabled={!input.trim() || loading}
            aria-label="发送"
            style={{ width:38, height:38, borderRadius:"50%", flexShrink:0, border:"none",
                     background: (!input.trim() || loading) ? C.border : C.pri,
                     color:"#FFFFFF", display:"flex", alignItems:"center", justifyContent:"center",
                     cursor: (!input.trim() || loading) ? "not-allowed" : "pointer",
                     transition:"background 0.2s ease" }}>
            <Send size={16} color="#FFFFFF" strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  );
}
