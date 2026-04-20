import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import rrwebPlayer from "rrweb-player";
import "rrweb-player/dist/style.css";
import TeacherLoginGate from "@/components/TeacherLoginGate";
import { useTeacherAuth } from "@/hooks/useTeacherAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

interface CheatEntry {
  raw: string;
  timeStr: string; // HH:MM:SS
  text: string;
}

function parseCheatLog(log: unknown): CheatEntry[] {
  if (!Array.isArray(log)) return [];
  return log.map((line) => {
    const s = String(line);
    const m = s.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*(.*)$/);
    if (m) return { raw: s, timeStr: m[1], text: m[2] };
    return { raw: s, timeStr: "", text: s };
  });
}

async function ungzipToJson(url: string): Promise<unknown[]> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Fetch chunk failed: ${resp.status}`);
  if (url.includes(".json.gz") || url.includes(".gz?")) {
    const stream = resp.body!.pipeThrough(new DecompressionStream("gzip"));
    const text = await new Response(stream).text();
    return JSON.parse(text);
  }
  return await resp.json();
}

function ReplayInner() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "log" ? "log" : "replay";
  const { token } = useTeacherAuth();
  const [tab, setTab] = useState<"replay" | "log">(initialTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    student_name: string;
    grade: number;
    subject: string;
    cheat_log: unknown;
    time_spent: number | null;
    created_at: string;
    answers: unknown;
  } | null>(null);
  const [chunkUrls, setChunkUrls] = useState<string[]>([]);
  const [events, setEvents] = useState<unknown[]>([]);
  const [recordStartTs, setRecordStartTs] = useState<number | null>(null);
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerInstanceRef = useRef<rrwebPlayer | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/replay-signed-url`;
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token || ""}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ resultId: id }),
        });
        if (resp.status === 401) throw new Error("Сессия истекла. Войдите заново.");
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
        if (data?.error) throw new Error(data.error);
        if (cancelled) return;
        setResult(data.result);
        setChunkUrls(data.chunkUrls || []);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Не удалось загрузить запись");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, token]);

  // Загрузить и склеить чанки
  useEffect(() => {
    if (chunkUrls.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const all: unknown[] = [];
        for (const url of chunkUrls) {
          const arr = await ungzipToJson(url);
          if (Array.isArray(arr)) all.push(...arr);
        }
        if (cancelled) return;
        setEvents(all);
        const first = all[0] as { timestamp?: number } | undefined;
        if (first?.timestamp) setRecordStartTs(first.timestamp);
      } catch (e) {
        console.error("Chunk load failed:", e);
        if (!cancelled) setError("Не удалось распаковать запись");
      }
    })();
    return () => { cancelled = true; };
  }, [chunkUrls]);

  // Инициализировать плеер
  useEffect(() => {
    if (tab !== "replay") return;
    if (!playerHostRef.current || events.length < 2) return;
    if (playerInstanceRef.current) return;
    try {
      playerInstanceRef.current = new rrwebPlayer({
        target: playerHostRef.current,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        props: { events: events as any, width: 960, height: 540, autoPlay: false },
      });
    } catch (e) {
      console.error("Player init failed:", e);
      setError("Ошибка инициализации плеера");
    }
    return () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (playerInstanceRef.current as any)?.$destroy?.();
      } catch { /* ignore */ }
      playerInstanceRef.current = null;
    };
  }, [tab, events]);

  const cheatEntries = parseCheatLog(result?.cheat_log);

  // Перемотать плеер на отметку времени из лога
  const seekToCheat = (entry: CheatEntry) => {
    if (!entry.timeStr || !recordStartTs) {
      setTab("replay");
      return;
    }
    setTab("replay");
    // Превратить HH:MM:SS в timestamp в локальный день записи
    const start = new Date(recordStartTs);
    const [h, m, s] = entry.timeStr.split(":").map(Number);
    const target = new Date(start);
    target.setHours(h, m, s, 0);
    let offset = target.getTime() - recordStartTs;
    if (offset < 0) offset = 0;
    setTimeout(() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (playerInstanceRef.current as any)?.goto?.(offset);
      } catch (e) {
        console.error("seek failed:", e);
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin"><ArrowLeft className="h-4 w-4" /> К списку</Link>
          </Button>
          {result && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{result.student_name}</span>
              {" · "}{result.grade} класс · {result.subject}
              {" · "}{new Date(result.created_at).toLocaleString("ru-RU")}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant={tab === "replay" ? "default" : "outline"} size="sm" onClick={() => setTab("replay")}>
            Запись экрана
          </Button>
          <Button variant={tab === "log" ? "default" : "outline"} size="sm" onClick={() => setTab("log")}>
            Лог событий ({cheatEntries.length})
          </Button>
        </div>

        {loading && <p className="text-muted-foreground">Загрузка…</p>}
        {error && <p className="text-destructive">{error}</p>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className={tab === "replay" ? "lg:col-span-2" : "lg:col-span-3"}>
            {tab === "replay" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Воспроизведение</CardTitle>
                </CardHeader>
                <CardContent>
                  {chunkUrls.length === 0 && !loading && (
                    <p className="text-sm text-muted-foreground">
                      Запись для этого результата отсутствует.
                    </p>
                  )}
                  {events.length > 0 && events.length < 2 && (
                    <p className="text-sm text-muted-foreground">Запись слишком короткая.</p>
                  )}
                  <div ref={playerHostRef} />
                </CardContent>
              </Card>
            )}
            {tab === "log" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Полный лог</CardTitle>
                </CardHeader>
                <CardContent>
                  {cheatEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">События не зафиксированы.</p>
                  ) : (
                    <ul className="space-y-1 text-sm font-mono">
                      {cheatEntries.map((e, i) => (
                        <li key={i} className="border-b border-border/50 py-1">
                          <span className="text-muted-foreground">{e.timeStr}</span>{" "}
                          <span>{e.text}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {tab === "replay" && (
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Хронология
                    {cheatEntries.length > 0 && (
                      <Badge variant="destructive" className="ml-2">{cheatEntries.length}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-[540px] overflow-y-auto">
                  {cheatEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Подозрительных событий нет.</p>
                  ) : (
                    <ul className="space-y-1">
                      {cheatEntries.map((e, i) => (
                        <li key={i}>
                          <button
                            onClick={() => seekToCheat(e)}
                            className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted transition-colors"
                            title="Перемотать к этому моменту"
                          >
                            <div className="font-mono text-muted-foreground">{e.timeStr}</div>
                            <div>{e.text}</div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Replay() {
  return (
    <TeacherLoginGate>
      <ReplayInner />
    </TeacherLoginGate>
  );
}
