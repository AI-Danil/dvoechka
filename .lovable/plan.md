

## План: Квиз + вторая контрольная по физике для 9 класса

### 1. Новый компонент квиза `src/components/QuizIntro.tsx` + `Quiz.tsx`

Универсальный квиз-движок (переиспользуем в будущем):
- Props: `questions: {q: string, options: [A,B,C,D], correct: number}[]`, `secondsPerQuestion: number`, `onFinish: (results: {answers: number[], correct: number, total: number, perQuestion: {answer: number, correct: number, timeSpent: number, timedOut: boolean}[]}) => void`
- Экран-заставка: «Сейчас будет квиз. 5 вопросов, по 20 секунд на каждый, один правильный ответ. После квиза — задачи. Кнопка "Начать"».
- Логика квиза:
  - Показ одного вопроса за раз с 4 вариантами (radio-buttons)
  - Таймер 20 сек на вопрос с круговым прогресс-баром
  - При выборе ответа ИЛИ истечении времени → автопереход на следующий вопрос (без возможности вернуться)
  - В конце → вызов `onFinish` с результатами → автопереход к задачам
- Защита: `user-select: none` на вопросах и вариантах

### 2. Новый компонент `src/components/tests/Grade9PhysicsAtom.tsx`

6 расчётных задач (Textarea + FileAttach):
1. Анатомия ядра калия ¹⁹₃₉K
2. Правила смещения (α-распад U-238, β-распад C-14)
3. Скрытая угроза (¹⁰₅B + ? → ⁷₃Li + ⁴₂He)
4. Многоступенчатый распад Th-234 → U-234
5. Таймер радиации (6 суток, T½=2 суток)
6. Треки в камере Вильсона

Шапка: «Контрольная по физике (9 класс). Тема: Строение атома и атомного ядра. Радиоактивность.»

### 3. Каталог `TESTS_CATALOG` (`Index.tsx`)

```ts
"9": {
  physics: [
    { id: "default", title: "Контрольная №1. Механика, волны, оптика" },
    { id: "atom", title: "Контрольная №2. Атом и атомное ядро (с квизом)", hasQuiz: true },
  ],
  ...
}
```

### 4. Изменения `Index.tsx`

- Новый state: `quizPhase: "intro" | "running" | "done" | null`, `quizResults`, `answers9physAtom` (Array(6)), `attachments9physAtom`
- Когда `testId === "atom"` и `hasQuiz`:
  - При нажатии «Начать тестирование» → не сразу тест, а `<QuizIntro />` → `<Quiz />` → когда `quizPhase === "done"` → рендер `<Grade9PhysicsAtom />`
  - Таймер 40 минут стартует ТОЛЬКО после окончания квиза
- doSubmit: `type: "grade9physicsAtom"`, в payload добавить `quizResults` (ответы + сколько правильно)
- Draft key включает `testId` (уже сделано)

### 5. Изменения `supabase/functions/send-test-results/index.ts`

- Новая ветка `body.type === "grade9physicsAtom"`:
  - Сохранить в БД `answersData.answers` + `answersData.quizResults`
  - В Telegram отправить:
    - Заголовок с `testTitle`
    - Блок «🎯 КВИЗ: X/5 правильных» + по каждому вопросу: ответ ученика + правильный ответ + ⏱ время
    - Блок «📊 ЗАДАЧИ» с 6 задачами + 📎

### Файлы

| Действие | Файл |
|----------|------|
| Создать | `src/components/Quiz.tsx` |
| Создать | `src/components/tests/Grade9PhysicsAtom.tsx` |
| Изменить | `src/pages/Index.tsx` (каталог, флоу с квизом, state, submit) |
| Изменить | `supabase/functions/send-test-results/index.ts` (ветка grade9physicsAtom + квиз) |

### Уточнение поведения квиза

- Если ученик не успел ответить за 20 сек → засчитывается как «нет ответа» (correct: -1) и автопереход
- Назад вернуться нельзя, прервать квиз нельзя
- Результаты квиза НЕ показываются ученику (только учителю в Telegram), чтобы не было давления
- После квиза сразу видно блок с 6 задачами и стандартный 40-минутный таймер

