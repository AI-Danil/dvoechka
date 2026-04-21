// Ученик присоединяется к live-сессии по коду + ФИО.
// Возвращает session, participant и (если идёт) attempt_id + ends_at для общего таймера.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { code, student_name, fingerprint } = await req.json();
    if (!code || !student_name) return json({ ok: false, error: "code и student_name обязательны" });

    const nameNorm = String(student_name).trim().replace(/\s+/g, " ");
    const parts = nameNorm.split(" ");
    if (parts.length < 2 || parts.length > 3)
      return json({ ok: false, error: "Введите Имя и Фамилию (2 слова)" });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Поиск активной сессии по коду
    const codeUp = String(code).trim().toUpperCase();
    const { data: session } = await admin
      .from("test_sessions")
      .select("*, tests:test_id(id, title, kind, status, subject_id, class_id, subjects:subject_id(name), classes:class_id(name))")
      .eq("code", codeUp)
      .in("status", ["waiting", "running", "finished"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!session) return json({ ok: false, error: "Код не найден или сессия закрыта" });
    if (session.status === "finished") return json({ ok: false, error: "Сессия уже завершена" });

    // Создаём/находим участника
    const { data: existingPart } = await admin
      .from("test_session_participants")
      .select("*")
      .eq("session_id", session.id)
      .ilike("student_name", nameNorm)
      .maybeSingle();

    let participant = existingPart;
    if (!participant) {
      const { data: created, error: pErr } = await admin
        .from("test_session_participants")
        .insert({ session_id: session.id, student_name: nameNorm })
        .select("*")
        .single();
      if (pErr) return json({ ok: false, error: pErr.message });
      participant = created;
    }

    // Если уже сдал — отказ
    if (participant.submitted_at) {
      return json({ ok: false, error: "Вы уже сдали этот тест", code: "already_submitted" });
    }

    // Если сессия running — создаём (или возобновляем) attempt
    let attempt: any = null;
    if (session.status === "running") {
      // Уже есть attempt у участника?
      if (participant.attempt_id) {
        const { data: a } = await admin
          .from("test_attempts")
          .select("*")
          .eq("id", participant.attempt_id)
          .maybeSingle();
        attempt = a;
      }
      if (!attempt) {
        const initialPhase = session.tests?.kind === "written" ? "written" : "quiz";
        const { data: created, error: aErr } = await admin
          .from("test_attempts")
          .insert({
            test_id: session.test_id,
            student_name: nameNorm,
            student_fingerprint: fingerprint ?? null,
            status: "in_progress",
            draft_answers: {},
            current_phase: initialPhase,
            current_question: 0,
            attempt_no: 1,
            cheat_log: [{ type: "live_attempt_started", timestamp: Date.now(), session_code: codeUp }],
          })
          .select("*")
          .single();
        if (aErr) return json({ ok: false, error: aErr.message });
        attempt = created;
        await admin
          .from("test_session_participants")
          .update({ attempt_id: created.id })
          .eq("id", participant.id);
      }
    }

    return json({
      ok: true,
      session: {
        id: session.id,
        test_id: session.test_id,
        status: session.status,
        duration_sec: session.duration_sec,
        started_at: session.started_at,
        ends_at: session.ends_at,
        test_title: session.tests?.title ?? "",
        test_kind: session.tests?.kind ?? "quiz",
        subject_name: session.tests?.subjects?.name ?? "",
        class_name: session.tests?.classes?.name ?? "",
      },
      participant: { id: participant.id, student_name: participant.student_name },
      attempt: attempt
        ? {
            id: attempt.id,
            draft_answers: attempt.draft_answers ?? {},
            current_phase: attempt.current_phase,
            current_question: attempt.current_question ?? 0,
            cheat_log: attempt.cheat_log ?? [],
          }
        : null,
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "unknown" });
  }
});
