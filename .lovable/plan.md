

## Гибридные тесты + защита от перепрохождения

Делаю две связанные вещи: (1) поддержка смешанных тестов (квиз + письменная часть в одном файле), (2) жёсткая защита от того, что ученик закрыл вкладку и зашёл заново.

---

## Часть A. Гибридный тест (один файл — квиз + самостоятельная)

### A1. БД (миграция)
- Расширяю enum `test_kind`: добавить значение `hybrid`.
- В `test_questions` добавляю поля:
  - `response_kind text not null default 'quiz'` — `quiz` | `written`
  - `block_title text` — например «Блок 1. Блиц», «Блок 2. Круги Эйлера»
  - `expected_answer text` — ключ для письменных задач (видно только учителю/админу через RLS)
  - `seconds_override int` — индивидуальное время на конкретный квиз-вопрос (опционально)
- RLS на `test_questions` оставляю как есть, но `expected_answer` для анонимов не отдаём — добавлю SECURITY DEFINER view `public_test_questions` без `expected_answer` и `correct_index`, и фронт ученика будет читать через неё.

### A2. Генерация (`generate-test`)
- Добавляю режим `kind: "hybrid"`.
- Промпт для AI: «Раздели материал на блоки. Каждый вопрос помечай `response_kind` (quiz/written), `block_title`, `points`, для quiz — `options[4]` + `correct_index`, для written — `expected_answer` из секции ключей учителя. Игнорируй явно помеченные ключи как отдельные вопросы — используй их как ответы».
- Сохраняет всё одной транзакцией: один `tests` + N `test_questions` со смешанными `response_kind`.

### A3. UI учителя
- `CreateTestForm.tsx`: третья опция «Смешанный тест (квиз + самостоятельная)».
- `TestPreview.tsx`: рендер по блокам (`block_title`), внутри блока — карточки разного вида в зависимости от `response_kind`. Учитель может править варианты, правильный ответ, баллы, `expected_answer`.

### A4. Прохождение учеником (`DbTestRunner.tsx`)
Поток для `hybrid`:
1. intake (ФИО) → 2. intro → 3. quiz-фаза (только вопросы с `response_kind='quiz'`) → 4. written-фаза (вопросы `written`) → 5. одна общая отправка.
- `RecordingBadge variant="full"` на всех фазах.
- В payload: `answers = { quiz: {...}, written: {...} }`, `per_question` для квиз-части.

### A5. Грейдинг (`grade-quiz-submission`)
- Для `hybrid`: автогрейд квиз-части по `correct_index`, письменная часть сохраняется как pending (без балла), общий результат пишется одной строкой в `test_results` с `test_type='hybrid'`.

### A6. Создание теста для 9 класса
После выкатки фич захожу в `/teacher/dashboard` под `Teatcher01@test.ru`, выбираю «9 класс — Технология», вставляю твой текст целиком (со всеми блоками и ключами учителя), тип «Смешанный тест», название с датой `21.04.2026`. Проверяю превью, публикую.

---

## Часть B. Защита от перепрохождения (лог + автосейв)

### B1. Новая таблица `test_attempts` (миграция)
Фиксируем сам факт начала и состояние попытки:
```
test_attempts (
  id uuid pk,
  test_id uuid,
  student_name text,
  student_fingerprint text,   -- хеш(имя+браузер+класс) на случай отсутствия auth
  started_at timestamptz,
  finished_at timestamptz,
  status text,                -- 'in_progress' | 'submitted' | 'abandoned'
  draft_answers jsonb,        -- автосейв
  current_phase text,         -- 'quiz' | 'written'
  current_question int,
  attempt_no int default 1,
  result_id uuid              -- линк на test_results после сдачи
)
```
RLS:
- INSERT: anon разрешён (ученик без auth) — но только если для пары (test_id, student_name) ещё нет `submitted`.
- SELECT: ученик читает свою строку по `id` (id хранится в localStorage).
- SELECT/UPDATE для teacher/admin — полный доступ.

### B2. Серверная проверка через edge function `start-attempt`
Фронт не решает «можно ли начать» сам. Новая функция:
- вход: `test_id`, `student_name`
- логика:
  - если есть `submitted` для этой пары — отказ (`409 already_submitted`), кроме случая «3-е слово = цифра» (текущий hidden-retake) — тогда `attempt_no++`
  - если есть `in_progress` — возвращает существующий `attempt_id` и `draft_answers` (восстановление)
  - иначе создаёт новую попытку
- ответ: `{ attempt_id, draft_answers, current_phase, current_question, attempt_no }`

### B3. Автосохранение в `DbTestRunner`
- При старте теста — вызов `start-attempt`, получаем `attempt_id`, кладём в `localStorage` (`attempt:<test_id>` → `attempt_id`).
- Дебаунс 2 сек: на каждое изменение ответа / переход вопроса — `save-attempt-progress` (новая edge function): обновляет `draft_answers`, `current_phase`, `current_question`.
- На `beforeunload` — синхронный `navigator.sendBeacon` с финальным состоянием + лог события `unload` в `cheat_log` через отдельную функцию `log-cheat-event`.

### B4. Восстановление при возврате
- При входе на тест: если в localStorage есть `attempt_id` И сервер вернул `in_progress` — показываем модалку «Вы покидали тест в HH:MM. Продолжить?», но без выбора «начать заново». Только продолжить.
- Все события «уход/возврат» (`visibilitychange`, `blur`, `unload`, `reopen`) пишутся в `cheat_log` с timestamp — учитель видит, что ученик дважды закрывал страницу.

### B5. Финальная отправка
- `grade-quiz-submission` принимает `attempt_id`, помечает попытку `submitted`, проставляет `result_id`, мерджит accumulated `cheat_log` из попытки + событий клиента.
- После `submitted` — повторный вход по той же паре (test_id, student_name) даёт ошибку «Тест уже сдан» (если только не hidden-retake digit).

### B6. Telegram-алерт
Добавляю в существующий нотифай новые типы событий:
- `attempt_started` (тихо, только в лог)
- `attempt_resumed` (алерт: «Ученик X вернулся к тесту Y, попытка приостанавливалась N мин»)
- `attempt_abandoned` (если попытка `in_progress` > 1ч без активности — алерт через cron, опционально, в этой итерации не делаю, оставляю TODO)

---

## Файлы

**Миграции:**
- добавить `hybrid` в enum `test_kind`
- добавить колонки в `test_questions`
- создать `test_attempts` + RLS + индексы
- создать view `public_test_questions` без секретных полей

**Edge functions:**
- `generate-test` — режим hybrid
- `start-attempt` (новая) — старт/возобновление с серверной проверкой
- `save-attempt-progress` (новая) — автосейв
- `log-cheat-event` (новая) — логирование событий ухода
- `grade-quiz-submission` — поддержка hybrid + закрытие attempt

**Фронт:**
- `src/components/CreateTestForm.tsx` — опция «Смешанный»
- `src/components/TestPreview.tsx` — блочный рендер
- `src/components/DbTestRunner.tsx` — hybrid flow + start-attempt + автосейв + восстановление + sendBeacon
- `src/components/TestResultsList.tsx` — показ событий ухода/возврата отдельным блоком
- `src/lib/dbTests.ts` — загрузка через `public_test_questions`

**Не трогаю:** хардкод-тесты, `Index.tsx` для них, `seed-teacher`, `claim-admin`, существующие RLS на `tests`/`test_results`.

---

## Проверка после

1. Учитель публикует гибридный тест из твоего текста — в превью видны 7 квиз-вопросов и 8 письменных задач, разнесённых по блокам.
2. Ученик начинает тест, отвечает на 3 вопроса, **закрывает вкладку**.
3. Заходит снова с тем же ФИО → видит «Продолжить с вопроса 4», прогресс восстановлен, в Telegram учителю алерт «возврат после закрытия».
4. Доходит до конца, сдаёт. Пытается зайти снова — «Тест уже сдан».
5. В дашборде учителя в деталях результата виден `cheat_log` с событиями `tab_hidden`, `unload`, `attempt_resumed`, и таблица «Время по вопросам» для квиз-части.

