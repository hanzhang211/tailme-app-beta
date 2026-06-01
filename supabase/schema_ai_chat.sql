-- ============================================================
-- tailme-app-beta — AI 宠物聊天 schema（第一版）
-- 在 Supabase SQL Editor 一次性执行
-- ============================================================

-- ──────────────────────────────────────────────
-- 1. 长期记忆表
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pet_ai_memories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id      uuid NOT NULL REFERENCES pets(id)  ON DELETE CASCADE,
  memory_type text NOT NULL DEFAULT 'other',     -- goal / stress / like / other
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pet_ai_memories_pet_idx
  ON pet_ai_memories (pet_id, created_at DESC);

-- ──────────────────────────────────────────────
-- 1.1 用户隔离（方案 A：服务端 service_role + 拒绝直连）
-- ──────────────────────────────────────────────
-- 本项目没有 Supabase Auth（前端只用 anon key、自建 phone 账号体系），
-- 因此 auth.uid() 永远为 NULL，无法用 auth.uid() = user_id 做 RLS。
--
-- 隔离方式：
--   · 开启 RLS 且【不创建任何 anon/authenticated policy】→ 默认拒绝一切直连访问，
--     anon key 即使泄露也无法读/写/改/删任何人的记忆。
--   · 唯一访问通道是服务端 /api/pet-ai-chat：用 service_role（绕过 RLS），
--     且在读写前校验「该 userId 确实是该 petId 的主人」(pets.user_id = userId)，
--     写入的 user_id 取服务端查到的 pets.user_id，不信任前端传值 → 无法越权。
--
-- 以下语句幂等，确保表处于「RLS 开 + 零 policy」状态：
ALTER TABLE pet_ai_memories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pet_ai_memories_all ON pet_ai_memories;

-- ──────────────────────────────────────────────
-- 2. 宠物成长字段
-- ──────────────────────────────────────────────
ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS ai_level int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ai_exp   int DEFAULT 0;
