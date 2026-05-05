## Проблема

На GitHub Pages у учеников 404 при заходе на `/live` (и другие deep links вроде `/auth`, `/teacher/live`).

Причина: workflow `.github/workflows/deploy-pages.yml` после билда выполняет `cp dist/index.html dist/404.html`. Это **перезаписывает** правильный `public/404.html`, в котором лежит SPA-редирект для GH Pages (он переписывает `/<repo>/live` в `/<repo>/?/live`, а инлайн-скрипт в `index.html` потом восстанавливает путь через `history.replaceState`).

После перезаписи `404.html` отдаёт обычный `index.html` без редиректа → роутер не видит правильного пути, ассеты могут резолвиться с неверным base, в итоге у учеников белый экран или 404.

## Что менять

Файл: `.github/workflows/deploy-pages.yml`

Убрать шаг:

```yaml
- name: SPA fallback (copy index.html → 404.html)
  run: cp dist/index.html dist/404.html
```

`public/404.html` уже содержит правильный SPA-редирект и автоматически копируется Vite в `dist/404.html` при билде. Дополнительный `cp` не нужен и вредит.

## Проверка после деплоя

1. Дождаться завершения GitHub Actions.
2. Открыть `https://<owner>.github.io/<repo>/live` напрямую → должна открыться форма ввода кода (а не 404 / белый экран).
3. То же для `https://<owner>.github.io/<repo>/auth`.

## Затронутые файлы

- `.github/workflows/deploy-pages.yml` — удалить шаг "SPA fallback".

На `dvoechka.lovable.app` бага нет — Lovable hosting сам разруливает SPA fallback, поэтому правка касается только GH Pages деплоя.
