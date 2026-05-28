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
CREATE POLICY "recipes_read"   ON pet_recipes         FOR SELECT USING (true);
CREATE POLICY "recipes_insert" ON pet_recipes         FOR INSERT WITH CHECK (true);
CREATE POLICY "recipes_update" ON pet_recipes         FOR UPDATE USING (true);
CREATE POLICY "recipes_delete" ON pet_recipes         FOR DELETE USING (true);

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
