## Итоговая годовая контрольная — 7 класс, Технология (Q4)

Формат полностью повторяет уже работающую модель `6_technology_final-q4` / `8_physics_final-q4`: квиз → письменная часть в той же сессии, общий 40-минутный таймер, антифрод и автосейв уже включены автоматически.

### 1. Новый компонент `src/components/tests/Grade7TechnologyFinalQ4.tsx`

Экспортирует:
- **default** — компонент письменной части (12 заданий: 4 практических задачи + 8 теоретических вопросов). Каждое задание = `Textarea` + `FileAttach` (текст + фото из тетради, как в hybrid).
- **`FINAL_Q4_TECH7_QUIZ_QUESTIONS: QuizQuestion[]`** — массив из 15 вопросов с `seconds: 60` (адаптивно через `seconds` на каждом вопросе, как у 6 класса).

Содержимое — ровно тот текст, что прислал пользователь:
- Часть 0 (квиз): 15 вопросов, 3 блока. Правильные индексы (0-based):
  Б1: 1)в=2, 2)б=1, 3)в=2, 4)б=1, 5)б=1; Б2: 6)а=0, 7)б=1, 8)в=2, 9)б=1, 10)б=1; Б3: 11)б=1, 12)б=1, 13)б=1, 14)б=1, 15)а=0.
- Часть 1 (4 задачи): задачи 1–4 (базовая, средняя, средняя, повышенная).
- Часть 2 (8 теоретических вопросов).

Учебный пример «МУЛЬТИМЕДИА» — рендерим как нередактируемый блок-подсказку перед задачей 1 (без поля ввода), `userSelect: "none"`.

### 2. `src/pages/Index.tsx` — подключение

**Каталог работ** (`TESTS_CATALOG["7"].technology`) — добавить первой строкой:
```ts
{ id: "final-q4", title: "🌟 Итоговая годовая контрольная за 4 четверть (с квизом)" }
```
Существующая `{ id: "default", title: "Итоговая контрольная (3 четверть)" }` остаётся ниже.

**Регистрация квиза** в `TESTS_WITH_QUIZ`:
```ts
"7_technology_final-q4": { questions: FINAL_Q4_TECH7_QUIZ_QUESTIONS, secondsPerQuestion: 60 }
```
(`secondsPerQuestion` используется только для интро-экрана; реальное время берётся из `seconds` каждого вопроса.)

**State + refs** — новая пара (по аналогии с `answers6techFinalQ4`):
```ts
const [answers7techFinalQ4, setAnswers7techFinalQ4] = useState<string[]>(Array(12).fill(""));
const [attachments7techFinalQ4, setAttachments7techFinalQ4] = useState<Record<number, File | null>>({});
const answers7techFinalQ4Ref = useRef(answers7techFinalQ4);
const attachments7techFinalQ4Ref = useRef(attachments7techFinalQ4);
// + useEffect синхронизации refs
```

**Подключения** в существующие switch-цепочки (строго рядом с веткой 6/technology/final-q4):
- restore-эффект (~стр. 336)
- persist-эффект (~стр. 395) + добавить в deps
- flush-эффект (~стр. 436) — добавить в объект
- `answered/total` (~стр. 473) — `total: 12`
- `doSubmit` (~стр. 896) — новый блок:
  ```ts
  } else if (g === "7" && s === "technology" && tid === "final-q4") {
    fileUrls = await uploadAttachments(attachments7techFinalQ4Ref.current);
    answers = { type: "grade7technologyFinalQ4", answers: answers7techFinalQ4Ref.current, quizResults: quizResultsRef.current };
  }
  ```
- Рендер на test-screen — новый блок до общей `Grade7Technology`-ветки.

### 3. Подсветка работы на экране выбора (`loginStep === "test-pick"`)

Только когда `grade === "7" && subject === "technology"`: целевая работа (`final-q4`) выводится первой, **подсвечена**, остальные — **затемнены**.

Переписать рендер `tests.map`:
- Сначала отсортировать массив: `final-q4` наверху, потом остальные.
- Для подсвеченной кнопки: `variant="default"`, добавить `ring-2 ring-primary shadow-lg shadow-primary/30 scale-[1.02]` + бейдж «🔥 Актуальная работа».
- Для остальных: `className` с `opacity-50 hover:opacity-75 grayscale`.

Для других предметов/классов — поведение не меняется (как сейчас).

### 4. Edge-функция `supabase/functions/send-test-results/index.ts`

В строке 156 уже есть массив типов с квизом — добавить туда `body.type === "grade7technologyFinalQ4"`. Найти секцию рендера `grade6technologyFinalQ4` (по аналогии) и добавить ветку рендера для `grade7technologyFinalQ4` с заголовками: «Часть 1. Практика (задачи 1–4)» (индексы 0–3) и «Часть 2. Теория (вопросы 1–8)» (индексы 4–11), вкл. cheatLog + результаты квиза.

### Файлы

- **+** `src/components/tests/Grade7TechnologyFinalQ4.tsx` (новый, ~250 строк)
- **~** `src/pages/Index.tsx` (~10 точечных правок)
- **~** `supabase/functions/send-test-results/index.ts` (тип + рендер-ветка)

### Что НЕ трогаю

- Структура login-шагов, БД, антифрод, таймер, автосейв (уже всё это работает универсально).
- Существующая работа `7/technology/default` — остаётся доступной, просто затемнена.
