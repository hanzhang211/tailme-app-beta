"use client";

/**
 * components/community/CommunityTab.jsx
 *
 * 社群 Tab 容器：顶部标题 + 帖子 / 聊天 双模式切换
 */

import { useState } from "react";
import ChatRoom from "./ChatRoom";
import PostFeed from "./PostFeed";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", text:"#1A1006",
  sub:"#8A8074", light:"#D6D5D8", border:"#D6D5D8",
};

export default function CommunityTab({ user, pet, pets = [] }) {
  const [mode, setMode] = useState("feed"); // 'feed' | 'chat'

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:C.bg }}>
      {/* 顶部标题 + 切换 */}
      <div style={{ background:"white", padding:"52px 18px 0", flexShrink:0 }}>
        <div style={{ fontSize:20, fontWeight:800, color:C.text }}>💬 宠物社群</div>
        <div style={{ fontSize:12, color:C.sub, marginTop:2 }}>分享日常 · 实时聊天</div>
        <div style={{ display:"flex", gap:8, marginTop:14 }}>
          {[
            { key:"feed", label:"📌 帖子" },
            { key:"chat", label:"💭 聊天" },
          ].map((t) => {
            const on = mode === t.key;
            return (
              <button key={t.key} onClick={() => setMode(t.key)}
                style={{ padding:"8px 18px", borderRadius:20, fontSize:13,
                         fontWeight:on ? 700 : 600, cursor:"pointer",
                         background: on ? C.pri : C.tint,
                         color:      on ? "#fff" : C.text,
                         border:     `1.5px solid ${on ? C.pri : "transparent"}`,
                         transition:"all .15s" }}>
                {t.label}
              </button>
            );
          })}
        </div>
        <div style={{ height:12 }} />
      </div>

      <div style={{ flex:1, minHeight:0 }}>
        {mode === "feed" ? <PostFeed user={user} pet={pet} />
                         : <ChatRoom user={user} pet={pet} pets={pets} />}
      </div>
    </div>
  );
}
