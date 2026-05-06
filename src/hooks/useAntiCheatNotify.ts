/**
 * Хук-источник Telegram-алертов для критичных античит-событий
 * (копирование, уход с вкладки, открытие DevTools).
 *
 * Дросселирует уведомления: не чаще одного на NOTIFY_COOLDOWN_MS,
 * чтобы не заспамить чат при удержании Ctrl+C.
 */
import { useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const NOTIFY_COOLDOWN_MS = 10_000;

interface Options {
  studentName: string;
  grade: string;
  subject: string;
}

/**
 * Возвращает функцию notify(event), которая шлёт алерт в Telegram через
 * edge function notify-copy-attempt с дебаунсом 10 секунд и счётчиком
 * накопленных попыток за период.
 */
export function useAntiCheatNotify({ studentName, grade, subject }: Options) {
  const lastNotifyAtRef = useRef<number>(0);
  const pendingCountRef = useRef<number>(0);

  const notify = useCallback(
    async (event: string) => {
      pendingCountRef.current += 1;
      const now = Date.now();
      if (now - lastNotifyAtRef.current < NOTIFY_COOLDOWN_MS) {
        // дебаунс: тихо копим попытки
        return;
      }
      const count = pendingCountRef.current;
      lastNotifyAtRef.current = now;
      pendingCountRef.current = 0;
      const eventWithCount =
        count > 1 ? `${event} (всего попыток за период: ${count})` : event;
      try {
        await supabase.functions.invoke("notify-copy-attempt", {
          body: { studentName, grade, subject, event: eventWithCount },
        });
      } catch (e) {
        console.error("Failed to notify cheat attempt:", e);
      }
    },
    [studentName, grade, subject]
  );

  return notify;
}
