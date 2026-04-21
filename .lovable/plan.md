

## Чиню «non-2xx» ошибку при запуске live-сессии

### Корень
В `supabase/config.toml` для `create-session`, `start-session`, `stop-session` стоит `verify_jwt = true`. На Lovable Cloud с новой системой signing-keys платформа отклоняет такие вызовы **до** того, как функция запустится — поэтому в логах функций пусто (только `booted`), а клиент видит «non-2xx». Эталонное правило документации: **«Most Lovable-managed edge functions deploy with `verify_jwt = false` by default — signing-keys system requires in-code validation»**.

Сами функции **уже валидируют JWT внутри** (читают `Authorization`, делают `userClient.auth.getUser()` и возвращают 401, если токена нет). То есть безопасность не пострадает — она и так в коде.

### Фикс (одно изменение)
**`supabase/config.toml`** — поставить `verify_jwt = false` для трёх функций:
```toml
[functions.create-session]
verify_jwt = false

[functions.start-session]
verify_jwt = false

[functions.stop-session]
verify_jwt = false
```

(`join-session` уже `false` — её ученики дёргают анонимно, она и так должна была работать.)

### Бонус — устойчивость
Чтобы при будущих ошибках не получать «non-2xx» из supabase-js (он бросает на любой код кроме 2xx и теряет тело), поправлю функции:
- `create-session` / `start-session` / `stop-session`: возвращать **`status: 200`** и для авторизационных ошибок (`{ok:false, error:"unauthorized"}`), как уже делается в `grade-quiz-submission` и других. Это даст фронту шанс показать понятный текст ошибки вместо «non-2xx».

### Файлы
- `supabase/config.toml` — три блока (`create-session`, `start-session`, `stop-session`) на `verify_jwt = false`.
- `supabase/functions/create-session/index.ts` — менять `401` → `200` (внутри по-прежнему `ok:false`).
- `supabase/functions/start-session/index.ts` — то же.
- `supabase/functions/stop-session/index.ts` — то же.

Затем деплою три функции и попрошу тебя ещё раз попробовать создать live-сессию для теста «Мощность и простые механизмы».

### Что НЕ трогаю
- Логику авторизации внутри функций — она уже корректно проверяет `auth.getUser()` и `teacher_user_id`.
- БД, RLS, фронт — там менять нечего.

### Как проверишь
- Зайдёшь в админ-панель → «🎙 Live-сессии» → выберешь 7-кл физику → длительность 15 мин → «Создать сессию» → увидишь 4-символьный код без ошибок.
- Жмёшь «▶ Старт» — статус становится «идёт», таймер 15:00 начинает идти.

