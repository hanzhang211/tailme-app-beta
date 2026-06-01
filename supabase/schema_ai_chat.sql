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
-- 2. 宠物成长字段
-- ──────────────────────────────────────────────
ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS ai_level int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ai_exp   int DEFAULT 0;
