// save-draft: серверный автосейв черновика (письменные ответы + квиз) для обычного режима.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_BYTES = 256 * 1024;

function bad(msg: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return bad("method not allowed", 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return bad("invalid json");
  }

  const student_name = String(body.student_name ?? "").trim();
  const grade = String(body.grade ?? "").trim();
  const subject = String(body.subject ?? "").trim();
  const test_id = String(body.test_id ?? "").trim();
  const attempt = String(body.attempt ?? "1").trim();

  if (!student_name || student_name.length > 200) return bad("student_name");
  if (!grade || grade.length > 10) return bad("grade");
  if (!subject || subject.length > 50) return bad("subject");
  if (!test_id || test_id.length > 100) return bad("test_id");
  if (!attempt || attempt.length > 10) return bad("attempt");

  const written = body.written;
  const quiz = body.quiz;

  // payload size guard
  const probe = JSON.stringify({ written, quiz });
  if (probe.length > MAX_BYTES) return bad("payload too large", 413);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const patch: Record<string, unknown> = {
    student_name,
    grade,
    subject,
    test_id,
    attempt,
    updated_at: new Date().toISOString(),
  };
  if (written !== undefined) patch.written = written;
  if (quiz !== undefined) patch.quiz = quiz;

  const { error } = await admin
    .from("student_drafts")
    .upsert(patch, { onConflict: "student_name,grade,subject,test_id,attempt" });

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
