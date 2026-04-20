
-- ============ TABLES ============

CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  year integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, year)
);

CREATE TABLE public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, class_id, subject_id)
);

-- ============ RLS ============

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

-- subjects: admin all, teacher read
CREATE POLICY "Admin manages subjects" ON public.subjects
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers read subjects" ON public.subjects
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'teacher'));

-- classes: admin all, teacher read
CREATE POLICY "Admin manages classes" ON public.classes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers read classes" ON public.classes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'teacher'));

-- teachers: admin all, teacher reads all teachers, teacher reads own profile
CREATE POLICY "Admin manages teachers" ON public.teachers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers read teachers" ON public.teachers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'teacher'));

-- students: admin all; teacher reads only students from his assigned classes
CREATE POLICY "Admin manages students" ON public.students
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers read their students" ON public.students
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'teacher')
    AND class_id IN (
      SELECT ta.class_id FROM public.teacher_assignments ta
      JOIN public.teachers t ON t.id = ta.teacher_id
      WHERE t.user_id = auth.uid()
    )
  );

-- teacher_assignments: admin all, teacher reads his own
CREATE POLICY "Admin manages assignments" ON public.teacher_assignments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers read own assignments" ON public.teacher_assignments
  FOR SELECT TO authenticated
  USING (
    teacher_id IN (SELECT id FROM public.teachers WHERE user_id = auth.uid())
  );

-- ============ SEED ============

INSERT INTO public.subjects (name) VALUES
  ('Информатика'), ('Физика'), ('Технология')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.classes (name, year) VALUES
  ('7А', 2025), ('8А', 2025), ('9А', 2025)
ON CONFLICT (name, year) DO NOTHING;
