-- ════════════════════════════════════════════════════════════
-- 「爪爪星球纪念模式」：pets 表加字段（每只宠物独立开关）
-- 只加新字段，不改已有字段/数据。
-- ════════════════════════════════════════════════════════════

alter table public.pets
  add column if not exists is_memorial_mode    boolean     not null default false,
  add column if not exists memorial_started_at timestamptz,
  add column if not exists memorial_message    text;
