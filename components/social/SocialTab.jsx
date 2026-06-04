"use client";

/**
 * components/social/SocialTab.jsx
 *
 * 狗友 / 附近狗狗 —— 真实数据（替换原 mock）。
 *  - 公开距离开关（长期保存于 dog_friend_profiles.is_visible）
 *  - 仅展示 1km 内、同样开启公开的真实狗友；只显示大致距离，绝不显示位置
 *  - 邀请一起遛弯 → 复用现有私聊：建会话 + 自动发邀请 + 打开私聊详情
 *  - 编辑我的遛弯名片 → DogFriendEdit 全屏页
 *
 * 隐私：经纬度只在浏览器内存里短暂存在，用于调用 RPC；从不渲染、从不存前端状态。
 */

import { useEffect, useRef, useState } from "react";
import {
  getMyDogProfile, setDogVisibility, updateDogLocation,
  getNearbyDogFriends, getCurrentPosition,
} from "@/services/dogFriendService";
import { getOrCreateConversation, sendPrivateText } from "@/services/privateChatService";
import { formatPetAge } from "@/services/petAge";
import { avatarForBreed } from "@/services/breedAvatar";
import DogFriendEdit from "./DogFriendEdit";
import DogWaitingIllustration from "./DogWaitingIllustration";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", text:"#2A2520",
  sub:"#8A8178", light:"#D6D5D8", border:"#E3DCD0",
  green:"#4CAF50", greenBg:"#EAF6EC", redBg:"#FCEDED", red:"#E07A6B",
};
const INVITE_TEXT = "你好呀，想和你一起遛狗～";
const RADIUS_KM = 3;

/* 圆角方形宠物头像：品种 emoji 即时占位（永不空白）→ 真图加载完淡入 */
function DogAvatar({ url, breed, petType, size = 72 }) {
  const ref = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(false);
  useEffect(() => { setLoaded(false); setBroken(false); }, [url]);
  // 命中缓存的图 onLoad 可能早于绑定 → complete 兜底，避免一直占位不显真图
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth > 0) setLoaded(true);
  }, [url]);
  const showImg = url && !broken;
  return (
    <div style={{ position:"relative", width:size, height:size, borderRadius:18, overflow:"hidden",
                  background:C.tint, flexShrink:0 }}>
      {(!showImg || !loaded) && (
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center",
                      justifyContent:"center", fontSize:Math.round(size*0.46) }}>
          {avatarForBreed(breed, petType)}
        </div>
      )}
      {showImg && (
        <img ref={ref} src={url} alt="" loading="eager" decoding="async" fetchPriority="high"
          onLoad={() => setLoaded(true)} onError={() => setBroken(true)}
          style={{ position:"absolute", inset:0, width:size, height:size, objectFit:"cover",
                   opacity: loaded ? 1 : 0, transition:"opacity .25s ease" }} />
      )}
    </div>
  );
}
function GenderIcon({ gender }) {
  if (gender === "male")   return <span style={{ color:"#5B9BD5", fontSize:13 }}>♂</span>;
  if (gender === "female") return <span style={{ color:"#E07A9B", fontSize:13 }}>♀</span>;
  return null;
}
function PawWhite({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
      <ellipse cx="6" cy="8" rx="2" ry="2.6" /><ellipse cx="10.5" cy="5" rx="2.2" ry="3" />
      <ellipse cx="14.5" cy="5" rx="2.2" ry="3" /><ellipse cx="19" cy="8" rx="2" ry="2.6" />
      <path d="M 7 14 Q 5 18, 8 21 Q 12.5 23, 17 21 Q 20 18, 18 14 Q 16 11.5, 12.5 11.5 Q 9 11.5, 7 14 Z" />
    </svg>
  );
}

export default function SocialTab({ user, pet, pets = [], onOpenProfile }) {
  const [profile, setProfile]   = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [nearby, setNearby]     = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [busyToggle, setBusyToggle]   = useState(false);
  const [staleNote, setStaleNote]     = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [invites, setInvites]   = useState({}); // userId -> 'sending' | 'sent'
  const [notice, setNotice]     = useState(null); // { msg, type }
  const noticeRef = useRef();

  const toast = (msg, type = "info") => {
    clearTimeout(noticeRef.current);
    setNotice({ msg, type });
    noticeRef.current = setTimeout(() => setNotice(null), 2800);
  };

  const visible = !!profile?.is_visible;

  /* ── 初始加载：读名片；若已公开则尝试刷新位置 + 拉附近 ── */
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    (async () => {
      try {
        const prof = await getMyDogProfile(user.id);
        if (!alive) return;
        setProfile(prof);
        if (prof?.is_visible) refreshNearby(true);
      } catch (e) {
        if (alive) toast(e.message, "error");
      } finally {
        if (alive) setLoadingProfile(false);
      }
    })();
    return () => { alive = false; };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* 列表到手即预加载所有头像（优先小图 thumb），用户滑到就已就绪 */
  useEffect(() => {
    nearby.forEach((d) => {
      const u = d.pet_thumb_url || d.pet_avatar_url;
      if (u) { const im = new Image(); im.src = u; }
    });
  }, [nearby]);

  /* ── 拉附近（需当前定位；拿不到则保留旧列表 + 提示）── */
  const refreshNearby = async (silent = false) => {
    if (!user?.id) return;
    setLoadingList(true);
    try {
      let coords;
      try {
        coords = await getCurrentPosition();
        setStaleNote(false);
      } catch (e) {
        if (e.code === "denied") {
          if (!silent) toast("需要允许定位后，才能显示附近狗狗的大致距离。", "warn");
        } else if (!silent) {
          toast("暂时无法获取位置，请稍后再试。", "error");
        }
        setStaleNote(true); // 保留上一次列表，提示可能不是最新
        return;
      }
      await updateDogLocation({ userId: user.id, ...coords }).catch(() => {});
      const list = await getNearbyDogFriends({ userId: user.id, ...coords, radiusKm: RADIUS_KM });
      setNearby(list);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoadingList(false);
    }
  };

  /* ── 切换公开距离 ── */
  const toggleVisible = async () => {
    if (!user?.id || busyToggle) return;
    setBusyToggle(true);
    try {
      if (!visible) {
        // 开启：先要定位授权
        let coords;
        try { coords = await getCurrentPosition(); }
        catch (e) {
          if (e.code === "denied") toast("需要允许定位后，才能显示附近狗狗的大致距离。", "warn");
          else toast("暂时无法获取位置，请稍后再试。", "error");
          return; // 不开启
        }
        await setDogVisibility({ userId: user.id, visible: true, lat: coords.lat, lng: coords.lng });
        setProfile((p) => ({ ...(p || {}), is_visible: true, has_location: true }));
        setStaleNote(false);
        const list = await getNearbyDogFriends({ userId: user.id, ...coords, radiusKm: RADIUS_KM });
        setNearby(list);
        toast("距离可见已开启 🐾", "success");
      } else {
        await setDogVisibility({ userId: user.id, visible: false });
        setProfile((p) => ({ ...(p || {}), is_visible: false }));
        setNearby([]);
        toast("已关闭距离可见", "info");
      }
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusyToggle(false);
    }
  };

  /* ── 邀请一起遛弯：后台自动发私聊邀请，不跳转，停留在列表页 ── */
  const handleInvite = async (card) => {
    if (!user?.id) { toast("请先登录", "error"); return; }
    if (card.user_id === user.id) { toast("不能邀请自己哦", "warn"); return; }
    if (invites[card.user_id]) return; // 发送中 / 已发送 → 不重复
    setInvites((m) => ({ ...m, [card.user_id]: "sending" }));
    toast("正在发送遛弯申请…", "info");
    try {
      const conv = await getOrCreateConversation(user.id, card.user_id);
      await sendPrivateText({
        convId: conv.id, senderId: user.id, receiverId: card.user_id, content: INVITE_TEXT,
      });
      setInvites((m) => ({ ...m, [card.user_id]: "sent" }));
      toast("已发送遛弯申请 🐾", "success");
    } catch (e) {
      setInvites((m) => { const n = { ...m }; delete n[card.user_id]; return n; });
      toast(e.message, "error");
    }
  };

  /* ── 从编辑页返回：重新加载名片（可见性/位置可能变了）── */
  const handleEditSaved = async () => {
    setEditOpen(false);
    try {
      const prof = await getMyDogProfile(user.id);
      setProfile(prof);
      if (prof?.is_visible) refreshNearby(true);
      else setNearby([]);
    } catch {}
  };

  return (
    <div style={{ height:"100%", overflowY:"auto", background:C.bg }}>
      {/* 顶部标题 */}
      <div style={{ padding:"52px 18px 14px" }}>
        <div style={{ fontSize:21, fontWeight:800, color:C.text, display:"flex", alignItems:"center", gap:8 }}>
          <PawOrange size={20} /> 附近狗狗
        </div>
        <div style={{ fontSize:12.5, color:C.sub, marginTop:3 }}>发现 3km 内愿意一起遛弯的毛孩子</div>
      </div>

      {/* 状态卡 */}
      <div style={{ margin:"0 14px", background:"white", borderRadius:18, padding:"16px",
                    boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
          <span style={{ width:36, height:36, borderRadius:"50%", flexShrink:0,
                         background: visible ? C.greenBg : C.tint,
                         display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"
                    stroke={visible ? C.green : C.sub} strokeWidth="1.8"/>
              <circle cx="12" cy="10" r="2.4" fill={visible ? C.green : C.sub}/>
            </svg>
          </span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:14.5, fontWeight:800, color:C.text }}>
              {visible ? "距离可见已开启" : "开启距离可见"}
            </div>
            <div style={{ fontSize:11.5, color:C.sub, marginTop:3, lineHeight:1.6 }}>
              {visible
                ? "仅展示大致距离，不显示具体位置，放心交友更安全～"
                : "开启后，附近 3km 内的狗友可以看到你的遛弯名片"}
            </div>
          </div>
          <Toggle on={visible} busy={busyToggle} onClick={toggleVisible} />
        </div>

        {/* 编辑名片入口 */}
        <button onClick={() => setEditOpen(true)}
          style={{ marginTop:14, width:"100%", display:"flex", alignItems:"center", gap:8,
                   background:C.bg, border:`1px solid ${C.border}`, borderRadius:14,
                   padding:"12px 14px", cursor:"pointer", textAlign:"left" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink:0 }}>
            <path d="M4 20h4l10-10-4-4L4 16v4z" stroke={C.pri} strokeWidth="1.8" strokeLinejoin="round"/>
          </svg>
          <span style={{ flex:1, fontSize:13.5, fontWeight:700, color:C.text }}>编辑我的遛弯名片</span>
          <span style={{ color:C.sub, fontSize:18 }}>›</span>
        </button>
      </div>

      {/* 列表标题 + 刷新 */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"16px 18px 6px" }}>
        <span style={{ fontSize:11.5, color:C.sub }}>以下为 3km 内的狗狗伙伴</span>
        <button onClick={() => refreshNearby(false)} disabled={!visible || loadingList}
          style={{ display:"flex", alignItems:"center", gap:4, background:"transparent", border:"none",
                   color: visible ? C.pri : C.light, fontSize:12, fontWeight:600,
                   cursor: visible && !loadingList ? "pointer" : "default" }}>
          <span style={{ display:"inline-block", animation: loadingList ? "dfspin .8s linear infinite" : "none" }}>↻</span>
          刷新
        </button>
      </div>

      {staleNote && visible && (
        <div style={{ margin:"0 14px 6px", fontSize:11, color:C.sub, background:"#FFF6EC",
                      border:`1px solid ${C.border}`, borderRadius:12, padding:"8px 12px" }}>
          ⚠️ 距离可能不是最新的，点「刷新」重新获取位置
        </div>
      )}

      <div style={{ padding:"6px 14px 96px" }}>
        {/* 未开启 */}
        {!loadingProfile && !visible && (
          <EmptyState
            title="开启「距离可见」后，才能看到附近狗友"
            desc="先完善你的遛弯名片，开启公开距离，等毛孩子们来找你吧 🐾" />
        )}

        {/* 已开启、加载中 */}
        {visible && loadingList && nearby.length === 0 && (
          <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:"30px 0" }}>正在寻找附近狗友…</div>
        )}

        {/* 已开启、空 */}
        {visible && !loadingList && nearby.length === 0 && (
          <EmptyState
            title="还没有附近狗狗开启遛弯名片～"
            desc="先完善你的名片，等毛孩子们来找你吧 🐾" />
        )}

        {/* 卡片列表 */}
        {visible && nearby.map((d) => (
          <DogCard key={d.user_id} d={d} onInvite={() => handleInvite(d)}
            inviteStatus={invites[d.user_id] || "idle"}
            onOpenProfile={onOpenProfile ? () => onOpenProfile(d.user_id) : null} />
        ))}
      </div>

      {/* 编辑名片 */}
      {editOpen && (
        <DogFriendEdit
          user={user} pet={pet} pets={pets} profile={profile}
          onClose={() => setEditOpen(false)}
          onSaved={handleEditSaved}
          toast={toast} />
      )}

      {/* 轻量 toast */}
      {notice && (
        <div style={{ position:"fixed", left:"50%", bottom:96, transform:"translateX(-50%)", zIndex:400,
                      maxWidth:320, padding:"10px 18px", borderRadius:14, fontSize:13, fontWeight:600,
                      color:"white", textAlign:"center", boxShadow:"0 4px 16px rgba(0,0,0,0.2)",
                      background: notice.type === "error" ? "#E07A6B"
                               : notice.type === "warn"  ? "#E0A35B"
                               : notice.type === "success" ? "#5BB97A" : "#5A5048" }}>
          {notice.msg}
        </div>
      )}

      <style>{`@keyframes dfspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── 单张狗友卡片 ── */
function DogCard({ d, onInvite, onOpenProfile, inviteStatus = "idle" }) {
  const age = formatPetAge(d.pet_birthday) || (d.pet_age != null ? `${d.pet_age}岁` : null);
  const tags = [];
  tags.push({ lbl: d.neutered ? "已绝育" : "未绝育", ok: d.neutered });
  tags.push({ lbl: d.vaccinated ? "疫苗齐全" : "疫苗未齐", ok: d.vaccinated });

  return (
    <div style={{ background:"white", borderRadius:20, padding:16, marginBottom:12,
                  boxShadow:"0 2px 14px rgba(0,0,0,0.05)" }}>
      <div onClick={onOpenProfile || undefined}
           style={{ display:"flex", gap:12, cursor: onOpenProfile ? "pointer" : "default" }}>
        <DogAvatar url={d.pet_thumb_url || d.pet_avatar_url} breed={d.pet_breed} petType={d.pet_type} size={72} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:5, minWidth:0 }}>
              <span style={{ fontSize:16, fontWeight:800, color:C.text,
                             whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {d.pet_name || "毛孩子"}
              </span>
              <GenderIcon gender={d.pet_gender} />
            </div>
            <span style={{ fontSize:11.5, color:C.sub, flexShrink:0 }}>距你 {Number(d.distance_km).toFixed(1)}km</span>
          </div>
          <div style={{ fontSize:12, color:C.sub, marginTop:3 }}>
            {[d.pet_breed, age, d.username ? `主人：${d.username}` : null].filter(Boolean).join(" · ")}
          </div>
          {Array.isArray(d.walking_times) && d.walking_times.length > 0 && (
            <div style={{ fontSize:11.5, color:C.pri, fontWeight:600, marginTop:5 }}>
              ⏰ {d.walking_times[0]} 遛弯{d.walking_times.length > 1 ? " 等" : ""}
            </div>
          )}
        </div>
      </div>

      {/* 标签区 */}
      <div style={{ display:"flex", gap:7, marginTop:12, flexWrap:"wrap" }}>
        {tags.map((b) => (
          <span key={b.lbl} style={{ fontSize:11, fontWeight:600, padding:"4px 10px", borderRadius:20,
                                     background: b.ok ? C.greenBg : C.redBg, color: b.ok ? C.green : C.red }}>
            {b.lbl}
          </span>
        ))}
        {d.small_dog_preference && <Pill text={d.small_dog_preference} />}
        {d.big_dog_preference && <Pill text={d.big_dog_preference} />}
        {(d.personalities || []).map((p) => <Pill key={p} text={p} />)}
      </div>

      {/* 简介 */}
      {d.intro?.trim() && (
        <div style={{ fontSize:12.5, color:C.sub, marginTop:10, lineHeight:1.55, wordBreak:"break-word" }}>
          {d.intro}
        </div>
      )}

      {/* 邀请按钮：默认 → 正在邀请… → 已发送（停留在列表页，不跳转）*/}
      {(() => {
        const cfg = {
          idle:    { bg:C.pri,     shadow:"0 4px 12px rgba(230,134,69,0.3)" },
          sending: { bg:"#F0B583", shadow:"none" },
          sent:    { bg:"#5BB97A", shadow:"0 4px 12px rgba(91,185,122,0.3)" },
        }[inviteStatus] || { bg:C.pri, shadow:"0 4px 12px rgba(230,134,69,0.3)" };
        const busy = inviteStatus !== "idle";
        return (
          <button onClick={onInvite} disabled={busy}
            style={{ marginTop:14, width:"100%", padding:"12px 0", borderRadius:16, background:cfg.bg,
                     color:"white", fontSize:13.5, fontWeight:700, border:"none",
                     cursor: busy ? "default" : "pointer",
                     display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                     boxShadow:cfg.shadow, transition:"background .2s" }}>
            {inviteStatus === "sending" ? (
              <><span style={{ width:14, height:14, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.5)",
                               borderTopColor:"#fff", display:"inline-block",
                               animation:"dfspin .8s linear infinite" }} /> 正在邀请…</>
            ) : inviteStatus === "sent" ? (
              <>✓ 已发送遛弯申请</>
            ) : (
              <><PawWhite size={16} /> 邀请一起遛弯</>
            )}
          </button>
        );
      })()}
    </div>
  );
}

function Pill({ text }) {
  return (
    <span style={{ fontSize:11, fontWeight:600, padding:"4px 10px", borderRadius:20,
                   background:C.tint, color:C.pri }}>{text}</span>
  );
}

function Toggle({ on, busy, onClick }) {
  return (
    <button onClick={onClick} disabled={busy}
      style={{ width:48, height:28, borderRadius:999, flexShrink:0, border:"none",
               cursor: busy ? "default" : "pointer", position:"relative",
               background: on ? "#5BB97A" : "#D6D5D8", transition:"background .2s", opacity: busy ? 0.6 : 1 }}>
      <span style={{ position:"absolute", top:3, left: on ? 23 : 3, width:22, height:22, borderRadius:"50%",
                     background:"white", transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,0.3)" }} />
    </button>
  );
}

function PawOrange({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#E68645" aria-hidden="true">
      <ellipse cx="6" cy="8" rx="2" ry="2.6" /><ellipse cx="10.5" cy="5" rx="2.2" ry="3" />
      <ellipse cx="14.5" cy="5" rx="2.2" ry="3" /><ellipse cx="19" cy="8" rx="2" ry="2.6" />
      <path d="M 7 14 Q 5 18, 8 21 Q 12.5 23, 17 21 Q 20 18, 18 14 Q 16 11.5, 12.5 11.5 Q 9 11.5, 7 14 Z" />
    </svg>
  );
}

function EmptyState({ title, desc }) {
  return (
    <div style={{ textAlign:"center", padding:"44px 24px" }}>
      <DogWaitingIllustration size={150} style={{ display:"block", margin:"0 auto 18px" }} />
      <div style={{ fontSize:14.5, fontWeight:700, color:C.text }}>{title}</div>
      <div style={{ fontSize:12.5, color:C.sub, marginTop:6, lineHeight:1.6 }}>{desc}</div>
    </div>
  );
}
