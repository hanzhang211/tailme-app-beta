"use client";

/**
 * HealthPage.jsx — 宠物健康（用药集成进疾病记录）
 * 删除单独的「用药提醒」section，用药作为疾病记录的子数据
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  updatePetHealth,
  listDiseaseRecords, addDiseaseRecord, deleteDiseaseRecord, updateDiseaseRecord,
  isMedDoneToday, setMedDoneToday,
} from "@/services/petHealthService";
import { HealthIcon } from "@/components/icons/HomeModuleIcons";
import { toastColors } from "@/services/toastTheme";
import PetTrashIcon from "@/components/icons/PetTrashIcon";
import PetHealthPlaceholderIcon from "@/components/icons/PetHealthPlaceholderIcon";
import {
  ChevronLeft, ChevronRight, ChevronDown, Dog, Cat, Pill, Bell, Clock,
  CircleCheck, ClipboardList, HeartPulse, Syringe, ShieldCheck,
  Stethoscope, Calendar, Check, Plus, Ellipsis, Pencil, MapPin, Bug,
  PawPrint, X,
} from "lucide-react";
import { avatarForBreed } from "@/services/breedAvatar";
import { formatPetAge } from "@/services/petAge";
import { listVaccineRecords, buildVaccineOverview } from "@/services/petVaccineService";
import { listDewormRecords, buildDewormOverview } from "@/services/petDewormService";
import { regionRisk } from "@/services/petHealthPlan";
import VaccineRecordPage from "@/components/home/VaccineRecordPage";
import DewormingRecordPage from "@/components/home/DewormingRecordPage";
import { listCheckupRecords } from "@/services/petCheckupService";
import CheckupRecordForm from "@/components/home/CheckupRecordForm";
import CheckupDetail from "@/components/home/CheckupDetail";

const BG    = "#ECEEE8";
const PRI   = "#E68645";
const GREEN = "#5FA766";
const TEXT  = "#1A1006";
const SUB   = "#7A8275";

const CARD = {
  background: "rgba(255,255,255,0.62)",
  borderRadius: 24,
  boxShadow: "0 6px 20px rgba(0,0,0,0.05)",
  border: "1px solid rgba(255,255,255,0.65)",
};

const fmtFull  = (d) => d ? String(d).replace(/-/g, "/") : "";
const fmtShort = (d) => { if (!d) return ""; const [,m,day] = String(d).split("-"); return `${+m}月${+day}日`; };
const fmtTime  = (t) => t ? String(t).slice(0, 5) : "";
const isToday  = (d) => d === new Date().toISOString().slice(0, 10);

const DISEASE_STATUS = {
  treating:  { label:"治疗中", bg:"rgba(230,134,69,0.12)", color:PRI },
  recovered: { label:"已康复", bg:"rgba(95,167,102,0.12)", color:GREEN },
};

// 健康档案分类色（蓝/紫仅用于此处分类 tag，不改全局主色）
const CAT_META = {
  vaccine:    { label:"疫苗", color:"#4FA85D", bg:"#EAF6EA", Icon: Syringe },
  deworm:     { label:"驱虫", color:"#4FA85D", bg:"#EAF6EA", Icon: Bug },
  diagnosis:  { label:"诊断", color:"#8B6FD6", bg:"#F1EDFF", Icon: HeartPulse },
  medication: { label:"用药", color:"#E68645", bg:"#FFF1E8", Icon: Pill },
  recovery:   { label:"康复", color:"#4FA85D", bg:"#EAF6EA", Icon: CircleCheck },
  checkup:    { label:"体检", color:"#4A90E2", bg:"#EAF3FF", Icon: Stethoscope },
  other:      { label:"其他", color:"#777777", bg:"#F3F3F3", Icon: ClipboardList },
};

/* ══════════════════════════════════════════════ */
// 健康内存缓存（petId → {records, diseases}）：再次打开秒显，后台静默刷新
const healthCache = {};
export async function prefetchHealth(petId, userId) {
  if (!petId || healthCache[petId]) return;
  try {
    const [chk, dis, vax, dw] = await Promise.all([
      listCheckupRecords(petId).catch(() => []),
      listDiseaseRecords(null, userId).catch(() => []),
      listVaccineRecords(petId).catch(() => []),
      listDewormRecords(petId).catch(() => []),
    ]);
    healthCache[petId] = { checkups: chk, diseases: dis, vax, dw };
  } catch {}
}

export default function HealthPage({ user, pet: petProp, pets = [], onPetUpdate, onBack, onSwitchPet }) {
  // view：overview 总览(含3 tab) / vaccine 疫苗记录 / deworm 驱虫记录
  const [view, setView]   = useState("overview");
  // 总览内部 3 tab：overview 健康概览 / care 生病护理 / archive 健康档案
  const [healthTab, setHealthTab] = useState("overview");
  // 顶部「狗狗 / 猫咪」切换 = 在当前用户的宠物间切换（默认当前 activePet）
  const [selId, setSelId] = useState(petProp?.id || null);
  const [petMenuOpen, setPetMenuOpen] = useState(false);
  const pet = pets.find((p) => p.id === selId) || petProp;

  // 右上加号 → 底部「添加记录」action sheet
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  // 详情页自动打开添加弹窗（加号里点疫苗/驱虫时用）
  const [vaxAutoAdd,    setVaxAutoAdd]    = useState(false);
  const [dewormAutoAdd, setDewormAutoAdd] = useState(false);
  // 打开疾病弹窗时的初始状态（生病/用药/康复 三个入口预设）
  const [diseaseInit,   setDiseaseInit]   = useState("sick");
  // 健康档案分类筛选
  const [archiveFilter,   setArchiveFilter]   = useState("all");
  const [archiveMenuOpen, setArchiveMenuOpen] = useState(false);

  const h0 = pet?.id ? healthCache[pet.id] : null;
  const [checkups,   setCheckups]   = useState(h0?.checkups || []);
  const [diseases,   setDiseases]   = useState(h0?.diseases || []);
  const [vaxRecords, setVaxRecords]       = useState(h0?.vax || []);
  const [dewormRecords, setDewormRecords] = useState(h0?.dw || []);
  const [loading,    setLoading]    = useState(!h0);
  const [err,        setErr]        = useState(null);

  const [neutered,   setNeutered]   = useState(!!pet?.neutered);
  const [savingFlag, setSavingFlag] = useState(false);

  const [addDiseaseOpen, setAddDiseaseOpen] = useState(false);
  const [viewDisease,    setViewDisease]    = useState(null);
  const [menuOpenId,     setMenuOpenId]     = useState(null);  // 更多菜单
  const [editMedDisease, setEditMedDisease] = useState(null);  // 编辑用药
  // 体检：表单弹层 / 详情浮层 / 编辑中的记录
  const [checkupFormOpen, setCheckupFormOpen] = useState(false);
  const [editingCheckup,  setEditingCheckup]  = useState(null);
  const [viewCheckup,     setViewCheckup]     = useState(null);

  // toast
  const [toast,     setToast]     = useState(null);
  const toastTimer  = useRef(null);
  const showToast = (msg, type = "success") => {
    clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), type === "error" ? 4000 : 2500);
  };

  const reload = async () => {
    if (!pet?.id) { setLoading(false); return; }
    const cache = healthCache[pet.id];
    if (cache) {
      // 切换宠物时先用缓存秒显，再后台静默刷新
      setCheckups(cache.checkups || []); setDiseases(cache.diseases || []);
      setVaxRecords(cache.vax || []);    setDewormRecords(cache.dw || []);
    } else {
      setLoading(true);
    }
    setErr(null);
    try {
      const [chk, dis, vax, dw] = await Promise.all([
        listCheckupRecords(pet.id).catch(() => []),
        listDiseaseRecords(null, user?.id).catch(() => []),
        listVaccineRecords(pet.id).catch(() => []),
        listDewormRecords(pet.id).catch(() => []),
      ]);
      setCheckups(chk); setDiseases(dis); setVaxRecords(vax); setDewormRecords(dw);
      healthCache[pet.id] = { checkups: chk, diseases: dis, vax, dw };
    } catch (e) { if (!healthCache[pet.id]) setErr(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { reload(); }, [pet?.id]); // eslint-disable-line
  useEffect(() => {
    setNeutered(!!pet?.neutered);
  }, [pet?.neutered]);

  const toggleFlag = async (key, next) => {
    if (!pet?.id || !user?.id) return;
    if (key === "neutered") setNeutered(next);
    setSavingFlag(true);
    try {
      await updatePetHealth(pet.id, user.id, { [key]: next });
      onPetUpdate?.({ ...pet, [key]: next });
    } catch (e) {
      if (key === "neutered") setNeutered(!next);
      alert(e.message);
    } finally { setSavingFlag(false); }
  };

  const handleDeleteDisease = async (d) => {
    if (!confirm("删除这条疾病记录？")) return;
    try { await deleteDiseaseRecord(d.id, user.id); reload(); }
    catch (e) { alert(e.message); }
  };

  // 今日已用药（localStorage，每日重置）。medDoneTick 仅用于触发重渲染
  const [medDoneTick, setMedDoneTick] = useState(0);
  const toggleMedDone = (d) => {
    setMedDoneToday(d.id, !isMedDoneToday(d.id));
    setMedDoneTick((n) => n + 1);
  };

  const markRecovered = async (d) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const updated = await updateDiseaseRecord(d.id, user.id, {
        status: "recovered", recovery_date: today,
      });
      setDiseases((prev) => prev.map((x) => x.id === d.id ? { ...x, ...updated } : x));
      showToast(`${d.disease_name} 已康复，已移入健康记录 ✨`);
    } catch (e) { showToast(e.message, "error"); }
  };

  // 合并时间线
  const timeline = useMemo(() => {
    const items = [
      ...vaxRecords.filter(r => r.dose_date).map(r => ({
        id:"vax_"+r.id, date:r.dose_date, cat:"vaccine",
        title:`${r.vaccine_name}${r.dose_no ? `：第${r.dose_no}针` : ""}`,
        sub: r.note || "",
      })),
      ...dewormRecords.map(r => ({
        id:"dw_"+r.id, date:r.done_date, cat:"deworm",
        title: r.deworm_type === "internal" ? "体内驱虫" : "体外驱虫",
        sub: r.product_name ? (r.product_desc ? `${r.product_name}（${r.product_desc}）` : r.product_name) : (r.product_desc || ""),
      })),
      ...checkups.map(c => ({
        id:"chk_"+c.id, date:c.checkup_date, cat:"checkup",
        title: "体检" + (c.checkup_items ? `：${c.checkup_items}` : (c.clinic_name ? `：${c.clinic_name}` : "")),
        sub: c.clinic_name || c.notes || "",
        checkup: c,
      })),
      ...diseases.map(d => ({
        id:"diag_"+d.id, date:d.diagnosis_date, cat:"diagnosis",
        title: `诊断：${d.disease_name}`, sub: d.symptoms || "", disease: d,
      })),
      ...diseases.filter(d => d.medicine_name).map(d => ({
        id:d.id+"_med", date:d.medicine_start_date || d.diagnosis_date, cat:"medication",
        title: `开始用药：${d.medicine_name}`,
        sub: [d.medicine_dosage, d.medicine_frequency].filter(Boolean).join("，"), disease: d,
      })),
      ...diseases.filter(d => d.status === "recovered" && d.recovery_date).map(d => ({
        id:d.id+"_rec", date:d.recovery_date, cat:"recovery",
        title: `${d.disease_name} 康复`, sub: "康复情况良好", disease: d,
      })),
    ];
    return items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [checkups, diseases, vaxRecords, dewormRecords]);

  // 疫苗 / 驱虫 / 地区虫害 概览（驱动总览页提醒标签 + 基础健康行）
  const vaxOv    = useMemo(() => buildVaccineOverview(vaxRecords, pet?.pet_type), [vaxRecords, pet?.pet_type]);
  const dewormOv = useMemo(() => buildDewormOverview(dewormRecords), [dewormRecords]);
  const risk     = useMemo(() => regionRisk(user?.city, pet?.pet_type), [user?.city, pet?.pet_type]);

  // 当前状态卡的提醒标签（最多 2 个，复现设计图：狗=狂犬待补+驱虫N天 / 猫=猫三联待补+驱虫N天）
  const reminders = useMemo(() => {
    const out = [];
    if (vaxOv.core.items.some((it) => it.status.key === "pending")) out.push(`${vaxOv.core.shortName}待补`);
    if (vaxOv.rabies.status.key === "pending") out.push("狂犬待补");
    const dd = dewormOv.nextDays;
    if (dd == null) {
      if (dewormOv.internal.length === 0 && dewormOv.external.length === 0) out.push("驱虫待补");
    } else if (dd < 0) out.push("驱虫待补");
    else out.push(`驱虫 ${dd}天后到期`);
    return out.slice(0, 2);
  }, [vaxOv, dewormOv]);

  // 子页面路由（疫苗 / 驱虫记录页）；返回时刷新总览数据，保持进度/日期同步
  if (view === "vaccine") {
    return <VaccineRecordPage pet={pet} user={user} autoAdd={vaxAutoAdd}
      onBack={() => { setView("overview"); setVaxAutoAdd(false); reload(); }} />;
  }
  if (view === "deworm") {
    return <DewormingRecordPage pet={pet} user={user} autoAdd={dewormAutoAdd}
      onBack={() => { setView("overview"); setDewormAutoAdd(false); reload(); }} />;
  }
  // 体检记录详情（浮层）+ 其上的编辑表单
  if (viewCheckup) {
    return (
      <>
        <CheckupDetail record={viewCheckup} user={user}
          onBack={() => setViewCheckup(null)}
          onEdit={() => { setEditingCheckup(viewCheckup); setCheckupFormOpen(true); }}
          onDeleted={() => { setViewCheckup(null); reload(); showToast("体检记录已删除"); }}
          onError={(m) => showToast(m, "error")} />
        {checkupFormOpen && (
          <CheckupRecordForm pet={pet} user={user} initial={editingCheckup}
            onClose={() => setCheckupFormOpen(false)}
            onSaved={(saved) => { setCheckupFormOpen(false); if (saved) setViewCheckup(saved); reload(); showToast("体检记录已保存 ✨"); }}
            onError={(m) => showToast(m, "error")} />
        )}
      </>
    );
  }

  // 健康档案：彩色分类时间线（数据来自合并 timeline）
  const FILTER_OPTS = [
    { k:"all", l:"全部类型" }, { k:"vaccine", l:"疫苗" }, { k:"deworm", l:"驱虫" },
    { k:"diagnosis", l:"诊断" }, { k:"medication", l:"用药" }, { k:"recovery", l:"康复" },
    { k:"checkup", l:"体检" }, { k:"other", l:"其他" },
  ];
  const renderArchive = () => {
    const curLabel = FILTER_OPTS.find((o) => o.k === archiveFilter)?.l || "全部类型";
    const filtered = archiveFilter === "all" ? timeline : timeline.filter((t) => t.cat === archiveFilter);
    return (
    <>
      {/* 分类筛选（可用下拉）*/}
      <div style={{ position:"relative", padding:"0 2px" }}>
        <button onClick={() => setArchiveMenuOpen((o) => !o)}
          style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"7px 14px",
                   borderRadius:999, background:"rgba(95,167,102,0.12)", color:GREEN,
                   border:"none", cursor:"pointer", fontSize:13, fontWeight:700 }}>
          {curLabel} <ChevronDown size={14} strokeWidth={2.4}
            style={{ transform: archiveMenuOpen ? "rotate(180deg)" : "none", transition:"transform .2s" }}/>
        </button>
        {archiveMenuOpen && (
          <>
            <div onClick={() => setArchiveMenuOpen(false)} style={{ position:"fixed", inset:0, zIndex:290 }}/>
            <div style={{ position:"absolute", top:42, left:2, zIndex:300, background:"#fff",
                          borderRadius:14, padding:"6px 0", minWidth:140,
                          boxShadow:"0 10px 28px rgba(0,0,0,0.16)" }}>
              {FILTER_OPTS.map((o) => {
                const on = archiveFilter === o.k;
                return (
                  <button key={o.k} onClick={() => { setArchiveFilter(o.k); setArchiveMenuOpen(false); }}
                    style={{ width:"100%", textAlign:"left", padding:"9px 16px", border:"none",
                             cursor:"pointer", background: on ? "rgba(95,167,102,0.08)" : "transparent",
                             fontSize:13, fontWeight: on ? 700 : 500, color: on ? GREEN : TEXT }}>
                    {o.l}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div style={{ ...CARD, padding:"6px 18px" }}>
        {loading && timeline.length === 0 ? (
          <div style={{ textAlign:"center", color:SUB, padding:18, fontSize:13 }}>加载中…</div>
        ) : filtered.length === 0 ? (
          <EmptyCard icon={<ClipboardList size={32} color="rgba(95,167,102,0.4)" strokeWidth={1.5}/>}
            text={archiveFilter === "all" ? "还没有健康记录" : "该分类暂无记录"}
            sub={archiveFilter === "all" ? "点击右上角 + 添加记录" : "换个分类看看"}/>
        ) : filtered.map((item, i) => {
          const meta = CAT_META[item.cat] || CAT_META.other;
          const Icon = meta.Icon;
          const clickable = !!(item.disease || item.checkup);
          return (
            <div key={item.id} style={{ display:"flex", gap:12, padding:"12px 0", position:"relative",
                                        cursor: clickable ? "pointer" : "default" }}
                 onClick={() => { if (item.disease) setViewDisease(item.disease); else if (item.checkup) setViewCheckup(item.checkup); }}>
              {i < filtered.length - 1 && (
                <div style={{ position:"absolute", left:17, top:42, bottom:-4, width:2,
                              background:"rgba(95,167,102,0.16)", zIndex:0 }}/>
              )}
              <div style={{ width:36, height:36, borderRadius:999, flexShrink:0, zIndex:1,
                            background: meta.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon size={18} color={meta.color} strokeWidth={1.9}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                  <span style={{ fontSize:11, color:SUB }}>{fmtFull(item.date)}</span>
                  <span style={{ fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:999,
                                 background: meta.bg, color: meta.color, flexShrink:0 }}>{meta.label}</span>
                </div>
                <div style={{ fontSize:14, fontWeight:700, color:TEXT, marginTop:3 }}>{item.title}</div>
                {item.sub && (
                  <div style={{ fontSize:12, color:SUB, marginTop:2, overflow:"hidden",
                                textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.sub}</div>
                )}
              </div>
              <ChevronRight size={16} color="#C2C8BE" strokeWidth={2}
                style={{ alignSelf:"center", flexShrink:0 }}/>
            </div>
          );
        })}
      </div>
    </>
    );
  };

  return (
    <div style={{ height:"100%", overflowY:"auto", background:BG }}>

      {/* ── Header ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"max(env(safe-area-inset-top), 28px) 16px 14px" }}>
        <button onClick={onBack}
          style={{ width:40, height:40, borderRadius:999, background:"rgba(255,255,255,0.6)",
                   border:"none", cursor:"pointer",
                   display:"flex", alignItems:"center", justifyContent:"center",
                   boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
          <ChevronLeft size={22} color={TEXT} strokeWidth={2.5}/>
        </button>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <HealthIcon size={60} color={TEXT}/>
          <span style={{ fontSize:17, fontWeight:800, color:TEXT }}>宠物健康</span>
        </div>
        <button onClick={() => setAddSheetOpen(true)} disabled={!pet?.id}
          style={{ width:40, height:40, borderRadius:999,
                   background: pet?.id ? PRI : "#D6D5D8", color:"white",
                   border:"none", cursor: pet?.id ? "pointer" : "default",
                   fontSize:22, display:"flex", alignItems:"center", justifyContent:"center",
                   boxShadow: pet?.id ? "0 4px 12px rgba(230,134,69,0.35)" : "none" }}>+</button>
      </div>

      {!pet?.id ? (
        <div style={{ ...CARD, margin:"0 16px", padding:"32px 20px",
                      textAlign:"center", color:"#9A9188", fontSize:13 }}>
          请先创建宠物档案
        </div>
      ) : (
        <div style={{ padding:"0 16px 90px", display:"flex", flexDirection:"column", gap:14 }}>

          {/* ── 0. 宠物切换（多宠时可切，决定狗版 / 猫版内容）── */}
          <PetTypeSwitch pets={pets} curPet={pet} open={petMenuOpen}
            setOpen={setPetMenuOpen}
            onSelect={(id) => { setSelId(id); const np = pets.find((p) => p.id === id); if (np) onSwitchPet?.(np); }} />

          {/* ── 内部 3 段 tab：健康概览 / 生病护理 / 健康档案 ── */}
          <HealthTabs tab={healthTab} setTab={setHealthTab} />

          {healthTab === "overview" && (<>
          {/* ── 1. 当前状态 Hero ── */}
          <div style={{ ...CARD, padding:"22px 20px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", bottom:-15, right:-15, opacity:0.08,
                          transform:"scale(0.78)", transformOrigin:"bottom right", pointerEvents:"none" }}>
              <svg width="100" height="100" viewBox="0 0 100 100" fill="none"
                   stroke="#1A1006" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M50 10 L80 22 L80 55 Q80 80 50 90 Q20 80 20 55 L20 22 Z"/>
                <path d="M38 50 L45 50 L45 38 L55 38 L55 50 L62 50 L62 60 L55 60 L55 72 L45 72 L45 60 L38 60 Z"/>
              </svg>
            </div>
            <div style={{ fontSize:12, color:SUB, marginBottom:4 }}>当前状态</div>
            <div style={{ fontSize:40, fontWeight:800, color:TEXT, lineHeight:1.1, marginBottom:12 }}>
              {neutered ? "已绝育" : "未绝育"}
            </div>
            {reminders.length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {reminders.map((r, i) => (
                  <span key={i} style={{ display:"inline-flex", alignItems:"center",
                                         borderRadius:999, padding:"5px 12px",
                                         background:"rgba(230,134,69,0.12)",
                                         fontSize:11.5, fontWeight:600, color:PRI }}>
                    {r}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── 2. 基础健康状态（4 行）── */}
          <div style={{ ...CARD, padding:"18px 20px" }}>
            <HTitle>基础健康状态</HTitle>

            {/* 绝育状态：保留开关（可手动切换，写 pets 表）*/}
            <HealthRow label="绝育状态" done={neutered} disabled={savingFlag}
              onToggle={(v) => toggleFlag("neutered", v)}
              icon={<CircleCheck size={18} color={neutered ? GREEN : "#C5B9B0"} strokeWidth={2}/>}/>
            <div style={{ height:1, background:"rgba(0,0,0,0.06)" }}/>

            {/* 核心疫苗：整行点击进入疫苗记录页 */}
            <InfoRow
              icon={<Syringe size={18} color={GREEN} strokeWidth={1.8}/>}
              title={vaxOv.core.title}
              sub={vaxOv.core.subText}
              warn={vaxOv.rabies.status.key === "pending" ? "狂犬疫苗：待补" : null}
              rightTop={`${vaxOv.progress.done}/${vaxOv.progress.total} 针`}
              rightBottom={vaxOv.nextDueDate ? `下次补苗\n${fmtFull(vaxOv.nextDueDate)}` : null}
              onClick={() => setView("vaccine")} divider/>

            {/* 驱虫状态：整行点击进入驱虫记录页 */}
            <InfoRow
              icon={<Bug size={18} color={GREEN} strokeWidth={1.8}/>}
              title="驱虫状态"
              rightBottom={
                `内驱 ${(dewormOv.innerNext || dewormOv.innerLast) ? fmtFull(dewormOv.innerNext || dewormOv.innerLast) : "未记录"}\n` +
                `外驱 ${(dewormOv.outerNext || dewormOv.outerLast) ? fmtFull(dewormOv.outerNext || dewormOv.outerLast) : "未记录"}`
              }
              onClick={() => setView("deworm")} divider/>

            {/* 地区虫害提醒 */}
            <InfoRow
              icon={<MapPin size={18} color={GREEN} strokeWidth={1.8}/>}
              title="地区虫害提醒"
              sub={risk.area}
              rightBottom={`高发\n${risk.risks.join(" / ")}`}/>
          </div>

          {/* ── 3. 快捷入口 ── */}
          <QuickEntryCard onVaccine={() => setView("vaccine")} onDeworm={() => setView("deworm")} />
          </>)}

          {healthTab === "care" && (<>
          {/* ── 当前护理状态（有生病中→卡片；无→可爱空状态）── */}
          <CareStatusCard
            diseases={diseases} pets={pets} medTick={medDoneTick}
            onAdd={() => { setDiseaseInit("sick"); setAddDiseaseOpen(true); }}
            onOpen={(d) => setViewDisease(d)}
            onToggleMed={toggleMedDone} onRecover={markRecovered} />

          {/* ── 生病记录（保留完整功能卡片）── */}
          <div style={{ ...CARD, padding:"18px 20px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <HTitle noMargin>生病记录</HTitle>
              <button onClick={() => { setDiseaseInit("sick"); setAddDiseaseOpen(true); }}
                style={{ fontSize:12, fontWeight:700, color:GREEN, background:"transparent",
                         border:"none", cursor:"pointer" }}>
                ＋ 添加记录
              </button>
            </div>
            {diseases.length === 0 ? (
              <EmptyCard text="还没有疾病记录" sub="点击右侧 + 添加记录"/>
            ) : (
              <>
                {diseases.filter((d) => d.status !== "recovered").map((d) => {
                  const st          = DISEASE_STATUS[d.status] || DISEASE_STATUS.treating;
                  const dPet        = pets.find((p) => p.id === d.pet_id) || null;
                  const avatarSrc   = dPet?.pet_avatar_thumb_url || dPet?.ai_avatar_url || null;
                  const hasMed      = !!d.medicine_name;
                  const isRecovered = false; // filtered out above, always false here
                  const menuOpen    = menuOpenId === d.id;
                  // 今日是否已用药（medDoneTick 仅用于触发重渲染）
                  const medDone     = medDoneTick >= 0 && isMedDoneToday(d.id);
                  const hasMedTime  = !!d.medicine_reminder_time;

                  const nextTimeLabel = (() => {
                    if (!d.medicine_reminder_time) return null;
                    const t     = fmtTime(d.medicine_reminder_time);
                    const today = new Date().toISOString().slice(0, 10);
                    const tmr   = new Date(); tmr.setDate(tmr.getDate()+1);
                    const tmorStr = tmr.toISOString().slice(0, 10);
                    if (!d.medicine_end_date || d.medicine_end_date >= today) return `今天 ${t}`;
                    if (d.medicine_start_date === tmorStr) return `明天 ${t}`;
                    return t;
                  })();

                  return (
                    <div key={d.id} style={{ background:"rgba(255,255,255,0.62)",
                                             borderRadius:24, border:"1px solid rgba(138,123,106,0.10)",
                                             boxShadow:"0 6px 18px rgba(0,0,0,0.04)",
                                             padding:18, marginBottom:14, position:"relative" }}
                         onClick={() => { if (!menuOpen) setViewDisease(d); }}>

                      {/* ── 行1：宠物名 + 操作按钮（独立行，不挤内容）── */}
                      <div style={{ display:"flex", justifyContent:"space-between",
                                    alignItems:"center", marginBottom:12 }}
                           onClick={(e) => e.stopPropagation()}>
                        <div style={{ fontSize:16, fontWeight:800, color:GREEN }}>
                          {dPet?.name || ""}
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          {hasMedTime && (
                            <button onClick={() => toggleMedDone(d)}
                              style={{ height:34, padding:"0 13px", borderRadius:999,
                                       border: medDone ? "none" : "1px solid rgba(95,167,102,0.35)",
                                       color: medDone ? "white" : GREEN,
                                       background: medDone ? GREEN : "rgba(255,255,255,0.55)",
                                       fontSize:13, fontWeight:700, cursor:"pointer",
                                       whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:4 }}>
                              {medDone ? <><Check size={14} strokeWidth={2.6}/>今日已用药</> : "今日已用药"}
                            </button>
                          )}
                          <button onClick={() => markRecovered(d)}
                            style={{ height:34, padding:"0 13px", borderRadius:999,
                                     border:"1px solid rgba(95,167,102,0.35)",
                                     color:GREEN, background:"rgba(255,255,255,0.55)",
                                     fontSize:13, fontWeight:700, cursor:"pointer",
                                     whiteSpace:"nowrap" }}>
                            标记已康复
                          </button>
                          <div style={{ position:"relative" }}>
                            <button onClick={() => setMenuOpenId(menuOpen ? null : d.id)}
                              style={{ width:34, height:34, borderRadius:999,
                                       background:"transparent", border:"none",
                                       cursor:"pointer", display:"flex",
                                       alignItems:"center", justifyContent:"center" }}>
                              <Ellipsis size={17} color="#8A9188"/>
                            </button>
                            {menuOpen && (
                              <div style={{ position:"absolute", right:0, top:38, zIndex:200,
                                            background:"white", borderRadius:14, padding:"6px 0",
                                            boxShadow:"0 8px 24px rgba(0,0,0,0.12)", minWidth:130 }}>
                                <MenuItem label="编辑用药" icon={<Pencil size={14} color={SUB}/>}
                                  onClick={() => { setMenuOpenId(null); setEditMedDisease(d); }}/>
                                <div style={{ height:1, background:"rgba(0,0,0,0.06)", margin:"4px 10px" }}/>
                                <MenuItem label="删除记录" color="#D94040"
                                  icon={<PetTrashIcon size={16} active />}
                                  onClick={() => { setMenuOpenId(null); handleDeleteDisease(d); }}/>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ── 行2：头像 + 疾病名称/状态/症状（充足空间）── */}
                      <div style={{ display:"flex", gap:14, alignItems:"flex-start",
                                    marginBottom:14 }}>
                        <div style={{ width:72, height:72, borderRadius:999, flexShrink:0,
                                      overflow:"hidden", background:"rgba(95,167,102,0.1)",
                                      display:"flex", alignItems:"center", justifyContent:"center" }}>
                          {avatarSrc ? (
                            <img src={avatarSrc} alt={dPet?.name}
                              style={{ width:"100%", height:"100%", objectFit:"cover",
                                       display:"block", mixBlendMode:"multiply" }}/>
                          ) : dPet ? (
                            <span style={{ fontSize:30 }}>{avatarForBreed(dPet.breed, dPet.pet_type)}</span>
                          ) : (
                            <Dog size={32} color={GREEN} strokeWidth={1.4}/>
                          )}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8,
                                        marginBottom:6, overflow:"hidden" }}>
                            <span style={{ fontSize:18, fontWeight:800, color:"#111",
                                           overflow:"hidden", textOverflow:"ellipsis",
                                           whiteSpace:"nowrap", maxWidth:120,
                                           flexShrink:1 }}>
                              {d.disease_name.slice(0, 12)}
                            </span>
                            <span style={{ fontSize:13, fontWeight:700, padding:"4px 10px",
                                           borderRadius:999, flexShrink:0, whiteSpace:"nowrap",
                                           background:"rgba(230,134,69,0.14)", color:"#E68645" }}>
                              {st.label}
                            </span>
                            <ChevronRight size={14} color="#8A9188" strokeWidth={2}
                              style={{ flexShrink:0 }}/>
                          </div>
                          <div style={{ fontSize:14, color:"#6F756B", lineHeight:1.55,
                                        overflow:"hidden", display:"-webkit-box",
                                        WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                            {d.symptoms || "暂无症状描述"}
                          </div>
                        </div>
                      </div>

                      {/* ── 用药信息条 ── */}
                      <div style={{ marginTop:14, background:"rgba(95,167,102,0.08)",
                                    borderRadius:18, padding:"14px 16px",
                                    display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}
                           onClick={(e) => e.stopPropagation()}>

                        {/* 左：用药详情 */}
                        <div>
                          <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:6 }}>
                            <Pill size={14} color={GREEN} strokeWidth={1.8}/>
                            <span style={{ fontSize:13, fontWeight:800, color:GREEN }}>用药详情</span>
                          </div>
                          {hasMed ? (
                            <div style={{ fontSize:15, fontWeight:600, color:"#1F1F1F" }}>
                              {[d.medicine_name, d.medicine_dosage, d.medicine_frequency]
                                .filter(Boolean).join(" · ")}
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontSize:13, color:"#8A9188", marginBottom:4 }}>
                                暂无用药记录
                              </div>
                              <button onClick={() => setEditMedDisease(d)}
                                style={{ fontSize:12, fontWeight:700, color:GREEN,
                                         background:"transparent", border:"none", cursor:"pointer",
                                         padding:0 }}>
                                + 添加用药
                              </button>
                            </div>
                          )}
                        </div>

                        {/* 右：下次用药时间 / 用药周期 */}
                        <div>
                          <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:6 }}>
                            {isRecovered
                              ? <Calendar size={14} color={GREEN} strokeWidth={1.8}/>
                              : <Clock    size={14} color={GREEN} strokeWidth={1.8}/>}
                            <span style={{ fontSize:13, fontWeight:800, color:GREEN }}>
                              {isRecovered ? "用药周期" : "下次用药时间"}
                            </span>
                          </div>
                          {isRecovered ? (
                            <div>
                              <div style={{ fontSize:14, fontWeight:700, color:"#1F1F1F", marginBottom:5 }}>
                                {[fmtShort(d.medicine_start_date), fmtShort(d.medicine_end_date)]
                                  .filter(Boolean).join(" - ") || "未设置"}
                              </div>
                              {hasMed && (
                                <span style={{ fontSize:12, fontWeight:700, padding:"3px 10px",
                                               borderRadius:999,
                                               background:"rgba(95,167,102,0.14)", color:GREEN,
                                               display:"inline-flex", alignItems:"center", gap:4 }}>
                                  <CircleCheck size={11} color={GREEN} strokeWidth={2}/> 已完成
                                </span>
                              )}
                            </div>
                          ) : nextTimeLabel ? (
                            <div>
                              <div style={{ fontSize:18, fontWeight:800, color:"#1F1F1F", marginBottom:5 }}>
                                {nextTimeLabel}
                              </div>
                              <span style={{ fontSize:12, fontWeight:700, padding:"3px 10px",
                                             borderRadius:999, display:"inline-flex",
                                             alignItems:"center", gap:4,
                                             background: d.medicine_reminder_enabled
                                               ? "rgba(95,167,102,0.14)" : "rgba(138,123,106,0.10)",
                                             color: d.medicine_reminder_enabled ? GREEN : "#8A7B6A" }}>
                                <Bell size={10} color={d.medicine_reminder_enabled ? GREEN : "#8A7B6A"}/>
                                {d.medicine_reminder_enabled ? "已设置提醒" : "未提醒"}
                              </span>
                            </div>
                          ) : (
                            <div style={{ fontSize:14, color:"#8A9188" }}>未设置提醒</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div style={{ textAlign:"center", fontSize:12, color:"#B5AFA9", padding:"4px 0" }}>
                  没有更多记录了
                </div>
              </>
            )}
          </div>
          </>)}

          {healthTab === "archive" && renderArchive()}
        </div>
      )}

      {/* ── Modals ── */}
      {addSheetOpen && (
        <AddRecordSheet
          onClose={() => setAddSheetOpen(false)}
          onSelect={(key) => {
            setAddSheetOpen(false);
            if (key === "vaccine") { setVaxAutoAdd(true); setView("vaccine"); }
            else if (key === "deworm") { setDewormAutoAdd(true); setView("deworm"); }
            else if (key === "checkup") { setEditingCheckup(null); setCheckupFormOpen(true); }
            else { // disease / medication / recovery 都落到生病记录表单，预设状态
              setDiseaseInit(key === "medication" ? "medicating" : key === "recovery" ? "recovered" : "sick");
              setAddDiseaseOpen(true);
            }
          }} />
      )}
      {checkupFormOpen && (
        <CheckupRecordForm pet={pet} user={user} initial={editingCheckup}
          onClose={() => setCheckupFormOpen(false)}
          onSaved={() => { setCheckupFormOpen(false); reload(); showToast("体检记录已保存 ✨"); }}
          onError={(m) => showToast(m, "error")}/>
      )}
      {addDiseaseOpen && (
        <AddDiseaseModal user={user} pet={pet} pets={pets} initialStatus={diseaseInit}
          onClose={() => setAddDiseaseOpen(false)}
          onAdded={() => { setAddDiseaseOpen(false); reload(); showToast("疾病记录已保存 ✨"); }}
          onError={(msg) => showToast(msg, "error")}/>
      )}
      {editMedDisease && (
        <EditMedicationModal
          disease={editMedDisease}
          user={user}
          onClose={() => setEditMedDisease(null)}
          onSaved={(updated) => {
            setDiseases((prev) => prev.map((d) => d.id === updated.id ? { ...d, ...updated } : d));
            setEditMedDisease(null);
            showToast("用药信息已更新 ✨");
          }}/>
      )}
      {viewDisease && (
        <DiseaseDetailSheet
          disease={viewDisease}
          pets={pets}
          user={user}
          onClose={() => setViewDisease(null)}
          onDelete={() => { handleDeleteDisease(viewDisease); setViewDisease(null); }}
          onUpdated={(updated) => {
            setDiseases((prev) => prev.map((d) => d.id === updated.id ? updated : d));
            setViewDisease(updated);
            showToast("已更新 ✨");
          }}/>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", left:"50%", bottom:90, transform:"translateX(-50%)",
                      zIndex:2000, background: toastColors(toast.type).bg, color: toastColors(toast.type).color,
                      padding:"11px 22px", borderRadius:999,
                      fontSize:14, fontWeight:700, boxShadow:"0 6px 20px rgba(0,0,0,0.22)",
                      maxWidth:"80%", textAlign:"center" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ══ Shared UI ═══════════════════════════════════ */
/* 内部 3 段 tab：健康概览 / 生病护理 / 健康档案 */
function HealthTabs({ tab, setTab }) {
  const items = [
    { k:"overview", l:"健康概览" },
    { k:"care",     l:"生病护理" },
    { k:"archive",  l:"健康档案" },
  ];
  return (
    <div style={{ display:"flex", gap:4, padding:4, borderRadius:999, background:"#EEF5EA" }}>
      {items.map((it) => {
        const on = tab === it.k;
        return (
          <button key={it.k} onClick={() => setTab(it.k)}
            style={{ flex:1, height:34, borderRadius:999, border:"none", cursor:"pointer",
                     fontSize:14, fontWeight:600, transition:"all .15s",
                     background: on ? "#4FA85D" : "transparent", color: on ? "#fff" : "#333" }}>
            {it.l}
          </button>
        );
      })}
    </div>
  );
}

/* 健康概览：快捷入口卡（疫苗记录 / 驱虫记录）*/
function QuickEntryCard({ onVaccine, onDeworm }) {
  const Item = ({ icon, title, sub, onClick }) => (
    <button onClick={onClick}
      style={{ flex:1, display:"flex", alignItems:"center", gap:10, padding:"14px",
               borderRadius:18, border:"1px solid rgba(0,0,0,0.05)", background:"#F6FAF4",
               cursor:"pointer", textAlign:"left" }}>
      <div style={{ width:38, height:38, borderRadius:12, flexShrink:0, background:"rgba(95,167,102,0.12)",
                    display:"flex", alignItems:"center", justifyContent:"center" }}>{icon}</div>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:700, color:TEXT }}>{title}</div>
        <div style={{ fontSize:11, color:SUB, marginTop:2 }}>{sub}</div>
      </div>
    </button>
  );
  return (
    <div style={{ ...CARD, padding:"18px 20px" }}>
      <HTitle>快捷入口</HTitle>
      <div style={{ display:"flex", gap:12 }}>
        <Item icon={<Syringe size={19} color={GREEN} strokeWidth={1.8}/>} title="疫苗记录" sub="查看接种进度" onClick={onVaccine}/>
        <Item icon={<Bug size={19} color={GREEN} strokeWidth={1.8}/>} title="驱虫记录" sub="查看驱虫计划" onClick={onDeworm}/>
      </div>
    </div>
  );
}

/* 可爱宠物脸（线性 SVG，绿色）—— 生病护理空状态 */
/* 生病护理：当前护理状态卡（无 active→可爱空状态；有→ spotlight + 快捷操作）*/
function CareStatusCard({ diseases, pets, medTick, onAdd, onOpen, onToggleMed, onRecover }) {
  const active = (diseases || []).filter((d) => d.status !== "recovered");
  if (active.length === 0) {
    return (
      <div style={{ ...CARD, padding:"18px 20px" }}>
        <HTitle>当前护理状态</HTitle>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"18px 10px 8px" }}>
          <div style={{ width:84, height:84, borderRadius:999, background:"rgba(95,167,102,0.1)",
                        display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14 }}>
            <PetHealthPlaceholderIcon size={46}/>
          </div>
          <div style={{ fontSize:16, fontWeight:800, color:TEXT }}>暂无生病护理</div>
          <div style={{ fontSize:12.5, color:SUB, marginTop:6, textAlign:"center", lineHeight:1.6 }}>
            如果宠物生病、用药或康复，<br/>可以在这里记录
          </div>
          <button onClick={onAdd}
            style={{ marginTop:16, height:42, padding:"0 22px", borderRadius:999, border:`1px solid ${GREEN}`,
                     background:"transparent", color:GREEN, fontSize:14, fontWeight:700, cursor:"pointer",
                     display:"inline-flex", alignItems:"center", gap:6 }}>
            <Plus size={16} strokeWidth={2.6}/> 添加生病记录
          </button>
        </div>
      </div>
    );
  }
  const d = active[0];
  const stLabel = d.medicine_name ? "用药中" : "生病中";
  const medDone = medTick >= 0 && isMedDoneToday(d.id);
  return (
    <div style={{ ...CARD, padding:"18px 20px" }}>
      <HTitle>当前护理状态</HTitle>
      <div onClick={() => onOpen(d)} style={{ cursor:"pointer" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
          <span style={{ fontSize:17, fontWeight:800, color:TEXT }}>{d.disease_name}</span>
          <span style={{ fontSize:12, fontWeight:700, padding:"4px 12px", borderRadius:999,
                         background:"rgba(230,134,69,0.14)", color:PRI }}>{stLabel}</span>
        </div>
        <div style={{ fontSize:12.5, color:SUB, marginTop:8 }}>
          {fmtFull(d.diagnosis_date)}{d.recovery_date ? ` - ${fmtFull(d.recovery_date)}` : ""}
        </div>
        {d.medicine_name && (
          <div style={{ fontSize:13, color:TEXT, marginTop:6 }}>
            最近用药：{[d.medicine_name, d.medicine_dosage, d.medicine_frequency].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>
      <div style={{ display:"flex", gap:8, marginTop:14 }}>
        {d.medicine_reminder_time && (
          <button onClick={() => onToggleMed(d)}
            style={{ flex:1, height:40, borderRadius:12, cursor:"pointer",
                     border: medDone ? "none" : `1px solid ${GREEN}`,
                     background: medDone ? GREEN : "transparent", color: medDone ? "#fff" : GREEN,
                     fontSize:13, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
            {medDone ? <><Check size={14} strokeWidth={2.6}/>今日已用药</> : "今日已用药"}
          </button>
        )}
        <button onClick={() => onRecover(d)}
          style={{ flex:1, height:40, borderRadius:12, cursor:"pointer", border:`1px solid ${GREEN}`,
                   background:"transparent", color:GREEN, fontSize:13, fontWeight:700 }}>
          标记已康复
        </button>
      </div>
    </div>
  );
}

/* 右上加号：底部「添加记录」action sheet（6 项，统一入口）*/
function AddRecordSheet({ onClose, onSelect }) {
  const items = [
    { k:"vaccine",    t:"添加疫苗记录", s:"记录疫苗接种情况",   Icon:Syringe,     c:GREEN,     bg:"rgba(95,167,102,0.12)" },
    { k:"deworm",     t:"添加驱虫记录", s:"记录体内 / 体外驱虫", Icon:Bug,         c:GREEN,     bg:"rgba(95,167,102,0.12)" },
    { k:"disease",    t:"添加生病记录", s:"记录生病和护理情况",  Icon:HeartPulse,  c:GREEN,     bg:"rgba(95,167,102,0.12)" },
    { k:"medication", t:"添加用药记录", s:"记录用药详情",        Icon:Pill,        c:PRI,       bg:"rgba(230,134,69,0.12)" },
    { k:"checkup",    t:"添加体检记录", s:"记录体检结果",        Icon:Stethoscope, c:"#4A90E2", bg:"#EAF3FF" },
    { k:"recovery",   t:"添加康复记录", s:"记录康复情况",        Icon:CircleCheck, c:GREEN,     bg:"rgba(95,167,102,0.12)" },
  ];
  return (
    <div onClick={onClose}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1500,
               display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width:"100%", maxWidth:430, background:"#fff", borderRadius:"24px 24px 0 0",
                 padding:"18px 16px 30px", maxHeight:"88vh", overflowY:"auto" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <span style={{ fontSize:17, fontWeight:800, color:TEXT }}>添加记录</span>
          <button onClick={onClose}
            style={{ width:32, height:32, borderRadius:999, border:"none", cursor:"pointer",
                     background:"#F2F1ED", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={17} color={SUB} strokeWidth={2.4}/>
          </button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {items.map((it) => {
            const Ico = it.Icon;
            return (
              <button key={it.k} onClick={() => onSelect(it.k)}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
                         borderRadius:16, border:"1px solid rgba(0,0,0,0.05)", background:"#FAFAF8",
                         cursor:"pointer", textAlign:"left" }}>
                <div style={{ width:40, height:40, borderRadius:12, flexShrink:0, background:it.bg,
                              display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Ico size={20} color={it.c} strokeWidth={1.9}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14.5, fontWeight:700, color:TEXT }}>{it.t}</div>
                  <div style={{ fontSize:12, color:SUB, marginTop:2 }}>{it.s}</div>
                </div>
                <ChevronRight size={17} color="#C2C8BE" strokeWidth={2}/>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PetTypeSwitch({ pets, curPet, open, setOpen, onSelect }) {
  const multi = (pets?.length || 0) > 1;
  const iconFor = (p) => p?.pet_type === "cat"
    ? <Cat size={16} color={GREEN} strokeWidth={2}/>
    : <Dog size={16} color={GREEN} strokeWidth={2}/>;
  return (
    <div style={{ display:"flex", justifyContent:"center", position:"relative" }}>
      <button onClick={() => multi && setOpen(!open)}
        style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 16px",
                 borderRadius:999, background:"rgba(95,167,102,0.12)", border:"none",
                 cursor: multi ? "pointer" : "default" }}>
        {iconFor(curPet)}
        <span style={{ fontSize:13.5, fontWeight:700, color:GREEN }}>
          {curPet?.name || (curPet?.pet_type === "cat" ? "猫咪" : "狗狗")}
        </span>
        {multi && <ChevronDown size={15} color={GREEN} strokeWidth={2.4}
                    style={{ transform: open ? "rotate(180deg)" : "none", transition:"transform .2s" }}/>}
      </button>
      {open && multi && (
        <div onClick={() => setOpen(false)}
          style={{ position:"fixed", inset:0, zIndex:290 }}/>
      )}
      {open && multi && (
        <div style={{ position:"absolute", top:42, zIndex:300, background:"#fff",
                      borderRadius:14, padding:"6px 0", minWidth:170,
                      boxShadow:"0 10px 28px rgba(0,0,0,0.16)" }}>
          {pets.map((p) => {
            const on = p.id === curPet?.id;
            return (
              <button key={p.id} onClick={() => { onSelect(p.id); setOpen(false); }}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:9,
                         padding:"10px 16px", border:"none", cursor:"pointer", textAlign:"left",
                         background: on ? "rgba(95,167,102,0.08)" : "transparent" }}>
                {iconFor(p)}
                <span style={{ fontSize:13.5, fontWeight: on ? 700 : 500, color:TEXT, flex:1 }}>
                  {p.name}
                </span>
                {on && <Check size={15} color={GREEN} strokeWidth={2.6}/>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, title, sub, warn, rightTop, rightBottom, onClick, divider }) {
  return (
    <>
      <div onClick={onClick}
        style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"13px 0",
                 cursor: onClick ? "pointer" : "default" }}>
        <div style={{ width:34, height:34, borderRadius:10, flexShrink:0, marginTop:1,
                      background:"rgba(95,167,102,0.1)", display:"flex",
                      alignItems:"center", justifyContent:"center" }}>
          {icon}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14.5, fontWeight:700, color:TEXT }}>{title}</div>
          {sub  && <div style={{ fontSize:12, color:SUB, marginTop:3 }}>{sub}</div>}
          {warn && <div style={{ fontSize:12, fontWeight:700, color:PRI, marginTop:4 }}>{warn}</div>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0, maxWidth:160 }}>
          <div style={{ textAlign:"right" }}>
            {rightTop    && <div style={{ fontSize:13.5, fontWeight:700, color:TEXT }}>{rightTop}</div>}
            {rightBottom && <div style={{ fontSize:11, color:SUB, marginTop:3,
                                          whiteSpace:"pre-line", lineHeight:1.5 }}>{rightBottom}</div>}
          </div>
          {onClick && <ChevronRight size={16} color="#C2C8BE" strokeWidth={2}/>}
        </div>
      </div>
      {divider && <div style={{ height:1, background:"rgba(0,0,0,0.06)" }}/>}
    </>
  );
}

function HTitle({ children, noMargin }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom: noMargin ? 0 : 14 }}>
      <div style={{ width:7, height:7, borderRadius:999, background:GREEN, flexShrink:0 }}/>
      <span style={{ fontSize:16, fontWeight:800, color:TEXT }}>{children}</span>
    </div>
  );
}
function FTitle({ children }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
      <div style={{ width:6, height:6, borderRadius:999, background:GREEN, flexShrink:0 }}/>
      <span style={{ fontSize:15, fontWeight:700, color:"#1F1F1F" }}>{children}</span>
    </div>
  );
}
function MenuItem({ label, icon, onClick, color }) {
  return (
    <button onClick={onClick}
      style={{ width:"100%", padding:"11px 18px", textAlign:"left",
               background:"transparent", border:"none", cursor:"pointer",
               fontSize:14, fontWeight:600, color: color || TEXT,
               display:"flex", alignItems:"center", gap:8 }}>
      {icon} {label}
    </button>
  );
}

function EmptyCard({ icon, text, sub }) {
  return (
    <div style={{ textAlign:"center", padding:"24px 0 8px",
                  display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
      {icon}
      <div style={{ fontSize:13, color:"#9A9188", fontWeight:600 }}>{text}</div>
      {sub && <div style={{ fontSize:11, color:"#B5AFA9" }}>{sub}</div>}
    </div>
  );
}
function HealthRow({ label, done, onToggle, disabled, icon }) {
  return (
    <div style={{ display:"flex", alignItems:"center", padding:"10px 0" }}>
      <div style={{ width:32, height:32, borderRadius:10,
                    background: done ? "rgba(95,167,102,0.12)" : "rgba(0,0,0,0.04)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    marginRight:12, flexShrink:0 }}>
        {icon}
      </div>
      <span style={{ flex:1, fontSize:13, color:TEXT, fontWeight:600 }}>{label}</span>
      <button onClick={() => !disabled && onToggle(!done)} disabled={disabled}
        style={{ fontSize:12, fontWeight:700, padding:"5px 14px", borderRadius:999,
                 background: done ? "rgba(95,167,102,0.12)" : "rgba(0,0,0,0.06)",
                 color: done ? GREEN : SUB, border:"none", cursor: disabled ? "default" : "pointer" }}>
        {done ? "已完成" : "未完成"}
      </button>
    </div>
  );
}
/* ══ PetSelector — shared by Add modals ══════════ */
function PetSelector({ allPets, selPetId, setSelPetId }) {
  return (
    <div>
      <FTitle>选择宠物</FTitle>
      <div style={{ display:"flex", gap:12, overflowX:"auto", scrollbarWidth:"none",
                    WebkitOverflowScrolling:"touch", paddingBottom:4 }}>
        {allPets.map((p) => {
          const sel = p.id === selPetId;
          const avatarSrc = p.pet_avatar_thumb_url || p.ai_avatar_url || null;
          const age = formatPetAge(p.birthday) || (p.age ? `${p.age}岁` : "");
          return (
            <button key={p.id} onClick={() => setSelPetId(p.id)}
              style={{ flex:"0 0 auto", width:150, height:84, borderRadius:20, padding:12,
                       background: sel ? "rgba(95,167,102,0.10)" : "rgba(255,255,255,0.55)",
                       border: sel ? `2px solid ${GREEN}` : "1px solid rgba(138,123,106,0.14)",
                       cursor:"pointer", textAlign:"left", position:"relative",
                       display:"flex", alignItems:"center", gap:10, transition:"all .15s" }}>
              <div style={{ width:48, height:48, borderRadius:999, flexShrink:0,
                            overflow:"hidden", background:"rgba(236,238,232,0.8)" }}>
                {avatarSrc ? (
                  <img src={avatarSrc} alt={p.name}
                    style={{ width:"100%", height:"100%", objectFit:"cover",
                             display:"block", mixBlendMode:"multiply" }}/>
                ) : (
                  <div style={{ width:"100%", height:"100%", display:"flex",
                                alignItems:"center", justifyContent:"center", fontSize:22 }}>
                    {avatarForBreed(p.breed, p.pet_type)}
                  </div>
                )}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:15, fontWeight:800, color:"#1F1F1F",
                              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {p.name}
                </div>
                <div style={{ fontSize:12, color:"#8A9188", marginTop:2,
                              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {[p.breed, age].filter(Boolean).join(" · ")}
                </div>
              </div>
              {sel && (
                <div style={{ position:"absolute", top:8, right:8, width:26, height:26,
                              borderRadius:999, background:GREEN,
                              display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Check size={14} color="white" strokeWidth={3}/>
                </div>
              )}
            </button>
          );
        })}
        <div style={{ flex:"0 0 auto", width:100, height:84, borderRadius:20,
                      border:"1.5px dashed rgba(95,167,102,0.5)",
                      display:"flex", flexDirection:"column", alignItems:"center",
                      justifyContent:"center", gap:6, opacity:0.65 }}>
          <div style={{ width:32, height:32, borderRadius:999, border:`1.5px dashed ${GREEN}`,
                        display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Plus size={16} color={GREEN}/>
          </div>
          <span style={{ fontSize:11, color:GREEN, fontWeight:600 }}>添加宠物</span>
        </div>
      </div>
    </div>
  );
}

/* ══ DatePicker row ══════════════════════════════ */
function DateRow({ label, val, setVal, refEl, placeholder }) {
  return (
    <div>
      <FTitle>{label}</FTitle>
      <div style={{ position:"relative" }}>
        <input ref={refEl} type="date" value={val} onChange={(e) => setVal(e.target.value)}
          style={{ position:"absolute", inset:0, opacity:0, pointerEvents:"none", border:"none" }}/>
        <button type="button"
          onClick={() => {
            const el = refEl.current; if (!el) return;
            if (typeof el.showPicker === "function") { try { el.showPicker(); return; } catch {} }
            el.focus(); el.click();
          }}
          style={{ width:"100%", height:52, borderRadius:16,
                   background:"rgba(255,255,255,0.72)", border:"1px solid rgba(138,123,106,0.18)",
                   padding:"0 14px", display:"flex", alignItems:"center", gap:8,
                   cursor:"pointer", boxSizing:"border-box" }}>
          <Calendar size={15} color="#8A7B6A" strokeWidth={1.8} style={{ flexShrink:0 }}/>
          <span style={{ flex:1, textAlign:"left", fontSize:14, fontWeight:600,
                         color: val ? "#1F1F1F" : "#9A9188" }}>
            {val ? val.replace(/-/g,"/") : placeholder}
          </span>
          <ChevronRight size={13} color="#2B2B2B"/>
        </button>
      </div>
    </div>
  );
}

/* ══ Field input style ══════════════════════════ */
const INP = {
  width:"100%", background:"rgba(255,255,255,0.72)",
  border:"1px solid rgba(138,123,106,0.18)", borderRadius:16,
  padding:"13px 16px", fontSize:15, color:"#1F1F1F",
  outline:"none", boxSizing:"border-box", fontFamily:"inherit",
};
const onFocusGreen = (e) => { e.target.style.border=`1px solid ${GREEN}`; e.target.style.boxShadow=`0 0 0 3px rgba(95,167,102,0.12)`; };
const onBlurReset  = (e) => { e.target.style.border="1px solid rgba(138,123,106,0.18)"; e.target.style.boxShadow="none"; };

/* ══ MedicineFields — reused in Add + Edit ═══════ */
function MedicineFields({ med, setMed }) {
  const startRef = useRef(null);
  const endRef   = useRef(null);
  const timeRef  = useRef(null);
  const upd = (k, v) => setMed((m) => ({ ...m, [k]: v }));

  return (
    <div style={{ background:"rgba(95,167,102,0.08)", border:"1px solid rgba(95,167,102,0.16)",
                  borderRadius:20, padding:16, display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ fontSize:14, fontWeight:700, color:GREEN, marginBottom:2 }}>用药设置（可选）</div>
      <div style={{ fontSize:12, color:SUB, marginTop:-10 }}>
        如果这次生病需要用药，可以在这里记录用药和提醒。
      </div>

      <div>
        <FTitle>药物名称</FTitle>
        <input value={med.name} onChange={(e) => upd("name", e.target.value)}
          placeholder="例如：蒙脱石散" onFocus={onFocusGreen} onBlur={onBlurReset} style={INP}/>
      </div>

      <div style={{ display:"flex", gap:10 }}>
        <div style={{ flex:1 }}>
          <FTitle>剂量</FTitle>
          <input value={med.dosage} onChange={(e) => upd("dosage", e.target.value)}
            placeholder="每次1包" onFocus={onFocusGreen} onBlur={onBlurReset} style={INP}/>
        </div>
        <div style={{ flex:1 }}>
          <FTitle>频率</FTitle>
          <input value={med.frequency} onChange={(e) => upd("frequency", e.target.value)}
            placeholder="每日2次" onFocus={onFocusGreen} onBlur={onBlurReset} style={INP}/>
        </div>
      </div>

      <div style={{ display:"flex", gap:10 }}>
        <div style={{ flex:1 }}>
          <DateRow label="开始日期" val={med.startDate} setVal={(v) => upd("startDate", v)}
            refEl={startRef} placeholder="选择开始日期"/>
        </div>
        <div style={{ flex:1 }}>
          <DateRow label="结束日期" val={med.endDate} setVal={(v) => upd("endDate", v)}
            refEl={endRef} placeholder="选择结束日期"/>
        </div>
      </div>

      <div style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
        <div style={{ flex:1 }}>
          <FTitle>提醒时间</FTitle>
          <div style={{ position:"relative" }}>
            <input ref={timeRef} type="time" value={med.time}
              onChange={(e) => { const v = e.target.value; upd("time", v); if (v) upd("reminderEnabled", true); }}
              style={{ position:"absolute", inset:0, opacity:0, pointerEvents:"none", border:"none" }}/>
            <button type="button"
              onClick={() => {
                const el = timeRef.current; if (!el) return;
                if (typeof el.showPicker === "function") { try { el.showPicker(); return; } catch {} }
                el.focus(); el.click();
              }}
              style={{ width:"100%", height:52, borderRadius:16,
                       background:"rgba(255,255,255,0.72)", border:"1px solid rgba(138,123,106,0.18)",
                       padding:"0 14px", display:"flex", alignItems:"center", gap:8,
                       cursor:"pointer", boxSizing:"border-box" }}>
              <Clock size={15} color="#8A7B6A" strokeWidth={1.8} style={{ flexShrink:0 }}/>
              <span style={{ flex:1, textAlign:"left", fontSize:14, color: med.time ? "#1F1F1F" : "#9A9188" }}>
                {med.time ? med.time.slice(0,5) : "例如：20:00"}
              </span>
              <ChevronRight size={13} color="#2B2B2B"/>
            </button>
          </div>
        </div>
        <div style={{ flexShrink:0, paddingBottom:4 }}>
          <FTitle>开启提醒</FTitle>
          <button onClick={() => upd("reminderEnabled", !med.reminderEnabled)}
            style={{ width:52, height:30, borderRadius:15, position:"relative",
                     background: med.reminderEnabled ? GREEN : "#D0CFC9",
                     border:"none", cursor:"pointer", transition:"background .15s" }}>
            <div style={{ position:"absolute", top:4, left: med.reminderEnabled ? 24 : 4,
                          width:22, height:22, borderRadius:"50%", background:"white",
                          boxShadow:"0 1px 3px rgba(0,0,0,0.2)", transition:"left .15s" }}/>
          </button>
        </div>
      </div>

      <div>
        <FTitle>用药备注</FTitle>
        <textarea value={med.notes} onChange={(e) => upd("notes", e.target.value)}
          placeholder="饭前饭后、是否冷藏、注意事项等..." rows={2}
          onFocus={onFocusGreen} onBlur={onBlurReset}
          style={{ ...INP, resize:"none" }}/>
      </div>
    </div>
  );
}

/* ══ AddDiseaseModal ═════════════════════════════ */
function AddDiseaseModal({ user, pet, pets = [], onClose, onAdded, onError, initialStatus = "sick" }) {
  const defaultPet = pets.find((p) => p.id === pet?.id) || pets[0] || pet;
  const [selPetId, setSelPetId] = useState(defaultPet?.id || "");
  const [name,     setName]     = useState("");
  const [syms,     setSyms]     = useState("");
  // UI 三段：sick 生病中 / medicating 用药中 / recovered 已康复（落库时映射为 treating/recovered）
  const [status,   setStatus]   = useState(initialStatus);
  const [diag,     setDiag]     = useState(new Date().toISOString().slice(0, 10));
  const [recov,    setRecov]    = useState("");
  const [plan,     setPlan]     = useState("");
  const [med,      setMed]      = useState({ name:"", dosage:"", frequency:"",
                                              startDate:"", endDate:"", time:"",
                                              reminderEnabled:false, notes:"" });
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState(null);
  const diagRef    = useRef(null);
  const recovRef   = useRef(null);

  const canSave = !!selPetId && name.trim().length > 0 && !saving;
  const allPets = pets.length > 0 ? pets : (pet ? [pet] : []);

  const handleSave = async () => {
    if (!selPetId) { setErr("请选择宠物"); return; }
    if (!name.trim()) { setErr("请填写疾病名称"); return; }
    setErr(null); setSaving(true);
    try {
      await addDiseaseRecord({
        userId:      user.id, petId: selPetId,
        diseaseName: name, symptoms: syms,
        status: status === "recovered" ? "recovered" : "treating",
        diagnosisDate: diag, recoveryDate: recov || null,
        treatmentPlan: plan,
        notes: "",
        medicineName:            med.name     || null,
        medicineDosage:          med.dosage   || null,
        medicineFrequency:       med.frequency || null,
        medicineStartDate:       med.startDate || null,
        medicineEndDate:         med.endDate   || null,
        medicineReminderTime:    med.time      || null,
        medicineReminderEnabled: med.reminderEnabled,
        medicineNotes:           med.notes     || null,
      });
      onAdded();
    } catch (e) {
      const msg = e.message || "保存失败";
      setErr(msg); onError?.(msg);
    } finally { setSaving(false); }
  };

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:1000,
               display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, background:"#ECEEE8",
                    borderRadius:"32px 32px 0 0", maxHeight:"94vh", overflowY:"auto",
                    paddingBottom:"env(safe-area-inset-bottom, 20px)" }}>
        <div style={{ display:"flex", justifyContent:"center", paddingTop:14, paddingBottom:6 }}>
          <div style={{ width:64, height:6, borderRadius:999, background:"#D8D5D2" }}/>
        </div>
        <div style={{ display:"flex", alignItems:"center", padding:"8px 20px 16px" }}>
          <button onClick={onClose}
            style={{ width:48, height:48, borderRadius:999, background:"white", border:"none",
                     cursor:"pointer", marginRight:14, flexShrink:0,
                     display:"flex", alignItems:"center", justifyContent:"center",
                     boxShadow:"0 6px 16px rgba(0,0,0,0.05)" }}>
            <ChevronLeft size={22} color="#1A1006" strokeWidth={2.5}/>
          </button>
          <HeartPulse size={24} color={GREEN} strokeWidth={1.8} style={{ marginRight:8, flexShrink:0 }}/>
          <span style={{ fontSize:26, fontWeight:800, color:"#1F1F1F" }}>新增疾病记录</span>
        </div>

        <div style={{ padding:"0 16px 28px", display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ background:"rgba(255,255,255,0.62)", borderRadius:28, padding:20,
                        boxShadow:"0 8px 24px rgba(0,0,0,0.06)", border:"1px solid rgba(255,255,255,0.65)",
                        display:"flex", flexDirection:"column", gap:20 }}>

            <PetSelector allPets={allPets} selPetId={selPetId} setSelPetId={setSelPetId}/>

            <div>
              <FTitle>疾病名称 *</FTitle>
              <input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="例如：肠胃炎、皮肤病等" maxLength={50}
                onFocus={onFocusGreen} onBlur={onBlurReset} style={INP}/>
            </div>

            <div>
              <FTitle>症状描述 *</FTitle>
              <div style={{ position:"relative" }}>
                <textarea value={syms} onChange={(e) => setSyms(e.target.value.slice(0,200))}
                  placeholder="请详细描述宠物的症状表现..." rows={3}
                  onFocus={onFocusGreen} onBlur={onBlurReset}
                  style={{ ...INP, resize:"none", paddingBottom:26 }}/>
                <div style={{ position:"absolute", bottom:8, right:12,
                              fontSize:11, color:"#9A9188" }}>{syms.length}/200</div>
              </div>
            </div>

            <div>
              <FTitle>状态 *</FTitle>
              <div style={{ display:"flex", gap:8 }}>
                {[{k:"sick",l:"生病中"},{k:"medicating",l:"用药中"},{k:"recovered",l:"已康复"}].map(({k,l}) => (
                  <button key={k} onClick={() => setStatus(k)}
                    style={{ flex:1, height:48, borderRadius:14, fontSize:14, fontWeight:700,
                             background: status===k ? GREEN : "rgba(255,255,255,0.72)",
                             color: status===k ? "white" : "#1F1F1F",
                             border: status===k ? "none" : "1px solid rgba(138,123,106,0.18)",
                             cursor:"pointer", transition:"all .15s",
                             boxShadow: status===k ? "0 6px 16px rgba(95,167,102,0.25)" : "none" }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <div style={{ flex:1 }}>
                <DateRow label="诊断日期 *" val={diag} setVal={setDiag}
                  refEl={diagRef} placeholder="选择诊断日期"/>
              </div>
              <div style={{ flex:1 }}>
                <DateRow label="康复日期（可选）" val={recov} setVal={setRecov}
                  refEl={recovRef} placeholder="选择康复日期"/>
              </div>
            </div>

            <div>
              <FTitle>治疗方案 / 备注</FTitle>
              <textarea value={plan} onChange={(e) => setPlan(e.target.value)}
                placeholder="治疗方案、医生建议、注意事项等..." rows={2}
                onFocus={onFocusGreen} onBlur={onBlurReset}
                style={{ ...INP, resize:"none" }}/>
            </div>
          </div>

          {/* 用药设置 */}
          <MedicineFields med={med} setMed={setMed}/>

          {err && <div style={{ color:"#D94040", fontSize:13, textAlign:"center" }}>❌ {err}</div>}

          <div style={{ display:"flex", gap:14 }}>
            <button onClick={onClose}
              style={{ flex:1, height:58, borderRadius:20, fontSize:17, fontWeight:800,
                       background:"rgba(255,255,255,0.75)", color:"#1F1F1F",
                       border:"1px solid rgba(138,123,106,0.16)", cursor:"pointer" }}>
              取消
            </button>
            <button onClick={handleSave} disabled={!canSave}
              style={{ flex:1, height:58, borderRadius:20, fontSize:17, fontWeight:800,
                       background: canSave ? `linear-gradient(135deg,${GREEN},#74C37B)` : "#D6D5D8",
                       color:"white", border:"none", cursor: canSave ? "pointer" : "default",
                       boxShadow: canSave ? "0 10px 20px rgba(95,167,102,0.22)" : "none" }}>
              {saving ? "保存中…" : "保存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══ DiseaseDetailSheet ══════════════════════════ */
function DiseaseDetailSheet({ disease: initD, pets, user, onClose, onDelete, onUpdated }) {
  const [d,          setD]          = useState(initD);
  const [showMenu,   setShowMenu]   = useState(false);
  const [editMedOpen, setEditMedOpen] = useState(false);

  const st     = DISEASE_STATUS[d.status] || DISEASE_STATUS.treating;
  const dPet   = pets.find((p) => p.id === d.pet_id) || null;
  const avatarSrc = dPet?.pet_avatar_thumb_url || dPet?.ai_avatar_url || null;
  const hasMed = !!d.medicine_name;

  const medRemindLabel = (() => {
    if (!d.medicine_reminder_time) return null;
    const t = fmtTime(d.medicine_reminder_time);
    if (isToday(d.medicine_end_date)) return `今天 ${t}`;
    return t;
  })();

  // mini timeline for this record
  const localTimeline = [
    { date: d.diagnosis_date, label:`诊断：${d.disease_name}`, icon:<Dog size={13} color={GREEN} strokeWidth={1.8}/> },
    ...(d.medicine_name && d.medicine_start_date ? [{ date: d.medicine_start_date, label:`开始用药：${d.medicine_name}`, icon:<Pill size={13} color={GREEN} strokeWidth={1.8}/> }] : []),
    ...(d.status === "recovered" && d.recovery_date ? [{ date: d.recovery_date, label:`康复：${d.disease_name}`, icon:<CircleCheck size={13} color={GREEN} strokeWidth={1.8}/> }] : []),
  ].sort((a,b) => (b.date||"").localeCompare(a.date||""));

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:1000,
               display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, background:"#ECEEE8",
                    borderRadius:"28px 28px 0 0", maxHeight:"92vh", overflowY:"auto",
                    paddingBottom:"env(safe-area-inset-bottom, 20px)" }}>
        <div style={{ display:"flex", justifyContent:"center", paddingTop:14, paddingBottom:4 }}>
          <div style={{ width:48, height:5, borderRadius:999, background:"#D0CFC9" }}/>
        </div>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", padding:"8px 16px 12px" }}>
          <button onClick={onClose}
            style={{ width:40, height:40, borderRadius:999, background:"rgba(255,255,255,0.6)",
                     border:"none", cursor:"pointer", display:"flex", alignItems:"center",
                     justifyContent:"center", flexShrink:0 }}>
            <ChevronLeft size={20} color={TEXT} strokeWidth={2.5}/>
          </button>
          <div style={{ flex:1, textAlign:"center", fontSize:15, fontWeight:800, color:TEXT }}>
            疾病记录详情
          </div>
          <div style={{ position:"relative" }}>
            <button onClick={() => setShowMenu(!showMenu)}
              style={{ width:40, height:40, borderRadius:999, background:"rgba(255,255,255,0.6)",
                       border:"none", cursor:"pointer", display:"flex", alignItems:"center",
                       justifyContent:"center", flexShrink:0 }}>
              <Ellipsis size={18} color={TEXT}/>
            </button>
            {showMenu && (
              <div style={{ position:"absolute", right:0, top:46, zIndex:100,
                            background:"white", borderRadius:14, padding:"6px 0",
                            boxShadow:"0 8px 24px rgba(0,0,0,0.12)", minWidth:120 }}>
                <button onClick={() => { setShowMenu(false); /* TODO: edit disease */ }}
                  style={{ width:"100%", padding:"12px 18px", textAlign:"left",
                           background:"transparent", border:"none", cursor:"pointer",
                           fontSize:14, fontWeight:600, color:TEXT,
                           display:"flex", alignItems:"center", gap:8 }}>
                  <Pencil size={15} color={SUB}/> 编辑
                </button>
                <div style={{ height:1, background:"rgba(0,0,0,0.06)", margin:"0 10px" }}/>
                <button onClick={() => { setShowMenu(false); onDelete(); }}
                  style={{ width:"100%", padding:"12px 18px", textAlign:"left",
                           background:"transparent", border:"none", cursor:"pointer",
                           fontSize:14, fontWeight:600, color:"#D94040",
                           display:"flex", alignItems:"center", gap:8 }}>
                  <PetTrashIcon size={16} active /> 删除
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding:"0 16px 28px", display:"flex", flexDirection:"column", gap:12 }}>

          {/* 主卡片 */}
          <div style={{ background:"rgba(255,255,255,0.62)", borderRadius:24, padding:"18px 20px",
                        boxShadow:"0 8px 24px rgba(0,0,0,0.06)", border:"1px solid rgba(255,255,255,0.65)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:56, height:56, borderRadius:999, flexShrink:0, overflow:"hidden",
                            background:"rgba(95,167,102,0.1)",
                            display:"flex", alignItems:"center", justifyContent:"center" }}>
                {avatarSrc ? (
                  <img src={avatarSrc} alt={dPet?.name}
                    style={{ width:"100%", height:"100%", objectFit:"cover",
                             display:"block", mixBlendMode:"multiply" }}/>
                ) : dPet ? (
                  <span style={{ fontSize:26 }}>{avatarForBreed(dPet.breed, dPet.pet_type)}</span>
                ) : (
                  <Dog size={28} color={GREEN} strokeWidth={1.4}/>
                )}
              </div>
              <div style={{ flex:1 }}>
                {dPet && <div style={{ fontSize:12, color:GREEN, fontWeight:700, marginBottom:3 }}>{dPet.name}</div>}
                <div style={{ fontSize:20, fontWeight:800, color:TEXT }}>{d.disease_name}</div>
                <span style={{ fontSize:12, fontWeight:700, padding:"3px 10px", borderRadius:999,
                               background:st.bg, color:st.color }}>
                  {st.label}
                </span>
              </div>
            </div>

            {/* 日期行 */}
            <div style={{ display:"flex", gap:10, marginTop:14 }}>
              {[
                { label:"诊断日期", val: fmtFull(d.diagnosis_date) || "未设置" },
                { label:"康复日期", val: d.recovery_date ? fmtFull(d.recovery_date) : "未设置" },
              ].map(({label,val}) => (
                <div key={label} style={{ flex:1, background:"rgba(236,238,232,0.6)",
                                          borderRadius:14, padding:"10px 12px" }}>
                  <div style={{ fontSize:10, color:SUB, marginBottom:3 }}>{label}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:TEXT }}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 症状 */}
          {d.symptoms && (
            <DetailCard title="症状描述">
              <div style={{ fontSize:14, color:TEXT, lineHeight:1.7 }}>{d.symptoms}</div>
            </DetailCard>
          )}

          {/* 状态说明 */}
          <DetailCard title="状态">
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:16, fontWeight:700, color:st.color }}>{st.label}</span>
              <span style={{ fontSize:12, color:SUB }}>
                {d.status === "treating"
                  ? "正在治疗中，请按时用药并观察宠物状态。"
                  : "宠物已恢复，建议继续观察饮食和精神状态。"}
              </span>
            </div>
          </DetailCard>

          {/* 治疗方案 */}
          {d.treatment_plan && (
            <DetailCard title="治疗方案 / 备注">
              <div style={{ fontSize:14, color:TEXT, lineHeight:1.7 }}>{d.treatment_plan}</div>
            </DetailCard>
          )}

          {/* 用药信息 */}
          <div style={{ background:"rgba(255,255,255,0.62)", borderRadius:24, padding:"16px 18px",
                        boxShadow:"0 6px 20px rgba(0,0,0,0.05)", border:"1px solid rgba(255,255,255,0.65)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <HTitle noMargin>用药信息</HTitle>
              <button onClick={() => setEditMedOpen(true)}
                style={{ fontSize:12, fontWeight:700, color:GREEN, background:"transparent",
                         border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                <Pencil size={12} color={GREEN}/> {hasMed ? "编辑用药" : "添加用药"}
              </button>
            </div>
            {hasMed ? (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {[
                  { l:"药物名称", v:d.medicine_name },
                  { l:"剂量",     v:d.medicine_dosage },
                  { l:"频率",     v:d.medicine_frequency },
                  { l:"用药周期", v: [fmtShort(d.medicine_start_date), fmtShort(d.medicine_end_date)].filter(Boolean).join(" - ") || null },
                  { l:"提醒时间", v: medRemindLabel },
                  { l:"提醒状态", v: d.medicine_reminder_enabled ? "已开启提醒" : "未开启提醒" },
                  { l:"用药备注", v: d.medicine_notes },
                ].filter(({v}) => v).map(({l,v}) => (
                  <div key={l} style={{ display:"flex", gap:10 }}>
                    <div style={{ fontSize:12, color:SUB, minWidth:64, paddingTop:2 }}>{l}</div>
                    <div style={{ fontSize:14, fontWeight:600, color:TEXT, flex:1 }}>{v}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign:"center", padding:"16px 0",
                            display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
                <Pill size={28} color="rgba(95,167,102,0.35)" strokeWidth={1.5}/>
                <div style={{ fontSize:13, color:"#9A9188" }}>还没有用药记录</div>
                <button onClick={() => setEditMedOpen(true)}
                  style={{ fontSize:13, fontWeight:700, color:GREEN, background:"transparent",
                           border:"none", cursor:"pointer" }}>
                  + 添加用药
                </button>
              </div>
            )}
          </div>

          {/* 相关记录时间线 */}
          {localTimeline.length > 0 && (
            <div style={{ background:"rgba(255,255,255,0.62)", borderRadius:24, padding:"16px 18px",
                          boxShadow:"0 6px 20px rgba(0,0,0,0.05)", border:"1px solid rgba(255,255,255,0.65)" }}>
              <HTitle>相关记录</HTitle>
              {localTimeline.map((item, i) => (
                <div key={i} style={{ display:"flex", gap:12, paddingBottom:12, position:"relative" }}>
                  {i < localTimeline.length - 1 && (
                    <div style={{ position:"absolute", left:11, top:24, bottom:0, width:2,
                                  background:"rgba(95,167,102,0.2)" }}/>
                  )}
                  <div style={{ width:24, height:24, borderRadius:999,
                                background:"rgba(95,167,102,0.12)",
                                flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", zIndex:1 }}>
                    {item.icon}
                  </div>
                  <div style={{ flex:1, paddingTop:3 }}>
                    <div style={{ fontSize:10, color:SUB, marginBottom:2 }}>{fmtFull(item.date)}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:TEXT }}>{item.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 关闭按钮 */}
          <button onClick={onClose}
            style={{ width:"100%", height:52, borderRadius:18,
                     background:`linear-gradient(135deg,${GREEN},#74C37B)`,
                     color:"white", border:"none", cursor:"pointer",
                     fontSize:16, fontWeight:700,
                     boxShadow:"0 8px 18px rgba(95,167,102,0.25)" }}>
            关闭
          </button>
        </div>
      </div>

      {/* 编辑用药弹窗 */}
      {editMedOpen && (
        <EditMedicationModal
          disease={d}
          user={user}
          onClose={() => setEditMedOpen(false)}
          onSaved={(updated) => { setD(updated); setEditMedOpen(false); onUpdated?.(updated); }}/>
      )}
    </div>
  );
}

function DetailCard({ title, children }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.62)", borderRadius:20, padding:"14px 18px",
                  boxShadow:"0 6px 20px rgba(0,0,0,0.05)", border:"1px solid rgba(255,255,255,0.65)" }}>
      <div style={{ fontSize:13, fontWeight:700, color:SUB, marginBottom:8 }}>{title}</div>
      {children}
    </div>
  );
}

/* ══ EditMedicationModal ════════════════════════ */
function EditMedicationModal({ disease: d, user, onClose, onSaved }) {
  const [med, setMed] = useState({
    name:            d.medicine_name             || "",
    dosage:          d.medicine_dosage           || "",
    frequency:       d.medicine_frequency        || "",
    startDate:       d.medicine_start_date       || "",
    endDate:         d.medicine_end_date         || "",
    time:            d.medicine_reminder_time ? String(d.medicine_reminder_time).slice(0,5) : "",
    reminderEnabled: !!d.medicine_reminder_enabled,
    notes:           d.medicine_notes           || "",
  });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState(null);

  const handleSave = async () => {
    setErr(null); setSaving(true);
    try {
      const updated = await updateDiseaseRecord(d.id, user.id, {
        medicine_name:             med.name     || null,
        medicine_dosage:           med.dosage   || null,
        medicine_frequency:        med.frequency || null,
        medicine_start_date:       med.startDate || null,
        medicine_end_date:         med.endDate   || null,
        medicine_reminder_time:    med.time      || null,
        medicine_reminder_enabled: med.reminderEnabled,
        medicine_notes:            med.notes    || null,
      });
      onSaved(updated);
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:1100,
               display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ width:"100%", maxWidth:430, background:"#ECEEE8",
                    borderRadius:"28px 28px 0 0", maxHeight:"88vh", overflowY:"auto",
                    paddingBottom:"env(safe-area-inset-bottom, 20px)" }}>
        <div style={{ display:"flex", justifyContent:"center", paddingTop:14, paddingBottom:8 }}>
          <div style={{ width:48, height:5, borderRadius:999, background:"#D0CFC9" }}/>
        </div>
        <div style={{ fontSize:18, fontWeight:800, color:TEXT, padding:"0 20px 16px" }}>
          {d.medicine_name ? "编辑用药信息" : "添加用药信息"}
        </div>
        <div style={{ padding:"0 16px 24px", display:"flex", flexDirection:"column", gap:14 }}>
          <MedicineFields med={med} setMed={setMed}/>
          {err && <div style={{ color:"#D94040", fontSize:13, textAlign:"center" }}>❌ {err}</div>}
          <div style={{ display:"flex", gap:12 }}>
            <button onClick={onClose}
              style={{ flex:1, height:54, borderRadius:18, fontSize:16, fontWeight:700,
                       background:"rgba(255,255,255,0.75)", color:TEXT,
                       border:"1px solid rgba(138,123,106,0.16)", cursor:"pointer" }}>
              取消
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex:1, height:54, borderRadius:18, fontSize:16, fontWeight:700,
                       background: saving ? "#D6D5D8" : `linear-gradient(135deg,${GREEN},#74C37B)`,
                       color:"white", border:"none", cursor: saving ? "default" : "pointer",
                       boxShadow: saving ? "none" : "0 8px 18px rgba(95,167,102,0.22)" }}>
              {saving ? "保存中…" : "保存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 旧的通用「新增健康记录」(AddRecordModal/Sheet/SLabel/iStyle) 已废弃，
   体检改用 CheckupRecordForm，疫苗/驱虫各自独立页面。 */
