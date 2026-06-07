/**
 * /api/verify/upload — 认证图片上传（service_role → 私有 bucket user-verifications）
 *
 * 私有 bucket，anon 无任何权限：上传必须经此路由。前端逐张 POST（multipart）。
 * 返回 bucket 内的 path（非公开 URL）；读取另由 service_role 生成短期签名 URL。
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const BUCKET = "user-verifications";

export async function POST(req: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY 未配置" }, { status: 500 });
  }
  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: "请求格式错误" }, { status: 400 }); }

  const userId = form.get("userId");
  const file = form.get("file");
  if (!userId || typeof userId !== "string") return NextResponse.json({ error: "缺少 userId" }, { status: 400 });
  if (!(file instanceof Blob)) return NextResponse.json({ error: "缺少文件" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "图片不能超过 10MB" }, { status: 400 });
  if (!file.type?.startsWith("image/")) return NextResponse.json({ error: "请上传图片" }, { status: 400 });

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage.from(BUCKET)
    .upload(path, buf, { contentType: file.type, upsert: false, cacheControl: "3600" });
  if (error) return NextResponse.json({ error: `上传失败: ${error.message}` }, { status: 500 });

  return NextResponse.json({ path });
}
