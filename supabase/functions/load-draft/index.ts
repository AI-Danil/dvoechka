// load-draft: чтение серверного черновика по (student_name, grade, subject, test_id, attempt).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

  if (!student_name || !grade || !subject || !test_id || !attempt) return bad("missing fields");

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data, error } = await admin
    .from("student_drafts")
    .select("written, quiz, updated_at")
    .eq("student_name", student_name)
    .eq("grade", grade)
    .eq("subject", subject)
    .eq("test_id", test_id)
    .eq("attempt", attempt)
    .maybeSingle();

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, draft: data ?? null }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
