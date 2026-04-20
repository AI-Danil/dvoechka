import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyTeacherToken, getTokenFromRequest } from "../_shared/teacher-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-teacher-token",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const token = getTokenFromRequest(req);
  if (!(await verifyTeacherToken(token))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("test_results")
      .select("id, student_name, grade, subject, test_type, attempt, time_spent, cheat_log, replay_url, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) throw error;

    const enriched = (data || []).map((r) => ({
      ...r,
      cheat_count: Array.isArray(r.cheat_log) ? r.cheat_log.length : 0,
    }));

    return new Response(JSON.stringify({ results: enriched }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("list-results error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
