/**
 * ⚠️⚠️⚠️ 临时测试入口：免验证码直接登录 —— 【正式上线前必须删除本文件 + 登录页按钮】 ⚠️⚠️⚠️
 *
 * POST /api/auth/dev-login  { phone }
 * 输入手机号 → 取/建 public.users → 直接下发会话 cookie（不发短信、不校验验证码）。
 * 仅用于签名报备期间继续开发其它功能。无任何开关，任何人输手机号即可进入，切勿带上线。
 */
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
  if (!phone) return json(400, { error: "请输入正确的11位中国大陆手机号" });

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

  const cookie = sessionCookie(signSession(user.id));
  return json(200, { ok: true, userId: user.id }, { "Set-Cookie": cookie });
}
