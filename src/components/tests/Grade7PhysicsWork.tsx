import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import FileAttach from "@/components/FileAttach";
import type { QuizQuestion } from "@/components/Quiz";

interface Grade7PhysicsWorkProps {
  answers: string[];
  attachments: Record<number, File | null>;
  onAnswerChange: (index: number, value: string) => void;
  onAttachmentChange: (index: number, file: File | null) => void;
}

const noSelect = { userSelect: "none" as const };

export const WORK_POWER_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    q: "Какие два условия должны одновременно выполняться, чтобы совершалась механическая работа?",
    options: [
      "Только сила, перемещение не нужно",
      "Только перемещение, сила не нужна",
      "Сила и перемещение в направлении этой силы",
      "Сила, направленная перпендикулярно перемещению",
    ],
    correct: 2,
  },
  {
    q: "Какая формула и единица измерения механической работы (когда сила сонаправлена движению)?",
    options: [
      "A = F / s, измеряется в Н/м",
      "A = F · s, измеряется в Джоулях (Дж)",
      "A = m · g, измеряется в Ньютонах (Н)",
      "A = P · t, измеряется в Ваттах (Вт)",
    ],
    correct: 1,
  },
  {
    q: "Что характеризует физическая величина «мощность»?",
    options: [
      "Запас энергии тела",
      "Быстроту совершения работы (работу за единицу времени)",
      "Силу тяжести, действующую на тело",
      "Путь, пройденный за единицу времени",
    ],
    correct: 1,
  },
  {
    q: "Как называется единица мощности в СИ и в честь кого она названа?",
    options: [
      "Ньютон, в честь Исаака Ньютона",
      "Джоуль, в честь Джеймса Джоуля",
      "Ватт, в честь инженера Джеймса Уатта",
      "Паскаль, в честь Блеза Паскаля",
    ],
    correct: 2,
  },
  {
    q: "Чему равна работа, если вы равномерно несёте рюкзак по горизонтальному коридору?",
    options: [
      "Работа равна весу рюкзака, умноженному на путь",
      "Работа равна нулю — сила тяжести перпендикулярна перемещению",
      "Работа равна m · g · s",
      "Работа отрицательна, так как рюкзак тянет вниз",
    ],
    correct: 1,
  },
];

const Grade7PhysicsWork = ({ answers, attachments, onAnswerChange, onAttachmentChange }: Grade7PhysicsWorkProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Проверочная работа по физике (7 класс)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Тема: «Механическая работа и Мощность». Перед решением переведите все значения в СИ.
            Ускорение свободного падения примите g = 10 Н/кг.
          </p>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Расчётные задачи</CardTitle>
          <p className="text-sm text-muted-foreground">
            Не забывайте переводить все значения в СИ. g = 10 Н/кг.
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* 1 */}
          <div className="space-y-2">
            <Label className="font-semibold">Задача 1. Глубина колодца</Label>
            <div className="text-sm text-muted-foreground select-none" style={noSelect}>
              <p>
                При равномерном подъёме из колодца ведра воды массой 10 кг была совершена работа 650 Дж. Какова глубина этого колодца?
              </p>
            </div>
            <Textarea placeholder="Дано, решение..." value={answers[0]} onChange={(e) => onAnswerChange(0, e.target.value)} rows={5} />
            <FileAttach file={attachments[0] || null} onFileChange={(f) => onAttachmentChange(0, f)} />
          </div>

          {/* 2 */}
          <div className="space-y-2">
            <Label className="font-semibold">Задача 2. Подъёмный кран</Label>
            <div className="text-sm text-muted-foreground select-none" style={noSelect}>
              <p>
                Какую работу совершает подъёмный кран при равномерном подъёме строительного груза массой 5 тонн на высоту 8 метров?
              </p>
            </div>
            <Textarea placeholder="Дано, решение..." value={answers[1]} onChange={(e) => onAnswerChange(1, e.target.value)} rows={5} />
            <FileAttach file={attachments[1] || null} onFileChange={(f) => onAttachmentChange(1, f)} />
          </div>

          {/* 3 */}
          <div className="space-y-2">
            <Label className="font-semibold">Задача 3. Мощность лифта</Label>
            <div className="text-sm text-muted-foreground select-none" style={noSelect}>
              <p>
                Определите мощность двигателя, равномерно поднимающего кабину лифта массой 300 кг на высоту 12 метров за 30 секунд.
              </p>
            </div>
            <Textarea placeholder="Дано, решение..." value={answers[2]} onChange={(e) => onAnswerChange(2, e.target.value)} rows={5} />
            <FileAttach file={attachments[2] || null} onFileChange={(f) => onAttachmentChange(2, f)} />
          </div>

          {/* 4 */}
          <div className="space-y-2">
            <Label className="font-semibold">Задача 4. Электрическая мясорубка</Label>
            <div className="text-sm text-muted-foreground select-none" style={noSelect}>
              <p>
                Какую механическую работу совершит двигатель электрической мясорубки мощностью 800 Вт, если она будет непрерывно работать в течение 20 минут?
              </p>
            </div>
            <Textarea placeholder="Дано, решение..." value={answers[3]} onChange={(e) => onAnswerChange(3, e.target.value)} rows={5} />
            <FileAttach file={attachments[3] || null} onFileChange={(f) => onAttachmentChange(3, f)} />
          </div>

          {/* 5 */}
          <div className="space-y-2">
            <Label className="font-semibold">Задача 5. Трамвай «Витязь-М»</Label>
            <div className="text-sm text-muted-foreground select-none" style={noSelect}>
              <p>
                Мощность электродвигателей современного трамвая «Витязь-М» равна 450 кВт. Какую гигантскую работу совершат эти двигатели за 3 часа непрерывного движения по маршруту?
              </p>
            </div>
            <Textarea placeholder="Дано, решение..." value={answers[4]} onChange={(e) => onAnswerChange(4, e.target.value)} rows={5} />
            <FileAttach file={attachments[4] || null} onFileChange={(f) => onAttachmentChange(4, f)} />
          </div>

          {/* 6 ⭐ */}
          <div className="space-y-2">
            <Label className="font-semibold">⭐ Задача 6 (Уровень «Эксперт»). Санки под углом</Label>
            <div className="text-sm text-muted-foreground select-none" style={noSelect}>
              <p>
                Мальчик тянет санки за верёвку с силой 100 Ньютонов. Верёвка направлена косо вверх, образуя угол 60° к поверхности земли (cos 60° = 0,5). Санки проехали по прямой ровно 40 метров. Какую полезную механическую работу совершил мальчик?
              </p>
            </div>
            <Textarea placeholder="Дано, решение..." value={answers[5]} onChange={(e) => onAnswerChange(5, e.target.value)} rows={5} />
            <FileAttach file={attachments[5] || null} onFileChange={(f) => onAttachmentChange(5, f)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Grade7PhysicsWork;
