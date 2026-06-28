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
import { getUserPets, deletePet, updateUserAvatar, getPetCountByUsers, setUsername, isUsernameTaken, updateUserBackground } from "@/services/supabaseService";
import { checkUsername } from "@/services/contentFilter";
import { uploadProfileBackground } from "@/services/petAvatarService";
import {
  listMyPosts, listLikedPosts, listFavoritePosts, getUserStats,
  deleteOwnContent,
  getFollowCounts, listFollowing, listFollowers, getFollowingSet, followUser,
} from "@/services/communityService";
import { formatPetAge, formatBirthday } from "@/services/petAge";
import { isCatPet } from "@/services/breedAvatar";

import PostDetail      from "@/components/community/PostDetail";
import PetAvatar       from "@/components/PetAvatar";
import PawLikeIcon     from "@/components/icons/PawLikeIcon";
import PetTrashIcon    from "@/components/icons/PetTrashIcon";
import BackButton      from "@/components/icons/BackButton";
import BgCropModal      from "./BgCropModal";
import ShopMall         from "@/components/shop/ShopMall";
import ShareCardCenter  from "@/components/share/ShareCardCenter";
import MyReviews        from "./MyReviews";
import VerifyBadge       from "./VerifyBadge";
import { toastColors }   from "@/services/toastTheme";
import PetEditor       from "./PetEditor";
import PetOnboarding   from "./PetOnboarding";
import SettingsModal   from "./SettingsModal";
import MemorialCenter  from "@/components/memorial/MemorialCenter";
import AvatarGenerator from "@/components/home/AvatarGenerator";
import { Star, Settings, PawPrint, Orbit } from "lucide-react";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", text:"#1A1006",
  sub:"#8A8074", light:"#D6D5D8", border:"#D6D5D8",
};

const PET_LIMIT = 4;

// 关注/粉丝列表内存缓存（`${meId}:${mode}` → {list, petCnt, iFollow}）：再次打开秒显
const followListCache = new Map();

function maskPhone(phone) {
  if (!phone) return "";
  const s = String(phone);
  if (s.length < 7) return s;
  return s.slice(0, 3) + "****" + s.slice(-4);
}

/* 统计区橙色小图标（纯装饰 SVG） */
function HeartStatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={C.pri} aria-hidden="true">
      <path d="M12 21s-7-4.4-9.5-9C1 9 2.6 5.5 6 5.5c2 0 3.2 1.2 4 2.4.8-1.2 2-2.4 4-2.4 3.4 0 5 3.5 3.5 6.5C19 16.6 12 21 12 21z"/>
    </svg>
  );
}
function UsersStatIcon() {
  return (
    <svg width="24" height="20" viewBox="0 0 24 24" fill={C.pri} aria-hidden="true">
      <circle cx="9" cy="8" r="3.4"/>
      <path d="M3 19c0-3.4 2.7-5.3 6-5.3s6 1.9 6 5.3z"/>
      <circle cx="17.5" cy="8.5" r="2.6" opacity=".7"/>
      <path d="M15 13.9c.8-.2 1.7-.3 2.5-.3 3 0 4.5 1.7 4.5 4.4h-3.2" opacity=".7"/>
    </svg>
  );
}
function FansStatIcon() {
  return (
    <svg width="24" height="20" viewBox="0 0 24 24" fill={C.pri} aria-hidden="true">
      <circle cx="9" cy="8" r="3.4"/>
      <path d="M3 19c0-3.4 2.7-5.3 6-5.3s6 1.9 6 5.3z"/>
      <rect x="15.6" y="11.4" width="6" height="1.8" rx="0.9"/>
      <rect x="17.7" y="9.3" width="1.8" height="6" rx="0.9"/>
    </svg>
  );
}
function ShopBagIcon({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5.5 8.5h13l-1 11.2a1.6 1.6 0 0 1-1.6 1.5H8.1a1.6 1.6 0 0 1-1.6-1.5L5.5 8.5z"
            fill={C.pri}/>
      <path d="M8.4 8.5V7.2a3.6 3.6 0 0 1 7.2 0v1.3" stroke={C.pri} strokeWidth="1.9"
            strokeLinecap="round" fill="none"/>
      <circle cx="9.4" cy="12" r="1" fill="#fff"/>
      <circle cx="14.6" cy="12" r="1" fill="#fff"/>
    </svg>
  );
}
/* 审核入口图标（剪贴板 + 勾）*/
function ReviewEntryIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="4" width="14" height="17" rx="2.6" stroke={C.pri} strokeWidth="1.8"/>
      <rect x="8.6" y="2.6" width="6.8" height="3.4" rx="1.4" fill={C.pri}/>
      <path d="M8.6 13.2l2.2 2.2 4.4-4.4" stroke={C.pri} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
/* 代遛入口图标（牵绳遛狗，置灰）*/
function WalkEntryIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="7" cy="5.5" r="2" stroke={C.sub} strokeWidth="1.7"/>
      <path d="M7 7.5v6m0 0l-2.5 6m2.5-6l2.5 3 2 3" stroke={C.sub} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.5 10.5l3-1" stroke={C.sub} strokeWidth="1.7" strokeLinecap="round"/>
      <path d="M15 14.5h3.2l1.3 3.5h-2.2a2 2 0 0 1-2-1.5l-.3-2z" stroke={C.sub} strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M18.2 14.5v-1.3l1.6-1" stroke={C.sub} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function ProfileTab({ user, pet, onSetActivePet, onPetUpdated, onPetDeleted, onUserUpdated, onOpenProfile, onOpenVerify, onLogout }) {
  const [pets,        setPets]        = useState([]);
  const [stats,       setStats]       = useState({ totalLikes: 0, postCount: 0, likedCount: 0 });
  const [myPosts,     setMyPosts]     = useState([]);
  const [likedPosts,  setLikedPosts]  = useState([]);
  const [favPosts,    setFavPosts]    = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [activeTab,   setActiveTab]   = useState("liked"); // liked | favorites
  const [detailId,    setDetailId]    = useState(null);
  const [editorPet,    setEditorPet]    = useState(undefined); // undefined=closed, obj=edit（仅编辑用）
  const [addOpen,      setAddOpen]      = useState(false);     // 新增宠物：走 PetOnboarding 引导流程
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [memorialOpen, setMemorialOpen] = useState(false);
  const [avatarPet,    setAvatarPet]    = useState(null); // 当前生成头像的宠物，null=关闭
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false); // 用户头像选择弹窗
  const [editNameOpen, setEditNameOpen] = useState(false);          // 编辑用户名弹窗
  const [bgUploading, setBgUploading]   = useState(false);          // 背景图上传中
  const [bgFile, setBgFile]   = useState(null);                     // 待裁剪的原图（打开裁剪弹窗）
  const [bgAspect, setBgAspect] = useState(1.95);                   // 裁剪比例 = 背景条 宽/高
  const [bgPreview, setBgPreview] = useState(null);                 // 裁剪后本地预览（秒显，无需刷新）
  const [contactOpen, setContactOpen]   = useState(false);          // 联系我们
  const [shopOpen, setShopOpen]         = useState(false);          // 宠物商城浮层
  const [shareCenterOpen, setShareCenterOpen] = useState(false);    // 分享卡片中心浮层
  const [reviewsOpen, setReviewsOpen]   = useState(false);          // 用户端审核浮层
  const bgFileRef = useRef();

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

  /* ── 切到"点赞 / 收藏"才拉对应列表 ─────────────────── */
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    (async () => {
      try {
        if (activeTab === "liked") {
          const liked = await listLikedPosts(user.id);
          if (alive) setLikedPosts(liked);
        } else if (activeTab === "favorites") {
          const favs = await listFavoritePosts(user.id);
          if (alive) setFavPosts(favs);
        }
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
    setAddOpen(true);
  };

  // 引导流程完成（含跳过 AI）：加入列表 + 通知 AppRoot 同步首页 carousel
  const onAddComplete = (saved) => {
    if (saved) {
      setPets((prev) => (prev.find((x) => x.id === saved.id)
        ? prev.map((x) => (x.id === saved.id ? saved : x))
        : [saved, ...prev]));
      onPetUpdated?.(saved);
      toast("毛孩子已加入 🐾", "success");
    }
    setAddOpen(false);
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

  /* ── 选图：先进入裁剪取景，比例与背景条一致 ─────── */
  const handleBackgroundPick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || bgUploading || !user?.id) return;
    // 背景条为 100%宽 × 200高（最大宽 430），按当前设备宽度算比例 → 所见即所得
    setBgAspect(Math.min(typeof window !== "undefined" ? window.innerWidth : 390, 430) / 200);
    setBgFile(f);
  };

  /* ── 裁剪确定：本地预览秒显 + 上传裁好的小图 + 即时更新 ── */
  const handleBackgroundCropped = async (blob) => {
    setBgFile(null);
    if (!blob || !user?.id) return;
    const previewUrl = URL.createObjectURL(blob);
    setBgPreview(previewUrl);          // 立刻显示，无需刷新
    setBgUploading(true);
    try {
      const file = new File([blob], `bg-${Date.now()}.jpg`, { type: "image/jpeg" });
      const url = await uploadProfileBackground(file, user.id);
      const updated = await updateUserBackground(user.id, url);
      onUserUpdated?.(updated);
      // 预载远程图，加载好再切换、避免闪烁
      await new Promise((res) => { const im = new Image(); im.onload = res; im.onerror = res; im.src = url; });
      setBgPreview(null);
      URL.revokeObjectURL(previewUrl);
      toast("背景已更新 ✨", "success");
    } catch (err) {
      setBgPreview(null);
      URL.revokeObjectURL(previewUrl);
      toast(err.message || "背景上传失败，请重试", "error");
    } finally {
      setBgUploading(false);
    }
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
  const posts = activeTab === "favorites" ? favPosts : likedPosts;
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

      {/* ════ 点赞&收藏 子页（点赞 / 收藏）════ */}
      {subView === "posts" && (
        <>
          <SubBack title="点赞&收藏" onBack={() => setSubView(null)} />
          <div style={{ padding:"10px 14px 0", position:"sticky", top:0, background:C.bg, zIndex:2 }}>
            <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${C.border}` }}>
              {[{ key:"liked", label:"点赞" }, { key:"favorites", label:"收藏" }].map((t) => {
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
                    onDelete={null} />
                ))}
              </div>
            ))}
          </div>
          {loadingPosts && <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:30 }}>加载中…</div>}
          {!loadingPosts && posts.length === 0 && (
            <div style={{ textAlign:"center", color:C.sub, fontSize:13, padding:"40px 0 90px" }}>
              {activeTab === "favorites" ? "还没有收藏的帖子，点开帖子右下角「收藏」试试 ⭐" : "还没有赞过的帖子"}
            </div>
          )}
        </>
      )}

      {/* ════ 我的 主页（头部 + 统计 + 菜单）════ */}
      {subView === null && (
        <>
          {/* 顶部背景图（可上传）+ 更换背景 / 编辑资料 */}
          <div style={{ position:"relative", width:"100%", height:200, overflow:"hidden" }}>
            {(bgPreview || user?.profile_background_url) ? (
              <img src={bgPreview || user.profile_background_url} alt=""
                style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
            ) : (
              <>
                <div style={{ position:"absolute", inset:0,
                              background:"linear-gradient(135deg, #F4E7DA 0%, #EEE6DB 55%, #EEE9E1 100%)" }} />
                <svg width="200" height="150" viewBox="0 0 200 150" aria-hidden="true"
                  style={{ position:"absolute", top:24, right:-10, opacity:0.45, pointerEvents:"none" }}>
                  <g fill="#E4D6C4">
                    <ellipse cx="120" cy="44" rx="13" ry="17"/>
                    <ellipse cx="148" cy="30" rx="13" ry="17"/>
                    <ellipse cx="176" cy="36" rx="12" ry="16"/>
                    <path d="M112 74 q-12 24 13 31 q26 7 47 -2 q18 -11 7 -28 q-13 -16 -35 -16 q-23 0 -32 15Z"/>
                  </g>
                  <g fill="#E8DBCB" opacity="0.7">
                    <ellipse cx="30" cy="104" rx="8" ry="10"/>
                    <ellipse cx="48" cy="96" rx="8" ry="10"/>
                    <ellipse cx="66" cy="100" rx="7" ry="9"/>
                    <path d="M26 120 q-7 14 8 18 q15 4 27 -1 q11 -6 4 -16 q-8 -9 -21 -9 q-13 0 -18 8Z"/>
                  </g>
                </svg>
              </>
            )}
            {/* 底部渐变遮罩 → 米白，保证衔接与文字可读 */}
            <div style={{ position:"absolute", inset:0, pointerEvents:"none",
                          background:"linear-gradient(to bottom, rgba(0,0,0,0.06) 0%, rgba(238,233,225,0) 30%, rgba(238,233,225,0.5) 80%, #EEE9E1 100%)" }} />

            {/* 右上角按钮：更换背景 / 编辑资料 */}
            <div style={{ position:"absolute", top:50, right:14, display:"flex", flexDirection:"column",
                          alignItems:"flex-end", gap:10, zIndex:2 }}>
              <button onClick={() => !bgUploading && bgFileRef.current?.click()} disabled={bgUploading}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:999,
                         background:"rgba(255,255,255,0.85)", color:C.text, border:"none",
                         backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)",
                         boxShadow:"0 2px 8px rgba(0,0,0,0.12)", fontSize:13, fontWeight:700,
                         cursor: bgUploading ? "default" : "pointer", whiteSpace:"nowrap" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="16" rx="3" stroke={C.text} strokeWidth="1.8"/>
                  <circle cx="8.5" cy="9.5" r="1.6" fill={C.text}/>
                  <path d="M5 18l5-5 4 4 2-2 3 3" stroke={C.text} strokeWidth="1.8" fill="none"
                        strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {bgUploading ? "上传中…" : "更换背景"}
              </button>
              <button onClick={() => setEditNameOpen(true)}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:999,
                         background:"rgba(255,255,255,0.85)", color:C.pri, border:"none",
                         backdropFilter:"blur(6px)", WebkitBackdropFilter:"blur(6px)",
                         boxShadow:"0 2px 8px rgba(0,0,0,0.12)", fontSize:13, fontWeight:700,
                         cursor:"pointer", whiteSpace:"nowrap" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M14.5 4.5l5 5L8 21l-5 1 1-5L14.5 4.5z" stroke={C.pri} strokeWidth="1.8" strokeLinejoin="round"/>
                  <path d="M13 6l5 5" stroke={C.pri} strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                编辑资料
              </button>
            </div>
            <input ref={bgFileRef} type="file" accept="image/*" onChange={handleBackgroundPick} style={{ display:"none" }} />
          </div>

          {/* 用户卡：头像叠在背景下方 */}
          <div style={{ position:"relative", zIndex:2, margin:"-50px 14px 0",
                        background:"white", borderRadius:24, padding:"14px 16px 18px",
                        boxShadow:"0 4px 20px rgba(0,0,0,0.06)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              {/* 头像（白圈，可点换头像）*/}
              <div onClick={() => setAvatarPickerOpen(true)}
                style={{ position:"relative", cursor:"pointer", flexShrink:0, marginTop:-46 }}>
                <div style={{ width:92, height:92, borderRadius:"50%", background:"white", padding:4,
                              boxSizing:"border-box", boxShadow:"0 4px 14px rgba(0,0,0,0.12)" }}>
                  <PetAvatar pet={headerPet} overrideUrl={user?.avatar_url} size={84} bg={C.tint} />
                </div>
                <div style={{ position:"absolute", bottom:4, right:4, width:24, height:24,
                              borderRadius:"50%", background:C.pri, border:"3px solid white",
                              display:"flex", alignItems:"center", justifyContent:"center",
                              fontSize:12, fontWeight:700, color:"white", lineHeight:1 }}>⌄</div>
              </div>

              {/* 用户名 + 用户号（已认证时昵称下显示小 badge）*/}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:22, fontWeight:800, color:C.text,
                              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {user?.username || "未命名"}
                </div>
                {user?.verification_status === "approved" ? (
                  <div style={{ marginTop:6 }}><VerifyBadge /></div>
                ) : (
                  <div style={{ fontSize:13, color:C.sub, marginTop:5 }}>
                    用户号 {user?.user_no || maskPhone(user?.phone)}
                  </div>
                )}
              </div>

              {/* 个人主页 */}
              <button onClick={() => onOpenProfile?.(user?.id)}
                style={{ flexShrink:0, display:"flex", alignItems:"center", gap:6, background:"white", color:C.pri,
                         border:"1px solid #F0C9A8", borderRadius:999, padding:"8px 13px",
                         fontSize:13, fontWeight:700, cursor:"pointer",
                         boxShadow:"0 2px 8px rgba(0,0,0,0.05)", whiteSpace:"nowrap" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="4" y="3" width="16" height="18" rx="2.5" stroke={C.pri} strokeWidth="1.8"/>
                  <path d="M8 8h8M8 12h8M8 16h5" stroke={C.pri} strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                个人主页 ›
              </button>
            </div>

            {/* 获赞 / 关注 / 粉丝（并入用户卡，浅灰竖线分隔）*/}
            <div style={{ display:"flex", marginTop:16, paddingTop:14, borderTop:`1px solid ${C.bg}` }}>
              {[
                { label:"获赞", val: stats.totalLikes,        icon:<PawLikeIcon filled color={C.pri} size={18} />, onClick: null },
                { label:"关注", val: followCounts.following,  icon:<UsersStatIcon />, onClick: () => setFollowView("following") },
                { label:"粉丝", val: followCounts.followers,  icon:<FansStatIcon />,  onClick: () => setFollowView("followers") },
              ].map((s, i) => (
                <div key={s.label} onClick={s.onClick || undefined}
                  style={{ flex:1, textAlign:"center", cursor: s.onClick ? "pointer" : "default",
                           borderLeft: i > 0 ? `1px solid ${C.border}` : "none" }}>
                  <div style={{ fontSize:21, fontWeight:800, color:C.text, lineHeight:1.1 }}>{s.val}</div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, marginTop:6 }}>
                    <span style={{ display:"flex", width:18, height:18, alignItems:"center", justifyContent:"center" }}>{s.icon}</span>
                    <span style={{ fontSize:12, color:C.sub }}>{s.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 认证状态区（approved 不显示卡片，只在昵称旁小 badge）*/}
          {user?.verification_status !== "approved" && (
            <div style={{ padding:"12px 14px 0" }}>
              {(() => {
                const vs = user?.verification_status || "unverified";
                if (vs === "pending") {
                  return (
                    <div style={{ background:"#FBEED6", borderRadius:20, padding:"15px 16px",
                                  display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14.5, fontWeight:800, color:"#8A5A2E" }}>认证审核中</div>
                        <div style={{ fontSize:12, color:"#A9824E", marginTop:4, lineHeight:1.5 }}>我们会尽快完成审核，请耐心等待</div>
                      </div>
                      <span style={{ flexShrink:0, display:"inline-flex", alignItems:"center", gap:5, padding:"7px 13px",
                                     borderRadius:999, background:"#fff", color:"#C0612A", fontSize:12, fontWeight:800 }}>🕒 审核中</span>
                    </div>
                  );
                }
                if (vs === "rejected") {
                  return (
                    <div style={{ background:"#FBDAD7", borderRadius:20, padding:"15px 16px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:14.5, fontWeight:800, color:"#C0392B" }}>认证未通过</div>
                          <div style={{ fontSize:12, color:"#A6453A", marginTop:4, lineHeight:1.5 }}>请查看原因并重新提交</div>
                        </div>
                        <button onClick={onOpenVerify}
                          style={{ flexShrink:0, padding:"9px 16px", borderRadius:999, border:"none",
                                   background:C.pri, color:"#fff", fontSize:13, fontWeight:800, cursor:"pointer" }}>重新认证</button>
                      </div>
                      {user?.verification_rejected_reason && (
                        <div style={{ marginTop:10, background:"#fff", borderRadius:12, padding:"9px 12px",
                                      fontSize:12.5, color:"#7A2218", lineHeight:1.6 }}>
                          驳回原因：{user.verification_rejected_reason}
                        </div>
                      )}
                    </div>
                  );
                }
                // unverified
                return (
                  <div style={{ background:"#F8E3CE", borderRadius:20, padding:"15px 16px",
                                display:"flex", alignItems:"center", gap:12 }}>
                    <span style={{ flexShrink:0, width:44, height:44, borderRadius:13, background:"#fff",
                                   display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2.6l7 2.6v6.1c0 4.4-3 8-7 10.1-4-2.1-7-5.7-7-10.1V5.2l7-2.6Z" fill={C.pri}/>
                        <path d="M8.6 12.1l2.3 2.3 4.4-4.5" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14.5, fontWeight:800, color:"#8A5A2E" }}>完成认证，开启更多功能</div>
                      <div style={{ fontSize:11.5, color:"#A9824E", marginTop:4, lineHeight:1.5 }}>认证后可使用遛弯、宠物友好地点上传、宠物警示上报等功能</div>
                    </div>
                    <button onClick={onOpenVerify}
                      style={{ flexShrink:0, padding:"9px 16px", borderRadius:999, border:"none",
                               background:C.pri, color:"#fff", fontSize:13, fontWeight:800, cursor:"pointer" }}>去认证</button>
                  </div>
                );
              })()}
            </div>
          )}

          {/* 功能入口：商城 / 审核 / 代遛 */}
          <div style={{ padding:"12px 14px 0" }}>
            <div style={{ display:"flex", background:"white", borderRadius:20,
                          boxShadow:"0 2px 14px rgba(0,0,0,0.05)" }}>
              {[
                { key:"shop",   label:"商城", icon:<ShopBagIcon size={34} />, disabled:true,
                  onClick: () => toast("商城功能即将开通") },
                { key:"review", label:"审核", icon:<ReviewEntryIcon size={34} />, onClick: () => setReviewsOpen(true) },
                { key:"walk",   label:"代遛", icon:<WalkEntryIcon size={34} />, disabled:true,
                  onClick: () => toast("代遛功能即将开通") },
              ].map((e, i) => (
                <button key={e.key} onClick={e.onClick}
                  style={{ flex:1, background:"none", border:"none", cursor:"pointer",
                           display:"flex", flexDirection:"column", alignItems:"center", gap:6, padding:"13px 0",
                           borderLeft: i > 0 ? `1px solid ${C.border}` : "none", opacity: e.disabled ? 0.55 : 1 }}>
                  <span style={{ width:44, height:44, borderRadius:13, background: e.disabled ? "#EEEAE2" : C.tint,
                                 display:"flex", alignItems:"center", justifyContent:"center" }}>{e.icon}</span>
                  <span style={{ fontSize:12.5, fontWeight:700, color: e.disabled ? C.sub : C.text, lineHeight:1 }}>{e.label}</span>
                  {e.disabled && <span style={{ fontSize:9.5, color:C.sub, lineHeight:1 }}>即将开通</span>}
                </button>
              ))}
            </div>
          </div>

          {/* 菜单列表 */}
          <div style={{ padding:"16px 14px 90px", display:"flex", flexDirection:"column", gap:12 }}>
            {/* 分享卡片中心入口（温暖醒目卡） */}
            <button onClick={() => toast("分享卡功能后期上线，敬请期待 🐾")}
              style={{ display:"flex", alignItems:"center", gap:10, width:"100%",
                       background:"linear-gradient(135deg,#FFFBF7,#FEF3EA)",
                       border:"1px solid #F4E6D8", borderRadius:20, padding:"10px 15px",
                       cursor:"pointer", textAlign:"left", boxShadow:"0 3px 12px rgba(230,134,69,0.07)" }}>
              <img src="/kapian.png" alt="" aria-hidden="true" decoding="async"
                   style={{ width:82, height:82, objectFit:"contain", flexShrink:0, display:"block",
                            margin:"-22px 0" }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:15, fontWeight:800, color:C.text }}>宠物心意卡</div>
                <div style={{ fontSize:11.5, color:"#9A7B5C", marginTop:2 }}>陪伴、喂食、纪念日都能一键生成</div>
              </div>
              <span style={{ flexShrink:0, display:"flex", alignItems:"center", gap:2,
                             color:C.pri, fontSize:11.5, fontWeight:700, whiteSpace:"nowrap" }}>
                后期上线
              </span>
            </button>
            <MenuRow icon={<Star size={26} color={C.pri} strokeWidth={2.2} />}
              label="点赞&收藏" onClick={() => setSubView("posts")} />
            <MenuRow icon={<PawPrint size={26} color={C.pri} strokeWidth={2.2} />}
              label="我的宠物" hint={`${pets.length} 只`} onClick={() => setSubView("pets")} />
            {/* 星球纪念模式 —— 梦幻高亮入口（紫渐变 + 边框，从普通菜单里突出） */}
            <button onClick={() => setMemorialOpen(true)}
              style={{ position:"relative", overflow:"hidden", width:"100%", display:"flex", alignItems:"center", gap:13,
                       padding:"15px 16px", borderRadius:22, cursor:"pointer", textAlign:"left",
                       background:"linear-gradient(120deg,#6B63BE 0%,#9A8DDA 55%,#B9A7F4 100%)",
                       border:"1.5px solid rgba(255,255,255,0.55)", boxShadow:"0 4px 16px rgba(120,100,216,0.26)",
                       WebkitTapHighlightColor:"transparent" }}>
              <span style={{ position:"absolute", top:10, right:44, fontSize:11, color:"#FFE89A", opacity:0.85, pointerEvents:"none" }}>✦</span>
              <span style={{ position:"absolute", bottom:11, right:74, fontSize:8, color:"#FFE89A", opacity:0.7, pointerEvents:"none" }}>✦</span>
              <span style={{ width:46, height:46, borderRadius:14, flexShrink:0, background:"rgba(255,255,255,0.18)",
                             border:"1px solid rgba(255,255,255,0.4)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Orbit size={26} color="#fff" strokeWidth={2.2} />
              </span>
              <span style={{ flex:1, minWidth:0 }}>
                <span style={{ display:"block", fontSize:16, fontWeight:800, color:"#fff" }}>星球纪念模式</span>
                <span style={{ display:"block", fontSize:12, color:"rgba(255,255,255,0.82)", marginTop:3, lineHeight:1.4 }}>当宠物去往爪爪星球后，保留回忆与陪伴</span>
              </span>
              <span style={{ fontSize:18, color:"rgba(255,255,255,0.9)", flexShrink:0 }}>›</span>
            </button>
            <MenuRow icon={<Settings size={26} color={C.pri} strokeWidth={2.2} />}
              label="设置" onClick={() => setSettingsOpen(true)} />
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

      {/* 宠物商城（全屏浮层） */}
      {shopOpen && <ShopMall onClose={() => setShopOpen(false)} toast={toast} />}

      {/* 分享卡片中心（全屏浮层） */}
      {shareCenterOpen && <ShareCardCenter user={user} pet={pet} onClose={() => setShareCenterOpen(false)} />}

      {/* 用户端审核（全屏浮层） */}
      {reviewsOpen && <MyReviews user={user} onClose={() => setReviewsOpen(false)} toast={toast} />}

      {/* 背景图裁剪取景 */}
      {bgFile && (
        <BgCropModal file={bgFile} aspect={bgAspect}
          onCancel={() => setBgFile(null)}
          onConfirm={handleBackgroundCropped} />
      )}

      {/* 新增宠物：全屏引导流程（与手机号验证后的流程一致） */}
      {addOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:300, background:C.bg, overflowY:"auto" }}>
          <PetOnboarding
            userId={user?.id}
            onComplete={onAddComplete}
            onClose={() => setAddOpen(false)}
          />
        </div>
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
          onOpenContact={() => { setSettingsOpen(false); setContactOpen(true); }}
          toast={toast}
        />
      )}

      {/* 星球纪念模式（全屏浮层） */}
      {memorialOpen && (
        <MemorialCenter pets={pets} user={user}
          onClose={() => setMemorialOpen(false)}
          onPetUpdated={(updated) => {
            setPets((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            onPetUpdated?.(updated);
          }}
          toast={toast} />
      )}

      {detailId && (
        <PostDetail
          postId={detailId} user={user} pet={pet}
          initialPost={[...likedPosts, ...favPosts].find((x) => x.id === detailId) || null}
          initialLiked={activeTab === "liked"}
          initialIsVideo={[...likedPosts, ...favPosts].find((x) => x.id === detailId)?.media_items?.[0]?.type === "video"}
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

      {editNameOpen && (
        <EditNameModal
          user={user}
          onClose={() => setEditNameOpen(false)}
          onSaved={(updated) => { onUserUpdated?.(updated); setEditNameOpen(false); }}
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

      {contactOpen && (
        <ContactView onBack={() => setContactOpen(false)} toast={toast} />
      )}
    </div>
  );
}

/* 子页返回头 */
function SubBack({ title, onBack, right }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"max(env(safe-area-inset-top), 28px) 16px 12px",
                  background:"white", borderBottom:`1px solid ${C.border}` }}>
      <BackButton onClick={onBack} size={34} />
      <div style={{ flex:1, fontSize:16, fontWeight:800, color:C.text }}>{title}</div>
      {right}
    </div>
  );
}

/* 主页菜单行 */
function MenuRow({ icon, label, sub, hint, onClick }) {
  return (
    <button onClick={onClick}
      style={{ width:"100%", display:"flex", alignItems:"center", gap:14,
               background:"white", border:"none", borderRadius:22,
               padding:"18px 16px", cursor:"pointer", textAlign:"left",
               boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
      <span style={{ width:46, height:46, borderRadius:14, background:C.tint, flexShrink:0,
                     display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>{icon}</span>
      <span style={{ flex:1, minWidth:0 }}>
        <span style={{ display:"block", fontSize:16, fontWeight:800, color:C.text }}>{label}</span>
        {sub && (
          <span style={{ display:"block", fontSize:12, color:C.sub, marginTop:3,
                         overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{sub}</span>
        )}
      </span>
      {hint && <span style={{ fontSize:13, color:C.sub, marginRight:4, flexShrink:0 }}>{hint}</span>}
      <span style={{ fontSize:18, color:"#C5B9B0", flexShrink:0 }}>›</span>
    </button>
  );
}

/* ──────────────────────────────────────────────────────
   联系我们（浮层）
   ────────────────────────────────────────────────────── */
function ContactView({ onBack, toast }) {
  const PHONE  = "13817104769";
  const WECHAT = "ARROWhehe";

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast?.(`已复制${label}`, "success");
    } catch {
      toast?.("复制失败，请手动复制", "error");
    }
  };

  const Row = ({ icon, label, value, onCopy, href }) => (
    <div style={{ display:"flex", alignItems:"center", gap:14, background:"white",
                  border:`1px solid ${C.border}`, borderRadius:18, padding:"16px 16px", marginBottom:12 }}>
      <span style={{ width:44, height:44, borderRadius:14, background:C.tint, flexShrink:0,
                     display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{icon}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, color:C.sub }}>{label}</div>
        <div style={{ fontSize:16, fontWeight:800, color:C.text, marginTop:2,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{value}</div>
      </div>
      {href && (
        <a href={href}
          style={{ flexShrink:0, fontSize:13, fontWeight:700, color:"white", background:C.pri,
                   borderRadius:999, padding:"7px 14px", textDecoration:"none" }}>拨打</a>
      )}
      <button onClick={onCopy}
        style={{ flexShrink:0, fontSize:13, fontWeight:700, color:C.pri, background:"white",
                 border:`1px solid #F0C9A8`, borderRadius:999, padding:"7px 14px", cursor:"pointer" }}>复制</button>
    </div>
  );

  return (
    <div style={{ position:"absolute", inset:0, zIndex:120, background:C.bg, display:"flex", flexDirection:"column" }}>
      {/* 顶栏 */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"max(env(safe-area-inset-top), 28px) 16px 12px",
                    background:"white", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
        <BackButton onClick={onBack} size={34} />
        <div style={{ fontSize:16, fontWeight:800, color:C.text }}>联系我们</div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"18px 14px 40px" }}>
        <div style={{ fontSize:13, color:C.sub, lineHeight:1.7, marginBottom:16 }}>
          有任何问题、建议或合作意向，欢迎随时联系我们 🐾
        </div>
        <Row icon="📱" label="手机号" value={PHONE}
          onCopy={() => copy(PHONE, "手机号")} href={`tel:${PHONE}`} />
        <Row icon="💬" label="微信号" value={WECHAT}
          onCopy={() => copy(WECHAT, "微信号")} />
        <div style={{ fontSize:11, color:C.sub, textAlign:"center", marginTop:8, lineHeight:1.7 }}>
          添加微信请备注「爪爪日记」
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   我的关注 / 我的粉丝 列表（浮层）
   ────────────────────────────────────────────────────── */
function FollowListView({ mode, meId, onBack, onOpenProfile }) {
  const isFollowing = mode === "following";
  const cacheKey = `${meId}:${mode}`;
  const cached = followListCache.get(cacheKey);
  const [list,    setList]    = useState(cached?.list || []);
  const [petCnt,  setPetCnt]  = useState(cached?.petCnt || {});
  const [iFollow, setIFollow] = useState(cached?.iFollow || new Set()); // 我已关注的（用于粉丝页“回关”判断）
  const [loading, setLoading] = useState(!cached);
  const [q,       setQ]       = useState("");

  useEffect(() => {
    let alive = true;
    if (!followListCache.has(cacheKey)) setLoading(true); // 有缓存则不转圈，后台静默刷新
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
        followListCache.set(cacheKey, { list: rows, petCnt: cnt, iFollow: fset });
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
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"max(env(safe-area-inset-top), 28px) 16px 12px",
                    background:"white", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
        <BackButton onClick={onBack} size={34} />
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

/* ──────────────────────────────────────────────────────
   编辑用户名（点头部铅笔进入）
   ────────────────────────────────────────────────────── */
function EditNameModal({ user, onClose, onSaved, toast }) {
  const [name, setName]     = useState(user?.username || "");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  const handleSave = async () => {
    const trimmed = name.trim();
    const current = user?.username || "";
    if (trimmed === current) { onClose(); return; }
    const check = checkUsername(trimmed);
    if (!check.ok) { setError(check.reason); return; }
    setSaving(true); setError(null);
    try {
      // 仅当不是自己当前名（忽略大小写）才查重，避免误判
      if (trimmed.toLowerCase() !== current.toLowerCase()) {
        const taken = await isUsernameTaken(trimmed);
        if (taken) { setError("该用户名已被占用，请换一个"); setSaving(false); return; }
      }
      const updated = await setUsername(user.id, trimmed);
      toast?.("用户名已更新 ✨", "success");
      onSaved(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
      style={{ position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,0.45)",
               display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, background:C.bg, borderRadius:"22px 22px 0 0",
                    padding:"18px 18px 28px" }}>
        <div style={{ width:40, height:4, borderRadius:4, background:C.light, margin:"0 auto 16px" }} />
        <div style={{ fontSize:17, fontWeight:800, color:C.text, marginBottom:4 }}>修改用户名</div>
        <div style={{ fontSize:12, color:C.sub, marginBottom:18 }}>
          这是你在社群里展示的名字 · 2–20 字 · 不能重复
        </div>

        <div style={{ fontSize:12, fontWeight:600, color:C.sub, marginBottom:8 }}>用户名</div>
        <input
          value={name}
          onChange={(e) => { setName(e.target.value); setError(null); }}
          onKeyDown={(e) => e.key === "Enter" && !saving && handleSave()}
          maxLength={20}
          placeholder="输入新的用户名"
          autoFocus
          style={{ width:"100%", borderRadius:14, padding:"12px 14px", fontSize:14, boxSizing:"border-box",
                   border:`1.5px solid ${C.border}`, background:"white", color:C.text, outline:"none" }} />

        {user?.user_no && (
          <div style={{ fontSize:11, color:C.sub, marginTop:10 }}>
            用户号 {user.user_no}（不可修改）
          </div>
        )}

        {error && (
          <div style={{ marginTop:12, padding:"10px 14px", background:"#FFF0F0", borderRadius:12,
                        fontSize:12, color:"#D94040", lineHeight:1.5 }}>❌ {error}</div>
        )}

        <div style={{ display:"flex", gap:10, marginTop:18 }}>
          <button onClick={onClose} disabled={saving}
            style={{ flex:1, padding:"13px 0", borderRadius:14, fontSize:14, fontWeight:600,
                     background:"white", color:C.text, border:`1px solid ${C.border}`,
                     cursor: saving ? "default" : "pointer" }}>
            取消
          </button>
          <button onClick={handleSave} disabled={saving || name.trim().length < 2}
            style={{ flex:2, padding:"13px 0", borderRadius:14, fontSize:14, fontWeight:700, border:"none",
                     background: !saving && name.trim().length >= 2 ? C.pri : C.tint,
                     color: !saving && name.trim().length >= 2 ? "white" : C.sub,
                     cursor: !saving && name.trim().length >= 2 ? "pointer" : "default" }}>
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────── */
function AvatarPickerModal({ user, pets, onClose, onSelect, toast }) {
  const petAvatars = pets.filter((p) => p.ai_avatar_url || p.pet_avatar_thumb_url);
  // 通用「可爱形象」头像：猫 / 狗占位图，代替原来的默认 emoji 头像（用户可自选）
  const CUTE_AVATARS = [
    { url: "/cat.png", label: "猫咪" },
    { url: "/dog.png", label: "狗狗" },
  ];

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

        {/* 无 AI 形象时的引导（头像只能用 AI 生成的虚拟宠物形象）*/}
        {petAvatars.length === 0 && (
          <div style={{ background:"white", borderRadius:14, padding:"16px 14px", marginBottom:10,
                        textAlign:"center", fontSize:13, color:C.sub, lineHeight:1.6, border:`1px solid ${C.border}` }}>
            可以先用下面的「可爱形象」<br/>或到首页为宠物生成专属 AI 形象，也能设为头像 🐾
          </div>
        )}

        {/* 可爱形象：猫 / 狗占位图（代替原默认头像，用户可自选） */}
        <div style={{ fontSize:12, fontWeight:700, color:C.sub, marginBottom:10 }}>可爱形象</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          {CUTE_AVATARS.map((it) => {
            const selected = user?.avatar_url === it.url;
            return (
              <button key={it.url} onClick={() => onSelect(it.url)}
                style={{ background:"transparent", border:"none", cursor:"pointer", padding:0,
                         display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div style={{ width:60, height:60, borderRadius:"50%", overflow:"hidden",
                              border: selected ? `3px solid ${C.pri}` : `2px solid ${C.border}`,
                              background:C.tint }}>
                  <img src={it.url} alt={it.label}
                    style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
                </div>
                <span style={{ fontSize:10, color:C.sub }}>{it.label}</span>
              </button>
            );
          })}
        </div>
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
        <PetAvatar pet={pet} size={30} bg={C.tint}
          fallbackImg={isCatPet(pet) ? "/cat.png" : "/dog.png"} />
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
        <span style={{ display:"flex", alignItems:"center", gap:4 }}>
          <PawLikeIcon size={17} /> {post.like_count || 0}
        </span>
        <div style={{ flex:1 }} />
        {onDelete && (
          <button onClick={onDelete}
            style={{ background:"transparent", border:"none", cursor:"pointer",
                     color:C.sub, padding:"2px 4px", display:"flex", alignItems:"center" }}>
            <PetTrashIcon size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────── */
function Toast({ msg, level }) {
  const s = toastColors(level);
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
