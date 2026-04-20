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

async function gzipJson(obj: unknown): Promise<Blob> {
  const json = JSON.stringify(obj);
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Response(stream).blob();
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
    const fileName = `chunk-${String(idx).padStart(4, "0")}.json.gz`;
    const path = `${rid}/${fileName}`;

    const uploadPromise = (async () => {
      try {
        const gz = await gzipJson(events);
        console.log(`[rrweb] uploading ${path} (${events.length} events, ${gz.size}b)`);
        const { error } = await supabase.storage
          .from("rrweb-sessions")
          .upload(path, gz, {
            contentType: "application/gzip",
            upsert: true,
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

    let stop: (() => void) | undefined;
    try {
      stop = rrwebRecord({
        emit(event) {
          bufferRef.current.push(event);
        },
        sampling: {
          mousemove: 100,
          scroll: 200,
          input: "last",
        },
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
