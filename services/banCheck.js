"use client";

/**
 * services/banCheck.js
 * 账号封禁校验（与禁言 muteCheck 并列、互相独立）。
 *  - 封禁中禁止：遛弯 / 上报友好·警示 / 社群发帖·评论 / 群聊发言；私聊与浏览不受影响。
 *  - banned_until 由 admin 在「用户封禁」Tab 或举报详情里设置；永久=年份≥2099。
 * 与项目现有架构一致（client 直连 + RLS USING(true)）。上报因走服务端，另在 API route 内硬校验。
 */

import { supabase } from "@/lib/supabase";

export async function assertNotBanned(userId) {
  if (!userId || !supabase) return;
  const { data } = await supabase.from("users").select("banned_until").eq("id", userId).maybeSingle();
  const bu = data?.banned_until ? new Date(data.banned_until) : null;
  if (bu && bu.getTime() > Date.now()) {
    if (bu.getFullYear() >= 2099) throw new Error("你的账号已被封禁，暂时无法使用该功能");
    const p = (n) => String(n).padStart(2, "0");
    throw new Error(`你的账号已被封禁至 ${bu.getFullYear()}-${p(bu.getMonth() + 1)}-${p(bu.getDate())}，暂时无法使用该功能`);
  }
}
