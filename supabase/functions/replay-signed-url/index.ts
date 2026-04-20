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
    const { resultId } = await req.json();
    if (!resultId || typeof resultId !== "string") {
      return new Response(JSON.stringify({ error: "resultId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Получаем сам результат для cheat_log + answers
    const { data: result, error: resErr } = await supabase
      .from("test_results")
      .select("id, student_name, grade, subject, cheat_log, answers, time_spent, created_at, replay_url")
      .eq("id", resultId)
      .maybeSingle();

    if (resErr || !result) {
      return new Response(JSON.stringify({ error: "Result not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Список чанков в папке rrweb-sessions/<resultId>/
    const { data: files, error: listErr } = await supabase.storage
      .from("rrweb-sessions")
      .list(resultId, { limit: 1000, sortBy: { column: "name", order: "asc" } });

    if (listErr) console.error("list error:", listErr);

    const chunkUrls: string[] = [];
    if (files && files.length > 0) {
      const paths = files
        .filter((f) => f.name.endsWith(".gz") || f.name.endsWith(".json"))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
        .map((f) => `${resultId}/${f.name}`);

      const { data: signed, error: signErr } = await supabase.storage
        .from("rrweb-sessions")
        .createSignedUrls(paths, 60 * 60); // 1 час

      if (signErr) console.error("sign error:", signErr);
      if (signed) {
        for (const s of signed) if (s.signedUrl) chunkUrls.push(s.signedUrl);
      }
    }

    return new Response(JSON.stringify({ result, chunkUrls }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("replay-signed-url error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
