// save-attempt-progress: автосейв черновика ответов и текущей позиции.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { attempt_id, draft_answers, current_phase, current_question } = await req.json();
    if (!attempt_id) {
      return new Response(JSON.stringify({ ok: false, error: "attempt_id обязателен" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const patch: Record<string, unknown> = { last_activity_at: new Date().toISOString() };
    if (draft_answers !== undefined) patch.draft_answers = draft_answers;
    if (current_phase) patch.current_phase = current_phase;
    if (typeof current_question === "number") patch.current_question = current_question;

    const { error } = await admin
      .from("test_attempts")
      .update(patch)
      .eq("id", attempt_id)
      .eq("status", "in_progress");
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "unknown" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
