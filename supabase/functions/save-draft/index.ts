// save-draft: серверный автосейв черновика (письменные ответы + квиз).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { parseJson, z } from "../_shared/validate.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_BYTES = 256 * 1024;

const BodySchema = z.object({
  student_name: z.string().min(1).max(200),
  grade: z.string().min(1).max(10),
  subject: z.string().min(1).max(50),
  test_id: z.string().min(1).max(100),
  attempt: z.string().min(1).max(10).default("1"),
  written: z.unknown().optional(),
  quiz: z.unknown().optional(),
});

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== "POST") return errorResponse("method", "method not allowed", 405);

  const parsed = await parseJson(req, BodySchema);
  if (!parsed.ok) return parsed.response;
  const { student_name, grade, subject, test_id, attempt, written, quiz } = parsed.data;

  const probe = JSON.stringify({ written, quiz });
  if (probe.length > MAX_BYTES) return errorResponse("payload_too_large", "payload too large", 413);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const patch: Record<string, unknown> = {
    student_name, grade, subject, test_id, attempt,
    updated_at: new Date().toISOString(),
  };
  if (written !== undefined) patch.written = written;
  if (quiz !== undefined) patch.quiz = quiz;

  const { error } = await admin
    .from("student_drafts")
    .upsert(patch, { onConflict: "student_name,grade,subject,test_id,attempt" });

  if (error) return errorResponse("db_error", error.message, 500);
  return jsonResponse({ ok: true });
});
