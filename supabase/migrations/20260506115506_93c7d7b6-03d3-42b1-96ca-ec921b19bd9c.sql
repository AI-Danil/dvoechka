CREATE TABLE public.student_drafts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name text NOT NULL,
  grade text NOT NULL,
  subject text NOT NULL,
  test_id text NOT NULL,
  attempt text NOT NULL DEFAULT '1',
  written jsonb NOT NULL DEFAULT '{}'::jsonb,
  quiz jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_name, grade, subject, test_id, attempt)
);

CREATE INDEX idx_student_drafts_lookup
  ON public.student_drafts (student_name, grade, subject, test_id, attempt);

ALTER TABLE public.student_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers and admins read drafts"
  ON public.student_drafts FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_student_drafts_updated_at
  BEFORE UPDATE ON public.student_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();