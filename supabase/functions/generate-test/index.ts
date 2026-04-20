// generate-test: парсит сырой текст вопросов через Lovable AI и сохраняет черновик теста
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ok = (body: Record<string, unknown>) => json({ ok: true, ...body });
const fail = (error: string, diagnostics?: Record<string, unknown>) =>
  json(diagnostics ? { ok: false, error, diagnostics } : { ok: false, error });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return fail("Не авторизован");

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u, error: ue } = await userClient.auth.getUser();
    if (ue || !u.user) return fail("Не авторизован");
    const user = u.user;

    const body = await req.json();
    const {
      raw_text,
      kind,
      class_id,
      subject_id,
      title: titleIn,
      time_per_question_sec = 30,
    } = body ?? {};

    if (!raw_text || typeof raw_text !== "string" || raw_text.length > 20000) {
      return fail("raw_text обязателен (до 20000 символов)");
    }
    if (!["quiz", "written"].includes(kind)) return fail("kind: quiz|written");
    if (!class_id || !subject_id) return fail("class_id и subject_id обязательны");

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = !!roles?.find((r) => r.role === "admin");

    let teacherId: string | null = null;
    if (!isAdmin) {
      const { data: teacher } = await admin
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!teacher) return fail("Не учитель и не админ");
      teacherId = teacher.id;

      const { data: assign } = await admin
        .from("teacher_assignments")
        .select("id")
        .eq("teacher_id", teacher.id)
        .eq("class_id", class_id)
        .eq("subject_id", subject_id)
        .maybeSingle();
      if (!assign) return fail("Нет назначения на этот класс/предмет");
    } else {
      const { data: t } = await admin
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      teacherId = t?.id ?? null;
    }

    const quizTool = {
      type: "function",
      function: {
        name: "extract_quiz",
        description: "Извлекает квиз: список вопросов с 4 вариантами и индексом правильного ответа.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Краткое название теста на русском" },
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question_text: { type: "string" },
                  options: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 },
                  correct_index: { type: "integer", description: "0-based индекс правильного варианта; null если неизвестно" },
                },
                required: ["question_text", "options"],
                additionalProperties: false,
              },
            },
          },
          required: ["title", "questions"],
          additionalProperties: false,
        },
      },
    };

    const writtenTool = {
      type: "function",
      function: {
        name: "extract_written",
        description: "Извлекает самостоятельную работу: список текстовых задач с баллами.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question_text: { type: "string" },
                  points: { type: "integer", minimum: 1, maximum: 20 },
                },
                required: ["question_text", "points"],
                additionalProperties: false,
              },
            },
          },
          required: ["title", "tasks"],
          additionalProperties: false,
        },
      },
    };

    const tool = kind === "quiz" ? quizTool : writtenTool;
    const systemPrompt =
      kind === "quiz"
        ? "Ты помощник учителя. Из сырого текста извлеки вопросы для квиза (с вариантами). Если правильный вариант помечен (✅, *, [+], 'правильный', 'верно'), укажи его в correct_index. Если непонятно — верни null. Сохраняй формулировки на исходном языке."
        : "Ты помощник учителя. Из сырого текста извлеки задачи для самостоятельной работы. Если у задачи указаны баллы — поставь их, иначе по умолчанию 1.";

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: raw_text },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: tool.function.name } },
      }),
    });

    if (aiResp.status === 429) return fail("Превышен лимит запросов к AI. Подождите минуту.");
    if (aiResp.status === 402) {
      return fail("Закончились кредиты Lovable AI. Пополните в Settings → Workspace → Usage.");
    }
    if (!aiResp.ok) {
      const detail = (await aiResp.text()).slice(0, 2000);
      console.error("AI error", aiResp.status, detail);
      return fail("Ошибка AI", { status: aiResp.status, detail });
    }

    const aiData = await aiResp.json();
    const call = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) return fail("AI не вернул структуру");

    let parsed: any;
    try {
      parsed = JSON.parse(call.function.arguments);
    } catch {
      return fail("AI вернул невалидный JSON");
    }

    const title = (titleIn?.trim() || parsed.title || "Без названия").slice(0, 200);
    const items = kind === "quiz" ? parsed.questions ?? [] : parsed.tasks ?? [];
    if (!Array.isArray(items) || items.length === 0) return fail("AI не извлёк ни одного вопроса");

    const { data: testRow, error: te } = await admin
      .from("tests")
      .insert({
        author_user_id: user.id,
        teacher_id: teacherId,
        class_id,
        subject_id,
        title,
        kind,
        time_per_question_sec,
        status: "draft",
      })
      .select("id")
      .single();
    if (te) return fail(te.message);

    const rows = items.map((q: any, i: number) =>
      kind === "quiz"
        ? {
            test_id: testRow.id,
            position: i,
            question_text: String(q.question_text ?? "").slice(0, 2000),
            options: Array.isArray(q.options) ? q.options.slice(0, 6).map(String) : [],
            correct_index:
              typeof q.correct_index === "number" && q.correct_index >= 0 ? q.correct_index : null,
            points: 1,
          }
        : {
            test_id: testRow.id,
            position: i,
            question_text: String(q.question_text ?? "").slice(0, 4000),
            options: [],
            correct_index: null,
            points: typeof q.points === "number" && q.points > 0 ? q.points : 1,
          },
    );

    const { error: qe } = await admin.from("test_questions").insert(rows);
    if (qe) {
      await admin.from("tests").delete().eq("id", testRow.id);
      return fail(qe.message);
    }

    return ok({ test_id: testRow.id, title, kind, count: rows.length });
  } catch (e) {
    console.error(e);
    return fail(e instanceof Error ? e.message : "unknown");
  }
});
