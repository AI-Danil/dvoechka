INSERT INTO storage.buckets (id, name, public) VALUES ('test-attachments', 'test-attachments', true);

CREATE POLICY "Anyone can upload test attachments" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'test-attachments');

CREATE POLICY "Anyone can read test attachments" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'test-attachments');