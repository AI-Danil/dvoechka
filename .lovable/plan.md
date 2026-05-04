
# План: Cloudflare Tunnel + Cloudflare Pages

Два независимых трека. Делаем последовательно: сначала туннель (нужен на ближайший урок), потом Pages (постоянное зеркало).

---

## Трек A — Cloudflare Tunnel (TryCloudflare) на macOS

**Цель:** за 5 минут дать детям публичную HTTPS-ссылку на прод-сборку, поднятую у тебя на ноуте.

**Изменения в репо:** никаких. Это чисто локальный workflow.

### Что делаешь руками (один раз)

1. Установить `cloudflared`:
   ```sh
   brew install cloudflared
   cloudflared --version
   ```

### Перед каждым уроком

В двух терминалах из папки проекта:

**Терминал 1 — собрать и поднять прод-превью:**
```sh
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```
`--host 0.0.0.0` обязателен, иначе `cloudflared` не достучится. Vite будет отдавать статику из `dist/`.

**Терминал 2 — поднять туннель:**
```sh
cloudflared tunnel --url http://localhost:4173
```

В выводе будет строка вида:
```
https://random-three-words.trycloudflare.com
```
Эту ссылку отдаёшь детям. Работает пока оба процесса живы.

### Скрипт-обёртка (опционально, чтобы не помнить команды)

Добавим в `package.json` два скрипта:
```json
"preview:host": "vite preview --host 0.0.0.0 --port 4173",
"tunnel": "cloudflared tunnel --url http://localhost:4173"
```
Тогда: `npm run build && npm run preview:host` в одном терминале, `npm run tunnel` в другом.

### Подводные камни (важно знать заранее)

- **HMR/dev не туннелим** — ты выбрал прод-сборку, это правильно. Dev-сервер через туннель работает криво из-за websocket'ов HMR.
- **Supabase CORS / Auth redirect URLs:** туннельный домен меняется при каждом запуске. Если в Supabase Auth настроены жёсткие redirect URLs — анонимные операции работать будут (у тебя так и сделано), а вот OAuth/email-ссылки сломаются. У вас вход через 2 слова имени, OAuth не используется → проблем быть не должно.
- **Anti-cheat и фокус-детект:** поведение `document.visibilitychange` через туннель идентично, антифрод не сломается.
- **Ноут не должен уснуть.** На время урока: `caffeinate -dimsu` в третьем терминале — держит мак бодрым.
- **Лимиты TryCloudflare:** официально rate-limit не публикуется, но для класса 30 человек хватает с запасом. Если будет 100+ одновременно — лучше Pages (Трек B).
- **Уязвимость:** ссылка публичная и не индексируется поисковиками, но любой с ссылкой зайдёт. Не критично — у вас сама форма требует валидное имя.

---

## Трек B — Cloudflare Pages (постоянное зеркало)

**Цель:** второй стабильный URL рядом с Netlify, всегда онлайн, в РФ открывается лучше. Деплой автоматом из GitHub при каждом пуше.

### Что добавляем в репо (мои правки)

1. **`public/_redirects`** — SPA-фоллбек, чтобы React Router работал на прямых ссылках и refresh:
   ```
   /*    /index.html   200
   ```
   Vite копирует содержимое `public/` в `dist/` как есть, так что Pages подхватит. Этот же файл, к слову, помогает и Netlify — лишним не будет.

2. **`public/_headers`** — базовые security-заголовки и кеш для статики:
   ```
   /*
     X-Frame-Options: DENY
     X-Content-Type-Options: nosniff
     Referrer-Policy: strict-origin-when-cross-origin

   /assets/*
     Cache-Control: public, max-age=31536000, immutable
   ```

3. Документация в `README.md` (короткий блок «Deployments»): URL Netlify, URL Pages, как работает туннель.

**`netlify.toml` не трогаем** — он существует и управляет Netlify, для Pages не используется.

### Что ты делаешь руками в Cloudflare (10 минут, разовая настройка)

Нужен GitHub-коннект Lovable → твой репо (он у тебя уже есть, судя по тому, что Netlify работает).

1. Зарегистрироваться/войти на https://dash.cloudflare.com → раздел **Workers & Pages** → **Create** → вкладка **Pages** → **Connect to Git**.
2. Авторизовать Cloudflare GitHub App, выбрать репозиторий проекта.
3. Настройки билда:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** оставить пустым
   - **Node version:** добавить переменную `NODE_VERSION = 20`
4. **Environment variables** (всё, что у тебя в `.env` для Vite — `VITE_*` встраиваются в бандл при билде, поэтому Pages должен их получить):
   - `VITE_SUPABASE_URL` = (то же, что в Netlify)
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = (то же)
   - `VITE_SUPABASE_PROJECT_ID` = (то же)

   Где взять: открой Netlify → Site settings → Environment variables, скопируй те же значения.
5. **Save and Deploy**. Через 1-2 минуты получишь URL вида `dvoechka.pages.dev` (имя поддомена выберешь сам).
6. **Custom domain (опционально):** если хочешь `что-то.твой-домен`, можно привязать в Pages → Custom domains. Но `*.pages.dev` уже работает и отлично открывается из РФ.

### Что детям дать

- Основной: `https://dvoechka.netlify.app`
- Запасной: `https://dvoechka.pages.dev` (или твой выбранный)
- Аварийный (если Netlify и Pages оба легли, а такое теоретически может случиться при региональной блокировке CDN): туннель из Трека A

Один и тот же бэкенд (Supabase) обслуживает все три — результаты падают в одну БД.

### Подводные камни Pages

- **Первый деплой может ругнуться на `lovable-tagger`** — он в `devDependencies`, Cloudflare по умолчанию ставит и dev-deps, всё ок. Если вдруг включится `NPM_FLAGS=--production` — убрать.
- **Размер бандла:** у Pages лимит 25 МБ на файл и 20 000 файлов в деплое. У вас Vite-сборка ~2-3 МБ, не упрёшься.
- **Edge Functions Supabase** Pages не трогает — они живут на Supabase, продолжают работать как сейчас.

---

## Итоговый чек-лист

```text
Трек A — туннель (сегодня, для урока)
  [ ] brew install cloudflared
  [ ] добавить scripts: preview:host, tunnel в package.json
  [ ] перед уроком: npm run build && npm run preview:host
  [ ] второй терминал: npm run tunnel → скопировать ссылку
  [ ] caffeinate -dimsu чтобы мак не спал

Трек B — Pages (один раз, потом автомат)
  [Lovable] создать public/_redirects
  [Lovable] создать public/_headers
  [Lovable] обновить README с deployment-таблицей
  [Ты] CF Dashboard → Workers & Pages → Connect Git
  [Ты] Framework: Vite, build: npm run build, output: dist
  [Ты] env vars: VITE_SUPABASE_URL/KEY/PROJECT_ID, NODE_VERSION=20
  [Ты] Save → дождаться деплоя → проверить ссылку на телефоне
```

## Файлы, которые я трону при апруве

- `package.json` — добавить 2 скрипта
- `public/_redirects` — создать
- `public/_headers` — создать
- `README.md` — добавить блок про deployments (если есть README; иначе создам)

Серверный код, Supabase-функции, схема БД, сам React-код — **не трогаем**.

---

Апрувни план — выкачу все 4 файла одной правкой, дам тебе точные команды для терминала и пройдёмся по настройке Pages вместе.
