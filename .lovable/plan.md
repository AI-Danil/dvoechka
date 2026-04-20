

## Что чиню

### 1. Блок «Результаты учеников» прямо в дашбордах учителя и админа

Добавлю новый компонент `src/components/TestResultsList.tsx`:
- читает `test_results` напрямую через Supabase client (RLS уже это позволяет учителю/админу — политика `Teachers and admins can view results` есть)
- колонки: дата, ученик, предмет, балл, попытка, время (сек), нарушения (счётчик из `cheat_log`), кнопка «Подробнее» (модалка с разбором ответов и логом нарушений), ссылка на запись `replay_url` если есть
- фильтры: поиск по имени, фильтр по предмету, фильтр «только с нарушениями»
- автообновление раз в 15 секунд
- для учителя — фильтрация по предметам из его `teacher_assignments` (для админа — всё)

Встраиваю его в:
- `src/pages/TeacherDashboard.tsx` — снизу, после `MyTestsList`
- `src/pages/AdminDashboard.tsx` — снизу, после `MyTestsList`

Старую `/admin` (через teacher-token) не трогаю — она продолжает работать как есть.

### 2. Anti-cheat и запись в DB-тестах

Правлю `src/components/DbTestRunner.tsx`:
- подключаю `useAntiCheatNotify({ studentName, grade, subject })` — Telegram-алерты на копирование/переключение вкладок
- подключаю `useRrwebRecorder` — запись сессии в `rrweb-sessions` bucket
- собираю локальный `cheatLog: { type, timestamp, details }[]` через те же события, что и в хардкод-тестах: `copy`, `paste`, `cut`, `contextmenu`, `visibilitychange`, `blur`, devtools-открытие через `useDevToolsBlock`
- передаю собранный `cheat_log` и `replay_url` в `grade-quiz-submission`

Правлю `supabase/functions/grade-quiz-submission/index.ts`:
- принимаю `replay_url` в body и сохраняю в колонку `replay_url` таблицы `test_results`

Подсмотрю реализацию anti-cheat у одного из существующих тестов (`Grade9PhysicsAtom` или `Grade7Physics`), чтобы повторить тот же набор слушателей событий и формат `cheatLog`.

### 3. Telegram-уведомление с результатом

В `grade-quiz-submission` после успешной вставки в `test_results` вызываю существующий поток уведомлений (тот же, что используется в `send-test-results`) — отправляю в Telegram отчёт: ученик, тест, балл, время, нарушения. Если уже есть подходящая edge-функция `send-test-results` — переиспользую её через прямой fetch внутри Deno; если она требует другого формата, добавлю минимальный inline-вызов Telegram API через `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`.

### Файлы

**Создать:**
- `src/components/TestResultsList.tsx`

**Править:**
- `src/components/DbTestRunner.tsx` — anti-cheat + rrweb + сбор cheatLog
- `src/pages/TeacherDashboard.tsx` — добавить `<TestResultsList />`
- `src/pages/AdminDashboard.tsx` — добавить `<TestResultsList isAdmin />`
- `supabase/functions/grade-quiz-submission/index.ts` — принимать `replay_url`, отправлять Telegram-отчёт

**Не трогаю:**
- RLS политики (уже корректные)
- `/admin` старую страницу
- хардкод-тесты

### Поток после фикса

```text
Ученик → DbTestRunner (rrweb пишет, anti-cheat слушает) 
       → grade-quiz-submission (cheat_log + replay_url + grade) 
       → test_results (insert) + Telegram alert
       → TeacherDashboard/AdminDashboard (TestResultsList тянет из БД через RLS)
```

### Как тестировать

1. Опубликовать квиз под `Teatcher01@test.ru`.
2. На `/` пройти его как ученик, попробовать скопировать вопрос (Ctrl+C), переключить вкладку → должны прилететь Telegram-алерты.
3. Сдать тест → результат появляется в Telegram и в дашборде учителя/админа в блоке «Результаты», с числом нарушений >0 и кнопкой записи сессии.

