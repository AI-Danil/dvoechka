import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not configured");

    const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
    if (!CHAT_ID) throw new Error("TELEGRAM_CHAT_ID is not configured");

    const body = await req.json();
    const { studentName, grade, subject, cheatLog, timeSpent } = body;

    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;
    const timeLeftMin = Math.floor((40 * 60 - timeSpent) / 60);
    const timeLeftSec = (40 * 60 - timeSpent) % 60;

    let message = `🚀 ОТВЕТ: ${studentName}\n`;
    message += `📚 ${grade} класс, ${subject === "informatics" ? "Информатика" : subject}\n`;
    message += `⏱ Осталось: ${String(timeLeftMin).padStart(2, "0")}:${String(timeLeftSec).padStart(2, "0")}\n\n`;

    // Anticheat
    if (cheatLog && cheatLog.length > 0) {
      message += `🛑 АНТИЧИТ (${cheatLog.length} событий):\n`;
      (cheatLog as string[]).forEach((entry: string) => {
        message += `• ${entry}\n`;
      });
    } else {
      message += `🛑 АНТИЧИТ: ✅ Чисто\n`;
    }

    if (body.type === "grade7") {
      // Grade 7 format
      const theory = body.theory as string[];
      const practice = body.practice as string[];

      message += `\n📝 БЛОК 1 (Теория):\n`;
      theory.forEach((a: string, i: number) => {
        message += `${i + 1}. ${a || "(пусто)"}\n`;
      });

      message += `\n📊 БЛОК 2 (Задачи):\n`;
      practice.forEach((a: string, i: number) => {
        message += `${i + 8}. ${a || "(пусто)"}\n`;
      });
    } else {
      // Grade 8 format (default)
      const blitz = body.blitz as string[];
      const tasks = body.tasks as Record<string, string>;

      message += `\n📝 БЛИЦ:\n`;
      blitz.forEach((a: string, i: number) => {
        message += `${i + 1}. ${a || "(пусто)"}\n`;
      });

      message += `\n📊 ИНФОРМАТИКА:\n`;
      message += `Задача 1: ${tasks.t1 || "(пусто)"}\n`;
      message += `Задача 2: ${tasks.t2 || "(пусто)"}\n`;
      message += `Задача 3: ${tasks.t3 || "(пусто)"}\n`;

      message += `\n💻 PYTHON:\n`;
      message += `Задача 4: ${tasks.t4 || "(пусто)"}\n`;
      message += `Задача 5: ${tasks.t5 || "(пусто)"}\n`;
      message += `Задача 6: ${tasks.t6 || "(пусто)"}\n`;
    }

    // Truncate if needed
    if (message.length > 4000) {
      message = message.substring(0, 4000) + "\n...(обрезано)";
    }

    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        `Telegram API failed [${response.status}]: ${JSON.stringify(data)}`
      );
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
