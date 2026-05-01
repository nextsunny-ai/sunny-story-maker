-- SUNNY Story Maker — Supabase 스키마
-- 사용법: Supabase 대시보드 → SQL Editor → 새 쿼리 → 이 파일 전체 복붙 → "Run"
-- 이미 실행했어도 안전하게 재실행 가능 (CREATE IF NOT EXISTS)

-- ==========================================
-- 1. 작가 프로필 (writers)
-- ==========================================
create table if not exists writers (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  tagline text default '',
  career text default '',
  preferred_genres text[] default '{}',
  preferred_tone text default '',
  writing_style text default '',
  favorite_authors text default '',
  preferred_metaphor_systems text[] default '{}',
  personal_anti_patterns text[] default '{}',
  preferred_font text default 'Hahmlet',
  preferred_targets text[] default '{}',
  default_export_format text default 'docx',
  notes text default '',
  ip_count int default 0,
  is_active boolean default false,
  created_at timestamptz default now(),
  last_used timestamptz,
  last_modified timestamptz default now()
);

-- ==========================================
-- 2. 작품 (projects)
-- ==========================================
create table if not exists projects (
  id uuid default gen_random_uuid() primary key,
  writer_name text default 'guest',
  name text not null,
  genre text default '',
  idea text default '',
  user_input jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  last_modified timestamptz default now(),
  unique(writer_name, name)
);
create index if not exists idx_projects_writer on projects(writer_name);
create index if not exists idx_projects_modified on projects(last_modified desc);

-- ==========================================
-- 3. 버전 (versions) — 작품의 각 저장본
-- ==========================================
create table if not exists versions (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  version int not null,
  body text,
  metadata jsonb default '{}'::jsonb,
  direction text default '',
  parent_version int,
  char_count int default 0,
  saved_at timestamptz default now(),
  unique(project_id, version)
);
create index if not exists idx_versions_project on versions(project_id, version desc);

-- ==========================================
-- 4. 산출물 (artifacts) — 로그라인/시놉시스/트리트먼트 등
-- ==========================================
create table if not exists artifacts (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  artifact_key text not null,  -- logline / synopsis / treatment / characters / worldview / episodes / proposal / script
  body text,
  metadata jsonb default '{}'::jsonb,
  artifact_version int default 1,
  char_count int default 0,
  saved_at timestamptz default now(),
  unique(project_id, artifact_key, artifact_version)
);
create index if not exists idx_artifacts_project on artifacts(project_id, artifact_key);

-- ==========================================
-- 5. 채팅 (chat_messages) — 보조작가 대화 영구 저장
-- ==========================================
create table if not exists chat_messages (
  id uuid default gen_random_uuid() primary key,
  writer_name text not null default 'guest',
  project_name text default '',
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  ts timestamptz default now()
);
create index if not exists idx_chat_lookup on chat_messages(writer_name, project_name, ts);

-- ==========================================
-- 6. 누적 학습 (learning_lessons)
-- ==========================================
create table if not exists learning_lessons (
  id uuid default gen_random_uuid() primary key,
  writer_name text not null,
  kind text not null check (kind in ('loved','rejected','direction')),
  content text not null,
  context jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_learning_writer on learning_lessons(writer_name, kind, created_at desc);

-- ==========================================
-- RLS — 일단 다 열어둠 (트라이얼). 작가 분리 RLS는 나중에
-- ==========================================
alter table writers enable row level security;
alter table projects enable row level security;
alter table versions enable row level security;
alter table artifacts enable row level security;
alter table chat_messages enable row level security;
alter table learning_lessons enable row level security;

-- 트라이얼: anon 키로 모든 작업 허용 (한 달 후 작가별 격리 정책 추가)
drop policy if exists "trial_all_writers" on writers;
create policy "trial_all_writers" on writers for all using (true) with check (true);

drop policy if exists "trial_all_projects" on projects;
create policy "trial_all_projects" on projects for all using (true) with check (true);

drop policy if exists "trial_all_versions" on versions;
create policy "trial_all_versions" on versions for all using (true) with check (true);

drop policy if exists "trial_all_artifacts" on artifacts;
create policy "trial_all_artifacts" on artifacts for all using (true) with check (true);

drop policy if exists "trial_all_chat" on chat_messages;
create policy "trial_all_chat" on chat_messages for all using (true) with check (true);

drop policy if exists "trial_all_learning" on learning_lessons;
create policy "trial_all_learning" on learning_lessons for all using (true) with check (true);

-- 끝
