import { useEffect, useRef } from "react";
import { record } from "rrweb";
type RrwebEvent = Record<string, unknown>;
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const FLUSH_INTERVAL_MS = 2 * 60 * 1000; // 2 минуты

interface Options {
  resultId: string | null; // если null — не пишем
  enabled: boolean;
}

async function gzipJson(obj: unknown): Promise<Blob> {
  const json = JSON.stringify(obj);
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Response(stream).blob();
}

/**
 * Запись действий ученика через rrweb.
 * - Чанковая загрузка каждые 2 минуты
 * - gzip-сжатие через CompressionStream (без зависимостей)
 * - Финальный flush через sendBeacon на закрытии вкладки
 * - После завершения сабмита вызывается finalize() — обновляет replay_url
 */
export function useRrwebRecorder({ resultId, enabled }: Options) {
  const stopFnRef = useRef<(() => void) | null>(null);
  const bufferRef = useRef<RrwebEvent[]>([]);
  const chunkIndexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultIdRef = useRef<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    resultIdRef.current = resultId;
  }, [resultId]);

  // Загрузить накопленный буфер как новый чанк
  const flush = async (sync = false) => {
    const rid = resultIdRef.current;
    if (!rid) return;
    const events = bufferRef.current;
    if (events.length === 0) return;
    bufferRef.current = [];
    const idx = chunkIndexRef.current++;
    const fileName = `chunk-${String(idx).padStart(4, "0")}.json.gz`;
    const path = `${rid}/${fileName}`;

    try {
      if (sync && navigator.sendBeacon) {
        // Синхронная отправка через sendBeacon — JSON без gzip,
        // т.к. CompressionStream асинхронный. Чанк всё равно небольшой.
        const json = JSON.stringify(events);
        const blob = new Blob([json], { type: "application/json" });
        const url = `${SUPABASE_URL}/storage/v1/object/rrweb-sessions/${rid}/chunk-${String(idx).padStart(4, "0")}.json`;
        // sendBeacon не позволяет указать Content-Type/Auth headers легко, поэтому используем fetch keepalive
        const headers: Record<string, string> = {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
          authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          "content-type": "application/json",
          "x-upsert": "true",
        };
        try {
          fetch(url, { method: "POST", headers, body: blob, keepalive: true });
        } catch {
          // ignore
        }
        return;
      }

      const gz = await gzipJson(events);
      const { error } = await supabase.storage
        .from("rrweb-sessions")
        .upload(path, gz, {
          contentType: "application/gzip",
          upsert: true,
        });
      if (error) console.error("rrweb chunk upload failed:", error);
    } catch (e) {
      console.error("rrweb flush error:", e);
    }
  };

  useEffect(() => {
    if (!enabled || !resultId) return;
    if (startedRef.current) return;
    startedRef.current = true;

    bufferRef.current = [];
    chunkIndexRef.current = 0;

    const stop = record({
      emit(event) {
        bufferRef.current.push(event);
      },
      sampling: {
        // снижаем шум: курсор раз в 100мс, скролл раз в 200мс
        mousemove: 100,
        scroll: 200,
        input: "last",
      },
      blockClass: "rr-block",
      maskAllInputs: false,
      recordCanvas: false,
      collectFonts: false,
    });
    stopFnRef.current = stop || null;

    intervalRef.current = setInterval(() => {
      void flush(false);
    }, FLUSH_INTERVAL_MS);

    const onBeforeUnload = () => {
      void flush(true);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") void flush(true);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (intervalRef.current) clearInterval(intervalRef.current);
      try { stopFnRef.current?.(); } catch { /* ignore */ }
      stopFnRef.current = null;
      startedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, resultId]);

  // Финализация: дофлашить + проставить replay_url
  const finalize = async () => {
    await flush(false);
    try { stopFnRef.current?.(); } catch { /* ignore */ }
    stopFnRef.current = null;
    const rid = resultIdRef.current;
    if (!rid) return;
    try {
      await supabase.functions.invoke("update-replay-url", { body: { resultId: rid } });
    } catch (e) {
      console.error("update-replay-url failed:", e);
    }
  };

  return { finalize };
}
