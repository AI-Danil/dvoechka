-- 1. Расширяем enum test_kind
ALTER TYPE public.test_kind ADD VALUE IF NOT EXISTS 'hybrid';

-- 2. Добавляем поля в test_questions
ALTER TABLE public.test_questions
  ADD COLUMN IF NOT EXISTS response_kind text NOT NULL DEFAULT 'quiz',
  ADD COLUMN IF NOT EXISTS block_title text,
  ADD COLUMN IF NOT EXISTS expected_answer text,
  ADD COLUMN IF NOT EXISTS seconds_override integer;

-- 3. Пересоздаём публичный view без секретных полей
DROP VIEW IF EXISTS public.public_test_questions;
CREATE VIEW public.public_test_questions
WITH (security_invoker = true)
AS
SELECT
  tq.id,
  tq.test_id,
  tq.position,
  tq.question_text,
  tq.options,
  tq.points,
  tq.response_kind,
  tq.block_title,
  tq.seconds_override
FROM public.test_questions tq
WHERE EXISTS (
  SELECT 1 FROM public.tests t
  WHERE t.id = tq.test_id AND t.status = 'published'
);

GRANT SELECT ON public.public_test_questions TO anon, authenticated;

-- 4. Таблица попыток
CREATE TABLE IF NOT EXISTS public.test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL,
  student_name text NOT NULL,
  student_fingerprint text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'in_progress',
  draft_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_phase text NOT NULL DEFAULT 'quiz',
  current_question integer NOT NULL DEFAULT 0,
  attempt_no integer NOT NULL DEFAULT 1,
  cheat_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  result_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT test_attempts_status_chk CHECK (status IN ('in_progress','submitted','abandoned'))
);

CREATE INDEX IF NOT EXISTS idx_test_attempts_test_student
  ON public.test_attempts (test_id, lower(student_name));
CREATE INDEX IF NOT EXISTS idx_test_attempts_status
  ON public.test_attempts (status);

ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;

-- Учителя и админы видят и правят все попытки
CREATE POLICY "Teachers and admins read attempts"
ON public.test_attempts FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers and admins update attempts"
ON public.test_attempts FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Insert/update учеников делает edge function через service role (RLS обходится),
-- поэтому RLS-политик для anon на INSERT/UPDATE не делаем.