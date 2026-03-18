import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import FileAttach from "@/components/FileAttach";

const theoryQuestions = [
  "Как называется комплекс базовых программ, который обеспечивает работу всех устройств компьютера и дает пользователю доступ к его ресурсам?",
  "Какой непечатаемый символ появляется в текстовом документе при нажатии клавиши Enter?",
  "В какой памяти данные безвозвратно стираются при внезапном отключении электричества: в оперативной (ОЗУ) или на жестком диске (HDD)?",
  "Как называется уникальный числовой адрес устройства в компьютерной сети (например, 192.168.0.1)?",
  "Какой символ используется в операционных системах Windows для разделения имен папок при записи пути к файлу?",
  "Как называется процесс изменения содержания текста (исправление ошибок, удаление лишних слов) без настройки его внешнего вида?",
  "Как называется наименьшая единица измерения информации, которая может принимать только два значения: 0 или 1?",
];

const practiceQuestions = [
  {
    label: "Задача 8. (Объем текста)",
    text: "Текст научной статьи содержит 32 страницы. На каждой странице 40 строк, в каждой строке 64 символа. Статья сохранена в кодировке КОИ-8 (8 бит на символ). Определите информационный объем статьи в Килобайтах. НУЖНО РАСПИСАТЬ ФОРМУЛЫ И ХОД РАССУЖДЕНИЙ И РАСЧЕТОВ",
  },
  {
    label: "Задача 9. (Графика)",
    text: "Для хранения квадратного растрового изображения размером 128x128 пикселей выделили ровно 8 Килобайт памяти (без учета заголовка файла). Какое максимальное количество цветов может содержать палитра этого изображения?",
  },
  {
    label: "Задача 10. (Сети)",
    text: "Файл скачивается со скоростью 256 000 бит/с. Размер файла составляет 1250 Кбайт. За сколько секунд этот файл будет полностью скачан?",
  },
  {
    label: "Задача 11. (Файловая система)",
    text: "Пользователь работал в каталоге D:\\Projects\\School\\Informatics. Он поднялся на два уровня вверх, создал там папку Physics, а внутри нее создал файл report.docx. Напишите полное имя созданного файла.",
  },
  {
    label: "Задача 12. (Маски файлов)",
    text: "Ученик ищет файлы по маске ?ata*.*t. Какие из перечисленных файлов ПОДХОДЯТ под маску: data.txt, bata.dat, database.ppt, mydata.txt? Обоснуй ответ для каждого файла.",
  },
  {
    label: "Задача 13. (Редактирование текста)",
    text: 'Ученик набрал текст: "Процессор обрабатывает информацию". Он выделил слово "информацию" и нажал комбинацию клавиш Ctrl+X, а затем дважды нажал Ctrl+V (с пробелом между словами). Напишите итоговое предложение.',
  },
];

interface Grade7TechnologyProps {
  theory: string[];
  practice: string[];
  attachments: Record<number, File | null>;
  onTheoryChange: (index: number, value: string) => void;
  onPracticeChange: (index: number, value: string) => void;
  onAttachmentChange: (index: number, file: File | null) => void;
}

const Grade7Technology = ({
  theory,
  practice,
  attachments,
  onTheoryChange,
  onPracticeChange,
  onAttachmentChange,
}: Grade7TechnologyProps) => {
  return (
    <>
      <section>
        <h2 className="text-xl font-bold mb-4 border-b pb-2 bg-muted/50 px-3 py-2 rounded-t">
          Блок 1: Теоретические вопросы
        </h2>
        <div className="space-y-4">
          {theoryQuestions.map((q, i) => (
            <Card key={i}>
              <CardContent className="pt-4 space-y-2">
                <Label className="font-bold text-sm select-none">{i + 1}. {q}</Label>
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

      <section>
        <h2 className="text-xl font-bold mb-4 border-b pb-2 bg-muted/50 px-3 py-2 rounded-t">
          Блок 2: Расчетные и практические задачи
        </h2>
        <div className="space-y-4">
          {practiceQuestions.map((q, i) => (
            <Card key={i}>
              <CardContent className="pt-4 space-y-2">
                <Label className="font-bold text-sm select-none">{q.label}</Label>
                <p className="text-sm text-muted-foreground select-none">{q.text}</p>
                <Textarea
                  value={practice[i]}
                  onChange={(e) => onPracticeChange(i, e.target.value)}
                  placeholder="Решение и ответ..."
                  className="min-h-[80px]"
                />
                <FileAttach
                  file={attachments[i] ?? null}
                  onFileChange={(file) => onAttachmentChange(i, file)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
};

export default Grade7Technology;
