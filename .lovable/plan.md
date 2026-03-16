

## План

### 1. Создать таблицу `test_results` (миграция)

```sql
CREATE TABLE public.test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name text NOT NULL,
  grade integer NOT NULL,
  subject text NOT NULL,
  attempt integer DEFAULT 1,
  test_type text,
  answers jsonb NOT NULL,
  attachments jsonb DEFAULT '{}',
  cheat_log jsonb DEFAULT '[]',
  time_spent integer,
  created_at timestamptz DEFAULT now()
);

-- RLS: публичная вставка (ученики не авторизованы), чтение — никому через клиент
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert from edge functions"
  ON public.test_results FOR INSERT
  WITH CHECK (true);
```

Таблица без ограничений на вставку, т.к. запись идёт из edge-функции с service role key. Чтение через клиент заблокировано RLS.

### 2. Обновить edge-функцию `send-test-results`

Добавить сохранение в БД **перед** отправкой в Telegram:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// В начале обработки:
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

await supabaseAdmin.from("test_results").insert({
  student_name: studentName,
  grade: Number(grade),
  subject,
  attempt: Number(attempt) || 1,
  test_type: body.type,
  answers: { /* все ответы из body */ },
  attachments: attachmentMap,
  cheat_log: cheatLog || [],
  time_spent: timeSpent,
});
```

Так даже если Telegram не доставит — данные уже в базе.

### 3. Создать страницу `/results` для просмотра

- Простая таблица: имя, класс, попытка, время, дата
- Клик по строке — раскрытие ответов (JSON)
- Чтение через edge-функцию (т.к. RLS блокирует клиентский доступ) или добавить RLS-политику на SELECT для простоты (таблица не содержит приватных данных учеников, кроме имени)
- Роут `/results` в App.tsx

### 4. Добавить роут в App.tsx

```tsx
<Route path="/results" element={<Results />} />
```

### Файлы
- Миграция SQL (новая таблица)
- `supabase/functions/send-test-results/index.ts` — добавить insert
- `src/pages/Results.tsx` — новая страница
- `src/App.tsx` — новый роут

