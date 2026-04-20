

## Финальный план: учитель/админ создаёт тесты из дашборда (AI парсит → превью с правкой → публикация)

### Ответы на твои вопросы зафиксированы

1. Создавать тесты могут **учитель и админ**.
2. Превью **с возможностью правки** обязательно (текст вопроса, варианты, отметка правильного, удаление, баллы).
3. Тестовый учитель `Teatcher01@test.ru` уже создан через `seed-teacher`. Дам ему **тестовое назначение**: 9 класс × физика (создам класс «9А (2025)» и предмет «Физика», если их нет, и привяжу к нему через `teacher_assignments`).
4. Лимит вставляемого текста — **20 000 символов**.

### БД (миграция)

Новые таблицы:

- **`tests`**: `id, author_user_id, teacher_id (nullable — для админа), class_id, subject_id, title, kind ('quiz'|'written'), time_per_question_sec int, status ('draft'|'published'), created_at`
- **`test_questions`**: `id, test_id, position int, question_text, options jsonb, correct_index int, points int`

Индексы: `(test_id, position)`, `(class_id, subject_id, status)`.

RLS:
- Учитель: CRUD только своих тестов (`author_user_id = auth.uid()`).
- Админ: всё (через `has_role(auth.uid(),'admin')`).
- Анонимный ученик (`anon`): SELECT через VIEW **`public_tests`** и **`public_test_questions`** — только `status='published'` и без поля `correct_index` (ответы не утекают в браузер).

Сидинг: SQL-вставка тестового класса «9А» (year=2025), предмета «Физика», `teacher_assignments` для `Teatcher01@test.ru`.

### Edge functions (новые)

- **`generate-test`** — `POST {raw_text, kind, class_id, subject_id, title?, time_per_question_sec?}`. Проверяет JWT, проверяет, что у автора есть `teacher_assignments` для пары (или он админ). Зовёт Lovable AI Gateway (`google/gemini-3-flash-preview`) с tool calling (схема `extract_test`). Сохраняет `tests` + `test_questions` со `status='draft'`. Возвращает `test_id` + распарсенную структуру для превью. Обрабатывает 429/402 → понятные сообщения.
- **`publish-test`** — переводит в `published`. Перед публикацией проверяет, что у каждого вопроса квиза задан `correct_index`.
- **`unpublish-test`** / **`delete-test`** — статус/каскадное удаление.
- **`grade-quiz-submission`** (минимальная) — для квиза-из-БД считает балл по `correct_index` на бэке (чтобы не показывать ответы в JS) при сабмите, кладёт в `test_results`.

### Фронтенд

**Новое:**
- `src/components/CreateTestForm.tsx` — селекторы Класс/Предмет (из `teacher_assignments` либо всех — для админа), радио Квиз/Самостоятельная, поле Название, `<Textarea maxLength=20000>`, поле «Время на вопрос» (для квиза), кнопка «Сгенерировать».
- `src/components/TestPreview.tsx` — список распарсенных вопросов с инлайн-правкой: текст, 4 варианта (для квиза), радио «правильный», поле баллов (для письменной), кнопка удалить, добавить вопрос вручную. Кнопки «Сохранить черновик» / «Опубликовать».
- `src/components/MyTestsList.tsx` — таблица «Мои тесты» (название, класс, предмет, статус, дата) с действиями: редактировать, опубликовать/снять, удалить.
- `src/lib/dbTests.ts` — функции загрузки опубликованных тестов из БД (через VIEW) для ученика.

**Правлю:**
- `src/pages/TeacherDashboard.tsx` — заменяю `CreateTestViaChat` на `CreateTestForm` + `MyTestsList`.
- `src/pages/AdminDashboard.tsx` — то же (админ видит все классы/предметы).
- `src/pages/Index.tsx` — мерж `TESTS_CATALOG` (хардкод) с тестами из БД для выбранного класса+предмета. БД-квиз рендерю через существующий `<Quiz>` (массив из БД в том же формате, что `ATOM_QUIZ_QUESTIONS`, но без `correct_index` на клиенте — проверка на бэке через `grade-quiz-submission`). БД-самостоятельная — `<Textarea>` + `<FileAttach>` + сабмит в `test_results` с `test_type='db:'+test_id`.
- `src/components/CreateTestViaChat.tsx` — удаляю.

### Что НЕ трогаю

- Старый флоу ученика без логина на `/` — остаётся.
- Хардкод-тесты (`Grade9PhysicsAtom` и пр.) — продолжают работать параллельно.
- `test_results`, Telegram-уведомления, anti-cheat, rrweb — без изменений.
- `seed-teacher`, `claim-admin`, `verify-teacher-credentials` — не трогаю.

### Архитектура (поток)

```text
Учитель → CreateTestForm → generate-test (AI parse, tool calling)
                                │
                                ▼
                         tests + test_questions (draft)
                                │
                                ▼
                         TestPreview (правка) ──► publish-test ──► status='published'
                                                                          │
                                                                          ▼
                                          Index.tsx (ученик) видит тест в списке
                                                                          │
                                                                          ▼
                                          Quiz / Textarea+FileAttach ──► grade-quiz-submission / прямой insert в test_results
                                                                          │
                                                                          ▼
                                                                   Telegram
```

### После реализации — как тестировать

1. Войти как `Teatcher01@test.ru` / `Teatcher01` → `/teacher/dashboard`.
2. В блоке «Создать тест» выбрать «9А» + «Физика», радио «Квиз», вставить ~5 вопросов в свободной форме, нажать «Сгенерировать».
3. В превью проверить распарсенные вопросы, поправить правильные ответы → «Опубликовать».
4. Открыть `/`, выбрать «9 класс → Физика» → новый тест в списке. Пройти → результат в `test_results` и Telegram.
5. Повторить с «Самостоятельной» (например, 7 класс × технология — для этого добавлю второе тестовое назначение в той же миграции).

### Файлы

**Создать:**
- миграция (`tests`, `test_questions`, RLS, VIEWs, сидинг назначений)
- `supabase/functions/generate-test/index.ts`
- `supabase/functions/publish-test/index.ts`
- `supabase/functions/unpublish-test/index.ts`
- `supabase/functions/delete-test/index.ts`
- `supabase/functions/grade-quiz-submission/index.ts`
- `src/components/CreateTestForm.tsx`
- `src/components/TestPreview.tsx`
- `src/components/MyTestsList.tsx`
- `src/lib/dbTests.ts`

**Править:**
- `src/pages/TeacherDashboard.tsx`
- `src/pages/AdminDashboard.tsx`
- `src/pages/Index.tsx`

**Удалить:**
- `src/components/CreateTestViaChat.tsx`

Подтверди — стартую реализацию.

