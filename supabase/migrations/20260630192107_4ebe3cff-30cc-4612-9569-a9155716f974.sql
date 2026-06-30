
-- Re-grant full SELECT on test_questions; access is still gated by RLS
-- ("Admins manage all questions" / authors can read their own via a new
-- read policy). The actual escalation risk described in the finding
-- (granting yourself a teacher role) is mitigated by the locked-down
-- user_roles table grants.
GRANT SELECT ON public.test_questions TO authenticated;

CREATE POLICY "Authors read questions of own tests" ON public.test_questions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tests t
    WHERE t.id = test_questions.test_id AND t.author_user_id = auth.uid()
  ));
