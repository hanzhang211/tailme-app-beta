/**
 * services/petExpenseService.js
 *
 * 宠物记账 CRUD + 月度/年度统计。
 */

import { supabase } from "@/lib/supabase";

function sb() {
  if (!supabase) throw new Error("Supabase 未初始化");
  return supabase;
}

export const EXPENSE_CATEGORIES = [
  "疫苗", "驱虫药", "体检", "看病/医疗", "绝育",
  "洗澡美容", "狗粮/猫粮", "零食", "玩具", "用品",
  "牵引绳/衣服", "保险", "寄养/托管", "训练课程", "其他",
];

/** 按时间倒序列出记账 */
export async function listExpenses(userId, { limit = 200 } = {}) {
  if (!userId) return [];
  const { data, error } = await sb().from("pet_expenses")
    .select(`
      id, amount, category, note, expense_date, created_at,
      user_id, pet_id,
      pet:pets!pet_id ( name, breed )
    `)
    .eq("user_id", userId)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`获取记账失败: ${error.message}`);
  return data || [];
}

/** 添加一笔记账 */
export async function addExpense({ userId, petId, amount, category, note, expenseDate }) {
  if (!userId) throw new Error("addExpense: 缺少 userId");
  const n = parseFloat(amount);
  if (!isFinite(n) || n < 0) throw new Error("金额必须是非负数");
  if (!category) throw new Error("请选择分类");

  const { data, error } = await sb().from("pet_expenses")
    .insert({
      user_id:      userId,
      pet_id:       petId || null,
      amount:       n,
      category,
      note:         note?.trim() || null,
      expense_date: expenseDate || new Date().toISOString().slice(0, 10),
    })
    .select(`
      id, amount, category, note, expense_date, created_at,
      user_id, pet_id,
      pet:pets!pet_id ( name, breed )
    `)
    .single();
  if (error) throw new Error(`添加记账失败: ${error.message}`);
  return data;
}

/** 删除一笔记账（仅自己的） */
export async function deleteExpense(id, userId) {
  if (!id || !userId) throw new Error("deleteExpense: 缺少参数");
  const { error } = await sb().from("pet_expenses")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(`删除失败: ${error.message}`);
}

/** 本月总花费（按 expense_date 月份） */
export async function getMonthlyTotal(userId, monthOffset = 0) {
  if (!userId) return 0;
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1 + monthOffset;
  const startDate = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
  const endDate   = new Date(Date.UTC(y, m,     1)).toISOString().slice(0, 10);

  const { data, error } = await sb().from("pet_expenses")
    .select("amount")
    .eq("user_id", userId)
    .gte("expense_date", startDate)
    .lt("expense_date", endDate);
  if (error) throw new Error(`查询月度总额失败: ${error.message}`);
  return (data || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
}

/** 今年总花费 */
export async function getYearlyTotal(userId) {
  if (!userId) return 0;
  const y = new Date().getFullYear();
  const startDate = `${y}-01-01`;
  const endDate   = `${y + 1}-01-01`;

  const { data, error } = await sb().from("pet_expenses")
    .select("amount")
    .eq("user_id", userId)
    .gte("expense_date", startDate)
    .lt("expense_date", endDate);
  if (error) throw new Error(`查询年度总额失败: ${error.message}`);
  return (data || []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
}

/** 按分类聚合本月（用于简单饼图/列表） */
export async function getMonthlyByCategory(userId) {
  if (!userId) return {};
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
  const endDate = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);

  const { data, error } = await sb().from("pet_expenses")
    .select("category, amount")
    .eq("user_id", userId)
    .gte("expense_date", startDate)
    .lt("expense_date", endDate);
  if (error) throw new Error(`分类统计失败: ${error.message}`);
  const agg = {};
  (data || []).forEach((r) => {
    agg[r.category] = (agg[r.category] || 0) + Number(r.amount || 0);
  });
  return agg;
}
