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
| GitLab Pages     | `https://<user>.gitlab.io/<repo>/`        | Запасной из РФ без VPN      |

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

## GitLab Pages (зеркало для РФ)

GitLab.com доступен в РФ без VPN — это запасной канал, если GitHub
блокируется у провайдера ученика.

### Однократная настройка

1. На [gitlab.com](https://gitlab.com) — зарегистрироваться (можно через
   GitHub-аккаунт), создать **пустой публичный** проект `dvoechka`
   (без README).
2. **Settings → Access Tokens → Add new token**: name `github-mirror`,
   role **Maintainer**, scope `write_repository`. Скопировать токен.
3. На GitHub в репо `dvoechka` → **Settings → Secrets and variables →
   Actions → New repository secret** добавить два секрета:
   - `GITLAB_MIRROR_TOKEN` — токен из шага 2
   - `GITLAB_REPO_URL` — `https://gitlab.com/<user>/dvoechka.git`
4. Запустить workflow `Mirror to GitLab` (Actions → Run workflow) или
   просто запушить пустой коммит — после первого зеркала на GitLab
   появится код и сразу запустится pipeline `pages`.

### Как это работает

- `.github/workflows/mirror-to-gitlab.yml` — на каждый push в `main`
  делает `git push --mirror` в GitLab. Lag ~10–20 секунд.
- `.gitlab-ci.yml` — после получения коммита GitLab CI билдит проект
  через `bun run build` (с `GITLAB_PAGES=true`) и публикует `dist/` как
  GitLab Pages артефакт `public/`.
- `vite.config.ts` подставляет `base="/<repo>/"` через
  `CI_PROJECT_NAME`, аналогично GitHub Pages.

URL получится `https://<user>.gitlab.io/dvoechka/`. SPA-фоллбек работает
из коробки благодаря тому же `public/404.html`.

> Env-переменные Supabase зашиты в `.gitlab-ci.yml` дефолтами (как и в
> GitHub Actions). При желании можно переопределить в **Settings →
> CI/CD → Variables** на GitLab без правки репо.

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
