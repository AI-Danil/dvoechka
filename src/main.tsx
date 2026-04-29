// Защитные шимы и обработчики ДО загрузки App, чтобы не было «белого экрана»
// в Safari Private, Яндекс.Браузере с заблокированными cookies, в WebView и т.п.

// 1. localStorage shim — supabase-js падает на инициализации, если localStorage кидает SecurityError
(function ensureLocalStorage() {
  try {
    const k = "__ls_test__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
  } catch {
    const mem = new Map<string, string>();
    const shim: Storage = {
      get length() { return mem.size; },
      clear: () => mem.clear(),
      getItem: (k) => (mem.has(k) ? mem.get(k)! : null),
      key: (i) => Array.from(mem.keys())[i] ?? null,
      removeItem: (k) => { mem.delete(k); },
      setItem: (k, v) => { mem.set(k, String(v)); },
    };
    try {
      Object.defineProperty(window, "localStorage", { value: shim, configurable: true });
    } catch {
      // как крайний случай — игнор; supabase сам справится с null
    }
  }
})();

// 2. Глобальные обработчики необработанных ошибок — логируем, но НЕ роняем UI
window.addEventListener("error", (e) => {
  // eslint-disable-next-line no-console
  console.error("[global error]", e.message, e.error);
});
window.addEventListener("unhandledrejection", (e) => {
  // eslint-disable-next-line no-console
  console.error("[unhandled rejection]", e.reason);
});

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import "./index.css";

const rootEl = document.getElementById("root")!;
createRoot(rootEl).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
