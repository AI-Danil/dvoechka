
401 при валидном свежем токене (длина 75) → значит `list-results` не видит токен в заголовке. Причина: `supabase.functions.invoke()` режет/перезаписывает кастомные заголовки `x-teacher-token` (известная проблема — invoke выставляет свой Authorization и иногда не пробрасывает кастомные хедеры через CORS preflight, плюс `_shared/teacher-auth.ts` читает `Authorization: Bearer` ИЛИ `x-teacher-token`, но invoke ставит свой Bearer с anon JWT, перезаписывая наш).

Curl с `x-teacher-token` работает (мы проверяли в прошлый раз) → подтверждает: проблема в клиентском вызове, не в функции.

# Фикс

Заменить в `src/pages/Admin.tsx` вызов `supabase.functions.invoke("list-results", ...)` на прямой `fetch` с явным заголовком `Authorization: Bearer <teacherToken>` и `apikey: <anon>`. Так же сделать в `replay-signed-url` если он тоже вызывается с teacher-токеном (проверю быстро по коду — в `Replay.tsx`).

Шаги:
1. В `Admin.tsx`: убрать invoke, поставить `fetch(`${VITE_SUPABASE_URL}/functions/v1/list-results`, { headers: { Authorization: `Bearer ${token}`, apikey: VITE_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' }})`. Парсить json, обрабатывать 401 отдельно (показать «Сессия истекла, войдите заново», без авто-логаута).
2. Проверить `Replay.tsx` — если он тоже зовёт edge-функцию с teacher-токеном через invoke, поправить аналогично.
3. Функции на бэке НЕ трогаю — они уже корректно валидируют `Authorization: Bearer <hmac-token>` через `getTokenFromRequest`.

После фикса: перезайти не нужно, текущий токен (он валидный) сразу заработает.
