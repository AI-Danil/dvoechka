# Деплой

Проект задеплоен на нескольких хостингах — все смотрят в одну БД (Supabase).
Это позволяет обходить региональные блокировки: ученик открывает то
зеркало, которое работает в его сети.

| Зеркало          | URL                                       | Когда использовать          |
| ---------------- | ----------------------------------------- | --------------------------- |
| Lovable          | `https://dvoechka.lovable.app`            | Основной публикуемый URL    |
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

Уже лежат в `.env.production`. В GitHub Actions и GitLab CI дефолты
прописаны прямо в workflow-файлах; при желании можно переопределить
через секреты репозитория.

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
  через `bun run build` и публикует `dist/` как GitLab Pages артефакт
  `public/`.
- `vite.config.ts` ставит `base="/"` (GitLab unique-domain → сайт в
  корне). SPA-фоллбек работает через `public/404.html`.

## Сохранение данных и запись экрана

Бэкенд один на все зеркала: и сохранение результатов, и upload файлов,
и запись экрана (rrweb → Supabase Storage `recordings` bucket) идут
напрямую в Supabase по `VITE_SUPABASE_URL`. От хостинга это не зависит
— работает одинаково на Lovable, GitHub Pages и GitLab Pages.

## Edge-функции

Деплоятся автоматически Lovable Cloud при изменениях в
`supabase/functions/`. Ручной деплой не нужен.

## Миграции БД

Миграции в `supabase/migrations/` применяются автоматически при apply.

## После деплоя — чеклист

- [ ] Открыть главную на каждом зеркале — грузится.
- [ ] Войти как учитель → создать тест → опубликовать.
- [ ] Пройти короткий тест анонимным учеником.
- [ ] Получить отчёт в Telegram.
- [ ] Открыть запись экрана из админки (signed URL).
- [ ] `supabase--linter` → 0 новых warnings.
