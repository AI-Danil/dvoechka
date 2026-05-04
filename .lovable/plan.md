## Что на самом деле падает

Да, понял: это билд из Cloudflare/Lovable Cloud, не Netlify. Причина в логах одна и та же:

```text
bun install --frozen-lockfile
error: lockfile had changes, but lockfile is frozen
```

Это значит: `package.json` и `bun.lock` сейчас не совпадают. Cloud-сборщик запускает установку строго через `bun install --frozen-lockfile`, поэтому он не имеет права сам поправить lockfile и сразу падает.

Я уже проверил файлы:

- `package.json` больше не содержит SWC-зависимостей.
- `vite.config.ts` уже использует правильный `@vitejs/plugin-react`.
- Но `bun.lock` всё ещё содержит старые `@swc/core...` записи.
- Плюс `vitest.config.ts` всё ещё импортирует `@vitejs/plugin-react-swc`, хотя его уже нет в `package.json`.

## План правки

1. **Исправить тестовый Vite/Vitest config**
   - В `vitest.config.ts` заменить:
     ```ts
     import react from "@vitejs/plugin-react-swc";
     ```
     на:
     ```ts
     import react from "@vitejs/plugin-react";
     ```
   - Это соответствует проектной памяти: использовать только `@vitejs/plugin-react`, без SWC.

2. **Перегенерировать lockfile под текущий `package.json`**
   - Запустить установку зависимостей так, чтобы `bun.lock` синхронизировался с `package.json`.
   - Ожидаемый результат: из `bun.lock` уйдут старые прямые зависимости `@swc/core`, `@swc/core-linux-*`, и `bun install --frozen-lockfile` перестанет падать.

3. **Проверить, что cloud-сценарий больше не упирается в frozen lockfile**
   - Локально проверить именно команду, которую запускает cloud:
     ```sh
     bun install --frozen-lockfile
     ```
   - Если она проходит, Cloudflare/Lovable Cloud должен пройти этап dependencies install.

4. **При необходимости обновить README**
   - Коротко добавить troubleshooting-блок для Cloudflare Pages/Lovable Cloud:
     - если ошибка `lockfile had changes, but lockfile is frozen`, значит надо обновить и закоммитить `bun.lock` вместе с `package.json`.

## Файлы, которые будут затронуты

- `vitest.config.ts`
- `bun.lock`
- возможно `README.md` — только если добавлю короткую заметку по этой ошибке.

## Что тебе сделать после применения

После апрува и правки:

1. Синхронизировать изменения в GitHub/репо, если нужно.
2. В Cloudflare Pages запустить новый deploy.
3. Желательно выбрать **Retry deployment** или **Clear cache and deploy**.

Netlify трогать не надо — он уже работает.