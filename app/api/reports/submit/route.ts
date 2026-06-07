/**
 * /api/reports/submit — 友好地点 / 宠物警示「上报」入口（service_role）
 *
 * 后端硬校验：仅 users.verification_status==='approved' 的用户可提交，
 * 防止未认证用户绕过前端拦截直接写库。图片仍由前端 anon 上传到公开 bucket，
 * 此处只负责「校验认证 + service_role 写入 pending 行」。
 *
 * POST { userId, kind:'friendly'|'warning', payload }
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function friendlyRow(p: any, userId: string) {
  return {
    reporter_user_id: userId,
    title: p.title || p.placeName || "宠物友好地点",
    description: p.description || null,
    place_name: p.placeName || null,
    address: p.address || null,
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    images: p.images || [],
    has_water_bowl: !!p.hasWaterBowl,
    has_food_bowl: !!p.hasFoodBowl,
    allow_pet_inside: !!p.allowPetInside,
    good_for_rest: !!p.goodForRest,
    contact_info: p.contactInfo || null,
    anonymous: p.anonymous !== false,
    status: "pending",
  };
}

function warningRow(p: any, userId: string) {
  return {
    reporter_user_id: userId,
    title: p.title || null,
    event_type: p.eventType,
    event_type_other: p.eventTypeOther || null,
    description: p.description || null,
    place_name: p.placeName || null,
    address: p.address || null,
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    images: p.images || [],
    contact_info: p.contactInfo || null,
    anonymous: p.anonymous !== false,
    status: "pending",
  };
}

export async function POST(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY 未配置" }, { status: 500 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "请求体格式错误" }, { status: 400 }); }

  const { userId, kind, payload } = body || {};
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 400 });
  if (!["friendly", "warning"].includes(kind)) return NextResponse.json({ error: "kind 非法" }, { status: 400 });
  if (!payload) return NextResponse.json({ error: "缺少内容" }, { status: 400 });

  // 认证硬校验
  const { data: u, error: uErr } = await supabaseAdmin
    .from("users").select("verification_status").eq("id", userId).maybeSingle();
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
  if (!u) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  if (u.verification_status !== "approved") {
    return NextResponse.json({ error: "需要完成认证后才能上报", code: "NOT_VERIFIED" }, { status: 403 });
  }

  const table = kind === "friendly" ? "pet_friendly_reports" : "pet_warning_reports";
  const row = kind === "friendly" ? friendlyRow(payload, userId) : warningRow(payload, userId);

  const { error } = await supabaseAdmin.from(table).insert(row);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, status: "pending" });
}
