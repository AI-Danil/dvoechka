// Grades a DB-backed quiz submission and stores result in test_results
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { test_id, student_name, answers, time_spent, attempt = 1, cheat_log = [] } =
      await req.json();
    if (!test_id || !student_name || !answers)
      return json({ error: "test_id, student_name, answers обязательны" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: test } = await admin
      .from("tests")
      .select("id, title, kind, status, subject_id, subjects:subject_id(name)")
      .eq("id", test_id)
      .maybeSingle();
    if (!test || test.status !== "published") return json({ error: "Тест недоступен" }, 404);

    const { data: questions } = await admin
      .from("test_questions")
      .select("id, position, correct_index, points, options")
      .eq("test_id", test_id)
      .order("position");

    let grade = 0;
    let total = 0;
    const breakdown: any[] = [];

    if (test.kind === "quiz") {
      for (const q of questions ?? []) {
        const userAns = answers[q.position];
        const isCorrect =
          typeof q.correct_index === "number" && Number(userAns) === q.correct_index;
        if (isCorrect) grade += q.points || 1;
        total += q.points || 1;
        breakdown.push({
          position: q.position,
          user_answer: userAns,
          correct: q.correct_index,
          is_correct: isCorrect,
        });
      }
    } else {
      // written: ставим 0 (учитель проверит вручную), но answers сохраняем
      for (const q of questions ?? []) {
        total += q.points || 1;
        breakdown.push({ position: q.position, user_answer: answers[q.position] ?? "" });
      }
    }

    const subjectName = (test as any).subjects?.name ?? "—";

    const { data: row, error } = await admin
      .from("test_results")
      .insert({
        student_name,
        subject: subjectName,
        grade,
        answers: { test_id, breakdown, raw: answers, total_points: total },
        cheat_log,
        time_spent: time_spent ?? null,
        attempt,
        test_type: `db:${test_id}`,
      })
      .select("id")
      .single();
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true, result_id: row.id, grade, total });
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
