-- ============================================================
-- tailme-app-beta — Community schema
-- 在 Supabase SQL Editor 一次性执行
-- ============================================================

-- ──────────────────────────────────────────────
-- 1. users 扩展：username + role
-- ──────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'
    CHECK (role IN ('user','admin'));

-- 唯一约束（已有数据全 NULL 时安全）
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique
  ON users (lower(username))
  WHERE username IS NOT NULL;

-- ──────────────────────────────────────────────
-- 2. 聊天室（按品种预置）
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_rooms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  breed       text UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 预置：1 个全员房 + 30 个品种房
INSERT INTO chat_rooms (name, breed) VALUES ('全员闲聊', NULL)
  ON CONFLICT DO NOTHING;
INSERT INTO chat_rooms (name, breed)
SELECT b || '群', b FROM unnest(ARRAY[
  '腊肠犬','柴犬','柯基','金毛','拉布拉多','边牧','法斗','比熊','贵宾','泰迪',
  '阿拉斯加','哈士奇','德牧','博美','马尔济斯','巴哥','吉娃娃','秋田','雪纳瑞','约克夏',
  '杜宾','萨摩耶','罗威纳','伯恩山','斗牛犬','灵缇','纽芬兰','牛头梗','可卡','其他'
]) AS t(b)
ON CONFLICT (breed) DO NOTHING;

-- ──────────────────────────────────────────────
-- 3. 消息（实时聊天）
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id      uuid REFERENCES pets(id) ON DELETE SET NULL,
  content     text NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  status      text NOT NULL DEFAULT 'visible'
              CHECK (status IN ('visible','hidden','flagged')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_room_created
  ON messages (room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages (user_id);

-- ──────────────────────────────────────────────
-- 4. 帖子
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id        uuid REFERENCES pets(id) ON DELETE SET NULL,
  content       text NOT NULL CHECK (length(content) BETWEEN 1 AND 5000),
  image_urls    text[],
  status        text NOT NULL DEFAULT 'visible'
                CHECK (status IN ('visible','hidden','flagged')),
  like_count    int  NOT NULL DEFAULT 0,
  comment_count int  NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_posts_status_created
  ON posts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts (user_id);

-- ──────────────────────────────────────────────
-- 5. 点赞
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_likes (
  post_id     uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- ──────────────────────────────────────────────
-- 6. 评论
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id      uuid REFERENCES pets(id) ON DELETE SET NULL,
  content     text NOT NULL CHECK (length(content) BETWEEN 1 AND 1000),
  status      text NOT NULL DEFAULT 'visible'
              CHECK (status IN ('visible','hidden','flagged')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comments_post
  ON comments (post_id, created_at);

-- ──────────────────────────────────────────────
-- 7. 举报
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type   text NOT NULL CHECK (target_type IN ('post','comment','message')),
  target_id     uuid NOT NULL,
  reason        text,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','resolved','dismissed')),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reports_status
  ON reports (status, created_at);

-- ──────────────────────────────────────────────
-- 8. Trigger：自动维护 like_count / comment_count
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION bump_post_counter() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF TG_TABLE_NAME = 'post_likes' THEN
      UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_TABLE_NAME = 'comments' AND NEW.status = 'visible' THEN
      UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF TG_TABLE_NAME = 'post_likes' THEN
      UPDATE posts SET like_count = greatest(like_count - 1, 0) WHERE id = OLD.post_id;
    ELSIF TG_TABLE_NAME = 'comments' AND OLD.status = 'visible' THEN
      UPDATE posts SET comment_count = greatest(comment_count - 1, 0) WHERE id = OLD.post_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'comments' THEN
    -- 状态变化时调整
    IF OLD.status = 'visible' AND NEW.status <> 'visible' THEN
      UPDATE posts SET comment_count = greatest(comment_count - 1, 0) WHERE id = NEW.post_id;
    ELSIF OLD.status <> 'visible' AND NEW.status = 'visible' THEN
      UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_post_likes_count ON post_likes;
CREATE TRIGGER trg_post_likes_count
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION bump_post_counter();

DROP TRIGGER IF EXISTS trg_comments_count ON comments;
CREATE TRIGGER trg_comments_count
  AFTER INSERT OR DELETE OR UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION bump_post_counter();

-- ──────────────────────────────────────────────
-- 9. Realtime publication
-- ──────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE post_likes;

-- ──────────────────────────────────────────────
-- 10. RLS — anon 直连用的策略
-- 注意：业务侧的 owner 校验由 Next.js API route 做（service_role）
-- ──────────────────────────────────────────────
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports    ENABLE ROW LEVEL SECURITY;

-- 房间：任意人可读
CREATE POLICY "read_rooms" ON chat_rooms
  FOR SELECT USING (true);

-- 帖子/评论/消息：anon 只能读 visible
CREATE POLICY "read_visible_posts" ON posts
  FOR SELECT USING (status = 'visible');
CREATE POLICY "read_visible_comments" ON comments
  FOR SELECT USING (status = 'visible');
CREATE POLICY "read_visible_messages" ON messages
  FOR SELECT USING (status = 'visible');

-- 点赞：可读全部
CREATE POLICY "read_likes" ON post_likes
  FOR SELECT USING (true);

-- INSERT：anon 可写（带 user_id），关键词命中时由前端预设 status='flagged'
CREATE POLICY "insert_posts"    ON posts    FOR INSERT WITH CHECK (true);
CREATE POLICY "insert_comments" ON comments FOR INSERT WITH CHECK (true);
CREATE POLICY "insert_messages" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "insert_likes"    ON post_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "insert_reports"  ON reports  FOR INSERT WITH CHECK (true);

-- 取消点赞：anon 直接 delete（仅 post_likes 例外，便于轻量操作）
CREATE POLICY "delete_likes"    ON post_likes FOR DELETE USING (true);

-- 故意不给 anon UPDATE/DELETE：所有内容删除/隐藏走 API route + service_role

-- ──────────────────────────────────────────────
-- 11. （已移除 posts_feed view —— 前端用 nested select 直查）
-- ──────────────────────────────────────────────
DROP VIEW IF EXISTS posts_feed;

-- ============================================================
-- v2 增量：评论点赞 / 评论嵌套回复 / 帖子图片
-- ============================================================

-- 评论：parent_id（自引用嵌套）+ like_count
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS parent_id  uuid REFERENCES comments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS like_count int  NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

-- 评论点赞表
CREATE TABLE IF NOT EXISTS comment_likes (
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE OR REPLACE FUNCTION bump_comment_like() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments SET like_count = greatest(like_count - 1, 0) WHERE id = OLD.comment_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_comment_likes_count ON comment_likes;
CREATE TRIGGER trg_comment_likes_count
  AFTER INSERT OR DELETE ON comment_likes
  FOR EACH ROW EXECUTE FUNCTION bump_comment_like();

ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_comment_likes"   ON comment_likes FOR SELECT USING (true);
CREATE POLICY "insert_comment_likes" ON comment_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "delete_comment_likes" ON comment_likes FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE comment_likes;

-- Storage bucket：帖子图片
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "post_images_read"   ON storage.objects;
DROP POLICY IF EXISTS "post_images_upload" ON storage.objects;
DROP POLICY IF EXISTS "post_images_delete" ON storage.objects;
CREATE POLICY "post_images_read"   ON storage.objects FOR SELECT USING (bucket_id = 'post-images');
CREATE POLICY "post_images_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'post-images');
CREATE POLICY "post_images_delete" ON storage.objects FOR DELETE USING (bucket_id = 'post-images');

-- ============================================================
-- v3 增量：帖子类型（图片/纯文字）+ 标题 + 封面 + 文字背景色
-- ============================================================
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS title           text,
  ADD COLUMN IF NOT EXISTS post_type       text DEFAULT 'image'
    CHECK (post_type IN ('image','text')),
  ADD COLUMN IF NOT EXISTS text_bg_color   text,
  ADD COLUMN IF NOT EXISTS cover_image_url text;

-- 回填：image_urls 为空的老帖归为 text 类型
UPDATE posts
SET    post_type = 'text'
WHERE  post_type = 'image'
  AND (image_urls IS NULL OR array_length(image_urls, 1) IS NULL);

-- 回填：cover_image_url 用 image_urls 的第一张
UPDATE posts
SET    cover_image_url = image_urls[1]
WHERE  cover_image_url IS NULL
  AND  image_urls IS NOT NULL
  AND  array_length(image_urls, 1) > 0;

-- 索引：feed 主要按 status + created_at 排序，已有 idx_posts_status_created 够用
-- 内容长度放宽（允许只发标题/只发图）
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_content_check;
ALTER TABLE posts ADD  CONSTRAINT posts_content_check
  CHECK (length(content) BETWEEN 0 AND 5000);

-- ============================================================
-- v4 增量：Feed 性能优化 —— 独立缩略图 + 封面宽高比
-- ============================================================
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS thumbnail_urls       text[],
  ADD COLUMN IF NOT EXISTS cover_thumbnail_url  text,
  ADD COLUMN IF NOT EXISTS cover_aspect_ratio   numeric;

-- ============================================================
-- v5 增量：三档图片策略
--   thumbnail_urls       — Feed 用，~640px       (v4 已加)
--   display_image_urls   — 详情页用，~1600px / q 0.85   (新增)
--   original_image_urls  — 用户点"查看原图"才加载（暂未实现 UI / 上传，仅占位）
-- 旧 image_urls 字段保留向后兼容；前端读取时优先 display_image_urls，回退 image_urls
-- ============================================================
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS display_image_urls  text[],
  ADD COLUMN IF NOT EXISTS original_image_urls text[];

-- 回填：老帖的 image_urls 视为 display 级（1600px，是当时的上传质量）
UPDATE posts
SET    display_image_urls = image_urls
WHERE  display_image_urls IS NULL
  AND  image_urls IS NOT NULL
  AND  array_length(image_urls, 1) > 0;
