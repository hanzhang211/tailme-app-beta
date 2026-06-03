-- ============================================================
-- 修复：点赞 / 评论计数与实际不同步（like_count 一直为 0）
--
-- 根因：bump_post_counter() / bump_comment_like() 触发器默认以
--       调用者（anon）身份运行其中的 UPDATE posts/comments。
--       而 anon 没有 posts/comments 的 UPDATE policy（RLS），
--       于是触发器里的 +1 / -1 被 RLS 静默拦截，计数永远停在 0。
--
-- 解决：把这两个函数改成 SECURITY DEFINER（以函数属主 postgres 身份
--       运行 → 绕过 RLS），再把历史计数一次性回填为真实值。
-- 幂等，可重复执行。
-- 在 Supabase SQL Editor 执行。
-- ============================================================

-- 1. 触发器函数改为 SECURITY DEFINER（绕过 RLS 的 UPDATE 限制）
ALTER FUNCTION bump_post_counter() SECURITY DEFINER;
ALTER FUNCTION bump_comment_like() SECURITY DEFINER;

-- 2. 回填 posts.like_count / comment_count 为真实值
UPDATE posts p SET
  like_count    = COALESCE((SELECT count(*) FROM post_likes pl WHERE pl.post_id = p.id), 0),
  comment_count = COALESCE((SELECT count(*) FROM comments  c  WHERE c.post_id  = p.id
                                                            AND c.status = 'visible'), 0);

-- 3. 回填 comments.like_count 为真实值
UPDATE comments c SET
  like_count = COALESCE((SELECT count(*) FROM comment_likes cl WHERE cl.comment_id = c.id), 0);
