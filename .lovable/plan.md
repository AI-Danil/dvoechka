# Вариант А через GitHub Pages

## Контекст

GitHub в РФ открывается без VPN (включая `*.github.io`). Это даёт нам ещё одно зеркало фронтенда. Бэкенд остаётся прежний (Supabase) — данные у всех зеркал общие.

**Важное ограничение варианта А:** фронт грузится с github.io, но XHR из браузера всё равно идёт на `gbpqlzjtcuhijtouwrvn.supabase.co`. Если у конкретного провайдера блокируется именно Supabase — этот вариант не починит. Если блокируется только Lovable/Netlify домен — починит.

Сначала надо проверить через `page-beacon`, на каком этапе у детей всё умирает (см. конец плана).

## Что делаю

### 1. GitHub Actions workflow для билда и деплоя

Создаю `.github/workflows/deploy-pages.yml`:
- триггер: push в main + ручной запуск
- ставит bun, делает `bun install --no-frozen-lockfile && bun run build`
- env переменные `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` подставляются из repo secrets (или хардкодом — они и так публичные anon-ключи, лежат в `.env.production`)
- публикует `dist/` через официальные actions `actions/upload-pages-artifact` + `actions/deploy-pages`

### 2. SPA-fallback для GitHub Pages

GH Pages не умеет catch-all → /index.html, как Netlify. Стандартный трюк:
- `public/404.html` — копия `index.html` (GH Pages отдаёт его на любой неизвестный роут со статусом 200 для SPA после небольшого скрипта-редиректа)
- маленький snippet в `index.html` который декодирует path из query и подставляет в history (классический spa-github-pages трюк, ~15 строк)

Это нужно чтобы прямые ссылки `/admin`, `/test/...`, рефреш страницы работали.

### 3. base path в Vite

GH Pages по дефолту хостит на `https://<user>.github.io/<repo>/` — нужен подпуть. Два варианта:
- **(a)** project pages: добавить `base: "/dvoechka/"` в `vite.config.ts` (только в проде, через `mode === "production"`). URL будет вида `https://<user>.github.io/dvoechka/`.
- **(b)** user/org pages в отдельном репо `<user>.github.io` — корень, base не нужен, но требует второй репозиторий.

Делаю (a) — проще, всё в одном репо. Если позже захочется красивый URL — подключим кастомный домен.

### 4. README

Дописываю секцию «GitHub Pages зеркало» по аналогии с Netlify/Cloudflare: как включить (Settings → Pages → Source: GitHub Actions), какой URL получится, как добавить secrets если решим не хардкодить.

## Что НЕ трогаю

- Supabase, edge functions, БД, RLS
- Существующие зеркала (Netlify, Cloudflare Pages, Lovable) — продолжают работать
- Код приложения, тесты, бутстрап
- `vite.config.ts` кроме добавления `base` под прод

## После деплоя — диагностика блокировки

Перед тем как раздавать новый URL детям, прошу одного-двух ребёнка из РФ открыть его и посмотреть в Telegram алерты от `page-beacon`:

- пришёл `🟦 stage=html` но нет `🟩 stage=js-start` → JS-бандл блокируется (модули/легаси). GitHub Pages тут не поможет, причина в самом бандле.
- пришли оба, но дальше белый экран → блокируется уже Supabase. Тогда вариант А недостаточен, нужен Б (прокси).
- ничего не пришло → блокируется сам домен github.io у провайдера (маловероятно, но бывает на школьных сетях с белыми списками).

По результату решаем — оставляем зеркало или переходим к варианту Б.

## Файлы

- создать: `.github/workflows/deploy-pages.yml`
- создать: `public/404.html`
- изменить: `index.html` (добавить spa-github-pages snippet)
- изменить: `vite.config.ts` (добавить `base` для прода)
- изменить: `README.md` (секция про GH Pages)

## Что нужно от тебя после моих изменений

1. Зайти в GitHub → Settings → Pages → Source: **GitHub Actions**.
2. Дождаться зелёного workflow run (~2 мин).
3. Открыть выданный URL `https://<твой-github-username>.github.io/<имя-репо>/` — это и будет зеркало.
4. (Опционально) В Settings → Secrets and variables → Actions добавить три `VITE_SUPABASE_*` секрета, если не хочется хардкода. Я по дефолту захардкожу из `.env.production` (там и так публичные ключи) — так проще, но скажи если хочешь secrets.
