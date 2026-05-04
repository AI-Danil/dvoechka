## Цель

Починить деплой на Cloudflare. Уйти от автодетекта Vite-плагина (требует Vite 6) на assets-only режим через `wrangler.toml`.

## Что меняем

### 1. Создать `wrangler.toml` в корне проекта

```toml
name = "dvoechka"
compatibility_date = "2025-01-01"

[assets]
directory = "./dist"
not_found_handling = "single-page-application"
```

Этого достаточно: wrangler увидит конфиг и не полезет в авто-конфиг Vite-плагина. SPA-фоллбек (`not_found_handling`) даёт корректный роутинг для React Router при прямых заходах на `/admin`, `/test/...` и т.п.

### 2. Обновить README

В секции «Cloudflare Pages» дописать, что теперь деплой идёт через `wrangler.toml` (assets-only), и почему: Cloudflare Vite-плагин требует Vite ≥ 6, а у нас 5.4 — поэтому используется простой статический режим.

Проверить, что в Cloudflare Dashboard:
- **Build command:** `bun run build` (или `npm run build`)
- **Deploy command:** `npx wrangler deploy`
- **Output directory:** `dist`

### 3. Обновить мемори (`mem://infrastructure/build-config`)

Добавить пункт: «Cloudflare деплой — assets-only через `wrangler.toml`. НЕ апгрейдить Vite до 6 ради Cloudflare-плагина — это сломает `@vitejs/plugin-legacy` и потребует регрессионного тестирования.»

## Файлы

- `wrangler.toml` — создать
- `README.md` — отредактировать секцию Cloudflare Pages
- `mem://infrastructure/build-config` — дописать правило
- `mem://index.md` — обновить описание мемори, если поменялось

## Что НЕ трогаем

- `package.json`, `vite.config.ts`, `bun.lock` — без изменений
- Netlify-конфиг — работает, не трогаем
- Lovable / Supabase — без изменений

## Проверка после применения

Ты пушишь → Cloudflare триггерит билд → в логах должно быть:
```
Detected wrangler.toml
Uploading assets from ./dist
Deployed dvoechka...
```
Без сообщения про «Vite version cannot be automatically configured».
