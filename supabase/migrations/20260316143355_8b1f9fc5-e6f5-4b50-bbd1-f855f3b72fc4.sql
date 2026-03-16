
CREATE TABLE public.test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name text NOT NULL,
  grade integer NOT NULL,
  subject text NOT NULL,
  attempt integer DEFAULT 1,
  test_type text,
  answers jsonb NOT NULL,
  attachments jsonb DEFAULT '{}',
  cheat_log jsonb DEFAULT '[]',
  time_spent integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert for all"
  ON public.test_results FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow select for all"
  ON public.test_results FOR SELECT
  USING (true);
