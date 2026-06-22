/**
 * POST /api/auth/login  { phone, password }
 * 手机号 + 密码登录（bcrypt.compare）→ 下发 httpOnly 会话 cookie。
 */
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizePhone } from "@/lib/sms";
import { signSession, sessionCookie } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(status: number, body: any, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
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
  const password = String(body?.password || "");
  if (!phone) return json(400, { error: "请输入正确的11位中国大陆手机号" });
  if (password.length < 6) return json(400, { error: "密码至少 6 位" });

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  // 统一错误文案，避免暴露「手机号是否注册」
  if (!user || !user.password_hash) {
    return json(400, { error: "手机号或密码错误（若未设置过密码，请用验证码登录）" });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return json(400, { error: "手机号或密码错误（若未设置过密码，请用验证码登录）" });

  const cookie = sessionCookie(signSession(user.id));
  return json(200, { ok: true, userId: user.id }, { "Set-Cookie": cookie });
}
