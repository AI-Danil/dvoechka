/**
 * Записывает экран ученика через rrweb и чанками заливает в приватный
 * bucket `rrweb-sessions`. Первый flush — через 10 сек после старта,
 * затем каждые 30 сек. Финальный flush — при unmount/submit.
 *
 * Учитель смотрит запись через /replay/:resultId — фронт получает
 * signed URL у edge-функции replay-signed-url (TTL ~1 час).
 */
import { useEffect, useRef } from "react";
import { record as rrwebRecord } from "rrweb";
type RrwebEvent = Record<string, unknown>;
import { supabase } from "@/integrations/supabase/client";

const FLUSH_INTERVAL_MS = 30 * 1000; // 30 секунд
const FIRST_FLUSH_DELAY_MS = 10 * 1000; // 10 секунд после старта

interface Options {
  resultId: string | null;
  enabled: boolean;
}

interface EncodedChunk {
  blob: Blob;
  ext: "json.gz" | "json";
  contentType: string;
}

async function encodeJson(obj: unknown): Promise<EncodedChunk> {
  const json = JSON.stringify(obj);
  // Try gzip; fallback to raw JSON if CompressionStream missing/broken (old Safari/Android)
  try {
    if (typeof CompressionStream !== "undefined") {
      const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"));
      const blob = await new Response(stream).blob();
      return { blob, ext: "json.gz", contentType: "application/gzip" };
    }
  } catch (e) {
    console.warn("[rrweb] gzip failed, falling back to raw JSON:", e);
  }
  return {
    blob: new Blob([json], { type: "application/json" }),
    ext: "json",
    contentType: "application/json",
  };
}

export function useRrwebRecorder({ resultId, enabled }: Options) {
  const stopFnRef = useRef<(() => void) | null>(null);
  const bufferRef = useRef<RrwebEvent[]>([]);
  const chunkIndexRef = useRef(0);
  const uploadedChunksRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firstFlushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUploadsRef = useRef<Promise<unknown>[]>([]);
  const resultIdRef = useRef<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    resultIdRef.current = resultId;
  }, [resultId]);

  const flush = async () => {
    const rid = resultIdRef.current;
    if (!rid) {
      console.warn("[rrweb] flush skipped: no resultId");
      return;
    }
    const events = bufferRef.current;
    if (events.length === 0) {
      console.log("[rrweb] flush skipped: empty buffer");
      return;
    }
    bufferRef.current = [];
    const idx = chunkIndexRef.current++;

    const uploadPromise = (async () => {
      try {
        const encoded = await encodeJson(events);
        const fileName = `chunk-${String(idx).padStart(4, "0")}.${encoded.ext}`;
        const path = `${rid}/${fileName}`;
        console.log(`[rrweb] uploading ${path} (${events.length} events, ${encoded.blob.size}b, ${encoded.ext})`);
        const { error } = await supabase.storage
          .from("rrweb-sessions")
          .upload(path, encoded.blob, {
            contentType: encoded.contentType,
            upsert: false,
          });
        if (error) {
          console.error("[rrweb] chunk upload failed:", error, "path:", path);
        } else {
          uploadedChunksRef.current++;
          console.log(`[rrweb] chunk uploaded OK: ${path} (total: ${uploadedChunksRef.current})`);
        }
      } catch (e) {
        console.error("[rrweb] flush error:", e);
      }
    })();
    pendingUploadsRef.current.push(uploadPromise);
    await uploadPromise;
  };

  useEffect(() => {
    if (!enabled || !resultId) return;
    if (startedRef.current) return;
    startedRef.current = true;

    bufferRef.current = [];
    chunkIndexRef.current = 0;
    uploadedChunksRef.current = 0;
    pendingUploadsRef.current = [];

    console.log("[rrweb] starting recorder for resultId:", resultId, "record type:", typeof rrwebRecord);
    // Sentinel/preflight удалён — проверка storage теперь делается ДО старта теста
    // через checkRecordingStorage() в src/lib/checkRecordingStorage.ts.

    let stop: (() => void) | undefined;
    try {
      stop = rrwebRecord({
        emit(event) {
          bufferRef.current.push(event);
          if (bufferRef.current.length === 1) console.log("[rrweb] first event captured");
        },
        sampling: { mousemove: 100, scroll: 200, input: "last" },
        blockClass: "rr-block",
        maskAllInputs: false,
        recordCanvas: false,
        collectFonts: false,
      });
      console.log("[rrweb] record() returned, stop is:", typeof stop);
    } catch (e) {
      console.error("[rrweb] record() threw:", e);
    }
    stopFnRef.current = stop || null;

    firstFlushTimeoutRef.current = setTimeout(() => {
      console.log("[rrweb] first flush (10s)");
      void flush();
    }, FIRST_FLUSH_DELAY_MS);

    intervalRef.current = setInterval(() => {
      void flush();
    }, FLUSH_INTERVAL_MS);

    const onBeforeUnload = () => { void flush(); };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (firstFlushTimeoutRef.current) clearTimeout(firstFlushTimeoutRef.current);
      try { stopFnRef.current?.(); } catch { /* ignore */ }
      stopFnRef.current = null;
      startedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, resultId]);

  const finalize = async () => {
    console.log("[rrweb] finalize called, buffer size:", bufferRef.current.length);
    // Stop recording first to flush any in-flight events from rrweb internals
    try { stopFnRef.current?.(); } catch { /* ignore */ }
    stopFnRef.current = null;
    // Final flush of remaining buffer
    await flush();
    // Wait for ALL pending uploads to complete
    await Promise.allSettled(pendingUploadsRef.current);
    const rid = resultIdRef.current;
    const uploaded = uploadedChunksRef.current;
    console.log(`[rrweb] finalize done. uploaded chunks: ${uploaded}`);
    if (uploaded === 0) {
      console.error("[rrweb] PRODUCED NO CHUNKS — recording was not saved");
      // Алерт учителю в Telegram, чтобы знать о провале сразу
      try {
        await supabase.functions.invoke("notify-copy-attempt", {
          body: {
            studentName: "(система)",
            grade: "?",
            subject: "informatics",
            event: `⚠️ Запись экрана не сохранилась (0 чанков). resultId=${rid ?? "?"}, UA=${navigator.userAgent.slice(0, 80)}`,
          },
        });
      } catch (e) {
        console.error("[rrweb] failed to send no-chunks alert:", e);
      }
      return;
    }
    if (!rid) return;
    try {
      const { error } = await supabase.functions.invoke("update-replay-url", { body: { resultId: rid } });
      if (error) console.error("[rrweb] update-replay-url error:", error);
      else console.log("[rrweb] replay_url updated for", rid);
    } catch (e) {
      console.error("[rrweb] update-replay-url invoke failed:", e);
    }
  };

  return { finalize };
}
