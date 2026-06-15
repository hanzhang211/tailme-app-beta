-- 帖子举报表 post_reports
-- 用户在帖子详情页举报某条帖子 → 写入此表（status=pending）
-- Admin 后台「举报管理」读取/处理（标记已处理 / 驳回 / 备注 / 隐藏或删除被举报帖）。
-- 与项目现有模式一致：RLS WITH CHECK(true)，真正的业务校验由 Next.js API route 用 service_role 做。

CREATE TABLE IF NOT EXISTS post_reports (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  post_id          uuid NOT NULL,
  post_author_id   uuid,
  reporter_user_id uuid NOT NULL,
  reason           text NOT NULL,
  detail           text,
  evidence_images  text[],
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','reviewed','rejected','resolved')),
  admin_note       text,
  handled_by       uuid,
  handled_at       timestamptz
);

CREATE INDEX IF NOT EXISTS idx_post_reports_status   ON post_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_reports_reporter ON post_reports (reporter_user_id, post_id);

ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert_post_reports" ON post_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "read_post_reports"   ON post_reports FOR SELECT USING (true);
