## Цель
Развернуть копию сайта на Netlify с тем же бэком (Lovable Cloud / Supabase). Ученики из РФ будут заходить на `что-то.netlify.app` (или свой домен), а данные пойдут в тот же Supabase. Все результаты, античит, Telegram-уведомления, запись экрана — продолжат работать без изменений: учитель видит всё в одной админке.

## Что нужно добавить в код

### 1. `netlify.toml` в корне
Конфиг для билда + критичный SPA-fallback (без него любой прямой URL вроде `/live/ABC123` будет давать 404 при обновлении страницы):

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 2. `.env.production` (опционально, для подстраховки)
Чтобы Netlify-билд гарантированно использовал нужный Supabase, продублируем переменные. Это публичные ключи (anon + URL) — безопасно держать в репо:

```
VITE_SUPABASE_URL=https://gbpqlzjtcuhijtouwrvn.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...
VITE_SUPABASE_PROJECT_ID=gbpqlzjtcuhijtouwrvn
```

(Альтернатива — задать их в Netlify UI → Site settings → Environment variables. Сделаю файл для удобства, но пометим в README, что можно и через UI.)

### 3. Короткая инструкция в `README.md` (раздел "Deploy to Netlify")
- Зайти на netlify.com → New site → Import from Git (или Drag&Drop папки `dist` после `npm run build` локально)
- Если из Git — Netlify сам подхватит `netlify.toml`, ничего настраивать не надо
- После деплоя — добавить URL зеркала (`https://xxx.netlify.app`) в Supabase → Auth → URL Configuration → Redirect URLs (нужно только если будет email/Google логин учителя на зеркале; для учеников не требуется)

## Что НЕ надо менять

- Код приложения — ни строчки
- Supabase / edge functions / БД — остаются как есть
- `vite.config.ts` — без изменений
- `dvoechka.lovable.app` продолжит работать параллельно

## Что произойдёт после деплоя

1. Открываете `https://xxx.netlify.app` — видите ту же главную, тот же логин, те же тесты (читаются из той же БД).
2. Ученик сдаёт тест на зеркале → результат в той же таблице `test_results` → учитель видит в админке как обычно.
3. Античит-события и Telegram-уведомления летят с edge functions Supabase — на них Netlify не влияет.

## План работ (в build mode)

1. Создать `netlify.toml`
2. Создать `.env.production` с публичными переменными
3. Дописать раздел в `README.md` с шагами деплоя (3-4 строки)
4. Дать вам ссылку-инструкцию: какие 3 кнопки нажать на netlify.com

После этого вы делаете деплой сами (5 минут) и проверяете с РФ-устройства. Если Netlify заблочен — собираем альтернативу под GitHub Pages / Cloudflare Pages по тому же шаблону (там нужен только другой конфиг-файл).

## Файлы, которые будут созданы/изменены

- `netlify.toml` — новый
- `.env.production` — новый
- `README.md` — добавить раздел