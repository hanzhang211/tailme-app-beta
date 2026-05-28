-- ============================================================
-- tailme-app-beta — HomeTab 三大模块表
-- 在 Supabase SQL Editor 一次性执行（幂等，可重跑）
-- ============================================================

-- ──────────────────────────────────────────────
-- 1. 宠物记账
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pet_expenses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id        uuid REFERENCES pets(id) ON DELETE SET NULL,
  amount        numeric(10,2) NOT NULL CHECK (amount >= 0),
  category      text NOT NULL,
  note          text,
  expense_date  date NOT NULL DEFAULT CURRENT_DATE,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date
  ON pet_expenses (user_id, expense_date DESC);
-- 注：原计划的 date_trunc('month', ...) 表达式索引不可建（date_trunc 是 STABLE 非 IMMUTABLE）。
-- 月份范围查询用 expense_date >= X AND expense_date < Y 走上面的复合索引即可。

-- ──────────────────────────────────────────────
-- 2. 宠物食谱（先做内置 + 预留用户自建）
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pet_recipes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES users(id) ON DELETE SET NULL,  -- NULL = 系统内置
  title         text NOT NULL,
  emoji         text,              -- 卡片封面 emoji
  suitable_for  text,              -- 适合宠物类型/年龄
  ingredients   text,              -- 食材
  steps         text,              -- 做法步骤
  nutrition     text,              -- 营养说明
  notes         text,              -- 注意事项
  is_builtin    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recipes_builtin
  ON pet_recipes (is_builtin, created_at DESC);

-- ──────────────────────────────────────────────
-- 3. 宠物健康记录
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pet_health_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id          uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  record_type     text NOT NULL CHECK (record_type IN ('vaccine','deworm','checkup','other')),
  title           text,
  record_date     date NOT NULL DEFAULT CURRENT_DATE,
  next_due_date   date,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_health_pet_date
  ON pet_health_records (pet_id, record_date DESC);

-- ──────────────────────────────────────────────
-- RLS — 与全站 MVP 一致：anon 直连，前端按 user_id 过滤
-- 上线前迁 Supabase Auth 后再加严
-- ──────────────────────────────────────────────
ALTER TABLE pet_expenses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_recipes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_health_records  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_read"   ON pet_expenses;
DROP POLICY IF EXISTS "expenses_insert" ON pet_expenses;
DROP POLICY IF EXISTS "expenses_update" ON pet_expenses;
DROP POLICY IF EXISTS "expenses_delete" ON pet_expenses;
CREATE POLICY "expenses_read"   ON pet_expenses        FOR SELECT USING (true);
CREATE POLICY "expenses_insert" ON pet_expenses        FOR INSERT WITH CHECK (true);
CREATE POLICY "expenses_update" ON pet_expenses        FOR UPDATE USING (true);
CREATE POLICY "expenses_delete" ON pet_expenses        FOR DELETE USING (true);

DROP POLICY IF EXISTS "recipes_read"   ON pet_recipes;
DROP POLICY IF EXISTS "recipes_insert" ON pet_recipes;
DROP POLICY IF EXISTS "recipes_update" ON pet_recipes;
DROP POLICY IF EXISTS "recipes_delete" ON pet_recipes;
-- 食谱：anon 只读；写操作必须走 /api/admin/recipes（service_role 校验 role='admin'）
CREATE POLICY "recipes_read"   ON pet_recipes         FOR SELECT USING (true);
-- 故意不创建 INSERT / UPDATE / DELETE policy → anon 无法直接写

DROP POLICY IF EXISTS "health_read"   ON pet_health_records;
DROP POLICY IF EXISTS "health_insert" ON pet_health_records;
DROP POLICY IF EXISTS "health_update" ON pet_health_records;
DROP POLICY IF EXISTS "health_delete" ON pet_health_records;
CREATE POLICY "health_read"   ON pet_health_records  FOR SELECT USING (true);
CREATE POLICY "health_insert" ON pet_health_records  FOR INSERT WITH CHECK (true);
CREATE POLICY "health_update" ON pet_health_records  FOR UPDATE USING (true);
CREATE POLICY "health_delete" ON pet_health_records  FOR DELETE USING (true);

-- ──────────────────────────────────────────────
-- 内置食谱种子（幂等：用 title 判重）
-- ──────────────────────────────────────────────
INSERT INTO pet_recipes (title, emoji, suitable_for, ingredients, steps, nutrition, notes, is_builtin)
SELECT * FROM (VALUES
  (
    '鸡胸肉南瓜饭', '🍚',
    '成犬 / 1 岁以上中小型犬',
    '鸡胸肉 100g、南瓜 80g、糙米饭 50g、胡萝卜 20g、橄榄油 1 滴',
    E'1. 鸡胸肉清水煮熟，撕成小条\n2. 南瓜去皮蒸熟压泥\n3. 胡萝卜切丁焯水\n4. 糙米饭打散，与上述食材混合\n5. 滴一滴橄榄油拌匀',
    '高蛋白、低脂、富含β-胡萝卜素，适合日常主食',
    '不要加盐 / 葱蒜；糖尿病犬减少糙米比例',
    true
  ),
  (
    '牛肉胡萝卜饭', '🥩',
    '成犬 / 中大型活力犬',
    '瘦牛肉 100g、胡萝卜 30g、土豆 50g、白米饭 50g',
    E'1. 牛肉切小丁，用滚水焯去血沫\n2. 胡萝卜与土豆切丁同煮 15 分钟\n3. 与白饭拌匀，冷至温热再喂',
    '富含血红素铁与 B12，补血益气',
    '土豆必须完全煮熟（避免茄碱）',
    true
  ),
  (
    '三文鱼蔬菜餐', '🐟',
    '皮肤敏感犬 / 老年犬',
    '三文鱼 80g、西蓝花 30g、蓝莓 10g、糙米饭 40g',
    E'1. 三文鱼蒸 8 分钟，去刺撕碎\n2. 西蓝花焯水切碎\n3. 与糙米饭混合，蓝莓撒在最上层',
    '富含 Omega-3，护毛、抗炎、护脑',
    '每周不超过 2 次，避免汞累积；务必去刺',
    true
  ),
  (
    '鸡蛋燕麦小饼', '🥞',
    '幼犬 / 全年龄段加餐',
    '鸡蛋 1 个、即食燕麦 30g、香蕉 1/4 根',
    E'1. 香蕉压泥\n2. 与鸡蛋、燕麦拌成糊\n3. 平底锅小火两面煎熟（无油）\n4. 完全冷却后切小块',
    '碳水 + 优质蛋白，能量好搭档',
    '不要加糖；蜂蜜也别加（小狗不宜）',
    true
  ),
  (
    '低脂鸡肉零食', '🍖',
    '减脂期 / 训练奖励',
    '鸡胸肉 200g',
    E'1. 鸡胸肉切薄片（约 3mm）\n2. 烤箱 90°C 烤 2 小时（低温脱水）\n3. 完全冷却后密封冷藏',
    '纯蛋白、零碳水，训练时小块奖励',
    '一次别给太多，避免渴；密封冷藏 ≤7 天',
    true
  )
) AS t(title, emoji, suitable_for, ingredients, steps, nutrition, notes, is_builtin)
WHERE NOT EXISTS (
  SELECT 1 FROM pet_recipes WHERE pet_recipes.title = t.title
);

-- ============================================================
-- 4. 宠物活动 / 资讯（admin 发布，普通用户只读）
-- ============================================================
CREATE TABLE IF NOT EXISTS pet_news (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  summary         text,                   -- 摘要（列表预览用）
  content         text,                   -- 全文
  cover_image_url text,                   -- 封面图（可空，前端 fallback 到 emoji）
  emoji           text,                   -- 没图时的 emoji 占位
  source          text,                   -- 来源/作者
  published_at    timestamptz NOT NULL DEFAULT now(),
  is_builtin      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_news_published ON pet_news (published_at DESC);

-- RLS：anon 只读；写操作走 /api/admin/news（service_role 校验 admin）
ALTER TABLE pet_news ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "news_read" ON pet_news;
CREATE POLICY "news_read" ON pet_news FOR SELECT USING (true);
-- 故意不创建 INSERT / UPDATE / DELETE policy → anon 无法直接写

-- 内置 mock 资讯（按 title 判重，重复跑不会插重）
INSERT INTO pet_news (title, summary, content, emoji, source, is_builtin, published_at)
SELECT * FROM (VALUES
  (
    '春季疫苗接种季：你的毛孩准备好了吗',
    '气温回暖，犬猫疫苗与驱虫迎来高峰期。本文整理了核心接种时间表与常见误区。',
    E'每年 3-5 月是宠物疫苗接种的高峰季。\n\n核心疫苗：\n• 犬：四联 / 六联 + 狂犬\n• 猫：猫三联 + 狂犬（必要时）\n\n常见误区：\n1. 「我家不出门所以不打疫苗」—— 病毒可经主人鞋底带入\n2. 「去年打过就一劳永逸」—— 多数疫苗需要年度加强\n3. 「打完立刻洗澡」—— 接种后 7 天内避免应激\n\n提醒：去医院前 24 小时观察精神和食欲，状态不好建议改期。',
    '💉', '爪爪日记编辑部', true,
    now() - interval '2 days'
  ),
  (
    '夏季防中暑：这 5 个迹象要立刻就医',
    '高温下狗狗散热靠喘气，识别中暑早期信号能救命。',
    E'夏季中暑致死率极高，尤其是短鼻犬（法斗、巴哥、波士顿等）。\n\n中暑早期信号：\n1. 急促喘气，舌头变深红 / 紫\n2. 流口水变粘稠\n3. 站立不稳、走路飘\n4. 体温超过 40°C\n5. 意识模糊或抽搐\n\n现场急救：\n• 立刻挪到阴凉处\n• 用湿毛巾擦腋下 / 大腿内侧（不要冰水）\n• 提供少量凉水\n• 半小时未恢复 → 立刻送医\n\n预防：避免正午遛弯；车内绝不能留狗。',
    '☀️', '爪爪日记编辑部', true,
    now() - interval '5 days'
  ),
  (
    '挑选狗粮的 3 个关键：成分表怎么读',
    '别被「天然」「全价」「无谷」忽悠，看成分表前 5 行才是真的。',
    E'国内市场狗粮鱼龙混杂。挑选时只看 3 点：\n\n① 成分表前 5 位\n   优先：鸡肉、牛肉、三文鱼等具体肉类\n   警惕：「肉粉」「肉副产品」等模糊表述\n\n② 粗蛋白 ≥ 26%\n   成犬维持期 26%-30% 较合理；幼犬可到 32%。过高对老犬肾脏有负担。\n\n③ AAFCO / FEDIAF 认证\n   标签上能找到这两个认证之一，说明营养配比经过标准复核。\n\n避雷：「适口性增强剂」过多通常意味着原料质量不佳；好粮不需要靠香精吸引狗狗。',
    '🥩', '宠物营养志', true,
    now() - interval '10 days'
  ),
  (
    '上海周末好去处：3 家新开宠物友好咖啡馆',
    '可以带着毛孩光明正大坐进店里的咖啡馆，本月新增 3 家。',
    E'本月上海新开的宠物友好咖啡馆推荐：\n\n1. 「爪爪角」武康路店\n   全天候欢迎中小型犬，有专门的宠物座椅与饮水器\n\n2. 「FurryCup」长乐路店\n   提供宠物专属菜单（鸡胸肉饼 / 南瓜泥）\n\n3. 「Paw Bar」愚园路店\n   每周六举办狗狗社交日\n\n友情提示：进店前清洁爪子，带牵引绳，喝完水及时清理。让大家都能开心坐下来。',
    '☕', '爪爪日记编辑部', true,
    now() - interval '1 day'
  ),
  (
    '国庆假期寄养指南：选寄养前必问 6 件事',
    '托管 7 天回来狗狗变样了？这份避坑清单值得收藏。',
    E'国庆假期是寄养事故高发期。预订前必问：\n\n1. 单笼面积多大？是否有独立活动时间？\n2. 一天几次遛弯，每次多久？\n3. 有没有 24 小时驻店人员？\n4. 突发情况就近医院是哪家？\n5. 是否可以视频探望？频率？\n6. 是否要求疫苗 / 驱虫证明？（不要的反而要警惕）\n\n建议：提前 1 周送过去试住一晚，看狗狗反应。第一次别托管太久。',
    '🏠', '爪爪日记编辑部', true,
    now() - interval '7 days'
  )
) AS t(title, summary, content, emoji, source, is_builtin, published_at)
WHERE NOT EXISTS (
  SELECT 1 FROM pet_news WHERE pet_news.title = t.title
);
