/**
 * services/petDewormService.js
 *
 * 驱虫记录（pet_deworm_records 表）CRUD + 聚合派生。
 * type：internal=体内驱虫 / external=体外驱虫。
 */

import { supabase } from "@/lib/supabase";
import { dewormStatus, daysFromToday, VAX_STATUS } from "@/services/petHealthPlan";

function sb() {
  if (!supabase) throw new Error("Supabase 未初始化");
  return supabase;
}

/** 拉某只宠物的全部驱虫记录（按日期倒序） */
export async function listDewormRecords(petId) {
  if (!petId) return [];
  const { data, error } = await sb()
    .from("pet_deworm_records")
    .select("*")
    .eq("pet_id", petId)
    .order("done_date", { ascending: false });
  if (error) throw new Error(`获取驱虫记录失败: ${error.message}`);
  return data || [];
}

/** 新增一条驱虫记录 */
export async function addDewormRecord({
  userId, petId, dewormType, productName, productDesc, targetPests,
  doneDate, nextDueDate, note,
}) {
  if (!userId || !petId) throw new Error("addDewormRecord: 缺少 userId/petId");
  if (dewormType !== "internal" && dewormType !== "external")
    throw new Error("请选择驱虫类型");
  const { data, error } = await sb()
    .from("pet_deworm_records")
    .insert({
      user_id:       userId,
      pet_id:        petId,
      deworm_type:   dewormType,
      product_name:  productName?.trim() || null,
      product_desc:  productDesc?.trim() || null,
      target_pests:  targetPests?.trim() || null,
      done_date:     doneDate || new Date().toISOString().slice(0, 10),
      next_due_date: nextDueDate || null,
      note:          note?.trim() || null,
    })
    .select()
    .single();
  if (error) throw new Error(`添加驱虫记录失败: ${error.message}`);
  return data;
}

/** 删除一条驱虫记录（仅自己的） */
export async function deleteDewormRecord(id, userId) {
  if (!id || !userId) throw new Error("deleteDewormRecord: 缺少参数");
  const { error } = await sb()
    .from("pet_deworm_records")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(`删除失败: ${error.message}`);
}

/**
 * 聚合成总览/详情页所需结构。
 * 返回：
 * {
 *   internal: [recordsDesc], external: [recordsDesc],
 *   innerLast, innerNext, outerLast, outerNext,   // 最近一次 + 下次时间
 *   nextDate,            // 内外驱里最近的「下次时间」（用于总览顶卡）
 *   nextDays,            // nextDate 距今天数
 *   bothProtected,       // 内驱、外驱是否都在有效期内
 *   headline,            // 顶部状态大标题
 * }
 */
export function buildDewormOverview(records) {
  const rows = records || [];
  const internal = rows.filter((r) => r.deworm_type === "internal");
  const external = rows.filter((r) => r.deworm_type === "external");

  const latest = (arr) => (arr.length ? arr[0] : null); // 已按 done_date desc
  const innerLatest = latest(internal);
  const outerLatest = latest(external);

  const innerOk = innerLatest && dewormStatus(innerLatest).key !== "pending";
  const outerOk = outerLatest && dewormStatus(outerLatest).key !== "pending";
  const bothProtected = innerOk && outerOk;

  // 下次时间：所有未来 next_due_date 的最小值
  const today = new Date().toISOString().slice(0, 10);
  const futureNexts = rows
    .map((r) => r.next_due_date)
    .filter((d) => d && d >= today)
    .sort();
  const nextDate = futureNexts[0] || null;

  let headline = "暂无驱虫记录";
  if (bothProtected) headline = "体内外已驱虫";
  else if (innerOk && !outerOk) headline = "仅体内已驱虫";
  else if (!innerOk && outerOk) headline = "仅体外已驱虫";
  else if (rows.length > 0) headline = "驱虫待补";

  return {
    internal,
    external,
    innerLast: innerLatest?.done_date || null,
    innerNext: innerLatest?.next_due_date || null,
    outerLast: outerLatest?.done_date || null,
    outerNext: outerLatest?.next_due_date || null,
    nextDate,
    nextDays: daysFromToday(nextDate),
    bothProtected,
    headline,
  };
}

export { VAX_STATUS, dewormStatus };
