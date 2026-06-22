/**
 * GET /api/auth/session
 * 读取 httpOnly 会话 cookie → 校验 → 返回 { userId }。
 * 作为启动时还原登录态的「权威凭证」（不再只信 localStorage）。
 */
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { readSessionToken, verifySession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(req: Request) {
  const session = verifySession(readSessionToken(req));
  if (!session) return json(401, { ok: false });

  // 校验用户仍存在
  if (supabaseAdmin) {
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", session.uid)
      .maybeSingle();
    if (!user) return json(401, { ok: false });
  }

  return json(200, { ok: true, userId: session.uid });
}
