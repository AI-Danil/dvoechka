import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const blitzQuestions = [
  "Чему равно значение выражения НЕ (НЕ (5 > 3))?",
  "Какой тип данных вернет функция input(), если ввести 123.45?",
  "Можно ли назвать переменную в Python 2_level_boss? (Да/Нет + почему)",
  "Чему равен результат операции 17 % 5?",
  "При каких значениях A и B выражение (A И B) будет истинным?",
  "Сколько бит информации несёт один символ при алфавите в 15 знаков?",
  "Что окажется в переменной x после: x = 10; x = x + 5; x = 2?",
];

interface Grade8InformaticsProps {
  blitz: string[];
  tasks: Record<string, string>;
  onBlitzChange: (index: number, value: string) => void;
  onTaskChange: (key: string, value: string) => void;
}

const Grade8Informatics = ({
  blitz,
  tasks,
  onBlitzChange,
  onTaskChange,
}: Grade8InformaticsProps) => {
  return (
    <>
      {/* BLITZ */}
      <section>
        <h2 className="text-xl font-bold mb-4 border-b pb-2">Блиц-опрос (краткий ответ)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {blitzQuestions.map((q, i) => (
            <Card key={i}>
              <CardContent className="pt-4 space-y-2">
                <Label className="text-sm font-medium">{i + 1}. {q}</Label>
                <Input
                  value={blitz[i]}
                  onChange={(e) => onBlitzChange(i, e.target.value)}
                  placeholder="Ваш ответ..."
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* PART 1: INFORMATICS */}
      <section>
        <h2 className="text-xl font-bold mb-4 border-b pb-2">Часть 1: Информатика</h2>
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4 space-y-2">
              <Label className="font-medium">Задача 1. «Сломанный видеоадаптер»</Label>
              <p className="text-sm text-muted-foreground">
                Экран имеет разрешение 120×120 пикселей. Из-за аппаратного сбоя видеокарта резервирует
                под каждый пиксель строго 9 бит памяти, хотя фактически может отображать только 300
                различных цветов. Какой объём памяти (в байтах) займёт один снимок экрана? Покажите решение.
              </p>
              <Textarea
                value={tasks.t1}
                onChange={(e) => onTaskChange("t1", e.target.value)}
                placeholder="Ваше решение..."
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 space-y-2">
              <Label className="font-medium">Задача 2. «Логика дефектного робота»</Label>
              <p className="text-sm text-muted-foreground">
                Робот идёт вперёд, если выполняется условие: (Датчик А видит стену ИЛИ НЕ Датчик Б
                видит яму). При скольких комбинациях состояний датчиков (из 4 возможных) робот никуда не пойдёт?
              </p>
              <Input
                value={tasks.t2}
                onChange={(e) => onTaskChange("t2", e.target.value)}
                placeholder="Ответ и обоснование"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 space-y-2">
              <Label className="font-medium">Задача 3. «Алгоритм-перевёртыш»</Label>
              <p className="text-sm text-muted-foreground">
                Дан алгоритм: S = 13; i = 1; Пока S &lt; 50: {"{"} S = S + (i * 2); i = i + 3; {"}"}.
                Чему будет равно значение S после завершения цикла?
              </p>
              <Input
                value={tasks.t3}
                onChange={(e) => onTaskChange("t3", e.target.value)}
                placeholder="Ответ:"
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* PART 2: PYTHON */}
      <section>
        <h2 className="text-xl font-bold mb-4 border-b pb-2">Часть 2: Технология / Python</h2>
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4 space-y-2">
              <Label className="font-medium">Задача 4. «Налог на трофеи»</Label>
              <p className="text-sm text-muted-foreground">
                Группа из 11 героев нашла клад в 1543 золотых монеты. Королевский налог составляет 17%
                (отбрасываем дробную часть). Оставшееся золото делится поровну между 11 героями. Всё, что
                не разделилось поровну (остаток), уходит в пользу казны. Напишите код, который выводит:
                «Каждый герой получил: [сумма]. В казну ушло: [налог + остаток]».
              </p>
              <Textarea
                value={tasks.t4}
                onChange={(e) => onTaskChange("t4", e.target.value)}
                placeholder="Код на Python..."
                className="min-h-[120px] font-mono text-sm"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 space-y-2">
              <Label className="font-medium">Задача 5. «Крафт в кузнице»</Label>
              <p className="text-sm text-muted-foreground">
                Для создания вещи нужно 3 ингредиента: Руда, Мана и Уголь. Напишите программу, которая
                запрашивает вес каждого ингредиента (дробные числа). Выходные данные должны быть оформлены
                строго одной строкой через print() с параметром sep="---": Рецепт: Руда: [значение] ---
                Мана: [значение] --- Уголь: [значение].
              </p>
              <Textarea
                value={tasks.t5}
                onChange={(e) => onTaskChange("t5", e.target.value)}
                placeholder="Код на Python..."
                className="min-h-[120px] font-mono text-sm"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 space-y-2">
              <Label className="font-medium">Задача 6. «Ловушка типов в таверне»</Label>
              <p className="text-sm text-muted-foreground">Исправьте ошибки в коде:</p>
              <pre className="bg-muted p-3 rounded text-sm font-mono overflow-x-auto">
{`price = input("Цена: ")
count = input("Героев: ")
total = price * count
print("Итого: " + total)`}
              </pre>
              <Textarea
                value={tasks.t6}
                onChange={(e) => onTaskChange("t6", e.target.value)}
                placeholder="Исправленный код..."
                className="min-h-[120px] font-mono text-sm"
              />
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
};

export default Grade8Informatics;
