// Обновляет replay_url у test_results после загрузки чанков rrweb.
// Публичный эндпоинт (как и send-test-results), но принимает только конкретный resultId
// и устанавливает фиксированный путь по нему. Не позволяет изменить ничего другого.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { resultId } = await req.json();
    if (!resultId || typeof resultId !== "string" || !/^[0-9a-f-]{36}$/i.test(resultId)) {
      return new Response(JSON.stringify({ error: "Invalid resultId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error } = await supabase
      .from("test_results")
      .update({ replay_url: resultId })
      .eq("id", resultId);
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("update-replay-url error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
