import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ok = (body: Record<string, unknown>) => json({ ok: true, ...body });
const fail = (error: string) => json({ ok: false, error });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return fail("Не авторизован");
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) return fail("Не авторизован");

    const { test_id, action } = await req.json();
    if (!test_id || !["publish", "unpublish"].includes(action))
      return fail("test_id + action(publish|unpublish)");

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: test } = await admin
      .from("tests")
      .select("id, kind, author_user_id")
      .eq("id", test_id)
      .maybeSingle();
    if (!test) return fail("Тест не найден");

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
    const isAdmin = !!roles?.find((r) => r.role === "admin");
    if (!isAdmin && test.author_user_id !== u.user.id)
      return fail("Недостаточно прав");

    if (action === "publish" && (test.kind === "quiz" || test.kind === "hybrid")) {
      const q = admin
        .from("test_questions")
        .select("id")
        .eq("test_id", test_id)
        .is("correct_index", null);
      if (test.kind === "hybrid") q.eq("response_kind", "quiz");
      const { data: bad } = await q;
      if (bad && bad.length > 0)
        return fail(`Нельзя опубликовать: у ${bad.length} квиз-вопросов не указан правильный ответ`);
    }

    const newStatus = action === "publish" ? "published" : "draft";
    const { error } = await admin.from("tests").update({ status: newStatus }).eq("id", test_id);
    if (error) return fail(error.message);

    return ok({ status: newStatus });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "unknown");
  }
});
