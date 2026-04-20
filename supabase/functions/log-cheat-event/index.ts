// log-cheat-event: добавляет одно событие в cheat_log попытки. Принимает sendBeacon.
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
    const { attempt_id, event } = await req.json();
    if (!attempt_id || !event?.type) {
      return new Response(JSON.stringify({ ok: false, error: "attempt_id и event.type обязательны" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: row } = await admin
      .from("test_attempts")
      .select("cheat_log")
      .eq("id", attempt_id)
      .maybeSingle();
    const newLog = [
      ...(Array.isArray(row?.cheat_log) ? row!.cheat_log : []),
      { ...event, timestamp: event.timestamp ?? Date.now() },
    ];
    await admin
      .from("test_attempts")
      .update({ cheat_log: newLog, last_activity_at: new Date().toISOString() })
      .eq("id", attempt_id);
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
