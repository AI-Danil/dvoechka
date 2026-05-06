# Автосохранение квиза

## Проблема
`Quiz.tsx` хранит ответы только в `useRef` в памяти. При закрытии вкладки / вылете / отключении интернета на 5-м из 15 вопросов — все ответы и прогресс пропадают, при возврате квиз начинается с нуля. Письменная часть уже сохраняется, квиз — нет.

## Решение
Локальный персист в `localStorage` на каждом ответе и каждом тике таймера. Полностью offline — потеря интернета не мешает.

## Изменения

### 1. `src/components/Quiz.tsx`
Добавить опциональные props:
- `storageKey?: string` — ключ для persist
- `onResumed?: (fromIdx: number) => void` — колбэк для тоста "продолжаем с вопроса N"

Логика:
- **Сохранение** (на каждом `recordAndAdvance` и раз в 1с в тике таймера):
  ```ts
  { v: 1, idx, perQuestion: resultsRef.current, secondsLeft, savedAt: Date.now(), total: questions.length }
  ```
- **Восстановление** при маунте: если ключ есть и `total` совпадает — восстановить `idx`, `resultsRef`, пересчитать таймер с учётом прошедшего времени (`secondsLeft - (now - savedAt)/1000`), вызвать `onResumed(idx)`. Если `idx >= total` — сразу `onFinish`.
- **Flush** на `visibilitychange (hidden)`, `pagehide`, `beforeunload`.
- **Очистка** ключа в `onFinish`.
- `try/catch` на quota errors.

### 2. `src/pages/Index.tsx`
- Добавить хелпер `getQuizDraftKey(grade, subject, testId, attempt)` рядом с `getDraftKey`.
- Прокинуть `storageKey` во все рендеры `<Quiz ...>` (тесты из `TESTS_WITH_QUIZ`: `python-hero`, `power-joule`, `final-q4` 8физ, `atom`, `work-power`, `final-q4` 7тех, `final-q4` 6тех).
- `onResumed` → тост "Продолжаем квиз с вопроса N".
- В местах, где уже чистится draft при сабмите (`localStorage.removeItem(getDraftKey(...))`), добавить чистку quiz-ключа.

### 3. `src/components/LiveSessionRunner.tsx`
- Прокинуть `storageKey={`live_quiz_${attemptId}`}` в `<Quiz>`.
- Live-режим уже имеет серверный автосейв письменных — для квиза достаточно локального персиста (общий таймер сессии живёт на сервере через `ends_at`).

## Файлы
- `src/components/Quiz.tsx` — основная правка
- `src/pages/Index.tsx` — прокидывание ключа + чистка
- `src/components/LiveSessionRunner.tsx` — прокидывание ключа
