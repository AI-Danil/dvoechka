## Итоговая КР, 6 класс, Технология (гибрид)

Делаю по образцу `Grade8PhysicsFinalQ4` — самый свежий гибрид с квизом + письменными задачами.

## Параметры (по твоим ответам)

- Предмет: **technology** (для 6 класса)
- Квиз: **15 вопросов × 60 сек**
- Общий таймер: **40 минут** (стандартный)
- Письменные: **textarea + опц. фото** (FileAttach), 6 заданий

## Файлы

### 1. Новый: `src/components/tests/Grade6TechnologyFinalQ4.tsx`

Структура копирует `Grade8PhysicsFinalQ4.tsx`:
- Экспорт `Grade6TechnologyFinalQ4` — карточка с 6 письменными заданиями (Textarea + FileAttach), заголовок «Итоговая контрольная за 4 четверть. Технология, 6 класс».
- Экспорт `FINAL_Q4_TECH6_QUIZ_QUESTIONS: QuizQuestion[]` — 15 вопросов из твоего текста, у каждого `seconds: 60`, `correct` индекс правильного ответа (А=0, Б=1, В=2, Г=3).

Правильные ответы из твоего материала:
```
1→А(жидк)=0, 2→В(разновидность)=2, 3→Г(30)=3, 4→Г(сезон)=3, 5→Г(изобр+звук)=3,
6→Г(суждение)=3, 7→В=2, 8→Г(25)=3, 9→Г(фотоаппарат)=3, 10→Г(словесная)=3,
11→В(опыт получателя)=2, 12→Г(Солнечная сист.)=3, 13→Г(натурные)=3,
14→Г(.bmp)=3, 15→В(1024)=2.
```

Письменные (6 шт.) — задания 1–6 целиком, БЕЗ ответов в скобках (ответы только в исходнике для тебя/учителя).

### 2. Правки в `src/pages/Index.tsx`

- **Импорт** (стр. 28): добавить
  `import Grade6TechnologyFinalQ4, { FINAL_Q4_TECH6_QUIZ_QUESTIONS } from "@/components/tests/Grade6TechnologyFinalQ4";`
- **`TESTS_CATALOG`** — добавить ветку:
  ```ts
  "6": {
    technology: [
      { id: "final-q4", title: "Итоговая контрольная за 4 четверть (с квизом)" },
    ],
  },
  ```
- **`TESTS_WITH_QUIZ`** — добавить:
  ```ts
  "6_technology_final-q4": { questions: FINAL_Q4_TECH6_QUIZ_QUESTIONS, secondsPerQuestion: 60 },
  ```
- **State** + **ref** + **sync useEffect** для `answers6techFinalQ4` (Array(6)) и `attachments6techFinalQ4` (Record<number, File|null>).
- **Restore draft** (≈ стр. 308): ветка `grade==="6" && subject==="technology" && testId==="final-q4"`.
- **Save draft** (≈ стр. 351) + добавить в зависимости useEffect (стр. 374, 412).
- **Counter answered** (≈ стр. 386): `{ answered: answers6techFinalQ4.filter(Boolean).length, total: 6 }`.
- **Submit payload** (≈ стр. 802): ветка для `g==="6" && s==="technology" && tid==="final-q4"` — `answers: answers6techFinalQ4Ref.current`, attachments аналогично.
- **Render** (≈ стр. 1212): блок с `<Grade6TechnologyFinalQ4 ...>`.

### 3. `AVAILABLE_TESTS` 

Уже добавлено `"6": ["informatics", "technology", "physics"]` в прошлом сообщении — оставляю как есть, ребёнок выберет «Технология».

## Чего НЕ трогаю

- БД, edge-функции, RLS — без изменений (гибрид использует тот же путь, что и 8-й класс final-q4).
- Live-сессии — этот тест работает и через прямой выбор, и (при желании) учитель сможет запустить live, т.к. движок одинаковый.
- Контент по информатике/физике для 6 кл. — сейчас не делаем.
