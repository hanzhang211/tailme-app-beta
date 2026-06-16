"use client";

/**
 * components/social/DogFriendEdit.jsx
 *
 * 我的遛弯名片 —— 全屏编辑页（对应参考图右屏）。
 *  - 是否公开距离信息（开关；开启需定位授权）
 *  - 我的遛弯时间（多选）/ 宠物性格（多选）
 *  - 是否愿意和小狗玩 / 大狗玩（单选）
 *  - 自我介绍（≤100 字）
 *  - 保存：upsert dog_friend_profiles
 */

import { useState } from "react";
import {
  upsertDogProfile, setDogVisibility, getCurrentPosition,
  WALKING_TIMES, PERSONALITY_TAGS, SMALL_DOG_OPTIONS, BIG_DOG_OPTIONS,
} from "@/services/dogFriendService";
import PetAvatar from "@/components/PetAvatar";
import { isCatPet } from "@/services/breedAvatar";
import BackButton from "@/components/icons/BackButton";

const C = {
  pri:"#E68645", tint:"#F2E5DA", bg:"#EEE9E1", text:"#2A2520",
  sub:"#8A8178", light:"#D6D5D8", border:"#E3DCD0",
};
const TINT_ON = "#FBEEE2";

export default function DogFriendEdit({ user, pet, pets = [], profile, onClose, onSaved, toast }) {
  // 选哪只宠物遛弯：默认用名片里已存的那只；没有则单宠物自动选、多宠物需手选
  // （不再默认首页激活的那只）
  const [petId, setPetId]       = useState(
    () => profile?.pet_id || (pets.length === 1 ? pets[0].id : "")
  );
  const [visible, setVisible]   = useState(!!profile?.is_visible);
  const [times, setTimes]       = useState(() => new Set(profile?.walking_times || []));
  const [chars, setChars]       = useState(() => new Set(profile?.personalities || []));
  const [small, setSmall]       = useState(profile?.small_dog_preference || "");
  const [big, setBig]           = useState(profile?.big_dog_preference || "");
  const [intro, setIntro]       = useState(profile?.intro || "");
  const [saving, setSaving]     = useState(false);
  const [busyVis, setBusyVis]   = useState(false);

  const toggleSet = (setter) => (val) =>
    setter((prev) => { const n = new Set(prev); n.has(val) ? n.delete(val) : n.add(val); return n; });

  /* 公开开关：开启需定位授权（直接落库，长期保存）*/
  const toggleVisible = async () => {
    if (busyVis) return;
    setBusyVis(true);
    try {
      if (!visible) {
        let coords;
        try { coords = await getCurrentPosition(); }
        catch (e) {
          if (e.code === "denied") toast?.("需要允许定位后，才能显示附近狗狗的大致距离。", "warn");
          else toast?.("暂时无法获取位置，请稍后再试。", "error");
          return;
        }
        await setDogVisibility({ userId: user.id, visible: true, lat: coords.lat, lng: coords.lng });
        setVisible(true);
        toast?.("距离可见已开启 🐾", "success");
      } else {
        await setDogVisibility({ userId: user.id, visible: false });
        setVisible(false);
        toast?.("已关闭距离可见", "info");
      }
    } catch (e) {
      toast?.(e.message, "error");
    } finally {
      setBusyVis(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    if (pets.length > 0 && !petId) {
      toast?.("请选择一只一起遛弯的毛孩子", "warn");
      return;
    }
    setSaving(true);
    try {
      await upsertDogProfile({
        userId: user.id, petId: petId || null,
        walkingTimes: [...times], personalities: [...chars],
        smallPref: small || null, bigPref: big || null, intro: intro.trim(),
      });
      toast?.("名片已保存 🎉", "success");
      onSaved?.();
    } catch (e) {
      toast?.(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:300, background:C.bg, display:"flex", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, height:"100%", background:C.bg,
                    display:"flex", flexDirection:"column", animation:"dfe-in .22s ease-out" }}>

        {/* 顶部栏 */}
        <div style={{ padding:"max(env(safe-area-inset-top), 28px) 16px 12px", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          <BackButton onClick={onClose} />
          <div style={{ flex:1, textAlign:"center", fontSize:18, fontWeight:800, color:C.text }}>我的遛弯名片</div>
          <div style={{ width:40, flexShrink:0 }} />
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"4px 16px 110px" }}>
          {/* 安全说明卡 */}
          <div style={{ display:"flex", gap:10, background:"#FBEEE2", borderRadius:16, padding:"12px 14px",
                        marginBottom:16 }}>
            <span style={{ flexShrink:0, fontSize:16 }}>🛡️</span>
            <div style={{ fontSize:11.5, color:"#9A7B5C", lineHeight:1.6 }}>
              为保护安全，仅展示这次登录的大致距离，不公开具体位置。开启后会持续显示，直到你手动关闭。
            </div>
          </div>

          {/* 选择一起遛弯的毛孩子 */}
          {pets.length > 0 && (
            <Card>
              <SectionTitle title="选择一起遛弯的毛孩子" hint={pets.length > 1 ? "可切换" : undefined} />
              <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:2 }}>
                {pets.map((p) => {
                  const on = petId === p.id;
                  return (
                    <button key={p.id} onClick={() => setPetId(p.id)}
                      style={{ flexShrink:0, width:78, display:"flex", flexDirection:"column", alignItems:"center",
                               gap:6, background:"transparent", border:"none", cursor:"pointer" }}>
                      <span style={{ padding:3, borderRadius:"50%",
                                     border:`2.5px solid ${on ? C.pri : "transparent"}`,
                                     background: on ? TINT_ON : "transparent" }}>
                        <PetAvatar pet={p} size={54} bg={C.tint} fallbackImg={isCatPet(p) ? "/cat.png" : "/dog.png"} />
                      </span>
                      <span style={{ fontSize:12, fontWeight: on ? 700 : 500, color: on ? C.pri : C.text,
                                     maxWidth:74, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {p.name || "毛孩子"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* 是否公开距离信息 */}
          <Card>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14.5, fontWeight:800, color:C.text }}>是否公开距离信息</div>
                <div style={{ fontSize:11.5, color:C.sub, marginTop:3, lineHeight:1.55 }}>
                  开启后，其他用户可看到你与他们的大致距离
                </div>
              </div>
              <Toggle on={visible} busy={busyVis} onClick={toggleVisible} />
            </div>
          </Card>

          {/* 遛弯时间（多选）*/}
          <Card>
            <SectionTitle title="我的遛弯时间" hint="可多选" />
            <ChipGroup options={WALKING_TIMES} selected={times} onToggle={toggleSet(setTimes)} />
          </Card>

          {/* 性格（多选）*/}
          <Card>
            <SectionTitle title="宠物性格" hint="可多选" />
            <ChipGroup options={PERSONALITY_TAGS} selected={chars} onToggle={toggleSet(setChars)} />
          </Card>

          {/* 小狗偏好（单选）*/}
          <Card>
            <SectionTitle title="是否愿意和小狗玩" />
            <SingleGroup options={SMALL_DOG_OPTIONS} value={small} onPick={setSmall} />
          </Card>

          {/* 大狗偏好（单选）*/}
          <Card>
            <SectionTitle title="是否愿意和大狗玩" />
            <SingleGroup options={BIG_DOG_OPTIONS} value={big} onPick={setBig} />
          </Card>

          {/* 自我介绍 */}
          <Card>
            <SectionTitle title="自我介绍 / 补充说明" hint="选填" />
            <textarea value={intro} onChange={(e) => setIntro(e.target.value.slice(0, 100))}
              placeholder="花花性格很好，喜欢和人打招呼，也很乐意和朋友一起玩～ 希望找到合拍的小伙伴，一起快乐遛弯！"
              rows={4} maxLength={100}
              style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:12, padding:"10px 12px",
                       fontSize:13.5, color:C.text, background:C.bg, outline:"none", resize:"none",
                       fontFamily:"inherit", lineHeight:1.6, boxSizing:"border-box" }} />
            <div style={{ textAlign:"right", fontSize:11, color:C.sub, marginTop:4 }}>{intro.length}/100</div>
          </Card>
        </div>

        {/* 底部保存 */}
        <div style={{ position:"absolute", left:0, right:0, bottom:0, padding:"12px 16px 28px",
                      background:"linear-gradient(to top, rgba(238,233,225,1) 70%, rgba(238,233,225,0))" }}>
          <button onClick={handleSave} disabled={saving}
            style={{ width:"100%", padding:"15px 0", borderRadius:16, background:C.pri, color:"white",
                     fontSize:15, fontWeight:800, border:"none", cursor: saving ? "default" : "pointer",
                     boxShadow:"0 6px 16px rgba(230,134,69,0.35)", opacity: saving ? 0.7 : 1 }}>
            {saving ? "保存中…" : "保存设置"}
          </button>
        </div>
      </div>
      <style>{`@keyframes dfe-in { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform: translateY(0); } }`}</style>
    </div>
  );
}

function Card({ children }) {
  return (
    <div style={{ background:"white", borderRadius:18, padding:"16px", marginBottom:14,
                  boxShadow:"0 2px 10px rgba(0,0,0,0.04)" }}>
      {children}
    </div>
  );
}
function SectionTitle({ title, hint }) {
  return (
    <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:12 }}>
      <span style={{ fontSize:14.5, fontWeight:800, color:C.text }}>{title}</span>
      {hint && <span style={{ fontSize:11.5, color:C.sub }}>({hint})</span>}
    </div>
  );
}
function ChipGroup({ options, selected, onToggle }) {
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
      {options.map((opt) => {
        const on = selected.has(opt);
        return (
          <button key={opt} onClick={() => onToggle(opt)}
            style={{ padding:"8px 13px", borderRadius:12, fontSize:12.5, fontWeight: on ? 700 : 500,
                     background: on ? TINT_ON : "white", color: on ? C.pri : C.text,
                     border:`1.5px solid ${on ? C.pri : C.border}`, cursor:"pointer", transition:"all .12s",
                     display:"flex", alignItems:"center", gap:4 }}>
            {on && <span style={{ fontSize:11 }}>✓</span>}{opt}
          </button>
        );
      })}
    </div>
  );
}
function SingleGroup({ options, value, onPick }) {
  return (
    <div style={{ display:"flex", gap:8 }}>
      {options.map((opt) => {
        const on = value === opt;
        return (
          <button key={opt} onClick={() => onPick(on ? "" : opt)}
            style={{ flex:1, padding:"10px 0", borderRadius:12, fontSize:12.5, fontWeight: on ? 700 : 500,
                     background: on ? TINT_ON : "white", color: on ? C.pri : C.text,
                     border:`1.5px solid ${on ? C.pri : C.border}`, cursor:"pointer", transition:"all .12s",
                     display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
            {on && <span style={{ fontSize:11 }}>✓</span>}{opt}
          </button>
        );
      })}
    </div>
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
