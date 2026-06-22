/**
 * POST /api/auth/send-code  { phone }
 * 生成 6 位验证码（5 分钟有效）→ bcrypt hash 存 auth_phone_codes → 阿里云发送。
 * 频控：同一手机号 60 秒内不可重复获取。
 */
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizePhone, sendVerifyCode } from "@/lib/sms";

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

  // 频控：最近一条 60s 内则拒绝
  const since = new Date(Date.now() - 60 * 1000).toISOString();
  const { data: recent } = await supabaseAdmin
    .from("auth_phone_codes")
    .select("id")
    .eq("phone", phone)
    .gte("created_at", since)
    .limit(1);
  if (recent && recent.length > 0) {
    return json(429, { error: "验证码发送过于频繁，请稍后再试" });
  }

  // 生成 6 位验证码 + hash 入库
  const code = String(crypto.randomInt(100000, 1000000));
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const { error: insErr } = await supabaseAdmin.from("auth_phone_codes").insert({
    phone,
    code_hash: codeHash,
    expires_at: expiresAt,
    used: false,
  });
  if (insErr) {
    console.error("[send-code] 入库失败:", insErr.message);
    return json(500, { error: "验证码生成失败，请重试" });
  }

  // 阿里云发送
  const sent = await sendVerifyCode(phone, code);
  if (!sent.ok) {
    return json(502, { error: "短信发送失败，请稍后重试" });
  }

  return json(200, { ok: true });
}
