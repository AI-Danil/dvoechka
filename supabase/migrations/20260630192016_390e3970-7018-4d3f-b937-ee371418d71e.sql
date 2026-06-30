
-- =========================================================
-- 1) Private schema for security-definer helpers
-- =========================================================
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO anon, authenticated, service_role;

-- =========================================================
-- 2) Recreate all policies using private.has_role
-- =========================================================

-- user_roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- test_results
DROP POLICY IF EXISTS "Teachers and admins can view results" ON public.test_results;
DROP POLICY IF EXISTS "Teachers and admins update results" ON public.test_results;
CREATE POLICY "Teachers and admins can view results" ON public.test_results
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'teacher'::public.app_role) OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Teachers and admins update results" ON public.test_results
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(),'teacher'::public.app_role) OR private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'teacher'::public.app_role) OR private.has_role(auth.uid(),'admin'::public.app_role));

-- subjects
DROP POLICY IF EXISTS "Admin manages subjects" ON public.subjects;
DROP POLICY IF EXISTS "Teachers read subjects" ON public.subjects;
CREATE POLICY "Admin manages subjects" ON public.subjects
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Teachers read subjects" ON public.subjects
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'teacher'::public.app_role));

-- classes
DROP POLICY IF EXISTS "Admin manages classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers read classes" ON public.classes;
CREATE POLICY "Admin manages classes" ON public.classes
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Teachers read classes" ON public.classes
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'teacher'::public.app_role));

-- teachers
DROP POLICY IF EXISTS "Admin manages teachers" ON public.teachers;
DROP POLICY IF EXISTS "Teachers read teachers" ON public.teachers;
CREATE POLICY "Admin manages teachers" ON public.teachers
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Teachers read teachers" ON public.teachers
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'teacher'::public.app_role));

-- students
DROP POLICY IF EXISTS "Admin manages students" ON public.students;
DROP POLICY IF EXISTS "Teachers read their students" ON public.students;
CREATE POLICY "Admin manages students" ON public.students
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Teachers read their students" ON public.students
  FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(),'teacher'::public.app_role)
    AND (class_id IN (
      SELECT ta.class_id FROM public.teacher_assignments ta
      JOIN public.teachers t ON t.id = ta.teacher_id
      WHERE t.user_id = auth.uid()
    ))
  );

-- teacher_assignments
DROP POLICY IF EXISTS "Admin manages assignments" ON public.teacher_assignments;
CREATE POLICY "Admin manages assignments" ON public.teacher_assignments
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));

-- tests
DROP POLICY IF EXISTS "Admins manage all tests" ON public.tests;
DROP POLICY IF EXISTS "Teachers read tests of their classes" ON public.tests;
CREATE POLICY "Admins manage all tests" ON public.tests
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Teachers read tests of their classes" ON public.tests
  FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(),'teacher'::public.app_role)
    AND ((class_id, subject_id) IN (
      SELECT ta.class_id, ta.subject_id FROM public.teacher_assignments ta
      JOIN public.teachers t ON t.id = ta.teacher_id
      WHERE t.user_id = auth.uid()
    ))
  );

-- test_questions
DROP POLICY IF EXISTS "Admins manage all questions" ON public.test_questions;
CREATE POLICY "Admins manage all questions" ON public.test_questions
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));

-- test_attempts
DROP POLICY IF EXISTS "Teachers and admins read attempts" ON public.test_attempts;
DROP POLICY IF EXISTS "Teachers and admins update attempts" ON public.test_attempts;
CREATE POLICY "Teachers and admins read attempts" ON public.test_attempts
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'teacher'::public.app_role) OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Teachers and admins update attempts" ON public.test_attempts
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(),'teacher'::public.app_role) OR private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'teacher'::public.app_role) OR private.has_role(auth.uid(),'admin'::public.app_role));

-- test_sessions
DROP POLICY IF EXISTS "Admins manage all sessions" ON public.test_sessions;
CREATE POLICY "Admins manage all sessions" ON public.test_sessions
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));

-- test_session_participants
DROP POLICY IF EXISTS "Teachers read own session participants" ON public.test_session_participants;
CREATE POLICY "Teachers read own session participants" ON public.test_session_participants
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.test_sessions s
    WHERE s.id = test_session_participants.session_id
      AND (s.teacher_user_id = auth.uid() OR private.has_role(auth.uid(),'admin'::public.app_role))
  ));

-- student_drafts
DROP POLICY IF EXISTS "Teachers and admins read drafts" ON public.student_drafts;
CREATE POLICY "Teachers and admins read drafts" ON public.student_drafts
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'teacher'::public.app_role) OR private.has_role(auth.uid(),'admin'::public.app_role));

-- written_answer_keys
DROP POLICY IF EXISTS "Teachers and admins read keys" ON public.written_answer_keys;
DROP POLICY IF EXISTS "Admins manage keys" ON public.written_answer_keys;
CREATE POLICY "Teachers and admins read keys" ON public.written_answer_keys
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'teacher'::public.app_role) OR private.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Admins manage keys" ON public.written_answer_keys
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));

-- =========================================================
-- 3) Remove old public security-definer functions
-- =========================================================
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.get_session_by_code(text);

-- =========================================================
-- 4) set_updated_at: switch to SECURITY INVOKER (trigger only)
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END
$function$;

-- =========================================================
-- 5) test_questions: hide answer keys at column-grant level
--    so even authors/teachers cannot read correct_index /
--    expected_answer via the API. Edge functions (service_role)
--    keep full access.
-- =========================================================
DROP POLICY IF EXISTS "Authors manage questions of own tests" ON public.test_questions;

-- Recreate, but only for non-SELECT actions; reads happen via
-- service_role inside edge functions.
CREATE POLICY "Authors write questions of own tests" ON public.test_questions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tests t
    WHERE t.id = test_questions.test_id AND t.author_user_id = auth.uid()
  ));
CREATE POLICY "Authors update questions of own tests" ON public.test_questions
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tests t
    WHERE t.id = test_questions.test_id AND t.author_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tests t
    WHERE t.id = test_questions.test_id AND t.author_user_id = auth.uid()
  ));
CREATE POLICY "Authors delete questions of own tests" ON public.test_questions
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tests t
    WHERE t.id = test_questions.test_id AND t.author_user_id = auth.uid()
  ));

-- Column-level read protection
REVOKE SELECT ON public.test_questions FROM anon, authenticated;
GRANT SELECT (id, test_id, position, question_text, options, points, response_kind, block_title, seconds_override, created_at)
  ON public.test_questions TO authenticated;
-- (correct_index, expected_answer not granted to anon/authenticated)

-- Lock down user_roles INSERT explicitly (defence-in-depth)
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO service_role;

-- =========================================================
-- 6) Storage policies hardening
-- =========================================================

-- Drop overly permissive UPDATE policies
DROP POLICY IF EXISTS "Anon can update rrweb sessions" ON storage.objects;
DROP POLICY IF EXISTS "Anon can update test-attachments" ON storage.objects;

-- Drop overly permissive public-listing SELECT on test-attachments
-- (the bucket is public, so direct CDN URLs continue to work).
DROP POLICY IF EXISTS "Public read test-attachments" ON storage.objects;

-- Re-scope INSERT on test-attachments to expected student_* prefix.
DROP POLICY IF EXISTS "Anon can upload to test-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload test attachments" ON storage.objects;
CREATE POLICY "Upload student test attachments" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'test-attachments'
    AND (name LIKE 'student\_%' OR name LIKE 'session\_%')
  );

-- Allow upsert (UPDATE) for those same controlled paths only.
CREATE POLICY "Update own student test attachments" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (
    bucket_id = 'test-attachments'
    AND (name LIKE 'student\_%' OR name LIKE 'session\_%')
  )
  WITH CHECK (
    bucket_id = 'test-attachments'
    AND (name LIKE 'student\_%' OR name LIKE 'session\_%')
  );

-- Re-scope rrweb-sessions INSERT to anon/authenticated explicitly
-- (was previously granted to the empty {-} role set).
DROP POLICY IF EXISTS "Anyone can upload rrweb sessions" ON storage.objects;
CREATE POLICY "Upload rrweb session chunks" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'rrweb-sessions');
