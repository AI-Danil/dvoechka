/**
 * Preflight-проверка: реально ли мы можем писать в bucket `rrweb-sessions`
 * по конкретному пути <resultId>/. Вызывается ДО старта теста.
 *
 * Если возвращает { ok: false } — значит RLS / сеть / бакет сломаны,
 * и тест запускать нельзя (запись экрана не сохранится).
 */
import { supabase } from "@/integrations/supabase/client";

export type StorageCheckResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function checkRecordingStorage(resultId: string): Promise<StorageCheckResult> {
  if (!resultId) return { ok: false, reason: "no resultId" };
  const path = `${resultId}/preflight.txt`;
  try {
    const { error } = await supabase.storage
      .from("rrweb-sessions")
      .upload(path, new Blob(["ok"], { type: "text/plain" }), { upsert: false });
    if (error) {
      return { ok: false, reason: error.message || "upload error" };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: msg };
  }
}
