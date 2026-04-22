import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom";
import rrwebPlayer from "rrweb-player";
import "rrweb-player/dist/style.css";
import TeacherLoginGate from "@/components/TeacherLoginGate";
import { useTeacherAuth } from "@/hooks/useTeacherAuth";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, X, Play, Minimize2, Check, X as XIcon } from "lucide-react";
import { getQuizQuestionsForTestType } from "@/lib/quizRegistry";

interface CheatEntry {
  raw: string;
  timeStr: string;
  text: string;
}

interface PerQuestion {
  answer: number;
  correct: number;
  timeSpent?: number;
  timedOut?: boolean;
}

interface BreakdownItem {
  position: number;
  response_kind: "quiz" | "written";
  question_text?: string;
  block_title?: string | null;
  options?: string[];
  user_answer?: number | string | null;
  correct?: number | string | null;
  is_correct?: boolean;
  expected_answer?: string | null;
  points?: number;
}

interface AnswersPayload {
  type?: string;
  answers?: string[];
  quizResults?: {
    answers: number[];
    correct: number;
    total: number;
    perQuestion: PerQuestion[];
  };
  // новый формат grade-quiz-submission
  breakdown?: BreakdownItem[];
  written?: Record<string, string>;
  score?: { correct: number; total: number };
  kind?: string;
}

const CHEAT_TYPE_LABELS: Record<string, string> = {
  copy: "📋 Копирование",
  paste: "📥 Вставка",
  cut: "✂️ Вырезание",
  contextmenu: "🖱 Правый клик",
  blur: "👁 Уход с вкладки",
  visibility_hidden: "🙈 Скрыта вкладка",
  devtools: "🛠 DevTools",
  fullscreen_exit: "🔳 Выход из fullscreen",
  keyboard_shortcut: "⌨️ Запрещённое сочетание",
};

function formatCheatType(t: string): string {
  return CHEAT_TYPE_LABELS[t] ?? `⚠ ${t}`;
}

function parseCheatLog(log: unknown): CheatEntry[] {
  if (!Array.isArray(log)) return [];
  return log.map((line) => {
    // объектный формат (DB-тесты): {type, ts, detail}
    if (line && typeof line === "object" && !Array.isArray(line)) {
      const obj = line as Record<string, unknown>;
      const type = String(obj.type ?? obj.event ?? "unknown");
      const ts = obj.ts ?? obj.timestamp ?? obj.time;
      let timeStr = "";
      if (ts !== undefined && ts !== null) {
        const d = new Date(typeof ts === "number" ? ts : String(ts));
        if (!isNaN(d.getTime())) {
          timeStr = d.toLocaleTimeString("ru-RU", { hour12: false });
        }
      }
      const detail = obj.detail ?? obj.details;
      const detailStr = detail
        ? typeof detail === "object"
          ? JSON.stringify(detail)
          : String(detail)
        : "";
      const label = formatCheatType(type);
      const text = detailStr ? `${label} — ${detailStr}` : label;
      return { raw: JSON.stringify(obj), timeStr, text };
    }
    // строковый формат (хардкод-тесты)
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
  const initialTab = (searchParams.get("tab") as "replay" | "log" | "answers") || "answers";
  const { token } = useTeacherAuth();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"replay" | "log" | "answers">(
    initialTab === "log" || initialTab === "replay" || initialTab === "answers" ? initialTab : "answers"
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    student_name: string;
    grade: number;
    subject: string;
    test_type?: string | null;
    cheat_log: unknown;
    time_spent: number | null;
    created_at: string;
    answers: unknown;
  } | null>(null);
  const [chunkUrls, setChunkUrls] = useState<string[]>([]);
  const [events, setEvents] = useState<unknown[]>([]);
  const [recordStartTs, setRecordStartTs] = useState<number | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerInstanceRef = useRef<rrwebPlayer | null>(null);

  // Загрузка метаданных + ссылок на чанки
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/replay-signed-url`;
        const headers: Record<string, string> = {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        };
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        } else if (token) {
          headers["Authorization"] = `Bearer ${token}`;
          headers["x-teacher-token"] = token;
        }
        const resp = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({ resultId: id }),
        });
        if (resp.status === 401) throw new Error("Сессия истекла. Войдите заново.");
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
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
  }, [id, token, session?.access_token]);

  // Загрузить и склеить чанки записи (только если они есть)
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

  // Уничтожить плеер
  const destroyPlayer = () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (playerInstanceRef.current as any)?.$destroy?.();
    } catch { /* ignore */ }
    playerInstanceRef.current = null;
    if (playerHostRef.current) playerHostRef.current.innerHTML = "";
  };

  // Инициализировать плеер при открытии
  useEffect(() => {
    if (!playerOpen) return;
    if (!playerHostRef.current || events.length < 2) return;
    if (playerInstanceRef.current) return;
    try {
      playerInstanceRef.current = new rrwebPlayer({
        target: playerHostRef.current,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        props: { events: events as any, width: 880, height: 500, autoPlay: true },
      });
    } catch (e) {
      console.error("Player init failed:", e);
      setError("Ошибка инициализации плеера");
    }
    return () => {
      destroyPlayer();
    };
  }, [playerOpen, events]);

  // При смене таба — сворачиваем плеер, чтобы не висел в DOM
  useEffect(() => {
    if (tab !== "replay" && playerOpen) {
      setPlayerOpen(false);
    }
  }, [tab, playerOpen]);

  // Закрытие просмотра — сначала уничтожаем плеер, потом навигация
  const handleClose = () => {
    destroyPlayer();
    navigate("/admin");
  };

  const cheatEntries = parseCheatLog(result?.cheat_log);

  const seekToCheat = (entry: CheatEntry) => {
    setTab("replay");
    if (!playerOpen) setPlayerOpen(true);
    if (!entry.timeStr || !recordStartTs) return;
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
    }, 200);
  };

  // ====== РАЗБОР ОТВЕТОВ ======
  const answersPayload: AnswersPayload | null =
    result?.answers && typeof result.answers === "object" && !Array.isArray(result.answers)
      ? (result.answers as AnswersPayload)
      : null;

  const legacyAnswersArray: string[] | null = Array.isArray(result?.answers)
    ? (result!.answers as string[])
    : null;

  const openTextAnswers: string[] = answersPayload?.answers ?? legacyAnswersArray ?? [];
  const quizResults = answersPayload?.quizResults ?? null;
  const breakdown: BreakdownItem[] = Array.isArray(answersPayload?.breakdown)
    ? answersPayload!.breakdown!
    : [];
  const breakdownQuiz = breakdown.filter((b) => b.response_kind === "quiz");
  const breakdownWritten = breakdown.filter((b) => b.response_kind === "written");
  const score = answersPayload?.score
    ?? (breakdownQuiz.length > 0
      ? { correct: breakdownQuiz.filter((b) => b.is_correct).length, total: breakdownQuiz.length }
      : null);

  const quizQuestions = getQuizQuestionsForTestType(
    answersPayload?.type ?? result?.test_type ?? null
  );

  const labels = ["А", "Б", "В", "Г"];

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header — всегда поверх плеера */}
      <div className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="max-w-6xl mx-auto p-4 flex items-center justify-between flex-wrap gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin"><ArrowLeft className="h-4 w-4" /> К списку</Link>
          </Button>
          <div className="flex items-center gap-3 flex-wrap">
            {result && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{result.student_name}</span>
                {" · "}{result.grade} класс · {result.subject}
                {(quizResults || score) && (
                  <>
                    {" · "}
                    <span className="font-medium text-foreground">
                      {quizResults ? `${quizResults.correct} / ${quizResults.total}` : `${score!.correct} / ${score!.total}`}
                    </span>
                    {" "}({Math.round(((quizResults?.correct ?? score!.correct) / (quizResults?.total ?? score!.total)) * 100)}%)
                  </>
                )}
                {" · "}{new Date(result.created_at).toLocaleString("ru-RU")}
              </div>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClose}
              aria-label="Закрыть просмотр"
              title="Закрыть"
            >
              <X className="h-4 w-4" /> Закрыть
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button variant={tab === "answers" ? "default" : "outline"} size="sm" onClick={() => setTab("answers")}>
            Ответы
          </Button>
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
            {tab === "answers" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Ответы ученика
                    {(quizResults || score) && (
                      <Badge variant="secondary" className="ml-2">
                        Квиз: {quizResults?.correct ?? score!.correct}/{quizResults?.total ?? score!.total}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* НОВЫЙ ФОРМАТ — breakdown из grade-quiz-submission */}
                  {breakdownQuiz.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm uppercase text-muted-foreground">Тестовая часть</h3>
                      <ol className="space-y-3">
                        {breakdownQuiz.map((q, i) => {
                          const ua = q.user_answer;
                          const ca = q.correct;
                          const opts = Array.isArray(q.options) ? q.options : [];
                          const renderChoice = (val: number | string | null | undefined) => {
                            if (val === null || val === undefined || val === "" || val === -1) return null;
                            const idx = typeof val === "number" ? val : Number(val);
                            if (Number.isFinite(idx) && idx >= 0 && idx < opts.length) {
                              return `${labels[idx] ?? idx + 1}) ${opts[idx]}`;
                            }
                            return String(val);
                          };
                          const uaText = renderChoice(ua);
                          const caText = renderChoice(ca);
                          return (
                            <li key={i} className="border border-border rounded-md p-3 space-y-1.5">
                              <div className="flex items-start gap-2">
                                <span className="font-mono text-xs text-muted-foreground mt-1">{q.position}.</span>
                                <div className="flex-1">
                                  <div className="text-sm font-medium">
                                    {q.question_text ?? <span className="text-muted-foreground italic">[вопрос]</span>}
                                  </div>
                                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                                    <div>
                                      <span className="text-muted-foreground">Ответ ученика: </span>
                                      {uaText ? (
                                        <span className="font-medium">{uaText}</span>
                                      ) : (
                                        <span className="italic text-muted-foreground">пропущен</span>
                                      )}
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Правильный: </span>
                                      <span className="font-medium">{caText ?? "—"}</span>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  {q.is_correct ? (
                                    <Badge className="bg-primary text-primary-foreground hover:bg-primary">
                                      <Check className="h-3 w-3" />
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive">
                                      <XIcon className="h-3 w-3" />
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  )}

                  {breakdownWritten.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm uppercase text-muted-foreground">Развёрнутые ответы</h3>
                      <ol className="space-y-3">
                        {breakdownWritten.map((w, i) => (
                          <li key={i} className="border border-border rounded-md p-3">
                            <div className="text-xs text-muted-foreground mb-1">
                              Задание {w.position}{w.block_title ? ` — ${w.block_title}` : ""}
                            </div>
                            {w.question_text && (
                              <div className="text-sm font-medium mb-2 whitespace-pre-wrap">{w.question_text}</div>
                            )}
                            {String(w.user_answer ?? "").trim() ? (
                              <div className="text-sm whitespace-pre-wrap">{String(w.user_answer)}</div>
                            ) : (
                              <div className="text-sm italic text-muted-foreground">— пусто —</div>
                            )}
                            {w.expected_answer && (
                              <details className="mt-2 text-xs">
                                <summary className="cursor-pointer text-muted-foreground">Эталон</summary>
                                <div className="mt-1 whitespace-pre-wrap text-muted-foreground">{w.expected_answer}</div>
                              </details>
                            )}
                          </li>
                        ))}
                      </ol>
                      <p className="text-xs text-muted-foreground italic">
                        Развёрнутые ответы оцениваются учителем вручную.
                      </p>
                    </div>
                  )}

                  {/* LEGACY — старый quizResults для хардкод-тестов */}
                  {breakdownQuiz.length === 0 && quizResults && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm uppercase text-muted-foreground">Тестовая часть</h3>
                      <ol className="space-y-3">
                        {quizResults.perQuestion.map((pq, i) => {
                          const q = quizQuestions?.[i];
                          const isCorrect = pq.answer === pq.correct;
                          const isSkipped = pq.answer === -1;
                          return (
                            <li key={i} className="border border-border rounded-md p-3 space-y-1.5">
                              <div className="flex items-start gap-2">
                                <span className="font-mono text-xs text-muted-foreground mt-1">{i + 1}.</span>
                                <div className="flex-1">
                                  <div className="text-sm font-medium">
                                    {q?.q ?? <span className="text-muted-foreground italic">[вопрос недоступен]</span>}
                                  </div>
                                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                                    <div>
                                      <span className="text-muted-foreground">Ответ ученика: </span>
                                      {isSkipped ? (
                                        <span className="italic text-muted-foreground">пропущен</span>
                                      ) : (
                                        <span className="font-medium">
                                          {labels[pq.answer]}){q?.options?.[pq.answer] ? ` ${q.options[pq.answer]}` : ""}
                                        </span>
                                      )}
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Правильный: </span>
                                      <span className="font-medium">
                                        {labels[pq.correct]}){q?.options?.[pq.correct] ? ` ${q.options[pq.correct]}` : ""}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  {isCorrect ? (
                                    <Badge className="bg-primary text-primary-foreground hover:bg-primary">
                                      <Check className="h-3 w-3" />
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive">
                                      <XIcon className="h-3 w-3" />
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  )}

                  {/* Открытые ответы */}
                  {openTextAnswers.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm uppercase text-muted-foreground">
                        Открытые ответы ({openTextAnswers.filter((a) => a?.trim()).length} из {openTextAnswers.length} заполнено)
                      </h3>
                      <ol className="space-y-3">
                        {openTextAnswers.map((a, i) => (
                          <li key={i} className="border border-border rounded-md p-3">
                            <div className="text-xs text-muted-foreground mb-1">Задание {i + 1}</div>
                            {a?.trim() ? (
                              <div className="text-sm whitespace-pre-wrap">{a}</div>
                            ) : (
                              <div className="text-sm italic text-muted-foreground">— пусто —</div>
                            )}
                          </li>
                        ))}
                      </ol>
                      <p className="text-xs text-muted-foreground italic">
                        Открытые ответы оцениваются учителем вручную.
                      </p>
                    </div>
                  )}

                  {!quizResults && openTextAnswers.length === 0 && (
                    <p className="text-sm text-muted-foreground">Ответы не найдены.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {tab === "replay" && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">Воспроизведение</CardTitle>
                  {playerOpen && events.length >= 2 && (
                    <Button variant="outline" size="sm" onClick={() => setPlayerOpen(false)}>
                      <Minimize2 className="h-4 w-4" /> Свернуть
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {chunkUrls.length === 0 && !loading && (
                    <p className="text-sm text-muted-foreground">
                      Запись для этого результата отсутствует (старая работа без записи экрана).
                    </p>
                  )}
                  {chunkUrls.length > 0 && events.length === 0 && !error && (
                    <p className="text-sm text-muted-foreground">Загрузка записи…</p>
                  )}
                  {events.length > 0 && events.length < 2 && (
                    <p className="text-sm text-muted-foreground">Запись слишком короткая.</p>
                  )}
                  {events.length >= 2 && !playerOpen && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <Button size="lg" onClick={() => setPlayerOpen(true)}>
                        <Play className="h-5 w-5" /> Открыть запись
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        {events.length.toLocaleString("ru-RU")} событий
                      </p>
                    </div>
                  )}
                  <div ref={playerHostRef} className={playerOpen ? "" : "hidden"} />
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
