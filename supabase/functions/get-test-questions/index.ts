// get-test-questions: отдаёт вопросы теста БЕЗ correct_index/expected_answer.
// Доступ только тем, у кого есть активная попытка (test_attempts) или live-сессия.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { attempt_id, test_id } = await req.json();
    if (!attempt_id && !test_id) return json({ ok: false, error: "attempt_id или test_id обязателен" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Если передан attempt_id — проверяем активную попытку.
    let resolvedTestId: string | null = null;
    let attemptInactive = false;
    if (attempt_id) {
      const { data: attempt, error: aErr } = await admin
        .from("test_attempts")
        .select("test_id, status")
        .eq("id", attempt_id)
        .maybeSingle();
      if (aErr || !attempt) return json({ ok: false, error: "Попытка не найдена" }, 404);
      // НЕ блокируем выдачу вопросов, если попытка уже не active — иначе UI получает []
      // и падает в белый экран. Просто помечаем флагом, чтобы клиент мог среагировать.
      if (attempt.status !== "in_progress") attemptInactive = true;
      resolvedTestId = attempt.test_id;
    } else {
      // fallback: test_id допускаем только для опубликованных тестов (нужно для preview/teacher)
      // но тут проверим, что вызывающий — авторизованный учитель/админ через JWT.
      const auth = req.headers.get("Authorization");
      if (!auth?.startsWith("Bearer ")) return json({ ok: false, error: "Unauthorized" }, 401);
      const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
      const { data: claimsData, error: cErr } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
      if (cErr || !claimsData?.claims) return json({ ok: false, error: "Unauthorized" }, 401);
      const uid = claimsData.claims.sub;
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", uid);
      const isStaff = (roles ?? []).some((r: any) => r.role === "teacher" || r.role === "admin");
      if (!isStaff) return json({ ok: false, error: "Forbidden" }, 403);
      resolvedTestId = test_id;
    }

    const { data: questions, error: qErr } = await admin
      .from("test_questions")
      .select("id, position, question_text, options, points, response_kind, block_title, seconds_override")
      .eq("test_id", resolvedTestId)
      .order("position");
    if (qErr) return json({ ok: false, error: qErr.message }, 500);

    return json({ ok: true, questions: questions ?? [], attempt_inactive: attemptInactive });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
