# Итоговая контрольная за 4 четверть — 8 класс, физика

Добавляем новый тест `final-q4` для 8 класса по физике. Он состоит из:
- **Квиз** — 15 вопросов с **индивидуальным временем** (45/60/90 сек по условию).
- **Расчётная часть** — 6 задач с местом для решения и прикреплением фото.

Структурно повторяем шаблон `9_physics_atom` и `7_physics_work-power` (квиз → задачи → отправка с `quizResults`).

## Что создаём / меняем

### 1. Новый файл `src/components/tests/Grade8PhysicsFinalQ4.tsx`
- Экспортирует `FINAL_Q4_QUIZ_QUESTIONS: QuizQuestion[]` (15 вопросов из ТЗ).
  - Каждый вопрос с полем `seconds` (45/60/90), `options` (4), `correct` (0..3).
  - Тексты вопросов и вариантов **дословно** из задания, **без подсказок «Подвох/Правильный ответ»** для ученика.
- Компонент `Grade8PhysicsFinalQ4` — рендерит 6 задач в `Card` с `Textarea` и `FileAttach` (как в `Grade8PhysicsPower`).
- Тексты задач 1–6 из ТЗ, помечены «избыточные данные — будь внимателен».

### 2. `src/pages/Index.tsx`
- В `TESTS_CATALOG["8"].physics` добавить:
  ```
  { id: "final-q4", title: "Итоговая контрольная за 4 четверть (с квизом)" }
  ```
- В `TESTS_WITH_QUIZ`:
  ```
  "8_physics_final-q4": { questions: FINAL_Q4_QUIZ_QUESTIONS, secondsPerQuestion: 60 }
  ```
  (значение `secondsPerQuestion` — фолбэк, реальное время берётся из `q.seconds`).
- Импорт компонента и `FINAL_Q4_QUIZ_QUESTIONS`.
- Новые состояния:
  - `answers8physFinalQ4: string[]` (длина 6), `attachments8physFinalQ4: Record<number, File|null>`, refs к ним.
- Ветки в:
  - draft restore (`useEffect` с `localStorage.getItem`),
  - draft save (`useEffect` persist),
  - подсчёт `answered/total`,
  - submit (`type: "grade8physicsFinalQ4"`, `answers`, `quizResults`),
  - рендер: `grade==="8" && subject==="physics" && testId==="final-q4"` → `<Grade8PhysicsFinalQ4 …/>` (и скорректировать существующее условие `testId !== "power-joule"` → исключить также `final-q4`).

### 3. `src/lib/quizRegistry.ts`
- Добавить:
  ```
  grade8physicsFinalQ4: FINAL_Q4_QUIZ_QUESTIONS
  ```
  чтобы сервер/админка корректно проверяли правильные ответы.

## Что НЕ трогаем
- Edge functions, БД, RLS, маршруты, существующие тесты — без изменений.
- `bootstrap.ts`, `vite.config.ts`, `index.html` — диагностика «белого экрана» уже на месте.

## Правильные ответы для квиза (для записи в коде, indices 0..3 = а/б/в/г)
1→в (2), 2→а (0), 3→б (1), 4→в (2), 5→б (1), 6→б (1), 7→в (2), 8→а (0), 9→в (2), 10→б (1), 11→а (0), 12→в (2), 13→в (2), 14→в (2), 15→б (1).

После одобрения — реализую за один проход.
