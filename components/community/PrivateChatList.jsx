"use client";

/**
 * components/community/PrivateChatList.jsx
 *
 * 私聊列表（社群「聊天 → 私聊」）。
 *  - 我的私聊：真实会话，头像/昵称/最后消息预览/时间/未读红点
 *  - 搜索昵称
 *  - 右上 ＋：从「我的关注」里发起新私聊（真实数据，无 mock）
 *  - Realtime：订阅发给我的新消息，自动刷新列表/未读
 *  - 点击会话 → onOpen({ conversationId, other })
 */

import { useEffect, useRef, useState } from "react";
import { listConversations, subscribeMyInbox, unsubscribePrivate } from "@/services/privateChatService";
import { listFollowing, searchUsers } from "@/services/communityService";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", text:"#2A2520",
  sub:"#8A8178", light:"#D6D5D8", border:"#E4DED3", red:"#E85D5D",
};

function relTime(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min}分钟前`;
  const h = Math.floor(min / 60);
  if (h < 24) return new Date(iso).toLocaleTimeString("zh", { hour: "2-digit", minute: "2-digit" });
  const d = Math.floor(h / 24);
  if (d === 1) return "昨天";
  if (d < 7) return `${d}天前`;
  return new Date(iso).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

function Avatar({ url, size = 48 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:C.tint, flexShrink:0,
                  overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:size * 0.46 }}>
      {url ? <img src={url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : "🐾"}
    </div>
  );
}

export default function PrivateChatList({ meId, onOpen }) {
  const [list, setList]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ]             = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const chRef = useRef(null);

  const load = () => {
    if (!meId) return;
    listConversations(meId).then(setList).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!meId) return;
    load();
    const ch = subscribeMyInbox(meId, () => load());
    chRef.current = ch;
    return () => { unsubscribePrivate(chRef.current); chRef.current = null; };
  }, [meId]); // eslint-disable-line

  const filtered = q.trim()
    ? list.filter((c) => (c.other.username || "").toLowerCase().includes(q.trim().toLowerCase()))
    : list;

  const preview = (c) =>
    c.last_message_type === "image" ? "[图片]"
    : c.last_message_type === "video" ? "[视频]"
    : (c.last_message || "开始聊天吧～");

  return (
    <div>
      {/* 标题行 + 发起 */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <div style={{ fontSize:16, fontWeight:800, color:C.text }}>私聊</div>
        <button onClick={() => setPickerOpen(true)}
          style={{ width:34, height:34, borderRadius:"50%", background:"white", border:`1px solid ${C.border}`,
                   cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                   color:C.pri, fontSize:20, boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>＋</button>
      </div>

      {/* 搜索 */}
      <div style={{ display:"flex", alignItems:"center", gap:8, background:"white",
                    border:`1px solid ${C.border}`, borderRadius:999, padding:"9px 14px", marginBottom:14 }}>
        <span style={{ fontSize:14, color:C.sub }}>🔍</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索聊天对象"
          style={{ flex:1, border:"none", outline:"none", background:"transparent", fontSize:13, color:C.text, minWidth:0 }} />
      </div>

      <div style={{ fontSize:13, fontWeight:800, color:C.text, margin:"4px 0 10px" }}>我的私聊</div>

      {loading ? (
        <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:30 }}>加载中…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:"50px 24px", lineHeight:1.9 }}>
          {q.trim() ? "没找到相关聊天" : "还没有私聊，去社区认识新的毛孩子吧～"}
        </div>
      ) : (
        filtered.map((c) => (
          <button key={c.id} onClick={() => onOpen({ conversationId: c.id, other: c.other })}
            style={{ width:"100%", display:"flex", alignItems:"center", gap:12, textAlign:"left",
                     background:"white", border:"none", borderRadius:20, padding:"13px 14px", marginBottom:12,
                     cursor:"pointer", boxShadow:"0 2px 10px rgba(0,0,0,0.05)" }}>
            <Avatar url={c.other.avatar_url} size={48} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14.5, fontWeight:700, color:C.text,
                            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {c.other.username || "毛孩子家长"}
              </div>
              <div style={{ fontSize:12, color:C.sub, marginTop:3,
                            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {preview(c)}
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
              <span style={{ fontSize:11, color:C.sub }}>{relTime(c.last_message_at)}</span>
              {c.unread > 0 && (
                <span style={{ minWidth:18, height:18, padding:"0 5px", borderRadius:999, background:C.red,
                               color:"#fff", fontSize:10, fontWeight:800, lineHeight:"18px", textAlign:"center",
                               boxSizing:"border-box" }}>
                  {c.unread > 99 ? "99+" : c.unread}
                </span>
              )}
            </div>
          </button>
        ))
      )}

      {pickerOpen && (
        <StartChatPicker meId={meId}
          onClose={() => setPickerOpen(false)}
          onPick={(u) => { setPickerOpen(false); onOpen({ other: u }); }} />
      )}
    </div>
  );
}

/* 发起私聊：默认显示「我的关注」；搜索时按昵称/用户号搜全站用户 */
function StartChatPicker({ meId, onClose, onPick }) {
  const [following, setFollowing] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [q, setQ]                 = useState("");
  const [results, setResults]     = useState([]);
  const [searching, setSearching] = useState(false);

  // 默认：我的关注
  useEffect(() => {
    let alive = true;
    listFollowing(meId)
      .then((rows) => { if (alive) setFollowing(rows || []); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [meId]);

  // 搜索（昵称或用户号，全站）—— 输入停顿 300ms 后查询
  useEffect(() => {
    const term = q.trim();
    if (!term) { setResults([]); setSearching(false); return; }
    setSearching(true);
    let alive = true;
    const t = setTimeout(() => {
      searchUsers(term, { excludeId: meId })
        .then((rows) => { if (alive) setResults(rows || []); })
        .catch(() => { if (alive) setResults([]); })
        .finally(() => { if (alive) setSearching(false); });
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [q, meId]);

  const isSearch = !!q.trim();
  const rows = isSearch ? results : following;

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, zIndex:320, background:"rgba(0,0,0,0.45)",
               display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, background:C.bg, borderRadius:"22px 22px 0 0",
                    padding:"16px 16px 28px", maxHeight:"75vh", overflowY:"auto" }}>
        <div style={{ width:40, height:4, borderRadius:4, background:C.light, margin:"0 auto 14px" }} />
        <div style={{ fontSize:16, fontWeight:800, color:C.text, marginBottom:4 }}>发起私聊</div>
        <div style={{ fontSize:12, color:C.sub, marginBottom:14 }}>搜索昵称或用户号找到 TA，或从关注里选</div>

        <div style={{ display:"flex", alignItems:"center", gap:8, background:"white",
                      border:`1px solid ${C.border}`, borderRadius:999, padding:"9px 14px", marginBottom:14 }}>
          <span style={{ fontSize:14, color:C.sub }}>🔍</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索昵称或用户号"
            style={{ flex:1, border:"none", outline:"none", background:"transparent", fontSize:13, color:C.text, minWidth:0 }} />
        </div>

        {!isSearch && (
          <div style={{ fontSize:12, fontWeight:700, color:C.sub, margin:"0 0 8px 2px" }}>我的关注</div>
        )}

        {(isSearch ? searching : loading) ? (
          <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:24 }}>
            {isSearch ? "搜索中…" : "加载中…"}
          </div>
        ) : rows.length === 0 ? (
          <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:"30px 20px", lineHeight:1.8 }}>
            {isSearch ? "没找到该用户，换个昵称或用户号试试" : "还没有关注的人，搜索昵称/用户号找 TA 吧 🐾"}
          </div>
        ) : rows.map((u) => (
          <button key={u.id} onClick={() => onPick({ id: u.id, username: u.username, avatar_url: u.avatar_url })}
            style={{ width:"100%", display:"flex", alignItems:"center", gap:12, textAlign:"left",
                     background:"white", border:`1px solid ${C.border}`, borderRadius:16,
                     padding:"11px 14px", marginBottom:8, cursor:"pointer" }}>
            <Avatar url={u.avatar_url} size={42} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:700, color:C.text,
                            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {u.username || "毛孩子家长"}
              </div>
              <div style={{ fontSize:11, color:C.sub, marginTop:2,
                            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {u.user_no ? `用户号 ${u.user_no}` : ""}{u.user_no && u.city ? " · " : ""}{u.city ? `📍 ${u.city}` : ""}
              </div>
            </div>
            <span style={{ fontSize:12, fontWeight:700, color:C.pri }}>私聊 ›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
