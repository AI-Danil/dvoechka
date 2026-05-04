## Цель
Починить деплой на Netlify — обойти ошибку `EBADPLATFORM` для `@swc/core-linux-x64-musl`.

## Причина
`package-lock.json` залочил musl-вариант SWC (Lovable песочница на Alpine). Netlify собирает на glibc → npm install падает.

## Фикс
Одна правка в `netlify.toml` — пересобирать lock под платформу Netlify:

```toml
[build]
  command = "rm -f package-lock.json && npm install && npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## Что меняется
- `netlify.toml` — команда сборки удаляет `package-lock.json` перед `npm install`, чтобы npm подобрал glibc-биндинги SWC.

## Что НЕ меняется
- Сам `package-lock.json` в репо — остаётся как есть (нужен для Lovable-песочницы).
- Код приложения, Supabase, edge functions — без изменений.

## После применения
Зайти на Netlify → Deploys → **Trigger deploy → Clear cache and deploy site**. Через ~2 минуты должно собраться.
