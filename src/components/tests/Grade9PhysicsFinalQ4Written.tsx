/**
 * Физика, 9 класс — Часть 2 «Расчётные задачи».
 *
 * 6 задач, по одной на экран. Между задачами — кнопки «Назад/Далее».
 * На каждом экране есть чекбокс «🤷 Не знаю / пропустить (без штрафа)».
 *
 * Состояние хранится в Index.tsx как массив `{ text, skipped }[]` длиной 6.
 * Автосохранение делает родитель — мы тут только UI.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface PhysQ4Answer {
  text: string;
  skipped: boolean;
}

export const PHYS9_FINAL_Q4_TASKS = [
  {
    title: "Задача 1. Закон радиоактивного распада",
    text:
      "В лаборатории имеется 40 мг радиоактивного изотопа иода-131. Период полураспада изотопа — 8 суток. Какая масса этого изотопа претерпит распад (исчезнет) через 24 дня?",
    expected: "35 мг (за 3 периода полураспада останется 40/8 = 5 мг; распадётся 40−5 = 35 мг).",
    gradingHint:
      "Засчитывать: «35 мг», «35 миллиграммов», «35» с пояснением. НЕ засчитывать ответ «5 мг» — это то, что ОСТАЛОСЬ, а спрашивают, что РАСПАЛОСЬ.",
  },
  {
    title: "Задача 2. Дозиметрия",
    text:
      "Сотрудник лаборатории массой 80 кг подвергся воздействию α-излучения. Организм поглотил 0,4 Дж энергии. Коэффициент качества α-излучения K = 20. Найдите эквивалентную дозу H в зивертах.",
    expected: "H = 0,1 Зв. Поглощённая доза D = E/m = 0,4/80 = 0,005 Гр; H = D·K = 0,005·20 = 0,1 Зв.",
    gradingHint:
      "Правильный ответ — 0,1 Зв (или 100 мЗв). Засчитывать промежуточный шаг D = 0,005 Гр как частично верный, если итог не доведён.",
  },
  {
    title: "Задача 3. Ядерная бухгалтерия",
    text:
      "Ядро ²⁴⁴₉₄Pu претерпевает серию превращений: сначала два α-распада, затем один β-распад. Определите массовое и зарядовое число конечного ядра. Назовите элемент.",
    expected:
      "Конечное ядро: ²³⁶₉₁Pa (протактиний). Масса: 244 − 2·4 = 236. Заряд: 94 − 2·2 − (−1) = 94 − 4 + 1 = 91.",
    gradingHint:
      "Полностью верно — A=236, Z=91, протактиний (Pa). Если назвал только числа A=236 Z=91 без элемента — частично (0.5).",
  },
  {
    title: "Задача 4. Энергия связи (внимание к условию!)",
    text:
      "Определите энергию связи ядра изотопа кислорода ¹⁶₈O. Дано: масса протона m_p ≈ 1,0073 а.е.м., масса нейтрона m_n ≈ 1,0087 а.е.м. Скорость света c = 3·10⁸ м/с. (1 а.е.м. = 1,66·10⁻²⁷ кг.)",
    expected:
      "Задачу решить НЕЛЬЗЯ: в условии не указана масса готового ядра кислорода M_я. Без неё нельзя посчитать дефект массы Δm = (Z·m_p + N·m_n) − M_я.",
    gradingHint:
      "ВАЖНО: правильный ответ — «задача нерешаема, не хватает данных (массы ядра ¹⁶O)». Любой готовый числовой ответ (~127 МэВ, 2·10⁻¹¹ Дж и т. п.) — НЕВЕРНО, потому что для него ученик подтянул табличную массу извне (это признак списывания у ИИ). Засчитать только явное указание на нехватку M_я.",
  },
  {
    title: "Задача 5. Уравнение ядерной реакции",
    text:
      "В 1919 году Резерфорд провёл первую искусственную ядерную реакцию: ¹⁴₇N + ⁴₂He → ¹⁷₈O + ?. Пользуясь законами сохранения, определите массовое и зарядовое число неизвестной частицы и назовите её.",
    expected: "A=1, Z=1 — это протон ¹₁p (¹₁H).",
    gradingHint: "Полный ответ: A=1, Z=1, протон (или ядро водорода). Без названия частицы — частично 0.5.",
  },
  {
    title: "Задача 6. Связь массы и энергии",
    text:
      "При вспышке на Солнце выделилась энергия 1,8·10¹⁵ Дж. На сколько граммов уменьшилась масса солнечного вещества (дефект массы)? c = 3·10⁸ м/с.",
    expected:
      "Δm = E/c² = 1,8·10¹⁵ / (9·10¹⁶) = 0,02 кг = 20 г.",
    gradingHint:
      "Правильно: 20 граммов (= 0,02 кг). Засчитывать с округлением. Ошибка в порядке (0,2 г, 200 г, 2 кг и т. п.) — неверно.",
  },
];

interface Props {
  answers: PhysQ4Answer[]; // длина = 6
  onAnswerChange: (index: number, value: PhysQ4Answer) => void;
}

const Grade9PhysicsFinalQ4Written = ({ answers, onAnswerChange }: Props) => {
  const [step, setStep] = useState(0);
  const total = PHYS9_FINAL_Q4_TASKS.length;
  const task = PHYS9_FINAL_Q4_TASKS[step];
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
            id={`skip-${step}`}
            checked={ans.skipped}
            onCheckedChange={(v) => setSkipped(!!v)}
          />
          <Label htmlFor={`skip-${step}`} className="text-sm cursor-pointer">
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

export default Grade9PhysicsFinalQ4Written;
