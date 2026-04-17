import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import FileAttach from "@/components/FileAttach";

interface Grade7PhysicsWorkProps {
  answers: string[];
  attachments: Record<number, File | null>;
  onAnswerChange: (index: number, value: string) => void;
  onAttachmentChange: (index: number, file: File | null) => void;
}

const noSelect = { userSelect: "none" as const };

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

      {/* ═══════ ЧАСТЬ 1. ТЕОРИЯ ═══════ */}
      <Card>
        <CardHeader>
          <CardTitle>Часть 1. Теоретические вопросы</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 1 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 1. Условия совершения работы</Label>
            <div className="text-sm text-muted-foreground select-none" style={noSelect}>
              <p>
                Какие два «железных» условия должны выполняться одновременно, чтобы с точки зрения физики совершалась механическая работа?
              </p>
            </div>
            <Textarea placeholder="Ваш ответ..." value={answers[0]} onChange={(e) => onAnswerChange(0, e.target.value)} rows={4} />
            <FileAttach file={attachments[0] || null} onFileChange={(f) => onAttachmentChange(0, f)} />
          </div>

          {/* 2 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 2. Формула работы</Label>
            <div className="text-sm text-muted-foreground select-none" style={noSelect}>
              <p>
                Запишите основную формулу для вычисления механической работы (когда направление силы и движения совпадают) и укажите, в каких единицах она измеряется.
              </p>
            </div>
            <Textarea placeholder="Ваш ответ..." value={answers[1]} onChange={(e) => onAnswerChange(1, e.target.value)} rows={4} />
            <FileAttach file={attachments[1] || null} onFileChange={(f) => onAttachmentChange(1, f)} />
          </div>

          {/* 3 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 3. Мощность</Label>
            <div className="text-sm text-muted-foreground select-none" style={noSelect}>
              <p>
                Что характеризует физическая величина «мощность» и по какой формуле она рассчитывается?
              </p>
            </div>
            <Textarea placeholder="Ваш ответ..." value={answers[2]} onChange={(e) => onAnswerChange(2, e.target.value)} rows={4} />
            <FileAttach file={attachments[2] || null} onFileChange={(f) => onAttachmentChange(2, f)} />
          </div>

          {/* 4 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 4. Единица мощности</Label>
            <div className="text-sm text-muted-foreground select-none" style={noSelect}>
              <p>
                Как называется единица измерения мощности в системе СИ и в честь какого инженера она получила своё название?
              </p>
            </div>
            <Textarea placeholder="Ваш ответ..." value={answers[3]} onChange={(e) => onAnswerChange(3, e.target.value)} rows={4} />
            <FileAttach file={attachments[3] || null} onFileChange={(f) => onAttachmentChange(3, f)} />
          </div>

          {/* 5 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 5. Рюкзак в коридоре</Label>
            <div className="text-sm text-muted-foreground select-none" style={noSelect}>
              <p>
                Чему равна механическая работа, если вы несёте тяжёлый рюкзак в руках и равномерно идёте по прямому горизонтальному коридору? Кратко объясните почему.
              </p>
            </div>
            <Textarea placeholder="Ваш ответ..." value={answers[4]} onChange={(e) => onAnswerChange(4, e.target.value)} rows={4} />
            <FileAttach file={attachments[4] || null} onFileChange={(f) => onAttachmentChange(4, f)} />
          </div>
        </CardContent>
      </Card>

      {/* ═══════ ЧАСТЬ 2. ЗАДАЧИ ═══════ */}
      <Card>
        <CardHeader>
          <CardTitle>Часть 2. Расчётные задачи</CardTitle>
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
            <Textarea placeholder="Дано, решение..." value={answers[5]} onChange={(e) => onAnswerChange(5, e.target.value)} rows={5} />
            <FileAttach file={attachments[5] || null} onFileChange={(f) => onAttachmentChange(5, f)} />
          </div>

          {/* 2 */}
          <div className="space-y-2">
            <Label className="font-semibold">Задача 2. Подъёмный кран</Label>
            <div className="text-sm text-muted-foreground select-none" style={noSelect}>
              <p>
                Какую работу совершает подъёмный кран при равномерном подъёме строительного груза массой 5 тонн на высоту 8 метров?
              </p>
            </div>
            <Textarea placeholder="Дано, решение..." value={answers[6]} onChange={(e) => onAnswerChange(6, e.target.value)} rows={5} />
            <FileAttach file={attachments[6] || null} onFileChange={(f) => onAttachmentChange(6, f)} />
          </div>

          {/* 3 */}
          <div className="space-y-2">
            <Label className="font-semibold">Задача 3. Мощность лифта</Label>
            <div className="text-sm text-muted-foreground select-none" style={noSelect}>
              <p>
                Определите мощность двигателя, равномерно поднимающего кабину лифта массой 300 кг на высоту 12 метров за 30 секунд.
              </p>
            </div>
            <Textarea placeholder="Дано, решение..." value={answers[7]} onChange={(e) => onAnswerChange(7, e.target.value)} rows={5} />
            <FileAttach file={attachments[7] || null} onFileChange={(f) => onAttachmentChange(7, f)} />
          </div>

          {/* 4 */}
          <div className="space-y-2">
            <Label className="font-semibold">Задача 4. Электрическая мясорубка</Label>
            <div className="text-sm text-muted-foreground select-none" style={noSelect}>
              <p>
                Какую механическую работу совершит двигатель электрической мясорубки мощностью 800 Вт, если она будет непрерывно работать в течение 20 минут?
              </p>
            </div>
            <Textarea placeholder="Дано, решение..." value={answers[8]} onChange={(e) => onAnswerChange(8, e.target.value)} rows={5} />
            <FileAttach file={attachments[8] || null} onFileChange={(f) => onAttachmentChange(8, f)} />
          </div>

          {/* 5 */}
          <div className="space-y-2">
            <Label className="font-semibold">Задача 5. Трамвай «Витязь-М»</Label>
            <div className="text-sm text-muted-foreground select-none" style={noSelect}>
              <p>
                Мощность электродвигателей современного трамвая «Витязь-М» равна 450 кВт. Какую гигантскую работу совершат эти двигатели за 3 часа непрерывного движения по маршруту?
              </p>
            </div>
            <Textarea placeholder="Дано, решение..." value={answers[9]} onChange={(e) => onAnswerChange(9, e.target.value)} rows={5} />
            <FileAttach file={attachments[9] || null} onFileChange={(f) => onAttachmentChange(9, f)} />
          </div>

          {/* 6 ⭐ */}
          <div className="space-y-2">
            <Label className="font-semibold">⭐ Задача 6 (Уровень «Эксперт»). Санки под углом</Label>
            <div className="text-sm text-muted-foreground select-none" style={noSelect}>
              <p>
                Мальчик тянет санки за верёвку с силой 100 Ньютонов. Верёвка направлена косо вверх, образуя угол 60° к поверхности земли (cos 60° = 0,5). Санки проехали по прямой ровно 40 метров. Какую полезную механическую работу совершил мальчик?
              </p>
            </div>
            <Textarea placeholder="Дано, решение..." value={answers[10]} onChange={(e) => onAnswerChange(10, e.target.value)} rows={5} />
            <FileAttach file={attachments[10] || null} onFileChange={(f) => onAttachmentChange(10, f)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Grade7PhysicsWork;
