import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import FileAttach from "@/components/FileAttach";

interface Grade7PhysicsProps {
  answers: string[];
  attachments: Record<number, File | null>;
  onAnswerChange: (index: number, value: string) => void;
  onAttachmentChange: (index: number, file: File | null) => void;
}

const Grade7Physics = ({ answers, attachments, onAnswerChange, onAttachmentChange }: Grade7PhysicsProps) => {
  return (
    <div className="space-y-6">
      {/* ═══════ ЧАСТЬ 1. АНАЛИЗ И КОНСТРУИРОВАНИЕ ═══════ */}
      <Card>
        <CardHeader>
          <CardTitle>Часть 1. Анализ и конструирование (Качественные задачи)</CardTitle>
          <p className="text-sm text-muted-foreground">
            В этих заданиях недостаточно написать формулу. Ваша задача — доказать, что вы понимаете, как физика работает в реальной жизни.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 1 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 1. Мраморная колонна — ошибка ученика</Label>
            <div className="text-sm text-muted-foreground select-none" style={{ userSelect: "none" }}>
              <p>
                Ученик решал задачу: «С какой силой давит на пол мраморная колонна объемом 2 м³?». Ответ ученика в тетради: «Плотность мрамора 2700 кг/м³. Масса колонны m = 2700 · 2 = 5400 кг. Значит, вес колонны равен 5400 Н. Давление направлено строго вниз».
              </p>
              <p className="mt-2 font-medium">
                Найдите одну грубую физическую ошибку в расчетах и одну неточность в формулировках терминов. Напишите правильное решение.
              </p>
            </div>
            <Textarea placeholder="Ваш ответ..." value={answers[0]} onChange={(e) => onAnswerChange(0, e.target.value)} rows={5} />
            <FileAttach file={attachments[0] || null} onFileChange={(f) => onAttachmentChange(0, f)} />
          </div>

          {/* 2 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 2. Атмосферное давление — опыт с банкой</Label>
            <div className="text-sm text-muted-foreground select-none" style={{ userSelect: "none" }}>
              <p>
                У вас есть только стеклянная банка, вода и лист плотной гладкой бумаги. Распишите пошагово, как с помощью этих трех вещей доказать существование атмосферного давления.
              </p>
              <p className="mt-1">
                Почему этот физический фокус не получится, если в дне банки будет маленькая трещина?
              </p>
            </div>
            <Textarea placeholder="Ваш ответ..." value={answers[1]} onChange={(e) => onAnswerChange(1, e.target.value)} rows={5} />
            <FileAttach file={attachments[1] || null} onFileChange={(f) => onAttachmentChange(1, f)} />
          </div>

          {/* 3 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 3. Архимедова сила — почему строго вверх?</Label>
            <div className="text-sm text-muted-foreground select-none" style={{ userSelect: "none" }}>
              <p>
                Известно, что жидкость давит на тело, погружённое в неё, сверху, снизу и с боков. Почему же в таком случае выталкивающая (архимедова) сила всегда направлена строго вертикально вверх?
              </p>
            </div>
            <Textarea placeholder="Ваш ответ..." value={answers[2]} onChange={(e) => onAnswerChange(2, e.target.value)} rows={5} />
            <FileAttach file={attachments[2] || null} onFileChange={(f) => onAttachmentChange(2, f)} />
          </div>

          {/* 4 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 4. Варёное vs сырое яйцо — закон Паскаля</Label>
            <div className="text-sm text-muted-foreground select-none" style={{ userSelect: "none" }}>
              <p>
                При выстреле из мелкокалиберной винтовки в варёное яйцо в нём образуется аккуратное отверстие. Если выстрелить в сырое яйцо, то оно разлетится вдребезги.
              </p>
              <p className="mt-1 font-medium">
                Объясните это явление с точки зрения физики.
              </p>
            </div>
            <Textarea placeholder="Ваш ответ..." value={answers[3]} onChange={(e) => onAnswerChange(3, e.target.value)} rows={5} />
            <FileAttach file={attachments[3] || null} onFileChange={(f) => onAttachmentChange(3, f)} />
          </div>
        </CardContent>
      </Card>

      {/* ═══════ ЧАСТЬ 2. РАСЧЁТНЫЕ И ГРАФИЧЕСКИЕ ЗАДАЧИ ═══════ */}
      <Card>
        <CardHeader>
          <CardTitle>Часть 2. Расчётные и графические задачи</CardTitle>
          <p className="text-sm text-muted-foreground">
            Запишите Дано, переведите величины в СИ и покажите логику решения.
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Задача 1 (базовый) */}
          <div className="space-y-2">
            <Label className="font-semibold">Задача 1 (Базовый уровень). Автомобиль на льду</Label>
            <div className="text-sm text-muted-foreground select-none" style={{ userSelect: "none" }}>
              <p>
                Известно, что зимний лед выдерживает давление 90 кПа. Сможет ли по замерзшему озеру безопасно проехать автомобиль массой 1,5 тонны, если в его багажнике лежит груз 100 кг, а в салоне сидят три человека общей массой 200 кг? Общая площадь соприкосновения четырех шин с дорогой составляет 0,06 м². Площадь самого озера 5 км².
              </p>
              <p className="mt-1 font-medium">Обоснуйте ответ расчетами.</p>
            </div>
            <Textarea placeholder="Ваш ответ (Дано, решение)..." value={answers[4]} onChange={(e) => onAnswerChange(4, e.target.value)} rows={6} />
            <FileAttach file={attachments[4] || null} onFileChange={(f) => onAttachmentChange(4, f)} />
          </div>

          {/* Задача 2 (базовый) */}
          <div className="space-y-2">
            <Label className="font-semibold">Задача 2 (Базовый уровень). Гидравлический пресс</Label>
            <div className="text-sm text-muted-foreground select-none" style={{ userSelect: "none" }}>
              <p>
                Площадь малого поршня гидравлического пресса 12 см², на него действует сила 110 Н. Площадь большого поршня 144 см². Какая сила действует на большой поршень?
              </p>
            </div>
            <Textarea placeholder="Ваш ответ (Дано, решение)..." value={answers[5]} onChange={(e) => onAnswerChange(5, e.target.value)} rows={5} />
            <FileAttach file={attachments[5] || null} onFileChange={(f) => onAttachmentChange(5, f)} />
          </div>

          {/* Задача 3 (средний) */}
          <div className="space-y-2">
            <Label className="font-semibold">Задача 3 (Средний уровень). Кубик на дне аквариума</Label>
            <div className="text-sm text-muted-foreground select-none" style={{ userSelect: "none" }}>
              <p>
                На дне аквариума лежит сплошной металлический кубик с ребром 10 см. Ученик зацепил его динамометром. Динамометр показал, что для равномерного отрыва и подъема кубика в воде нужно приложить силу 68 Н.
              </p>
              <p className="mt-1 font-medium">
                Определите массу кубика и выясните по таблице плотностей учебника, из какого металла он сделан. (Принять g = 10 Н/кг, плотность воды 1000 кг/м³).
              </p>
            </div>
            <Textarea placeholder="Ваш ответ (Дано, решение)..." value={answers[6]} onChange={(e) => onAnswerChange(6, e.target.value)} rows={6} />
            <FileAttach file={attachments[6] || null} onFileChange={(f) => onAttachmentChange(6, f)} />
          </div>

          {/* Задача 4 — пропущена в оригинале, нумерация продолжена */}

          {/* Задача 5 (нормальный) */}
          <div className="space-y-2">
            <Label className="font-semibold">Задача 4 (Нормальный уровень). Атмосферное давление на шприц</Label>
            <div className="text-sm text-muted-foreground select-none" style={{ userSelect: "none" }}>
              <p>
                Вычислите силу атмосферного давления на поршень медицинского шприца площадью 3 см². Атмосферное давление примите равным 100 кПа.
              </p>
            </div>
            <Textarea placeholder="Ваш ответ (Дано, решение)..." value={answers[7]} onChange={(e) => onAnswerChange(7, e.target.value)} rows={5} />
            <FileAttach file={attachments[7] || null} onFileChange={(f) => onAttachmentChange(7, f)} />
          </div>

          {/* Задача 6 (сложный) */}
          <div className="space-y-2">
            <Label className="font-semibold">Задача 5 (Сложный уровень). Льдина на воде</Label>
            <div className="text-sm text-muted-foreground select-none" style={{ userSelect: "none" }}>
              <p>
                Кусок льда объёмом 1 м³ плавает на поверхности воды. Определите объём подводной части льдины. Плотность льда 900 кг/м³, плотность воды 1000 кг/м³.
              </p>
            </div>
            <Textarea placeholder="Ваш ответ (Дано, решение)..." value={answers[8]} onChange={(e) => onAnswerChange(8, e.target.value)} rows={5} />
            <FileAttach file={attachments[8] || null} onFileChange={(f) => onAttachmentChange(8, f)} />
          </div>

          {/* Задача 7 (со звёздочкой) */}
          <div className="space-y-2">
            <Label className="font-semibold">⭐ Задача 6 (Со звёздочкой). U-образная трубка</Label>
            <div className="text-sm text-muted-foreground select-none" style={{ userSelect: "none" }}>
              <p>
                Ученик налил в прозрачную U-образную трубку воду. Затем в правое колено он аккуратно долил немного машинного масла (жидкости не смешались). В тетради для лабораторных работ он сделал вывод: «Так как это сообщающиеся сосуды, по закону физики верхние уровни жидкостей в правом и левом колене обязательно установятся строго на одной горизонтальной линии».
              </p>
              <p className="mt-1 font-medium">
                Прав ли ученик? Если нет, то в каком колене (где сверху масло или где только вода) уровень поверхности будет физически выше и почему? Сделайте в тетради схематичный рисунок, покажите границу раздела жидкостей и обоснуйте свой ответ, используя формулу гидростатического давления.
              </p>
              <p className="mt-1 italic">Если осталось время.</p>
            </div>
            <Textarea placeholder="Ваш ответ (решение + рисунок в файле)..." value={answers[9]} onChange={(e) => onAnswerChange(9, e.target.value)} rows={6} />
            <FileAttach file={attachments[9] || null} onFileChange={(f) => onAttachmentChange(9, f)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Grade7Physics;
