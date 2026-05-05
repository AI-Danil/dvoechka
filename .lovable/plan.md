Причина 404 уже понятна: `https://ai-danil.github.io/live` не существует, потому что GitHub Pages у этого репозитория опубликован как project site под префиксом репозитория: `https://ai-danil.github.io/dvoechka/`. Рабочая ссылка для детей сейчас: `https://ai-danil.github.io/dvoechka/live`.

Нужно не только сказать правильную ссылку, но и убрать место, которое снова генерирует неправильную ссылку из интерфейса.

План исправления:

1. Исправить кнопку на главной странице
   - Файл: `src/pages/Index.tsx`
   - Сейчас кнопка «Войти по коду класса» использует обычный HTML-link `href="/live"`.
   - На GitHub Pages это уводит на корень домена `https://ai-danil.github.io/live`, без `/dvoechka/`, поэтому дети получают GitHub 404.
   - Заменю на React Router `Link to="/live"`, чтобы `BrowserRouter basename={import.meta.env.BASE_URL}` автоматически добавлял `/dvoechka/` в production-сборке GitHub Pages.

2. Исправить ссылку возврата на 404-странице
   - Файл: `src/pages/NotFound.tsx`
   - Заменю `href="/"` на `Link to="/"`, чтобы возврат домой тоже не терял `/dvoechka/`.

3. Исправить email redirect для GitHub Pages
   - Файл: `src/pages/Auth.tsx`
   - Сейчас `emailRedirectTo` собирается как `${window.location.origin}/auth`, что на GitHub Pages даёт `https://ai-danil.github.io/auth` вместо `https://ai-danil.github.io/dvoechka/auth`.
   - Соберу URL с учётом `import.meta.env.BASE_URL`.

4. Обновить README, чтобы не вводил в заблуждение
   - Файл: `README.md`
   - Уберу устаревшую строку про `index.html → 404.html`, потому что этот шаг уже удалён.
   - Добавлю явный пример: ссылка live-сессии на GitHub Pages должна быть вида `https://<username>.github.io/<repo>/live`, для текущего репозитория — `https://ai-danil.github.io/dvoechka/live`.

После этого нужно будет запушить изменения и дождаться GitHub Actions deploy. Детям надо давать ссылку:

```text
https://ai-danil.github.io/dvoechka/live
```

А не:

```text
https://ai-danil.github.io/live
```