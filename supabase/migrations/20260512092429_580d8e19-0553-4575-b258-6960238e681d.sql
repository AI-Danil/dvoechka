
ALTER TABLE public.test_results
  ADD COLUMN IF NOT EXISTS ai_grading jsonb,
  ADD COLUMN IF NOT EXISTS ai_total_score numeric(4,2),
  ADD COLUMN IF NOT EXISTS ai_graded_at timestamptz,
  ADD COLUMN IF NOT EXISTS teacher_grade numeric(4,2),
  ADD COLUMN IF NOT EXISTS teacher_comment text,
  ADD COLUMN IF NOT EXISTS teacher_graded_at timestamptz,
  ADD COLUMN IF NOT EXISTS teacher_graded_by uuid;

CREATE POLICY "Teachers and admins update results"
  ON public.test_results
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.written_answer_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_key text NOT NULL,
  position integer NOT NULL,
  question_text text,
  expected text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (test_key, position)
);

ALTER TABLE public.written_answer_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers and admins read keys"
  ON public.written_answer_keys
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage keys"
  ON public.written_answer_keys
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_written_answer_keys_updated_at
  BEFORE UPDATE ON public.written_answer_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
