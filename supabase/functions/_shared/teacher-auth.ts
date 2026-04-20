// Общая утилита проверки учительского HMAC токена.
export async function verifyTeacherToken(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  const jwtSecret = Deno.env.get("TEACHER_JWT_SECRET");
  const expectedLogin = Deno.env.get("TEACHER_LOGIN");
  if (!jwtSecret || !expectedLogin) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, sig] = parts;

  let payload: string;
  try {
    payload = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((payloadB64.length + 3) % 4));
  } catch {
    return false;
  }

  const [login, expStr] = payload.split(".");
  const exp = Number(expStr);
  if (!login || !exp || login !== expectedLogin) return false;
  if (Date.now() / 1000 > exp) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(jwtSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expectedSigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const expectedSig = btoa(String.fromCharCode(...new Uint8Array(expectedSigBuf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return expectedSig === sig;
}

export function getTokenFromRequest(req: Request): string | null {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  const x = req.headers.get("x-teacher-token");
  return x || null;
}
