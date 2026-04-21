// Grades a DB-backed test submission (quiz / written / hybrid) and stores result in test_results.
// Closes attempt: marks it 'submitted' and merges accumulated cheat_log.
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
      attempt_id,
      attachments,
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
      .select("id, position, correct_index, points, options, response_kind")
      .eq("test_id", test_id)
      .order("position");

    let grade = 0;
    let total = 0;
    const breakdown: any[] = [];

    // answers structure:
    // - quiz: { [position]: number }
    // - written: { [position]: string }
    // - hybrid: { quiz: {...}, written: {...} }
    const isHybrid = test.kind === "hybrid";
    const quizAns = isHybrid ? (answers?.quiz ?? {}) : (test.kind === "quiz" ? answers : {});
    const writtenAns = isHybrid ? (answers?.written ?? {}) : (test.kind === "written" ? answers : {});

    for (const q of questions ?? []) {
      total += q.points || 1;
      const rk = (q as any).response_kind ?? (test.kind === "quiz" ? "quiz" : "written");
      if (rk === "quiz") {
        const userAns = quizAns[q.position];
        const isCorrect =
          typeof q.correct_index === "number" && Number(userAns) === q.correct_index;
        if (isCorrect) grade += q.points || 1;
        breakdown.push({
          position: q.position,
          response_kind: "quiz",
          user_answer: userAns,
          correct: q.correct_index,
          is_correct: isCorrect,
        });
      } else {
        breakdown.push({
          position: q.position,
          response_kind: "written",
          user_answer: writtenAns[q.position] ?? "",
          pending_review: true,
        });
      }
    }

    const subjectName = (test as any).subjects?.name ?? "—";

    // Мерджим cheat_log из попытки (накопленный сервером) и из клиента (этой сессии)
    let mergedCheatLog: any[] = Array.isArray(cheat_log) ? [...cheat_log] : [];
    let attemptRow: any = null;
    if (attempt_id) {
      const { data: a } = await admin
        .from("test_attempts")
        .select("cheat_log, attempt_no")
        .eq("id", attempt_id)
        .maybeSingle();
      attemptRow = a;
      if (Array.isArray(a?.cheat_log)) {
        mergedCheatLog = [...a.cheat_log, ...mergedCheatLog];
      }
    }
    const finalAttempt = attemptRow?.attempt_no ?? attempt;

    const insertPayload: Record<string, unknown> = {
      student_name,
      subject: subjectName,
      grade,
      answers: {
        test_id,
        breakdown,
        raw: answers,
        total_points: total,
        per_question: per_question ?? null,
        kind: test.kind,
      },
      cheat_log: mergedCheatLog,
      time_spent: time_spent ?? null,
      attempt: finalAttempt,
      test_type: `db:${test_id}`,
      replay_url: replay_url ?? null,
      attachments: attachments ?? {},
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

    // Закрываем попытку
    if (attempt_id) {
      await admin
        .from("test_attempts")
        .update({
          status: "submitted",
          finished_at: new Date().toISOString(),
          result_id: row.id,
        })
        .eq("id", attempt_id);
    }

    // Telegram-уведомление
    const cheatCount = mergedCheatLog.length;
    const mins = time_spent ? Math.floor(time_spent / 60) : 0;
    const secs = time_spent ? time_spent % 60 : 0;
    const kindLabel =
      test.kind === "hybrid" ? "Смешанный" : test.kind === "quiz" ? "Квиз" : "Самостоятельная";
    const msg =
      `🚀 Новый результат (${kindLabel})\n` +
      `👤 ${student_name}\n` +
      `📚 ${subjectName}\n` +
      `📋 ${(test as any).title}\n` +
      `🎯 Балл: ${grade}/${total}` +
      (test.kind !== "quiz" ? " (письм. часть требует проверки)" : "") +
      `\n⏱ Время: ${mins}м ${secs}с\n` +
      `🔄 Попытка: ${finalAttempt}\n` +
      (cheatCount > 0 ? `⚠️ Нарушений: ${cheatCount}\n` : "") +
      (replay_url ? `🎬 Запись: ${replay_url}` : "");
    void notifyTelegram(msg);

    return ok({ result_id: row.id, grade, total });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "unknown");
  }
});
