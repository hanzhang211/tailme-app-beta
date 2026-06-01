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
import { getUserPets, deletePet, updateUserAvatar, getPetCountByUsers } from "@/services/supabaseService";
import { uploadUserAvatar } from "@/services/petAvatarService";
import {
  listMyPosts, listLikedPosts, getUserStats,
  deleteOwnContent,
  getFollowCounts, listFollowing, listFollowers, getFollowingSet, followUser,
} from "@/services/communityService";
import { formatPetAge, formatBirthday } from "@/services/petAge";
import { avatarForBreed } from "@/services/breedAvatar";

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

export default function ProfileTab({ user, pet, onSetActivePet, onPetUpdated, onPetDeleted, onUserUpdated, onOpenProfile, onLogout }) {
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
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false); // 用户头像选择弹窗

  // 关注/粉丝
  const [followCounts, setFollowCounts] = useState({ following: 0, followers: 0 });
  const [followView,   setFollowView]   = useState(null); // null | "following" | "followers"
  // 我的页子页：null=主页菜单 | "posts"=我的帖子 | "pets"=我的宠物
  const [subView, setSubView] = useState(null);

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
      getFollowCounts(user.id).then(setFollowCounts).catch(() => {});
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
      onPetDeleted?.(p.id);   // 通知 AppRoot，首页 carousel 同步移除
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

  // PetEditor 内删除成功后：更新本地列表 + 通知 AppRoot（首页 carousel 同步移除）
  const onPetDeletedFromEditor = (deletedPet) => {
    setPets((prev) => prev.filter((x) => x.id !== deletedPet.id));
    setEditorPet(undefined);
    onPetDeleted?.(deletedPet.id);
    toast(`${deletedPet.name || "毛孩子"} 已删除`, "info");
  };

  const onAvatarSaved = (updatedPet) => {
    setPets((prev) => prev.map((p) => p.id === updatedPet.id ? updatedPet : p));
    onPetUpdated?.(updatedPet);   // 通知 AppRoot 更新全局 pets + active pet
    setAvatarPet(null);
  };

  /* ── 设置用户头像（社群/帖子/群聊同步显示）────────── */
  const handleSelectUserAvatar = async (url) => {
    try {
      const updated = await updateUserAvatar(user.id, url);
      onUserUpdated?.(updated);
      toast(url ? "头像已更新 ✨" : "已恢复默认头像", "success");
      setAvatarPickerOpen(false);
    } catch (e) { toast(e.message, "error"); }
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

      {/* ════ 我的宠物 子页 ════ */}
      {subView === "pets" && (
        <>
          <SubBack title="我的宠物" onBack={() => setSubView(null)}
            right={pets.length < PET_LIMIT ? (
              <button onClick={handleAddPet}
                style={{ fontSize:12, color:C.pri, fontWeight:700, background:"transparent",
                         border:"none", cursor:"pointer" }}>＋ 添加</button>
            ) : null} />
          <div style={{ padding:"14px 14px 90px", display:"flex", flexDirection:"column", gap:12 }}>
            {pets.length === 0 ? (
              <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:"40px 0" }}>
                还没有毛孩子，去添加一只吧 🐾
              </div>
            ) : pets.map((p) => (
              <PetCard key={p.id} pet={p} isActive={pet?.id === p.id}
                onAvatar={() => setAvatarPet(p)} onEdit={() => setEditorPet(p)} />
            ))}
          </div>
        </>
      )}

      {/* ════ 我的帖子 子页（我的作品 / 我赞过）════ */}
      {subView === "posts" && (
        <>
          <SubBack title="我的帖子" onBack={() => setSubView(null)} />
          <div style={{ padding:"10px 14px 0", position:"sticky", top:0, background:C.bg, zIndex:2 }}>
            <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${C.border}` }}>
              {[{ key:"mine", label:"我的作品" }, { key:"liked", label:"我赞过" }].map((t) => {
                const on = activeTab === t.key;
                return (
                  <button key={t.key} onClick={() => setActiveTab(t.key)}
                    style={{ flex:1, padding:"10px 0", fontSize:13, fontWeight: on ? 700 : 600,
                             color: on ? C.text : C.sub, background:"transparent", border:"none",
                             cursor:"pointer", position:"relative" }}>
                    {t.label}
                    {on && <div style={{ position:"absolute", left:"50%", bottom:-1, transform:"translateX(-50%)",
                                         width:24, height:2.5, borderRadius:3, background:C.pri }} />}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ display:"flex", gap:8, padding:"12px 12px 90px" }}>
            {[leftCol, rightCol].map((col, ci) => (
              <div key={ci} style={{ flex:1, display:"flex", flexDirection:"column", gap:8, minWidth:0 }}>
                {col.map((p) => (
                  <MiniPostCard key={p.id} post={p}
                    onOpen={() => setDetailId(p.id)}
                    onDelete={activeTab === "mine" ? (e) => handleDeletePost(p, e) : null} />
                ))}
              </div>
            ))}
          </div>
          {loadingPosts && <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:30 }}>加载中…</div>}
          {!loadingPosts && posts.length === 0 && (
            <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:"40px 0 90px" }}>
              {activeTab === "mine" ? "还没有发布过作品，去社群发一条吧 ✏️" : "还没有赞过的帖子"}
            </div>
          )}
        </>
      )}

      {/* ════ 我的 主页（头部 + 统计 + 菜单）════ */}
      {subView === null && (
        <>
          {/* 顶部：头像（可点换头像）/ 用户名 / 设置 */}
          <div style={{ background:"white", padding:"52px 18px 18px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <div onClick={() => setAvatarPickerOpen(true)}
                style={{ position:"relative", cursor:"pointer", flexShrink:0 }}>
                <PetAvatar pet={headerPet} overrideUrl={user?.avatar_url} size={60} bg={C.tint} />
                <div style={{ position:"absolute", bottom:-2, right:-2, width:22, height:22,
                              borderRadius:"50%", background:C.pri, border:"2px solid white",
                              display:"flex", alignItems:"center", justifyContent:"center",
                              fontSize:11, color:"white" }}>✎</div>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:18, fontWeight:800, color:C.text }}>{user?.username || "未命名"}</div>
                <div style={{ fontSize:11, color:C.sub, marginTop:2 }}>手机号 {maskPhone(user?.phone)}</div>
              </div>
              <button onClick={() => setSettingsOpen(true)}
                style={{ width:38, height:38, borderRadius:"50%", background:C.tint, border:`1px solid ${C.border}`,
                         display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, cursor:"pointer" }}>⚙</button>
            </div>

            {/* 统计：获赞 ｜ 关注 ｜ 粉丝 */}
            <div style={{ display:"flex", marginTop:18 }}>
              {[
                { label:"获赞", val: stats.totalLikes,        onClick: null },
                { label:"关注", val: followCounts.following,  onClick: () => setFollowView("following") },
                { label:"粉丝", val: followCounts.followers,  onClick: () => setFollowView("followers") },
              ].map((s) => (
                <div key={s.label} onClick={s.onClick || undefined}
                  style={{ flex:1, textAlign:"center", cursor: s.onClick ? "pointer" : "default" }}>
                  <div style={{ fontSize:20, fontWeight:800, color:C.text }}>{s.val}</div>
                  <div style={{ fontSize:11, color:C.sub, marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 菜单列表 */}
          <div style={{ padding:"14px 14px 90px", display:"flex", flexDirection:"column", gap:10 }}>
            <MenuRow icon="📝" label="我的帖子" hint={`${stats.postCount} 篇`} onClick={() => setSubView("posts")} />
            <MenuRow icon="🐾" label="我的宠物" hint={`${pets.length} 只`} onClick={() => setSubView("pets")} />
            <MenuRow icon="⚙️" label="设置" onClick={() => setSettingsOpen(true)} />
          </div>
        </>
      )}

      {/* ── modals ─────────────────────────────────────── */}
      {editorPet !== undefined && (
        <PetEditor
          pet={editorPet}
          userId={user?.id}
          onClose={() => setEditorPet(undefined)}
          onSaved={onPetSaved}
          onDeleted={onPetDeletedFromEditor}
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

      {avatarPickerOpen && (
        <AvatarPickerModal
          user={user} pets={pets}
          onClose={() => setAvatarPickerOpen(false)}
          onSelect={handleSelectUserAvatar}
          toast={toast}
        />
      )}

      {toastMsg && <Toast msg={toastMsg.msg} level={toastMsg.level} />}

      {followView && (
        <FollowListView
          mode={followView} meId={user?.id}
          onBack={() => setFollowView(null)}
          onOpenProfile={(uid) => { setFollowView(null); onOpenProfile?.(uid); }}
        />
      )}
    </div>
  );
}

/* 子页返回头 */
function SubBack({ title, onBack, right }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"52px 16px 12px",
                  background:"white", borderBottom:`1px solid ${C.border}` }}>
      <button onClick={onBack}
        style={{ width:34, height:34, borderRadius:999, background:C.bg, border:`1px solid ${C.border}`,
                 cursor:"pointer", fontSize:18, color:C.text }}>‹</button>
      <div style={{ flex:1, fontSize:16, fontWeight:800, color:C.text }}>{title}</div>
      {right}
    </div>
  );
}

/* 主页菜单行 */
function MenuRow({ icon, label, hint, onClick }) {
  return (
    <button onClick={onClick}
      style={{ width:"100%", display:"flex", alignItems:"center", gap:12,
               background:"white", border:`1px solid ${C.border}`, borderRadius:16,
               padding:"15px 16px", cursor:"pointer", textAlign:"left",
               boxShadow:"0 1px 6px rgba(0,0,0,0.04)" }}>
      <span style={{ width:34, height:34, borderRadius:10, background:C.tint, flexShrink:0,
                     display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{icon}</span>
      <span style={{ flex:1, fontSize:15, fontWeight:700, color:C.text }}>{label}</span>
      {hint && <span style={{ fontSize:12, color:C.sub }}>{hint}</span>}
      <span style={{ fontSize:16, color:"#C5B9B0", marginLeft:6 }}>›</span>
    </button>
  );
}

/* ──────────────────────────────────────────────────────
   我的关注 / 我的粉丝 列表（浮层）
   ────────────────────────────────────────────────────── */
function FollowListView({ mode, meId, onBack, onOpenProfile }) {
  const isFollowing = mode === "following";
  const [list,    setList]    = useState([]);
  const [petCnt,  setPetCnt]  = useState({});
  const [iFollow, setIFollow] = useState(new Set()); // 我已关注的（用于粉丝页“回关”判断）
  const [loading, setLoading] = useState(true);
  const [q,       setQ]       = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const rows = isFollowing ? await listFollowing(meId) : await listFollowers(meId);
        if (!alive) return;
        setList(rows);
        const ids = rows.map((u) => u.id);
        const [cnt, fset] = await Promise.all([
          getPetCountByUsers(ids).catch(() => ({})),
          isFollowing ? Promise.resolve(new Set(ids)) : getFollowingSet(meId, ids).catch(() => new Set()),
        ]);
        if (!alive) return;
        setPetCnt(cnt); setIFollow(fset);
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [mode, meId]); // eslint-disable-line

  const handleBackFollow = async (uid, e) => {
    e.stopPropagation();
    if (iFollow.has(uid)) return;
    setIFollow((prev) => new Set(prev).add(uid));
    try { await followUser(meId, uid); } catch { setIFollow((prev) => { const n = new Set(prev); n.delete(uid); return n; }); }
  };

  const filtered = q.trim()
    ? list.filter((u) => (u.username || "").toLowerCase().includes(q.trim().toLowerCase()))
    : list;

  return (
    <div style={{ position:"absolute", inset:0, zIndex:120, background:C.bg, display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"52px 16px 12px",
                    background:"white", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
        <button onClick={onBack}
          style={{ width:34, height:34, borderRadius:999, background:C.bg, border:`1px solid ${C.border}`,
                   cursor:"pointer", fontSize:18, color:C.text }}>‹</button>
        <div style={{ fontSize:16, fontWeight:800, color:C.text }}>{isFollowing ? "我的关注" : "我的粉丝"}</div>
      </div>

      <div style={{ padding:"12px 14px 0", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, background:"white",
                      border:`1px solid ${C.border}`, borderRadius:22, padding:"8px 14px" }}>
          <span style={{ fontSize:14, color:C.sub }}>🔍</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索昵称"
            style={{ flex:1, border:"none", outline:"none", background:"transparent", fontSize:13, color:C.text, minWidth:0 }} />
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"12px 14px 24px" }}>
        {loading ? (
          <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:30 }}>加载中…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:"40px 0" }}>
            {q.trim() ? "没找到相关用户" : (isFollowing ? "还没有关注任何人" : "还没有粉丝")}
          </div>
        ) : filtered.map((u) => (
          <div key={u.id} onClick={() => onOpenProfile?.(u.id)}
            style={{ display:"flex", alignItems:"center", gap:12, background:"white",
                     border:`1px solid ${C.border}`, borderRadius:16, padding:"12px 14px",
                     marginBottom:8, cursor:"pointer" }}>
            <div style={{ width:44, height:44, borderRadius:"50%", background:C.tint, flexShrink:0,
                          overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
              {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : "🐾"}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:700, color:C.text,
                            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {u.username || "毛孩子家长"}
              </div>
              <div style={{ fontSize:11, color:C.sub, marginTop:2 }}>
                {petCnt[u.id] || 0} 只毛孩子{u.city ? ` · ${u.city}` : ""}
              </div>
            </div>
            {isFollowing ? (
              <span style={{ flexShrink:0, fontSize:12, fontWeight:600, color:C.sub,
                             background:C.bg, border:`1px solid ${C.border}`, borderRadius:999, padding:"5px 12px" }}>
                已关注
              </span>
            ) : iFollow.has(u.id) ? (
              <span style={{ flexShrink:0, fontSize:12, fontWeight:600, color:C.sub,
                             background:C.bg, border:`1px solid ${C.border}`, borderRadius:999, padding:"5px 12px" }}>
                已关注
              </span>
            ) : (
              <button onClick={(e) => handleBackFollow(u.id, e)}
                style={{ flexShrink:0, fontSize:12, fontWeight:700, color:"white",
                         background:C.pri, border:"none", borderRadius:999, padding:"6px 13px", cursor:"pointer" }}>
                回关
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────── */
function AvatarPickerModal({ user, pets, onClose, onSelect, toast }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const petAvatars = pets.filter((p) => p.ai_avatar_url || p.pet_avatar_thumb_url);
  const defaultEmoji = avatarForBreed(pets[0]?.breed, pets[0]?.pet_type);

  const handleUpload = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setUploading(true);
    try {
      const url = await uploadUserAvatar(f, user.id);
      await onSelect(url);
    } catch (err) {
      toast?.(err.message, "error");
    } finally { setUploading(false); }
  };

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,0.45)",
               display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, background:C.bg,
                    borderRadius:"22px 22px 0 0", padding:"18px 18px 28px",
                    maxHeight:"82vh", overflowY:"auto" }}>
        <div style={{ width:40, height:4, borderRadius:4, background:C.light, margin:"0 auto 16px" }}/>
        <div style={{ fontSize:17, fontWeight:800, color:C.text, marginBottom:4 }}>选择头像</div>
        <div style={{ fontSize:12, color:C.sub, marginBottom:18 }}>
          用作你在社群、帖子、群聊里的头像
        </div>

        {/* 已有虚拟宠物头像 */}
        {petAvatars.length > 0 && (
          <>
            <div style={{ fontSize:12, fontWeight:700, color:C.sub, marginBottom:10 }}>我的虚拟宠物形象</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
              {petAvatars.map((p) => {
                const url = p.pet_avatar_thumb_url || p.ai_avatar_url;
                const selected = user?.avatar_url === url;
                return (
                  <button key={p.id} onClick={() => onSelect(url)}
                    style={{ background:"transparent", border:"none", cursor:"pointer", padding:0,
                             display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                    <div style={{ width:60, height:60, borderRadius:"50%", overflow:"hidden",
                                  border: selected ? `3px solid ${C.pri}` : `2px solid ${C.border}`,
                                  background:C.tint }}>
                      <img src={url} alt={p.name}
                        style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
                    </div>
                    <span style={{ fontSize:10, color:C.sub, maxWidth:60, overflow:"hidden",
                                   textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* 上传图片 */}
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ width:"100%", padding:"13px 0", borderRadius:14, fontSize:14, fontWeight:700,
                   background:C.pri, color:"white", border:"none",
                   cursor: uploading ? "default" : "pointer", marginBottom:10 }}>
          {uploading ? "上传中…" : "📷 上传自定义图片"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display:"none" }}/>

        {/* 恢复默认 emoji */}
        <button onClick={() => onSelect(null)}
          style={{ width:"100%", padding:"13px 0", borderRadius:14, fontSize:14, fontWeight:600,
                   background:"white", color:C.text, border:`1px solid ${C.border}`, cursor:"pointer",
                   display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <span style={{ fontSize:20 }}>{defaultEmoji}</span> 使用默认头像
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────── */
function PetCard({ pet, isActive, onAvatar, onEdit }) {
  const age = formatPetAge(pet.birthday) || (pet.age != null ? `${pet.age}岁` : "");
  return (
    <div
      style={{ background:"white",
                border: isActive ? `2px solid ${C.pri}` : `1px solid ${C.border}`,
                borderRadius:14, padding:"12px 12px",
                boxShadow: isActive ? `0 0 0 3px ${C.tint}` : "0 1px 4px rgba(0,0,0,0.04)",
                position:"relative",
                transition:"border 0.2s, box-shadow 0.2s" }}>

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

      {/* 操作按钮行（阻止冒泡，避免触发卡片选择） */}
      <div onClick={(e) => e.stopPropagation()}
        style={{ display:"flex", gap:5, marginTop:8 }}>
        <button onClick={onAvatar}
          style={{ flex:1, fontSize:10, fontWeight:700, color:C.pri,
                   background:C.tint, border:`1px solid ${C.border}`,
                   borderRadius:8, padding:"5px 4px", cursor:"pointer" }}>
          {pet.ai_avatar_url ? "✨ 换头像" : "✨ 生成头像"}
        </button>
        <button onClick={onEdit}
          style={{ flex:1, fontSize:10, fontWeight:700, color:C.text,
                   background:"white", border:`1px solid ${C.border}`,
                   borderRadius:8, padding:"5px 4px", cursor:"pointer" }}>
          📝 编辑资料
        </button>
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
