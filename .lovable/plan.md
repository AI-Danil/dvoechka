

## Проблема сейчас

Ошибка не исчезла по двум причинам:

1. **`generate-test` всё ещё настроен неверно в `supabase/config.toml`**  
   В текущем коде у него стоит:
   ```toml
   [functions.generate-test]
   verify_jwt = true
   ```
   То же самое у `publish-test` и `delete-test`.  
   Значит прошлый фикс фактически **не применился**.

2. **Фронтенд показывает только общий текст `Edge Function returned a non-2xx status code`**  
   Сейчас `CreateTestForm.tsx` вызывает `supabase.functions.invoke("generate-test")`, а функция отвечает статусами `400/401/403/422/500`.  
   В таком режиме `invoke()` часто даёт только общий `FunctionsHttpError`, и реальная причина теряется.

## Что исправлю

### 1) Починю конфиг edge functions
В `supabase/config.toml`:

- `generate-test` → `verify_jwt = false`
- `publish-test` → `verify_jwt = false`
- `delete-test` → `verify_jwt = false`

`grade-quiz-submission` уже ок.

JWT всё равно будет проверяться внутри функций через авторизационный заголовок, так что доступ не ослабляется.

### 2) Сделаю нормальную схему ответов от edge functions
В `supabase/functions/generate-test/index.ts`:

- переведу ответы на единый формат:
  ```ts
  { ok: true, test_id, title, kind, count }
  { ok: false, error: "..." }
  ```
- для ожидаемых ошибок больше не буду полагаться на non-2xx как на способ показать сообщение пользователю
- отдельно сохраню понятные сообщения для:
  - не авторизован
  - нет назначения на класс/предмет
  - AI не распознал вопросы
  - закончились кредиты AI
  - rate limit
  - ошибка вставки в БД

Если нужно, сделаю ответ **всегда 200**, чтобы клиент гарантированно читал тело ответа и показывал точную причину, а не общий `non-2xx`.

### 3) Починю клиентскую обработку ошибки генерации
В `src/components/CreateTestForm.tsx`:

- перестану показывать только `error.message`
- буду читать `data.ok === false` / `data.error`
- добавлю более точные toast-сообщения
- если функция вернула диагностику, покажу её пользователю в читаемом виде

Результат: вместо
`Edge Function returned a non-2xx status code`
будет, например:
- `Нет назначения на этот класс/предмет`
- `AI не извлёк ни одного вопроса`
- `Превышен лимит запросов к AI`
- `Не авторизован`

### 4) Заодно укреплю CORS
Во всех новых функциях (`generate-test`, `publish-test`, `delete-test`, `grade-quiz-submission`) приведу CORS к полному формату, совместимому с текущим клиентом:

- `authorization`
- `apikey`
- `content-type`
- `x-client-info`
- при необходимости `x-supabase-client-*`

Чтобы не ловить скрытые preflight-проблемы.

### 5) Быстро проверю весь связанный поток
После фикса прогоню цепочку:

1. логин под `teatcher01@test.ru`
2. `/teacher/dashboard`
3. выбор пары `9А — Физика`
4. вставка вопросов
5. `Сгенерировать`
6. открытие превью
7. `Опубликовать`

И отдельно проверю, что `publish-test` и `delete-test` больше не упираются в тот же самый `verify_jwt=true`.

## Файлы, которые правлю

- `supabase/config.toml`
- `supabase/functions/generate-test/index.ts`
- `supabase/functions/publish-test/index.ts`
- `supabase/functions/delete-test/index.ts`
- `supabase/functions/grade-quiz-submission/index.ts` — только унификация ответа/CORS
- `src/components/CreateTestForm.tsx`

## Ожидаемый результат

После фикса учитель сможет вставить вопросы в дашборде и нажать «Сгенерировать», а если что-то пойдёт не так, система покажет **реальную причину**, а не общий `Edge Function returned a non-2xx status code`.

