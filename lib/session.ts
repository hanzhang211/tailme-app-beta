/**
 * lib/session.ts —— 自建登录会话（无状态签名 cookie，服务端专用）
 *
 * cookie 名：tailme_session
 * token 结构：base64url(payload{uid,exp}) + "." + base64url(HMAC-SHA256(payload, SECRET))
 * 签名密钥：优先 SESSION_SECRET；未配置时回退 SUPABASE_SERVICE_ROLE_KEY（两者皆为服务端高熵密钥）。
 * httpOnly + Secure + SameSite=Lax —— 不依赖 localStorage 作为登录凭证。
 */
import crypto from "crypto";

export const SESSION_COOKIE = "tailme_session";
const MAX_AGE_DAYS = 30;

function secret(): string {
  return process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function hmac(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** 生成会话 token */
export function signSession(uid: string, days = MAX_AGE_DAYS): string {
  const exp = Math.floor(Date.now() / 1000) + days * 86400;
  const payload = Buffer.from(JSON.stringify({ uid, exp })).toString("base64url");
  return `${payload}.${hmac(payload)}`;
}

/** 校验会话 token，返回 { uid } 或 null */
export function verifySession(token?: string | null): { uid: string } | null {
  if (!token || !token.includes(".") || !secret()) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = hmac(payload);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  let data: any;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
  if (!data?.uid || !data?.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
  return { uid: String(data.uid) };
}

/** 从请求 Cookie 头读取会话 token */
export function readSessionToken(req: Request): string | null {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

/** 登录 cookie（写入） */
export function sessionCookie(token: string, days = MAX_AGE_DAYS): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${days * 86400}`;
}

/** 登出 cookie（清除） */
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
