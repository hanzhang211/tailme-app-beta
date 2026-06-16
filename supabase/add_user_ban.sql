-- supabase/add_user_ban.sql
-- 账号封禁（与「禁言 muted_until」并列、互相独立）。
-- 封禁中禁止：遛弯 / 上报友好·警示 / 社群发帖·评论 / 群聊发言；私聊与浏览功能保留。
-- 时长：7 天 / 30 天 / 永久（永久 = 设为很远的未来，年份 ≥2099 视为永久，与 muted_until 约定一致）。
-- 解除封禁 = 置 NULL。admin 在 /admin「用户封禁」Tab 或举报详情里操作（service_role 写入）。

ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_until timestamptz;
