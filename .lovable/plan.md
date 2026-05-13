## Решения по уточнениям

1. **Штраф** = 0.5 от баллов вопроса за неверный ответ. «Не знаю» / пустой = 0.
2. **Приглушение** — везде, во всех классах и предметах: визуально выделяется только featured (последний добавленный) тест в каждой секции, остальные становятся «архивом» (`opacity-60`, бейдж «Архив»).
3. **Расчётные задачи** — автоматическая AI-проверка через Lovable AI (как у 6-тех / 7-инф), с поддержкой пропуска без штрафа.

## Часть 1. Квиз `Grade9PhysicsFinalQ4Quiz` (15 вопросов)

Файл: `src/components/tests/Grade9PhysicsFinalQ4Quiz.tsx`

- Каждый вопрос: 4 содержательных варианта + **5-й «Не знаю / пропустить»** (маркер `isSkip: true`).
- Тайминги per-question:
  - Q1, Q3, Q6, Q12 — 60 сек (короткие фактологические)
  - Q2, Q9, Q10, Q11, Q14 — 75 сек (средние)
  - Q4, Q5, Q7, Q8, Q13, Q15 — 90 сек (расчёт/анализ)
- Никаких ответов и пояснений ученику не показывается (как у других квизов).

## Часть 2. Расчётные задачи `Grade9PhysicsFinalQ4Written` (6 задач, по одной на экран)

Файл: `src/components/tests/Grade9PhysicsFinalQ4Written.tsx`

- Шаговый рендер: 1 задача на экран, textarea + чекбокс «Не знаю / пропустить (без штрафа)».
- Кнопки «Назад» / «Далее», на последнем экране — «Завершить».
- Состояние `{ q1..q6: { text: string, skipped: boolean } }` хранится в `Index.tsx`.
- Каждое поле автосохраняется в localStorage (мгновенно) и в `student_drafts` через `save-draft` (debounce 5 сек) — как у всех других тестов.
- Подпись в шапке: «За правильный — баллы. За неверный — штраф ½. За "Не знаю" — 0 (без штрафа).»

## Новая система оценивания

`src/lib/gradingPenalty.ts` (+ `.test.ts`):

```text
gradeQuizWithPenalty(questions, answers, { penalty: 0.5 })
  правильный   → +points
  «не знаю»    → 0
  неправильный → -points * 0.5
итог = max(0, sum) / maxPoints → процент → 2/3/4/5
```

Дубликат для Deno: `supabase/functions/_shared/gradingPenalty.ts` (импортируется из `send-test-results`).

Для расчётных задач:
- AI-грейдинг через `grade-quiz-text-batch` (расширим whitelist).
- В системный промпт грейдера добавляем правило: если ответ помечен `skipped: true` или явно содержит «не знаю / не понимаю / пропускаю» — ставим 0 без штрафа.
- Для верных ответов AI ставит полный балл, для частично верных — пропорциональный, для неверных непустых — отрицательный (× 0.5).
- Задача №4 (ловушка): эталон в `gradingHint` явно говорит «правильно: задача нерешаема, недостаточно данных».

## Интеграция (`src/pages/Index.tsx`)

- Регистрация в `TESTS_CATALOG` для (9, Физика): новый id `final-q4-quiz`.
- `featuredId = "final-q4-quiz"` для (9, Физика).
- `TESTS_WITH_QUIZ` пополнить.
- Ветка submit: hybrid (квиз + 6 задач) → `send-test-results` с флагом `gradingMode: "penalty"`.
- Универсальное визуальное правило для **всех** карточек тестов: featured → акцентный border + бейдж «Актуальный»; остальные → `opacity-60 grayscale-[0.2]` + бейдж «Архив».

## Реестры и edge

1. `src/lib/quizRegistry.ts` + `.test.ts` — добавить `grade9physicsFinalQ4Quiz`.
2. `supabase/functions/send-test-results/index.ts`:
   - whitelist `grade9physicsFinalQ4Quiz`;
   - применить `gradingPenalty` к квизу;
   - вызвать AI-батч для 6 задач с инструкцией про «не знаю»;
   - Telegram: «Физика 9 (15 вопросов + 6 задач, штрафная шкала)», по каждому вопросу — `+1 / 0 / −0.5`.
3. `supabase/functions/grade-quiz-text-batch/index.ts` — добавить новый тест в whitelist + system-prompt про пропуск.

## Что НЕ трогаем

- БД-миграции не нужны (всё через `test_results.answers` jsonb).
- Античит, rrweb, валидация ФИО, live-сессии, зеркала, draft — работают автоматически.
- Существующая логика подсчёта остальных тестов не меняется (penalty активируется только по флагу `gradingMode`).

## Затрагиваемые файлы

- `src/components/tests/Grade9PhysicsFinalQ4Quiz.tsx` (new)
- `src/components/tests/Grade9PhysicsFinalQ4Written.tsx` (new)
- `src/lib/gradingPenalty.ts` (new) + `.test.ts` (new)
- `src/lib/quizRegistry.ts`, `src/lib/quizRegistry.test.ts`
- `src/pages/Index.tsx` (catalog + featured + ветка submit + универсальное приглушение архивных карточек)
- `supabase/functions/_shared/gradingPenalty.ts` (new)
- `supabase/functions/send-test-results/index.ts`
- `supabase/functions/grade-quiz-text-batch/index.ts`
