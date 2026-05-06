## Что исправляем

У части учеников в live-сессии после старта виден таймер и иконка записи, но **белый экран вместо вопросов**. GitHub Pages подхватил всё корректно (бандл свежий, `/dvoechka/...` пути правильные). Проблема в коде.

## Корневые причины

1. **Гонка дублей attempt в `join-session`**: в БД видно по 2 attempt'а на одного ученика с разницей в секунды (Бабаев, Минкин, Косогова, Орлов). React StrictMode / двойной клик / двойной poll → два параллельных вызова → оба создают новый attempt. У participant сохраняется только последний `attempt_id`, но первый продолжает «жить».

2. **`get-test-questions` отдаёт 403 для «старого» attempt'а** (status != `in_progress`) → `loadTestQuestions` возвращает `[]` → guard `if (!questions)` НЕ срабатывает (это `[]`, не `null`) → `Quiz` рендерит `null` → белый экран.

3. **`participant.submitted_at` не выставляется** при сабмите → ученик может зайти повторно, получить старый attempt_id, попасть в ту же ловушку.

## План

### 1. UI: убрать белый экран — `src/components/LiveSessionRunner.tsx`

- Различать состояния: `null` (загрузка), `[]` (ошибка), `[…]` (ок).
- При `[]` показывать карточку «Не удалось загрузить вопросы» с кнопкой «Попробовать снова» (повторный вызов `loadTestQuestions`).
- Логировать через `log-cheat-event` событие `questions_load_failed` с `attempt_id` — будет алерт в TG.
- Обернуть рендер `Quiz`/written-формы в локальный try/catch ErrorBoundary, который тоже шлёт алерт и показывает кнопку перезагрузки.

### 2. Гонка дублей — `supabase/functions/join-session/index.ts`

- Атомарное создание attempt: сначала пытаемся `UPDATE test_session_participants SET attempt_id = <new_uuid> WHERE id=? AND attempt_id IS NULL RETURNING attempt_id`.
- Если update вернул строку — создаём attempt с этим UUID.
- Если update НЕ вернул строку — другой запрос уже выиграл гонку → читаем `participant.attempt_id` и используем его.
- Это убирает дубли без миграции БД.

### 3. Синхронизация `participant.submitted_at`

- `supabase/functions/grade-quiz-submission/index.ts`: после успешного сохранения `test_results` обновлять `test_session_participants.submitted_at = now()` по `attempt_id`.
- `supabase/functions/stop-session/index.ts`: при остановке сессии все «висящие» `in_progress` attempts из этой сессии помечать `status='aborted'` и `finished_at=now()` (через join по `participants.attempt_id`).

### 4. Совместимость `get-test-questions`

- Если `attempt.status !== 'in_progress'`, **всё равно отдавать вопросы** (200), чтобы UI не получал пустой массив. Дополнительно возвращать поле `attempt_inactive: true`. UI при этом флаге подсказывает «сессия завершена», но не падает в белый экран.

## Файлы

- `src/components/LiveSessionRunner.tsx` — UI-защита, retry, лог.
- `supabase/functions/join-session/index.ts` — атомарное создание attempt.
- `supabase/functions/grade-quiz-submission/index.ts` — `submitted_at`.
- `supabase/functions/stop-session/index.ts` — закрывать висящие attempts.
- `supabase/functions/get-test-questions/index.ts` — не отдавать 403 после завершения.

## Что НЕ трогаем

- Схему БД (миграции не нужны).
- GitHub Actions / Pages — там всё ок.
- Auth, RLS политики.

## После применения

Нужен push в main → GH Actions передеплоит Pages (~2 мин). Edge функции деплоятся сразу. Затем можно повторно поднять тестовую сессию и проверить.
