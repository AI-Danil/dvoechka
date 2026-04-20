import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import FileAttach from "@/components/FileAttach";
import type { QuizQuestion } from "@/components/Quiz";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const NOTIFY_COOLDOWN_MS = 10_000;

export const PYTHON_HERO_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    q: "Какой тип данных в Python используется для хранения текста (строки)?",
    options: ["int", "float", "str", "bool"],
    correct: 2,
    seconds: 20,
  },
  {
    q: "Какое имя переменной является правильным в Python?",
    options: ["2player", "player_name", "player-name", "class"],
    correct: 1,
    seconds: 30,
  },
  {
    q: 'Что выведет код: print("2" + "3") ?',
    options: ["5", "23", "Ошибка", '"2"+"3"'],
    correct: 1,
    seconds: 35,
  },
  {
    q: "Какая функция используется для получения данных от пользователя?",
    options: ["print()", "input()", "get()", "read()"],
    correct: 1,
    seconds: 20,
  },
  {
    q: "Если нужен возраст пользователя для математики, как правильно его получить?",
    options: [
      'age = input("Возраст: ")',
      'age = "input"',
      'age = print("Возраст")',
      'age = int(input("Возраст: "))',
    ],
    correct: 3,
    seconds: 45,
  },
  {
    q: "Что делает функция randint(1, 10) из модуля random?",
    options: [
      "Возвращает 1 и 10",
      "Возвращает случайное целое от 1 до 10 (включительно)",
      "Возвращает 10 случайных чисел",
      "Возвращает дробное число от 1 до 10",
    ],
    correct: 1,
    seconds: 30,
  },
  {
    q: "Что выведет код: print(10 // 3) ?",
    options: ["3.33", "3.0", "3", "1"],
    correct: 2,
    seconds: 40,
  },
  {
    q: 'Что выведет код: print(3 * "ha") ?',
    options: ["9", "Ошибка", "hahaha", "3ha"],
    correct: 2,
    seconds: 40,
  },
  {
    q: "Что выведет код: print(2 ** 3) ?",
    options: ["6", "8", "23", "5"],
    correct: 1,
    seconds: 35,
  },
];

interface Grade8InformaticsPythonProps {
  answers: string[]; // длина 1: код задания
  attachments: Record<number, File | null>;
  onAnswerChange: (index: number, value: string) => void;
  onAttachmentChange: (index: number, file: File | null) => void;
  studentName: string;
}

const Grade8InformaticsPython = ({
  answers,
  attachments,
  onAnswerChange,
  onAttachmentChange,
  studentName,
}: Grade8InformaticsPythonProps) => {
  const { toast } = useToast();

  const notifyPaste = async (event: string) => {
    try {
      await supabase.functions.invoke("notify-copy-attempt", {
        body: { studentName, grade: "8", subject: "informatics", event },
      });
    } catch (e) {
      console.error("Failed to notify paste attempt:", e);
    }
  };

  const blockPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    toast({
      title: "⛔ Вставка запрещена",
      description: "Пиши код сам! Попытка вставки зафиксирована и отправлена преподавателю.",
      variant: "destructive",
    });
    notifyPaste("Попытка вставки кода (paste) в задание Python");
  };

  const blockDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    toast({ title: "⛔ Перетаскивание запрещено", variant: "destructive" });
    notifyPaste("Попытка перетащить файл/текст в задание Python");
  };

  const blockContext = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
  };

  const blockKeyPaste = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "v" || e.key === "V" || e.key === "м" || e.key === "М")) {
      e.preventDefault();
      toast({ title: "⛔ Ctrl+V запрещён", description: "Пиши код руками.", variant: "destructive" });
      notifyPaste("Попытка вставки через Ctrl+V в задание Python");
    }
  };

  return (
    <>
      {/* DATE BANNER */}
      <div className="rounded-lg bg-accent/15 border-2 border-accent px-4 py-3 text-center">
        <span className="text-sm uppercase tracking-wider text-muted-foreground">Дата работы</span>
        <div className="text-2xl font-bold text-accent mt-1">📅 20.04.2026</div>
      </div>

      <section>
        <h2 className="text-xl font-bold mb-2 border-b pb-2">
          Самостоятельная работа: «Генератор героя»
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          После квиза напиши <strong>одну программу</strong>, которая последовательно проходит три уровня сложности. Чем больше уровней реализуешь — тем выше оценка.
          <br />
          <span className="italic">Принимаются и f-строки (f"...{`{x}`}..."), и обычный print(a, b, ...) через запятую.</span>
        </p>

        {/* Уровень 3 */}
        <Card className="mb-3 border-l-4 border-l-accent">
          <CardContent className="pt-4 space-y-2">
            <Label className="font-bold text-accent">🟢 Уровень на «3» — Ввод и вывод</Label>
            <p className="text-sm text-muted-foreground">
              Программа должна спросить у пользователя три характеристики героя: <strong>имя</strong>, <strong>расу</strong> (например: Эльф, Орк, Человек) и <strong>уровень</strong>. Затем вывести приветствие, в котором используются все три значения.
            </p>
            <p className="text-xs text-muted-foreground italic">
              💡 Подумай: уровень — это число. В каком виде его лучше принять, чтобы потом с ним можно было считать?
            </p>
          </CardContent>
        </Card>

        {/* Уровень 4 */}
        <Card className="mb-3 border-l-4 border-l-primary">
          <CardContent className="pt-4 space-y-2">
            <Label className="font-bold text-primary">🟡 Уровень на «4» — Математика и условие</Label>
            <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
              <li>По уровню героя посчитай его <strong>здоровье</strong> по правилу: каждый уровень даёт 50 очков HP.</li>
              <li>Спроси у пользователя <strong>базовый урон</strong> героя.</li>
              <li>Посчитай <strong>итоговый урон</strong>: к базовому прибавляется бонус оружия (+15).</li>
              <li>
                Добавь <strong>расовый бонус через if / else</strong>: если раса героя — «Эльф», его здоровье увеличивается на 20. В остальных случаях остаётся как есть.
              </li>
              <li>Выведи итоговую карточку героя со всеми характеристиками.</li>
            </ol>
          </CardContent>
        </Card>

        {/* Уровень 5 */}
        <Card className="mb-3 border-l-4 border-l-destructive">
          <CardContent className="pt-4 space-y-2">
            <Label className="font-bold text-destructive">🔴 Уровень на «5» — Случайность</Label>
            <p className="text-sm text-muted-foreground">
              Подключи модуль <code>random</code> и сгенерируй герою <strong>«удачу дня»</strong> — случайное целое число от 1 до 100. Выведи его отдельной строкой в конце программы.
            </p>
            <p className="text-xs text-muted-foreground italic">
              💡 Какой модуль и какая функция тебе нужны — поищи сам или вспомни из квиза.
            </p>
          </CardContent>
        </Card>

        {/* CODE INPUT */}
        <Card>
          <CardContent className="pt-4 space-y-2">
            <Label className="font-medium">💻 Твой код (Python):</Label>
            <Textarea
              value={answers[0] ?? ""}
              onChange={(e) => onAnswerChange(0, e.target.value)}
              onPaste={blockPaste}
              onDrop={blockDrop}
              onContextMenu={blockContext}
              onKeyDown={blockKeyPaste}
              autoComplete="off"
              spellCheck={false}
              placeholder={"# Пиши код сам, вставка запрещена\n"}
              className="min-h-[400px] font-mono text-sm"
            />
            <p className="text-xs text-destructive">
              ⛔ Вставка (Ctrl+V, ПКМ, перетаскивание) заблокирована — попытки фиксируются.
            </p>
            <FileAttach
              file={attachments[0] ?? null}
              onFileChange={(f) => onAttachmentChange(0, f)}
            />
          </CardContent>
        </Card>
      </section>
    </>
  );
};

export default Grade8InformaticsPython;
