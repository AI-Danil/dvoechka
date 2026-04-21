-- Allow anonymous students to upload files to test-attachments
DROP POLICY IF EXISTS "Anon can upload to test-attachments" ON storage.objects;
CREATE POLICY "Anon can upload to test-attachments"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'test-attachments');

-- Allow public read of test-attachments
DROP POLICY IF EXISTS "Public read test-attachments" ON storage.objects;
CREATE POLICY "Public read test-attachments"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'test-attachments');