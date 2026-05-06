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

    // 1. Поиск активной сессии по коду — без эмбедов (FK не задекларированы).
    const codeUp = String(code).trim().toUpperCase();
    const { data: session, error: sErr } = await admin
      .from("test_sessions")
      .select("*")
      .eq("code", codeUp)
      .in("status", ["waiting", "running", "finished"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sErr) return json({ ok: false, error: `session lookup: ${sErr.message}` });
    if (!session) return json({ ok: false, error: "Код не найден или сессия закрыта" });
    if (session.status === "finished") return json({ ok: false, error: "Сессия уже завершена" });

    // 2. Подгружаем тест отдельно.
    const { data: test, error: tErr } = await admin
      .from("tests")
      .select("id, title, kind, subject_id, class_id")
      .eq("id", session.test_id)
      .maybeSingle();
    if (tErr) return json({ ok: false, error: `test lookup: ${tErr.message}` });
    if (!test) return json({ ok: false, error: "Тест сессии не найден" });

    // 3. Имена предмета и класса.
    const [{ data: subj }, { data: cls }] = await Promise.all([
      admin.from("subjects").select("name").eq("id", test.subject_id).maybeSingle(),
      admin.from("classes").select("name").eq("id", test.class_id).maybeSingle(),
    ]);

    // 4. Создаём/находим участника
    const { data: existingPart, error: pSelErr } = await admin
      .from("test_session_participants")
      .select("*")
      .eq("session_id", session.id)
      .ilike("student_name", nameNorm)
      .maybeSingle();
    if (pSelErr) return json({ ok: false, error: `participant lookup: ${pSelErr.message}` });

    let participant = existingPart;
    if (!participant) {
      const { data: created, error: pErr } = await admin
        .from("test_session_participants")
        .insert({ session_id: session.id, student_name: nameNorm })
        .select("*")
        .single();
      if (pErr) return json({ ok: false, error: `participant insert: ${pErr.message}` });
      participant = created;
    }

    // Если уже сдал — отказ
    if (participant.submitted_at) {
      return json({ ok: false, error: "Вы уже сдали этот тест", code: "already_submitted" });
    }

    // 5. Если сессия running — создаём (или возобновляем) attempt атомарно.
    let attempt: any = null;
    if (session.status === "running") {
      // Если уже есть attempt_id — используем его.
      if (participant.attempt_id) {
        const { data: a } = await admin
          .from("test_attempts")
          .select("*")
          .eq("id", participant.attempt_id)
          .maybeSingle();
        attempt = a;
      }
      if (!attempt) {
        // Атомарное резервирование: генерируем UUID на клиенте, пытаемся
        // занять attempt_id в participant. Если другой запрос уже выиграл
        // гонку — берём его attempt_id и НЕ создаём дубль.
        const reservedId = crypto.randomUUID();
        const { data: claimed, error: claimErr } = await admin
          .from("test_session_participants")
          .update({ attempt_id: reservedId })
          .eq("id", participant.id)
          .is("attempt_id", null)
          .select("attempt_id")
          .maybeSingle();
        if (claimErr) return json({ ok: false, error: `participant claim: ${claimErr.message}` });

        if (claimed?.attempt_id === reservedId) {
          // Мы выиграли гонку — создаём attempt с этим ID.
          const initialPhase = test.kind === "written" ? "written" : "quiz";
          const { data: created, error: aErr } = await admin
            .from("test_attempts")
            .insert({
              id: reservedId,
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
          if (aErr) {
            // Откат резервирования, иначе participant залочен на несуществующий attempt.
            await admin
              .from("test_session_participants")
              .update({ attempt_id: null })
              .eq("id", participant.id)
              .eq("attempt_id", reservedId);
            return json({ ok: false, error: `attempt insert: ${aErr.message}` });
          }
          attempt = created;
        } else {
          // Гонку выиграл другой запрос — перечитываем participant и attempt.
          const { data: p2 } = await admin
            .from("test_session_participants")
            .select("attempt_id")
            .eq("id", participant.id)
            .maybeSingle();
          if (p2?.attempt_id) {
            const { data: a } = await admin
              .from("test_attempts")
              .select("*")
              .eq("id", p2.attempt_id)
              .maybeSingle();
            attempt = a;
          }
        }
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
        test_title: test.title ?? "",
        test_kind: test.kind ?? "quiz",
        subject_name: subj?.name ?? "",
        class_name: cls?.name ?? "",
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
