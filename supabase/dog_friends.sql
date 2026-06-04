-- ============================================================
-- tailme-app-beta — 狗友 / 附近狗狗（真实数据 + 隐私保护）
-- 在 Supabase SQL Editor 一次性执行（幂等，可重复跑）
--
-- 隐私模型（重点）：
--   本项目无 Supabase Auth（anon key + 自建 phone 账号，auth.uid() 恒为 NULL）。
--   经纬度属于敏感信息，绝不能让前端 anon 直接 SELECT 到别人的 last_lat/last_lng。
--   因此本表【不开放 anon 直接读写】，全部经由 SECURITY DEFINER 的 RPC 函数访问：
--     · 自己的名片读/写  → RPC（按传入 user_id）
--     · 附近狗狗查询      → RPC，服务端算距离，只回 distance_km，永不回经纬度
--   RLS 开启但不建放行策略 ⇒ anon 直连该表读不到任何行；RPC（definer）可绕过 RLS。
-- ============================================================

-- ──────────────────────────────────────────────
-- 1. 狗友名片表
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dog_friend_profiles (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  pet_id                    uuid REFERENCES pets(id) ON DELETE SET NULL,
  is_visible                boolean NOT NULL DEFAULT false,
  last_lat                  double precision,
  last_lng                  double precision,
  last_location_updated_at  timestamptz,
  walking_times             text[] NOT NULL DEFAULT '{}',
  personalities             text[] NOT NULL DEFAULT '{}',
  small_dog_preference      text,
  big_dog_preference        text,
  intro                     text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dfp_visible ON dog_friend_profiles(is_visible) WHERE is_visible = true;

-- RLS 开启、不建任何放行策略 ⇒ anon 直连读不到经纬度（只能走下面的 RPC）
ALTER TABLE dog_friend_profiles ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────
-- 2. 读取自己的名片（不存在则返回空）
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION dog_friend_get_my_profile(in_user_id uuid)
RETURNS TABLE (
  user_id uuid, pet_id uuid, is_visible boolean,
  has_location boolean, last_location_updated_at timestamptz,
  walking_times text[], personalities text[],
  small_dog_preference text, big_dog_preference text, intro text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id, p.pet_id, p.is_visible,
         (p.last_lat IS NOT NULL AND p.last_lng IS NOT NULL) AS has_location,
         p.last_location_updated_at,
         p.walking_times, p.personalities,
         p.small_dog_preference, p.big_dog_preference, p.intro
  FROM dog_friend_profiles p
  WHERE p.user_id = in_user_id;
$$;

-- ──────────────────────────────────────────────
-- 3. 保存/更新名片（不含位置/可见性，那两项走专门的 RPC）
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION dog_friend_upsert_profile(
  in_user_id uuid, in_pet_id uuid,
  in_walking_times text[], in_personalities text[],
  in_small text, in_big text, in_intro text
)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO dog_friend_profiles
    (user_id, pet_id, walking_times, personalities, small_dog_preference, big_dog_preference, intro, updated_at)
  VALUES
    (in_user_id, in_pet_id,
     COALESCE(in_walking_times, '{}'), COALESCE(in_personalities, '{}'),
     in_small, in_big, LEFT(COALESCE(in_intro, ''), 100), now())
  ON CONFLICT (user_id) DO UPDATE SET
    pet_id               = EXCLUDED.pet_id,
    walking_times        = EXCLUDED.walking_times,
    personalities        = EXCLUDED.personalities,
    small_dog_preference = EXCLUDED.small_dog_preference,
    big_dog_preference   = EXCLUDED.big_dog_preference,
    intro                = EXCLUDED.intro,
    updated_at           = now();
$$;

-- ──────────────────────────────────────────────
-- 4. 设置「公开距离」开关（开启时写入当前位置；关闭时清空位置）
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION dog_friend_set_visibility(
  in_user_id uuid, in_visible boolean,
  in_lat double precision, in_lng double precision
)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO dog_friend_profiles (user_id, is_visible, last_lat, last_lng, last_location_updated_at, updated_at)
  VALUES (
    in_user_id, in_visible,
    CASE WHEN in_visible THEN in_lat ELSE NULL END,
    CASE WHEN in_visible THEN in_lng ELSE NULL END,
    CASE WHEN in_visible THEN now() ELSE NULL END,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    is_visible               = EXCLUDED.is_visible,
    last_lat                 = CASE WHEN EXCLUDED.is_visible THEN EXCLUDED.last_lat ELSE NULL END,
    last_lng                 = CASE WHEN EXCLUDED.is_visible THEN EXCLUDED.last_lng ELSE NULL END,
    last_location_updated_at = CASE WHEN EXCLUDED.is_visible THEN now() ELSE NULL END,
    updated_at               = now();
$$;

-- ──────────────────────────────────────────────
-- 5. 刷新当前位置（仅在已公开时生效）
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION dog_friend_update_location(
  in_user_id uuid, in_lat double precision, in_lng double precision
)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE dog_friend_profiles
  SET last_lat = in_lat, last_lng = in_lng,
      last_location_updated_at = now(), updated_at = now()
  WHERE user_id = in_user_id AND is_visible = true;
$$;

-- ──────────────────────────────────────────────
-- 6. 查询附近狗友（服务端算距离，只回 distance_km，绝不回经纬度）
--    · 只含已公开(is_visible) 且有位置、且绑定了宠物的用户
--    · 排除自己
--    · 半径内（默认 1km），按距离从近到远
--    · 距离四舍五入到 0.1km
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION nearby_dog_friends(
  in_user_id uuid, in_lat double precision, in_lng double precision,
  in_radius_km double precision DEFAULT 1.0
)
RETURNS TABLE (
  user_id uuid, username text, owner_avatar_url text,
  pet_id uuid, pet_name text, pet_breed text,
  pet_gender text, pet_birthday date, pet_age numeric,
  pet_avatar_url text,
  neutered boolean, vaccinated boolean,
  walking_times text[], personalities text[],
  small_dog_preference text, big_dog_preference text, intro text,
  distance_km numeric
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    u.id, u.username, u.avatar_url,
    pet.id, pet.name, pet.breed,
    pet.gender, pet.birthday, pet.age,
    pet.ai_avatar_url,
    pet.neutered, pet.vaccinated,
    p.walking_times, p.personalities,
    p.small_dog_preference, p.big_dog_preference, p.intro,
    ROUND(dist.km::numeric, 1) AS distance_km
  FROM dog_friend_profiles p
  JOIN users u  ON u.id = p.user_id
  JOIN pets  pet ON pet.id = p.pet_id
  CROSS JOIN LATERAL (
    SELECT 6371.0 * acos(
      GREATEST(-1.0, LEAST(1.0,
        cos(radians(in_lat)) * cos(radians(p.last_lat)) *
        cos(radians(p.last_lng) - radians(in_lng)) +
        sin(radians(in_lat)) * sin(radians(p.last_lat))
      ))
    ) AS km
  ) dist
  WHERE p.is_visible = true
    AND p.user_id <> in_user_id
    AND p.last_lat IS NOT NULL AND p.last_lng IS NOT NULL
    AND dist.km <= in_radius_km
  ORDER BY dist.km ASC
  LIMIT 100;
$$;

-- ──────────────────────────────────────────────
-- 7. 授权 anon / authenticated 执行这些 RPC（仅函数，不含表直读）
-- ──────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION dog_friend_get_my_profile(uuid)                              TO anon, authenticated;
GRANT EXECUTE ON FUNCTION dog_friend_upsert_profile(uuid,uuid,text[],text[],text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION dog_friend_set_visibility(uuid,boolean,double precision,double precision) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION dog_friend_update_location(uuid,double precision,double precision)         TO anon, authenticated;
GRANT EXECUTE ON FUNCTION nearby_dog_friends(uuid,double precision,double precision,double precision) TO anon, authenticated;
