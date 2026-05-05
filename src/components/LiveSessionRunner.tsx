// Live-режим: запускает тест с общим таймером по ends_at.
// Не делает intake/intro — имя уже известно, attempt уже создан в join-session.
// При истечении ends_at автоматически отправляет работу.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { loadTestQuestions, type DbTestQuestion } from "@/lib/dbTests";
import Quiz, { type QuizResults } from "@/components/Quiz";
import FileAttach from "@/components/FileAttach";
import { useAntiCheatNotify } from "@/hooks/useAntiCheatNotify";
import { useDevToolsBlock } from "@/hooks/useDevToolsBlock";
import { useRrwebRecorder } from "@/hooks/useRrwebRecorder";
import RecordingBadge from "@/components/RecordingBadge";
import { safeRandomUUID } from "@/lib/safeRandomUUID";

interface Props {
  testId: string;
  testTitle: string;
  testKind: "quiz" | "written" | "hybrid";
  attemptId: string;
  studentName: string;
  endsAt: string; // ISO
  initialDraft?: { quiz?: Record<number, number>; written?: Record<number, string> };
  onFinished: () => void;
}

interface CheatEvent {
  type: string;
  timestamp: number;
  details?: string;
}

export default function LiveSessionRunner({
  testId,
  testTitle,
  testKind,
  attemptId,
  studentName,
  endsAt,
  initialDraft,
  onFinished,
}: Props) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<DbTestQuestion[] | null>(null);
  const [phase, setPhase] = useState<"quiz" | "written" | "submitting" | "done">(
    testKind === "written" ? "written" : "quiz",
  );
  const [writtenAnswers, setWrittenAnswers] = useState<Record<number, string>>(
    initialDraft?.written ?? {},
  );
  const [writtenFiles, setWrittenFiles] = useState<Record<number, File | null>>({});
  const [quizPrefilled, setQuizPrefilled] = useState<Record<number, number> | null>(
    initialDraft?.quiz ?? null,
  );
  const [now, setNow] = useState(Date.now());
  const cheatLogRef = useRef<CheatEvent[]>([]);
  const [resultId] = useState(() => safeRandomUUID());
  const startedAtRef = useRef<number>(Date.now());
  const submittedRef = useRef(false);

  const isActive = phase === "quiz" || phase === "written";

  // Тики таймера
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remainingSec = Math.max(0, Math.floor((new Date(endsAt).getTime() - now) / 1000));

  const quizQuestions = useMemo(
    () => (questions ?? []).filter((q) => q.response_kind === "quiz"),
    [questions],
  );
  const writtenQuestions = useMemo(
    () => (questions ?? []).filter((q) => q.response_kind === "written"),
    [questions],
  );

  const notify = useAntiCheatNotify({
    studentName,
    grade: "?",
    subject: testTitle,
  });

  useDevToolsBlock({ enabled: isActive, notify });
  const { finalize } = useRrwebRecorder({ resultId: isActive ? resultId : null, enabled: isActive });

  useEffect(() => {
    if (!attemptId) return;
    loadTestQuestions(testId, attemptId).then(setQuestions);
  }, [testId, attemptId]);

  // Античит-события
  useEffect(() => {
    if (!isActive) return;
    const log = (type: string, details?: string) => {
      cheatLogRef.current.push({ type, timestamp: Date.now(), details });
    };
    const remoteLog = (type: string, details?: string) => {
      void supabase.functions.invoke("log-cheat-event", {
        body: { attempt_id: attemptId, event: { type, details, timestamp: Date.now() } },
      });
    };
    const onCopy = () => { log("copy"); notify("Попытка копирования"); remoteLog("copy"); };
    const onPaste = () => { log("paste"); notify("Попытка вставки"); remoteLog("paste"); };
    const onContext = () => { log("contextmenu"); remoteLog("contextmenu"); };
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        log("tab_hidden"); notify("Переключение вкладки"); remoteLog("tab_hidden");
      }
    };
    const onBlur = () => { log("window_blur"); notify("Уход с окна"); remoteLog("window_blur"); };
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
    };
  }, [isActive, notify, attemptId]);

  // Автосейв письменных
  const saveTimerRef = useRef<number | null>(null);
  const scheduleSave = useCallback(
    (draft: { quiz?: Record<number, number>; written?: Record<number, string> }, ph: string) => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        void supabase.functions.invoke("save-attempt-progress", {
          body: { attempt_id: attemptId, draft_answers: draft, current_phase: ph, current_question: 0 },
        });
      }, 1500);
    },
    [attemptId],
  );

  useEffect(() => {
    if (phase !== "written") return;
    scheduleSave({ written: writtenAnswers, quiz: quizPrefilled ?? undefined }, "written");
  }, [writtenAnswers, phase, scheduleSave, quizPrefilled]);

  const submit = useCallback(
    async (
      rawAnswers: { quiz?: Record<number, number>; written?: Record<number, string> } | Record<number, number | string>,
      quizResults?: QuizResults,
    ) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setPhase("submitting");
      try {
        // Финализируем запись экрана: догружаем хвост и обновляем replay_url
        try { await finalize(); } catch (e) { console.error("[live] finalize failed:", e); }
        const time_spent = Math.round((Date.now() - startedAtRef.current) / 1000);
        const per_question = quizResults?.perQuestion?.map((p, i) => ({
          position: i,
          time_spent: p.timeSpent,
          timed_out: p.timedOut,
        }));

        // Загрузка файлов
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
          if (upErr) continue;
          const { data: pub } = supabase.storage.from("test-attachments").getPublicUrl(path);
          attachments[pos] = { url: pub.publicUrl, name: file.name, size: file.size, type: file.type };
        }

        const { data, error } = await supabase.functions.invoke("grade-quiz-submission", {
          body: {
            test_id: testId,
            student_name: studentName,
            answers: rawAnswers,
            time_spent,
            attempt: 1,
            cheat_log: cheatLogRef.current,
            result_id: resultId,
            replay_url: `${resultId}/`,
            per_question,
            attempt_id: attemptId,
            attachments,
          },
        });
        if (error || !(data as any)?.ok) throw new Error((data as any)?.error ?? error?.message ?? "ошибка");
        toast({ title: "Сдано", description: "Работа отправлена учителю" });
        setPhase("done");
        onFinished();
      } catch (e: any) {
        submittedRef.current = false;
        toast({ title: "Ошибка", description: e?.message ?? "не удалось отправить", variant: "destructive" });
        setPhase(testKind === "quiz" ? "quiz" : "written");
      }
    },
    [attemptId, finalize, onFinished, resultId, studentName, testId, testKind, toast, writtenFiles],
  );

  // Авто-сабмит по истечении таймера
  useEffect(() => {
    if (remainingSec > 0) return;
    if (submittedRef.current) return;
    if (phase === "done" || phase === "submitting") return;
    // Собираем что есть
    if (testKind === "quiz") {
      submit(quizPrefilled ?? {});
    } else if (testKind === "hybrid") {
      submit({ quiz: quizPrefilled ?? {}, written: writtenAnswers });
    } else {
      submit(writtenAnswers);
    }
  }, [remainingSec, phase, testKind, quizPrefilled, writtenAnswers, submit]);

  const handleQuizFinish = (results: QuizResults) => {
    const ans: Record<number, number> = {};
    results.answers.forEach((a, i) => {
      const original = quizQuestions[i];
      if (original) ans[original.position] = a;
    });
    if (testKind === "hybrid" && writtenQuestions.length > 0) {
      setQuizPrefilled(ans);
      scheduleSave({ quiz: ans, written: writtenAnswers }, "written");
      (handleQuizFinish as any).__last = results;
      setPhase("written");
      return;
    }
    submit(ans, results);
  };

  const handleWrittenSubmit = () => {
    if (testKind === "hybrid") {
      const last = (handleQuizFinish as any).__last as QuizResults | undefined;
      submit({ quiz: quizPrefilled ?? {}, written: writtenAnswers }, last);
    } else {
      submit(writtenAnswers);
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (!questions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Загрузка теста…</p>
      </div>
    );
  }

  // Шапка с общим таймером
  const Header = (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b px-4 py-2 flex items-center justify-between">
      <span className="text-sm font-medium truncate">{testTitle}</span>
      <span className={`font-mono font-bold ${remainingSec < 60 ? "text-destructive" : ""}`}>
        ⏱ {fmt(remainingSec)}
      </span>
    </div>
  );

  if (phase === "quiz" && (testKind === "quiz" || testKind === "hybrid")) {
    const qs = quizQuestions.map((q) => ({
      q: q.question_text,
      options: [q.options[0] ?? "", q.options[1] ?? "", q.options[2] ?? "", q.options[3] ?? ""] as [string, string, string, string],
      correct: -1,
      seconds: q.seconds_override ?? 30,
    }));
    return (
      <>
        {Header}
        <RecordingBadge variant="full" />
        <Quiz questions={qs} secondsPerQuestion={30} onFinish={handleQuizFinish} />
      </>
    );
  }

  if (phase === "written" || phase === "submitting") {
    const list = testKind === "hybrid" ? writtenQuestions : questions;
    return (
      <>
        {Header}
        <div className="min-h-screen p-4 max-w-3xl mx-auto space-y-4">
          <RecordingBadge variant="full" />
          {list.map((q) => (
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
                  onChange={(e) => setWrittenAnswers((p) => ({ ...p, [q.position]: e.target.value }))}
                  placeholder="Ваш ответ…"
                />
                <FileAttach
                  file={writtenFiles[q.position] ?? null}
                  onFileChange={(f) => setWrittenFiles((p) => ({ ...p, [q.position]: f }))}
                />
              </CardContent>
            </Card>
          ))}
          <Button className="w-full" disabled={phase === "submitting"} onClick={handleWrittenSubmit}>
            {phase === "submitting" ? "Отправка…" : "Сдать работу"}
          </Button>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="max-w-md">
        <CardContent className="pt-6 text-center space-y-3">
          <p className="text-2xl">✅</p>
          <p>Работа отправлена</p>
        </CardContent>
      </Card>
    </div>
  );
}
