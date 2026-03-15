import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Grade8Informatics from "@/components/tests/Grade8Informatics";
import Grade7Informatics from "@/components/tests/Grade7Informatics";
import Grade9Informatics from "@/components/tests/Grade9Informatics";

type Screen = "login" | "test" | "success";

const TOTAL_TIME = 40 * 60;

const AVAILABLE_TESTS: Record<string, string[]> = {
  "7": ["informatics"],
  "8": ["informatics"],
  "9": ["informatics"],
};

const Index = () => {
  const [screen, setScreen] = useState<Screen>("login");
  const [studentName, setStudentName] = useState("");
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Grade 8 answers
  const [blitz8, setBlitz8] = useState<string[]>(Array(7).fill(""));
  const [tasks8, setTasks8] = useState<Record<string, string>>({
    t1: "", t2: "", t3: "", t4: "", t5: "", t6: "",
  });
  const [attachments8, setAttachments8] = useState<Record<string, File | null>>({});

  // Grade 7 answers
  const [theory7, setTheory7] = useState<string[]>(Array(7).fill(""));
  const [practice7, setPractice7] = useState<string[]>(Array(6).fill(""));
  const [attachments7, setAttachments7] = useState<Record<number, File | null>>({});

  // Grade 9 answers
  const [answers9, setAnswers9] = useState<string[]>(Array(6).fill(""));
  const [attachments9, setAttachments9] = useState<Record<number, File | null>>({});

  // Anticheat
  const cheatLogRef = useRef<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const testActiveRef = useRef(false);

  const getTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
  };

  const logCheat = useCallback((event: string) => {
    if (testActiveRef.current) {
      cheatLogRef.current.push(`[${getTime()}] ${event}`);
    }
  }, []);

  // Anticheat listeners
  useEffect(() => {
    if (screen !== "test") return;
    testActiveRef.current = true;

    const onBlur = () => logCheat("Переключился на другое окно (blur)");
    const onVisibility = () => {
      if (document.hidden) logCheat("Свернул вкладку/браузер (visibilitychange)");
    };
    const onCopy = () => logCheat("Скопировал текст (copy)");
    const onPaste = () => logCheat("Вставил текст (paste)");
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        logCheat("Нажал PrintScreen (скриншот)");
      } else if (e.metaKey && e.shiftKey && (e.key === "s" || e.key === "S")) {
        logCheat("Нажал Win+Shift+S (Snipping Tool)");
      } else if (e.ctrlKey && e.shiftKey && (e.key === "s" || e.key === "S")) {
        logCheat("Нажал Ctrl+Shift+S (скриншот)");
      } else if (e.metaKey && e.shiftKey && (e.key === "3" || e.key === "4" || e.key === "5")) {
        logCheat(`Нажал Cmd+Shift+${e.key} (скриншот macOS)`);
      } else if (e.key === "Meta") {
        logCheat("Нажал Meta (Win/Cmd)");
      }
    };
    const onContext = () => {
      logCheat("Открыл контекстное меню (ПКМ)");
    };

    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("contextmenu", onContext);

    return () => {
      testActiveRef.current = false;
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("contextmenu", onContext);
    };
  }, [screen, logCheat]);

  // Timer
  useEffect(() => {
    if (screen !== "test") return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleStart = () => {
    if (studentName.trim().length < 3) {
      toast({ title: "Ошибка", description: "Введите корректное имя (минимум 3 символа)", variant: "destructive" });
      return;
    }
    if (!grade) {
      toast({ title: "Ошибка", description: "Выберите класс", variant: "destructive" });
      return;
    }
    if (!subject) {
      toast({ title: "Ошибка", description: "Выберите предмет", variant: "destructive" });
      return;
    }
    const available = AVAILABLE_TESTS[grade];
    if (!available || !available.includes(subject)) {
      toast({ title: "Тест недоступен", description: `Тест для ${grade} класса по этому предмету пока не добавлен.`, variant: "destructive" });
      return;
    }
    setScreen("test");
  };

  const uploadAttachments = async (files: Record<string | number, File | null>): Promise<Record<string, string>> => {
    const urls: Record<string, string> = {};
    const timestamp = Date.now();

    for (const [key, file] of Object.entries(files)) {
      if (!file) continue;
      const ext = file.name.split(".").pop() || "bin";
      const path = `${studentName.replace(/\s+/g, "_")}_${grade}/${timestamp}_${key}.${ext}`;

      const { error } = await supabase.storage
        .from("test-attachments")
        .upload(path, file);

      if (!error) {
        const { data } = supabase.storage
          .from("test-attachments")
          .getPublicUrl(path);
        urls[String(key)] = data.publicUrl;
      }
    }
    return urls;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    let answers: Record<string, unknown>;
    let fileUrls: Record<string, string> = {};

    if (grade === "8") {
      fileUrls = await uploadAttachments(attachments8);
      answers = {
        type: "grade8",
        blitz: blitz8,
        tasks: tasks8,
      };
    } else {
      fileUrls = await uploadAttachments(attachments7);
      answers = {
        type: "grade7",
        theory: theory7,
        practice: practice7,
      };
    }

    const payload = {
      studentName,
      grade,
      subject,
      ...answers,
      attachments: fileUrls,
      cheatLog: cheatLogRef.current,
      timeSpent: TOTAL_TIME - timeLeft,
    };

    try {
      const { error } = await supabase.functions.invoke("send-test-results", {
        body: payload,
      });
      if (error) throw error;
    } catch (e) {
      console.error("Failed to send results:", e);
    }

    setScreen("success");
    setSubmitting(false);
  };

  // LOGIN SCREEN
  if (screen === "login") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Итоговая аттестация за 3-ю четверть</CardTitle>
            <p className="text-muted-foreground mt-2">
              Пожалуйста, введите свои данные для начала тестирования.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="student-name">Ваше Имя и Фамилия:</Label>
              <Input
                id="student-name"
                placeholder="Например: Иван Иванов"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Класс:</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Выберите класс" />
                </SelectTrigger>
                <SelectContent>
                  {["5", "6", "7", "8", "9"].map((g) => (
                    <SelectItem key={g} value={g}>{g} класс</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Предмет:</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Выберите предмет" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="informatics">Информатика</SelectItem>
                  <SelectItem value="physics">Физика</SelectItem>
                  <SelectItem value="technology">Технология</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleStart} className="w-full mt-4" size="lg">
              Начать тестирование
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // SUCCESS SCREEN
  if (screen === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg text-center">
          <CardContent className="py-12 space-y-4">
            <h1 className="text-4xl">✅</h1>
            <h2 className="text-2xl font-bold">Тест успешно завершен!</h2>
            <p className="text-muted-foreground">
              Ответы отправлены преподавателю. Можете закрыть эту вкладку.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // TEST SCREEN
  const subjectLabel = subject === "informatics" ? "Информатика" : subject === "physics" ? "Физика" : "Технология";

  return (
    <div className="min-h-screen pb-8">
      <div className="sticky top-0 z-50 bg-card border-b shadow-sm px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-muted-foreground">
          Ученик: {studentName} — {grade} класс, {subjectLabel}
        </span>
        <span className={`font-mono text-lg font-bold ${timeLeft < 300 ? "text-destructive" : "text-foreground"}`}>
          Осталось: {formatTime(timeLeft)}
        </span>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-6 space-y-8">
        {grade === "8" && (
          <Grade8Informatics
            blitz={blitz8}
            tasks={tasks8}
            attachments={attachments8}
            onBlitzChange={(i, v) => {
              setBlitz8((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onTaskChange={(key, v) => setTasks8((prev) => ({ ...prev, [key]: v }))}
            onAttachmentChange={(key, file) => setAttachments8((prev) => ({ ...prev, [key]: file }))}
          />
        )}

        {grade === "7" && (
          <Grade7Informatics
            theory={theory7}
            practice={practice7}
            attachments={attachments7}
            onTheoryChange={(i, v) => {
              setTheory7((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onPracticeChange={(i, v) => {
              setPractice7((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onAttachmentChange={(i, file) => setAttachments7((prev) => ({ ...prev, [i]: file }))}
          />
        )}

        <div className="text-center pt-4 pb-8">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            size="lg"
            className="bg-accent text-accent-foreground hover:bg-accent/90 px-10 py-6 text-lg"
          >
            {submitting ? "Отправка..." : "Завершить и отправить ответы"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
