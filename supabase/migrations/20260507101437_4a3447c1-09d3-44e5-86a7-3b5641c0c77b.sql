
CREATE POLICY "Anon can update rrweb sessions"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'rrweb-sessions')
WITH CHECK (bucket_id = 'rrweb-sessions');

CREATE POLICY "Public read test-attachments"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'test-attachments');

CREATE POLICY "Anon can update test-attachments"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'test-attachments')
WITH CHECK (bucket_id = 'test-attachments');
