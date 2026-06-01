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
  getGroupStats,
  getMyJoinedRooms,
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

function relTime(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min}分钟前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}天前`;
  return new Date(iso).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
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

  /* 群活跃度统计（成员/在线 + 本周最火，真实数据 5分钟缓存） */
  const [groupStats, setGroupStats] = useState({ statByBreed: {}, hotGroups: [] });

  /* 聊天页子分区：群聊 / 我的群 + 我加入的群聊 */
  const [chatTab,     setChatTab]     = useState("all"); // all | mine
  const [joinedRooms, setJoinedRooms] = useState([]);
  useEffect(() => {
    if (!user?.id) return;
    getMyJoinedRooms(user.id).then(setJoinedRooms).catch(() => {});
  }, [user?.id]);

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
    getGroupStats().then(setGroupStats).catch(() => {});
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
    const myBreedSet = new Set(myBreeds.map((b) => b.breed));
    // 我加入的群聊：我发过言、非我的专属(品种)群、非全员房（全员房放“发现更多”入口）
    const otherJoined = joinedRooms.filter((r) => r.breed && !myBreedSet.has(r.breed));

    return (
      <div style={{ height:"100%", overflowY:"auto", background:C.bg, padding:"14px 16px 28px" }}>

        {/* 群聊 / 我的群 切换 */}
        <div style={{ display:"flex", gap:10, marginBottom:18 }}>
          {[["all", "💬 群聊"], ["mine", "🐾 我的群"]].map(([key, label]) => {
            const on = chatTab === key;
            return (
              <button key={key} onClick={() => setChatTab(key)}
                style={{ flex:1, padding:"11px 0", borderRadius:14, fontSize:14, fontWeight:700,
                         cursor:"pointer", background: on ? C.pri : "white",
                         color: on ? "#fff" : C.text, border:`1.5px solid ${on ? C.pri : C.border}` }}>
                {label}
              </button>
            );
          })}
        </div>

        {/* 🚀 我的专属群 */}
        {myBreeds.length > 0 && (
          <>
            <SectionLabel>🚀 我的专属群</SectionLabel>
            {myBreeds.map(({ breed, pet_type }) => {
              const s = groupStats.statByBreed[breed];
              return (
                <ExclusiveCard key={breed}
                  icon={avatarForBreed(breed, pet_type)} title={`${breed}群`}
                  desc={`一起分享${breed}的日常生活`}
                  members={s?.members} online={s?.online}
                  onClick={() => enterBreedRoom({ breed, pet_type })} />
              );
            })}
          </>
        )}

        {/* 💬 我加入的群聊 */}
        <SectionLabel>💬 我加入的群聊</SectionLabel>
        {otherJoined.length === 0 ? (
          <div style={{ background:"white", border:`1px solid ${C.border}`, borderRadius:14,
                        padding:"16px", textAlign:"center", color:C.sub, fontSize:12, marginBottom:8 }}>
            还没加入其他群聊，去下面发现感兴趣的群吧 🐾
          </div>
        ) : (
          otherJoined.map((r) => {
            const s = groupStats.statByBreed[r.breed];
            return (
              <JoinedRow key={r.id}
                icon={avatarForBreed(r.breed, r.pet_type)} title={roomDisplay(r)}
                lastMsg={r.lastMsg} members={s?.members} online={s?.online}
                onClick={() => enterRoom(r.id)} />
            );
          })
        )}

        {/* 群聊视图：本周最火 + 发现更多 */}
        {chatTab === "all" && (
          <>
            {groupStats.hotGroups.length > 0 && (
              <>
                <SectionLabel>🔥 本周最火</SectionLabel>
                <div style={{ display:"flex", gap:8, overflowX:"auto", scrollbarWidth:"none", marginBottom:8 }}>
                  {groupStats.hotGroups.map((g, i) => (
                    <HotGroupCard key={g.roomId} rank={i + 1}
                      icon={avatarForBreed(g.breed, g.pet_type)} title={`${g.breed}群`}
                      members={g.members}
                      onClick={() => enterBreedRoom({ breed: g.breed, pet_type: g.pet_type })} />
                  ))}
                </div>
              </>
            )}

            <SectionLabel>🐾 发现更多</SectionLabel>
            {generalRoom && (
              <LobbyCard icon="🐾" title="全部闲聊" subtitle="大家一起随便聊聊毛孩子"
                onClick={() => enterRoom(generalRoom.id)} />
            )}
            {dogRooms.length > 0 && (
              <LobbyCard icon="🐶" title="狗狗乐园"
                subtitle={`${dogRooms.length} 个品种群聊 · 柴犬、金毛、柯基…`}
                chevron onClick={() => { setMoreQuery(""); setView("more-dog"); }} />
            )}
            {catRooms.length > 0 ? (
              <LobbyCard icon="🐱" title="猫咪星球"
                subtitle={`${catRooms.length} 个猫咪群聊 · 布偶、英短、金渐层…`}
                chevron onClick={() => { setMoreQuery(""); setView("more-cat"); }} />
            ) : (
              <div style={{ background:"white", border:`1px solid ${C.border}`, borderRadius:14,
                            padding:"14px 16px", textAlign:"center", color:C.sub, fontSize:12 }}>
                猫咪社区即将开放 🐱
              </div>
            )}
          </>
        )}

        {chatTab === "mine" && myBreeds.length === 0 && otherJoined.length === 0 && (
          <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:"40px 20px", lineHeight:1.8 }}>
            还没有你的群 🐾<br/>
            <span style={{ fontSize:12 }}>添加毛孩子会自动有品种群；在群里发言即加入</span>
          </div>
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

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize:13, fontWeight:800, color:C.text, margin:"16px 0 10px" }}>
      {children}
    </div>
  );
}

/* 我的专属群（皇冠卡） */
function ExclusiveCard({ icon, title, desc, members, online, onClick }) {
  return (
    <button onClick={onClick}
      style={{ width:"100%", display:"flex", alignItems:"center", gap:13,
               background:"white", border:`1px solid ${C.border}`, borderRadius:18,
               padding:"15px 16px", marginBottom:10, cursor:"pointer", textAlign:"left",
               boxShadow:"0 2px 10px rgba(0,0,0,0.05)" }}>
      <span style={{ width:50, height:50, borderRadius:"50%", background:C.tint, flexShrink:0,
                     display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>
        {icon}
      </span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:15, fontWeight:800, color:C.text }}>{title}</span>
          <span style={{ fontSize:13 }}>👑</span>
          <span style={{ fontSize:10, padding:"2px 7px", borderRadius:8,
                         background:"rgba(230,134,69,0.14)", color:C.pri, fontWeight:700 }}>我的品种群</span>
        </div>
        <div style={{ fontSize:12, color:C.sub, marginTop:3,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{desc}</div>
        {(members != null || online != null) && (
          <div style={{ fontSize:11, color:C.sub, marginTop:4 }}>
            {members ?? 0} 位家长 · {online ?? 0} 人在线
          </div>
        )}
      </div>
    </button>
  );
}

/* 我加入的群聊（带最近消息） */
function JoinedRow({ icon, title, lastMsg, members, online, onClick }) {
  return (
    <button onClick={onClick}
      style={{ width:"100%", display:"flex", alignItems:"center", gap:12,
               background:"white", border:`1px solid ${C.border}`, borderRadius:16,
               padding:"13px 14px", marginBottom:8, cursor:"pointer", textAlign:"left",
               boxShadow:"0 1px 6px rgba(0,0,0,0.04)" }}>
      <span style={{ width:44, height:44, borderRadius:"50%", background:C.tint, flexShrink:0,
                     display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
        {icon}
      </span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
          <span style={{ fontSize:14, fontWeight:700, color:C.text,
                         overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{title}</span>
          {lastMsg && <span style={{ fontSize:10, color:C.sub, flexShrink:0 }}>{relTime(lastMsg.created_at)}</span>}
        </div>
        <div style={{ fontSize:12, color:C.sub, marginTop:3,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {lastMsg
            ? `${lastMsg.username ? lastMsg.username + "：" : ""}${lastMsg.content}`
            : `${members ?? 0} 位家长 · ${online ?? 0} 人在线`}
        </div>
      </div>
    </button>
  );
}

/* 本周最火横滑卡（带排名角标） */
function HotGroupCard({ rank, icon, title, members, onClick }) {
  return (
    <button onClick={onClick}
      style={{ flexShrink:0, width:120, position:"relative",
               background:"white", border:`1px solid ${C.border}`, borderRadius:16,
               padding:"14px 10px 12px", cursor:"pointer",
               display:"flex", flexDirection:"column", alignItems:"center", gap:6,
               boxShadow:"0 2px 10px rgba(0,0,0,0.05)" }}>
      <span style={{ position:"absolute", top:8, left:8, width:18, height:18, borderRadius:"50%",
                     background: rank === 1 ? "#E68645" : rank === 2 ? "#C9A227" : "#B98A5E",
                     color:"#fff", fontSize:10, fontWeight:800,
                     display:"flex", alignItems:"center", justifyContent:"center" }}>{rank}</span>
      <span style={{ width:44, height:44, borderRadius:"50%", background:C.tint,
                     display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{icon}</span>
      <div style={{ fontSize:13, fontWeight:700, color:C.text,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"100%" }}>{title}</div>
      <div style={{ fontSize:10, color:C.sub }}>{members ?? 0} 位家长</div>
    </button>
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
