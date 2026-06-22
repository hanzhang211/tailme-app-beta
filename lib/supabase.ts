import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * 全局 anon client，仅用于业务数据读写（社群 / 私聊 / 商城 / 地图 / AI 等）。
 * 登录认证不再依赖 Supabase Auth —— 改为自建（阿里云短信验证码 + /api/auth/* + httpOnly cookie）。
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
