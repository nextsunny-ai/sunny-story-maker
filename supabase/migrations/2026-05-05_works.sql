-- ============================================================
-- 스토리메이커 V2.11 — 작품 저장 = Supabase로 마이그레이션
-- 박힘일: 2026-05-05
-- 대표님 명시: 작품 = production(Vercel) 디스크 휘발성 = Supabase DB로 박아야 영구 저장.
-- 대표님 손: 1번 — Supabase SQL Editor에 이거 붙여넣고 Run.
--   콘솔: https://supabase.com/dashboard/project/lcasxovjrgbnraxzyvnf/sql/new
-- ============================================================

-- 1. works 테이블 ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.works (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  work_id     TEXT NOT NULL,                              -- 옛 _works/[workId] 호환 (예: "A-나의_드라마")
  title       TEXT,
  genre       TEXT,                                       -- A·B·C·... (매체 letter)
  letter      TEXT,
  files       JSONB NOT NULL DEFAULT '{}'::jsonb,         -- { "01_제목.md": "...", "02_시놉시스.md": "...", ... }
  preview     TEXT,                                       -- 시놉시스/로그라인 첫 120자
  prog        NUMERIC DEFAULT 0,                          -- 0.0 ~ 1.0
  meta        JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT works_user_workid_unique UNIQUE (user_id, work_id)
);

-- 2. RLS (★ 작가 = 본인 작품만 ★) ---------------------------------
ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_select_own_works" ON public.works;
CREATE POLICY "users_can_select_own_works"
  ON public.works FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_can_insert_own_works" ON public.works;
CREATE POLICY "users_can_insert_own_works"
  ON public.works FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_can_update_own_works" ON public.works;
CREATE POLICY "users_can_update_own_works"
  ON public.works FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users_can_delete_own_works" ON public.works;
CREATE POLICY "users_can_delete_own_works"
  ON public.works FOR DELETE
  USING (auth.uid() = user_id);

-- 3. updated_at 자동 갱신 ---------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS works_set_updated_at ON public.works;
CREATE TRIGGER works_set_updated_at
  BEFORE UPDATE ON public.works
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. 인덱스 (= 라이브러리 = 최근 수정 순 정렬) -----------------------
CREATE INDEX IF NOT EXISTS works_user_id_updated_at_idx
  ON public.works (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS works_user_id_work_id_idx
  ON public.works (user_id, work_id);

-- ============================================================
-- 검증 쿼리 (대표님 = Run 후 = 이거 한 번 더 실행 = 결과 박힌 거 확인)
-- ============================================================
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'works';
-- SELECT policyname FROM pg_policies WHERE tablename = 'works';
