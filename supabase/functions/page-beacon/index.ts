// Public diagnostic beacon. Called as <img src=".../page-beacon?stage=html&ua=..."> from index.html
// and as new Image().src=".../page-beacon?stage=js-start" from src/bootstrap.ts.
// Sends a short report to the same Telegram chat used for cheat alerts.
// No auth, no JSON body — must work even from very old browsers / restrictive proxies.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

// 1×1 transparent GIF
const PIXEL = Uint8Array.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
  0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00,
  0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02,
  0x44, 0x01, 0x00, 0x3b,
]);

function pixelResponse() {
  return new Response(PIXEL, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
    },
  });
}

// Naive in-memory rate limit per-instance to avoid spamming TG if a script loops.
const lastSentAt = new Map<string, number>();
const MIN_INTERVAL_MS = 5000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const stage = (url.searchParams.get("stage") ?? "unknown").slice(0, 32);
    const note = (url.searchParams.get("note") ?? "").slice(0, 200);
    const uaParam = url.searchParams.get("ua");
    const ua = (uaParam ?? req.headers.get("user-agent") ?? "?").slice(0, 200);
    const ref = (req.headers.get("referer") ?? "").slice(0, 200);
    const ip =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "?";

    // Always return the pixel — never block the browser.
    const response = pixelResponse();

    // Only notify Telegram for problem stages; штатные стадии не спамим.
    const NOTIFY_STAGES = new Set(["js-timeout", "js-fail"]);
    if (!NOTIFY_STAGES.has(stage)) {
      return response;
    }

    // Rate-limit: same ip+stage at most once per 5s.
    const key = `${ip}|${stage}`;
    const now = Date.now();
    const last = lastSentAt.get(key) ?? 0;
    if (now - last < MIN_INTERVAL_MS) {
      return response;
    }
    lastSentAt.set(key, now);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
    const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
    if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY || !CHAT_ID) {
      console.error("page-beacon: missing telegram secrets");
      return response;
    }

    const stageEmoji =
      stage === "html" ? "🟦"
      : stage === "js-start" ? "🟩"
      : stage === "js-fail" ? "🟥"
      : "🟨";

    const text =
      `🪧 beacon ${stageEmoji} stage=${stage}\n` +
      (note ? `note: ${note}\n` : "") +
      `ip: ${ip}\n` +
      `ref: ${ref || "-"}\n` +
      `ua: ${ua}`;

    // Fire-and-forget — don't block the pixel response on Telegram.
    fetch(`${GATEWAY_URL}/sendMessage`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TELEGRAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ chat_id: CHAT_ID, text }),
    }).catch((err) => console.error("page-beacon: tg send failed", err));

    return response;
  } catch (err) {
    console.error("page-beacon: handler error", err);
    return pixelResponse();
  }
});
