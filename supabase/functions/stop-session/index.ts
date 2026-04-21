// Учитель закрывает live-сессию досрочно.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ ok: false, error: "no auth" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ ok: false, error: "unauthorized" }, 401);

    const { session_id } = await req.json();
    if (!session_id) return json({ ok: false, error: "session_id обязателен" });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: s } = await admin
      .from("test_sessions")
      .select("*")
      .eq("id", session_id)
      .maybeSingle();
    if (!s) return json({ ok: false, error: "Сессия не найдена" });
    if (s.teacher_user_id !== u.user.id) return json({ ok: false, error: "Это не ваша сессия" }, 403);

    const nowIso = new Date().toISOString();
    await admin
      .from("test_sessions")
      .update({ status: "finished", ends_at: nowIso })
      .eq("id", session_id);

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "unknown" });
  }
});
