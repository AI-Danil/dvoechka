CREATE POLICY "Anon can read rrweb sessions"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'rrweb-sessions');

CREATE POLICY "Anon can update rrweb sessions"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'rrweb-sessions')
  WITH CHECK (bucket_id = 'rrweb-sessions');