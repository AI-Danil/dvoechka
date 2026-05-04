## Проблема

Cloudflare Workers Builds авто-определяет проект как `Framework: Vite` (по `vite` в `package.json`) и запускает Cloudflare Vite-плагин, который требует Vite ≥ 6. Наш `wrangler.toml` с `[assets]` он игнорирует на этапе авто-конфига.

Лог:
```
Detected Project Settings:
 - Framework: Vite           ← вот оно
 - Build Command: bun run build
 - Output Directory: dist
✘ The version of Vite used in the project ("5.4.21") cannot be automatically configured.
```

## Решение

Переопределить deploy так, чтобы Cloudflare НЕ запускал авто-конфиг Vite-плагина, а просто залил готовый `dist/` как статику.

### 1. В Cloudflare Dashboard (делает Даниил руками)

**Workers & Pages → dvoechka → Settings → Builds → Edit configuration:**

- **Framework preset:** изменить с `Vite` на **`None`** (или `Static HTML`).
- **Build command:** оставить `bun run build`.
- **Deploy command:** заменить `npx wrangler deploy` на:
  ```
  npx wrangler deploy --no-bundle
  ```
  Флаг `--no-bundle` отключает попытку Cloudflare самому собрать через Vite-плагин и заставляет использовать `wrangler.toml` как есть.
- **Output directory:** `dist` (как было).

После сохранения — **Retry deployment**.

### 2. Подстраховка в репо (делаю я)

#### a. Уточнить `wrangler.toml`

Добавить `main` поле явно отсутствующее (чтобы wrangler точно понял, что это assets-only Worker, а не Vite-приложение):

```toml
name = "dvoechka"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "./dist"
not_found_handling = "single-page-application"
```

`compatibility_flags` не обязателен, но не помешает. Главное — отсутствие `main` и `[build]` секций означает «только статика».

#### b. Добавить npm-скрипт `deploy:cf`

В `package.json` добавить:

```json
"deploy:cf": "wrangler deploy --no-bundle"
```

Чтобы можно было задать в Cloudflare Build configuration `Deploy command: bun run deploy:cf` — это надёжнее, чем держать команду в UI.

#### c. Обновить README

В секции «Cloudflare Pages / Workers» дописать:

- Framework preset должен быть `None` (НЕ `Vite`).
- Deploy command: `bun run deploy:cf` (или `npx wrangler deploy --no-bundle`).
- Объяснить почему: иначе Cloudflare пытается запустить свой Vite-плагин, который требует Vite ≥ 6.

#### d. Обновить `mem://infrastructure/build-config`

Добавить правило: Cloudflare Workers Builds — **Framework preset = None** + `wrangler deploy --no-bundle`. Авто-детект `Framework: Vite` ломает деплой на Vite 5.

## Файлы

- `wrangler.toml` — добавить `compatibility_flags`
- `package.json` — добавить скрипт `deploy:cf`
- `README.md` — обновить инструкцию по Cloudflare
- `mem://infrastructure/build-config` — добавить правило про Framework preset
- `.lovable/plan.md` — обновить (можно перезаписать этим планом)

## Что НЕ трогаем

- `vite.config.ts`, версию Vite — не апгрейдим (сломает legacy).
- `bun.lock` — не трогаем.
- Netlify, Lovable — без изменений.

## Проверка

После пуша + изменения настроек в Cloudflare Dashboard в логах должно быть:

```
Detected Project Settings:
 - Framework: None           ← вместо Vite
 - Deploy Command: bun run deploy:cf
...
Uploaded N assets
Deployed dvoechka...
```

Без сообщения про Vite 6.

## Если и это не сработает

Запасной план — полностью убрать `vite` из `dependencies` (он только в `devDependencies`, проверю). Если он там есть — это могло триггерить детект. Но судя по `package.json`, vite только в devDependencies, так что детект скорее идёт по наличию `vite.config.ts` в корне. Тогда крайний вариант — переименовать `vite.config.ts` → `vite.config.js`... нет, это сломает локальную сборку. Реально единственный надёжный путь — Framework preset = None в дашборде.
