# План: отказ от туннеля + второе стабильное зеркало (Cloudflare Pages)

## Контекст

Туннель `cloudflared` на твоём маке не поднимается из-за того, что **DNS-запросы до Cloudflare режутся на уровне сети** (провайдер/роутер/firewall блокируют UDP/53 до `1.1.1.1`). Это не баг кода и не лечится правкой репо. Без рабочего DNS `cloudflared` не может зарезолвить `argotunnel.com` и падает с `connection refused`.

Поэтому меняем стратегию: **туннель убираем как обязательный шаг урока**, а вместо него поднимаем второе постоянное зеркало на Cloudflare Pages, которое работает 24/7 без твоего ноута.

## Что детям дать сегодня (без всяких туннелей)

- Основная ссылка: **`https://dvoechka.lovable.app`** (уже опубликовано, работает)
- Резервная: `https://dvoechka.netlify.app` (тоже уже работает)

Обе доступны прямо сейчас, никаких терминалов запускать не надо.

## Что меняем в репо (Трек B из старого плана)

Только статические файлы для Cloudflare Pages. React-код, Supabase-функции и схему БД не трогаем.

1. **`public/_redirects`** — уже существует, проверю содержимое и при необходимости добавлю SPA-фоллбек:
   ```
   /*    /index.html   200
   ```

2. **`public/_headers`** — уже существует, проверю security-заголовки:
   ```
   /*
     X-Frame-Options: DENY
     X-Content-Type-Options: nosniff
     Referrer-Policy: strict-origin-when-cross-origin

   /assets/*
     Cache-Control: public, max-age=31536000, immutable
   ```

3. **`README.md`** — обновить блок «Deployments»: убрать упоминание туннеля как основного варианта, добавить Pages-URL после настройки, оставить туннель в разделе «аварийный сценарий, если есть рабочий DNS».

4. **`.lovable/plan.md`** — почистить: убрать Трек A (туннель) или пометить как deprecated с пометкой «не работает на текущей сети».

5. **`package.json`** — скрипты `preview:host` и `tunnel` либо удалить, либо оставить с комментарием в README, что они для тех, у кого DNS до CF не режется. Я бы оставил — пригодятся, если поедешь в другое место.

## Что ты делаешь руками (Cloudflare Pages, ~10 минут, разово)

1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → вкладка **Pages** → **Connect to Git**.
2. Авторизуй Cloudflare GitHub App, выбери репозиторий `dvoechka`.
3. Настройки билда:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** пусто
4. **Environment variables** (скопировать из Netlify → Site settings → Environment variables):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
   - `NODE_VERSION = 20`
5. **Save and Deploy** → через 1-2 минуты получаешь URL `dvoechka.pages.dev`.
6. Проверяешь с телефона по 4G (без Wi-Fi), что всё открывается.

После этого у тебя три независимых зеркала на одном Supabase: Lovable / Netlify / Pages. Если одно упадёт — остальные работают, результаты падают в одну БД.

## Что НЕ делаем

- Не пытаемся починить DNS на текущей сети — это вне зоны проекта.
- Не трогаем Supabase, Edge Functions, схему БД, anti-cheat, аутентификацию.
- Не удаляем Netlify-конфиг (`netlify.toml` остаётся).

## Файлы, которые трону при апруве

- `public/_redirects` — проверка/правка
- `public/_headers` — проверка/правка
- `README.md` — обновление раздела Deployments
- `.lovable/plan.md` — пометить туннель как опциональный/нерабочий на текущей сети
- `package.json` — опционально, оставить скрипты с пометкой

## На случай если очень хочется туннель

Три способа, не требующих правок репо:
1. **Мобильный хотспот** с телефона → `cloudflared` поднимется, потому что мобильная сеть DNS не режет.
2. **Cloudflare WARP** (приложение из App Store, бесплатно, без регистрации) → шифрует DNS, обходит блокировку.
3. **ngrok** (`brew install ngrok`, `ngrok http 4173`) — другой провайдер, может пройти там, где CF режется.

Это не часть плана для репо — просто зафиксируй для себя.

---

Апрувни — обновлю файлы и распишу, что тебе делать в Cloudflare Dashboard по шагам.
