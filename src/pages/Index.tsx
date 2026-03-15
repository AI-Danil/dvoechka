import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

type Screen = "login" | "test" | "success";

const TOTAL_TIME = 40 * 60; // 40 minutes in seconds

const Index = () => {
  const [screen, setScreen] = useState<Screen>("login");
  const [studentName, setStudentName] = useState("");
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Answers
  const [blitz, setBlitz] = useState<string[]>(Array(7).fill(""));
  const [t1, setT1] = useState("");
  const [t2, setT2] = useState("");
  const [t3, setT3] = useState("");
  const [t4, setT4] = useState("");
  const [t5, setT5] = useState("");
  const [t6, setT6] = useState("");

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

  // Setup anticheat listeners
  useEffect(() => {
    if (screen !== "test") return;
    testActiveRef.current = true;

    const onBlur = () => logCheat("Переключился на другое окно (blur)");
    const onVisibility = () => {
      if (document.hidden) logCheat("Свернул вкладку/браузер (visibilitychange)");
    };
    const onCopy = () => logCheat("Скопировал текст (copy)");
    const onPaste = () => logCheat("Вставил текст (paste)");
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") logCheat("Нажал PrintScreen");
      if (e.key === "Meta") logCheat("Нажал Meta (Win/Cmd)");
    };
    const onContext = (e: MouseEvent) => {
      logCheat("Открыл контекстное меню (ПКМ)");
      // Don't prevent default — stay silent
    };

    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("contextmenu", onContext);

    return () => {
      testActiveRef.current = false;
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("keyup", onKeyUp);
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
    if (grade !== "8" || subject !== "informatics") {
      toast({ title: "Тест недоступен", description: "В данный момент доступен только тест для 8 класса по информатике.", variant: "destructive" });
      return;
    }
    setScreen("test");
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const payload = {
      studentName,
      grade,
      subject,
      blitz,
      tasks: { t1, t2, t3, t4, t5, t6 },
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

  const updateBlitz = (index: number, value: string) => {
    setBlitz((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
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
            <h2 className="text-2xl font-bold">Работа успешно сдана!</h2>
            <p className="text-muted-foreground">
              Ваши ответы отправлены преподавателю. Можете закрыть эту вкладку.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // TEST SCREEN
  const blitzQuestions = [
    "Чему равно значение выражения НЕ (НЕ (5 > 3))?",
    "Какой тип данных вернет функция input(), если ввести 123.45?",
    "Можно ли назвать переменную в Python 2_level_boss? (Да/Нет + почему)",
    "Чему равен результат операции 17 % 5?",
    "При каких значениях A и B выражение (A И B) будет истинным?",
    "Сколько бит информации несёт один символ при алфавите в 15 знаков?",
    "Что окажется в переменной x после: x = 10; x = x + 5; x = 2?",
  ];

  return (
    <div className="min-h-screen pb-8">
      {/* Sticky timer */}
      <div className="sticky top-0 z-50 bg-card border-b shadow-sm px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-muted-foreground">
          {studentName} — 8 класс, Информатика
        </span>
        <span className={`font-mono text-lg font-bold ${timeLeft < 300 ? "text-destructive" : "text-foreground"}`}>
          Осталось: {formatTime(timeLeft)}
        </span>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-6 space-y-8">
        {/* BLITZ */}
        <section>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">Блиц-опрос (краткий ответ)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {blitzQuestions.map((q, i) => (
              <Card key={i}>
                <CardContent className="pt-4 space-y-2">
                  <Label className="text-sm font-medium">{i + 1}. {q}</Label>
                  <Input
                    value={blitz[i]}
                    onChange={(e) => updateBlitz(i, e.target.value)}
                    placeholder="Ваш ответ..."
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* PART 1: INFORMATICS */}
        <section>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">Часть 1: Информатика</h2>
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-4 space-y-2">
                <Label className="font-medium">Задача 1. «Сломанный видеоадаптер»</Label>
                <p className="text-sm text-muted-foreground">
                  Экран имеет разрешение 120×120 пикселей. Из-за аппаратного сбоя видеокарта резервирует
                  под каждый пиксель строго 9 бит памяти, хотя фактически может отображать только 300
                  различных цветов. Какой объём памяти (в байтах) займёт один снимок экрана? Покажите решение.
                </p>
                <Textarea
                  value={t1}
                  onChange={(e) => setT1(e.target.value)}
                  placeholder="Ваше решение..."
                  className="min-h-[100px]"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 space-y-2">
                <Label className="font-medium">Задача 2. «Логика дефектного робота»</Label>
                <p className="text-sm text-muted-foreground">
                  Робот идёт вперёд, если выполняется условие: (Датчик А видит стену ИЛИ НЕ Датчик Б
                  видит яму). При скольких комбинациях состояний датчиков (из 4 возможных) робот никуда не пойдёт?
                </p>
                <Input
                  value={t2}
                  onChange={(e) => setT2(e.target.value)}
                  placeholder="Ответ и обоснование"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 space-y-2">
                <Label className="font-medium">Задача 3. «Алгоритм-перевёртыш»</Label>
                <p className="text-sm text-muted-foreground">
                  Дан алгоритм: S = 13; i = 1; Пока S &lt; 50: {"{"} S = S + (i * 2); i = i + 3; {"}"}.
                  Чему будет равно значение S после завершения цикла?
                </p>
                <Input
                  value={t3}
                  onChange={(e) => setT3(e.target.value)}
                  placeholder="Ответ:"
                />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* PART 2: PYTHON */}
        <section>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">Часть 2: Технология / Python</h2>
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-4 space-y-2">
                <Label className="font-medium">Задача 4. «Налог на трофеи»</Label>
                <p className="text-sm text-muted-foreground">
                  Группа из 11 героев нашла клад в 1543 золотых монеты. Королевский налог составляет 17%
                  (отбрасываем дробную часть). Оставшееся золото делится поровну между 11 героями. Всё, что
                  не разделилось поровну (остаток), уходит в пользу казны. Напишите код, который выводит:
                  «Каждый герой получил: [сумма]. В казну ушло: [налог + остаток]».
                </p>
                <Textarea
                  value={t4}
                  onChange={(e) => setT4(e.target.value)}
                  placeholder="Код на Python..."
                  className="min-h-[120px] font-mono text-sm"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 space-y-2">
                <Label className="font-medium">Задача 5. «Крафт в кузнице»</Label>
                <p className="text-sm text-muted-foreground">
                  Для создания вещи нужно 3 ингредиента: Руда, Мана и Уголь. Напишите программу, которая
                  запрашивает вес каждого ингредиента (дробные числа). Выходные данные должны быть оформлены
                  строго одной строкой через print() с параметром sep="---": Рецепт: Руда: [значение] ---
                  Мана: [значение] --- Уголь: [значение].
                </p>
                <Textarea
                  value={t5}
                  onChange={(e) => setT5(e.target.value)}
                  placeholder="Код на Python..."
                  className="min-h-[120px] font-mono text-sm"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 space-y-2">
                <Label className="font-medium">Задача 6. «Ловушка типов в таверне»</Label>
                <p className="text-sm text-muted-foreground">Исправьте ошибки в коде:</p>
                <pre className="bg-muted p-3 rounded text-sm font-mono overflow-x-auto">
{`price = input("Цена: ")
count = input("Героев: ")
total = price * count
print("Итого: " + total)`}
                </pre>
                <Textarea
                  value={t6}
                  onChange={(e) => setT6(e.target.value)}
                  placeholder="Исправленный код..."
                  className="min-h-[120px] font-mono text-sm"
                />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Submit */}
        <div className="text-center pt-4 pb-8">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            size="lg"
            className="bg-accent text-accent-foreground hover:bg-accent/90 px-10 py-6 text-lg"
          >
            {submitting ? "Отправка..." : "Завершить работу и отправить ответы"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
