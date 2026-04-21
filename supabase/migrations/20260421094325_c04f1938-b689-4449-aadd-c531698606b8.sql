DROP VIEW IF EXISTS public.public_test_questions CASCADE;
DROP VIEW IF EXISTS public.public_tests CASCADE;

CREATE VIEW public.public_tests
WITH (security_invoker = true) AS
SELECT
  t.id,
  t.title,
  t.kind,
  t.time_per_question_sec,
  t.class_id,
  c.name AS class_name,
  c.year AS class_year,
  t.subject_id,
  s.name AS subject_name,
  t.created_at
FROM public.tests t
JOIN public.classes c ON c.id = t.class_id
JOIN public.subjects s ON s.id = t.subject_id
WHERE t.status = 'published';

GRANT SELECT ON public.public_tests TO anon, authenticated;

CREATE VIEW public.public_test_questions
WITH (security_invoker = true) AS
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

GRANT SELECT ON public.public_test_questions TO anon, authenticated;