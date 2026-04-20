// start-attempt: создаёт или возобновляет попытку сдачи теста учеником.
// Анти-перепрохождение: блокирует повторный заход после submitted, кроме hidden-retake (3-е слово = цифра).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TG_GATEWAY = "https://connector-gateway.lovable.dev/telegram";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function notifyTelegram(text: string) {
  try {
    const lovable = Deno.env.get("LOVABLE_API_KEY");
    const tgKey = Deno.env.get("TELEGRAM_API_KEY");
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
    if (!lovable || !tgKey || !chatId) return;
    await fetch(`${TG_GATEWAY}/sendMessage`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovable}`,
        "X-Connection-Api-Key": tgKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (e) {
    console.error("tg notify err", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { test_id, student_name, fingerprint } = await req.json();
    if (!test_id || !student_name) return json({ ok: false, error: "test_id и student_name обязательны" });

    const nameNorm = String(student_name).trim();
    // 3-е слово как цифра — hidden retake
    const parts = nameNorm.split(/\s+/);
    const retakeDigit = parts.length === 3 && /^\d+$/.test(parts[2]) ? Number(parts[2]) : null;
    const lookupName = retakeDigit !== null ? parts.slice(0, 2).join(" ") : nameNorm;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Проверяем, что тест опубликован
    const { data: test } = await admin
      .from("tests")
      .select("id, status, kind, title")
      .eq("id", test_id)
      .maybeSingle();
    if (!test || test.status !== "published") return json({ ok: false, error: "Тест недоступен" });

    // Ищем существующие попытки по нормализованному имени
    const { data: existing } = await admin
      .from("test_attempts")
      .select("*")
      .eq("test_id", test_id)
      .ilike("student_name", lookupName)
      .order("created_at", { ascending: false });

    const submitted = (existing ?? []).find((a: any) => a.status === "submitted");
    const inProgress = (existing ?? []).find((a: any) => a.status === "in_progress");

    // Уже сдан и нет hidden retake — отказ
    if (submitted && retakeDigit === null) {
      return json({ ok: false, error: "Этот тест уже сдан под этим именем", code: "already_submitted" }, 200);
    }

    // Возобновление текущей попытки
    if (inProgress && retakeDigit === null) {
      const pauseMs = Date.now() - new Date(inProgress.last_activity_at).getTime();
      const pauseMin = Math.round(pauseMs / 60000);
      // Логируем возврат
      const newLog = [
        ...(Array.isArray(inProgress.cheat_log) ? inProgress.cheat_log : []),
        { type: "attempt_resumed", timestamp: Date.now(), details: `paused ${pauseMin}m` },
      ];
      await admin
        .from("test_attempts")
        .update({ last_activity_at: new Date().toISOString(), cheat_log: newLog })
        .eq("id", inProgress.id);

      if (pauseMin >= 1) {
        void notifyTelegram(
          `↩️ Возврат к тесту\n👤 ${inProgress.student_name}\n📋 ${test.title}\n⏸ Пауза: ${pauseMin} мин`,
        );
      }

      return json({
        ok: true,
        attempt_id: inProgress.id,
        resumed: true,
        draft_answers: inProgress.draft_answers ?? {},
        current_phase: inProgress.current_phase ?? "quiz",
        current_question: inProgress.current_question ?? 0,
        attempt_no: inProgress.attempt_no ?? 1,
        cheat_log: newLog,
      });
    }

    // Создаём новую попытку
    const attemptNo = (submitted ? Number(submitted.attempt_no) || 1 : 0) + 1;
    const initialPhase = test.kind === "written" ? "written" : "quiz";
    const { data: created, error } = await admin
      .from("test_attempts")
      .insert({
        test_id,
        student_name: lookupName,
        student_fingerprint: fingerprint ?? null,
        status: "in_progress",
        draft_answers: {},
        current_phase: initialPhase,
        current_question: 0,
        attempt_no: attemptNo,
        cheat_log: [{ type: "attempt_started", timestamp: Date.now() }],
      })
      .select("*")
      .single();
    if (error) return json({ ok: false, error: error.message });

    return json({
      ok: true,
      attempt_id: created.id,
      resumed: false,
      draft_answers: {},
      current_phase: initialPhase,
      current_question: 0,
      attempt_no: attemptNo,
      cheat_log: created.cheat_log ?? [],
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "unknown" });
  }
});
