# Деплой

Проект задеплоен одновременно на нескольких хостингах — все смотрят в одну
БД (Supabase). Это позволяет обходить региональные блокировки: ученик
открывает то зеркало, которое работает в его сети.

| Зеркало          | URL                                       | Когда использовать          |
| ---------------- | ----------------------------------------- | --------------------------- |
| Lovable          | `https://dvoechka.lovable.app`            | Основной публикуемый URL    |
| Netlify          | `https://dvoechka.netlify.app`            | Основной для учеников       |
| Cloudflare Pages | `https://<project>.pages.dev`             | Запасной (лучше из РФ)      |
| GitHub Pages     | `https://<user>.github.io/<repo>/`        | Запасной без VPN            |

## Переменные окружения

Все три значения публичные, их можно безопасно класть в репозиторий
или в env-переменные хостинга:

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ... (anon key)
VITE_SUPABASE_PROJECT_ID=<project-ref>
```

Уже лежат в `.env.production`. Хостинг подтянет автоматически, но в
дашборде задавать всё равно надёжнее (можно ротировать без коммита).

## Netlify

`netlify.toml` уже сконфигурирован. Деплой:

1. [app.netlify.com](https://app.netlify.com) → **Add new site → Import from Git** → выбрать репо.
2. Build settings подхватываются автоматически.
3. (Опционально) Site settings → Change site name.
4. Деплоится при каждом push в `main`.

При ошибке `lockfile is frozen` — install command в `netlify.toml` уже
учитывает это (`bun install --no-frozen-lockfile && npm run build`).

## Cloudflare Pages / Workers

`wrangler.toml` уже сконфигурирован. Настраивается один раз через
[dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages →
Create → Connect to Git**.

**Build settings (важно!):**

- **Framework preset:** `None` ⚠️ (не `Vite` — авто-детект ломает деплой)
- **Build command:** `bun run build`
- **Deploy command:** `bun run deploy:cf`
- **Build output directory:** `dist`

`wrangler` лежит в devDependencies — глобально ставить не нужно.

**Почему `Framework: None` и `--no-bundle`:** auto-детект Cloudflare
требует Vite ≥ 6, у нас Vite 5.4 + `@vitejs/plugin-legacy` (для старых
браузеров на школьных компьютерах). Апгрейд Vite сломает legacy-сборку.
`--no-bundle` отключает попытку Cloudflare пересобрать проект и просто
загружает готовый `dist/` как статику.

SPA-фоллбек включён через `not_found_handling = "single-page-application"`
в `wrangler.toml`.

> ⚠️ **НЕ создавать `public/_redirects`!** Это файл Netlify. Cloudflare
> Wrangler валидирует его и падает с ошибкой `Invalid _redirects
> configuration`. Для Cloudflare SPA-fallback уже в `wrangler.toml`,
> для Netlify — в `netlify.toml`.

## GitHub Pages

Workflow `.github/workflows/deploy-pages.yml` уже настроен. Один раз:

1. **Settings → Pages → Source: GitHub Actions**.
2. После следующего push в `main` (или ручного запуска workflow) задеплоится.
3. URL — `https://<username>.github.io/<repo>/`.

`vite.config.ts` сам подставляет `base="/<repo>/"` при `GITHUB_PAGES=true`.

`public/404.html` + snippet в `index.html` — стандартный
[spa-github-pages](https://github.com/rafgraph/spa-github-pages) трюк
для SPA-фоллбека на GH Pages.

> Важно: ссылки на live-сессию идут через префикс репо:
> `https://<user>.github.io/<repo>/live`. Без префикса GH Pages вернёт 404.

## Cloudflare Tunnel (опциональный локальный канал)

Если нужно временно показать локальную сборку через публичный URL:

```sh
brew install cloudflared

# В первом терминале:
npm run build
npm run preview:host

# Во втором:
npm run tunnel
# → URL вида https://random-words.trycloudflare.com
```

Туннель работает пока запущены оба процесса. URL новый при каждом запуске.

> На сетях с DNS-фильтрацией (некоторые РФ-провайдеры, корпоративные Wi-Fi)
> `cloudflared` падает с `connection refused`. Это не баг репозитория —
> нужен мобильный хотспот, Cloudflare WARP или просто опубликованные
> зеркала.

## Edge-функции

Деплоятся автоматически Lovable Cloud при изменениях в
`supabase/functions/`. Ручной деплой не нужен.

## Миграции БД

Миграции в `supabase/migrations/` применяются автоматически при apply.
Новые миграции создаются через Lovable Cloud (UI) или через
`supabase migration new` локально.

## После деплоя — проверочный чеклист

- [ ] Открыть `/` — главная грузится.
- [ ] Войти как учитель → создать тест → опубликовать.
- [ ] Пройти тест анонимным учеником.
- [ ] Получить отчёт в Telegram.
- [ ] Открыть запись экрана из админки (signed URL).
- [ ] `supabase--linter` → 0 warnings.
