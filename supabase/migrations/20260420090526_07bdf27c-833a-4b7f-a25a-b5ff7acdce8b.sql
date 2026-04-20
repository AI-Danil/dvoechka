
ALTER TABLE public.test_results ADD COLUMN IF NOT EXISTS replay_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('rrweb-sessions', 'rrweb-sessions', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload rrweb sessions"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'rrweb-sessions');

CREATE POLICY "Anyone can list rrweb sessions"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'rrweb-sessions');
