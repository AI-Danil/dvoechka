## Защита `send-test-results` от ботов и дубликатов

Одна правка — `supabase/functions/send-test-results/index.ts`. Никаких миграций, клиента не трогаем.

В начало хендлера (после парсинга JSON, до записи в БД) добавляю 4 проверки. На любой fail — `400/409/429`, в БД и Telegram ничего не уходит.

### 1. Валидация имени

```ts
const NAME_RE = /^[А-Яа-яЁё]{2,30}\s+[А-Яа-яЁё]{2,30}(\s+\d{1,3})?$/;
if (typeof studentName !== "string" || !NAME_RE.test(studentName.trim())) {
  return json({ error: "Bad name" }, 400);
}
```

Режет `x`, `bruteforce`, `hacker`. Сохраняет твою фичу со скрытым ретейком (3-й токен — цифра).

### 2. Минимальное `time_spent`

```ts
if (typeof timeSpent !== "number" || timeSpent < 30) {
  return json({ error: "Too fast" }, 400);
}
```

Меньше 30 сек — отказ.

### 3. Дедуп по содержимому за 5 минут

```ts
const answersHash = await sha256(JSON.stringify(answersData));
const fiveMinAgo = new Date(Date.now() - 5*60*1000).toISOString();
const { data: dup } = await supabaseAdmin
  .from("test_results")
  .select("id, answers")
  .eq("student_name", studentName)
  .eq("grade", Number(grade))
  .eq("subject", subject)
  .gte("created_at", fiveMinAgo)
  .limit(20);

if (dup?.some(r => sha256Sync(JSON.stringify(r.answers)) === answersHash)) {
  return json({ error: "Duplicate" }, 409);
}
```

Если ровно те же ответы от того же имени за 5 минут — отбой.

### 4. Антифлуд по имени

```ts
const tenMinAgo = new Date(Date.now() - 10*60*1000).toISOString();
const { count } = await supabaseAdmin
  .from("test_results")
  .select("id", { count: "exact", head: true })
  .eq("student_name", studentName)
  .gte("created_at", tenMinAgo);

if ((count ?? 0) >= 3) {
  return json({ error: "Rate limit" }, 429);
}
```

Больше 3 отправок с одного имени за 10 мин → 429.

### Дополнительно

- `studentName = studentName.trim().replace(/\s+/g, " ")` — нормализация пробелов.
- Хелпер `json(body, status)` — чтобы не плодить `new Response(...)` с CORS.
- Все ошибки возвращают `corsHeaders` (иначе фронт увидит CORS-ошибку вместо понятного сообщения).

### Что не делаю

- Turnstile/капча — отдельной задачей если попросишь.
- Правки в `LiveStudent.tsx` / `DbTestRunner.tsx` — там путь через ту же функцию, защита наследуется.
- Миграции БД — не нужны.

### Файлы

- `supabase/functions/send-test-results/index.ts` — единственная правка.

Edge-функции деплоятся автоматически после изменения. Тестируем потом curl'ом с именем `x` — должно вернуть 400.