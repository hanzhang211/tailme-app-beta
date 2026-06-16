"use client";

/**
 * services/muteCheck.js
 * 发消息前检查用户是否被禁言（私聊/群聊共用）。禁言中则 throw，调用方 catch 后提示。
 * 与项目现有架构一致（client 直连 + RLS USING(true)），muted_until 由 admin 在聊天审核里设置。
 */

import { supabase } from "@/lib/supabase";

export async function assertNotMuted(userId) {
  if (!userId || !supabase) return;
  const { data } = await supabase.from("users").select("muted_until").eq("id", userId).maybeSingle();
  const mu = data?.muted_until ? new Date(data.muted_until) : null;
  if (mu && mu.getTime() > Date.now()) {
    if (mu.getFullYear() >= 2099) throw new Error("你已被禁言，暂时无法发送消息");
    const p = (n) => String(n).padStart(2, "0");
    throw new Error(`你已被禁言至 ${mu.getFullYear()}-${p(mu.getMonth() + 1)}-${p(mu.getDate())}，暂时无法发送消息`);
  }
}
