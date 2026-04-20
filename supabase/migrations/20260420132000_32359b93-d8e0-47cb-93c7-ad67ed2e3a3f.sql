
-- Enums for tests
DO $$ BEGIN
  CREATE TYPE public.test_kind AS ENUM ('quiz','written');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.test_status AS ENUM ('draft','published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- tests table
CREATE TABLE IF NOT EXISTS public.tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id uuid NOT NULL,
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind public.test_kind NOT NULL,
  time_per_question_sec integer NOT NULL DEFAULT 30,
  status public.test_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tests_class_subject_status ON public.tests(class_id, subject_id, status);
CREATE INDEX IF NOT EXISTS idx_tests_author ON public.tests(author_user_id);

-- test_questions table
CREATE TABLE IF NOT EXISTS public.test_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  position integer NOT NULL,
  question_text text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_index integer,
  points integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_test_questions_test_position ON public.test_questions(test_id, position);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_tests_updated_at ON public.tests;
CREATE TRIGGER trg_tests_updated_at BEFORE UPDATE ON public.tests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;

-- RLS: tests
DROP POLICY IF EXISTS "Authors manage own tests" ON public.tests;
CREATE POLICY "Authors manage own tests" ON public.tests
  FOR ALL TO authenticated
  USING (author_user_id = auth.uid())
  WITH CHECK (author_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage all tests" ON public.tests;
CREATE POLICY "Admins manage all tests" ON public.tests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Teachers read tests of their classes" ON public.tests;
CREATE POLICY "Teachers read tests of their classes" ON public.tests
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'teacher')
    AND (class_id, subject_id) IN (
      SELECT ta.class_id, ta.subject_id
      FROM public.teacher_assignments ta
      JOIN public.teachers t ON t.id = ta.teacher_id
      WHERE t.user_id = auth.uid()
    )
  );

-- RLS: test_questions (mirror tests access)
DROP POLICY IF EXISTS "Authors manage questions of own tests" ON public.test_questions;
CREATE POLICY "Authors manage questions of own tests" ON public.test_questions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_id AND t.author_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_id AND t.author_user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins manage all questions" ON public.test_questions;
CREATE POLICY "Admins manage all questions" ON public.test_questions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Public VIEWs for anonymous students (only published, no correct_index leak)
CREATE OR REPLACE VIEW public.public_tests
WITH (security_invoker = true) AS
SELECT id, class_id, subject_id, title, kind, time_per_question_sec, created_at
FROM public.tests
WHERE status = 'published';

CREATE OR REPLACE VIEW public.public_test_questions
WITH (security_invoker = true) AS
SELECT q.id, q.test_id, q.position, q.question_text, q.options, q.points
FROM public.test_questions q
JOIN public.tests t ON t.id = q.test_id
WHERE t.status = 'published';

-- Allow anon + authenticated to read published via views (need direct table SELECT for security_invoker)
DROP POLICY IF EXISTS "Anyone reads published tests" ON public.tests;
CREATE POLICY "Anyone reads published tests" ON public.tests
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

DROP POLICY IF EXISTS "Anyone reads questions of published tests" ON public.test_questions;
CREATE POLICY "Anyone reads questions of published tests" ON public.test_questions
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_id AND t.status = 'published'));

GRANT SELECT ON public.public_tests TO anon, authenticated;
GRANT SELECT ON public.public_test_questions TO anon, authenticated;

-- Seed: assign Teatcher01 to 9А × Физика and 7А × Технология (idempotent)
INSERT INTO public.teacher_assignments (teacher_id, class_id, subject_id)
SELECT '31651e5d-6967-49f8-9d1f-effcb6d563e2'::uuid, '98f33385-eeaa-4471-8eaf-19c6f6168cc6'::uuid, 'f54cad85-bfc7-4b78-8494-329eacfd7fa8'::uuid
WHERE NOT EXISTS (
  SELECT 1 FROM public.teacher_assignments
  WHERE teacher_id = '31651e5d-6967-49f8-9d1f-effcb6d563e2'
    AND class_id = '98f33385-eeaa-4471-8eaf-19c6f6168cc6'
    AND subject_id = 'f54cad85-bfc7-4b78-8494-329eacfd7fa8'
);

INSERT INTO public.teacher_assignments (teacher_id, class_id, subject_id)
SELECT '31651e5d-6967-49f8-9d1f-effcb6d563e2'::uuid, 'bb6299d1-4f94-4290-89ed-25f1a977511a'::uuid, 'e671aa1c-c3a9-4d1f-9969-e74666755806'::uuid
WHERE NOT EXISTS (
  SELECT 1 FROM public.teacher_assignments
  WHERE teacher_id = '31651e5d-6967-49f8-9d1f-effcb6d563e2'
    AND class_id = 'bb6299d1-4f94-4290-89ed-25f1a977511a'
    AND subject_id = 'e671aa1c-c3a9-4d1f-9969-e74666755806'
);

-- Ensure teacher role
INSERT INTO public.user_roles (user_id, role)
SELECT 'f428a126-2de6-4ed5-b803-69a27fcbf884'::uuid, 'teacher'::app_role
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = 'f428a126-2de6-4ed5-b803-69a27fcbf884' AND role = 'teacher'
);
