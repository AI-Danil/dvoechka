import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
    if (!TELEGRAM_API_KEY) throw new Error("TELEGRAM_API_KEY is not configured");

    const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
    if (!CHAT_ID) throw new Error("TELEGRAM_CHAT_ID is not configured");

    const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not configured");

    const { studentName, grade, subject, blitz, tasks, cheatLog, timeSpent } =
      await req.json();

    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;

    let message = `📝 ОТВЕТЫ: ${studentName} (${grade} класс)\n`;
    message += `⏱ Время: ${minutes} мин ${seconds} сек\n\n`;

    message += `--- БЛИЦ ---\n`;
    (blitz as string[]).forEach((a: string, i: number) => {
      message += `${i + 1}: ${a || "(пусто)"}\n`;
    });

    message += `\n--- ИНФОРМАТИКА ---\n`;
    message += `Задача 1: ${tasks.t1 || "(пусто)"}\n`;
    message += `Задача 2: ${tasks.t2 || "(пусто)"}\n`;
    message += `Задача 3: ${tasks.t3 || "(пусто)"}\n`;

    message += `\n--- PYTHON ---\n`;
    message += `Задача 4: ${tasks.t4 || "(пусто)"}\n`;
    message += `Задача 5: ${tasks.t5 || "(пусто)"}\n`;
    message += `Задача 6: ${tasks.t6 || "(пусто)"}\n`;

    if (cheatLog && cheatLog.length > 0) {
      message += `\n⚠️ АНТИЧИТ (${cheatLog.length} событий):\n`;
      (cheatLog as string[]).forEach((entry: string) => {
        message += `• ${entry}\n`;
      });
    } else {
      message += `\n✅ Нарушений не зафиксировано.`;
    }

    // Telegram has 4096 char limit, truncate if needed
    if (message.length > 4000) {
      message = message.substring(0, 4000) + "\n...(обрезано)";
    }

    // Send via direct Bot API (using stored bot token, not gateway for sendMessage)
    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "HTML",
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
