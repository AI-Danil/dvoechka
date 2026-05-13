/**
 * Универсальный квиз: один вопрос на экране, поквопросный таймер, авто-переход
 * по истечению времени или клику. Возврата к предыдущим вопросам нет.
 *
 * Поддерживает два типа вопросов:
 *   - kind: "mc"  (по умолчанию) — 4 варианта ответа, ответ = индекс 0..3
 *   - kind: "text" — свободный текстовый ввод, ответ = строка
 *
 * Автосохранение в localStorage:
 *   - на каждый ответ;
 *   - каждый тик таймера (1с);
 *   - на visibilitychange / pagehide / beforeunload (flush).
 *
 * При монтировании синхронно восстанавливает idx, ответы и таймер из
 * localStorage по storageKey. Если все вопросы пройдены — сразу finish.
 *
 * Серверный автосейв сюда не встроен — это делает родитель (Index.tsx),
 * передавая onProgress для дополнительной точки сохранения.
 */
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

export interface QuizQuestionMc {
  kind?: "mc";
  q: string;
  options: [string, string, string, string];
  correct: number; // 0..3
  seconds?: number;
  block?: number;
  /** Если true — добавляется кнопка «Не знаю / пропустить». Запишется answer=-2. */
  allowSkip?: boolean;
}

export interface QuizQuestionText {
  kind: "text";
  q: string;
  expected: string;
  /** Подсказка для AI-проверки (засчитывать также: …). */
  gradingHint?: string;
  seconds?: number;
  block?: number;
}

export type QuizQuestion = QuizQuestionMc | QuizQuestionText;

export type QuizAnswer = number | string;

export interface QuizPerQuestionResult {
  /** Для MC — индекс варианта (0..3) или -1 если не отвечено. Для text — строка. */
  answer: QuizAnswer;
  /** Для MC — индекс правильного варианта. Для text — undefined (проверяет AI на сервере). */
  correct?: number;
  /** Тип вопроса — нужен админке и серверу для AI-grading. */
  kind: "mc" | "text";
  /** Эталон для текстового вопроса (для отчёта/AI). */
  expected?: string;
  /** Подсказка для AI-проверки. */
  gradingHint?: string;
  /** Текст вопроса — нужен админке и AI. */
  q?: string;
  /** Номер блока (1..4) для группировки в отчёте. */
  block?: number;
  timeSpent: number; // seconds
  timedOut: boolean;
}

export interface QuizResults {
  answers: QuizAnswer[];
  correct: number;
  total: number;
  perQuestion: QuizPerQuestionResult[];
}

interface QuizProps {
  questions: QuizQuestion[];
  secondsPerQuestion: number;
  onFinish: (results: QuizResults) => void;
  /** Ключ для автосохранения прогресса в localStorage. Если не задан — персиста нет. */
  storageKey?: string;
  /** Колбэк при восстановлении прогресса (idx — с какого вопроса продолжаем, 0-based). */
  onResumed?: (fromIdx: number) => void;
  /** Колбэк после каждого ответа — родитель сразу пушит снапшот на сервер. */
  onProgress?: (snapshot: {
    idx: number;
    answers: QuizAnswer[];
    perQuestion: QuizPerQuestionResult[];
    total: number;
  }) => void;
}

interface PersistedQuizState {
  v: 2;
  total: number;
  idx: number;
  perQuestion: QuizPerQuestionResult[];
  secondsLeft: number;
  /** Черновик текущего текстового ответа (если ученик начал печатать, но не нажал «Ответить»). */
  draftText?: string;
  savedAt: number;
}

const isText = (q: QuizQuestion): q is QuizQuestionText => q.kind === "text";

const Quiz = ({ questions, secondsPerQuestion, onFinish, storageKey, onResumed, onProgress }: QuizProps) => {
  const getSecondsFor = (i: number) => questions[i]?.seconds ?? secondsPerQuestion;

  // Восстановление: читаем синхронно при первом рендере, чтобы не было «мигания».
  const restoredRef = useRef<PersistedQuizState | null>(null);
  if (restoredRef.current === null && storageKey) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedQuizState;
        if (
          parsed &&
          (parsed.v === 2 || (parsed as unknown as { v: number }).v === 1) &&
          parsed.total === questions.length &&
          Array.isArray(parsed.perQuestion) &&
          typeof parsed.idx === "number"
        ) {
          restoredRef.current = parsed;
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    } catch {
      // ignore
    }
  }

  const initialIdx = restoredRef.current?.idx ?? 0;
  const initialSeconds = (() => {
    const r = restoredRef.current;
    if (!r) return getSecondsFor(0);
    const elapsed = Math.floor((Date.now() - r.savedAt) / 1000);
    return Math.max(1, r.secondsLeft - Math.max(0, elapsed));
  })();
  const initialDraftText = restoredRef.current?.draftText ?? "";

  const [idx, setIdx] = useState(initialIdx);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [draftText, setDraftText] = useState(initialDraftText);
  const resultsRef = useRef<QuizPerQuestionResult[]>(restoredRef.current?.perQuestion ?? []);
  const startedAtRef = useRef<number>(Date.now());
  const finishedRef = useRef(false);
  const idxRef = useRef(idx);
  const secondsLeftRef = useRef(secondsLeft);
  const draftTextRef = useRef(draftText);
  const isFirstQuestionEffect = useRef(true);

  useEffect(() => { idxRef.current = idx; }, [idx]);
  useEffect(() => { secondsLeftRef.current = secondsLeft; }, [secondsLeft]);
  useEffect(() => { draftTextRef.current = draftText; }, [draftText]);

  // Уведомление о восстановлении + ранний финиш, если все вопросы уже отвечены
  useEffect(() => {
    const r = restoredRef.current;
    if (!r) return;
    if (r.idx >= questions.length) {
      if (!finishedRef.current) {
        finishedRef.current = true;
        const per = resultsRef.current;
        const correctCount = countCorrect(per);
        if (storageKey) { try { localStorage.removeItem(storageKey); } catch { /* ignore */ } }
        onFinish({
          answers: per.map((rr) => rr.answer),
          correct: correctCount,
          total: questions.length,
          perQuestion: per,
        });
      }
      return;
    }
    if (r.idx > 0) {
      onResumed?.(r.idx);
    }
    onProgress?.({
      idx: r.idx,
      answers: resultsRef.current.map((x) => x.answer),
      perQuestion: resultsRef.current,
      total: questions.length,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = (overrides?: Partial<PersistedQuizState>) => {
    if (!storageKey) return;
    try {
      const data: PersistedQuizState = {
        v: 2,
        total: questions.length,
        idx: idxRef.current,
        perQuestion: resultsRef.current,
        secondsLeft: secondsLeftRef.current,
        draftText: draftTextRef.current,
        savedAt: Date.now(),
        ...overrides,
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      // quota / private mode — игнор
    }
  };

  // Reset timer when moving to a new question (но не для самого первого, если восстановили)
  useEffect(() => {
    if (isFirstQuestionEffect.current) {
      isFirstQuestionEffect.current = false;
      startedAtRef.current = Date.now() - (getSecondsFor(idx) - secondsLeft) * 1000;
      return;
    }
    setSecondsLeft(getSecondsFor(idx));
    startedAtRef.current = Date.now();
    setDraftText("");
    draftTextRef.current = "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  // Tick + автосейв каждую секунду
  useEffect(() => {
    const t = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Таймаут: для MC — answer = -1; для text — текущий черновик (если есть) или ""
          const cur = questions[idxRef.current];
          if (cur && isText(cur)) {
            recordAndAdvance(draftTextRef.current ?? "", true);
          } else {
            recordAndAdvance(-1, true);
          }
          return getSecondsFor(idx);
        }
        const next = prev - 1;
        secondsLeftRef.current = next;
        persist({ secondsLeft: next });
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  // Flush на закрытие/сворачивание вкладки
  useEffect(() => {
    if (!storageKey) return;
    const flush = () => persist();
    const onVis = () => { if (document.hidden) flush(); };
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const countCorrect = (per: QuizPerQuestionResult[]): number =>
    per.filter((r) => r.kind === "mc" && typeof r.answer === "number" && r.answer === r.correct).length;

  const recordAndAdvance = (answer: QuizAnswer, timedOut: boolean) => {
    const q = questions[idxRef.current];
    if (!q) return;
    const qSeconds = getSecondsFor(idxRef.current);
    const timeSpent = Math.min(
      qSeconds,
      Math.round((Date.now() - startedAtRef.current) / 1000)
    );

    const result: QuizPerQuestionResult = isText(q)
      ? {
          answer: typeof answer === "string" ? answer : "",
          kind: "text",
          expected: q.expected,
          gradingHint: q.gradingHint,
          q: q.q,
          block: q.block,
          timeSpent,
          timedOut,
        }
      : {
          answer: typeof answer === "number" ? answer : -1,
          correct: q.correct,
          kind: "mc",
          q: q.q,
          block: q.block,
          timeSpent,
          timedOut,
        };

    resultsRef.current.push(result);

    // Снапшот для серверного автосейва
    const snapPer = resultsRef.current;
    const snapIdx = idxRef.current + 1;
    onProgress?.({
      idx: snapIdx,
      answers: snapPer.map((r) => r.answer),
      perQuestion: snapPer,
      total: questions.length,
    });

    // Сбрасываем черновик текста
    draftTextRef.current = "";

    if (idxRef.current + 1 >= questions.length) {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const per = resultsRef.current;
      const correctCount = countCorrect(per);
      if (storageKey) {
        try {
          persist({ idx: questions.length, secondsLeft: 0, draftText: "" });
          localStorage.removeItem(storageKey);
        } catch { /* ignore */ }
      }
      onFinish({
        answers: per.map((r) => r.answer),
        correct: correctCount,
        total: questions.length,
        perQuestion: per,
      });
    } else {
      const nextIdx = idxRef.current + 1;
      idxRef.current = nextIdx;
      const nextSeconds = getSecondsFor(nextIdx);
      secondsLeftRef.current = nextSeconds;
      persist({ idx: nextIdx, secondsLeft: nextSeconds, draftText: "" });
      setIdx(nextIdx);
    }
  };

  const onTextChange = (v: string) => {
    setDraftText(v);
    draftTextRef.current = v;
    // Сохраняем черновик, чтобы при перезагрузке страницы текст не потерялся.
    persist({ draftText: v });
  };

  const q = questions[idx];
  if (!q) return null;

  const currentTotal = getSecondsFor(idx);
  const percent = Math.round((secondsLeft / currentTotal) * 100);
  const labels = ["А", "Б", "В", "Г"];
  const text = isText(q);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Вопрос {idx + 1} из {questions.length}
            </span>
            <span
              className={`font-mono font-bold text-lg ${
                secondsLeft <= 5 ? "text-destructive" : "text-foreground"
              }`}
            >
              ⏱ {secondsLeft} сек
            </span>
          </div>
          <Progress value={percent} className="h-2 mt-2" />
          <CardTitle className="text-xl mt-4" style={{ userSelect: "none" }}>
            {q.q}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {text ? (
            <>
              <Textarea
                value={draftText}
                onChange={(e) => onTextChange(e.target.value)}
                placeholder="Введите свой ответ…"
                rows={4}
                className="resize-none"
                autoFocus
              />
              <Button
                onClick={() => recordAndAdvance(draftText.trim(), false)}
                disabled={draftText.trim().length === 0}
                size="lg"
                className="w-full"
              >
                Ответить →
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Ответ проверит нейросеть — она засчитывает синонимы, опечатки и разные формулировки.
              </p>
            </>
          ) : (
            <>
              {(q as QuizQuestionMc).options.map((opt, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="lg"
                  className="w-full justify-start text-left h-auto py-3 whitespace-normal"
                  style={{ userSelect: "none" }}
                  onClick={() => recordAndAdvance(i, false)}
                >
                  <span className="font-bold mr-3">{labels[i]})</span>
                  <span className="flex-1">{opt}</span>
                </Button>
              ))}
              {(q as QuizQuestionMc).allowSkip && (
                <Button
                  variant="ghost"
                  size="lg"
                  className="w-full justify-center text-muted-foreground hover:text-foreground border border-dashed mt-2"
                  style={{ userSelect: "none" }}
                  onClick={() => recordAndAdvance(-2, false)}
                  title="За пропуск баллы не вычитаются"
                >
                  🤷 Не знаю / пропустить (без штрафа)
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Quiz;

interface QuizIntroProps {
  questionsCount: number;
  secondsPerQuestion: number;
  onStart: () => void;
}

export const QuizIntro = ({ questionsCount, secondsPerQuestion, onStart, perQuestionSeconds }: QuizIntroProps & { perQuestionSeconds?: number[] }) => {
  const hasVarying = perQuestionSeconds && perQuestionSeconds.length > 0
    && (Math.min(...perQuestionSeconds) !== Math.max(...perQuestionSeconds));
  const minS = hasVarying ? Math.min(...perQuestionSeconds!) : secondsPerQuestion;
  const maxS = hasVarying ? Math.max(...perQuestionSeconds!) : secondsPerQuestion;
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg text-center">
        <CardHeader>
          <CardTitle className="text-2xl">🎯 Сейчас будет квиз</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {questionsCount} вопросов,{" "}
            {hasVarying
              ? <>от <strong>{minS}</strong> до <strong>{maxS}</strong> секунд на вопрос</>
              : <>по {secondsPerQuestion} секунд на каждый</>}
            . Один правильный вариант ответа.
          </p>
          <p className="text-sm text-muted-foreground">
            ⚠️ Назад вернуться нельзя. Если не успеете ответить — вопрос пропускается.
          </p>
          <p className="text-sm text-muted-foreground">
            После квиза начнётся основная контрольная работа (40 минут).
          </p>
          <Button onClick={onStart} size="lg" className="w-full mt-2">
            Начать квиз
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
