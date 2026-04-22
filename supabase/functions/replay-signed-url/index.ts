import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyTeacherToken, getTokenFromRequest } from "../_shared/teacher-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-teacher-token",
};

async function isAuthorized(req: Request): Promise<boolean> {
  // 1) teacher-токен (либо в x-teacher-token, либо в Authorization Bearer)
  const teacherToken = getTokenFromRequest(req);
  if (teacherToken && (await verifyTeacherToken(teacherToken))) return true;

  // 2) user JWT с ролью admin/teacher
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) return false;
  const jwt = auth.slice(7).trim();
  if (!jwt) return false;

  try {
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } },
    );
    const { data: claims, error } = await supa.auth.getClaims(jwt);
    if (error || !claims?.claims?.sub) return false;
    const uid = claims.claims.sub;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);
    const list = (roles ?? []).map((r) => r.role as string);
    return list.includes("admin") || list.includes("teacher");
  } catch (e) {
    console.error("user-jwt auth failed:", e);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!(await isAuthorized(req))) {
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

    const { data: result, error: resErr } = await supabase
      .from("test_results")
      .select("id, student_name, grade, subject, test_type, cheat_log, answers, time_spent, created_at, replay_url")
      .eq("id", resultId)
      .maybeSingle();

    if (resErr || !result) {
      return new Response(JSON.stringify({ error: "Result not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
        .createSignedUrls(paths, 60 * 60);

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
