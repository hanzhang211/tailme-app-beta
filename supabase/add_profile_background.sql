-- ============================================================
-- 个人主页背景图：users.profile_background_url + Storage bucket
-- 在 Supabase SQL Editor 执行（幂等，可重复跑）
-- ============================================================

-- 1. 用户表加字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_background_url text;

-- 2. Storage bucket：个人背景图（公开读）
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-backgrounds', 'profile-backgrounds', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "profile_bg_read"   ON storage.objects;
DROP POLICY IF EXISTS "profile_bg_upload" ON storage.objects;
DROP POLICY IF EXISTS "profile_bg_delete" ON storage.objects;
CREATE POLICY "profile_bg_read"   ON storage.objects FOR SELECT USING (bucket_id = 'profile-backgrounds');
CREATE POLICY "profile_bg_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profile-backgrounds');
CREATE POLICY "profile_bg_delete" ON storage.objects FOR DELETE USING (bucket_id = 'profile-backgrounds');
