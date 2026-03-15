import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const theoryQuestions = [
  "Как называется минимальный участок изображения, для которого независимым образом можно задать цвет?",
  "Какое максимальное целое число может встретиться в одном октете IP-адреса (IPv4)?",
  "Какая деталь стала основным элементом для второго поколения ЭВМ, придя на смену электронным лампам?",
  "Как называется полное имя файла, включающее в себя логический диск и последовательность всех папок?",
  "В чем фундаментальное различие между редактированием и форматированием текста?",
  "Какой параметр абзаца в текстовом процессоре определяет расстояние между строками внутри него?",
  "Можно ли в простом текстовом редакторе (например, Блокнот) сохранить цвет и размер шрифта? Почему?",
];

const practiceQuestions = [
  {
    label: "Задача 8. (Текст)",
    text: "Сообщение содержит 480 символов. Известно, что для кодирования используется нестандартная кодировка, где каждый символ весит 14 бит. Вычислите информационный объем этого сообщения в байтах.",
  },
  {
    label: "Задача 9. (Графика)",
    text: "Изображение размером 200×300 пикселей имеет палитру из 60 000 цветов. Какое минимальное количество полных бит необходимо выделить на один пиксель? Рассчитайте итоговый объем файла в Кбайтах.",
  },
  {
    label: "Задача 10. (Сети)",
    text: "Скорость модема составляет 56 000 бит/с. Через него передают файл объемом 1,5 Мбайта. Сколько полных минут потребуется на передачу?",
  },
  {
    label: "Задача 11. (Файловая система)",
    text: "Пылесос-робот хранит карту в файле: C:\\Data\\Maps\\Current\\Level_1.map. Робот получил команду: «Вверх на один уровень, затем в папку Old, затем вверх на два уровня, затем в папку Temp». Запиши итоговый полный путь к папке.",
  },
  {
    label: "Задача 12. (Маски файлов)",
    text: "Ученик ищет файлы по маске ?test*.d*. Какие из файлов НЕ подходят под маску: 1test.doc, attest.docx, _test.dat, test1.db? Обоснуй почему.",
  },
  {
    label: "Задача 13. (Объемы данных)",
    text: "Текстовый документ содержит 10 страниц по 40 строк. В каждой строке 60 символов. Файл сохранили в кодировке Unicode (16 бит на символ). Затем его пересохранили в кодировке Windows-1251 (8 бит на символ). На сколько Кбайт уменьшился информационный объем файла?",
  },
];

interface Grade7InformaticsProps {
  theory: string[];
  practice: string[];
  onTheoryChange: (index: number, value: string) => void;
  onPracticeChange: (index: number, value: string) => void;
}

const Grade7Informatics = ({
  theory,
  practice,
  onTheoryChange,
  onPracticeChange,
}: Grade7InformaticsProps) => {
  return (
    <>
      {/* BLOCK 1: Theory */}
      <section>
        <h2 className="text-xl font-bold mb-4 border-b pb-2 bg-muted/50 px-3 py-2 rounded-t">
          Блок 1: Теоретические вопросы
        </h2>
        <div className="space-y-4">
          {theoryQuestions.map((q, i) => (
            <Card key={i}>
              <CardContent className="pt-4 space-y-2">
                <Label className="font-bold text-sm">{i + 1}. {q}</Label>
                <Input
                  value={theory[i]}
                  onChange={(e) => onTheoryChange(i, e.target.value)}
                  placeholder="Ваш ответ..."
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* BLOCK 2: Practice */}
      <section>
        <h2 className="text-xl font-bold mb-4 border-b pb-2 bg-muted/50 px-3 py-2 rounded-t">
          Блок 2: Расчетные и практические задачи
        </h2>
        <div className="space-y-4">
          {practiceQuestions.map((q, i) => (
            <Card key={i}>
              <CardContent className="pt-4 space-y-2">
                <Label className="font-bold text-sm">{q.label}</Label>
                <p className="text-sm text-muted-foreground">{q.text}</p>
                <Textarea
                  value={practice[i]}
                  onChange={(e) => onPracticeChange(i, e.target.value)}
                  placeholder="Решение и ответ..."
                  className="min-h-[80px]"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
};

export default Grade7Informatics;
