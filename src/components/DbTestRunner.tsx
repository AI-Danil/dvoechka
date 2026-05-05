// Полноэкранный раннер для тестов из БД (квиз, письменная, гибрид).
// + Защита от перепрохождения: server-side attempt с автосейвом и восстановлением.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { loadTestQuestions, type DbTestSummary, type DbTestQuestion } from "@/lib/dbTests";
import Quiz, { QuizIntro, type QuizResults } from "@/components/Quiz";
import FileAttach from "@/components/FileAttach";
import { ArrowLeft } from "lucide-react";
import { useAntiCheatNotify } from "@/hooks/useAntiCheatNotify";
import { useDevToolsBlock } from "@/hooks/useDevToolsBlock";
import { useRrwebRecorder } from "@/hooks/useRrwebRecorder";
import RecordingBadge from "@/components/RecordingBadge";
import { safeRandomUUID } from "@/lib/safeRandomUUID";
import { requiresStrictRules } from "@/lib/strictRules";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle } from "lucide-react";

interface Props {
  test: DbTestSummary;
  onBack: () => void;
  onSubmitted: () => void;
}

const RUSSIAN_NAME_REGEX = /^[А-ЯЁа-яё]+\s+[А-ЯЁа-яё]+(?:\s+(\d+))?$/;
const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

interface CheatEvent {
  type: string;
  timestamp: number;
  details?: string;
}

type Phase = "intake" | "rules" | "intro" | "quiz" | "written" | "submitting" | "done";

export default function DbTestRunner({ test, onBack, onSubmitted }: Props) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<DbTestQuestion[] | null>(null);
  const [studentName, setStudentName] = useState("");
  const [phase, setPhase] = useState<Phase>("intake");
  const [writtenAnswers, setWrittenAnswers] = useState<Record<number, string>>({});
  const [writtenFiles, setWrittenFiles] = useState<Record<number, File | null>>({});
  const [quizPrefilled, setQuizPrefilled] = useState<Record<number, number> | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const cheatLogRef = useRef<CheatEvent[]>([]);
  const [resultId] = useState<string>(() => safeRandomUUID());
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const attemptIdRef = useRef<string | null>(null);
  const acceptRulesRef = useRef<Phase>("written");
  const [rulesAccepted, setRulesAccepted] = useState(false);

  const isActive = phase === "quiz" || phase === "written" || phase === "intro";

  // Разбиваем вопросы по типу для гибрида
  const quizQuestions = useMemo(
    () => (questions ?? []).filter((q) => q.response_kind === "quiz"),
    [questions],
  );
  const writtenQuestions = useMemo(
    () => (questions ?? []).filter((q) => q.response_kind === "written"),
    [questions],
  );

  const notify = useAntiCheatNotify({
    studentName: studentName || "(аноним)",
    grade: "?",
    subject: test.title,
  });

  useDevToolsBlock({ enabled: isActive, notify });

  const { finalize } = useRrwebRecorder({
    resultId: isActive ? resultId : null,
    enabled: isActive,
  });

  // Вопросы загружаем только после создания попытки (через защищённый edge function).
  useEffect(() => {
    if (!attemptId) return;
    loadTestQuestions(test.id, attemptId).then(setQuestions);
  }, [test.id, attemptId]);

  // === Сбор cheat events ===
  useEffect(() => {
    if (!isActive) return;

    const log = (type: string, details?: string) => {
      cheatLogRef.current.push({ type, timestamp: Date.now(), details });
    };
    const remoteLog = (type: string, details?: string) => {
      if (!attemptIdRef.current) return;
      void supabase.functions.invoke("log-cheat-event", {
        body: { attempt_id: attemptIdRef.current, event: { type, details, timestamp: Date.now() } },
      });
    };

    const onCopy = () => { log("copy"); notify("Попытка копирования (Ctrl+C)"); remoteLog("copy"); };
    const onPasteOutside = (e: ClipboardEvent) => {
      // Глобальный fallback: вставка вне полей ответа (например, в адресную строку или в служебный input)
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-answer-field="1"]')) return; // обрабатывается локально с деталями
      log("paste_outside_field");
      notify("Попытка вставки вне поля ответа");
      remoteLog("paste_outside_field");
    };
    const onCut = () => { log("cut"); notify("Попытка вырезания (Ctrl+X)"); remoteLog("cut"); };
    const onContext = () => { log("contextmenu"); remoteLog("contextmenu"); };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        log("tab_hidden");
        notify("Переключение вкладки/окна");
        remoteLog("tab_hidden");
      } else {
        log("tab_visible");
        remoteLog("tab_visible");
      }
    };
    const onBlur = () => { log("window_blur"); notify("Уход с окна теста"); remoteLog("window_blur"); };

    // sendBeacon при закрытии вкладки — чтобы факт ухода точно дошёл
    const onBeforeUnload = () => {
      const aid = attemptIdRef.current;
      if (!aid) return;
      try {
        const payload = JSON.stringify({
          attempt_id: aid,
          event: { type: "unload", timestamp: Date.now() },
        });
        const url = `${SUPABASE_URL}/functions/v1/log-cheat-event`;
        const blob = new Blob([payload], { type: "application/json" });
        // sendBeacon без auth header невозможен — кладём ключ в URL? нет.
        // Лучший доступный способ: fetch с keepalive.
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
          body: payload,
          keepalive: true,
        }).catch(() => {
          navigator.sendBeacon(url, blob);
        });
      } catch {
        /* noop */
      }
    };

    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPasteOutside);
    document.addEventListener("cut", onCut);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPasteOutside);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [isActive, notify]);

  // === Автосейв с дебаунсом ===
  const saveTimerRef = useRef<number | null>(null);
  const scheduleSave = useCallback(
    (draft: { quiz?: Record<number, number>; written?: Record<number, string> }, currentPhase: string, currentQuestion?: number) => {
      if (!attemptIdRef.current) return;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        void supabase.functions.invoke("save-attempt-progress", {
          body: {
            attempt_id: attemptIdRef.current,
            draft_answers: draft,
            current_phase: currentPhase,
            current_question: currentQuestion ?? 0,
          },
        });
      }, 1500);
    },
    [],
  );

  // При изменении письменных ответов — автосейв
  useEffect(() => {
    if (phase !== "written") return;
    scheduleSave({ written: writtenAnswers, quiz: quizPrefilled ?? undefined }, "written");
  }, [writtenAnswers, phase, scheduleSave, quizPrefilled]);

  // Логирование вставки в конкретное поле ответа (с текстом и номером задачи)
  const handleAnswerPaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const target = e.currentTarget;
      const pos = target.dataset.questionPos ?? "?";
      const title = target.dataset.questionTitle ?? "";
      const text = e.clipboardData.getData("text/plain") ?? "";
      const snippet = text.length > 500 ? text.slice(0, 500) + "…" : text;
      const details = `Задача ${Number(pos) + 1}${title ? ` (${title})` : ""}: "${snippet}"`;
      cheatLogRef.current.push({ type: "paste_into_answer", timestamp: Date.now(), details });
      notify(`❗ Вставка в поле ответа. ${details}`);
      if (attemptIdRef.current) {
        void supabase.functions.invoke("log-cheat-event", {
          body: {
            attempt_id: attemptIdRef.current,
            event: { type: "paste_into_answer", details, timestamp: Date.now() },
          },
        });
      }
      // НЕ блокируем вставку — текст должен попасть в поле и сохраниться.
    },
    [notify],
  );

  const acceptRules = async () => {
    cheatLogRef.current.push({ type: "rules_accepted", timestamp: Date.now() });
    if (attemptIdRef.current) {
      void supabase.functions.invoke("log-cheat-event", {
        body: { attempt_id: attemptIdRef.current, event: { type: "rules_accepted", timestamp: Date.now() } },
      });
    }
    setPhase(acceptRulesRef.current);
  };

  const startTest = async () => {
    const m = studentName.trim().match(RUSSIAN_NAME_REGEX);
    if (!m) {
      toast({ title: "Ошибка", description: "Введите имя и фамилию русскими буквами (Иван Иванов)", variant: "destructive" });
      return;
    }

    // Серверная проверка + создание/восстановление попытки
    try {
      const { data, error } = await supabase.functions.invoke("start-attempt", {
        body: { test_id: test.id, student_name: studentName.trim() },
      });
      const r = data as any;
      if (error || !r?.ok) {
        const msg = r?.error ?? error?.message ?? "Не удалось начать тест";
        toast({ title: "Тест недоступен", description: msg, variant: "destructive" });
        return;
      }
      setAttemptId(r.attempt_id);
      attemptIdRef.current = r.attempt_id;

      if (r.resumed) {
        const draft = r.draft_answers ?? {};
        if (draft.written) setWrittenAnswers(draft.written);
        if (draft.quiz) setQuizPrefilled(draft.quiz);
        toast({
          title: "Прогресс восстановлен",
          description: "Вы покидали тест — продолжаем с того места.",
        });
      }

      setStartedAt(Date.now());
      toast({
        title: "Внимание: запись экрана включена",
        description: "F12, Ctrl+U, Ctrl+S, ПКМ и копирование заблокированы. Любые попытки фиксируются и отправляются учителю.",
      });

      // Определяем стартовую фазу
      const naturalPhase: Phase =
        r.resumed && r.current_phase === "written"
          ? "written"
          : test.kind === "written"
          ? "written"
          : "intro";
      // Для контрольных — сначала экран правил (но не показываем повторно при resumed-возврате)
      const initialPhase: Phase =
        requiresStrictRules(test) && !r.resumed ? "rules" : naturalPhase;
      setPhase(initialPhase);
      (acceptRulesRef as any).current = naturalPhase;
    } catch (e: any) {
      toast({ title: "Ошибка", description: e?.message ?? "сеть", variant: "destructive" });
    }
  };

  const submit = async (
    rawAnswers: { quiz?: Record<number, number>; written?: Record<number, string> } | Record<number, number | string>,
    quizResults?: QuizResults,
  ) => {
    setPhase("submitting");
    try {
      const time_spent = Math.round((Date.now() - (startedAt ?? Date.now())) / 1000);

      try { await finalize(); } catch (e) { console.error("finalize failed:", e); }

      const replay_url = `${resultId}/`;

      const per_question = quizResults?.perQuestion?.map((p, i) => ({
        position: i,
        time_spent: p.timeSpent,
        timed_out: p.timedOut,
      }));

      // Загружаем прикреплённые файлы (письменная часть)
      const attachments: Record<number, { url: string; name: string; size: number; type: string }> = {};
      const sanitize = (s: string) =>
        s.normalize("NFKD").replace(/[^\x20-\x7E]/g, "_").replace(/\s+/g, "_");
      for (const [posStr, file] of Object.entries(writtenFiles)) {
        if (!file) continue;
        const pos = Number(posStr);
        const safeName = sanitize(file.name);
        const path = `${resultId}/q${pos}_${Date.now()}_${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("test-attachments")
          .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
        if (upErr) {
          console.error("upload failed:", upErr);
          continue;
        }
        const { data: pub } = supabase.storage.from("test-attachments").getPublicUrl(path);
        attachments[pos] = { url: pub.publicUrl, name: file.name, size: file.size, type: file.type };
      }

      const { data, error } = await supabase.functions.invoke("grade-quiz-submission", {
        body: {
          test_id: test.id,
          student_name: studentName.trim(),
          answers: rawAnswers,
          time_spent,
          attempt: 1,
          cheat_log: cheatLogRef.current,
          result_id: resultId,
          replay_url,
          per_question,
          attempt_id: attemptIdRef.current,
          attachments,
        },
      });
      if (error) throw new Error((data as any)?.error ?? error.message);
      if (!(data as any)?.ok) throw new Error((data as any)?.error ?? "Ошибка отправки");

      if (test.kind === "quiz") {
        toast({ title: "Готово!", description: `Балл: ${(data as any).grade}/${(data as any).total}` });
      } else if (test.kind === "hybrid") {
        toast({ title: "Сдано", description: `Квиз: ${(data as any).grade}. Письм. часть — на проверке у учителя.` });
      } else {
        toast({ title: "Сдано", description: "Работа отправлена учителю на проверку" });
      }
      setPhase("done");
      onSubmitted();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Ошибка отправки", description: e?.message ?? "Попробуйте ещё раз", variant: "destructive" });
      // Возвращаемся к адекватной фазе
      setPhase(test.kind === "written" || test.kind === "hybrid" ? "written" : "intro");
    }
  };

  // === Обработчик окончания квиз-фазы ===
  const handleQuizFinish = (results: QuizResults) => {
    const ans: Record<number, number> = {};
    results.answers.forEach((a, i) => {
      // i — индекс в массиве quizQuestions; нам нужен position исходного вопроса
      const original = quizQuestions[i];
      if (original) ans[original.position] = a;
    });

    if (test.kind === "hybrid" && writtenQuestions.length > 0) {
      // Сохраняем квиз и переходим к письменной части
      setQuizPrefilled(ans);
      scheduleSave({ quiz: ans, written: writtenAnswers }, "written");
      // per_question прокинется только при финальной отправке, поэтому сохраним отдельно
      (handleQuizFinish as any).__lastResults = results;
      setPhase("written");
      return;
    }

    submit(ans, results);
  };

  const handleWrittenSubmit = () => {
    if (test.kind === "hybrid") {
      const lastResults = (handleQuizFinish as any).__lastResults as QuizResults | undefined;
      submit({ quiz: quizPrefilled ?? {}, written: writtenAnswers }, lastResults);
    } else {
      submit(writtenAnswers);
    }
  };

  // ============ RENDER ============
  if (!questions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Загрузка теста…</p>
      </div>
    );
  }

  if (phase === "intake") {
    const blocksHint =
      test.kind === "hybrid"
        ? `Смешанный тест: ${quizQuestions.length} быстрых + ${writtenQuestions.length} развёрнутых`
        : test.kind === "quiz"
        ? `Квиз: ${questions.length} вопросов`
        : `Самостоятельная: ${questions.length} задач`;
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Button variant="ghost" size="sm" onClick={onBack} className="self-start mb-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Назад
            </Button>
            <CardTitle>{test.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{blocksHint}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="name">Имя и фамилия</Label>
            <Input id="name" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Иван Иванов" />
            <Button className="w-full" onClick={startTest}>Начать</Button>
            <p className="text-[11px] text-muted-foreground">
              Ваш прогресс автоматически сохраняется. Закрыть и открыть тест заново — нельзя: попытка считается одной.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "rules") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-xl border-destructive/40">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle>Правила контрольной работы</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">{test.title}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-4 space-y-2 text-sm leading-relaxed">
              <p>
                <b>Копировать из других источников строго запрещено.</b>
              </p>
              <p>
                <b>Вставлять текст в поля для ответов из других источников строго запрещено.</b>
              </p>
              <p>
                Можно прикреплять свои файлы (фото тетради), если выполняете задачи в тетрадях.
              </p>
              <p className="text-xs text-muted-foreground pt-2 border-t">
                Любая попытка вставки фиксируется — учитель видит сам вставленный текст и номер задания
                в реальном времени.
              </p>
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={rulesAccepted}
                onCheckedChange={(v) => setRulesAccepted(v === true)}
                className="mt-0.5"
              />
              <span className="text-sm">Я прочитал(а) и понял(а) правила, обязуюсь их соблюдать.</span>
            </label>
            <Button className="w-full" disabled={!rulesAccepted} onClick={acceptRules}>
              Принять и начать
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "intro" && (test.kind === "quiz" || test.kind === "hybrid")) {
    return (
      <>
        <RecordingBadge variant="full" />
        <QuizIntro
          questionsCount={quizQuestions.length}
          secondsPerQuestion={test.time_per_question_sec}
          onStart={() => setPhase("quiz")}
        />
      </>
    );
  }

  if (phase === "quiz") {
    const qs = quizQuestions.map((q) => ({
      q: q.question_text,
      options: [
        q.options[0] ?? "",
        q.options[1] ?? "",
        q.options[2] ?? "",
        q.options[3] ?? "",
      ] as [string, string, string, string],
      correct: -1,
      seconds: q.seconds_override ?? test.time_per_question_sec,
    }));
    return (
      <>
        <RecordingBadge variant="full" />
        <Quiz
          questions={qs}
          secondsPerQuestion={test.time_per_question_sec}
          onFinish={handleQuizFinish}
        />
      </>
    );
  }

  if (phase === "written" || phase === "submitting") {
    const list = test.kind === "hybrid" ? writtenQuestions : questions;
    // Группировка по block_title для гибрида
    const groups = new Map<string, DbTestQuestion[]>();
    for (const q of list) {
      const key = q.block_title || "";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(q);
    }
    return (
      <div className="min-h-screen p-4 max-w-3xl mx-auto space-y-4">
        <RecordingBadge variant="full" />
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Назад
          </Button>
          <h1 className="text-xl font-semibold">{test.title}</h1>
          <div />
        </div>
        {test.kind === "hybrid" && (
          <p className="text-sm text-muted-foreground border-l-2 border-primary pl-3">
            Квиз-часть пройдена. Теперь развёрнутые задачи. Прогресс сохраняется автоматически.
          </p>
        )}
        {Array.from(groups.entries()).map(([blockTitle, items]) => (
          <div key={blockTitle || "main"} className="space-y-2">
            {blockTitle && (
              <h2 className="text-sm font-semibold text-primary border-b pb-1">{blockTitle}</h2>
            )}
            {items.map((q) => (
              <Card key={q.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    Задача {q.position + 1} ({q.points} {q.points === 1 ? "балл" : "балла"})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="whitespace-pre-wrap text-sm">{q.question_text}</p>
                  <Textarea
                    rows={4}
                    value={writtenAnswers[q.position] ?? ""}
                    onChange={(e) =>
                      setWrittenAnswers((p) => ({ ...p, [q.position]: e.target.value }))
                    }
                    onPaste={handleAnswerPaste}
                    data-answer-field="1"
                    data-question-pos={q.position}
                    data-question-title={q.block_title ?? ""}
                    placeholder="Ваш ответ…"
                  />
                  <FileAttach
                    file={writtenFiles[q.position] ?? null}
                    onFileChange={(f) =>
                      setWrittenFiles((p) => ({ ...p, [q.position]: f }))
                    }
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
        <Button
          className="w-full"
          disabled={phase === "submitting"}
          onClick={handleWrittenSubmit}
        >
          {phase === "submitting" ? "Отправка…" : "Сдать работу"}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="max-w-md">
        <CardContent className="pt-6 text-center space-y-3">
          <p className="text-2xl">✅</p>
          <p>Работа отправлена</p>
          <Button onClick={onBack}>На главную</Button>
        </CardContent>
      </Card>
    </div>
  );
}
