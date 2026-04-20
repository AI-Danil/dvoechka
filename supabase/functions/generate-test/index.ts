// generate-test: парсит сырой текст вопросов через Lovable AI и сохраняет черновик теста
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Не авторизован" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u, error: ue } = await userClient.auth.getUser();
    if (ue || !u.user) return json({ error: "Не авторизован" }, 401);
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

    if (!raw_text || typeof raw_text !== "string" || raw_text.length > 20000)
      return json({ error: "raw_text обязателен (до 20000 символов)" }, 400);
    if (!["quiz", "written"].includes(kind)) return json({ error: "kind: quiz|written" }, 400);
    if (!class_id || !subject_id) return json({ error: "class_id и subject_id обязательны" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Проверка прав: админ ИЛИ учитель с назначением на (class_id, subject_id)
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const isAdmin = !!roles?.find((r) => r.role === "admin");

    let teacherId: string | null = null;
    if (!isAdmin) {
      const { data: teacher } = await admin
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!teacher) return json({ error: "Не учитель и не админ" }, 403);
      teacherId = teacher.id;

      const { data: assign } = await admin
        .from("teacher_assignments")
        .select("id")
        .eq("teacher_id", teacher.id)
        .eq("class_id", class_id)
        .eq("subject_id", subject_id)
        .maybeSingle();
      if (!assign) return json({ error: "Нет назначения на этот класс/предмет" }, 403);
    } else {
      const { data: t } = await admin
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      teacherId = t?.id ?? null;
    }

    // Tool schemas
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

    if (aiResp.status === 429)
      return json({ error: "Превышен лимит запросов к AI. Подождите минуту." }, 429);
    if (aiResp.status === 402)
      return json(
        { error: "Закончились кредиты Lovable AI. Пополните в Settings → Workspace → Usage." },
        402,
      );
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      return json({ error: "Ошибка AI", detail: t }, 500);
    }

    const aiData = await aiResp.json();
    const call = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) return json({ error: "AI не вернул структуру" }, 500);

    let parsed: any;
    try {
      parsed = JSON.parse(call.function.arguments);
    } catch {
      return json({ error: "AI вернул невалидный JSON" }, 500);
    }

    const title = (titleIn?.trim() || parsed.title || "Без названия").slice(0, 200);
    const items = kind === "quiz" ? parsed.questions ?? [] : parsed.tasks ?? [];
    if (!Array.isArray(items) || items.length === 0)
      return json({ error: "AI не извлёк ни одного вопроса" }, 422);

    // Сохраняем
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
    if (te) return json({ error: te.message }, 500);

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
      return json({ error: qe.message }, 500);
    }

    return json({ test_id: testRow.id, title, kind, count: rows.length });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
