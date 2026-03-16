import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import FileAttach from "@/components/FileAttach";

interface Grade9TechnologyProps {
  answers: string[];
  attachments: Record<number, File | null>;
  onAnswerChange: (index: number, value: string) => void;
  onAttachmentChange: (index: number, file: File | null) => void;
}

const Grade9Technology = ({ answers, attachments, onAnswerChange, onAttachmentChange }: Grade9TechnologyProps) => {
  return (
    <div className="space-y-6">
      {/* ═══════ БЛОК 1. Информационное моделирование и ТРИЗ ═══════ */}
      <Card>
        <CardHeader>
          <CardTitle>Блок 1. Информационное моделирование и ТРИЗ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 1.1 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 1.1 — Свойства моделей</Label>
            <p className="text-sm text-muted-foreground">
              Авиаконструкторы построили уменьшенную модель нового самолёта и испытали её в аэродинамической трубе, чтобы изучить обтекание воздухом и подъёмную силу крыла. Однако бухгалтерия авиакомпании отказалась использовать эту модель для расчёта стоимости авиабилетов на новый рейс — им нужна совершенно другая модель: экономическая, с данными о расходе топлива, количестве мест и ценах.
            </p>
            <p className="text-sm text-muted-foreground font-medium">Задание:</p>
            <p className="text-sm text-muted-foreground">
              Какое ключевое теоретическое свойство модели (начинается на букву «А») было нарушено аэродинамической моделью самолёта в контексте задачи расчёта стоимости билетов? Объясните почему. К какому виду моделей (по форме представления) относится экономическая модель расчёта стоимости билетов?
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[0]} onChange={(e) => onAnswerChange(0, e.target.value)} rows={5} />
          </div>

          {/* 1.2 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 1.2 — Основы интеллектуальной собственности</Label>
            <p className="text-sm text-muted-foreground">
              Ученик 9 класса придумал и собрал уникальный механизм для школьного рюкзака, который позволяет за секунду превращать его в удобный походный стул. Он хочет защитить свою идею от копирования крупными фабриками. Его друг советует просто поставить значок © (копирайт) на своих чертежах, утверждая, что этого достаточно по закону.
            </p>
            <p className="text-sm text-muted-foreground font-medium">Задание:</p>
            <p className="text-sm text-muted-foreground">
              Прав ли друг? Объясните, в чем принципиальная разница между авторским правом (копирайтом) и защитой технического изобретения. Какой именно государственный документ должен получить ученик, чтобы фабрики не могли легально копировать его механизм?
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[1]} onChange={(e) => onAnswerChange(1, e.target.value)} rows={5} />
          </div>

          {/* 1.3 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 1.3 — Методы генерации идей (ТРИЗ)</Label>
            <p className="text-sm text-muted-foreground">
              Дизайнерскому отделу поручили спроектировать принципиально новую школьную парту. Они решили применить алгоритм ТРИЗ под названием «Метод фокальных объектов». Случайным объектом из словаря они выбрали слово <b>«Аквариум»</b>.
            </p>
            <p className="text-sm text-muted-foreground font-medium">Задание:</p>
            <p className="text-sm text-muted-foreground">
              Опишите в одном предложении суть этого метода. Затем примените его: перечислите 2–3 ярких свойства аквариума и предложите на их основе 2 идеи для создания необычной школьной парты.
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[2]} onChange={(e) => onAnswerChange(2, e.target.value)} rows={5} />
          </div>
        </CardContent>
      </Card>

      {/* ═══════ БЛОК 2. Высокие технологии ═══════ */}
      <Card>
        <CardHeader>
          <CardTitle>Блок 2. Высокие технологии (Лазеры и Нанотехнологии)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 2.1 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 2.1 — Лазерная обработка</Label>
            <p className="text-sm text-muted-foreground">
              Фабрика по производству кожаных ремней, чехлов для очков и деревянных шкатулок полностью отказалась от механических резаков и штамповочных прессов. Руководство закупило станки для лазерной резки и гравировки.
            </p>
            <p className="text-sm text-muted-foreground font-medium">Задание:</p>
            <p className="text-sm text-muted-foreground">
              Назовите минимум три технологических и экологических преимущества, которые получит фабрика от перехода на лазерную обработку материалов по сравнению с традиционной механической.
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[3]} onChange={(e) => onAnswerChange(3, e.target.value)} rows={5} />
          </div>

          {/* 2.2 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 2.2 — Нанотехнологии и умные материалы</Label>
            <p className="text-sm text-muted-foreground">
              В рекламе новой дорогой школьной формы сказано: «Ткань обработана специальными наночастицами, поэтому на ней вообще не остаются пятна от пролитого сока, кетчупа или уличной грязи — они моментально скатываются вниз, оставляя ткань сухой».
            </p>
            <p className="text-sm text-muted-foreground font-medium">Задание:</p>
            <p className="text-sm text-muted-foreground">
              Опираясь на знания о нанотехнологиях, объясните, как именно работает это покрытие на микроуровне? Какой известный природный эффект (названный в честь водного растения) смогли скопировать учёные для создания таких самоочищающихся тканей?
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[4]} onChange={(e) => onAnswerChange(4, e.target.value)} rows={5} />
          </div>
        </CardContent>
      </Card>

      {/* ═══════ БЛОК 3. Биотехнологии и Бионика ═══════ */}
      <Card>
        <CardHeader>
          <CardTitle>Блок 3. Биотехнологии и Бионика</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 3.1 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 3.1 — Бионика в инженерии</Label>
            <p className="text-sm text-muted-foreground">
              Известно, что знаменитая текстильная застёжка-липучка (Velcro) была изобретена инженером Жоржем де Местралем после того, как он под микроскопом изучил семена репейника, намертво прицепившиеся к шерсти его собаки.
            </p>
            <p className="text-sm text-muted-foreground font-medium">Задание:</p>
            <p className="text-sm text-muted-foreground">
              1. Как называется наука, которая применяет формы, свойства и функции живой природы в технических устройствах?<br />
              2. Приведите свой пример (или пример из учебника) того, как инженерная мысль скопировала у природы техническое решение.
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[5]} onChange={(e) => onAnswerChange(5, e.target.value)} rows={5} />
          </div>

          {/* 3.2 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 3.2 — Генная инженерия</Label>
            <p className="text-sm text-muted-foreground">
              Агрономы вывели сорт картофеля, который вообще не ест колорадский жук. Для этого в структуру картофеля был искусственно внедрен ген почвенной бактерии, вырабатывающий безопасный для человека, но губительный для жука белок.
            </p>
            <p className="text-sm text-muted-foreground font-medium">Задание:</p>
            <p className="text-sm text-muted-foreground">
              Как в биотехнологии называются организмы (растения), генетическая структура которых была изменена подобным образом (напишите аббревиатуру или полное научное название)? В чём главная цель создания таких сельскохозяйственных культур?
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[6]} onChange={(e) => onAnswerChange(6, e.target.value)} rows={4} />
          </div>
        </CardContent>
      </Card>

      {/* ═══════ БЛОК 4. Аддитивные технологии ═══════ */}
      <Card>
        <CardHeader>
          <CardTitle>Блок 4. Аддитивные технологии (3D-печать)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 4.1 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 4.1 — Основы 3D-печати</Label>
            <p className="text-sm text-muted-foreground">
              Мастер-скульптор вытачивает сложную деревянную фигурку медведя из цельного бруска дерева, убирая всё лишнее стамеской. Рядом 3D-принтер создаёт точно такую же фигурку медведя из пластика.
            </p>
            <p className="text-sm text-muted-foreground font-medium">Задание:</p>
            <p className="text-sm text-muted-foreground">
              В чём фундаментальное отличие технологии 3D-печати от работы мастера с точки зрения расхода материала? От какого английского слова произошло название «аддитивные технологии» и что оно означает в переводе?
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[7]} onChange={(e) => onAnswerChange(7, e.target.value)} rows={4} />
          </div>

          {/* 4.2 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 4.2 — Стереолитография</Label>
            <p className="text-sm text-muted-foreground">
              Большинство домашних и простых промышленных 3D-принтеров печатают расплавленной пластиковой нитью, которая выдавливается через горячее сопло (экструдер). Однако в медицине для точнейших деталей применяют метод стереолитографии.
            </p>
            <p className="text-sm text-muted-foreground font-medium">Задание:</p>
            <p className="text-sm text-muted-foreground">
              Какое вещество находится в ванне такого принтера вместо привычной твёрдой пластиковой нити? Под воздействием какого физического излучения (луча) это вещество послойно затвердевает, образуя деталь?
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[8]} onChange={(e) => onAnswerChange(8, e.target.value)} rows={4} />
          </div>
        </CardContent>
      </Card>

      {/* ═══════ БЛОК 5. Технологическое предвидение и этика ═══════ */}
      <Card>
        <CardHeader>
          <CardTitle>Блок 5. Технологическое предвидение и этика</CardTitle>
          <p className="text-sm text-muted-foreground">
            Напишите развёрнутое рассуждение (5–8 предложений) по <b>каждому</b> из двух вопросов ниже. Оценивается ваша логика, понимание современных тенденций и умение аргументировать свою позицию. При желании вы можете прикрепить фото рукописного ответа.
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* 5.1 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 5.1 — Этика биотехнологий</Label>
            <p className="text-sm text-muted-foreground">
              Генная инженерия уже активно применяется в сельском хозяйстве. Представьте, что в ближайшем будущем технологии разовьются настолько, что родителям предложат легально «редактировать» гены своих будущих детей до рождения (выбирать цвет глаз, увеличивать физическую силу, закладывать иммунитет к неизлечимым сегодня болезням).
            </p>
            <p className="text-sm text-muted-foreground font-medium">Задание:</p>
            <p className="text-sm text-muted-foreground">
              Как вы считаете, должно ли государство разрешить такие процедуры? К каким социальным последствиям и опасностям это может привести, если такая услуга будет стоить очень дорого и станет доступна только богатым людям?
            </p>
            <Textarea placeholder="Ваше рассуждение (5–8 предложений)..." value={answers[9]} onChange={(e) => onAnswerChange(9, e.target.value)} rows={7} />
            <FileAttach file={attachments[9] || null} onFileChange={(f) => onAttachmentChange(9, f)} />
          </div>

          {/* 5.2 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 5.2 — Робототехника и рынок труда</Label>
            <p className="text-sm text-muted-foreground">
              Сегодня нейросети, алгоритмы и роботы развиваются с невероятной скоростью. Они уже заменяют кассиров в супермаркетах, переводчиков, операторов колл-центров и рабочих на конвейерах. Некоторые эксперты предрекают массовую безработицу, а другие утверждают, что технологии просто освободят людей от тяжёлой рутины.
            </p>
            <p className="text-sm text-muted-foreground font-medium">Задание:</p>
            <p className="text-sm text-muted-foreground">
              Как вы думаете, по какому сценарию пойдёт развитие общества? Какие качества и навыки нужно развивать школьнику или школьнице, чтобы через 5–7 лет быть востребованными специалистами и не проиграть конкуренцию умным машинам?
            </p>
            <Textarea placeholder="Ваше рассуждение (5–8 предложений)..." value={answers[10]} onChange={(e) => onAnswerChange(10, e.target.value)} rows={7} />
            <FileAttach file={attachments[10] || null} onFileChange={(f) => onAttachmentChange(10, f)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Grade9Technology;
