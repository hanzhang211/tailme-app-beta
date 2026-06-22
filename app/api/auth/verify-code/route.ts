/**
 * POST /api/auth/verify-code  { phone, code }
 * 校验验证码 → 取/建 public.users 行 → 下发 httpOnly 会话 cookie（手机号已验证）。
 * 返回 status：
 *   "login"         —— 已有用户且已设密码（前端直接进首页）
 *   "need_password" —— 新用户 / 未设密码（前端引导创建密码；cookie 已下发用于授权 set-password）
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
  const code = String(body?.code || "").trim();
  if (!phone) return json(400, { error: "手机号格式错误" });
  if (!/^\d{6}$/.test(code)) return json(400, { error: "请输入6位验证码" });

  // 取该手机号最新一条「未用 + 未过期」验证码
  const { data: rows, error: selErr } = await supabaseAdmin
    .from("auth_phone_codes")
    .select("*")
    .eq("phone", phone)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1);
  if (selErr) return json(500, { error: "验证失败，请重试" });

  const row = rows?.[0];
  if (!row) return json(400, { error: "验证码错误或已过期，请重新获取" });

  const match = await bcrypt.compare(code, row.code_hash);
  if (!match) return json(400, { error: "验证码错误或已过期，请重新获取" });

  // 标记已用（防重放）
  await supabaseAdmin.from("auth_phone_codes").update({ used: true }).eq("id", row.id);

  // 取 / 建用户
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  let user = existing;
  if (!user) {
    const { data: created, error: insErr } = await supabaseAdmin
      .from("users")
      .insert({ phone, created_at: new Date().toISOString() })
      .select()
      .single();
    if (insErr) {
      // 并发兜底
      const { data: retried } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("phone", phone)
        .single();
      user = retried;
    } else {
      user = created;
    }
  }
  if (!user) return json(500, { error: "用户创建失败，请重试" });

  const hasPassword = !!user.password_hash;
  // 手机号已验证 → 下发会话 cookie（need_password 时用于授权 set-password）
  const cookie = sessionCookie(signSession(user.id));

  return json(
    200,
    { ok: true, status: hasPassword ? "login" : "need_password", userId: user.id },
    { "Set-Cookie": cookie }
  );
}
