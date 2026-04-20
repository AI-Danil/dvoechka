// Grades a DB-backed quiz submission and stores result in test_results
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TG_GATEWAY = "https://connector-gateway.lovable.dev/telegram";

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ok = (body: Record<string, unknown>) => json({ ok: true, ...body });
const fail = (error: string) => json({ ok: false, error });

async function notifyTelegram(text: string) {
  try {
    const lovable = Deno.env.get("LOVABLE_API_KEY");
    const tgKey = Deno.env.get("TELEGRAM_API_KEY");
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
    if (!lovable || !tgKey || !chatId) {
      console.log("Telegram secrets missing, skipping notification");
      return;
    }
    const r = await fetch(`${TG_GATEWAY}/sendMessage`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovable}`,
        "X-Connection-Api-Key": tgKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!r.ok) console.error("Telegram send failed:", await r.text());
  } catch (e) {
    console.error("Telegram notify error:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const {
      test_id,
      student_name,
      answers,
      time_spent,
      attempt = 1,
      cheat_log = [],
      result_id,
      replay_url,
      per_question,
    } = await req.json();
    if (!test_id || !student_name || !answers)
      return fail("test_id, student_name, answers обязательны");

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: test } = await admin
      .from("tests")
      .select("id, title, kind, status, subject_id, subjects:subject_id(name)")
      .eq("id", test_id)
      .maybeSingle();
    if (!test || test.status !== "published") return fail("Тест недоступен");

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
      for (const q of questions ?? []) {
        total += q.points || 1;
        breakdown.push({ position: q.position, user_answer: answers[q.position] ?? "" });
      }
    }

    const subjectName = (test as any).subjects?.name ?? "—";

    const insertPayload: Record<string, unknown> = {
      student_name,
      subject: subjectName,
      grade,
      answers: { test_id, breakdown, raw: answers, total_points: total, per_question: per_question ?? null },
      cheat_log,
      time_spent: time_spent ?? null,
      attempt,
      test_type: `db:${test_id}`,
      replay_url: replay_url ?? null,
    };
    if (result_id && typeof result_id === "string" && /^[0-9a-f-]{36}$/i.test(result_id)) {
      insertPayload.id = result_id;
    }

    const { data: row, error } = await admin
      .from("test_results")
      .insert(insertPayload)
      .select("id")
      .single();
    if (error) return fail(error.message);

    // Telegram-уведомление
    const cheatCount = Array.isArray(cheat_log) ? cheat_log.length : 0;
    const mins = time_spent ? Math.floor(time_spent / 60) : 0;
    const secs = time_spent ? time_spent % 60 : 0;
    const msg =
      `🚀 Новый результат\n` +
      `👤 ${student_name}\n` +
      `📚 ${subjectName}\n` +
      `📋 ${(test as any).title}\n` +
      `🎯 Балл: ${grade}/${total}\n` +
      `⏱ Время: ${mins}м ${secs}с\n` +
      `🔄 Попытка: ${attempt}\n` +
      (cheatCount > 0 ? `⚠️ Нарушений: ${cheatCount}\n` : "") +
      (replay_url ? `🎬 Запись: ${replay_url}` : "");
    void notifyTelegram(msg);

    return ok({ result_id: row.id, grade, total });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "unknown");
  }
});
