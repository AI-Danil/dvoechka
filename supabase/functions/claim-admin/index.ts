import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function respond(ok: boolean, payload: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ ok, ...payload }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function decodeJwtSub(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // base64url -> base64
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json);
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch (e) {
    console.error("decodeJwtSub failed:", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    console.log("claim-admin: start");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("claim-admin: missing bearer");
      return respond(false, { error: "Unauthorized" });
    }
    const token = authHeader.replace("Bearer ", "");
    const userId = decodeJwtSub(token);
    console.log("claim-admin: userId =", userId);
    if (!userId) {
      return respond(false, { error: "Не удалось определить пользователя. Войдите заново и попробуйте снова." });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    console.log("claim-admin: counting admins");
    const { count, error: countErr } = await admin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if (countErr) {
      console.error("claim-admin: count error", countErr);
      return respond(false, { error: countErr.message });
    }
    console.log("claim-admin: existing admins =", count);
    if ((count ?? 0) > 0) {
      return respond(false, { error: "Admin already exists" });
    }

    console.log("claim-admin: inserting role");
    const { error: insertErr } = await admin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (insertErr) {
      console.error("claim-admin: insert error", insertErr);
      return respond(false, { error: insertErr.message });
    }

    console.log("claim-admin: success");
    return respond(true);
  } catch (e) {
    console.error("claim-admin error:", e);
    return respond(false, { error: String((e as Error)?.message ?? e) });
  }
});
