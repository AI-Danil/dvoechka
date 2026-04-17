import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import FileAttach from "@/components/FileAttach";

interface Grade8PhysicsPowerProps {
  answers: string[];
  attachments: Record<number, File | null>;
  onAnswerChange: (index: number, value: string) => void;
  onAttachmentChange: (index: number, file: File | null) => void;
}

const TASKS = [
  {
    title: "Задача 1. Работа тока",
    text: "Чему равна работа, совершённая электрическим током за 5 мин в резисторе, рассчитанном на напряжение 24 В? Сила тока в резисторе 2 А.",
  },
  {
    title: "Задача 2. Электрический паяльник",
    text: "Электрический паяльник мощностью 120 Вт рассчитан на напряжение 220 В. Найдите силу тока в обмотке паяльника и её электрическое сопротивление.",
  },
  {
    title: "Задача 3. Количество теплоты (Закон Джоуля—Ленца)",
    text: "Сила тока, протекающего по цепи сопротивлением 100 Ом, равна 2 А. Какое количество теплоты выделится в цепи за 15 мин?",
  },
  {
    title: "Задача 4. Электроплитка и стоимость энергии",
    text: "Электрическая плитка работает при силе тока 5 А и напряжении 120 В в течение 5 ч. Определите работу тока (в кВт·ч) и стоимость израсходованной электроэнергии, считая, что тариф составляет 5 р. за 1 кВт·ч.",
  },
  {
    title: "Задача 5. Спираль утюга",
    text: "Спираль утюга мощностью 1 кВт изготовлена из нихромовой проволоки площадью поперечного сечения 0,1 мм². Утюг включается в сеть напряжением 220 В. Определите длину проволоки (удельное электрическое сопротивление нихрома равно 1,1 Ом·мм²/м).",
  },
  {
    title: "Задача 6. Укороченная спираль",
    text: "Перегоревшую спираль электрического утюга мощностью 1,5 кВт укоротили на треть. Какой при этом стала мощность утюга?",
  },
];

const Grade8PhysicsPower = ({ answers, attachments, onAnswerChange, onAttachmentChange }: Grade8PhysicsPowerProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Контрольная работа по физике (8 класс)</CardTitle>
          <p className="text-sm text-muted-foreground" style={{ userSelect: "none" }}>
            Тема: Работа и мощность электрического тока. Закон Джоуля—Ленца. Нагревательные приборы.
          </p>
          <p className="text-xs text-muted-foreground mt-2" style={{ userSelect: "none" }}>
            Запишите Дано, переведите величины в СИ и покажите ход решения. Можно прикрепить фото записей из тетради.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {TASKS.map((t, i) => (
            <div key={i} className="space-y-2">
              <Label className="font-semibold">{t.title}</Label>
              <p className="text-sm text-muted-foreground" style={{ userSelect: "none" }}>
                {t.text}
              </p>
              <Textarea
                placeholder="Ваш ответ..."
                value={answers[i]}
                onChange={(e) => onAnswerChange(i, e.target.value)}
                rows={4}
              />
              <FileAttach
                file={attachments[i] ?? null}
                onFileChange={(file) => onAttachmentChange(i, file)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default Grade8PhysicsPower;
