/**
 * POST /api/memorial-cards/generate
 *
 * 【爪爪星球 · 今日的它】用火山方舟 Doubao Seedream 5.0 lite 为某宠物生成 1 张纪念卡片，
 * 并压成 1280×720 WebP 存 Supabase Storage（pet-avatars/memorial-cards/...），写入 memorial_planet_cards。
 *
 * 一次只生成 1 张（按 cardType）：前端逐张并发调用 8 次，规避 serverless 执行时长上限、单张可独立重试。
 *
 * Body: { petId: uuid, userId?: uuid, cardType: string }   cardType ∈ CARD_TYPES（8 种）
 * 成功: { cardType, imageUrl, status: 'done', cached? }
 * 失败: { error }（HTTP 4xx/5xx；同时把该卡 status 置 failed + error，便于排查/重试）
 *
 * 已生成（status='done' 且有 image_url）→ 直接复用，不重复调用、不重复计费。
 *
 * 环境变量（仅服务端）：
 *   ARK_API_KEY              火山方舟 API Key（Authorization: Bearer）
 *   DOUBAO_IMAGE_MODEL       图片模型，默认 doubao-seedream-5-0-260128
 *   DOUBAO_IMAGE_API_URL     默认 https://ark.cn-beijing.volces.com/api/v3/images/generations
 *   NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY（经 lib/supabaseAdmin）
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildCardPrompt, IMAGE_SIZE, CARD_TYPES } from "@/lib/memorialCardPrompts";

// 单张生成（火山生图 + 下载 + 上传）可能 ~10-40s，给足时间
export const maxDuration = 60;

const ARK_URL =
  process.env.DOUBAO_IMAGE_API_URL || "https://ark.cn-beijing.volces.com/api/v3/images/generations";
const ARK_MODEL = process.env.DOUBAO_IMAGE_MODEL || "doubao-seedream-5-0-260128";
const BUCKET = "pet-avatars"; // 复用现有公开 bucket，路径前缀 memorial-cards/

/** 把某张卡标记为失败（行此前已 upsert 为 pending，故用 update，避免覆盖 user_id 等已有列）。 */
async function markFailed(petId: string, cardType: string, msg: string) {
  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin
      .from("memorial_planet_cards")
      .update({ status: "failed", error: String(msg).slice(0, 300), updated_at: new Date().toISOString() })
      .eq("pet_id", petId)
      .eq("card_type", cardType);
  } catch {
    /* 记录失败本身失败则忽略 */
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ARK_API_KEY 未配置" }, { status: 500 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY 未配置" }, { status: 500 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  const petId: string = body?.petId;
  const userId: string | null = body?.userId || null;
  const cardType: string = body?.cardType;
  if (!petId || !cardType) {
    return NextResponse.json({ error: "缺少 petId / cardType" }, { status: 400 });
  }
  if (!CARD_TYPES.includes(cardType)) {
    return NextResponse.json({ error: "cardType 非法" }, { status: 400 });
  }

  // 1) 取宠物参考图（AI 形象优先，回退原始照片）；都没有则纯文生图（保证不报错，但一致性会差）
  const { data: pet, error: petErr } = await supabaseAdmin
    .from("pets")
    .select("id, user_id, ai_avatar_url, original_photo_url")
    .eq("id", petId)
    .maybeSingle();
  if (petErr || !pet) {
    return NextResponse.json({ error: "宠物不存在" }, { status: 404 });
  }
  const ownerId: string | null = userId || pet.user_id || null;
  const refUrl: string | null = pet.ai_avatar_url || pet.original_photo_url || null;

  // 2) 已生成则直接复用（不重复生成、不重复计费）
  const { data: existing } = await supabaseAdmin
    .from("memorial_planet_cards")
    .select("status, image_url")
    .eq("pet_id", petId)
    .eq("card_type", cardType)
    .maybeSingle();
  if (existing?.status === "done" && existing.image_url) {
    return NextResponse.json({ cardType, imageUrl: existing.image_url, status: "done", cached: true });
  }

  // 3) 标记 pending（前端据此显示「生成中」）
  await supabaseAdmin.from("memorial_planet_cards").upsert(
    {
      pet_id: petId,
      user_id: ownerId,
      card_type: cardType,
      status: "pending",
      error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "pet_id,card_type" }
  );

  // 4) 调火山 Seedream（含宠物参考图，size 2560×1440 满足最小像素，watermark 关闭）
  const arkBody: any = {
    model: ARK_MODEL,
    prompt: buildCardPrompt(cardType),
    size: IMAGE_SIZE,
    response_format: "url",
    watermark: false,
  };
  if (refUrl) arkBody.image = [refUrl]; // Seedream 参考图为数组（支持 1-14 张；第一版传宠物参考图 1 张）

  let genUrl = "";
  let genB64 = "";
  try {
    const resp = await fetch(ARK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(arkBody),
    });
    const raw = await resp.text();
    if (!resp.ok) {
      console.error("[memorial-cards] 火山 HTTP 非 2xx:", resp.status, raw.slice(0, 800));
      await markFailed(petId, cardType, `火山 ${resp.status}: ${raw.slice(0, 200)}`);
      return NextResponse.json({ error: "图片生成失败，请稍后重试" }, { status: 502 });
    }
    let data: any = null;
    try {
      data = JSON.parse(raw);
    } catch {
      /* 非 JSON */
    }
    const item = data?.data?.[0];
    genUrl = item?.url || "";
    genB64 = item?.b64_json || "";
    if (!genUrl && !genB64) {
      console.error("[memorial-cards] 火山未返回图片:", raw.slice(0, 800));
      await markFailed(petId, cardType, "火山未返回图片");
      return NextResponse.json({ error: "图片生成失败，请稍后重试" }, { status: 502 });
    }
  } catch (e: any) {
    console.error("[memorial-cards] 调用火山异常:", e?.message || e);
    await markFailed(petId, cardType, e?.message || "调用火山异常");
    return NextResponse.json({ error: "图片生成失败，请稍后重试" }, { status: 502 });
  }

  // 5) 下载生成图为字节
  let bytes: Uint8Array | null = null;
  let contentType = "image/png";
  try {
    if (genUrl) {
      const imgResp = await fetch(genUrl);
      if (!imgResp.ok) throw new Error(`下载生成图失败 ${imgResp.status}`);
      contentType = imgResp.headers.get("content-type") || "image/png";
      bytes = new Uint8Array(await imgResp.arrayBuffer());
    } else {
      bytes = new Uint8Array(Buffer.from(genB64, "base64"));
    }
  } catch (e: any) {
    console.error("[memorial-cards] 下载生成图失败:", e?.message || e);
    await markFailed(petId, cardType, e?.message || "下载生成图失败");
    return NextResponse.json({ error: "图片下载失败，请稍后重试" }, { status: 502 });
  }
  if (!bytes || bytes.byteLength === 0) {
    await markFailed(petId, cardType, "生成图为空");
    return NextResponse.json({ error: "图片下载失败，请稍后重试" }, { status: 502 });
  }

  // 6) 上传原图到 Storage（时间戳路径，避免 CDN 缓存「重新生成仍显旧图」）
  const ext = contentType.includes("webp") ? "webp" : contentType.includes("jpeg") ? "jpg" : "png";
  const path = `memorial-cards/${ownerId || "anon"}/${petId}/${cardType}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType, cacheControl: "86400", upsert: false });
  if (upErr) {
    console.error("[memorial-cards] 上传 Storage 失败:", upErr.message);
    await markFailed(petId, cardType, `上传失败: ${upErr.message}`);
    return NextResponse.json({ error: `保存失败: ${upErr.message}` }, { status: 500 });
  }

  // 7) 成品图 = 1280×720 WebP（Supabase Image Transform；和 AI 头像同款做法）
  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path, {
    transform: { width: 1280, height: 720, resize: "cover", format: "webp", quality: 80 },
  });
  const imageUrl = pub?.publicUrl;
  if (!imageUrl) {
    await markFailed(petId, cardType, "获取成品 URL 失败");
    return NextResponse.json({ error: "获取图片 URL 失败" }, { status: 500 });
  }

  // 8) 写入 done
  const { error: dbErr } = await supabaseAdmin.from("memorial_planet_cards").upsert(
    {
      pet_id: petId,
      user_id: ownerId,
      card_type: cardType,
      image_url: imageUrl,
      storage_path: path,
      status: "done",
      error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "pet_id,card_type" }
  );
  if (dbErr) {
    console.error("[memorial-cards] 写库失败:", dbErr.message);
    return NextResponse.json({ error: `写库失败: ${dbErr.message}` }, { status: 500 });
  }

  return NextResponse.json({ cardType, imageUrl, status: "done" });
}
