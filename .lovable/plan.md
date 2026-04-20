

## Что делаю

### 1. Прямая выдача роли admin (миграция)
Вставляю запись в `user_roles` напрямую — это самый надёжный способ обойти проблему с edge-функцией:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('73057659-5184-4f06-9b0d-34c0a593e216', 'admin')
ON CONFLICT DO NOTHING;
```

(user_id взят из auth-логов для `testspace.first@gmail.com`).

После этого вы перелогиниваетесь → `useAuth` подтягивает роль `admin` → `/auth` редиректит вас в `/admin/dashboard` → панель работает.

### 2. Починка `claim-admin` на будущее
Проблема: `supabase.functions.invoke` иногда отправляет anon-key в `Authorization` вместо user JWT, поэтому `sub` в payload = `null`. Фикс:
- На клиенте (`AdminDashboard.tsx`) — явно достать `session.access_token` через `supabase.auth.getSession()` и передать его заголовком `Authorization: Bearer <token>` через опцию `headers` у `invoke`.
- В edge-функции — добавить fallback: если `sub` пустой, читать `apikey`/проверять что это не anon, и возвращать понятную ошибку «не залогинен».

### 3. Без изменений
- RLS, таблицы, `seed-teacher`, дашборды учителя/ученика, старый флоу ученика на `/` — не трогаю.

## Что вам делать после

1. Подтвердите план — я применяю миграцию + правлю `AdminDashboard.tsx` и `claim-admin`.
2. После применения — выйдите из аккаунта на `/auth` и зайдите снова под `testspace.first@gmail.com`.
3. Должны автоматически попасть в `/admin/dashboard` уже с правами админа.

