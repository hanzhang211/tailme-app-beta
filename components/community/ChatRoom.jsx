"use client";

/**
 * components/community/ChatRoom.jsx
 *
 * 入口结构（3 层）：
 *   lobby  —— 大厅，只显示 3 个入口：全部闲聊 / 我的品种 / 更多品种
 *   more   —— 更多品种群聊列表（除我的品种和全部闲聊以外）
 *   room   —— 真正进入聊天的房间（消息流 + 输入 + Realtime）
 *
 * 数据：
 *   chat_rooms 表已预置 1 个 breed=NULL（全员）+ 30 个品种房，无需新 SQL。
 *   显示名统一在 UI 计算：breed=NULL → "全部闲聊"，否则 "<breed>群聊"。
 */

import { useEffect, useRef, useState } from "react";
import {
  listChatRooms,
  getOrCreateChatRoom,
  listMessages,
  sendMessage,
  subscribeRoom,
  unsubscribeChannel,
  deleteOwnContent,
  reportContent,
} from "@/services/communityService";
import { avatarForBreed } from "@/services/breedAvatar";
import PetAvatar from "@/components/PetAvatar";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", text:"#1A1006",
  sub:"#8A8074", light:"#D6D5D8", border:"#D6D5D8",
};

function fmtTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("zh", { hour:"2-digit", minute:"2-digit" });
}

const roomDisplay = (r) => !r ? "" : (r.breed === null ? "全部闲聊" : `${r.breed}群聊`);

export default function ChatRoom({ user, pet, pets = [] }) {
  const [rooms,        setRooms]        = useState([]);
  const [view,         setView]         = useState("lobby");   // lobby | more | room
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [errRooms,     setErrRooms]     = useState(null);
  const [moreQuery,    setMoreQuery]    = useState("");

  /* 室内状态 */
  const [msgs,     setMsgs]    = useState([]);
  const [inp,      setInp]     = useState("");
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [errMsgs,  setErrMsgs] = useState(null);
  const scrollRef  = useRef(null);
  const channelRef = useRef(null);

  /* ── 拉房间列表 ────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const rs = await listChatRooms();
        setRooms(rs);
      } catch (e) {
        setErrRooms(e.message);
      } finally {
        setLoadingRooms(false);
      }
    })();
  }, []);

  const generalRoom = rooms.find((r) => r.breed === null);
  // 按 pet_type 分组（旧数据无 pet_type 当作 dog）
  const dogRooms    = rooms.filter((r) => r.breed && (r.pet_type === "dog" || !r.pet_type));
  const catRooms    = rooms.filter((r) => r.breed && r.pet_type === "cat");
  const activeRoom  = rooms.find((r) => r.id === activeRoomId);

  // 当前用户所有宠物的品种去重列表（保留 pet_type 信息）
  const myBreeds = (() => {
    const seen = new Set();
    return pets
      .filter((p) => p.breed && !seen.has(p.breed) && seen.add(p.breed))
      .map((p) => ({ breed: p.breed, pet_type: p.pet_type || "dog" }));
  })();

  /* ── 进入某个房间：加载历史 + 订阅 ─────────────── */
  useEffect(() => {
    if (view !== "room" || !activeRoomId) return;
    let alive = true;
    setLoadingMsgs(true);
    setErrMsgs(null);
    setMsgs([]);

    (async () => {
      try {
        const list = await listMessages(activeRoomId);
        if (!alive) return;
        setMsgs(list);
      } catch (e) {
        if (alive) setErrMsgs(e.message);
      } finally {
        if (alive) setLoadingMsgs(false);
      }
    })();

    const channel = subscribeRoom(activeRoomId, (newMsg) => {
      if (!alive) return;
      setMsgs((prev) => prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]);
    });
    channelRef.current = channel;

    return () => {
      alive = false;
      unsubscribeChannel(channel);
    };
  }, [view, activeRoomId]);

  /* 滚到底 */
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, view]);

  const enterRoom = (roomId) => {
    setActiveRoomId(roomId);
    setView("room");
  };
  const backToLobby = () => { setView("lobby"); setActiveRoomId(null); setMsgs([]); };

  // 按品种进入房间，如果不存在则自动创建
  const enterBreedRoom = async ({ breed, pet_type }) => {
    const existing = rooms.find((r) => r.breed === breed);
    if (existing) { enterRoom(existing.id); return; }
    try {
      const created = await getOrCreateChatRoom(breed, pet_type);
      setRooms((prev) => [...prev, created]);
      enterRoom(created.id);
    } catch (e) { alert(e.message); }
  };

  const handleSend = async () => {
    const text = inp.trim();
    if (!text || !activeRoomId || !user?.id) return;
    setInp("");
    try {
      const saved = await sendMessage({
        roomId: activeRoomId, userId: user.id, petId: pet?.id, content: text,
      });
      setMsgs((prev) => prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]);
      if (saved.status === "flagged") {
        alert("你的消息包含敏感词，已待审核，暂未公开显示");
      }
    } catch (e) { setErrMsgs(e.message); }
  };

  const handleDelete = async (m) => {
    if (m.user_id !== user?.id) return;
    if (!confirm("删除这条消息？")) return;
    try {
      await deleteOwnContent({ userId: user.id, targetType: "message", targetId: m.id });
      setMsgs((prev) => prev.filter((x) => x.id !== m.id));
    } catch (e) { alert(e.message); }
  };

  const handleReport = async (m) => {
    const reason = prompt("举报理由（可选）");
    if (reason === null) return;
    try {
      await reportContent({
        reporterId: user.id, targetType: "message", targetId: m.id, reason,
      });
      alert("已举报，管理员会处理");
    } catch (e) { alert(e.message); }
  };

  /* ════════════════════════════════════════════════
     view: lobby
     ════════════════════════════════════════════════ */
  if (view === "lobby") {
    if (loadingRooms) return <Center>加载中...</Center>;
    if (errRooms)     return <Center color="#D94040">❌ {errRooms}</Center>;
    return (
      <div style={{ height:"100%", overflowY:"auto", background:C.bg, padding:"14px 16px" }}>
        <div style={{ fontSize:13, color:C.sub, marginBottom:12 }}>选择你想加入的群聊</div>

        {/* 全部闲聊 */}
        {generalRoom && (
          <LobbyCard icon="🐾" title="全部闲聊" subtitle="大家一起随便聊聊毛孩子"
            onClick={() => enterRoom(generalRoom.id)} />
        )}

        {/* 我的毛孩子群聊 */}
        <div style={{ fontSize:12, fontWeight:700, color:C.sub, margin:"4px 0 8px", letterSpacing:0.5 }}>
          🐾 我的毛孩子群聊
        </div>
        {myBreeds.length === 0 ? (
          <div style={{ background:"white", border:`1px solid ${C.border}`, borderRadius:14,
                        padding:"14px 16px", textAlign:"center", color:C.sub, fontSize:12,
                        marginBottom:4 }}>
            添加毛孩子后，会自动看到 TA 的品种群聊哦 🐾
          </div>
        ) : (
          myBreeds.map(({ breed, pet_type }) => (
            <LobbyCard
              key={breed}
              icon={avatarForBreed(breed, pet_type)}
              title={`${breed}群聊`}
              subtitle={`和${breed}家长一起交流经验`}
              badge="我的品种"
              onClick={() => enterBreedRoom({ breed, pet_type })}
            />
          ))
        )}

        {/* 汪星人社区 */}
        {dogRooms.length > 0 && (
          <>
            <div style={{ fontSize:12, fontWeight:700, color:C.sub, margin:"14px 0 8px", letterSpacing:0.5 }}>
              🐶 汪星人社区
            </div>
            <LobbyCard icon="🐶" title="狗狗乐园"
              subtitle={`${dogRooms.length} 个品种群聊 · 柴犬、金毛、柯基…`}
              chevron onClick={() => { setMoreQuery(""); setView("more-dog"); }} />
          </>
        )}

        {/* 喵星人社区 */}
        {catRooms.length > 0 && (
          <>
            <div style={{ fontSize:12, fontWeight:700, color:C.sub, margin:"14px 0 8px", letterSpacing:0.5 }}>
              🐱 喵星人社区
            </div>
            <LobbyCard icon="🐱" title="猫咪星球"
              subtitle={`${catRooms.length} 个猫咪群聊 · 布偶、英短、金渐层…`}
              chevron onClick={() => { setMoreQuery(""); setView("more-cat"); }} />
          </>
        )}

        {/* 如果猫咪社区还没有房间（SQL 还没跑） */}
        {catRooms.length === 0 && (
          <>
            <div style={{ fontSize:12, fontWeight:700, color:C.sub, margin:"14px 0 8px", letterSpacing:0.5 }}>
              🐱 喵星人社区
            </div>
            <div style={{ background:"white", border:`1px solid ${C.border}`, borderRadius:14,
                          padding:"14px 16px", textAlign:"center", color:C.sub, fontSize:12 }}>
              猫咪社区即将开放 🐱
            </div>
          </>
        )}
      </div>
    );
  }

  /* ════════════════════════════════════════════════
     view: more-dog / more-cat
     ════════════════════════════════════════════════ */
  if (view === "more-dog" || view === "more-cat") {
    const isCat    = view === "more-cat";
    const roomList = isCat ? catRooms : dogRooms;
    const title    = isCat ? "🐱 猫咪星球" : "🐶 狗狗乐园";
    const q        = moreQuery.trim().toLowerCase();
    const filtered = q
      ? roomList.filter((r) => (r.breed || "").toLowerCase().includes(q))
      : roomList;
    return (
      <div style={{ height:"100%", display:"flex", flexDirection:"column", background:C.bg }}>
        <SubHeader title={title} onBack={() => { setView("lobby"); setMoreQuery(""); }} />
        <div style={{ padding:"10px 14px 0", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8,
                        background:"white", border:`1px solid ${C.border}`,
                        borderRadius:22, padding:"8px 14px" }}>
            <span style={{ fontSize:14, color:C.sub }}>🔍</span>
            <input value={moreQuery} onChange={(e) => setMoreQuery(e.target.value)}
              placeholder={isCat ? "搜索猫咪品种..." : "搜索狗狗品种..."}
              style={{ flex:1, border:"none", outline:"none", background:"transparent",
                       fontSize:13, color:C.text, minWidth:0 }} />
            {moreQuery && (
              <button onClick={() => setMoreQuery("")}
                style={{ background:"transparent", border:"none", cursor:"pointer",
                         color:C.sub, fontSize:14, padding:"0 4px" }}>×</button>
            )}
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"10px 14px 24px" }}>
          {filtered.length === 0 && (
            <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:30 }}>
              {q ? `没找到"${moreQuery.trim()}"相关群聊` : (isCat ? "暂无猫咪群聊" : "暂无其他狗狗群聊")}
            </div>
          )}
          {filtered.map((r) => (
            <button key={r.id} onClick={() => enterRoom(r.id)}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:12,
                       padding:"12px 14px", marginBottom:8,
                       background:"white", border:`1px solid ${C.border}`,
                       borderRadius:14, cursor:"pointer", textAlign:"left",
                       boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
              <span style={{ width:36, height:36, borderRadius:"50%", background:C.tint,
                             display:"flex", alignItems:"center", justifyContent:"center",
                             fontSize:18, flexShrink:0 }}>
                {avatarForBreed(r.breed, isCat ? "cat" : "dog")}
              </span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{r.breed}群聊</div>
              </div>
              <span style={{ color:C.sub, fontSize:16 }}>›</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════
     view: room
     ════════════════════════════════════════════════ */
  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:C.bg }}>
      <SubHeader title={roomDisplay(activeRoom)} onBack={backToLobby} />

      <div ref={scrollRef} style={{ flex:1, overflowY:"auto", padding:"12px 14px" }}>
        {loadingMsgs && <div style={{ textAlign:"center", color:C.sub, fontSize:12 }}>加载中...</div>}
        {errMsgs     && <div style={{ textAlign:"center", color:"#D94040", fontSize:12 }}>❌ {errMsgs}</div>}
        {!loadingMsgs && !errMsgs && msgs.length === 0 && (
          <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:"40px 0" }}>
            这里还没有消息，做第一个发言的人吧 🐾
          </div>
        )}

        {msgs.map((m) => {
          const own = m.user_id === user?.id;
          const display = m.user?.username || "未命名宠物";
          return (
            <div key={m.id} style={{ display:"flex", gap:10, marginBottom:14,
                                     flexDirection: own ? "row-reverse" : "row" }}>
              <PetAvatar pet={m.pet} overrideUrl={m.user?.avatar_url} size={34} bg={C.tint} />
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
                  {own  && <span style={{ marginLeft:6, opacity:0.6 }}>（长按删除）</span>}
                  {!own && <span style={{ marginLeft:6, opacity:0.6 }}>（长按举报）</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background:"white", borderTop:`1px solid ${C.border}`, padding:"10px 14px 18px",
                    display:"flex", gap:10, flexShrink:0 }}>
        <input
          value={inp}
          onChange={(e) => setInp(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={activeRoom ? `在 ${roomDisplay(activeRoom)} 说点什么...` : ""}
          style={{ flex:1, borderRadius:22, padding:"10px 16px", fontSize:13,
                   border:`1.5px solid ${C.border}`, background:C.bg, color:C.text, outline:"none" }} />
        <button onClick={handleSend} disabled={!inp.trim()}
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

/* ──────────────────────────────────────────────────
   小组件
   ────────────────────────────────────────────────── */
function Center({ children, color }) {
  return (
    <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center",
                  color: color || C.sub, fontSize:13 }}>
      {children}
    </div>
  );
}

function SubHeader({ title, onBack }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10,
                  background:"white", borderBottom:`1px solid ${C.border}`,
                  padding:"10px 14px", flexShrink:0 }}>
      <button onClick={onBack}
        style={{ background:"transparent", border:"none", cursor:"pointer",
                 fontSize:18, color:C.text, padding:"2px 6px" }}>‹</button>
      <div style={{ fontSize:15, fontWeight:700, color:C.text }}>{title}</div>
    </div>
  );
}

function LobbyCard({ icon, title, subtitle, badge, chevron, onClick }) {
  return (
    <button onClick={onClick}
      style={{ width:"100%", display:"flex", alignItems:"center", gap:14,
               background:"white", border:`1px solid ${C.border}`,
               borderRadius:18, padding:"16px 16px", marginBottom:12,
               cursor:"pointer", textAlign:"left",
               boxShadow:"0 2px 10px rgba(0,0,0,0.05)" }}>
      <span style={{ width:48, height:48, borderRadius:"50%", background:C.tint,
                     display:"flex", alignItems:"center", justifyContent:"center",
                     fontSize:24, flexShrink:0 }}>
        {icon}
      </span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:15, fontWeight:700, color:C.text }}>{title}</span>
          {badge && (
            <span style={{ fontSize:10, padding:"2px 8px", borderRadius:10,
                           background:C.pri, color:"white", fontWeight:600 }}>
              {badge}
            </span>
          )}
        </div>
        <div style={{ fontSize:12, color:C.sub, marginTop:3 }}>{subtitle}</div>
      </div>
      {chevron && <span style={{ color:C.sub, fontSize:18 }}>›</span>}
    </button>
  );
}
