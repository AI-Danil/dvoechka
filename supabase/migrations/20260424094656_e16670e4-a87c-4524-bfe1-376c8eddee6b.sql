CREATE POLICY "Anyone reads classes"
ON public.classes FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone reads subjects"
ON public.subjects FOR SELECT
TO anon, authenticated
USING (true);