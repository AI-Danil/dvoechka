-- Таблица live-сессий
CREATE TABLE public.test_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL,
  teacher_user_id uuid NOT NULL,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','running','finished')),
  duration_sec integer NOT NULL DEFAULT 2400,
  started_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Уникальность кода среди активных сессий
CREATE UNIQUE INDEX uniq_active_session_code
  ON public.test_sessions (code)
  WHERE status IN ('waiting','running');

CREATE INDEX idx_test_sessions_teacher ON public.test_sessions (teacher_user_id);
CREATE INDEX idx_test_sessions_test ON public.test_sessions (test_id);

-- Участники сессии
CREATE TABLE public.test_session_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.test_sessions(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  attempt_id uuid,
  joined_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  UNIQUE (session_id, student_name)
);

CREATE INDEX idx_session_participants_session ON public.test_session_participants (session_id);

-- updated_at trigger
CREATE TRIGGER trg_test_sessions_updated
BEFORE UPDATE ON public.test_sessions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_session_participants ENABLE ROW LEVEL SECURITY;

-- Учитель: полный доступ к своим сессиям
CREATE POLICY "Teachers manage own sessions"
ON public.test_sessions
FOR ALL TO authenticated
USING (teacher_user_id = auth.uid())
WITH CHECK (teacher_user_id = auth.uid());

CREATE POLICY "Admins manage all sessions"
ON public.test_sessions
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Участники: учитель видит участников своих сессий
CREATE POLICY "Teachers read own session participants"
ON public.test_session_participants
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.test_sessions s
  WHERE s.id = test_session_participants.session_id
    AND (s.teacher_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
));

-- RPC: безопасный публичный поиск сессии по коду (для anon учеников)
CREATE OR REPLACE FUNCTION public.get_session_by_code(_code text)
RETURNS TABLE (
  id uuid,
  test_id uuid,
  status text,
  duration_sec integer,
  started_at timestamptz,
  ends_at timestamptz,
  test_title text,
  test_kind test_kind,
  class_name text,
  subject_name text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id, s.test_id, s.status, s.duration_sec, s.started_at, s.ends_at,
    t.title, t.kind, c.name, sub.name
  FROM public.test_sessions s
  JOIN public.tests t ON t.id = s.test_id
  JOIN public.classes c ON c.id = t.class_id
  JOIN public.subjects sub ON sub.id = t.subject_id
  WHERE upper(s.code) = upper(_code)
    AND s.status IN ('waiting','running')
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_session_by_code(text) TO anon, authenticated;

-- Realtime
ALTER TABLE public.test_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.test_session_participants REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.test_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.test_session_participants;