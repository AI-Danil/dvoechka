// Разовая функция: для записей test_results без replay_url проверяет,
// есть ли rrweb-чанки в bucket по пути <id>/, и если да — проставляет replay_url.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: { ids?: string[] } = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const targetIds = body.ids;

  // Берём все записи без replay_url (или только указанные)
  let q = supabase.from("test_results").select("id, student_name, replay_url").is("replay_url", null);
  if (targetIds?.length) q = supabase.from("test_results").select("id, student_name, replay_url").in("id", targetIds);

  const { data: rows, error } = await q;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const report: Array<{ id: string; student_name: string; chunks: number; updated: boolean }> = [];

  for (const r of rows ?? []) {
    const { data: list, error: listErr } = await supabase.storage
      .from("rrweb-sessions")
      .list(r.id, { limit: 1000 });
    if (listErr) {
      report.push({ id: r.id, student_name: r.student_name, chunks: -1, updated: false });
      continue;
    }
    const chunks = (list ?? []).filter((f) => f.name?.startsWith("chunk-")).length;
    let updated = false;
    if (chunks > 0 && !r.replay_url) {
      const { error: upErr } = await supabase
        .from("test_results")
        .update({ replay_url: `${r.id}/` })
        .eq("id", r.id);
      updated = !upErr;
    }
    report.push({ id: r.id, student_name: r.student_name, chunks, updated });
  }

  return new Response(JSON.stringify({ report }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
