-- Security hardening migration
-- 1) Tighten storage policies for test-attachments and rrweb-sessions
--    Bucket test-attachments stays public (files served via getPublicUrl),
--    but we drop broad SELECT policies that allow listing the bucket via RLS.
DROP POLICY IF EXISTS "Anyone can read test attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public read test-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anon can read rrweb sessions" ON storage.objects;
DROP POLICY IF EXISTS "Anon can update rrweb sessions" ON storage.objects;

-- Public file reads still work for `test-attachments` because the bucket is public
-- (objects are served by storage's /object/public/... endpoint without RLS).
-- For `rrweb-sessions` (private) we keep INSERT for anon/authenticated and rely on
-- signed URLs (created server-side via service role) for read access.

-- 2) Lock down SECURITY DEFINER helper functions.
--    They are used internally (RLS policies / triggers / service-role edge fns),
--    not meant to be called directly by clients.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_session_by_code(text) FROM PUBLIC, anon, authenticated;
-- Re-grant to service_role explicitly (it bypasses GRANTs but be explicit for clarity).
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_session_by_code(text) TO service_role;