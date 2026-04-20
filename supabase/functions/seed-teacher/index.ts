import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Защита: только если в системе ещё нет учителей
    const { count, error: countErr } = await supabase
      .from("teachers")
      .select("*", { count: "exact", head: true });
    if (countErr) throw countErr;
    if ((count ?? 0) > 0) {
      return new Response(JSON.stringify({ error: "Teachers already exist" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = "Teatcher01@test.ru";
    const password = "Teatcher01";
    const fullName = "Тестовый Учитель";

    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createErr) throw createErr;
    const userId = created.user!.id;

    const { error: roleErr } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: "teacher",
    });
    if (roleErr) throw roleErr;

    const { error: profileErr } = await supabase.from("teachers").insert({
      user_id: userId,
      full_name: fullName,
      email,
    });
    if (profileErr) throw profileErr;

    return new Response(JSON.stringify({ ok: true, email }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("seed-teacher error:", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
