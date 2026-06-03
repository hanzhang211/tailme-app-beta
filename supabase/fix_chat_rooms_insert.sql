-- ============================================================
-- 修复：点击未预置的品种群报「创建房间失败: new row violates
--       row-level security policy for table "chat_rooms"」
--
-- 根因：chat_rooms 只有 SELECT 策略，无 INSERT 策略。预置 30 个狗品种群
--       之外的群（猫咪品种、其他品种）首次进入会按需 INSERT，被 RLS 拦截。
-- 解决：补 anon INSERT 策略（与 messages/posts 同等 MVP 模型），
--       并补 pet_type 列（按需建房会写入该字段）。
-- 在 Supabase SQL Editor 执行（幂等，可重复跑）。
-- ============================================================

ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS pet_type text;

DROP POLICY IF EXISTS "insert_rooms" ON chat_rooms;
CREATE POLICY "insert_rooms" ON chat_rooms FOR INSERT WITH CHECK (true);
