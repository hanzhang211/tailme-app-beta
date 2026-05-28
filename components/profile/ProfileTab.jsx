"use client";

/**
 * components/profile/ProfileTab.jsx
 *
 * 「我的」页（参考小红书个人主页，TailMe 暖色风）：
 *  - 头部：头像 / 用户名 / 设置按钮
 *  - 统计：获赞 / 作品 / 赞过
 *  - 宠物卡片网格（最多 4 只）+ 添加按钮
 *  - Tab：我的作品 / 我赞过 —— 双列瀑布流
 *  - 点开帖子复用 PostDetail；自己的帖子卡有"..."删除入口
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { getUserPets, deletePet } from "@/services/supabaseService";
import {
  listMyPosts, listLikedPosts, getUserStats,
  deleteOwnContent,
} from "@/services/communityService";
import { formatPetAge, formatBirthday } from "@/services/petAge";

import PostDetail      from "@/components/community/PostDetail";
import PetAvatar       from "@/components/PetAvatar";
import PetEditor       from "./PetEditor";
import SettingsModal   from "./SettingsModal";
import AvatarGenerator from "@/components/home/AvatarGenerator";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", text:"#1A1006",
  sub:"#8A8074", light:"#D6D5D8", border:"#D6D5D8",
};

const PET_LIMIT = 4;

function maskPhone(phone) {
  if (!phone) return "";
  const s = String(phone);
  if (s.length < 7) return s;
  return s.slice(0, 3) + "****" + s.slice(-4);
}

export default function ProfileTab({ user, pet, onSetActivePet, onPetUpdated, onLogout }) {
  const [pets,        setPets]        = useState([]);
  const [stats,       setStats]       = useState({ totalLikes: 0, postCount: 0, likedCount: 0 });
  const [myPosts,     setMyPosts]     = useState([]);
  const [likedPosts,  setLikedPosts]  = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [activeTab,   setActiveTab]   = useState("mine"); // mine | liked
  const [detailId,    setDetailId]    = useState(null);
  const [editorPet,    setEditorPet]    = useState(undefined); // undefined=closed, null=add, obj=edit
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [avatarPet,    setAvatarPet]    = useState(null); // 当前生成头像的宠物，null=关闭

  const [toastMsg, setToastMsg] = useState(null);
  const toastTimerRef = useRef();
  const toast = (msg, level = "info") => {
    clearTimeout(toastTimerRef.current);
    setToastMsg({ msg, level });
    toastTimerRef.current = setTimeout(() => setToastMsg(null),
      level === "error" ? 4000 : 2500);
  };

  /* ── 初始加载 ─────────────────────────────────────── */
  const refreshAll = async () => {
    if (!user?.id) return;
    try {
      const [petsList, statsData, mine] = await Promise.all([
        getUserPets(user.id),
        getUserStats(user.id),
        listMyPosts(user.id),
      ]);
      setPets(petsList || []);
      setStats(statsData);
      setMyPosts(mine);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setLoadingPosts(false);
    }
  };
  useEffect(() => { refreshAll(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 切到"我赞过"才拉 ─────────────────────────────── */
  useEffect(() => {
    if (activeTab !== "liked" || !user?.id) return;
    let alive = true;
    (async () => {
      try {
        const liked = await listLikedPosts(user.id);
        if (alive) setLikedPosts(liked);
      } catch (e) {
        if (alive) toast(e.message, "error");
      }
    })();
    return () => { alive = false; };
  }, [activeTab, user?.id]);

  /* ── 添加 / 编辑 / 删除宠物 ─────────────────────── */
  const handleAddPet = () => {
    if (pets.length >= PET_LIMIT) {
      toast(`最多可以添加 ${PET_LIMIT} 位毛孩子哦`, "warn");
      return;
    }
    setEditorPet(null);
  };

  const handleEditPet = (p) => { setSettingsOpen(false); setEditorPet(p); };

  const handleDeletePet = async (p) => {
    try {
      await deletePet(p.id, user.id);
      setPets((prev) => prev.filter((x) => x.id !== p.id));
      toast(`${p.name || "毛孩子"} 已移除`, "info");
    } catch (e) { toast(e.message, "error"); }
  };

  const onPetSaved = (savedPet) => {
    setPets((prev) => {
      const idx = prev.findIndex((x) => x.id === savedPet.id);
      if (idx === -1) return [savedPet, ...prev];
      const next = [...prev]; next[idx] = savedPet; return next;
    });
    setEditorPet(undefined);
    // 编辑已有宠物时通知 AppRoot 同步首页
    onPetUpdated?.(savedPet);
  };

  const onAvatarSaved = (updatedPet) => {
    setPets((prev) => prev.map((p) => p.id === updatedPet.id ? updatedPet : p));
    onPetUpdated?.(updatedPet);   // 通知 AppRoot 更新全局 pets + active pet
    setAvatarPet(null);
  };

  /* ── 删除自己的帖子（从卡片小按钮） ─────────────── */
  const handleDeletePost = async (post, e) => {
    e.stopPropagation();
    if (!confirm("确定要删除这篇作品吗？")) return;
    try {
      await deleteOwnContent({ userId: user.id, targetType: "post", targetId: post.id });
      setMyPosts((prev) => prev.filter((p) => p.id !== post.id));
      setStats((s) => ({ ...s, postCount: Math.max(s.postCount - 1, 0) }));
      toast("已删除", "info");
    } catch (err) {
      toast(err.message, "error");
    }
  };

  /* ── 退出登录 ────────────────────────────────────── */
  const handleLogout = () => {
    if (!confirm("确定要退出当前账号吗？")) return;
    setSettingsOpen(false);
    onLogout?.();
  };

  /* ── 瀑布流分列 ──────────────────────────────────── */
  const posts = activeTab === "mine" ? myPosts : likedPosts;
  const [leftCol, rightCol] = useMemo(() => {
    const L = [], R = [];
    let lh = 0, rh = 0;
    for (const p of posts) {
      const isText = p.post_type === "text" || (!p.cover_thumbnail_url && !p.cover_image_url);
      const r = isText
        ? Math.max(0.75, Math.min(1.4, 1.2 - ((p.title?.length || 0) + (p.content?.length || 0)) / 280))
        : (Number(p.cover_aspect_ratio) > 0 ? Number(p.cover_aspect_ratio) : 1);
      const estH = 1 / r + 0.4;
      if (lh <= rh) { L.push(p); lh += estH; }
      else          { R.push(p); rh += estH; }
    }
    return [L, R];
  }, [posts]);

  const headerPet = pet || pets[0] || null;

  return (
    <div style={{ height:"100%", overflowY:"auto", background:C.bg, position:"relative" }}>

      {/* ── 顶部：头像 / 用户名 / 设置 ───────────────────── */}
      <div style={{ background:"white", padding:"52px 18px 18px",
                    borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <PetAvatar pet={headerPet} size={60} bg={C.tint} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:18, fontWeight:800, color:C.text }}>
              {user?.username || "未命名"}
            </div>
            <div style={{ fontSize:11, color:C.sub, marginTop:2 }}>
              手机号 {maskPhone(user?.phone)}
            </div>
          </div>
          <button onClick={() => setSettingsOpen(true)}
            style={{ width:38, height:38, borderRadius:"50%", background:C.tint,
                     border:`1px solid ${C.border}`,
                     display:"flex", alignItems:"center", justifyContent:"center",
                     fontSize:16, cursor:"pointer" }}>⚙</button>
        </div>

        {/* 统计 */}
        <div style={{ display:"flex", marginTop:18 }}>
          {[
            { label:"获赞", val: stats.totalLikes },
            { label:"作品", val: stats.postCount },
            { label:"赞过", val: stats.likedCount },
          ].map((s) => (
            <div key={s.label} style={{ flex:1, textAlign:"center" }}>
              <div style={{ fontSize:20, fontWeight:800, color:C.text }}>{s.val}</div>
              <div style={{ fontSize:11, color:C.sub, marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 宠物卡片区 ──────────────────────────────────── */}
      <div style={{ padding:"14px 14px 4px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                      marginBottom:10 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text }}>
            我的毛孩子 <span style={{ color:C.sub, fontWeight:500, marginLeft:4 }}>
              {pets.length}/{PET_LIMIT}
            </span>
          </div>
          {pets.length < PET_LIMIT && (
            <button onClick={handleAddPet}
              style={{ fontSize:11, color:C.pri, fontWeight:700,
                       background:"transparent", border:"none", cursor:"pointer" }}>
              ＋ 添加毛孩子
            </button>
          )}
        </div>

        {pets.length === 0 ? (
          <div style={{ textAlign:"center", color:C.sub, fontSize:12, padding:"24px 0" }}>
            还没有毛孩子，去添加一只吧 🐾
          </div>
        ) : (
          <style>{`.pet-carousel::-webkit-scrollbar{display:none}`}</style>
          <div className="pet-carousel"
            style={{ display:"flex", gap:10, overflowX:"auto", overflowY:"hidden",
                     scrollSnapType:"x mandatory", WebkitOverflowScrolling:"touch",
                     paddingBottom:6, scrollbarWidth:"none", msOverflowStyle:"none" }}>
            {pets.map((p) => (
              <div key={p.id}
                style={{ flex:"0 0 80%", maxWidth:300, scrollSnapAlign:"start" }}>
                <PetCard pet={p}
                  isActive={pet?.id === p.id}
                  onSelect={() => onSetActivePet?.(p)}
                  onAvatar={() => setAvatarPet(p)}
                  onEdit={() => setEditorPet(p)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Tab 切换 ────────────────────────────────────── */}
      <div style={{ padding:"18px 14px 0", position:"sticky", top:0, background:C.bg, zIndex:2 }}>
        <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${C.border}` }}>
          {[
            { key:"mine",  label:"我的作品" },
            { key:"liked", label:"我赞过"  },
          ].map((t) => {
            const on = activeTab === t.key;
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                style={{ flex:1, padding:"10px 0", fontSize:13,
                         fontWeight: on ? 700 : 600,
                         color: on ? C.text : C.sub,
                         background:"transparent", border:"none", cursor:"pointer",
                         position:"relative" }}>
                {t.label}
                {on && <div style={{ position:"absolute", left:"50%", bottom:-1,
                                     transform:"translateX(-50%)",
                                     width:24, height:2.5, borderRadius:3,
                                     background:C.pri }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Posts grid ──────────────────────────────────── */}
      <div style={{ display:"flex", gap:8, padding:"12px 12px 90px" }}>
        {[leftCol, rightCol].map((col, ci) => (
          <div key={ci} style={{ flex:1, display:"flex", flexDirection:"column", gap:8, minWidth:0 }}>
            {col.map((p) => (
              <MiniPostCard
                key={p.id} post={p}
                onOpen={() => setDetailId(p.id)}
                onDelete={activeTab === "mine" ? (e) => handleDeletePost(p, e) : null}
              />
            ))}
          </div>
        ))}
      </div>

      {loadingPosts && (
        <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:30 }}>加载中…</div>
      )}
      {!loadingPosts && posts.length === 0 && (
        <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:"40px 0 90px" }}>
          {activeTab === "mine" ? "还没有发布过作品，去社群发一条吧 ✏️" : "还没有赞过的帖子"}
        </div>
      )}

      {/* ── modals ─────────────────────────────────────── */}
      {editorPet !== undefined && (
        <PetEditor
          pet={editorPet}
          userId={user?.id}
          onClose={() => setEditorPet(undefined)}
          onSaved={onPetSaved}
          toast={toast}
        />
      )}

      {avatarPet && (
        <AvatarGenerator
          user={user}
          pet={avatarPet}
          onClose={() => setAvatarPet(null)}
          onSaved={onAvatarSaved}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          pets={pets}
          onAddPet={() => { setSettingsOpen(false); handleAddPet(); }}
          onEditPet={handleEditPet}
          onDeletePet={handleDeletePet}
          onLogout={handleLogout}
          onClose={() => setSettingsOpen(false)}
          toast={toast}
        />
      )}

      {detailId && (
        <PostDetail
          postId={detailId} user={user} pet={pet}
          initialLiked={activeTab === "liked"}
          onLikeChange={(postId, isLikedNow, delta) => {
            setMyPosts((prev) => prev.map((p) =>
              p.id === postId ? { ...p, like_count: (p.like_count || 0) + delta } : p));
            setLikedPosts((prev) => prev.map((p) =>
              p.id === postId ? { ...p, like_count: (p.like_count || 0) + delta } : p));
          }}
          onDeleted={(id) => {
            setMyPosts((prev) => prev.filter((p) => p.id !== id));
            setLikedPosts((prev) => prev.filter((p) => p.id !== id));
            setStats((s) => ({ ...s, postCount: Math.max(s.postCount - 1, 0) }));
          }}
          onClose={() => setDetailId(null)}
          toast={toast}
        />
      )}

      {toastMsg && <Toast msg={toastMsg.msg} level={toastMsg.level} />}
    </div>
  );
}

/* ────────────────────────────────────────────────────── */
function PetCard({ pet, isActive, onSelect, onAvatar, onEdit }) {
  const age = formatPetAge(pet.birthday) || (pet.age != null ? `${pet.age}岁` : "");
  return (
    <div style={{ background:"white",
                  border: isActive ? `2px solid ${C.pri}` : `1px solid ${C.border}`,
                  borderRadius:14, padding:"12px 12px",
                  boxShadow: isActive ? `0 0 0 3px ${C.tint}` : "0 1px 4px rgba(0,0,0,0.04)",
                  position:"relative" }}>

      {/* 当前展示标签 */}
      {isActive && (
        <div style={{ position:"absolute", top:-1, right:8,
                      background:C.pri, color:"white", fontSize:9, fontWeight:700,
                      padding:"2px 7px", borderRadius:"0 0 6px 6px", letterSpacing:0.3 }}>
          当前展示
        </div>
      )}

      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
        <PetAvatar pet={pet} size={30} bg={C.tint} />
        <div style={{ fontSize:14, fontWeight:800, color:C.text,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>
          {pet.name || "未命名"}
        </div>
      </div>

      <div style={{ fontSize:11, color:C.sub, lineHeight:1.7 }}>
        {pet.breed && <div>{pet.breed} · {age || "-"} · {pet.weight || "?"}kg · {pet.gender === "male" ? "男孩" : pet.gender === "female" ? "女孩" : "?"}</div>}
        {pet.birthday && <div>🎂 {formatBirthday(pet.birthday)}</div>}
        {pet.personality && <div>✨ {pet.personality}</div>}
      </div>

      {/* 操作按钮行 */}
      <div style={{ display:"flex", gap:5, marginTop:8, flexWrap:"wrap" }}>
        <button onClick={onAvatar}
          style={{ flex:"1 1 auto", fontSize:10, fontWeight:700, color:C.pri,
                   background:C.tint, border:`1px solid ${C.border}`,
                   borderRadius:8, padding:"5px 4px", cursor:"pointer" }}>
          {pet.ai_avatar_url ? "✨ 换头像" : "✨ 生成头像"}
        </button>
        <button onClick={onEdit}
          style={{ flex:"1 1 auto", fontSize:10, fontWeight:700, color:C.text,
                   background:"white", border:`1px solid ${C.border}`,
                   borderRadius:8, padding:"5px 4px", cursor:"pointer" }}>
          📝 编辑资料
        </button>
        {!isActive && (
          <button onClick={onSelect}
            style={{ width:"100%", fontSize:10, fontWeight:700, color:"white",
                     background:C.pri, border:"none",
                     borderRadius:8, padding:"5px 0", cursor:"pointer", marginTop:2 }}>
            选为当前
          </button>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────── */
function MiniPostCard({ post, onOpen, onDelete }) {
  const thumb = post.cover_thumbnail_url || post.cover_image_url;
  const isText = post.post_type === "text" || !thumb;
  const ratio = isText
    ? Math.max(0.75, Math.min(1.4, 1.2 - ((post.title?.length || 0) + (post.content?.length || 0)) / 280))
    : (Number(post.cover_aspect_ratio) > 0 ? Number(post.cover_aspect_ratio) : 1);

  return (
    <div onClick={onOpen}
      style={{ position:"relative", background:"white", borderRadius:14, overflow:"hidden",
               cursor:"pointer", boxShadow:"0 1px 6px rgba(0,0,0,0.06)" }}>
      {isText ? (
        <div style={{ background: post.text_bg_color || C.tint,
                      aspectRatio: `1 / ${1 / ratio}`,
                      padding:"12px 12px",
                      display:"flex", flexDirection:"column", justifyContent:"center" }}>
          {post.title && (
            <div style={{ fontSize:13, fontWeight:800,
                          color: post.text_bg_color === "#E68645" ? "white" : C.text,
                          marginBottom:5, lineHeight:1.4, wordBreak:"break-word",
                          overflow:"hidden", display:"-webkit-box",
                          WebkitLineClamp:3, WebkitBoxOrient:"vertical" }}>
              {post.title}
            </div>
          )}
          <div style={{ fontSize:11, lineHeight:1.55,
                        color: post.text_bg_color === "#E68645" ? "white" : C.text,
                        wordBreak:"break-word",
                        overflow:"hidden", display:"-webkit-box",
                        WebkitLineClamp: post.title ? 3 : 6, WebkitBoxOrient:"vertical",
                        opacity: 0.92 }}>
            {post.content}
          </div>
        </div>
      ) : (
        <div style={{ width:"100%", aspectRatio:`${ratio} / 1`, background:C.tint }}>
          <img src={thumb} alt=""
            loading="lazy" decoding="async"
            style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
        </div>
      )}

      {!isText && post.title && (
        <div style={{ padding:"6px 9px 0", fontSize:12, fontWeight:700, color:C.text,
                      overflow:"hidden", display:"-webkit-box",
                      WebkitLineClamp:2, WebkitBoxOrient:"vertical", lineHeight:1.4 }}>
          {post.title}
        </div>
      )}

      <div style={{ padding:"6px 9px 9px", display:"flex", alignItems:"center",
                    fontSize:11, color:C.sub }}>
        <span>❤️ {post.like_count || 0}</span>
        <div style={{ flex:1 }} />
        {onDelete && (
          <button onClick={onDelete}
            style={{ background:"transparent", border:"none", cursor:"pointer",
                     color:C.sub, fontSize:13, padding:"2px 4px" }}>🗑</button>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────── */
function Toast({ msg, level }) {
  const colors = {
    info:    { bg:"#1F2937", color:"white" },
    success: { bg:"#0F766E", color:"white" },
    warn:    { bg:"#B45309", color:"white" },
    error:   { bg:"#B91C1C", color:"white" },
  };
  const s = colors[level] || colors.info;
  return (
    <div style={{ position:"fixed", left:"50%", bottom:90, transform:"translateX(-50%)",
                  background:s.bg, color:s.color, padding:"10px 18px",
                  borderRadius:22, fontSize:13, fontWeight:600,
                  boxShadow:"0 6px 20px rgba(0,0,0,0.25)", zIndex:300,
                  maxWidth:"80%", textAlign:"center" }}>
      {msg}
    </div>
  );
}
