/**
 * POST /api/auth/set-password  { password }
 * 由 verify-code 下发的会话 cookie 授权（手机号已验证）。
 * bcrypt hash 写入 public.users.password_hash，并刷新会话 cookie。
 * 用于「首次创建密码」与「忘记密码重设」两种场景。
 */
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { readSessionToken, verifySession, signSession, sessionCookie } from "@/lib/session";

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

  const session = verifySession(readSessionToken(req));
  if (!session) return json(401, { error: "登录已失效，请重新验证手机号" });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "请求体解析失败" });
  }

  const password = String(body?.password || "");
  if (password.length < 6) return json(400, { error: "密码至少 6 位" });

  const passwordHash = await bcrypt.hash(password, 10);
  const { error: updErr } = await supabaseAdmin
    .from("users")
    .update({ password_hash: passwordHash })
    .eq("id", session.uid);
  if (updErr) {
    console.error("[set-password] 更新失败:", updErr.message);
    return json(500, { error: "密码设置失败，请重试" });
  }

  // 刷新会话
  const cookie = sessionCookie(signSession(session.uid));
  return json(200, { ok: true, userId: session.uid }, { "Set-Cookie": cookie });
}
