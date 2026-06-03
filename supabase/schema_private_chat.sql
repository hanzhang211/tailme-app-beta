-- ============================================================
-- tailme-app-beta — 私聊（一对一）schema
-- 在 Supabase SQL Editor 一次性执行（幂等，可重复跑）
--
-- 说明：本项目无 Supabase Auth（前端 anon key + 自建 phone 账号体系，
--       auth.uid() 永远 NULL）。私聊沿用与群聊 messages 一致的 MVP 安全模型：
--       RLS 开启 + anon 可读写，业务隔离由前端按 currentUser.id 过滤
--       （user1_id = me OR user2_id = me）。Realtime 需要 anon 能 SELECT。
-- ============================================================

-- ──────────────────────────────────────────────
-- 1. 会话表（A-B 唯一，靠 participant_key 防重复）
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS private_conversations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_key   text NOT NULL UNIQUE,            -- smallerId__largerId
  last_message      text,
  last_message_type text DEFAULT 'text',             -- text / image
  last_message_at   timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pconv_user1 ON private_conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_pconv_user2 ON private_conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_pconv_updated ON private_conversations(last_message_at DESC);

-- ──────────────────────────────────────────────
-- 2. 私聊消息
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS private_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES private_conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content         text,
  message_type    text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','image')),
  image_url       text,
  read_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pmsg_conv   ON private_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pmsg_unread ON private_messages(receiver_id) WHERE read_at IS NULL;

-- ──────────────────────────────────────────────
-- 3. Realtime publication（幂等：已存在则忽略）
-- ──────────────────────────────────────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE private_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE private_conversations;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ──────────────────────────────────────────────
-- 4. RLS（MVP：anon 直连，前端按 user_id 过滤；与群聊 messages 同等模型）
-- ──────────────────────────────────────────────
ALTER TABLE private_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_messages      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pconv_read"   ON private_conversations;
DROP POLICY IF EXISTS "pconv_insert" ON private_conversations;
DROP POLICY IF EXISTS "pconv_update" ON private_conversations;
CREATE POLICY "pconv_read"   ON private_conversations FOR SELECT USING (true);
CREATE POLICY "pconv_insert" ON private_conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "pconv_update" ON private_conversations FOR UPDATE USING (true);

DROP POLICY IF EXISTS "pmsg_read"   ON private_messages;
DROP POLICY IF EXISTS "pmsg_insert" ON private_messages;
DROP POLICY IF EXISTS "pmsg_update" ON private_messages;
CREATE POLICY "pmsg_read"   ON private_messages FOR SELECT USING (true);
CREATE POLICY "pmsg_insert" ON private_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "pmsg_update" ON private_messages FOR UPDATE USING (true);

-- ──────────────────────────────────────────────
-- 5. Storage bucket：私聊图片
-- ──────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('private-chat-images', 'private-chat-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "pchat_img_read"   ON storage.objects;
DROP POLICY IF EXISTS "pchat_img_upload" ON storage.objects;
DROP POLICY IF EXISTS "pchat_img_delete" ON storage.objects;
CREATE POLICY "pchat_img_read"   ON storage.objects FOR SELECT USING (bucket_id = 'private-chat-images');
CREATE POLICY "pchat_img_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'private-chat-images');
CREATE POLICY "pchat_img_delete" ON storage.objects FOR DELETE USING (bucket_id = 'private-chat-images');
