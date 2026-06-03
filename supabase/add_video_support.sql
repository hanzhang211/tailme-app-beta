-- ============================================================
-- 视频上传支持（社区帖子 + 私聊）
--  · posts.media_items：有序媒体数组（图片/视频），兼容旧 image_urls
--  · private_messages：增加 video_url / thumbnail_url / duration，放开 message_type='video'
--  · Storage 复用现有 bucket：帖子视频→post-images，私聊视频→private-chat-images
-- 在 Supabase SQL Editor 执行（幂等，可重复跑）。
-- ============================================================

-- 1. 帖子：有序媒体（[{type:'image'|'video', url, thumbnail_url, duration?}, ...]）
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_items jsonb DEFAULT '[]'::jsonb;

-- 2. 私聊：视频字段 + 放开 message_type
ALTER TABLE private_messages
  ADD COLUMN IF NOT EXISTS video_url     text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS duration      integer;

ALTER TABLE private_messages DROP CONSTRAINT IF EXISTS private_messages_message_type_check;
ALTER TABLE private_messages ADD CONSTRAINT private_messages_message_type_check
  CHECK (message_type IN ('text','image','video'));
