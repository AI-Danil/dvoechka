import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface Options {
  enabled: boolean;
  notify: (event: string) => void;
}

/**
 * Глобально блокирует F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S и контекстное меню
 * на время прохождения теста. Каждое срабатывание уходит в Telegram через notify
 * (с собственным дебаунсом внутри хука useAntiCheatNotify).
 */
export function useDevToolsBlock({ enabled, notify }: Options) {
  const { toast } = useToast();

  useEffect(() => {
    if (!enabled) return;

    const showToast = () => {
      toast({
        title: "⛔ Действие заблокировано",
        description: "Инструменты разработчика запрещены. Попытка зафиксирована.",
        variant: "destructive",
      });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === "F12") {
        e.preventDefault();
        showToast();
        notify("Попытка открыть DevTools (F12)");
        return;
      }
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      const key = e.key.toLowerCase();

      // Ctrl+Shift+I / J / C — DevTools
      if (e.shiftKey && (key === "i" || key === "j" || key === "c" || key === "ш" || key === "о" || key === "с")) {
        e.preventDefault();
        showToast();
        notify(`Попытка открыть DevTools (Ctrl+Shift+${key.toUpperCase()})`);
        return;
      }
      // Ctrl+U — view source
      if (key === "u" || key === "г") {
        e.preventDefault();
        showToast();
        notify("Попытка просмотра исходного кода (Ctrl+U)");
        return;
      }
      // Ctrl+S — save page
      if (key === "s" || key === "ы") {
        e.preventDefault();
        showToast();
        notify("Попытка сохранить страницу (Ctrl+S)");
        return;
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      notify("Попытка открыть контекстное меню (ПКМ)");
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    window.addEventListener("contextmenu", onContextMenu, { capture: true });

    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true } as EventListenerOptions);
      window.removeEventListener("contextmenu", onContextMenu, { capture: true } as EventListenerOptions);
    };
  }, [enabled, notify, toast]);
}
