-- ============================================================
-- 用户号 user_no：每个用户一个 9 位用户号
--  · 代替「我的」页的手机号展示
--  · 私聊发起页可按昵称或用户号搜索到用户
--  · 从 id 派生（确定性、看起来随机、稳定不变），并加唯一约束
--  · 新用户由触发器自动生成
-- 在 Supabase SQL Editor 执行（幂等，可重复跑）
-- ============================================================

-- 1. 加列
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_no text;

-- 2. 回填现有用户（从 id 的 md5 派生 9 位号，确定性、看起来随机）
UPDATE users
SET user_no = lpad(
  ((('x' || substr(md5(id::text), 1, 15))::bit(60)::bigint) % 900000000 + 100000000)::text, 9, '0')
WHERE user_no IS NULL;

-- 3. 唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS users_user_no_unique ON users (user_no);

-- 4. 新用户自动生成（BEFORE INSERT：此时 NEW.id 的默认值已填好）
CREATE OR REPLACE FUNCTION set_user_no() RETURNS trigger AS $$
BEGIN
  IF NEW.user_no IS NULL THEN
    NEW.user_no := lpad(
      ((('x' || substr(md5(NEW.id::text), 1, 15))::bit(60)::bigint) % 900000000 + 100000000)::text, 9, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_user_no ON users;
CREATE TRIGGER trg_set_user_no BEFORE INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION set_user_no();
