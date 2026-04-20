
-- 1. Enum ролей
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');

-- 2. Таблица ролей пользователей
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer функция (избегает рекурсии RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
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

-- 4. RLS для user_roles: видеть и менять может только admin
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. Закрыть дыру на test_results
DROP POLICY IF EXISTS "Allow select for all" ON public.test_results;
DROP POLICY IF EXISTS "Allow insert for all" ON public.test_results;

-- SELECT — только учителям/админам с реальной auth-сессией.
-- (Учительский UI ходит через edge-функции с service-role, RLS их не касается.)
CREATE POLICY "Teachers and admins can view results"
  ON public.test_results FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'teacher')
    OR public.has_role(auth.uid(), 'admin')
  );

-- INSERT с клиента полностью запрещён. Запись только через edge-функции
-- (send-test-results) с service-role, который игнорирует RLS.
-- Никаких политик INSERT/UPDATE/DELETE не создаём — RLS включён, значит запрещено по умолчанию.
