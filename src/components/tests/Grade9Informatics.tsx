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

const CODE_11A = `def process_data(x, y):
    res = x * 2 + y
    print("Результат:", res)`;

const CODE_11B = `def calculate_data(x, y):
    res = x * 2 + y
    return res`;

const CODE_12 = `def cell_divide(count):
    new_count = cell_divide(count * 2)
    return new_count`;

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
      {/* Блок 1 */}
      <Card>
        <CardHeader>
          <CardTitle>Блок 1. Теоретические основы информатики</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 1.1 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 1.1 (Подпрограммы)</Label>
            <p className="text-sm text-muted-foreground">
              Перед вами два фрагмента кода на языке Python.
            </p>
            <p className="text-sm font-medium">Фрагмент А:</p>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">{CODE_11A}</pre>
            <p className="text-sm font-medium">Фрагмент Б:</p>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">{CODE_11B}</pre>
            <p className="text-sm text-muted-foreground">
              1. Как в теории алгоритмов называется тип подпрограммы во Фрагменте А, а как — во Фрагменте Б?<br />
              2. Объясните своими словами, в чем принципиальная разница между их работой для основной программы?
            </p>
            <Textarea
              placeholder="Ваш ответ..."
              value={answers[0]}
              onChange={(e) => onAnswerChange(0, e.target.value)}
              rows={4}
            />
            <FileAttach file={attachments[0] || null} onFileChange={(f) => onAttachmentChange(0, f)} />
          </div>

          {/* 1.2 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 1.2 (Рекурсия)</Label>
            <p className="text-sm text-muted-foreground">
              Программист написал рекурсивный алгоритм для моделирования деления клеток, но при запуске компьютер выдал ошибку <code>RecursionError</code> (переполнение памяти) и завис.
            </p>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">{CODE_12}</pre>
            <p className="text-sm text-muted-foreground">
              Какое фундаментальное правило построения рекурсивных алгоритмов нарушил программист?
            </p>
            <Textarea
              placeholder="Ваш ответ..."
              value={answers[1]}
              onChange={(e) => onAnswerChange(1, e.target.value)}
              rows={3}
            />
            <FileAttach file={attachments[1] || null} onFileChange={(f) => onAttachmentChange(1, f)} />
          </div>
        </CardContent>
      </Card>

      {/* Блок 2 */}
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
            <Textarea
              placeholder="Ваш ответ..."
              value={answers[2]}
              onChange={(e) => onAnswerChange(2, e.target.value)}
              rows={3}
            />
            <FileAttach file={attachments[2] || null} onFileChange={(f) => onAttachmentChange(2, f)} />
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
            <Textarea
              placeholder="Ваш ответ..."
              value={answers[3]}
              onChange={(e) => onAnswerChange(3, e.target.value)}
              rows={4}
            />
            <FileAttach file={attachments[3] || null} onFileChange={(f) => onAttachmentChange(3, f)} />
          </div>
        </CardContent>
      </Card>

      {/* Блок 3 */}
      <Card>
        <CardHeader>
          <CardTitle>Блок 3. Моделирование: Графы и пути</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label className="font-semibold">Вопрос 3.1 (Оптимизация маршрута)</Label>
          <p className="text-sm text-muted-foreground">
            Исследовательская группа перемещается между куполами лунной базы: А (Альфа), Б (Бета), В (Вега), Г (Гамма), Д (Дельта).
          </p>
          <p className="text-sm text-muted-foreground">
            Время перехода между куполами (в минутах):
          </p>
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
          <Textarea
            placeholder="Ваш ответ..."
            value={answers[4]}
            onChange={(e) => onAnswerChange(4, e.target.value)}
            rows={4}
          />
          <FileAttach file={attachments[4] || null} onFileChange={(f) => onAttachmentChange(4, f)} />
        </CardContent>
      </Card>

      {/* Блок 4 */}
      <Card>
        <CardHeader>
          <CardTitle>Блок 4. Информационные модели и Базы Данных</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label className="font-semibold">Вопрос 4.1 (Логические запросы)</Label>
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
            2. Распишите кратко логику отбора для дроида ID 102 (почему он подошёл или не подошёл).<br />
            <b>РАСПИСАТЬ В ЛОГИКЕ ЭКСЕЛЬ ТАБЛИЦ — как бы вы создали условия в Excel таблице.</b>
          </p>
          <Textarea
            placeholder="Ваш ответ..."
            value={answers[5]}
            onChange={(e) => onAnswerChange(5, e.target.value)}
            rows={5}
          />
          <FileAttach file={attachments[5] || null} onFileChange={(f) => onAttachmentChange(5, f)} />
        </CardContent>
      </Card>
    </div>
  );
};

export default Grade9Informatics;
