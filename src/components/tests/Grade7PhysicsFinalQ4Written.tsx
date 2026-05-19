/**
 * Физика, 7 класс — Часть 2 «Расчётные задачи» для итоговой Q4.
 *
 * 6 задач, по одной на экран. На каждом экране есть чекбокс
 * «🤷 Не знаю / пропустить (без штрафа)».
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { PhysQ4Answer } from "@/components/tests/Grade9PhysicsFinalQ4Written";

export const PHYS7_FINAL_Q4_TASKS = [
  {
    title: "Задача 1 (Базовая). Работа крана",
    text:
      "Строительный кран равномерно поднимает железобетонную плиту массой 2 тонны на высоту 15 метров. Какую механическую работу совершает двигатель крана? (g = 10 Н/кг.)",
    expected:
      "A = F·s = m·g·h = 2000·10·15 = 300 000 Дж = 300 кДж.",
    gradingHint:
      "Правильный ответ — 300 000 Дж или 300 кДж. Засчитывать запись с верной формулой A = mgh и переводом тонн в кг.",
  },
  {
    title: "Задача 2 (Базовая). Мощность вентилятора",
    text:
      "Двигатель комнатного вентилятора за 5 минут совершил работу, равную 18 000 Дж. Вычислите мощность этого двигателя.",
    expected:
      "N = A/t = 18000 / 300 = 60 Вт. Время обязательно перевести в секунды: 5 мин = 300 с.",
    gradingHint:
      "Верно: 60 Вт. Главная проверка — перевод 5 мин → 300 с. Ответ 3600 Вт (без перевода времени) — НЕВЕРНО.",
  },
  {
    title: "Задача 3 (Средняя). Рычаг",
    text:
      "К концам невесомого рычага приложены силы 20 Н и 80 Н. Рычаг находится в равновесии. Определите длину короткого плеча, если длина длинного плеча равна 60 см.",
    expected:
      "Правило рычага: F₁·l₁ = F₂·l₂ → l₂ = (20·60)/80 = 15 см. Короткое плечо принадлежит большей силе (80 Н).",
    gradingHint:
      "Правильный ответ — 15 см. Записать в любом виде (15 см, 0,15 м). Если перепутаны плечи и получено 240 см — неверно.",
  },
  {
    title: "Задача 4 (Средняя). Кинетическая энергия мяча",
    text:
      "Спортивный мяч массой 400 граммов летит со скоростью 15 м/с. Вычислите кинетическую энергию летящего мяча.",
    expected:
      "Eₖ = m·v²/2 = 0,4·15²/2 = 0,4·225/2 = 45 Дж. Массу обязательно перевести в кг: 400 г = 0,4 кг.",
    gradingHint:
      "Верно: 45 Дж. Главная проверка — перевод массы 400 г → 0,4 кг. Без перевода получится 45 000 Дж — неверно.",
  },
  {
    title: "Задача 5 (Повышенная). КПД наклонной плоскости",
    text:
      "Рабочий поднимает ящик массой 60 кг в кузов грузовика на высоту 1,5 метра с помощью наклонной доски длиной 4 метра. При этом он прикладывает силу 300 Н, направленную параллельно доске. Рассчитайте КПД этой наклонной плоскости. (g = 10 Н/кг.)",
    expected:
      "A_полезн = m·g·h = 60·10·1,5 = 900 Дж. A_затрач = F·l = 300·4 = 1200 Дж. КПД = A_п / A_з · 100 % = 900/1200·100 % = 75 %.",
    gradingHint:
      "Правильный ответ — 75 %. Засчитывать с округлением (0,75). Если перепутаны полезная и затраченная работы и получено 133 % — неверно (КПД > 100 % невозможен).",
  },
  {
    title: "Задача 6 (Сложная). Закон сохранения энергии",
    text:
      "Камень массой 3 кг падает с балкона высотой 20 метров. Сопротивление воздуха отсутствует. Вычислите кинетическую энергию этого камня в тот момент, когда он пролетит половину пути и окажется на высоте 10 метров от земли.",
    expected:
      "Полная энергия сохраняется: E_полн = m·g·h_нач = 3·10·20 = 600 Дж. На высоте 10 м: E_п = 3·10·10 = 300 Дж → E_к = 600 − 300 = 300 Дж.",
    gradingHint:
      "Правильный ответ — 300 Дж. Засчитывать любое корректное обоснование через ЗСЭ или через v² = 2g·Δh.",
  },
];

interface Props {
  answers: PhysQ4Answer[]; // длина = 6
  onAnswerChange: (index: number, value: PhysQ4Answer) => void;
}

const Grade7PhysicsFinalQ4Written = ({ answers, onAnswerChange }: Props) => {
  const [step, setStep] = useState(0);
  const total = PHYS7_FINAL_Q4_TASKS.length;
  const task = PHYS7_FINAL_Q4_TASKS[step];
  const ans = answers[step] ?? { text: "", skipped: false };

  const setText = (v: string) => onAnswerChange(step, { text: v, skipped: false });
  const setSkipped = (v: boolean) =>
    onAnswerChange(step, { text: v ? "" : ans.text, skipped: v });

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">
          Часть 2. Расчётные задачи · {step + 1} из {total}
        </CardTitle>
        <p className="text-xs text-muted-foreground" style={{ userSelect: "none" }}>
          ✅ Правильный ответ — баллы. ❌ Неверный — штраф ½ балла. 🤷 «Не знаю» — 0 (без штрафа).
          Решайте по силам — лучше пропустить, чем ошибиться.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="font-semibold text-base">{task.title}</Label>
          <p className="text-sm whitespace-pre-line" style={{ userSelect: "none" }}>
            {task.text}
          </p>
        </div>

        <Textarea
          value={ans.text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Запишите Дано, формулы, вычисления и ответ…"
          rows={8}
          disabled={ans.skipped}
          className="font-mono text-sm"
        />

        <div className="flex items-center gap-2">
          <Checkbox
            id={`skip7-${step}`}
            checked={ans.skipped}
            onCheckedChange={(v) => setSkipped(!!v)}
          />
          <Label htmlFor={`skip7-${step}`} className="text-sm cursor-pointer">
            🤷 Не знаю / пропустить эту задачу (без штрафа)
          </Label>
        </div>

        <div className="flex justify-between items-center pt-2 gap-2">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            ← Назад
          </Button>
          <span className="text-xs text-muted-foreground">
            {step + 1} / {total}
          </span>
          <Button
            onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
            disabled={step === total - 1}
          >
            Далее →
          </Button>
        </div>

        {step === total - 1 && (
          <p className="text-xs text-center text-muted-foreground pt-2">
            Когда закончите — нажмите «Завершить и отправить ответы» внизу страницы.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default Grade7PhysicsFinalQ4Written;
