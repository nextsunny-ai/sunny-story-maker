-- V3.1 D2 — 작품 본문 시간 단위 snapshot.
-- 매 5분마다 본문 변화 = work_snapshots에 1행 추가.
-- 작가가 "어제 17:00 버전으로 돌리기" = SELECT + UPDATE works.

create table if not exists public.work_snapshots (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  work_id    text not null,                  -- works.id (= projectKey)
  title      text,
  body       text not null,                  -- 본문 (markdown / 평문)
  notes_text text,                            -- 노트 모음 (옵션)
  block_count integer not null default 0,
  char_count  integer not null default 0,
  source     text not null default 'auto'    -- 'auto' (5분) / 'manual' (Ctrl+S)
              check (source in ('auto', 'manual', 'ai-done', 'unload')),
  created_at timestamptz not null default now()
);

alter table public.work_snapshots enable row level security;

-- 작가 본인만 본인 snapshot 읽기·쓰기
create policy "Users read own snapshots"
  on public.work_snapshots for select
  using (auth.uid() = user_id);
create policy "Users insert own snapshots"
  on public.work_snapshots for insert
  with check (auth.uid() = user_id);
create policy "Users delete own snapshots"
  on public.work_snapshots for delete
  using (auth.uid() = user_id);

-- 인덱스 = 최근순·작품별 조회
create index if not exists work_snapshots_user_work_idx
  on public.work_snapshots (user_id, work_id, created_at desc);
create index if not exists work_snapshots_created_idx
  on public.work_snapshots (created_at desc);

-- 자동 정리 — 작품당 100개 초과 = 옛 거 자동 삭제 (= 디스크 보호)
create or replace function public.prune_old_snapshots()
returns trigger language plpgsql as $$
begin
  delete from public.work_snapshots
  where id in (
    select id from public.work_snapshots
    where user_id = new.user_id and work_id = new.work_id
    order by created_at desc
    offset 100
  );
  return new;
end; $$;

create trigger work_snapshots_prune_trigger
  after insert on public.work_snapshots
  for each row execute function public.prune_old_snapshots();

comment on table public.work_snapshots is 'V3.1 D2 — 작품 본문 시간 단위 snapshot. 작가가 옛 버전으로 복원 가능.';
