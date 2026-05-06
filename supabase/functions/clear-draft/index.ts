// clear-draft: удаление черновика после успешного сабмита.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { parseJson, z } from "../_shared/validate.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BodySchema = z.object({
  student_name: z.string().min(1).max(200),
  grade: z.string().min(1).max(10),
  subject: z.string().min(1).max(50),
  test_id: z.string().min(1).max(100),
  attempt: z.string().min(1).max(10).default("1"),
});

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== "POST") return errorResponse("method", "method not allowed", 405);

  const parsed = await parseJson(req, BodySchema);
  if (!parsed.ok) return parsed.response;
  const { student_name, grade, subject, test_id, attempt } = parsed.data;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { error } = await admin
    .from("student_drafts").delete()
    .eq("student_name", student_name)
    .eq("grade", grade)
    .eq("subject", subject)
    .eq("test_id", test_id)
    .eq("attempt", attempt);

  if (error) return errorResponse("db_error", error.message, 500);
  return jsonResponse({ ok: true });
});
