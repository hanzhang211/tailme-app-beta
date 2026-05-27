"use client";

/**
 * components/community/ChatRoom.jsx
 *
 * 真实聊天：
 *  - 顶部品种群切换（来自 chat_rooms 表）
 *  - 默认进入用户当前宠物品种对应的群（找不到则进"全员"）
 *  - 历史消息 + Realtime 订阅新消息
 *  - 自己的消息可长按删除（调 /api/community/delete）
 */

import { useEffect, useRef, useState } from "react";
import {
  listChatRooms,
  listMessages,
  sendMessage,
  subscribeRoom,
  deleteOwnContent,
  reportContent,
} from "@/services/communityService";
import { avatarForBreed } from "@/services/breedAvatar";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", text:"#1A1006",
  sub:"#8A8074", light:"#D6D5D8", border:"#D6D5D8",
};

function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("zh", { hour:"2-digit", minute:"2-digit" });
}

export default function ChatRoom({ user, pet }) {
  const [rooms,    setRooms]    = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [msgs,     setMsgs]     = useState([]);
  const [inp,      setInp]      = useState("");
  const [loading,  setLoading]  = useState(true);
  const [err,      setErr]      = useState(null);
  const scrollRef = useRef(null);
  const channelRef = useRef(null);

  /* 拉房间列表，定位默认房间 */
  useEffect(() => {
    (async () => {
      try {
        const rs = await listChatRooms();
        setRooms(rs);
        const myBreed = pet?.breed;
        const matched = rs.find((r) => r.breed === myBreed);
        const fallback = rs.find((r) => r.breed === null) || rs[0];
        setActiveId((matched || fallback)?.id);
      } catch (e) {
        setErr(e.message);
        setLoading(false);
      }
    })();
  }, [pet?.breed]);

  /* 切换房间：加载历史 + 订阅 */
  useEffect(() => {
    if (!activeId) return;
    let alive = true;
    setLoading(true);
    setErr(null);

    (async () => {
      try {
        const list = await listMessages(activeId);
        if (!alive) return;
        setMsgs(list);
      } catch (e) {
        if (alive) setErr(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    const channel = subscribeRoom(activeId, (newMsg) => {
      if (!alive) return;
      setMsgs((prev) => {
        // 去重（自己刚 send 时本地已 append）
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    });
    channelRef.current = channel;

    return () => {
      alive = false;
      try { channel.unsubscribe(); } catch {}
    };
  }, [activeId]);

  /* 滚动到底 */
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, activeId]);

  const handleSend = async () => {
    const text = inp.trim();
    if (!text || !activeId || !user?.id) return;
    setInp("");
    try {
      const saved = await sendMessage({
        roomId: activeId, userId: user.id, petId: pet?.id, content: text,
      });
      // 立即本地 append（Realtime 也会 push 一次，会被去重）
      setMsgs((prev) => prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]);
      if (saved.status === "flagged") {
        alert("你的消息包含敏感词，已待审核，暂未公开显示");
      }
    } catch (e) {
      setErr(e.message);
    }
  };

  const handleDelete = async (m) => {
    if (m.user_id !== user?.id) return;
    if (!confirm("删除这条消息？")) return;
    try {
      await deleteOwnContent({ userId: user.id, targetType: "message", targetId: m.id });
      setMsgs((prev) => prev.filter((x) => x.id !== m.id));
    } catch (e) {
      alert(e.message);
    }
  };

  const handleReport = async (m) => {
    const reason = prompt("举报理由（可选）");
    if (reason === null) return;
    try {
      await reportContent({
        reporterId: user.id, targetType: "message", targetId: m.id, reason,
      });
      alert("已举报，管理员会处理");
    } catch (e) {
      alert(e.message);
    }
  };

  const activeRoom = rooms.find((r) => r.id === activeId);

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:C.bg }}>
      {/* 房间选择 */}
      <div style={{ background:"#fff", borderBottom:`1px solid ${C.border}`,
                    padding:"8px 14px", display:"flex", gap:8,
                    overflowX:"auto", scrollbarWidth:"none", flexShrink:0 }}>
        {rooms.map((r) => {
          const on = r.id === activeId;
          return (
            <button key={r.id} onClick={() => setActiveId(r.id)}
              style={{ flexShrink:0, padding:"6px 13px", borderRadius:20, fontSize:12,
                       fontWeight:600, cursor:"pointer", whiteSpace:"nowrap",
                       background:on ? C.pri : C.tint, color:on ? "#fff" : C.text,
                       border:`1.5px solid ${on ? C.pri : "transparent"}`,
                       transition:"all .15s" }}>
              {r.name}
            </button>
          );
        })}
      </div>

      {/* 房间名 */}
      {activeRoom && (
        <div style={{ background:C.tint, padding:"7px 18px", borderBottom:`1px solid ${C.border}`,
                      flexShrink:0, fontSize:12, color:C.text, fontWeight:600 }}>
          🐕 {activeRoom.name}
        </div>
      )}

      {/* 消息流 */}
      <div ref={scrollRef} style={{ flex:1, overflowY:"auto", padding:"12px 14px" }}>
        {loading && <div style={{ textAlign:"center", color:C.sub, fontSize:12 }}>加载中...</div>}
        {err     && <div style={{ textAlign:"center", color:"#D94040", fontSize:12 }}>❌ {err}</div>}
        {!loading && !err && msgs.length === 0 && (
          <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:"40px 0" }}>
            这里还没有消息，做第一个发言的人吧 🐾
          </div>
        )}

        {msgs.map((m) => {
          const own = m.user_id === user?.id;
          const avatar = avatarForBreed(m.pet?.breed);
          const display = m.user?.username || "未命名宠物";
          return (
            <div key={m.id} style={{ display:"flex", gap:10, marginBottom:14,
                                     flexDirection: own ? "row-reverse" : "row" }}>
              <div style={{ width:34, height:34, borderRadius:"50%", background:C.tint,
                            display:"flex", alignItems:"center", justifyContent:"center",
                            fontSize:16, flexShrink:0 }}>
                {avatar}
              </div>
              <div style={{ maxWidth:"72%", display:"flex", flexDirection:"column",
                            alignItems: own ? "flex-end" : "flex-start" }}>
                {!own && <div style={{ fontSize:11, color:C.sub, marginBottom:3, paddingLeft:4 }}>{display}</div>}
                <div
                  onContextMenu={(e) => { e.preventDefault(); own ? handleDelete(m) : handleReport(m); }}
                  style={{ padding:"10px 14px", fontSize:13, lineHeight:1.55,
                           borderRadius: own ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                           background: own ? C.pri : "white", color: own ? "white" : C.text,
                           boxShadow:"0 1px 6px rgba(0,0,0,0.05)",
                           cursor: own ? "pointer" : "default", userSelect:"text" }}>
                  {m.content}
                </div>
                <div style={{ fontSize:10, color:C.sub, marginTop:3, paddingLeft:4, paddingRight:4 }}>
                  {fmtTime(m.created_at)}
                  {own && <span style={{ marginLeft:6, opacity:0.6 }}>（长按删除）</span>}
                  {!own && <span style={{ marginLeft:6, opacity:0.6 }}>（长按举报）</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 输入栏 */}
      <div style={{ background:"white", borderTop:`1px solid ${C.border}`, padding:"10px 14px 18px",
                    display:"flex", gap:10, flexShrink:0 }}>
        <input
          value={inp}
          onChange={(e) => setInp(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={activeRoom ? `在 ${activeRoom.name} 说点什么...` : "正在加载房间..."}
          disabled={!activeId}
          style={{ flex:1, borderRadius:22, padding:"10px 16px", fontSize:13,
                   border:`1.5px solid ${C.border}`, background:C.bg, color:C.text, outline:"none" }} />
        <button onClick={handleSend} disabled={!inp.trim() || !activeId}
          style={{ width:40, height:40, borderRadius:"50%",
                   background: inp.trim() ? C.pri : C.light,
                   border:"none", cursor: inp.trim() ? "pointer" : "default",
                   color:"white", fontSize:16, flexShrink:0,
                   display:"flex", alignItems:"center", justifyContent:"center" }}>
          ➤
        </button>
      </div>
    </div>
  );
}
