# Проверка: 7 класс, физика, итоговая Q4 — Бирюкова Виктория

## Что нашёл в БД

Сабмит **есть**, сегодня 2026-05-19 08:47:
- `id = 1644e837-…`, `test_type = grade7physicsFinalQ4`
- Квиз: **9/10** правильных (ошибка только в #9 — кинетическая энергия при удвоении v)
- Расчётные задачи (все 6 заполнены, ничего не пропущено):
  1. 300 кДж ✅
  2. 60 Вт ✅
  3. 15 см ✅
  4. 45 Дж ✅
  5. 75% ✅
  6. **294 Дж** (эталон 300 Дж — ученица посчитала с g=9,8 вместо 10; AI должна засчитать как частично верно)

## Что работает

- Автосохранение черновика — да, в payload есть `answers7physFinalQ4` (Index.tsx:756, :809), нормализация при чтении сделана, `B.trim is not a function` больше не воспроизводится.
- Отправка в Telegram + AI-проверка задач — отрабатывает в `send-test-results` (ветка `grade7physicsFinalQ4`, строки 654–744). `grade-quiz-text-batch` вызывается, отчёт уходит в TG.
- Сабмит в БД — успешен.

## Где баг

### 1. (Главное) В Replay вместо вопросов будет «[вопрос недоступен]»

`src/pages/Replay.tsx:296` берёт `answersPayload.type` = **`grade7physicsFinalQ4`** и ищет в `QUIZ_REGISTRY`. А в `src/lib/quizRegistry.ts:36` ключ зарегистрирован как **`grade7physicsFinalQ4Quiz`** (с суффиксом `Quiz`). Не совпадает → вопросы не отрисуются.

Та же проблема симметрично у `grade9physicsFinalQ4` (ключ в реестре `grade9physicsFinalQ4Quiz`, в БД `grade9physicsFinalQ4`). Проверил `Index.tsx:1461` и `:1491` — оба отправляют `type` без суффикса `Quiz`.

### 2. (Информативно, не баг) `ai_total_score` в БД всегда NULL

`send-test-results` нигде не пишет `ai_grading` / `ai_total_score` в `test_results` — это by design, AI-балл уходит только в Telegram. Для этого случая в TG отчёт пришёл.

## План правок

Минимальные правки, без миграций и без перезаписи исторических данных.

### `src/lib/quizRegistry.ts`
Переименовать два ключа, чтобы совпадали с реальным `type` из сабмита:

```ts
// было
grade9physicsFinalQ4Quiz: FINAL_Q4_PHYS9_QUIZ_QUESTIONS,
grade7physicsFinalQ4Quiz: FINAL_Q4_PHYS7_QUIZ_QUESTIONS,

// стало
grade9physicsFinalQ4: FINAL_Q4_PHYS9_QUIZ_QUESTIONS,
grade7physicsFinalQ4: FINAL_Q4_PHYS7_QUIZ_QUESTIONS,
```

### `src/lib/quizRegistry.test.ts`
Обновить ожидаемые ключи на новые имена, чтобы тест продолжал ловить регрессии.

## Чего НЕ делаем

- Не трогаем `send-test-results`, `save-draft`, `load-draft`, `Index.tsx`.
- Не меняем формат `PhysQ4Answer` и не чистим существующие черновики.
- Не добавляем сохранение AI-оценки в БД (отдельная задача, не относится к этому отчёту).

## Проверка после правки

1. Открыть Replay результата `1644e837-5d1e-4a9a-ab3f-9e670f830c74` — в блоке «квиз» должны появиться 10 вопросов с метками ✅/❌, а не «[вопрос недоступен]».
2. `bun run vitest src/lib/quizRegistry.test.ts` — зелёный.
3. По 9-му классу физики (если есть сабмит) — то же самое.

## Затронутые файлы

- `src/lib/quizRegistry.ts`
- `src/lib/quizRegistry.test.ts`
