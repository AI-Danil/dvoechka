import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Grade8Informatics from "@/components/tests/Grade8Informatics";
import Grade7Informatics from "@/components/tests/Grade7Informatics";
import Grade9Informatics from "@/components/tests/Grade9Informatics";
import Grade9Physics from "@/components/tests/Grade9Physics";
import Grade9Technology from "@/components/tests/Grade9Technology";
import Grade7Technology from "@/components/tests/Grade7Technology";

type Screen = "login" | "test" | "success";

const TOTAL_TIME = 40 * 60;

const AVAILABLE_TESTS: Record<string, string[]> = {
  "7": ["informatics", "technology"],
  "8": ["informatics"],
  "9": ["informatics", "physics", "technology"],
};

const SUBJECT_LABELS: Record<string, string> = {
  informatics: "Информатика",
  physics: "Физика",
  technology: "Технология",
};

const RUSSIAN_NAME_REGEX = /^[А-ЯЁа-яё]+\s+[А-ЯЁа-яё]+(?:\s+(\d+))?$/;

function getDraftKey(grade: string, subject: string, attempt: string) {
  return `test_draft_${grade}_${subject}_${attempt}`;
}

function getSubmittedKey(grade: string, subject: string, name: string, attempt: string) {
  return `test_submitted_${grade}_${subject}_${name.trim().toLowerCase()}_${attempt}`;
}

const Index = () => {
  const [screen, setScreen] = useState<Screen>("login");
  const [studentName, setStudentName] = useState("");
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [attempt, setAttempt] = useState("1");
  const [cleanName, setCleanName] = useState("");
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [warned5min, setWarned5min] = useState(false);
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
  const [answers9, setAnswers9] = useState<string[]>(Array(11).fill(""));
  const [attachments9, setAttachments9] = useState<Record<number, File | null>>({});

  // Grade 9 physics answers
  const [answers9phys, setAnswers9phys] = useState<string[]>(Array(14).fill(""));
  const [attachments9phys, setAttachments9phys] = useState<Record<number, File | null>>({});

  // Grade 9 technology answers
  const [answers9tech, setAnswers9tech] = useState<string[]>(Array(11).fill(""));
  const [attachments9tech, setAttachments9tech] = useState<Record<number, File | null>>({});

  // Grade 7 technology answers
  const [theory7tech, setTheory7tech] = useState<string[]>(Array(7).fill(""));
  const [practice7tech, setPractice7tech] = useState<string[]>(Array(6).fill(""));
  const [attachments7tech, setAttachments7tech] = useState<Record<number, File | null>>({});

  // Live refs for all data (so auto-submit always reads latest values)
  const blitz8Ref = useRef(blitz8);
  const tasks8Ref = useRef(tasks8);
  const attachments8Ref = useRef(attachments8);
  const theory7Ref = useRef(theory7);
  const practice7Ref = useRef(practice7);
  const attachments7Ref = useRef(attachments7);
  const answers9Ref = useRef(answers9);
  const attachments9Ref = useRef(attachments9);
  const answers9physRef = useRef(answers9phys);
  const attachments9physRef = useRef(attachments9phys);
  const answers9techRef = useRef(answers9tech);
  const attachments9techRef = useRef(attachments9tech);
  const theory7techRef = useRef(theory7tech);
  const practice7techRef = useRef(practice7tech);
  const attachments7techRef = useRef(attachments7tech);
  const gradeRef = useRef(grade);
  const subjectRef = useRef(subject);
  const attemptRef = useRef(attempt);
  const cleanNameRef = useRef(cleanName);
  const timeLeftRef = useRef(timeLeft);

  // Keep refs in sync
  useEffect(() => { blitz8Ref.current = blitz8; }, [blitz8]);
  useEffect(() => { tasks8Ref.current = tasks8; }, [tasks8]);
  useEffect(() => { attachments8Ref.current = attachments8; }, [attachments8]);
  useEffect(() => { theory7Ref.current = theory7; }, [theory7]);
  useEffect(() => { practice7Ref.current = practice7; }, [practice7]);
  useEffect(() => { attachments7Ref.current = attachments7; }, [attachments7]);
  useEffect(() => { answers9Ref.current = answers9; }, [answers9]);
  useEffect(() => { attachments9Ref.current = attachments9; }, [attachments9]);
  useEffect(() => { answers9physRef.current = answers9phys; }, [answers9phys]);
  useEffect(() => { attachments9physRef.current = attachments9phys; }, [attachments9phys]);
  useEffect(() => { answers9techRef.current = answers9tech; }, [answers9tech]);
  useEffect(() => { attachments9techRef.current = attachments9tech; }, [attachments9tech]);
  useEffect(() => { theory7techRef.current = theory7tech; }, [theory7tech]);
  useEffect(() => { practice7techRef.current = practice7tech; }, [practice7tech]);
  useEffect(() => { attachments7techRef.current = attachments7tech; }, [attachments7tech]);
  useEffect(() => { gradeRef.current = grade; }, [grade]);
  useEffect(() => { subjectRef.current = subject; }, [subject]);
  useEffect(() => { attemptRef.current = attempt; }, [attempt]);
  useEffect(() => { cleanNameRef.current = cleanName; }, [cleanName]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  // Anticheat
  const cheatLogRef = useRef<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittingRef = useRef(false);
  const testActiveRef = useRef(false);
  const [autoSubmitTriggered, setAutoSubmitTriggered] = useState(false);

  // --- Autosave: restore draft on test start ---
  useEffect(() => {
    if (screen !== "test" || !grade || !subject) return;
    const key = getDraftKey(grade, subject, attempt);
    const saved = localStorage.getItem(key);
    if (!saved) return;
    try {
      const draft = JSON.parse(saved);
      if (grade === "8") {
        if (draft.blitz8) setBlitz8(draft.blitz8);
        if (draft.tasks8) setTasks8(draft.tasks8);
      } else if (grade === "9" && subject === "physics") {
        if (draft.answers9phys) setAnswers9phys(draft.answers9phys);
      } else if (grade === "9" && subject === "technology") {
        if (draft.answers9tech) setAnswers9tech(draft.answers9tech);
      } else if (grade === "9") {
        if (draft.answers9) setAnswers9(draft.answers9);
      } else if (grade === "7" && subject === "technology") {
        if (draft.theory7tech) setTheory7tech(draft.theory7tech);
        if (draft.practice7tech) setPractice7tech(draft.practice7tech);
      } else if (grade === "7") {
        if (draft.theory7) setTheory7(draft.theory7);
        if (draft.practice7) setPractice7(draft.practice7);
      }
    } catch {
      // ignore corrupt data
    }
  }, [screen, grade, subject]);

  // --- Autosave: persist draft on every answer change ---
  useEffect(() => {
    if (screen !== "test" || !grade || !subject) return;
    const key = getDraftKey(grade, subject, attempt);
    let data: Record<string, unknown> = {};
    if (grade === "8") {
      data = { blitz8, tasks8 };
    } else if (grade === "9" && subject === "physics") {
      data = { answers9phys };
    } else if (grade === "9" && subject === "technology") {
      data = { answers9tech };
    } else if (grade === "9") {
      data = { answers9 };
    } else if (grade === "7" && subject === "technology") {
      data = { theory7tech, practice7tech };
    } else if (grade === "7") {
      data = { theory7, practice7 };
    }
    localStorage.setItem(key, JSON.stringify(data));
  }, [screen, grade, subject, blitz8, tasks8, answers9, answers9phys, answers9tech, theory7, practice7, theory7tech, practice7tech]);

  // --- Progress calculation ---
  const { answered, total } = useMemo(() => {
    if (grade === "8") {
      const blitzFilled = blitz8.filter(Boolean).length;
      const tasksFilled = Object.values(tasks8).filter(Boolean).length;
      return { answered: blitzFilled + tasksFilled, total: 7 + 6 };
    } else if (grade === "9" && subject === "physics") {
      return { answered: answers9phys.filter(Boolean).length, total: 14 };
    } else if (grade === "9" && subject === "technology") {
      return { answered: answers9tech.filter(Boolean).length, total: 11 };
    } else if (grade === "9") {
      return { answered: answers9.filter(Boolean).length, total: 11 };
    } else if (grade === "7" && subject === "technology") {
      const tFilled = theory7tech.filter(Boolean).length;
      const pFilled = practice7tech.filter(Boolean).length;
      return { answered: tFilled + pFilled, total: 7 + 6 };
    } else if (grade === "7") {
      const tFilled = theory7.filter(Boolean).length;
      const pFilled = practice7.filter(Boolean).length;
      return { answered: tFilled + pFilled, total: 7 + 6 };
    }
    return { answered: 0, total: 1 };
  }, [grade, subject, blitz8, tasks8, answers9, answers9phys, answers9tech, theory7, practice7, theory7tech, practice7tech]);

  const progressPercent = total > 0 ? Math.round((answered / total) * 100) : 0;

  const getTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
  };

  const logCheat = useCallback((event: string) => {
    if (testActiveRef.current) {
      cheatLogRef.current.push(`[${getTime()}] ${event}`);
    }
  }, []);

  // Anti-copy notification helper
  const notifyCopyAttempt = useCallback(async (event: string) => {
    try {
      await supabase.functions.invoke("notify-copy-attempt", {
        body: {
          studentName: cleanNameRef.current,
          grade: gradeRef.current,
          subject: subjectRef.current,
          event,
        },
      });
    } catch (e) {
      console.error("Failed to notify copy attempt:", e);
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
    const onCopy = (e: Event) => {
      e.preventDefault();
      logCheat("Попытка копирования (copy) — ЗАБЛОКИРОВАНО");
      notifyCopyAttempt("Копирование текста (Ctrl+C / ПКМ → Копировать)");
      toast({ title: "⛔ Копирование запрещено", description: "Попытка копирования зафиксирована и отправлена преподавателю.", variant: "destructive" });
    };
    const onCut = (e: Event) => {
      e.preventDefault();
      logCheat("Попытка вырезания (cut) — ЗАБЛОКИРОВАНО");
      notifyCopyAttempt("Вырезание текста (Ctrl+X)");
      toast({ title: "⛔ Вырезание запрещено", description: "Попытка зафиксирована.", variant: "destructive" });
    };
    const onPaste = () => logCheat("Вставил текст (paste)");
    const onKeyDown = (e: KeyboardEvent) => {
      // Block copy shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C" || e.key === "с" || e.key === "С")) {
        e.preventDefault();
        logCheat("Попытка Ctrl+C — ЗАБЛОКИРОВАНО");
        notifyCopyAttempt("Комбинация клавиш Ctrl+C");
        toast({ title: "⛔ Копирование запрещено", description: "Попытка зафиксирована.", variant: "destructive" });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A" || e.key === "ф" || e.key === "Ф")) {
        e.preventDefault();
        logCheat("Попытка Ctrl+A — ЗАБЛОКИРОВАНО");
        notifyCopyAttempt("Комбинация клавиш Ctrl+A (выделить всё)");
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "u" || e.key === "U" || e.key === "г" || e.key === "Г")) {
        e.preventDefault();
        logCheat("Попытка Ctrl+U — ЗАБЛОКИРОВАНО");
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S" || e.key === "ы" || e.key === "Ы") && !e.shiftKey) {
        e.preventDefault();
        logCheat("Попытка Ctrl+S — ЗАБЛОКИРОВАНО");
        return;
      }
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
    const onContext = (e: Event) => {
      e.preventDefault();
      logCheat("Открыл контекстное меню (ПКМ) — ЗАБЛОКИРОВАНО");
    };
    const onSelectStart = (e: Event) => {
      // Allow selection in input/textarea only
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      e.preventDefault();
    };

    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("selectstart", onSelectStart);

    return () => {
      testActiveRef.current = false;
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("selectstart", onSelectStart);
    };
  }, [screen, logCheat, notifyCopyAttempt, toast]);

  // Timer — only counts down, no side effects
  useEffect(() => {
    if (screen !== "test") return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [screen]);

  // Auto-submit when time runs out (reads from refs, not stale closures)
  useEffect(() => {
    if (screen === "test" && timeLeft === 0 && !autoSubmitTriggered) {
      setAutoSubmitTriggered(true);
      // Use a micro-delay to ensure all state→ref syncs have flushed
      setTimeout(() => {
        if (!submittingRef.current) {
          doSubmit();
        }
      }, 50);
    }
  }, [timeLeft, screen, autoSubmitTriggered]);

  // 5-minute warning
  useEffect(() => {
    if (screen === "test" && timeLeft === 300 && !warned5min) {
      setWarned5min(true);
      toast({
        title: "⚠️ Осталось 5 минут!",
        description: "Скоро тест будет автоматически завершён. Проверьте свои ответы.",
        variant: "destructive",
      });
    }
  }, [timeLeft, screen, warned5min, toast]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleStart = () => {
    const trimmedName = studentName.trim();
    const match = RUSSIAN_NAME_REGEX.exec(trimmedName);
    if (!match) {
      toast({
        title: "Ошибка",
        description: "Введите Имя и Фамилию на русском языке (два слова, без цифр и спецсимволов)",
        variant: "destructive",
      });
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

    // Parse attempt from optional third word
    const parsedAttempt = match[1] || "1";
    const nameParts = trimmedName.split(/\s+/);
    const pureName = `${nameParts[0]} ${nameParts[1]}`;

    setAttempt(parsedAttempt);
    setCleanName(pureName);

    // Check if already submitted
    const submittedKey = getSubmittedKey(grade, subject, pureName, parsedAttempt);
    if (localStorage.getItem(submittedKey)) {
      toast({
        title: "Повторная сдача",
        description: "Вы уже прошли этот тест. Повторная сдача невозможна.",
        variant: "destructive",
      });
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
      const safeName = `student_${timestamp}`;
      const path = `${safeName}_${grade}/${key}.${ext}`;

      const { error } = await supabase.storage
        .from("test-attachments")
        .upload(path, file, {
          contentType: file.type,
          upsert: true,
        });

      if (error) {
        console.error(`Upload failed for ${key}:`, error);
        toast({ title: "Ошибка загрузки", description: `Не удалось загрузить файл "${file.name}": ${error.message}`, variant: "destructive" });
      } else {
        const { data } = supabase.storage
          .from("test-attachments")
          .getPublicUrl(path);
        urls[String(key)] = data.publicUrl;
      }
    }
    return urls;
  };

  // Core submit function that reads from refs (always has latest data)
  const doSubmit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const g = gradeRef.current;
    const s = subjectRef.current;
    const a = attemptRef.current;
    const name = cleanNameRef.current;

    let answers: Record<string, unknown>;
    let fileUrls: Record<string, string> = {};

    if (g === "8") {
      fileUrls = await uploadAttachments(attachments8Ref.current);
      answers = { type: "grade8", blitz: blitz8Ref.current, tasks: tasks8Ref.current };
    } else if (g === "9" && s === "physics") {
      fileUrls = await uploadAttachments(attachments9physRef.current);
      answers = { type: "grade9physics", answers: answers9physRef.current };
    } else if (g === "9" && s === "technology") {
      fileUrls = await uploadAttachments(attachments9techRef.current);
      answers = { type: "grade9technology", answers: answers9techRef.current };
    } else if (g === "9") {
      fileUrls = await uploadAttachments(attachments9Ref.current);
      answers = { type: "grade9", answers: answers9Ref.current };
    } else if (g === "7" && s === "technology") {
      fileUrls = await uploadAttachments(attachments7techRef.current);
      answers = { type: "grade7technology", theory: theory7techRef.current, practice: practice7techRef.current };
    } else {
      fileUrls = await uploadAttachments(attachments7Ref.current);
      answers = { type: "grade7", theory: theory7Ref.current, practice: practice7Ref.current };
    }

    const payload = {
      studentName: name,
      grade: g,
      subject: s,
      attempt: a,
      ...answers,
      attachments: fileUrls,
      cheatLog: cheatLogRef.current,
      timeSpent: TOTAL_TIME - timeLeftRef.current,
    };

    try {
      const { error } = await supabase.functions.invoke("send-test-results", { body: payload });
      if (error) throw error;
    } catch (e) {
      console.error("Failed to send results:", e);
    }

    // Mark as submitted & clear draft
    const submittedKey = getSubmittedKey(g, s, name, a);
    localStorage.setItem(submittedKey, "1");
    localStorage.removeItem(getDraftKey(g, s, a));

    setScreen("success");
    setSubmitting(false);
    submittingRef.current = false;
  };

  const handleSubmit = () => doSubmit();

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
              <p className="text-xs text-muted-foreground mt-1">Два слова на русском, без цифр и символов</p>
            </div>
            <div>
              <Label>Класс:</Label>
              <Select value={grade} onValueChange={(v) => { setGrade(v); setSubject(""); }}>
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
      <div className="sticky top-0 z-50 bg-card border-b shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-muted-foreground">
            Ученик: {cleanName} — {grade} класс, {subjectLabel}
          </span>
          <span className={`font-mono text-lg font-bold ${timeLeft < 300 ? "text-destructive" : "text-foreground"}`}>
            Осталось: {formatTime(timeLeft)}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <Progress value={progressPercent} className="flex-1 h-2" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {answered}/{total} ({progressPercent}%)
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">💾 Ответы сохраняются автоматически</p>
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

        {grade === "7" && subject === "technology" && (
          <Grade7Technology
            theory={theory7tech}
            practice={practice7tech}
            attachments={attachments7tech}
            onTheoryChange={(i, v) => {
              setTheory7tech((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onPracticeChange={(i, v) => {
              setPractice7tech((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onAttachmentChange={(i, file) => setAttachments7tech((prev) => ({ ...prev, [i]: file }))}
          />
        )}

        {grade === "7" && subject === "informatics" && (
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

        {grade === "9" && subject === "informatics" && (
          <Grade9Informatics
            answers={answers9}
            attachments={attachments9}
            onAnswerChange={(i, v) => {
              setAnswers9((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onAttachmentChange={(i, file) => setAttachments9((prev) => ({ ...prev, [i]: file }))}
          />
        )}

        {grade === "9" && subject === "physics" && (
          <Grade9Physics
            answers={answers9phys}
            attachments={attachments9phys}
            onAnswerChange={(i, v) => {
              setAnswers9phys((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onAttachmentChange={(i, file) => setAttachments9phys((prev) => ({ ...prev, [i]: file }))}
          />
        )}

        {grade === "9" && subject === "technology" && (
          <Grade9Technology
            answers={answers9tech}
            attachments={attachments9tech}
            onAnswerChange={(i, v) => {
              setAnswers9tech((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            onAttachmentChange={(i, file) => setAttachments9tech((prev) => ({ ...prev, [i]: file }))}
          />
        )}

        <div className="text-center pt-4 pb-8">
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={submitting}
            size="lg"
            className="bg-accent text-accent-foreground hover:bg-accent/90 px-10 py-6 text-lg"
          >
            {submitting ? "Отправка..." : "Завершить и отправить ответы"}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. После отправки вернуться к тесту будет невозможно.
              Заполнено {answered} из {total} вопросов.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>Отправить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
