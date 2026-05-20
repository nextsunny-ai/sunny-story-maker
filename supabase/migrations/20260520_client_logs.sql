-- V3.1 #14 — 클라이언트 에러·디버그 로그 테이블.
-- /api/log endpoint가 INSERT, 사장님 (= service_role) 만 SELECT.
-- 작가 PC에서 발생한 에러를 자동 수집 = 사고 재발 분석용.

create table if not exists public.client_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  user_email   text,
  level        text not null check (level in ('error', 'warn', 'info')),
  source       text,
  message      text not null,
  stack        text,
  url          text,
  user_agent   text,
  app_version  text,
  meta         jsonb,
  created_at   timestamptz not null default now()
);

alter table public.client_logs enable row level security;

-- 누구나 INSERT 가능 (= anonymous 작가도 에러 신고 가능)
create policy "Anyone can insert client log"
  on public.client_logs for insert
  with check (true);

-- service_role (사장님) 만 SELECT
create policy "Service role can read client logs"
  on public.client_logs for select
  using (auth.jwt() ->> 'role' = 'service_role');

create index if not exists client_logs_created_idx on public.client_logs (created_at desc);
create index if not exists client_logs_level_idx on public.client_logs (level, created_at desc);
create index if not exists client_logs_user_idx on public.client_logs (user_id, created_at desc);

comment on table public.client_logs is 'V3.1 #14 — 작가 PC 클라이언트 에러 자동 수집. 사장님 운영용.';
