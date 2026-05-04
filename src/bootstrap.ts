// Must run before App/Supabase imports: some school browsers block Web Storage.

// Beacon: JS bundle started executing. If TG sees html-js but not js-start,
// the inline script ran but the module bundle didn't (legacy browser / proxy stripping type=module).
try {
  const img = new Image();
  img.src =
    "https://gbpqlzjtcuhijtouwrvn.supabase.co/functions/v1/page-beacon?stage=js-start&ua=" +
    encodeURIComponent((navigator.userAgent || "").substring(0, 160));
} catch {
  /* ignore */
}

function createMemoryStorage(): Storage {
  const mem = new Map<string, string>();
  return {
    get length() { return mem.size; },
    clear: () => mem.clear(),
    getItem: (key) => (mem.has(key) ? mem.get(key)! : null),
    key: (index) => Array.from(mem.keys())[index] ?? null,
    removeItem: (key) => { mem.delete(key); },
    setItem: (key, value) => { mem.set(key, String(value)); },
  };
}

function ensureStorage(name: "localStorage" | "sessionStorage") {
  try {
    const storage = window[name];
    const key = `__${name}_test__`;
    storage.setItem(key, "1");
    storage.removeItem(key);
  } catch {
    try {
      Object.defineProperty(window, name, { value: createMemoryStorage(), configurable: true });
    } catch {
      /* ignore: app-level error boundary will handle the rest */
    }
  }
}

ensureStorage("localStorage");
ensureStorage("sessionStorage");

function reportClientCrash(kind: string, message: string) {
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-copy-attempt`;
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ""}`,
      },
      body: JSON.stringify({
        studentName: "(система)",
        grade: "?",
        subject: "technology",
        event: `Белый экран: ${kind}. ${message}. UA=${navigator.userAgent.slice(0, 120)}`,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* noop */
  }
}

window.addEventListener("error", (event) => {
  console.error("[global error]", event.message, event.error);
  reportClientCrash("error", event.message || String(event.error ?? "unknown"));
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("[unhandled rejection]", event.reason);
  reportClientCrash("unhandledrejection", String(event.reason?.message ?? event.reason ?? "unknown"));
});