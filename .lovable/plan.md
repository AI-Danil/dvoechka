## План: 5 класс, Технология — Итоговая Q4 (Вариант 2)

### 1. Новый компонент теста
Создать `src/components/tests/Grade5TechnologyFinalQ4V2.tsx` (по образцу `Grade6TechnologyFinalQ4.tsx`):
- Экспорт `FINAL_Q4_TECH5_V2_QUIZ_QUESTIONS` — 15 вопросов × 60 сек (полный текст из ТЗ: информация, устройства ввода, ТБ, файлы, папки, источник/приёмник, фишинг, пробелы, Shift, форматирование, Ctrl+X, списки, строки таблицы, «+» в логической таблице, столбчатая диаграмма).
- Default-export — 4 письменных задания (16–19) с подробными «инструкциями для ученика»: горячие клавиши, безопасность/облака, табличный детектив, наглядные формы. Каждое — `Textarea` + `FileAttach`. Текст условий с `userSelect: "none"`.

### 2. Меню в `src/pages/Index.tsx`
- В `AVAILABLE_TESTS` добавить `"5": ["technology"]` — у пятиклассников в меню только Технология.
- В `TESTS_CATALOG` добавить:
  ```ts
  "5": {
    technology: [
      { id: "final-q4-v2", title: "🌟 Итоговая контрольная за 4 четверть (Вариант 2)" },
    ],
  }
  ```
  Других тестов у 5 класса не будет — «скрытие» достигается отсутствием записей в каталоге.

### 3. Подключение в `Index.tsx`
- Импорт `Grade5TechnologyFinalQ4V2` и `FINAL_Q4_TECH5_V2_QUIZ_QUESTIONS`.
- В `TESTS_WITH_QUIZ` добавить `"5_technology_final-q4-v2": { questions: FINAL_Q4_TECH5_V2_QUIZ_QUESTIONS, secondsPerQuestion: 60 }`.
- Новые state/refs: `answers5techFinalQ4V2: string[]` (длина 4) + `attachments5techFinalQ4V2`.
- Добавить ветки `grade === "5" && subject === "technology" && testId === "final-q4-v2"` во все существующие switch-блоки:
  - локальный restore (~строка 369),
  - серверный restore (~строка 462),
  - локальный autosave `data` (~строка 522) + dep-массив,
  - локальный flush `written` (~строка 565),
  - серверный payload `written` (~строка 610),
  - сабмит `answers` (~строка 1135) — `type: "grade5technologyFinalQ4V2"`, с `quizResults`,
  - прогресс `{ answered, total: 4 }` (~строка 710) + dep-массив,
  - render-блок (~строка 1613).

### 4. Регистрация квиза для серверной проверки
В `src/lib/quizRegistry.ts` добавить:
```ts
grade5technologyFinalQ4V2: FINAL_Q4_TECH5_V2_QUIZ_QUESTIONS,
```

### 5. Память проекта
Обновить `mem://content/available-tests` — отметить, что у 5 класса доступна только Технология / Итоговая Q4 Вариант 2 (15 вопросов квиз + 4 письменных).

### Что НЕ трогаем
- БД, edge-функции, RLS — без изменений.
- Каталоги 6/7/8/9 классов — без изменений.
- Анти-чит, таймер 40 мин, авто-сабмит, rrweb, Telegram-отчёт — работают через общий пайплайн.

### Затронутые файлы
- **создаём:** `src/components/tests/Grade5TechnologyFinalQ4V2.tsx`
- **редактируем:** `src/pages/Index.tsx`, `src/lib/quizRegistry.ts`, `mem://content/available-tests`
