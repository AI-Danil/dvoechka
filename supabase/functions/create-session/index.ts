// Учитель создаёт live-сессию теста, возвращает уникальный 4-символьный код.
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

// Без 0/O/1/I — чтобы не путать
const ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genCode(n = 4) {
  let s = "";
  for (let i = 0; i < n; i++) s += ALPH[Math.floor(Math.random() * ALPH.length)];
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ ok: false, error: "no auth" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ ok: false, error: "unauthorized" }, 401);

    const { test_id, duration_min } = await req.json();
    if (!test_id) return json({ ok: false, error: "test_id обязателен" });
    const dur = Math.max(1, Math.min(300, Number(duration_min) || 40));

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Проверим, что тест существует и опубликован
    const { data: test } = await admin
      .from("tests")
      .select("id, status, author_user_id, title")
      .eq("id", test_id)
      .maybeSingle();
    if (!test) return json({ ok: false, error: "Тест не найден" });
    if (test.status !== "published") return json({ ok: false, error: "Тест не опубликован" });

    // Генерируем уникальный код (до 10 попыток)
    let code = "";
    for (let i = 0; i < 10; i++) {
      const c = genCode(4);
      const { data: ex } = await admin
        .from("test_sessions")
        .select("id")
        .eq("code", c)
        .in("status", ["waiting", "running"])
        .maybeSingle();
      if (!ex) {
        code = c;
        break;
      }
    }
    if (!code) return json({ ok: false, error: "Не удалось сгенерировать код" });

    const { data: session, error } = await admin
      .from("test_sessions")
      .insert({
        test_id,
        teacher_user_id: u.user.id,
        code,
        status: "waiting",
        duration_sec: dur * 60,
      })
      .select("*")
      .single();
    if (error) return json({ ok: false, error: error.message });

    return json({ ok: true, session });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "unknown" });
  }
});
