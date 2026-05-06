// verify-teacher-credentials: проверяет логин/пароль учителя.
// — bcrypt-хэш в таблице teacher_credentials (с one-time миграцией из TEACHER_PASSWORD env)
// — anti-brute-force: ≥5 неудачных попыток за 15 мин с одного IP+login → 429
// — выдаёт HMAC-токен на 8 часов
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { parseJson, z } from "../_shared/validate.ts";

const TOKEN_TTL_SECONDS = 8 * 60 * 60;
const RATE_LIMIT_WINDOW_MIN = 15;
const RATE_LIMIT_MAX_FAILS = 5;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BodySchema = z.object({
  login: z.string().min(1).max(200),
  password: z.string().min(1).max(500),
});

async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const parsed = await parseJson(req, BodySchema);
    if (!parsed.ok) return parsed.response;
    const { login, password } = parsed.data;

    const expectedLogin = Deno.env.get("TEACHER_LOGIN");
    const jwtSecret = Deno.env.get("TEACHER_JWT_SECRET");
    if (!expectedLogin || !jwtSecret) {
      return errorResponse("server_misconfigured", "Server misconfigured", 500);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const ip = getClientIp(req);

    // Brute-force check
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60_000).toISOString();
    const { count: fails } = await admin
      .from("auth_attempts")
      .select("id", { count: "exact", head: true })
      .eq("login", login)
      .eq("ip", ip)
      .eq("success", false)
      .gte("created_at", since);

    if ((fails ?? 0) >= RATE_LIMIT_MAX_FAILS) {
      return new Response(
        JSON.stringify({ ok: false, error: { code: "rate_limited", message: "Too many attempts. Try again later." } }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "900" } },
      );
    }

    // Get hash from DB; one-time bootstrap from TEACHER_PASSWORD env
    let { data: cred } = await admin
      .from("teacher_credentials")
      .select("password_hash")
      .eq("login", expectedLogin)
      .maybeSingle();

    if (!cred) {
      const envPass = Deno.env.get("TEACHER_PASSWORD");
      if (!envPass) {
        return errorResponse("server_misconfigured", "No credentials configured", 500);
      }
      const hash = await bcrypt.hash(envPass, 10);
      const { error: insErr } = await admin
        .from("teacher_credentials")
        .insert({ login: expectedLogin, password_hash: hash });
      if (insErr) {
        console.error("bootstrap insert failed:", insErr);
        return errorResponse("server_error", "Failed to bootstrap credentials", 500);
      }
      cred = { password_hash: hash };
    }

    const ok = login === expectedLogin && (await bcrypt.compare(password, cred.password_hash));

    // Log attempt (fire-and-forget)
    admin.from("auth_attempts").insert({ login, ip, success: ok }).then(({ error }) => {
      if (error) console.error("auth_attempts insert failed:", error);
    });

    if (!ok) {
      return errorResponse("invalid_credentials", "Invalid credentials", 401);
    }

    const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
    const iat = Math.floor(Date.now() / 1000);
    const payload = `${expectedLogin}.${exp}.${iat}`;
    const sig = await hmacSign(payload, jwtSecret);
    // legacy 2-part token for backward compat in verifyTeacherToken
    const legacyPayload = `${expectedLogin}.${exp}`;
    const legacySig = await hmacSign(legacyPayload, jwtSecret);
    const token = `${btoa(legacyPayload).replace(/=+$/, "")}.${legacySig}`;

    return jsonResponse({ token, expiresAt: exp, iat });
  } catch (e) {
    console.error("verify-teacher-credentials error:", e);
    return errorResponse("bad_request", "Bad request", 400);
  }
});
