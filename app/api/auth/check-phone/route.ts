/**
 * POST /api/auth/check-phone  { phone }
 * 登录页自动分流用：只读查询该手机号是否「已设置密码」。
 *   - 有密码  → 前端显示密码登录（优先密码，省短信）
 *   - 无密码 / 未注册 → 前端显示「获取验证码」按钮（验证码登录 / 注册）
 *
 * 安全：只返回 hasPassword，不区分「未注册」与「已注册但没密码」（缓解用户枚举）；
 *       不发短信、不下发会话 cookie、不暴露其它用户字段。
 */
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizePhone } from "@/lib/sms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: Request) {
  if (!supabaseAdmin) return json(500, { error: "服务未配置" });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "请求体解析失败" });
  }

  const phone = normalizePhone(body?.phone || "");
  if (!phone) return json(400, { error: "请输入正确的11位中国大陆手机号" });

  // 只取 password_hash 一列，最小暴露
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("password_hash")
    .eq("phone", phone)
    .maybeSingle();

  return json(200, { ok: true, hasPassword: !!(user && user.password_hash) });
}
