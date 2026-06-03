"use client";

/**
 * components/community/CommunityTab.jsx
 *
 * 社群 Tab 容器：顶部标题 + 帖子 / 聊天 双模式切换
 */

import { useState } from "react";
import ChatRoom from "./ChatRoom";
import PostFeed from "./PostFeed";
import ChatIcon from "@/components/ChatIcon";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", text:"#1A1006",
  sub:"#8A8074", light:"#D6D5D8", border:"#D6D5D8",
};

export default function CommunityTab({ user, pet, pets = [], onUserUpdated, onOpenProfile }) {
  const [mode, setMode] = useState("feed"); // 'feed' | 'chat'

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:C.bg }}>
      {/* 顶部标题 + 切换 */}
      <div style={{ background:"white", padding:"52px 18px 0", flexShrink:0, position:"relative", overflow:"hidden" }}>
        {/* 右上角装饰爪印 + 弧线（纯装饰，不可点击） */}
        <svg width="130" height="96" viewBox="0 0 130 96" aria-hidden="true"
          style={{ position:"absolute", top:34, right:-8, opacity:0.55, pointerEvents:"none" }}>
          <path d="M4 34 Q 66 4 122 28" stroke="#F1C6A2" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M114 19 l9 7 -10 4" stroke="#F1C6A2" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <g fill="#F5DAC2">
            <ellipse cx="80" cy="60" rx="5.5" ry="7"/>
            <ellipse cx="92" cy="53" rx="5.5" ry="7"/>
            <ellipse cx="104" cy="55" rx="5.5" ry="7"/>
            <path d="M77 73 q-5 10 6 13 q11 3 20 -1 q8 -5 3 -12 q-6 -7 -15 -7 q-9 0 -14 7Z"/>
          </g>
        </svg>

        <div style={{ position:"relative", fontSize:20, fontWeight:800, color:C.text, display:"flex", alignItems:"center", gap:8 }}>
          <ChatIcon size={26} color={C.pri} />宠物社群
        </div>
        <div style={{ position:"relative", fontSize:12, color:C.sub, marginTop:2 }}>分享日常 · 实时聊天</div>
        <div style={{ position:"relative", display:"flex", gap:10, marginTop:16 }}>
          {[
            { key:"feed", label:"帖子", emoji:"📌" },
            { key:"chat", label:"聊天", isChat: true },
          ].map((t) => {
            const on = mode === t.key;
            return (
              <button key={t.key} onClick={() => setMode(t.key)}
                style={{ display:"flex", alignItems:"center", gap:6,
                         padding:"12px 30px", borderRadius:999, fontSize:15,
                         fontWeight:on ? 800 : 600, cursor:"pointer",
                         background: on ? C.pri : C.tint,
                         color:      on ? "#fff" : C.text,
                         border:"none",
                         boxShadow: on ? "0 4px 12px rgba(230,134,69,0.32)" : "none",
                         transition:"all .15s" }}>
                {t.isChat
                  ? <ChatIcon size={17} color={on ? "#fff" : C.text} />
                  : <span style={{ fontSize:15 }}>{t.emoji}</span>}
                {t.label}
              </button>
            );
          })}
        </div>
        <div style={{ height:14 }} />
      </div>

      <div style={{ flex:1, minHeight:0 }}>
        {mode === "feed" ? <PostFeed user={user} pet={pet} onUserUpdated={onUserUpdated} onOpenProfile={onOpenProfile} />
                         : <ChatRoom user={user} pet={pet} pets={pets} />}
      </div>
    </div>
  );
}
