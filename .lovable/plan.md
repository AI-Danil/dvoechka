Проблема теперь понятна: Netlify запускает свой этап `Installing dependencies` ДО нашей `build.command`. Поэтому `rm -f package-lock.json` из `netlify.toml` не успевает сработать — установка уже падает раньше.

Дополнительно в проекте есть прямые зависимости, которых быть не должно:

- `package.json`: `@swc/core`
- `package.json`: `@swc/core-linux-x64-gnu`
- `package.json`: `@swc/core-linux-x64-musl`
- `package-lock.json`: ещё остался `@vitejs/plugin-react-swc`

При этом `vite.config.ts` уже использует правильный плагин:

```ts
import react from "@vitejs/plugin-react";
```

То есть SWC для сборки не нужен.

## План фикса

1. В `package.json` удалить из `dependencies`:
   - `@swc/core`
   - `@swc/core-linux-x64-gnu`
   - `@swc/core-linux-x64-musl`

2. В `package-lock.json` убрать устаревшие SWC-записи, чтобы Netlify больше не пытался ставить musl-пакет на glibc.
   - Также убрать оставшийся `@vitejs/plugin-react-swc` из lock-файла, потому что проект его не использует.

3. Упростить `netlify.toml` обратно до нормальной команды:

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

4. Оставить без изменений:
   - `vite.config.ts`
   - код приложения
   - Lovable Cloud / backend
   - `.env.production`

## После правки

В Netlify нужно запустить:

`Deploys → Trigger deploy → Clear cache and deploy site`

Ожидаемый результат: этап `Installing dependencies` пройдёт, потому что в манифестах больше не будет прямой несовместимой зависимости `@swc/core-linux-x64-musl`.

## Файлы, которые будут затронуты

- `package.json`
- `package-lock.json`
- `netlify.toml`