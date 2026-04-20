

Юзер хочет №1 целиком. Разбиваю по компонентам.

**Важно:** платформа просит не делать backend rate-limiting (нет инфры). Скажу юзеру в плане, что rate-limit сделаю как просили (ad-hoc, в памяти инстанса edge-функции — несовершенно, переживёт перезапуск), но честно предупрежу про ограничение.

**RLS-фикс:**
- `DROP POLICY "Allow select for all"` и `"Allow insert for all"` на `test_results`.
- Создать `user_roles` + enum `app_role` ('admin','teacher','student') + `has_role()` security definer.
- Новые политики: SELECT — только `has_role(auth.uid(), 'teacher'|'admin')`. INSERT — `false` (только через service-role из edge-функции). UPDATE/DELETE остаются запрещены.
- ⚠️ Учитель сейчас ходит **без** Supabase Auth (HMAC-токен + service-role в `list-results`). Значит `auth.uid()` у него null → SELECT с клиента работать не будет. Это ОК: учитель и так читает через `list-results` edge-функцию с service-role, RLS его не касается. Но любой клиентский `supabase.from('test_results').select(...)` сломается. Нужно проверить, что в коде нет таких вызовов.

**Submit edge-функция:**
- Новая `supabase/functions/submit-test-result/index.ts`, `verify_jwt = false`.
- Принимает `{ student_name, grade, subject, test_type, attempt, answers, attachments, cheat_log, time_spent, replay_url }`.
- Валидация Zod-style вручную (или просто проверка типов — Zod утяжелит, обойдусь руками).
- Rate-limit in-memory `Map<ip, timestamps[]>`: 1 в 30с, 50 в час. IP из `x-forwarded-for`. При превышении — 429.
- Вставка через service-role.
- Возвращает `{ id }`.

**Клиент:**
- Найти все `supabase.from('test_results').insert(...)` — заменить на `supabase.functions.invoke('submit-test-result', ...)`. Это `Index.tsx` (сабмит теста) и, возможно, `update-replay-url` (но он уже edge — там UPDATE, RLS не пускает, значит уже идёт service-role).
- Найти все `supabase.from('test_results').select(...)` с клиента — должны исчезнуть. Если есть — переключить на `list-results`.

**Шаги в default mode:**
1. Прочитать `Index.tsx` (как сейчас сабмитит) и поискать все клиентские обращения к `test_results`.
2. Миграция: enum + `user_roles` + `has_role` + удалить старые политики + новые политики на `test_results`.
3. Создать `supabase/functions/submit-test-result/index.ts` + блок в `config.toml`.
4. Заменить клиентский INSERT на invoke.
5. Проверить, что нигде на клиенте не осталось `from('test_results').select`.
6. Запустить security-linter, убедиться что warning'ов нет.

# План

1. **Миграция БД:**
   - Enum `app_role` ('admin','teacher','student').
   - Таблица `user_roles(id, user_id, role, created_at)` + RLS (только админ читает/пишет, security definer функции для проверок).
   - Функция `has_role(_user_id uuid, _role app_role) returns boolean` (security definer, stable).
   - Удалить политики «Allow select/insert for all» на `test_results`.
   - Новые политики `test_results`:
     - SELECT: `has_role(auth.uid(),'teacher') OR has_role(auth.uid(),'admin')`.
     - INSERT: `false` (вставка только через edge-функцию с service-role).

2. **Edge-функция `submit-test-result`:**
   - `verify_jwt = false`, CORS, валидация полей, in-memory rate-limit (1/30с и 50/час по IP), вставка через service-role, ответ `{ id }` или 429/400.
   - ⚠️ Rate-limit будет ad-hoc в памяти инстанса — при перезапуске или нескольких инстансах может не сработать идеально. Платформа официально ещё не предоставляет примитивов rate-limit. Это компромисс.

3. **Клиент:**
   - В `src/pages/Index.tsx` (и где ещё найдётся) заменить `supabase.from('test_results').insert(...)` на `supabase.functions.invoke('submit-test-result', { body })`.
   - Убедиться, что нигде на клиенте нет `supabase.from('test_results').select(...)` — учитель уже ходит через `list-results`, ученику читать чужие результаты не надо.

4. **Проверка:** запустить `supabase--linter`, убедиться что критичных warning'ов нет. `list-results` НЕ трогаю — там service-role + HMAC, работает как раньше.

После реализации: ученик сабмитит тест → идёт через edge-функцию → вставка в БД. Прямой `select` с anon-key больше не вернёт ничего. Учитель видит результаты как раньше через `list-results`.

