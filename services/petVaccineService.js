/**
 * services/petVaccineService.js
 *
 * 疫苗接种记录（pet_vaccine_records 表）CRUD + 聚合派生。
 * 结构化：每针一条记录；总览/详情所需的「进度、下次补种、单项状态」由这里聚合。
 *
 * 不影响 petHealthService.js（疾病/用药/绝育疫苗 toggle）——那是独立的旧逻辑，保留不动。
 */

import { supabase } from "@/lib/supabase";
import { vaccinePlan, vaccineStatus, VAX_STATUS } from "@/services/petHealthPlan";

function sb() {
  if (!supabase) throw new Error("Supabase 未初始化");
  return supabase;
}

/** 拉某只宠物的全部疫苗记录（按疫苗、针次排序） */
export async function listVaccineRecords(petId) {
  if (!petId) return [];
  const { data, error } = await sb()
    .from("pet_vaccine_records")
    .select("*")
    .eq("pet_id", petId)
    .order("vaccine_code", { ascending: true })
    .order("dose_no", { ascending: true });
  if (error) throw new Error(`获取疫苗记录失败: ${error.message}`);
  return data || [];
}

/** 新增一条疫苗记录 */
export async function addVaccineRecord({
  userId, petId, vaccineGroup, vaccineCode, vaccineName,
  doseNo, doseDate, nextDueDate, note,
}) {
  if (!userId || !petId) throw new Error("addVaccineRecord: 缺少 userId/petId");
  if (!vaccineGroup || !vaccineCode || !vaccineName) throw new Error("请选择疫苗");
  const { data, error } = await sb()
    .from("pet_vaccine_records")
    .insert({
      user_id:       userId,
      pet_id:        petId,
      vaccine_group: vaccineGroup,
      vaccine_code:  vaccineCode,
      vaccine_name:  vaccineName,
      dose_no:       doseNo != null ? Number(doseNo) : null,
      dose_date:     doseDate || null,
      next_due_date: nextDueDate || null,
      note:          note?.trim() || null,
    })
    .select()
    .single();
  if (error) throw new Error(`添加疫苗记录失败: ${error.message}`);
  return data;
}

/** 删除一条疫苗记录（仅自己的） */
export async function deleteVaccineRecord(id, userId) {
  if (!id || !userId) throw new Error("deleteVaccineRecord: 缺少参数");
  const { error } = await sb()
    .from("pet_vaccine_records")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(`删除失败: ${error.message}`);
}

/**
 * 聚合成总览/详情页所需结构。
 * 返回：
 * {
 *   progress: { done, total },         // 接种进度 2/4
 *   nextDueDate: "2026-08-15" | null,  // 核心疫苗最近的下次补种
 *   core: { title, sectionTitle, sectionNote, subText, shortName, items:[{code,name,status,doses:[{dose_no,dose_date,next_due_date}],records}] },
 *   rabies: { sectionTitle, sectionNote, name, hint, status, records, lastDate, nextDate },
 * }
 */
export function buildVaccineOverview(records, petType) {
  const plan = vaccinePlan(petType);
  const rows = records || [];

  // 核心疫苗：按方案 code 顺序整理
  const coreItems = plan.core.vaccines.map((v) => {
    const recs = rows
      .filter((r) => r.vaccine_code === v.code)
      .sort((a, b) => (a.dose_no || 0) - (b.dose_no || 0));
    return {
      code: v.code,
      name: v.name,
      doses: recs.map((r) => ({
        dose_no: r.dose_no, dose_date: r.dose_date, next_due_date: r.next_due_date,
      })),
      records: recs,
      status: vaccineStatus(recs),
    };
  });

  // 进度：核心疫苗里「已打针数（有 dose_date）」 / 方案总针数
  const doneDoses = rows.filter(
    (r) => r.vaccine_group === "core" && r.dose_date
  ).length;
  const total = plan.core.totalDoses;
  const progress = { done: Math.min(doneDoses, total), total };

  // 下次补种：核心疫苗未来 next_due_date 的最小值
  const today = new Date().toISOString().slice(0, 10);
  const futureNexts = rows
    .filter((r) => r.vaccine_group === "core" && r.next_due_date && r.next_due_date >= today)
    .map((r) => r.next_due_date)
    .sort();
  const nextDueDate = futureNexts[0] || null;

  // 狂犬
  const rabiesRecs = rows
    .filter((r) => r.vaccine_group === "rabies")
    .sort((a, b) => (a.dose_no || 0) - (b.dose_no || 0));
  const rabiesDates = rabiesRecs.map((r) => r.dose_date).filter(Boolean).sort();
  const rabiesNexts = rabiesRecs.map((r) => r.next_due_date).filter(Boolean).sort();

  return {
    progress,
    nextDueDate,
    core: {
      title: plan.core.title,
      sectionTitle: plan.core.sectionTitle,
      sectionNote: plan.core.sectionNote,
      subText: plan.core.subText,
      shortName: plan.core.shortName,
      items: coreItems,
    },
    rabies: {
      sectionTitle: plan.rabies.sectionTitle,
      sectionNote: plan.rabies.sectionNote,
      name: plan.rabies.name,
      hint: plan.rabies.hint,
      code: plan.rabies.code,
      status: vaccineStatus(rabiesRecs),
      records: rabiesRecs,
      lastDate: rabiesDates[rabiesDates.length - 1] || null,
      nextDate: rabiesNexts[rabiesNexts.length - 1] || null,
    },
  };
}

/**
 * 把疫苗记录聚合成「遛弯名片」展示用的两个状态：
 *  - rabiesDone：狂犬是否已接种（rabies 组有任一已接种记录）
 *  - coreComplete：核心疫苗是否齐全（狗瘟/细小/腺病毒 或 猫瘟/鼻支/杯状 —— 3 种核心各接种过 ≥1 针）
 * 注：狗猫核心疫苗都是 3 种，阈值通用，无需 pet_type。
 */
export function summarizeWalkVaccine(records) {
  const rows = records || [];
  const rabiesDone = rows.some((r) => r.vaccine_group === "rabies" && r.dose_date);
  const coreCodes = new Set(
    rows.filter((r) => r.vaccine_group === "core" && r.dose_date).map((r) => r.vaccine_code)
  );
  const coreComplete = coreCodes.size >= 3;
  return { rabiesDone, coreComplete };
}

/**
 * 批量查询多只宠物的疫苗状态，返回 { petId: { rabiesDone, coreComplete } }。
 * 用于遛弯「附近狗友」一次性拿到所有人的真实疫苗状态（一条 in 查询）。
 */
export async function getWalkVaccineMap(petIds) {
  const ids = Array.from(new Set((petIds || []).filter(Boolean)));
  if (ids.length === 0) return {};
  const { data, error } = await sb()
    .from("pet_vaccine_records")
    .select("pet_id,vaccine_group,vaccine_code,dose_date")
    .in("pet_id", ids);
  if (error) throw new Error(`获取疫苗状态失败: ${error.message}`);
  const byPet = {};
  for (const r of data || []) (byPet[r.pet_id] = byPet[r.pet_id] || []).push(r);
  const out = {};
  for (const id of ids) out[id] = summarizeWalkVaccine(byPet[id] || []);
  return out;
}

export { VAX_STATUS };
