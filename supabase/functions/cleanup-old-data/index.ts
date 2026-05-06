// cleanup-old-data: ручной cron для retention.
// Защищён HMAC-токеном учителя (admin/teacher).
// — student_drafts старше 30 дней
// — auth_attempts старше 7 дней
// — файлы в bucket rrweb-sessions старше 90 дней
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { verifyTeacherToken, getTokenFromRequest } from "../_shared/teacher-auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const token = getTokenFromRequest(req);
  if (!(await verifyTeacherToken(token))) {
    return errorResponse("unauthorized", "Unauthorized", 401);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const report: Record<string, number | string> = {};

  // 1) drafts > 30 days
  const draftCutoff = new Date(Date.now() - 30 * 86400_000).toISOString();
  const { count: draftsDeleted, error: draftsErr } = await admin
    .from("student_drafts")
    .delete({ count: "exact" })
    .lt("updated_at", draftCutoff);
  if (draftsErr) report.drafts_error = draftsErr.message;
  else report.drafts_deleted = draftsDeleted ?? 0;

  // 2) auth_attempts > 7 days
  const attemptsCutoff = new Date(Date.now() - 7 * 86400_000).toISOString();
  const { count: attemptsDeleted, error: attemptsErr } = await admin
    .from("auth_attempts")
    .delete({ count: "exact" })
    .lt("created_at", attemptsCutoff);
  if (attemptsErr) report.auth_attempts_error = attemptsErr.message;
  else report.auth_attempts_deleted = attemptsDeleted ?? 0;

  // 3) rrweb-sessions storage objects > 90 days
  const sessionCutoff = Date.now() - 90 * 86400_000;
  let storageDeleted = 0;
  try {
    const { data: list, error: listErr } = await admin.storage
      .from("rrweb-sessions")
      .list("", { limit: 1000, sortBy: { column: "created_at", order: "asc" } });
    if (listErr) {
      report.storage_error = listErr.message;
    } else if (list) {
      const old = list
        .filter((o) => o.created_at && new Date(o.created_at).getTime() < sessionCutoff)
        .map((o) => o.name);
      if (old.length > 0) {
        const { error: rmErr } = await admin.storage.from("rrweb-sessions").remove(old);
        if (rmErr) report.storage_error = rmErr.message;
        else storageDeleted = old.length;
      }
    }
  } catch (e) {
    report.storage_error = String(e);
  }
  report.rrweb_objects_deleted = storageDeleted;

  return jsonResponse({ ok: true, report });
});
