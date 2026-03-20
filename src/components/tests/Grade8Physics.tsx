import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import FileAttach from "@/components/FileAttach";

interface Grade8PhysicsProps {
  answers: string[];
  attachments: Record<number, File | null>;
  onAnswerChange: (index: number, value: string) => void;
  onAttachmentChange: (index: number, file: File | null) => void;
}

const Grade8Physics = ({ answers, attachments, onAnswerChange, onAttachmentChange }: Grade8PhysicsProps) => {
  return (
    <div className="space-y-6">
      {/* ═══════ ЧАСТЬ 1. ТЕОРЕТИЧЕСКИЕ ВОПРОСЫ ═══════ */}
      <Card>
        <CardHeader>
          <CardTitle>Часть 1. Теоретические вопросы</CardTitle>
          <p className="text-sm text-muted-foreground">Кратко и чётко ответьте на следующие вопросы.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 1 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 1. Электрический ток</Label>
            <p className="text-sm text-muted-foreground" style={{ userSelect: "none" }}>
              Что такое электрический ток? Назовите два главных условия, необходимых для его существования в цепи.
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[0]} onChange={(e) => onAnswerChange(0, e.target.value)} rows={4} />
          </div>

          {/* 2 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 2. Сила тока</Label>
            <p className="text-sm text-muted-foreground" style={{ userSelect: "none" }}>
              Что показывает физическая величина «сила тока»? Запишите формулу для её вычисления и укажите единицы измерения в СИ.
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[1]} onChange={(e) => onAnswerChange(1, e.target.value)} rows={4} />
          </div>

          {/* 3 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 3. Закон Ома</Label>
            <p className="text-sm text-muted-foreground" style={{ userSelect: "none" }}>
              Сформулируйте закон Ома для участка цепи и запишите соответствующую формулу.
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[2]} onChange={(e) => onAnswerChange(2, e.target.value)} rows={4} />
          </div>

          {/* 4 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 4. Электрическое сопротивление</Label>
            <p className="text-sm text-muted-foreground" style={{ userSelect: "none" }}>
              От каких параметров проводника зависит его электрическое сопротивление? Запишите формулу, связывающую эти величины.
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[3]} onChange={(e) => onAnswerChange(3, e.target.value)} rows={4} />
          </div>

          {/* 5 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 5. Последовательное соединение</Label>
            <p className="text-sm text-muted-foreground" style={{ userSelect: "none" }}>
              Назовите основные закономерности (правила для силы тока, напряжения и общего сопротивления) при последовательном соединении проводников.
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[4]} onChange={(e) => onAnswerChange(4, e.target.value)} rows={4} />
          </div>

          {/* 6 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 6. Закон Джоуля-Ленца</Label>
            <p className="text-sm text-muted-foreground" style={{ userSelect: "none" }}>
              Сформулируйте закон Джоуля-Ленца. Как выглядит формула для расчёта количества теплоты, выделяемого проводником с током?
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[5]} onChange={(e) => onAnswerChange(5, e.target.value)} rows={4} />
          </div>

          {/* 7 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 7. Короткое замыкание</Label>
            <p className="text-sm text-muted-foreground" style={{ userSelect: "none" }}>
              Что называют коротким замыканием? Почему это явление опасно и какую роль в предотвращении его последствий играют предохранители?
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[6]} onChange={(e) => onAnswerChange(6, e.target.value)} rows={4} />
          </div>
        </CardContent>
      </Card>

      {/* ═══════ ЧАСТЬ 2. ЗАДАЧИ ═══════ */}
      <Card>
        <CardHeader>
          <CardTitle>Часть 2. Задачи</CardTitle>
          <p className="text-sm text-destructive font-semibold">РЕШЕНИЕ ОБЯЗАТЕЛЬНО! Запишите полное решение с формулами.</p>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Задача 1 */}
          <div className="space-y-2">
            <Label className="font-semibold">Задача 1. Ошибка ученика</Label>
            <div className="text-sm text-muted-foreground space-y-2" style={{ userSelect: "none" }}>
              <p>
                Ученик собрал цепь из батарейки на <b>4,5 В</b>, проводов и резистора. Амперметр показал силу тока <b>0,5 А</b>. Затем он взял мощный блок питания на <b>9 В</b> и подключил к тому же резистору.
              </p>
              <p>
                Ученик рассуждает: «Напряжение U выросло в 2 раза. Значит, по формуле R = U/I, сопротивление резистора R тоже выросло в 2 раза!»
              </p>
              <p className="font-medium">
                Прав ли ученик? Найдите физическую ошибку в его рассуждениях. Докажите свой ответ, опираясь на законы физики, и рассчитайте реальное сопротивление резистора и силу тока во втором случае.
              </p>
            </div>
            <Textarea placeholder="Ваш ответ (решение с формулами)..." value={answers[7]} onChange={(e) => onAnswerChange(7, e.target.value)} rows={6} />
            <FileAttach file={attachments[7] || null} onFileChange={(f) => onAttachmentChange(7, f)} />
          </div>

          {/* Задача 2 */}
          <div className="space-y-2">
            <Label className="font-semibold">Задача 2. Последовательное соединение</Label>
            <p className="text-sm text-muted-foreground" style={{ userSelect: "none" }}>
              Электрическая цепь состоит из двух последовательно соединённых проводников сопротивлениями <b>10 Ом</b> и <b>20 Ом</b>. Найдите общее сопротивление этого участка цепи и общее напряжение на нём, если амперметр показывает силу тока в цепи <b>0,2 А</b>.
            </p>
            <Textarea placeholder="Ваш ответ (решение с формулами)..." value={answers[8]} onChange={(e) => onAnswerChange(8, e.target.value)} rows={5} />
            <FileAttach file={attachments[8] || null} onFileChange={(f) => onAttachmentChange(8, f)} />
          </div>

          {/* Задача 3 */}
          <div className="space-y-2">
            <Label className="font-semibold">Задача 3. Два алюминиевых провода</Label>
            <p className="text-sm text-muted-foreground" style={{ userSelect: "none" }}>
              На столе лежат два алюминиевых провода одинаковой длины, но масса первого провода ровно в <b>2 раза</b> больше массы второго. К ним по очереди подключают одну и ту же батарейку. В каком проводе сила тока будет больше и во сколько раз?
            </p>
            <Textarea placeholder="Ваш ответ (решение с формулами)..." value={answers[9]} onChange={(e) => onAnswerChange(9, e.target.value)} rows={5} />
            <FileAttach file={attachments[9] || null} onFileChange={(f) => onAttachmentChange(9, f)} />
          </div>

          {/* Задача 4 */}
          <div className="space-y-2">
            <Label className="font-semibold">Задача 4. Медная проволока</Label>
            <p className="text-sm text-muted-foreground" style={{ userSelect: "none" }}>
              Кусок неизолированной медной проволоки разрезали ровно пополам, а затем эти две половинки свили вместе в один жгут. Изменилось ли электрическое сопротивление получившегося жгута по сравнению с первоначальной проволокой? Если да, то как и во сколько раз?
            </p>
            <Textarea placeholder="Ваш ответ (решение с формулами)..." value={answers[10]} onChange={(e) => onAnswerChange(10, e.target.value)} rows={5} />
            <FileAttach file={attachments[10] || null} onFileChange={(f) => onAttachmentChange(10, f)} />
          </div>

          {/* Задача 5 */}
          <div className="space-y-2">
            <Label className="font-semibold">Задача 5. Заряженные шарики</Label>
            <p className="text-sm text-muted-foreground" style={{ userSelect: "none" }}>
              Одному из двух одинаковых металлических шариков сообщили заряд <b>−6q</b>, другому — заряд <b>+2q</b>. Шарики привели в соприкосновение, а затем развели на прежнее расстояние. Найдите, каким стал заряд каждого шарика после соприкосновения.
            </p>
            <Textarea placeholder="Ваш ответ (решение с формулами)..." value={answers[11]} onChange={(e) => onAnswerChange(11, e.target.value)} rows={5} />
            <FileAttach file={attachments[11] || null} onFileChange={(f) => onAttachmentChange(11, f)} />
          </div>

          {/* Задача 6 — со звёздочкой */}
          <div className="space-y-2">
            <Label className="font-semibold">⭐ Задача 6 (со звёздочкой). Смешанное соединение</Label>
            <div className="text-sm text-muted-foreground space-y-2" style={{ userSelect: "none" }}>
              <p>
                Электрическая цепь подключена к источнику тока с общим напряжением <b>27 В</b>. Цепь состоит из трёх резисторов: резисторы R₁ = <b>3 Ом</b> и R₂ = <b>6 Ом</b> соединены между собой параллельно, а резистор R₃ подключён к этому разветвлённому участку последовательно. Общий амперметр в неразветвлённой части цепи показывает силу тока <b>3 А</b>.
              </p>
              <p className="font-medium">Вам необходимо:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Начертить принципиальную схему этой цепи.</li>
                <li>Найти сопротивление неизвестного резистора R₃.</li>
                <li>Вычислить силу тока и напряжение на каждом из трёх резисторов в отдельности (I₁, U₁, I₂, U₂, I₃, U₃).</li>
              </ol>
            </div>
            <Textarea placeholder="Ваш ответ (полное решение с формулами и схемой)..." value={answers[12]} onChange={(e) => onAnswerChange(12, e.target.value)} rows={8} />
            <FileAttach file={attachments[12] || null} onFileChange={(f) => onAttachmentChange(12, f)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Grade8Physics;
