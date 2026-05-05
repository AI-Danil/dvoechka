# Фикс 404 на GitHub Pages — basename для React Router

## Диагноз

Открыл `https://ai-danil.github.io/dvoechka/` через браузер-инспектор. Сайт **загружается** (JS, CSS, ассеты — всё подтянулось). Но в консоли:

```
404 Error: User attempted to access non-existent route: /dvoechka/
```

Это **не** 404 от GitHub Pages — это 404 от нашего React Router. Vite корректно собран с `base="/dvoechka/"`, но `BrowserRouter` не знает про этот префикс и считает путь `/dvoechka/` неизвестным маршрутом → рендерит компонент `NotFound`.

## Фикс

Один файл, одна строчка.

### `src/App.tsx`

```diff
- <BrowserRouter>
+ <BrowserRouter basename={import.meta.env.BASE_URL}>
```

`import.meta.env.BASE_URL`:
- На GitHub Pages = `/dvoechka/` (Vite подставляет из `base`)
- На Lovable / локально = `/`
- Итого работает везде без условий.

## После

1. Lovable засинкает в GitHub автоматически.
2. Workflow `Deploy to GitHub Pages` запустится сам на push в `main`.
3. Через ~2 минуты `https://ai-danil.github.io/dvoechka/` откроет главную с тестами.
4. На `dvoechka.lovable.app` нужно нажать **Update** в Publish (фронтенд-изменение).

## Затронутые файлы
- `src/App.tsx` — добавить `basename={import.meta.env.BASE_URL}` к `BrowserRouter`
