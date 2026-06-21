-- ════════════════════════════════════════════════════════════
-- 【AI 宠物来电】场景驱动改造（场景开关 + AI 记忆回访）
-- ① pet_call_settings 加 scenes（场景开关 jsonb）
-- ② 新建 pet_call_memory_followups（AI 记忆回访，第一版仅结构预留）
-- ════════════════════════════════════════════════════════════

-- ① 场景开关：只加新字段，不动已有字段/数据
alter table public.pet_call_settings
  add column if not exists scenes jsonb not null default '{}'::jsonb;

-- ② AI 记忆回访表
create table if not exists public.pet_call_memory_followups (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null,
  pet_id            uuid not null,
  source_message_id text,                            -- 来源 AI 聊天消息（预留，可空）
  event_text        text,                            -- 识别到的事件，如"晚上要见朋友"
  event_time        timestamptz,                     -- 事件发生时间（预留）
  follow_up_time    timestamptz,                     -- 计划回访来电时间
  status            text not null default 'pending', -- pending/triggered/done/cancelled
  created_at        timestamptz not null default now(),
  triggered_at      timestamptz
);
create index if not exists idx_pcmf_user on public.pet_call_memory_followups(user_id, created_at desc);
create index if not exists idx_pcmf_pending on public.pet_call_memory_followups(status, follow_up_time);

alter table public.pet_call_memory_followups enable row level security;
create policy "pcmf_all" on public.pet_call_memory_followups for all using (true) with check (true);
