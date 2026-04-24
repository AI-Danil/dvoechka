DROP VIEW IF EXISTS public.public_tests CASCADE;
DROP VIEW IF EXISTS public.public_test_questions CASCADE;

CREATE VIEW public.public_tests
WITH (security_invoker = on) AS
SELECT
  t.id,
  t.title,
  t.kind,
  t.time_per_question_sec,
  t.class_id,
  t.subject_id,
  t.created_at,
  c.name AS class_name,
  c.year AS class_year,
  s.name AS subject_name
FROM public.tests t
JOIN public.classes c ON c.id = t.class_id
JOIN public.subjects s ON s.id = t.subject_id
WHERE t.status = 'published';

CREATE VIEW public.public_test_questions
WITH (security_invoker = on) AS
SELECT
  q.id,
  q.test_id,
  q.position,
  q.question_text,
  q.options,
  q.points,
  q.response_kind,
  q.block_title,
  q.seconds_override
FROM public.test_questions q
JOIN public.tests t ON t.id = q.test_id
WHERE t.status = 'published';

GRANT SELECT ON public.public_tests TO anon, authenticated;
GRANT SELECT ON public.public_test_questions TO anon, authenticated;

-- Базовым таблицам тоже нужны привилегии SELECT для anon, иначе security_invoker всё равно упрётся.
GRANT SELECT ON public.tests TO anon, authenticated;
GRANT SELECT ON public.test_questions TO anon, authenticated;
GRANT SELECT ON public.classes TO anon, authenticated;
GRANT SELECT ON public.subjects TO anon, authenticated;