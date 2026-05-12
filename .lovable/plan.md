## Проблема

GitLab Pages с включённой фичей **Unique domains** сервит сайт по адресу `https://dvoechka-2dd881.gitlab.io/` в корне (без префикса проекта). А `vite.config.ts` сейчас при `GITLAB_PAGES=true` подставляет `base="/dvoechka/"`, поэтому все ассеты ловят 404 и срабатывает fallback "Страница не загрузилась".

## Решение

Убрать префикс для GitLab Pages — оставить `base="/"`.

### Файл: `vite.config.ts`

В блоке вычисления `projectBase` удалить ветку для GitLab (либо явно вернуть `/`):

```ts
const projectBase = (() => {
  if (process.env.GITHUB_PAGES === "true") {
    const repo = (process.env.GITHUB_REPOSITORY || "").split("/")[1];
    return repo ? `/${repo}/` : "/";
  }
  // GitLab Pages: с unique domains сайт всегда в корне.
  return "/";
})();
```

GitHub Pages логику не трогаем — там по-прежнему `/<repo>/`.

### Файл: `.gitlab-ci.yml`

Поменять триггер-комментарий в первой строке (или просто обновить дату), чтобы pipeline пересобрался:

```yaml
# Triggered: 2026-05-12 — fix base path for unique-domain pages
```

## Проверка после деплоя

1. Подождать ~1 минуту, пока pipeline `pages` пройдёт.
2. Открыть `https://dvoechka-2dd881.gitlab.io/` — должна загрузиться главная.
3. Если всё ОК — обновить `docs/DEPLOYMENT.md` (URL колонку для GitLab) отдельной задачей.

## Что НЕ ломаем

- GitHub Pages (`/<repo>/`) — без изменений.
- Lovable / Netlify / Cloudflare (`/`) — без изменений.
- SPA-fallback через `public/404.html` — работает на любом base.
