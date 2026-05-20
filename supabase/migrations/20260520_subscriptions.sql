-- V3.1 — subscriptions 테이블 마이그레이션 (옛 인계 5/19 C-5 미완 항목)
-- license.ts·license/check route가 사용하는 구독 정보 영속화. BYOK 모델이라 강제는 X, 메모용·운영용.

create table if not exists public.subscriptions (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  plan        text not null default 'trial_30days'
                check (plan in ('trial_30days', 'free', 'pro', 'studio', 'lifetime', 'banned')),
  status      text not null default 'active'
                check (status in ('active', 'suspended', 'expired')),
  started_at  timestamptz not null default now(),
  expires_at  timestamptz,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- RLS
alter table public.subscriptions enable row level security;

create policy "Users can read own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- admin·service_role만 update/insert (BYOK 모델이라 작가 본인은 변경 X)
create policy "Service role can manage subscriptions"
  on public.subscriptions for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- 갱신 timestamp 자동
create or replace function public.subscriptions_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger subscriptions_updated_at_trigger
before update on public.subscriptions
for each row execute function public.subscriptions_set_updated_at();

-- 신규 가입 시 자동 trial_30days 생성 (auth.users insert 트리거에서 호출 가능)
create or replace function public.create_default_subscription()
returns trigger language plpgsql security definer as $$
begin
  insert into public.subscriptions (user_id, plan, status, started_at, expires_at)
  values (new.id, 'trial_30days', 'active', now(), now() + interval '30 days')
  on conflict (user_id) do nothing;
  return new;
end; $$;

-- 트리거 (optional — auth schema에 접근 권한 필요)
-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row execute function public.create_default_subscription();

comment on table public.subscriptions is 'V3.1 — 작가 구독·플랜 정보. BYOK 모델이라 결제 강제 X, 운영용 메타데이터.';
