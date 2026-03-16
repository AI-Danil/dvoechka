import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import FileAttach from "@/components/FileAttach";

interface Grade9PhysicsProps {
  answers: string[];
  attachments: Record<number, File | null>;
  onAnswerChange: (index: number, value: string) => void;
  onAttachmentChange: (index: number, file: File | null) => void;
}

/* ——— SVG-иллюстрации ——— */

const LeverDiagram = () => (
  <svg viewBox="0 0 500 200" className="w-full max-w-lg mx-auto my-4 bg-muted rounded-lg p-2" aria-label="Схема линейки на опоре с грузом">
    {/* Линейка */}
    <rect x="50" y="80" width="400" height="10" rx="2" fill="hsl(var(--foreground))" opacity="0.7" />
    {/* Опора (треугольник) на 25 см от левого конца = 50 + 400*(25/80) = 175 */}
    <polygon points="175,90 155,150 195,150" fill="hsl(var(--primary))" opacity="0.8" />
    {/* Груз на левом конце */}
    <rect x="40" y="90" width="30" height="30" rx="3" fill="hsl(var(--destructive))" opacity="0.8" />
    <text x="55" y="110" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">m₁</text>
    {/* Стрелка силы тяжести груза */}
    <line x1="55" y1="120" x2="55" y2="160" stroke="hsl(var(--destructive))" strokeWidth="2" markerEnd="url(#arrowRed)" />
    <text x="55" y="175" textAnchor="middle" fill="hsl(var(--destructive))" fontSize="11">F₁ = m₁g</text>
    {/* Центр масс линейки — середина: 50 + 200 = 250 */}
    <circle cx="250" cy="85" r="4" fill="hsl(var(--primary))" />
    <line x1="250" y1="90" x2="250" y2="140" stroke="hsl(var(--primary))" strokeWidth="2" markerEnd="url(#arrowBlue)" />
    <text x="250" y="155" textAnchor="middle" fill="hsl(var(--primary))" fontSize="11">F₂ = Mg</text>
    {/* Размерные линии */}
    <line x1="50" y1="60" x2="175" y2="60" stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeDasharray="4" />
    <text x="112" y="55" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">25 см</text>
    <line x1="50" y1="70" x2="450" y2="70" stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeDasharray="4" />
    <text x="250" y="45" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">L = 0.8 м</text>
    {/* Маркеры стрелок */}
    <defs>
      <marker id="arrowRed" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="hsl(var(--destructive))" />
      </marker>
      <marker id="arrowBlue" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="hsl(var(--primary))" />
      </marker>
    </defs>
  </svg>
);

const CollisionDiagram = () => (
  <svg viewBox="0 0 520 140" className="w-full max-w-lg mx-auto my-4 bg-muted rounded-lg p-2" aria-label="Схема столкновения двух шаров">
    {/* До столкновения */}
    <text x="130" y="18" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11">До столкновения</text>
    {/* Шар 1 */}
    <circle cx="70" cy="60" r="22" fill="hsl(var(--primary))" opacity="0.8" />
    <text x="70" y="65" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">m₁</text>
    <line x1="92" y1="60" x2="140" y2="60" stroke="hsl(var(--primary))" strokeWidth="2.5" markerEnd="url(#arrP)" />
    <text x="116" y="52" textAnchor="middle" fill="hsl(var(--primary))" fontSize="10">v₁ →</text>
    {/* Шар 2 */}
    <circle cx="200" cy="60" r="28" fill="hsl(var(--destructive))" opacity="0.8" />
    <text x="200" y="65" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">m₂</text>
    <line x1="172" y1="60" x2="135" y2="60" stroke="hsl(var(--destructive))" strokeWidth="2.5" markerEnd="url(#arrR)" />
    <text x="153" y="78" textAnchor="middle" fill="hsl(var(--destructive))" fontSize="10">← v₂</text>
    {/* Стрелка перехода */}
    <text x="280" y="65" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="22">→</text>
    {/* После столкновения */}
    <text x="400" y="18" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11">После столкновения</text>
    <circle cx="380" cy="60" r="32" fill="hsl(var(--accent-foreground))" opacity="0.25" stroke="hsl(var(--foreground))" strokeWidth="2" />
    <text x="380" y="57" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="10" fontWeight="bold">m₁+m₂</text>
    <text x="380" y="72" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="10">v = ?</text>
    <line x1="412" y1="60" x2="460" y2="60" stroke="hsl(var(--foreground))" strokeWidth="2.5" markerEnd="url(#arrG)" />
    <text x="436" y="52" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="10">v →?</text>
    {/* Поверхность */}
    <line x1="20" y1="110" x2="500" y2="110" stroke="hsl(var(--border))" strokeWidth="2" />
    <text x="260" y="128" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">гладкая горизонтальная поверхность</text>
    <defs>
      <marker id="arrP" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="hsl(var(--primary))" />
      </marker>
      <marker id="arrR" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="hsl(var(--destructive))" />
      </marker>
      <marker id="arrG" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="hsl(var(--foreground))" />
      </marker>
    </defs>
  </svg>
);

const LensDiagram = () => (
  <svg viewBox="0 0 500 220" className="w-full max-w-lg mx-auto my-4 bg-muted rounded-lg p-2" aria-label="Собирающая линза с фокусами и предметом">
    {/* Главная оптическая ось */}
    <line x1="20" y1="110" x2="480" y2="110" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" strokeDasharray="6,3" />
    <text x="490" y="114" fill="hsl(var(--muted-foreground))" fontSize="10">ось</text>
    {/* Линза (двояковыпуклая) */}
    <ellipse cx="250" cy="110" rx="8" ry="70" fill="hsl(var(--primary))" opacity="0.15" stroke="hsl(var(--primary))" strokeWidth="2" />
    {/* Стрелки на концах линзы */}
    <polygon points="244,42 250,35 256,42" fill="hsl(var(--primary))" />
    <polygon points="244,178 250,185 256,178" fill="hsl(var(--primary))" />
    {/* Фокусы */}
    <circle cx="170" cy="110" r="4" fill="hsl(var(--destructive))" />
    <text x="170" y="130" textAnchor="middle" fill="hsl(var(--destructive))" fontSize="11" fontWeight="bold">F</text>
    <circle cx="330" cy="110" r="4" fill="hsl(var(--destructive))" />
    <text x="330" y="130" textAnchor="middle" fill="hsl(var(--destructive))" fontSize="11" fontWeight="bold">F</text>
    {/* 2F */}
    <circle cx="90" cy="110" r="3" fill="hsl(var(--accent-foreground))" opacity="0.5" />
    <text x="90" y="130" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">2F</text>
    <circle cx="410" cy="110" r="3" fill="hsl(var(--accent-foreground))" opacity="0.5" />
    <text x="410" y="130" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">2F</text>
    {/* Предмет (стрелка) — между F и 2F от линзы = ~130 px от линзы */}
    <line x1="120" y1="110" x2="120" y2="50" stroke="hsl(var(--foreground))" strokeWidth="2.5" />
    <polygon points="114,55 120,42 126,55" fill="hsl(var(--foreground))" />
    <text x="120" y="145" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="10">Предмет</text>
    <text x="120" y="157" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="9">(30 см от линзы)</text>
    {/* Центр линзы */}
    <text x="250" y="200" textAnchor="middle" fill="hsl(var(--primary))" fontSize="10">Линза (D = +5 дптр)</text>
    {/* Размеры */}
    <text x="170" y="20" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="9">F = 20 см</text>
    <line x1="170" y1="25" x2="250" y2="25" stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeDasharray="3" />
  </svg>
);

/* ——— Компонент ——— */

const Grade9Physics = ({ answers, attachments, onAnswerChange, onAttachmentChange }: Grade9PhysicsProps) => {
  return (
    <div className="space-y-6">
      {/* ═══════ ЧАСТЬ 1. ТЕОРИЯ ═══════ */}
      <Card>
        <CardHeader>
          <CardTitle>Часть 1. Теоретические вопросы</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 1 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 1. Динамика — Законы Ньютона</Label>
            <p className="text-sm text-muted-foreground">
              Сформулируйте первый, второй и третий законы Ньютона. Запишите формулы для каждого закона.
            </p>
            <p className="text-sm text-muted-foreground italic">
              Дополнительный вопрос на понимание: Почему пассажир автобуса отклоняется назад при резком разгоне? Какой именно закон Ньютона объясняет это явление и почему?
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[0]} onChange={(e) => onAnswerChange(0, e.target.value)} rows={5} />
          </div>

          {/* 2 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 2. Законы сохранения — Механическая энергия</Label>
            <p className="text-sm text-muted-foreground">
              Сформулируйте закон сохранения механической энергии. При каком условии полная механическая энергия замкнутой системы остаётся постоянной?
            </p>
            <p className="text-sm text-muted-foreground italic">
              Дополнительный вопрос: Если энергия сохраняется, то почему реальный маятник со временем останавливается? Куда «исчезает» его энергия? Противоречит ли это закону сохранения энергии?
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[1]} onChange={(e) => onAnswerChange(1, e.target.value)} rows={5} />
          </div>

          {/* 3 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 3. Статика — Правило моментов</Label>
            <p className="text-sm text-muted-foreground">
              Сформулируйте условие равновесия твёрдого тела с закреплённой осью вращения (правило моментов). Что такое плечо силы? Приведите формулы.
            </p>
            <p className="text-sm text-muted-foreground italic">
              Дополнительный вопрос: Почему дверную ручку устанавливают как можно дальше от петель? Объясните с точки зрения правила моментов.
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[2]} onChange={(e) => onAnswerChange(2, e.target.value)} rows={5} />
          </div>

          {/* 4 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 4. Механические волны</Label>
            <p className="text-sm text-muted-foreground">
              В чём заключается основное свойство бегущих волн? Происходит ли в бегущей волне перенос энергии и перенос вещества?
            </p>
            <p className="text-sm text-muted-foreground italic">
              Дополнительный вопрос: Если морская волна переносит энергию, почему поплавок на поверхности воды не уносится волной вдаль, а лишь покачивается на месте?
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[3]} onChange={(e) => onAnswerChange(3, e.target.value)} rows={4} />
          </div>

          {/* 5 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 5. Звук</Label>
            <p className="text-sm text-muted-foreground">
              От каких физических величин зависят высота и громкость звука? В какой среде (воздух, вода или твёрдое тело) звук будет распространяться с наибольшей скоростью и почему?
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[4]} onChange={(e) => onAnswerChange(4, e.target.value)} rows={4} />
          </div>

          {/* 6 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 6. Геометрическая оптика — Преломление света</Label>
            <p className="text-sm text-muted-foreground">
              Сформулируйте закон преломления света (закон Снеллиуса). В чём заключается физический смысл абсолютного показателя преломления среды? Приведите 3 примера из реальной жизни, где применяются свойства преломления.
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[5]} onChange={(e) => onAnswerChange(5, e.target.value)} rows={5} />
          </div>

          {/* 7 */}
          <div className="space-y-2">
            <Label className="font-semibold">Вопрос 7. Электромагнитные волны</Label>
            <p className="text-sm text-muted-foreground">
              Что представляет собой электромагнитная волна? Какие физические векторы в ней периодически меняются (колеблются)? Как направлены эти векторы относительно направления распространения волны?
            </p>
            <Textarea placeholder="Ваш ответ..." value={answers[6]} onChange={(e) => onAnswerChange(6, e.target.value)} rows={4} />
          </div>
        </CardContent>
      </Card>

      {/* ═══════ ЧАСТЬ 2. РАСЧЁТНЫЕ ЗАДАЧИ ═══════ */}
      <Card>
        <CardHeader>
          <CardTitle>Часть 2. Расчётные задачи</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Задача 1 */}
          <div className="space-y-2">
            <Label className="font-semibold">Задача 1. Кинематика и Динамика</Label>
            <p className="text-sm text-muted-foreground">
              Автомобиль массой <b>1,5 т</b>, начав движение из состояния покоя, разгоняется прямолинейно и равноускоренно. За первые <b>12 с</b> он проходит путь <b>128 м</b>.
            </p>
            <p className="text-sm text-muted-foreground">
              Вычислите ускорение автомобиля и равнодействующую всех сил, приложенных к нему, применяя второй закон Ньютона. Запишите полное решение с формулами.
            </p>
            <Textarea placeholder="Ваш ответ (решение с формулами)..." value={answers[7]} onChange={(e) => onAnswerChange(7, e.target.value)} rows={5} />
            <FileAttach file={attachments[7] || null} onFileChange={(f) => onAttachmentChange(7, f)} />
          </div>

          {/* Задача 2 */}
          <div className="space-y-2">
            <Label className="font-semibold">Задача 2. Статика и правило моментов</Label>
            <p className="text-sm text-muted-foreground">
              Однородная линейка длиной <b>0,8 м</b> находится в горизонтальном равновесии, если её подпереть на расстоянии <b>25 см</b> от одного из концов, к которому подвешен груз. Масса груза в <b>2,3 раза</b> больше массы линейки. Сила тяжести линейки приложена к её центру тяжести (середине).
            </p>
            <LeverDiagram />
            <p className="text-sm text-muted-foreground font-medium">
              Выберите один из вариантов задания:
            </p>
            <p className="text-sm text-muted-foreground">
              <b>Вариант А:</b> Начертите схему и докажите с помощью правила моментов, что система находится в равновесии.<br />
              <b>Вариант Б:</b> Определите, какую массу должен иметь груз, чтобы система находилась в равновесии (если масса линейки = M).
            </p>
            <Textarea placeholder="Ваш ответ (укажите выбранный вариант и решение)..." value={answers[8]} onChange={(e) => onAnswerChange(8, e.target.value)} rows={6} />
            <FileAttach file={attachments[8] || null} onFileChange={(f) => onAttachmentChange(8, f)} />
          </div>

          {/* Задача 3 */}
          <div className="space-y-2">
            <Label className="font-semibold">Задача 3. Импульс — Закон сохранения импульса</Label>
            <p className="text-sm text-muted-foreground">
              Два пластилиновых шара движутся навстречу друг другу по гладкой горизонтальной поверхности. Масса первого шара <b>2,3 кг</b>, его скорость <b>3,2 м/с</b>. Масса второго шара <b>4,5 кг</b>, его скорость <b>1,7 м/с</b>. После столкновения шары слипаются.
            </p>
            <CollisionDiagram />
            <p className="text-sm text-muted-foreground">
              Пользуясь законом сохранения импульса, определите скорость и направление движения шаров после столкновения. Запишите полное решение.
            </p>
            <Textarea placeholder="Ваш ответ (решение с формулами)..." value={answers[9]} onChange={(e) => onAnswerChange(9, e.target.value)} rows={6} />
            <FileAttach file={attachments[9] || null} onFileChange={(f) => onAttachmentChange(9, f)} />
          </div>

          {/* Задача 4 */}
          <div className="space-y-2">
            <Label className="font-semibold">Задача 4. Закон сохранения механической энергии</Label>
            <p className="text-sm text-muted-foreground">
              Яблоко массой <b>230 г</b> падает с ветки дерева с высоты <b>2,9 м</b> без начальной скорости. Сопротивлением воздуха пренебречь. Принять <b>g = 10 м/с²</b>.
            </p>
            <p className="text-sm text-muted-foreground">
              Применяя закон сохранения механической энергии, рассчитайте, какой кинетической энергией будет обладать яблоко на высоте <b>0,9 м</b> от земли.
            </p>
            <Textarea placeholder="Ваш ответ (решение с формулами)..." value={answers[10]} onChange={(e) => onAnswerChange(10, e.target.value)} rows={5} />
            <FileAttach file={attachments[10] || null} onFileChange={(f) => onAttachmentChange(10, f)} />
          </div>

          {/* Задача 5 */}
          <div className="space-y-2">
            <Label className="font-semibold">Задача 5. Звуковые волны</Label>
            <p className="text-sm text-muted-foreground">
              Источник звука совершает колебания с частотой <b>200 Гц</b>. Рассчитайте длину образующейся звуковой волны:
            </p>
            <ul className="text-sm text-muted-foreground list-disc ml-6">
              <li>в воздухе при температуре 20 °С (скорость звука <b>v = 343 м/с</b>)</li>
              <li>в воде (скорость звука <b>v = 1483 м/с</b>)</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-1">
              Запишите формулу и подставьте значения для обоих случаев.
            </p>
            <Textarea placeholder="Ваш ответ (решение с формулами)..." value={answers[11]} onChange={(e) => onAnswerChange(11, e.target.value)} rows={4} />
            <FileAttach file={attachments[11] || null} onFileChange={(f) => onAttachmentChange(11, f)} />
          </div>

          {/* Задача 6 */}
          <div className="space-y-2">
            <Label className="font-semibold">Задача 6. Линзы и построение изображений</Label>
            <p className="text-sm text-muted-foreground">
              Оптическая сила собирающей линзы равна <b>+5 дптр</b>.
            </p>
            <ol className="text-sm text-muted-foreground list-decimal ml-6 space-y-1">
              <li>Определите фокусное расстояние этой линзы в метрах и сантиметрах.</li>
              <li>Предмет помещён на расстоянии <b>30 см</b> от оптического центра линзы (между фокусом и двойным фокусом). Постройте изображение предмета.</li>
              <li>Охарактеризуйте полученное изображение: действительное или мнимое, увеличенное или уменьшенное, прямое или перевёрнутое.</li>
            </ol>
            <LensDiagram />
            <Textarea placeholder="Ваш ответ (расчёт + описание изображения)..." value={answers[12]} onChange={(e) => onAnswerChange(12, e.target.value)} rows={6} />
            <FileAttach file={attachments[12] || null} onFileChange={(f) => onAttachmentChange(12, f)} />
          </div>
        </CardContent>
      </Card>

      {/* ═══════ ЧАСТЬ 3. КАЧЕСТВЕННАЯ ЗАДАЧА ═══════ */}
      <Card>
        <CardHeader>
          <CardTitle>Часть 3. Качественная задача</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label className="font-semibold">Задача 7. Преломление света — объяснение явления</Label>
          <p className="text-sm text-muted-foreground">
            Если опустить ложку в стакан с водой, она кажется «сломанной» на границе воды и воздуха. Это хорошо знакомое бытовое наблюдение.
          </p>
          <p className="text-sm text-muted-foreground">
            <b>Задание:</b> Объясните это явление, используя закон преломления света. Почему наблюдатель видит ложку изогнутой? Нарисуйте схему хода лучей от подводной части ложки к глазу наблюдателя, показав преломление на границе «вода — воздух».
          </p>
          <p className="text-sm text-muted-foreground italic">
            Подсказка: вспомните, как меняется направление луча при переходе из оптически более плотной среды в менее плотную.
          </p>
          <Textarea placeholder="Ваш ответ (объяснение явления)..." value={answers[13]} onChange={(e) => onAnswerChange(13, e.target.value)} rows={6} />
          <FileAttach file={attachments[13] || null} onFileChange={(f) => onAttachmentChange(13, f)} />
        </CardContent>
      </Card>
    </div>
  );
};

export default Grade9Physics;
