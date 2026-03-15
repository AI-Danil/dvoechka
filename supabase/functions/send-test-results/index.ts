import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { studentName, grade, subject, cheatLog, timeSpent, attachments } = body;

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

    // Truncate if needed
    if (message.length > 4000) {
      message = message.substring(0, 4000) + "\n...(обрезано)";
    }

    // Send main text message via gateway
    await sendTelegramText(message, LOVABLE_API_KEY, TELEGRAM_API_KEY, CHAT_ID);

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
