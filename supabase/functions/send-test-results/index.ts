import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

async function sendTelegramText(text: string, lovableKey: string, telegramKey: string, chatId: string) {
  const response = await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": telegramKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Telegram sendMessage failed: ${JSON.stringify(data)}`);
  return data;
}

async function sendTelegramPhoto(photoUrl: string, caption: string, lovableKey: string, telegramKey: string, chatId: string) {
  const response = await fetch(`${GATEWAY_URL}/sendPhoto`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": telegramKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Telegram sendPhoto failed: ${JSON.stringify(data)}`);
  return data;
}

async function sendTelegramDocument(docUrl: string, caption: string, lovableKey: string, telegramKey: string, chatId: string) {
  const response = await fetch(`${GATEWAY_URL}/sendDocument`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": telegramKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chat_id: chatId, document: docUrl, caption }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Telegram sendDocument failed: ${JSON.stringify(data)}`);
  return data;
}

// Имя: 2 кириллических слова + опционально цифра (скрытый ретейк)
const NAME_RE = /^[А-Яа-яЁё]{2,30}\s+[А-Яа-яЁё]{2,30}(\s+\d{1,3})?$/;
const MIN_TIME_SPENT_SEC = 30;
const DUP_WINDOW_MS = 5 * 60 * 1000;
const FLOOD_WINDOW_MS = 10 * 60 * 1000;
const FLOOD_MAX_PER_NAME = 3;

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
    if (!TELEGRAM_API_KEY) throw new Error("TELEGRAM_API_KEY is not configured");

    // Also support legacy direct token
    const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
    if (!CHAT_ID) throw new Error("TELEGRAM_CHAT_ID is not configured");

    const body = await req.json();
    let { studentName, grade, subject, cheatLog, timeSpent, attachments, attempt, resultId } = body;

    // ===== СЕРВЕРНАЯ ВАЛИДАЦИЯ И АНТИБОТ =====
    if (typeof studentName !== "string") {
      return jsonResponse({ error: "Bad name" }, 400);
    }
    studentName = studentName.trim().replace(/\s+/g, " ");
    if (!NAME_RE.test(studentName)) {
      console.warn("Rejected: bad name", studentName);
      return jsonResponse({ error: "Имя должно состоять из 2 русских слов" }, 400);
    }

    if (typeof timeSpent !== "number" || !Number.isFinite(timeSpent) || timeSpent < MIN_TIME_SPENT_SEC) {
      console.warn("Rejected: too fast", { studentName, timeSpent });
      return jsonResponse({ error: "Слишком быстро. Тест не может быть пройден за это время." }, 400);
    }

    const gradeNum = Number(grade);
    if (!Number.isInteger(gradeNum) || gradeNum < 1 || gradeNum > 11) {
      return jsonResponse({ error: "Bad grade" }, 400);
    }
    if (typeof subject !== "string" || subject.length > 100) {
      return jsonResponse({ error: "Bad subject" }, 400);
    }

    // Антифлуд + дедуп — общий клиент для всех проверок ниже
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Антифлуд: не больше N сабмитов с одного имени за 10 минут
    const floodSince = new Date(Date.now() - FLOOD_WINDOW_MS).toISOString();
    const { count: floodCount } = await supabaseAdmin
      .from("test_results")
      .select("id", { count: "exact", head: true })
      .eq("student_name", studentName)
      .gte("created_at", floodSince);
    if ((floodCount ?? 0) >= FLOOD_MAX_PER_NAME) {
      console.warn("Rejected: flood", { studentName, floodCount });
      return jsonResponse({ error: "Слишком много отправок. Подождите 10 минут." }, 429);
    }


    // Собираем answersData (нужен и для дедупа, и для записи в БД)
    const answersData: Record<string, unknown> = { type: body.type };
    if (body.type === "grade7" || body.type === "grade7technology") {
      answersData.theory = body.theory;
      answersData.practice = body.practice;
    } else if (
      body.type === "grade9" ||
      body.type === "grade9physics" ||
      body.type === "grade9technology" ||
      body.type === "grade8physics" ||
      body.type === "grade8physicsPower" ||
      body.type === "grade7physics"
    ) {
      answersData.answers = body.answers;
    } else if (
      body.type === "grade9physicsAtom" ||
      body.type === "grade7physicsWork" ||
      body.type === "grade8informaticsPython" ||
      body.type === "grade8physicsFinalQ4" ||
      body.type === "grade6technologyFinalQ4" ||
      body.type === "grade7technologyFinalQ4" ||
      body.type === "grade8technologyFinalQ4Theory" ||
      body.type === "grade5technologyFinalQ4V2"
    ) {
      answersData.answers = body.answers;
      answersData.quizResults = body.quizResults;
    } else {
      answersData.blitz = body.blitz;
      answersData.tasks = body.tasks;
    }

    // Дедуп: те же ответы от того же ученика за последние 5 минут
    const dupSince = new Date(Date.now() - DUP_WINDOW_MS).toISOString();
    const answersHash = await sha256Hex(JSON.stringify(answersData));
    const { data: recent } = await supabaseAdmin
      .from("test_results")
      .select("answers")
      .eq("student_name", studentName)
      .eq("grade", gradeNum)
      .eq("subject", subject)
      .gte("created_at", dupSince)
      .limit(20);
    if (recent && recent.length > 0) {
      for (const r of recent) {
        const h = await sha256Hex(JSON.stringify(r.answers));
        if (h === answersHash) {
          console.warn("Rejected: duplicate", { studentName });
          return jsonResponse({ error: "Эти ответы уже были отправлены." }, 409);
        }
      }
    }

    // Save to database BEFORE sending to Telegram
    try {
      const insertPayload: Record<string, unknown> = {
        student_name: studentName,
        grade: gradeNum,
        subject,
        attempt: Number(attempt) || 1,
        test_type: body.type,
        answers: answersData,
        attachments: attachments || {},
        cheat_log: cheatLog || [],
        time_spent: timeSpent,
      };
      // Если клиент сгенерировал resultId — используем его, чтобы папка с rrweb-чанками
      // совпала с id записи в test_results. Иначе БД сгенерирует свой UUID.
      if (resultId && typeof resultId === "string" && /^[0-9a-f-]{36}$/i.test(resultId)) {
        insertPayload.id = resultId;
      }
      const { error: dbError } = await supabaseAdmin.from("test_results").insert(insertPayload);

      if (dbError) {
        console.error("Failed to save to DB:", dbError);
      } else {
        console.log("Results saved to DB successfully");
      }
    } catch (dbErr) {
      console.error("DB save error:", dbErr);
    }


    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;
    const timeLeftMin = Math.floor((40 * 60 - timeSpent) / 60);
    const timeLeftSec = (40 * 60 - timeSpent) % 60;

    let message = `🚀 ОТВЕТ: ${studentName}\n`;
    message += `📚 ${grade} класс, ${subject === "informatics" ? "Информатика" : subject === "physics" ? "Физика" : subject === "technology" ? "Технология" : subject}\n`;
    if (body.testTitle) {
      message += `📋 ${body.testTitle}\n`;
    }
    if (attempt && String(attempt) !== "1") {
      message += `🔄 Попытка: ${attempt}\n`;
    }
    message += `⏱ Осталось: ${String(timeLeftMin).padStart(2, "0")}:${String(timeLeftSec).padStart(2, "0")}\n\n`;

    const attachmentMap = (attachments || {}) as Record<string, string>;
    const attachmentKeys = Object.keys(attachmentMap);
    console.log("Attachments received:", JSON.stringify(attachmentMap));
    console.log("Attachment keys:", attachmentKeys);

    if (body.type === "grade7") {
      const theory = body.theory as string[];
      const practice = body.practice as string[];

      message += `\n📝 БЛОК 1 (Теория):\n`;
      theory.forEach((a: string, i: number) => {
        message += `${i + 1}. ${a || "(пусто)"}\n`;
      });

      message += `\n📊 БЛОК 2 (Задачи):\n`;
      practice.forEach((a: string, i: number) => {
        const hasFile = attachmentMap[String(i)];
        message += `${i + 8}. ${a || "(пусто)"}${hasFile ? " 📎" : ""}\n`;
      });
    } else if (body.type === "grade7technology") {
      const theory = body.theory as string[];
      const practice = body.practice as string[];
      const theoryLabels = [
        "Комплекс базовых программ (ОС)",
        "Непечатаемый символ Enter",
        "ОЗУ vs HDD при отключении",
        "Числовой адрес в сети (IP)",
        "Символ разделения папок Windows",
        "Редактирование текста",
        "Наименьшая единица информации (бит)",
      ];
      const practiceLabels = [
        "8. Объем текста КОИ-8",
        "9. Палитра 128x128",
        "10. Скорость скачивания",
        "11. Файловая система",
        "12. Маски файлов",
        "13. Ctrl+X / Ctrl+V",
      ];

      message += `\n📝 БЛОК 1 (Теория):\n`;
      theory.forEach((a: string, i: number) => {
        message += `${i + 1}. ${theoryLabels[i]}: ${a || "(пусто)"}\n`;
      });

      message += `\n📊 БЛОК 2 (Задачи):\n`;
      practice.forEach((a: string, i: number) => {
        const hasFile = attachmentMap[String(i)];
        message += `${practiceLabels[i]}: ${a || "(пусто)"}${hasFile ? " 📎" : ""}\n`;
      });
    } else if (body.type === "grade9") {
      const ans = body.answers as string[];
      const labels = [
        "1.1 Архитектура алгоритмов",
        "1.2 Подпрограммы и их виды",
        "1.3 Параметры подпрограмм",
        "1.4 Индексация массивов",
        "1.5 Алгоритмы сортировки",
        "1.6 Теория моделирования",
        "1.7 Основы кибернетики",
        "2.1 Поиск в массиве",
        "2.2 Трассировка",
        "3.1 Графы и пути",
        "4.1 Базы данных (логич. запросы)",
      ];

      message += `\n📝 БЛОК 1 (Теория):\n`;
      for (let i = 0; i < 7; i++) {
        message += `${labels[i]}: ${ans[i] || "(пусто)"}\n\n`;
      }

      message += `📊 БЛОКИ 2-4 (Практика):\n`;
      for (let i = 7; i < ans.length; i++) {
        const hasFile = attachmentMap[String(i)];
        message += `${labels[i]}: ${ans[i] || "(пусто)"}${hasFile ? " 📎" : ""}\n\n`;
      }
    } else if (body.type === "grade9technology") {
      const ans = body.answers as string[];
      const labels = [
        "1.1 Свойства моделей",
        "1.2 Интеллектуальная собственность",
        "1.3 ТРИЗ — Метод фокальных объектов",
        "2.1 Лазерная обработка",
        "2.2 Нанотехнологии",
        "3.1 Бионика",
        "3.2 Генная инженерия",
        "4.1 3D-печать",
        "4.2 Стереолитография",
        "5.1 Этика биотехнологий",
        "5.2 Робототехника и рынок труда",
      ];

      message += `\n📝 БЛОК 1 (Моделирование и ТРИЗ):\n`;
      for (let i = 0; i < 3; i++) {
        message += `${labels[i]}: ${ans[i] || "(пусто)"}\n\n`;
      }
      message += `🔬 БЛОК 2 (Высокие технологии):\n`;
      for (let i = 3; i < 5; i++) {
        message += `${labels[i]}: ${ans[i] || "(пусто)"}\n\n`;
      }
      message += `🧬 БЛОК 3 (Биотехнологии и Бионика):\n`;
      for (let i = 5; i < 7; i++) {
        message += `${labels[i]}: ${ans[i] || "(пусто)"}\n\n`;
      }
      message += `🖨 БЛОК 4 (Аддитивные технологии):\n`;
      for (let i = 7; i < 9; i++) {
        message += `${labels[i]}: ${ans[i] || "(пусто)"}\n\n`;
      }
      message += `💡 БЛОК 5 (Предвидение и этика):\n`;
      for (let i = 9; i < ans.length; i++) {
        const hasFile = attachmentMap[String(i)];
        message += `${labels[i]}: ${ans[i] || "(пусто)"}${hasFile ? " 📎" : ""}\n\n`;
      }
    } else if (body.type === "grade7physics") {
      const ans = body.answers as string[];
      const part1Labels = [
        "1. Мраморная колонна (ошибка)",
        "2. Банка+вода+бумага (атм. давление)",
        "3. Архимедова сила (почему вверх)",
        "4. Яйцо варёное vs сырое (Паскаль)",
      ];
      const part2Labels = [
        "5. Автомобиль на льду",
        "6. Гидравлический пресс",
        "7. Кубик в аквариуме",
        "8. Шприц (атм. давление)",
        "9. Льдина (подводная часть)",
        "⭐ 10. U-образная трубка",
      ];

      message += `\n📝 ЧАСТЬ 1 (Качественные задачи):\n`;
      for (let i = 0; i < 4; i++) {
        const hasFile = attachmentMap[String(i)];
        message += `${part1Labels[i]}: ${ans[i] || "(пусто)"}${hasFile ? " 📎" : ""}\n\n`;
      }

      message += `📊 ЧАСТЬ 2 (Расчётные задачи):\n`;
      for (let i = 4; i < 10; i++) {
        const hasFile = attachmentMap[String(i)];
        message += `${part2Labels[i - 4]}: ${ans[i] || "(пусто)"}${hasFile ? " 📎" : ""}\n\n`;
      }
    } else if (body.type === "grade7physicsWork") {
      const ans = body.answers as string[];
      const taskLabels = [
        "Задача 1. Глубина колодца (m=10 кг, A=650 Дж)",
        "Задача 2. Подъёмный кран (m=5 т, h=8 м)",
        "Задача 3. Мощность лифта (m=300 кг, h=12 м, t=30 с)",
        "Задача 4. Мясорубка (P=800 Вт, t=20 мин)",
        "Задача 5. Трамвай «Витязь-М» (P=450 кВт, t=3 ч)",
        "⭐ Задача 6. Санки (F=100 Н, s=40 м, cos 60°=0,5)",
      ];

      const quiz = body.quizResults as
        | {
            correct: number;
            total: number;
            perQuestion: { answer: number; correct: number; timeSpent: number; timedOut: boolean }[];
          }
        | null
        | undefined;

      if (quiz) {
        const optLabel = (n: number) => (n < 0 ? "—" : ["А", "Б", "В", "Г"][n] ?? "?");
        message += `\n🎯 КВИЗ (теория): ${quiz.correct}/${quiz.total} правильных\n`;
        quiz.perQuestion.forEach((r, i) => {
          const mark = r.answer === r.correct ? "✅" : r.timedOut ? "⏰" : "❌";
          message += `Вопрос ${i + 1}: ${mark} ответ: ${optLabel(r.answer)} (правильный: ${optLabel(r.correct)}) ⏱ ${r.timeSpent}с${r.timedOut ? " (таймаут)" : ""}\n`;
        });
      }

      message += `\n🧮 РАСЧЁТНЫЕ ЗАДАЧИ:\n`;
      for (let i = 0; i < ans.length; i++) {
        const hasFile = attachmentMap[String(i)];
        message += `${taskLabels[i]}: ${ans[i] || "(пусто)"}${hasFile ? " 📎" : ""}\n\n`;
      }
    } else if (body.type === "grade8physicsPower") {
      const ans = body.answers as string[];
      const labels = [
        "Задача 1. Работа тока (U=24В, I=2А, t=5мин)",
        "Задача 2. Паяльник (P=120Вт, U=220В) → I, R",
        "Задача 3. Кол-во теплоты (R=100Ом, I=2А, t=15мин)",
        "Задача 4. Электроплитка (стоимость энергии, тариф 5 р/кВт·ч)",
        "Задача 5. Спираль утюга (длина нихромовой проволоки)",
        "Задача 6. Укороченная спираль (новая мощность)",
      ];
      message += `\n📊 Работа и мощность тока. Закон Джоуля—Ленца:\n`;
      for (let i = 0; i < ans.length; i++) {
        const hasFile = attachmentMap[String(i)];
        message += `${labels[i]}: ${ans[i] || "(пусто)"}${hasFile ? " 📎" : ""}\n\n`;
      }
    } else if (body.type === "grade8physics") {
      const ans = body.answers as string[];
      const theoryLabels = [
        "1.1 Электрический ток",
        "1.2 Сила тока",
        "1.3 Закон Ома",
        "1.4 Сопротивление проводника",
        "1.5 Последовательное соединение",
        "1.6 Закон Джоуля-Ленца",
        "1.7 Короткое замыкание",
      ];
      const practiceLabels = [
        "2.1 Ошибка ученика (R≠U/I)",
        "2.2 Последоват. соединение",
        "2.3 Два алюм. провода",
        "2.4 Медная проволока (жгут)",
        "2.5 Заряженные шарики",
        "2.6 ⭐ Смешанное соединение",
      ];

      message += `\n📝 ЧАСТЬ 1 (Теория):\n`;
      for (let i = 0; i < 7; i++) {
        message += `${theoryLabels[i]}: ${ans[i] || "(пусто)"}\n\n`;
      }

      message += `📊 ЧАСТЬ 2 (Задачи):\n`;
      for (let i = 7; i < 13; i++) {
        const hasFile = attachmentMap[String(i)];
        message += `${practiceLabels[i - 7]}: ${ans[i] || "(пусто)"}${hasFile ? " 📎" : ""}\n\n`;
      }
    } else if (body.type === "grade9physics") {
      const ans = body.answers as string[];
      const theoryLabels = [
        "1.1 Законы Ньютона",
        "1.2 Закон сохранения энергии",
        "1.3 Момент силы",
        "1.4 Механические волны",
        "1.5 Звук и ультразвук",
        "1.6 Преломление света",
        "1.7 Электромагнитные волны",
      ];
      const practiceLabels = [
        "2.1 Кинематика",
        "2.2 Статика",
        "2.3 Импульс",
        "2.4 ЗСЭ (расчёт)",
        "2.5 Звук (расчёт)",
        "2.6 Линзы",
      ];

      message += `\n📝 БЛОК 1 (Теория):\n`;
      for (let i = 0; i < 7; i++) {
        message += `${theoryLabels[i]}: ${ans[i] || "(пусто)"}\n\n`;
      }

      message += `📊 БЛОК 2 (Расчётные задачи):\n`;
      for (let i = 7; i < 13; i++) {
        const hasFile = attachmentMap[String(i)];
        message += `${practiceLabels[i - 7]}: ${ans[i] || "(пусто)"}${hasFile ? " 📎" : ""}\n\n`;
      }

      message += `🔍 БЛОК 3 (Качественная задача):\n`;
      const hasFile14 = attachmentMap["13"];
      message += `3.1 Преломление: ${ans[13] || "(пусто)"}${hasFile14 ? " 📎" : ""}\n\n`;
    } else if (body.type === "grade9physicsAtom") {
      const ans = body.answers as string[];
      const labels = [
        "Задача 1. Анатомия ядра калия ¹⁹₃₉K",
        "Задача 2. Правила смещения (α-распад U-238, β-распад C-14)",
        "Задача 3. Скрытая угроза (¹⁰₅B + ? → ⁷₃Li + ⁴₂He)",
        "Задача 4. Многоступенчатый распад Th-234 → U-234",
        "Задача 5. Таймер радиации (T½=2 суток, 6 суток)",
        "Задача 6. Треки в камере Вильсона",
      ];

      const quiz = body.quizResults as
        | {
            correct: number;
            total: number;
            perQuestion: { answer: number; correct: number; timeSpent: number; timedOut: boolean }[];
          }
        | null
        | undefined;

      if (quiz) {
        const optLabel = (n: number) => (n < 0 ? "—" : ["А", "Б", "В", "Г"][n] ?? "?");
        message += `\n🎯 КВИЗ: ${quiz.correct}/${quiz.total} правильных\n`;
        quiz.perQuestion.forEach((r, i) => {
          const mark = r.answer === r.correct ? "✅" : r.timedOut ? "⏰" : "❌";
          message += `Вопрос ${i + 1}: ${mark} ответ: ${optLabel(r.answer)} (правильный: ${optLabel(r.correct)}) ⏱ ${r.timeSpent}с${r.timedOut ? " (таймаут)" : ""}\n`;
        });
      }

      message += `\n📊 ЗАДАЧИ:\n`;
      for (let i = 0; i < ans.length; i++) {
        const hasFile = attachmentMap[String(i)];
        message += `${labels[i]}: ${ans[i] || "(пусто)"}${hasFile ? " 📎" : ""}\n\n`;
      }
    } else if (body.type === "grade8informaticsPython") {
      const ans = (body.answers as string[]) ?? [];
      const code = ans[0] ?? "";

      const quiz = body.quizResults as
        | {
            correct: number;
            total: number;
            perQuestion: { answer: number; correct: number; timeSpent: number; timedOut: boolean }[];
          }
        | null
        | undefined;

      message += `\n📅 Дата работы: 20.04.2026\n`;

      if (quiz) {
        const optLabel = (n: number) => (n < 0 ? "—" : ["А", "Б", "В", "Г"][n] ?? "?");
        message += `\n🎯 КВИЗ Python: ${quiz.correct}/${quiz.total} правильных\n`;
        quiz.perQuestion.forEach((r, i) => {
          const mark = r.answer === r.correct ? "✅" : r.timedOut ? "⏰" : "❌";
          message += `Вопрос ${i + 1}: ${mark} ответ: ${optLabel(r.answer)} (правильный: ${optLabel(r.correct)}) ⏱ ${r.timeSpent}с${r.timedOut ? " (таймаут)" : ""}\n`;
        });
      }

      message += `\n💻 КОД (задание «Генератор героя»)${attachmentMap["0"] ? " 📎" : ""}:\n`;
      message += `\`\`\`\n${code || "(пусто)"}\n\`\`\`\n`;
    } else if (body.type === "grade7technologyFinalQ4") {
      const ans = (body.answers as string[]) ?? [];
      const quiz = body.quizResults as
        | {
            correct: number;
            total: number;
            perQuestion: { answer: number; correct: number; timeSpent: number; timedOut: boolean }[];
          }
        | null
        | undefined;

      if (quiz) {
        const optLabel = (n: number) => (n < 0 ? "—" : ["А", "Б", "В", "Г"][n] ?? "?");
        message += `\n🎯 КВИЗ (15 вопросов): ${quiz.correct}/${quiz.total} правильных\n`;
        quiz.perQuestion.forEach((r, i) => {
          const mark = r.answer === r.correct ? "✅" : r.timedOut ? "⏰" : "❌";
          message += `Вопрос ${i + 1}: ${mark} ответ: ${optLabel(r.answer)} (правильный: ${optLabel(r.correct)}) ⏱ ${r.timeSpent}с${r.timedOut ? " (таймаут)" : ""}\n`;
        });
      }

      message += `\n📊 ЧАСТЬ 1. ПРАКТИКА (задачи 1–4):\n`;
      for (let i = 0; i < 4; i++) {
        const hasFile = attachmentMap[String(i)];
        message += `Задача ${i + 1}: ${ans[i] || "(пусто)"}${hasFile ? " 📎" : ""}\n`;
      }

      message += `\n📝 ЧАСТЬ 2. ТЕОРИЯ (вопросы 1–8):\n`;
      for (let j = 0; j < 8; j++) {
        const idx = 4 + j;
        const hasFile = attachmentMap[String(idx)];
        message += `Вопрос ${j + 1}: ${ans[idx] || "(пусто)"}${hasFile ? " 📎" : ""}\n`;
      }
    } else if (body.type === "grade8technologyFinalQ4Theory") {
      const ans = (body.answers as string[]) ?? [];
      const quiz = body.quizResults as
        | {
            correct: number;
            total: number;
            perQuestion: { answer: number; correct: number; timeSpent: number; timedOut: boolean }[];
          }
        | null
        | undefined;

      if (quiz) {
        const optLabel = (n: number) => (n < 0 ? "—" : ["А", "Б", "В", "Г"][n] ?? "?");
        message += `\n🎯 КВИЗ (15 вопросов): ${quiz.correct}/${quiz.total} правильных\n`;
        quiz.perQuestion.forEach((r, i) => {
          const mark = r.answer === r.correct ? "✅" : r.timedOut ? "⏰" : "❌";
          message += `Вопрос ${i + 1}: ${mark} ответ: ${optLabel(r.answer)} (правильный: ${optLabel(r.correct)}) ⏱ ${r.timeSpent}с${r.timedOut ? " (таймаут)" : ""}\n`;
        });
      }

      message += `\n📝 ЧАСТЬ 2. ТЕОРИЯ (задания 1–6):\n`;
      for (let i = 0; i < 6; i++) {
        const hasFile = attachmentMap[String(i)];
        message += `Задание ${i + 1}: ${ans[i] || "(пусто)"}${hasFile ? " 📎" : ""}\n\n`;
      }
    } else if (body.type === "grade5technologyFinalQ4V2") {
      const ans = (body.answers as string[]) ?? [];
      const quiz = body.quizResults as
        | {
            correct: number;
            total: number;
            perQuestion: { answer: number; correct: number; timeSpent: number; timedOut: boolean }[];
          }
        | null
        | undefined;

      if (quiz) {
        const optLabel = (n: number) => (n < 0 ? "—" : ["А", "Б", "В", "Г"][n] ?? "?");
        message += `\n🎯 КВИЗ (15 вопросов): ${quiz.correct}/${quiz.total} правильных\n`;
        quiz.perQuestion.forEach((r, i) => {
          const mark = r.answer === r.correct ? "✅" : r.timedOut ? "⏰" : "❌";
          message += `Вопрос ${i + 1}: ${mark} ответ: ${optLabel(r.answer)} (правильный: ${optLabel(r.correct)}) ⏱ ${r.timeSpent}с${r.timedOut ? " (таймаут)" : ""}\n`;
        });
      }

      message += `\n📝 ЧАСТЬ 2. ПИСЬМЕННЫЕ ЗАДАНИЯ (16–19):\n`;
      for (let i = 0; i < 4; i++) {
        const hasFile = attachmentMap[String(i)];
        message += `Задание ${16 + i}: ${ans[i] || "(пусто)"}${hasFile ? " 📎" : ""}\n\n`;
      }
    } else {
      const blitz = body.blitz as string[];
      const tasks = body.tasks as Record<string, string>;

      message += `\n📝 БЛИЦ:\n`;
      blitz.forEach((a: string, i: number) => {
        message += `${i + 1}. ${a || "(пусто)"}\n`;
      });

      message += `\n📊 ИНФОРМАТИКА:\n`;
      message += `Задача 1: ${tasks.t1 || "(пусто)"}${attachmentMap.t1 ? " 📎" : ""}\n`;
      message += `Задача 2: ${tasks.t2 || "(пусто)"}${attachmentMap.t2 ? " 📎" : ""}\n`;
      message += `Задача 3: ${tasks.t3 || "(пусто)"}${attachmentMap.t3 ? " 📎" : ""}\n`;

      message += `\n💻 PYTHON:\n`;
      message += `Задача 4: ${tasks.t4 || "(пусто)"}${attachmentMap.t4 ? " 📎" : ""}\n`;
      message += `Задача 5: ${tasks.t5 || "(пусто)"}${attachmentMap.t5 ? " 📎" : ""}\n`;
      message += `Задача 6: ${tasks.t6 || "(пусто)"}${attachmentMap.t6 ? " 📎" : ""}\n`;
    }

    // Split into chunks of ~4000 chars by lines
    function splitMessage(text: string, limit = 4000): string[] {
      const lines = text.split("\n");
      const chunks: string[] = [];
      let current = "";
      for (const line of lines) {
        if (current.length + line.length + 1 > limit && current.length > 0) {
          chunks.push(current);
          current = "";
        }
        current += (current ? "\n" : "") + line;
      }
      if (current) chunks.push(current);
      return chunks;
    }

    // Send main message (split if needed)
    const mainChunks = splitMessage(message);
    for (const chunk of mainChunks) {
      await sendTelegramText(chunk, LOVABLE_API_KEY, TELEGRAM_API_KEY, CHAT_ID);
    }

    // Send anticheat as separate message
    if (cheatLog && cheatLog.length > 0) {
      let cheatMessage = `🛑 АНТИЧИТ — ${studentName} (${cheatLog.length} событий):\n`;
      (cheatLog as string[]).forEach((entry: string) => {
        cheatMessage += `• ${entry}\n`;
      });
      const cheatChunks = splitMessage(cheatMessage);
      for (const chunk of cheatChunks) {
        await sendTelegramText(chunk, LOVABLE_API_KEY, TELEGRAM_API_KEY, CHAT_ID);
      }
    }

    // Send attachments
    for (const [key, url] of Object.entries(attachmentMap)) {
      const caption = `📎 ${studentName} — Задача ${key}`;
      const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url);
      try {
        if (isImage) {
          await sendTelegramPhoto(url, caption, LOVABLE_API_KEY, TELEGRAM_API_KEY, CHAT_ID);
        } else {
          await sendTelegramDocument(url, caption, LOVABLE_API_KEY, TELEGRAM_API_KEY, CHAT_ID);
        }
      } catch (e) {
        console.error(`Failed to send attachment ${key}:`, e);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
