-- ============================================================
-- tailme-app-beta — 统一宠物记忆：复用 pet_ai_memories 扩展字段
-- 目标：让「AI 文字聊天」与「AI 电话」共享同一套长期记忆。
-- 在 Supabase SQL Editor 一次性执行（幂等，可重复运行，不破坏现有数据）。
-- ============================================================

-- ① 新增三列（不动现有数据 / 不改 RLS）
--    source     来源：chat / call / health / feeding / memorial / manual（默认 chat）
--    importance 重要度 1-5（读取时优先级；默认 3）
--    updated_at 最近更新时间（应用层手动维护）
ALTER TABLE pet_ai_memories
  ADD COLUMN IF NOT EXISTS source     text        NOT NULL DEFAULT 'chat',
  ADD COLUMN IF NOT EXISTS importance int         NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ② importance 取值范围 1-5（幂等添加约束，重复执行不报错）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pet_ai_memories_importance_chk'
  ) THEN
    ALTER TABLE pet_ai_memories
      ADD CONSTRAINT pet_ai_memories_importance_chk CHECK (importance BETWEEN 1 AND 5);
  END IF;
END $$;

-- ③ 排序索引：按宠物 + 重要度 + 时间倒序（读取最近/最重要的记忆）
CREATE INDEX IF NOT EXISTS pet_ai_memories_rank_idx
  ON pet_ai_memories (pet_id, importance DESC, created_at DESC);

-- 说明：
-- · 现有记录的 source 自动填 'chat'、importance 自动填 3，符合历史语义。
-- · 该表仍保持「RLS 开 + 零 policy」：anon 无法直连，仅服务端 service_role 可读写。
-- · memory_type 不加约束，兼容现有值(goal/stress/like/other/profile)与
--   新增值(preference/event/emotion/routine/health/important/other)。
