# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## Deployments

Приложение хостится в нескольких местах одновременно — все они смотрят в одну и ту же базу (Supabase), результаты учеников падают в общую таблицу.

| Зеркало | URL | Когда использовать |
|---|---|---|
| Lovable | `https://dvoechka.lovable.app` | Основной публикуемый URL |
| Netlify | `https://dvoechka.netlify.app` | Основной для учеников |
| Cloudflare Pages | `https://<project>.pages.dev` | Запасной, лучше открывается из РФ |
| Cloudflare Tunnel | `https://*.trycloudflare.com` | Опционально, локально с ноута (требует рабочего DNS до Cloudflare) |

### Cloudflare Tunnel (опциональный локальный канал)

> **Внимание:** на сетях с фильтрацией DNS (некоторые РФ-провайдеры, корпоративные Wi-Fi) `cloudflared` не поднимается — резолв `argotunnel.com` падает с `connection refused`. В этом случае используйте мобильный хотспот, Cloudflare WARP или просто опубликованные зеркала Lovable / Netlify / Pages.

Если DNS до CF проходит, туннель поднимается за минуту:

```sh
# 1. Установить cloudflared один раз
brew install cloudflared

# 2. В первом терминале — собрать и поднять прод-превью
npm run build
npm run preview:host

# 3. Во втором терминале — поднять публичный туннель
npm run tunnel
# → скопировать URL вида https://random-words.trycloudflare.com

# 4. (опционально) не дать ноуту уснуть
caffeinate -dimsu
```

Туннель живёт пока запущены оба процесса. URL новый при каждом запуске. Если падает с `connection refused` на DNS — это не лечится правкой репо, нужна другая сеть.

### Cloudflare Pages (постоянное зеркало)

Настраивается один раз через https://dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git**:

- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Environment variables:** `NODE_VERSION=20`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` (значения те же, что в Netlify)

Дальше Pages деплоит автоматически при каждом push в main. SPA-роутинг и security-заголовки уже настроены через `public/_redirects` и `public/_headers`.

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Зеркало на Netlify (для РФ)

Проект готов к деплою на Netlify как «зеркало» — отдельный домен, тот же бэкенд (Supabase). Все результаты учеников падают в ту же БД, учитель видит всё в одной админке.

**Способ 1 — через GitHub (рекомендую):**
1. Откройте [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**.
2. Выберите GitHub → этот репозиторий.
3. Netlify автоматически подхватит `netlify.toml` (build command, publish dir, SPA-redirect). Ничего настраивать не надо.
4. Жмите **Deploy**. Через ~2 минуты получите ссылку вида `https://random-name.netlify.app`.
5. (Опционально) В **Site settings → Change site name** — задайте читабельный subdomain.

**Способ 2 — Drag & Drop (без Git):**
1. Локально: `npm install && npm run build` → получите папку `dist/`.
2. На [app.netlify.com/drop](https://app.netlify.com/drop) перетащите папку `dist`.
3. Готово.

**Environment variables на Netlify:**
В дашборде Netlify: **Site configuration → Environment variables → Add a variable → Import from .env**, вставить значения из `.env.production` репо:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Технически Vite подхватит `.env.production` из репо и без этого, но задать в дашборде надёжнее (можно ротировать без коммита). После добавления — **Deploys → Trigger deploy → Clear cache and deploy site**.

**Если билд падает на `lockfile is frozen`** — это уже учтено в `netlify.toml` (install command = `bun install --no-frozen-lockfile && npm run build`).

**Что работает на зеркале:**
- Все тесты, античит, запись экрана (rrweb), Telegram-уведомления, загрузка файлов.
- Те же данные, что и на основном `dvoechka.lovable.app`.

**Если Netlify окажется недоступен из РФ** — те же файлы (`dist/`) подойдут для GitHub Pages, Cloudflare Pages, Vercel. Только `netlify.toml` заменить на их аналог.
