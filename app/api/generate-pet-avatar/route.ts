/**
 * POST /api/generate-pet-avatar
 *
 * Body: { userId: uuid, petId: uuid, photoUrl: string }
 *
 * 流程：
 *  1. 校验入参（无 Auth：上线前迁 Supabase Auth）
 *  2. 调 Replicate flux-kontext-pro，输入 photoUrl + prompt，等待生成（Prefer: wait）
 *  3. 若仍未完成则轮询 prediction id 直到 succeeded / failed / 超时
 *  4. 下载 Replicate 输出图，上传到 Supabase Storage pet-avatars/<userId>/<petId>/ai-*.png
 *  5. 返回 public URL
 *
 * 环境变量：
 *  - REPLICATE_API_TOKEN
 *  - NEXT_PUBLIC_SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// 单次生成可能 30-60s，给函数足够时间
export const maxDuration = 90;

const REPLICATE_MODEL = "black-forest-labs/flux-kontext-pro";

// 风格只管「写实 3D 渲染」，背景由后续 rembg 抠图负责，不再用 sticker/transparent 等词
const BASE_REQUIREMENTS = [
  "Requirements:",
  "- preserve the original pet's fur color, face shape, ears, and expression",
  "- soft Pixar-style 3D rendering",
  "- realistic detailed 3D render with soft volumetric lighting and fluffy fur",
  "- centered composition",
  "- full body pet character",
  "- simple clean plain background",
  "- app icon style",
  "- adorable and premium",
  "- no text",
  "- no human",
  "- no extra objects",
  "- symmetrical face",
  "- rounded cute proportions",
  "- suitable for a mobile app pet profile avatar",
  "",
  "Style:",
  "minimal, soft lighting, high detail, kawaii, polished 3D mascot icon",
].join("\n");

const DOG_PROMPT = [
  "Create a cute 3D chibi dog avatar icon based on the uploaded dog photo.",
  BASE_REQUIREMENTS,
].join("\n");

const CAT_PROMPT = [
  "Create a cute 3D chibi cat avatar icon based on the uploaded cat photo.",
  "- emphasize the cat's unique ear shape, whiskers, and eye color",
  "- capture the cat's elegant and mysterious charm",
  BASE_REQUIREMENTS,
].join("\n");

function getPrompt(petType?: string) {
  return petType === "cat" ? CAT_PROMPT : DOG_PROMPT;
}

async function callReplicate(photoUrl: string, token: string, petType?: string) {
  const createResp = await fetch(
    `https://api.replicate.com/v1/models/${REPLICATE_MODEL}/predictions`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type":  "application/json",
        "Prefer":        "wait=60",
      },
      body: JSON.stringify({
        input: {
          prompt:             getPrompt(petType),
          input_image:        photoUrl,
          aspect_ratio:       "1:1",
          output_format:      "png",
          safety_tolerance:   2,
          prompt_upsampling:  true,
        },
      }),
    }
  );

  if (!createResp.ok) {
    const text = await createResp.text();
    throw new Error(`Replicate 调用失败 (${createResp.status}): ${text.slice(0, 200)}`);
  }
  let prediction: any = await createResp.json();

  // Prefer:wait 通常已经返回结果；超时则继续轮询
  const start = Date.now();
  while (
    prediction.status !== "succeeded" &&
    prediction.status !== "failed" &&
    prediction.status !== "canceled" &&
    Date.now() - start < 75_000
  ) {
    await new Promise((r) => setTimeout(r, 2500));
    const pollResp = await fetch(
      `https://api.replicate.com/v1/predictions/${prediction.id}`,
      { headers: { "Authorization": `Bearer ${token}` } }
    );
    if (!pollResp.ok) throw new Error(`轮询失败: ${pollResp.status}`);
    prediction = await pollResp.json();
  }

  if (prediction.status !== "succeeded" || !prediction.output) {
    throw new Error(`生成失败：${prediction.status || "timeout"}${
      prediction.error ? " · " + prediction.error : ""
    }`);
  }

  // output 可能是字符串或字符串数组
  const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  if (!url) throw new Error("Replicate 未返回图片 URL");
  return String(url);
}

// 抠图去背景，输出透明 PNG URL。
// 用 men1scus/birefnet 抠图：和原来 851-labs 同为 BiRefNet 算法（质量同级），
// 但跑在 A100、~2s、约 $0.0025/张 —— 比 bria 便宜约 10 倍，速度/质量基本不变。
// 社区模型不支持 /v1/models/<owner>/<name> 端点，必须用 /v1/predictions + version hash。
const REMBG_VERSION = "f74986db0355b58403ed20963af156525e2891ea3c2d499bfbfb2a28cd87c5d7";
async function callRembg(imageUrl: string, token: string) {
  const resp = await fetch(
    `https://api.replicate.com/v1/predictions`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type":  "application/json",
        "Prefer":        "wait=55",
      },
      body: JSON.stringify({
        version: REMBG_VERSION,
        input: { image: imageUrl },
      }),
    }
  );
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`抠图调用失败 (${resp.status}): ${text.slice(0, 160)}`);
  }
  let prediction: any = await resp.json();
  const start = Date.now();
  while (
    prediction.status !== "succeeded" &&
    prediction.status !== "failed" &&
    prediction.status !== "canceled" &&
    Date.now() - start < 55_000
  ) {
    await new Promise((r) => setTimeout(r, 1200));
    const poll = await fetch(
      `https://api.replicate.com/v1/predictions/${prediction.id}`,
      { headers: { "Authorization": `Bearer ${token}` } }
    );
    if (!poll.ok) throw new Error(`抠图轮询失败: ${poll.status}`);
    prediction = await poll.json();
  }
  if (prediction.status !== "succeeded" || !prediction.output) {
    throw new Error(`抠图失败：${prediction.status || "timeout"}`);
  }
  const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  if (!url) throw new Error("抠图未返回图片 URL");
  return String(url);
}

export async function POST(req: Request) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "REPLICATE_API_TOKEN 未配置" }, { status: 500 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY 未配置" }, { status: 500 });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "请求体格式错误" }, { status: 400 }); }

  const { userId, petId, photoUrl, petType } = body || {};
  if (!userId || !petId || !photoUrl) {
    return NextResponse.json({ error: "缺少 userId / petId / photoUrl" }, { status: 400 });
  }
  // 校验 photoUrl 是 http(s)（Replicate 接受 URL 输入）
  if (!/^https?:\/\//i.test(photoUrl)) {
    return NextResponse.json({ error: "photoUrl 必须是 http(s) URL" }, { status: 400 });
  }

  // 简单校验用户存在（MVP：暂不强校验 ownership；上线前迁 Auth）
  const { data: u, error: uErr } = await supabaseAdmin
    .from("users").select("id").eq("id", userId).maybeSingle();
  if (uErr || !u) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  // 1) 调 Replicate
  let replicateUrl: string;
  try {
    replicateUrl = await callReplicate(photoUrl, token, petType);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "生成失败" }, { status: 502 });
  }

  // 1.5) 抠图：把生成图背景去掉，输出透明 PNG（失败则回退原图，不中断生成）
  let finalImageUrl = replicateUrl;
  try {
    finalImageUrl = await callRembg(replicateUrl, token);
  } catch (e: any) {
    console.error("rembg 抠图失败，回退原图:", e?.message);
  }

  // 2) 下载最终图（透明图或回退原图）
  const imgResp = await fetch(finalImageUrl);
  if (!imgResp.ok) {
    return NextResponse.json({ error: "下载生成图失败" }, { status: 502 });
  }
  const arrayBuf = await imgResp.arrayBuffer();
  const bytes    = new Uint8Array(arrayBuf);

  // 3) 上传到 Supabase Storage（service_role 绕过 RLS）
  // 用时间戳路径：每次生成 URL 都不同，避免 CDN 缓存导致"重新生成却显示旧图"
  const path = `${userId}/${petId}/ai-${Date.now()}.png`;
  const { error: upErr } = await supabaseAdmin.storage
    .from("pet-avatars")
    .upload(path, bytes, {
      contentType: "image/png",
      cacheControl: "86400",
      upsert: false,
    });
  if (upErr) {
    return NextResponse.json({ error: `保存失败: ${upErr.message}` }, { status: 500 });
  }

  const { data: pub } = supabaseAdmin.storage.from("pet-avatars").getPublicUrl(path);
  if (!pub?.publicUrl) {
    return NextResponse.json({ error: "获取 public URL 失败" }, { status: 500 });
  }

  // 生成 300×300 WebP 缩略图 URL（Supabase Storage Image Transform）
  const { data: thumb } = supabaseAdmin.storage.from("pet-avatars").getPublicUrl(path, {
    transform: { width: 300, height: 300, resize: "cover", format: "webp", quality: 80 },
  });

  return NextResponse.json({ aiUrl: pub.publicUrl, thumbUrl: thumb?.publicUrl ?? null });
}
