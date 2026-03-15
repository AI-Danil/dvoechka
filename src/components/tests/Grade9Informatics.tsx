import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import FileAttach from "@/components/FileAttach";

interface Grade9InformaticsProps {
  answers: string[];
  attachments: Record<number, File | null>;
  onAnswerChange: (index: number, value: string) => void;
  onAttachmentChange: (index: number, file: File | null) => void;
}

const CODE_12A = `def scan_area(radius, sensitivity):
    result = radius * sensitivity + 15
    print("Уровень угрозы:", result)`;

const CODE_12B = `def calculate_threat(radius, sensitivity):
    result = radius * sensitivity + 15
    return result`;

const CODE_14 = `for i in range(1, 151):
    print(telemetry[i])`;

const CODE_21 = `pressure = [1042, 850, 2048, 715, 2048, 100, 45, 2048]
m = -9999
minute_index = -1

for i in range(8):
    if pressure[i] > m:
        m = pressure[i]
        minute_index = i

print(minute_index)`;

const CODE_22 = `sensors = [408, 419, 410, 431, 399]
s = 0

for i in range(5):
    if sensors[i] > 400 and sensors[i] % 2 != 0:
        s = s + sensors[i]

print(s)`;

const Grade9Informatics = ({ answers, attachments, onAnswerChange, onAttachmentChange }: Grade9InformaticsProps) => {
  return (
    <div className="space-y-6">
      {/* Блок 1 — Теория (7 вопросов, без FileAttach) */}
      <Card>
        <CardHeader>
          <CardTitle>Блок 1. Теоретические основы информатики и кибернетики</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 1.1 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 1.1 (Архитектура алгоритмов)</Label>
            <p className="text-sm text-muted-foreground">
              Разработчики создают сложную систему управления орбитальной станцией. Главный инженер предлагает сначала написать общий алгоритм «Обеспечение жизнедеятельности», а затем разбить его на более мелкие: «Контроль кислорода», «Терморегуляция» и «Подача воды», продолжая дробление до базовых команд.
            </p>
            <p className="text-sm text-muted-foreground">
              Как в теории конструирования алгоритмов называется этот метод разработки? В чем его главное преимущество при работе над крупными проектами?
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[0]} onChange={(e) => onAnswerChange(0, e.target.value)} rows={3} />
          </div>

          {/* 1.2 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 1.2 (Подпрограммы и их виды)</Label>
            <p className="text-sm text-muted-foreground">
              Перед вами два фрагмента логики управления дроном «Пегас-3».
            </p>
            <p className="text-sm font-medium">Фрагмент А:</p>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">{CODE_12A}</pre>
            <p className="text-sm font-medium">Фрагмент Б:</p>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">{CODE_12B}</pre>
            <p className="text-sm text-muted-foreground">
              1. Как в строгой терминологии называется тип подпрограммы во Фрагменте А, а как — во Фрагменте Б?<br />
              2. Объясните теоретически, почему бортовой компьютер дрона не сможет использовать данные из Фрагмента А для дальнейшего автоматического принятия решений (например, для формулы <code>if threat &gt; 50:</code>), но сможет использовать Фрагмент Б?
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[1]} onChange={(e) => onAnswerChange(1, e.target.value)} rows={4} />
          </div>

          {/* 1.3 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 1.3 (Параметры подпрограмм)</Label>
            <p className="text-sm text-muted-foreground">
              В момент запуска двигателя подпрограмма вызывается следующим образом: <code>start_engine(850, 12.4)</code>. Сама подпрограмма описана в коде как <code>def start_engine(power, fuel_rate):</code>.
            </p>
            <p className="text-sm text-muted-foreground">
              Как в теории программирования называются конкретные числа <b>850</b> и <b>12.4</b> в момент вызова, и как называются переменные <b>power</b> и <b>fuel_rate</b> в момент объявления функции?
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[2]} onChange={(e) => onAnswerChange(2, e.target.value)} rows={3} />
          </div>

          {/* 1.4 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 1.4 (Теория структур данных: Индексация)</Label>
            <p className="text-sm text-muted-foreground">
              В массиве (списке) <code>telemetry</code> хранится ровно 150 записей с показаниями датчиков. Программист-стажер написал следующий цикл для вывода всех данных на экран:
            </p>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">{CODE_14}</pre>
            <p className="text-sm text-muted-foreground">
              При запуске программа пропускает самое первое показание, а в конце выдает критическую ошибку <code>IndexError: list index out of range</code> и аварийно завершается.
            </p>
            <p className="text-sm text-muted-foreground">
              Опираясь на теоретические правила работы с массивами в Python, объясните, почему стажер совершил сразу две логические ошибки.
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[3]} onChange={(e) => onAnswerChange(3, e.target.value)} rows={4} />
          </div>

          {/* 1.5 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 1.5 (Алгоритмы сортировки)</Label>
            <p className="text-sm text-muted-foreground">
              На экзамене студент утверждает: «Метод сортировки массива выбором (по возрастанию) работает так: алгоритм постоянно сравнивает два соседних элемента, и если левый больше правого, он меняет их местами, пока самое большое число не "всплывет" в конец».
            </p>
            <p className="text-sm text-muted-foreground">
              Студент перепутал алгоритмы. Опишите кратко, в чем заключается истинная суть метода сортировки выбором (Selection Sort)? Что именно программа «выбирает» на каждом шаге?
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[4]} onChange={(e) => onAnswerChange(4, e.target.value)} rows={3} />
          </div>

          {/* 1.6 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 1.6 (Теория моделирования)</Label>
            <p className="text-sm text-muted-foreground">
              Архитектору заказали создать информационную модель здания школы. Для задачи №1 (составление плана пожарной эвакуации) он сделал плоский чертеж с указанием коридоров и выходов. Для задачи №2 (расчет количества краски для ремонта) он попытался использовать этот же чертеж, но заказчик его отклонил.
            </p>
            <p className="text-sm text-muted-foreground">
              Какое ключевое свойство модели (начинается на букву «А») было нарушено во втором случае? Объясните, почему для разных целей требуются разные информационные модели одного и того же объекта-оригинала.
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[5]} onChange={(e) => onAnswerChange(5, e.target.value)} rows={3} />
          </div>

          {/* 1.7 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 1.7 (Основы кибернетики)</Label>
            <p className="text-sm text-muted-foreground">
              В системе «Умная теплица» установлен датчик влажности почвы и автоматический насос. Когда почва пересыхает, датчик фиксирует это и отправляет сигнал на контроллер, который включает насос. Когда влажность достигает нормы, датчик снова отправляет сигнал, и насос отключается.
            </p>
            <p className="text-sm text-muted-foreground">
              Как в кибернетике и теории управления называется процесс передачи информации от объекта управления (почвы) обратно к управляющей системе (контроллеру) о текущем состоянии объекта?
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[6]} onChange={(e) => onAnswerChange(6, e.target.value)} rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* Блок 2 — Анализ кода (с FileAttach) */}
      <Card>
        <CardHeader>
          <CardTitle>Блок 2. Анализ кода и алгоритмов (Python)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 2.1 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 2.1 (Поиск в одномерном массиве)</Label>
            <p className="text-sm text-muted-foreground">
              Датчики глубоководного батискафа записали уровень давления (в атмосферах) каждую минуту погружения. Данные сохранены в список <code>pressure</code>.
              Пилот попросил написать программу, которая найдет <b>последнюю</b> минуту погружения, когда было зафиксировано максимальное давление.
            </p>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">{CODE_21}</pre>
            <p className="text-sm text-muted-foreground">
              1. Программа содержит логическую ошибку и выводит индекс <b>первого</b> максимума, а не последнего. Какой индекс она выведет на экран сейчас? (Помните про правила нумерации в Python).<br />
              2. Какой один математический символ нужно добавить в строку <code>if pressure[i] &gt; m:</code>, чтобы программа заработала верно и нашла именно последний максимум?
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[7]} onChange={(e) => onAnswerChange(7, e.target.value)} rows={3} />
            <FileAttach file={attachments[7] || null} onFileChange={(f) => onAttachmentChange(7, f)} />
          </div>

          {/* 2.2 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 2.2 (Трассировка алгоритма фильтрации)</Label>
            <p className="text-sm text-muted-foreground">
              Дана программа, обрабатывающая показания температурных датчиков реактора:
            </p>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">{CODE_22}</pre>
            <p className="text-sm text-muted-foreground">
              1. Выполните ручную трассировку (пошаговое выполнение) кода. Выпишите все числа из массива <code>sensors</code>, которые пройдут проверку в строке <code>if</code>.<br />
              2. Какое итоговое число выведет функция <code>print(s)</code>?
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[8]} onChange={(e) => onAnswerChange(8, e.target.value)} rows={4} />
            <FileAttach file={attachments[8] || null} onFileChange={(f) => onAttachmentChange(8, f)} />
          </div>
        </CardContent>
      </Card>

      {/* Блок 3 — Графы (с FileAttach) */}
      <Card>
        <CardHeader>
          <CardTitle>Блок 3. Моделирование: Графы и пути</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label className="font-semibold">Вопрос 3.1 (Оптимизация маршрута)</Label>
          <p className="text-sm text-muted-foreground">
            Исследовательская группа перемещается между куполами лунной базы: А (Альфа), Б (Бета), В (Вега), Г (Гамма), Д (Дельта).
          </p>
          <p className="text-sm text-muted-foreground">Время перехода между куполами (в минутах):</p>
          <div className="bg-muted p-3 rounded text-sm space-y-1">
            <p>А – Б: 12 &nbsp;&nbsp; А – В: 28 &nbsp;&nbsp; Б – В: 10</p>
            <p>Б – Г: 35 &nbsp;&nbsp; В – Д: 22 &nbsp;&nbsp; Г – Д: 14 &nbsp;&nbsp; В – Г: 16</p>
          </div>
          <p className="text-sm text-destructive font-medium">
            ⚠ Экстренное сообщение: Тоннель между куполами В (Вега) и Г (Гамма) разгерметизирован, проезд невозможен.
          </p>
          <p className="text-sm text-muted-foreground">
            Нарисуйте граф маршрутов на черновике. Найдите кратчайшее время пути от купола А до купола Д с учетом перекрытого тоннеля. В ответе запишите последовательность куполов и итоговое время.
          </p>
          <Textarea placeholder="Ваш ответ..." value={answers[9]} onChange={(e) => onAnswerChange(9, e.target.value)} rows={4} />
          <FileAttach file={attachments[9] || null} onFileChange={(f) => onAttachmentChange(9, f)} />
        </CardContent>
      </Card>

      {/* Блок 4 — БД (с FileAttach) */}
      <Card>
        <CardHeader>
          <CardTitle>Блок 4. Информационные модели и Базы Данных</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label className="font-semibold">Вопрос 4.1 (Сложные логические запросы)</Label>
          <p className="text-sm text-muted-foreground">
            В базе данных кибернетического завода есть таблица «Дроиды_Z9».
          </p>
          <div className="bg-muted p-3 rounded text-sm overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="pr-4 pb-1">ID</th>
                  <th className="pr-4 pb-1">Броня</th>
                  <th className="pr-4 pb-1">Заряд</th>
                  <th className="pb-1">Исправен</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="pr-4">101</td><td className="pr-4">Титан</td><td className="pr-4">85</td><td>Да</td></tr>
                <tr><td className="pr-4">102</td><td className="pr-4">Сталь</td><td className="pr-4">40</td><td>Да</td></tr>
                <tr><td className="pr-4">103</td><td className="pr-4">Титан</td><td className="pr-4">15</td><td>Нет</td></tr>
                <tr><td className="pr-4">104</td><td className="pr-4">Карбон</td><td className="pr-4">90</td><td>Да</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">
            Запрос к БД: <code>(Исправен = Да) И (Броня = 'Титан' ИЛИ Заряд &gt; 50)</code>
          </p>
          <p className="text-sm text-muted-foreground">
            1. Напишите ID дроидов, которые будут отобраны системой для миссии.<br />
            2. Распишите кратко логику отбора для дроида ID 102 (почему он подошёл или не подошёл).
          </p>
          <Textarea placeholder="Ваш ответ..." value={answers[10]} onChange={(e) => onAnswerChange(10, e.target.value)} rows={5} />
          <FileAttach file={attachments[10] || null} onFileChange={(f) => onAttachmentChange(10, f)} />
        </CardContent>
      </Card>
    </div>
  );
};

export default Grade9Informatics;
