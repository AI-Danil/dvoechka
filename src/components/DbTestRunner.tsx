// Полноэкранный раннер для тестов из БД (квиз и письменная самостоятельная).
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { loadTestQuestions, type DbTestSummary, type DbTestQuestion } from "@/lib/dbTests";
import Quiz, { QuizIntro, type QuizResults } from "@/components/Quiz";
import { ArrowLeft } from "lucide-react";
import { useAntiCheatNotify } from "@/hooks/useAntiCheatNotify";
import { useDevToolsBlock } from "@/hooks/useDevToolsBlock";
import { useRrwebRecorder } from "@/hooks/useRrwebRecorder";
import RecordingBadge from "@/components/RecordingBadge";

interface Props {
  test: DbTestSummary;
  onBack: () => void;
  onSubmitted: () => void;
}

const RUSSIAN_NAME_REGEX = /^[А-ЯЁа-яё]+\s+[А-ЯЁа-яё]+(?:\s+(\d+))?$/;

interface CheatEvent {
  type: string;
  timestamp: number;
  details?: string;
}

export default function DbTestRunner({ test, onBack, onSubmitted }: Props) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<DbTestQuestion[] | null>(null);
  const [studentName, setStudentName] = useState("");
  const [phase, setPhase] = useState<"intake" | "intro" | "quiz" | "written" | "submitting" | "done">("intake");
  const [writtenAnswers, setWrittenAnswers] = useState<Record<number, string>>({});
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const cheatLogRef = useRef<CheatEvent[]>([]);
  const [resultId] = useState<string>(() => crypto.randomUUID());

  const isActive = phase === "quiz" || phase === "written" || phase === "intro";

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

  useEffect(() => {
    loadTestQuestions(test.id).then(setQuestions);
  }, [test.id]);

  // Сбор cheat events
  useEffect(() => {
    if (!isActive) return;

    const log = (type: string, details?: string) => {
      cheatLogRef.current.push({ type, timestamp: Date.now(), details });
    };

    const onCopy = () => { log("copy"); notify("Попытка копирования (Ctrl+C)"); };
    const onPaste = () => { log("paste"); notify("Попытка вставки (Ctrl+V)"); };
    const onCut = () => { log("cut"); notify("Попытка вырезания (Ctrl+X)"); };
    const onContext = () => { log("contextmenu"); };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        log("tab_hidden");
        notify("Переключение вкладки/окна");
      }
    };
    const onBlur = () => { log("window_blur"); notify("Уход с окна теста"); };

    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("cut", onCut);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    };
  }, [isActive, notify]);

  const startTest = () => {
    const m = studentName.trim().match(RUSSIAN_NAME_REGEX);
    if (!m) {
      toast({ title: "Ошибка", description: "Введите имя и фамилию русскими буквами (Иван Иванов)", variant: "destructive" });
      return;
    }
    setStartedAt(Date.now());
    toast({
      title: "Внимание: запись экрана включена",
      description: "F12, Ctrl+U, Ctrl+S, ПКМ и копирование заблокированы. Любые попытки фиксируются и отправляются учителю.",
    });
    setPhase(test.kind === "quiz" ? "intro" : "written");
  };

  const submit = async (
    rawAnswers: Record<number, number | string>,
    quizResults?: QuizResults,
  ) => {
    setPhase("submitting");
    try {
      const time_spent = Math.round((Date.now() - (startedAt ?? Date.now())) / 1000);

      // Финализируем запись rrweb перед отправкой
      try { await finalize(); } catch (e) { console.error("finalize failed:", e); }

      const replay_url = `${resultId}/`;

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
        },
      });
      if (error) throw new Error((data as any)?.error ?? error.message);
      if (!(data as any)?.ok) throw new Error((data as any)?.error ?? "Ошибка отправки");

      if (test.kind === "quiz") {
        toast({
          title: "Готово!",
          description: `Балл: ${(data as any).grade}/${(data as any).total}`,
        });
      } else {
        toast({ title: "Сдано", description: "Работа отправлена учителю на проверку" });
      }
      setPhase("done");
      onSubmitted();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Ошибка отправки", description: e?.message ?? "Попробуйте ещё раз", variant: "destructive" });
      setPhase(test.kind === "quiz" ? "intro" : "written");
    }
  };

  if (!questions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Загрузка теста…</p>
      </div>
    );
  }

  if (phase === "intake") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Button variant="ghost" size="sm" onClick={onBack} className="self-start mb-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Назад
            </Button>
            <CardTitle>{test.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {test.kind === "quiz" ? `Квиз: ${questions.length} вопросов` : `Самостоятельная: ${questions.length} задач`}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="name">Имя и фамилия</Label>
            <Input id="name" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Иван Иванов" />
            <Button className="w-full" onClick={startTest}>Начать</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "intro" && test.kind === "quiz") {
    return (
      <QuizIntro
        questionsCount={questions.length}
        secondsPerQuestion={test.time_per_question_sec}
        onStart={() => setPhase("quiz")}
      />
    );
  }

  if (phase === "quiz" && test.kind === "quiz") {
    const qs = questions.map((q) => ({
      q: q.question_text,
      options: [
        q.options[0] ?? "",
        q.options[1] ?? "",
        q.options[2] ?? "",
        q.options[3] ?? "",
      ] as [string, string, string, string],
      correct: -1,
      seconds: test.time_per_question_sec,
    }));
    return (
      <Quiz
        questions={qs}
        secondsPerQuestion={test.time_per_question_sec}
        onFinish={(results) => {
          const ans: Record<number, number> = {};
          results.answers.forEach((a, i) => { ans[i] = a; });
          submit(ans, results);
        }}
      />
    );
  }

  if (phase === "written" || phase === "submitting") {
    return (
      <div className="min-h-screen p-4 max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Назад
          </Button>
          <h1 className="text-xl font-semibold">{test.title}</h1>
          <div />
        </div>
        {questions.map((q) => (
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
                placeholder="Ваш ответ…"
              />
            </CardContent>
          </Card>
        ))}
        <Button
          className="w-full"
          disabled={phase === "submitting"}
          onClick={() => submit(writtenAnswers)}
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
