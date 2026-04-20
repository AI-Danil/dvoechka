import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Не авторизован" }, 401);
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) return json({ error: "Не авторизован" }, 401);

    const { test_id, action } = await req.json();
    if (!test_id || !["publish", "unpublish"].includes(action))
      return json({ error: "test_id + action(publish|unpublish)" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: test } = await admin
      .from("tests")
      .select("id, kind, author_user_id")
      .eq("id", test_id)
      .maybeSingle();
    if (!test) return json({ error: "Тест не найден" }, 404);

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
    const isAdmin = !!roles?.find((r) => r.role === "admin");
    if (!isAdmin && test.author_user_id !== u.user.id)
      return json({ error: "Недостаточно прав" }, 403);

    if (action === "publish" && test.kind === "quiz") {
      const { data: bad } = await admin
        .from("test_questions")
        .select("id")
        .eq("test_id", test_id)
        .is("correct_index", null);
      if (bad && bad.length > 0)
        return json(
          { error: `Нельзя опубликовать: у ${bad.length} вопросов не указан правильный ответ` },
          422,
        );
    }

    const newStatus = action === "publish" ? "published" : "draft";
    const { error } = await admin.from("tests").update({ status: newStatus }).eq("id", test_id);
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true, status: newStatus });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
