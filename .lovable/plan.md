## Прогресс

Билд прошёл успешно (Vite 5 не ругается, Framework: None сработал, `dist/` собран). Теперь падает только deploy step:

```
$ wrangler deploy --no-bundle
/usr/bin/bash: line 1: wrangler: command not found
```

`wrangler` не установлен — у нас его нет ни в deps, ни в devDeps, а Cloudflare Workers Builds в режиме `Framework: None` его не подкладывает автоматически (только для preset = Vite/Next/etc).

## Решение

Установить `wrangler` локально как devDependency и вызывать через `bunx`/`npx` — тогда Cloudflare использует ту же версию, что и мы локально, не зависит от глобального PATH.

### Изменения

#### 1. `package.json`

- Добавить в `devDependencies`:
  ```json
  "wrangler": "^3.90.0"
  ```
  (последняя стабильная 3.x; 4.x требует Node 20+, но у нас и так Node 22 — можно и 4.x, возьму последнюю, какую bun подтянет)

- Изменить скрипт `deploy:cf`:
  ```json
  "deploy:cf": "wrangler deploy --no-bundle"
  ```
  → оставить как есть. После добавления в devDeps `bun run deploy:cf` найдёт wrangler в `node_modules/.bin/`.

  Альтернатива (надёжнее, не зависит от PATH резолва bun): `"deploy:cf": "bunx wrangler deploy --no-bundle"`. Возьму этот вариант.

#### 2. `bun.lock`

Обновится автоматически после `bun install`. На Cloudflare сейчас стоит `--frozen-lockfile`, так что коммит `bun.lock` обязателен — иначе install упадёт. Это сделает Lovable при сохранении изменений.

#### 3. `README.md`

В секции Cloudflare добавить строчку:
- `wrangler` теперь в devDependencies, не нужно ставить глобально.
- Команда деплоя: `bun run deploy:cf` (внутри `bunx wrangler deploy --no-bundle`).

#### 4. `mem://infrastructure/build-config`

Добавить заметку: «wrangler ставится как devDependency, вызывается через `bunx`, Cloudflare Workers Builds в режиме Framework=None не подкладывает wrangler автоматически».

#### 5. `.lovable/plan.md`

Перезаписать этим планом.

## Файлы

- `package.json` — добавить `wrangler` в devDeps + поправить скрипт `deploy:cf`
- `bun.lock` — обновится автоматом
- `README.md` — мелкое уточнение
- `mem://infrastructure/build-config` — добавить правило
- `.lovable/plan.md` — обновить

## Что НЕ трогаем

- `wrangler.toml` — он рабочий, билд это доказал
- Cloudflare Dashboard — никаких ручных действий не нужно (Framework: None уже выставлен и работает)
- Vite, vite.config.ts — не трогаем

## Проверка

После пуша:

```
Installing project dependencies: bun install --frozen-lockfile
+ wrangler@...                        ← должен появиться
Build command completed
Executing user deploy command: bun run deploy:cf
$ bunx wrangler deploy --no-bundle
Total Upload: ...
Uploaded N assets
Deployed dvoechka triggers (...)
  https://dvoechka.<account>.workers.dev
```

Без `command not found`.

## Если упадёт снова

Возможные следующие проблемы (сразу для контекста):

1. **`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` не заданы.** В Workers Builds (в отличие от ручного wrangler) они подкладываются автоматически из контекста проекта — обычно работает из коробки. Если нет — добавить в Settings → Variables and Secrets.

2. **Wrangler потребует подтвердить создание Worker.** В non-interactive контексте должен сам согласиться, но если нет — добавить флаг `--keep-vars` или явно создать Worker один раз руками.

3. **Размер ассетов.** `dist/` ~2.6MB — норм, лимит Cloudflare 25MB на один файл.
