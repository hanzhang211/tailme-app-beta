import { createClient } from "@supabase/supabase-js";

/**
 * 服务端专用 Supabase 客户端（service_role key 绕过 RLS）。
 * 绝对不能 import 进 "use client" 文件，只在 app/api/**\/route.ts 中使用。
 *
 * env：
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (没有 NEXT_PUBLIC_ 前缀，仅服务端可读)
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !serviceKey) {
  // 不抛错（避免 build 时炸），但 runtime 调用会拿到 undefined client
  console.warn(
    "[supabaseAdmin] 缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY"
  );
}

export const supabaseAdmin = url && serviceKey
  ? createClient(url, serviceKey, { auth: { persistSession: false } })
  : null;
