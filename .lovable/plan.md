## Фикс автосохранения черновиков

### Корень проблемы (`src/pages/Index.tsx`)

Restore-эффект (стр. 310) и persist-эффект (стр. 359) запускаются на одном переходе в `screen === "test"`. `setState` из restore асинхронный → persist в том же рендере читает пустые `Array(N).fill("")` и **затирает** черновик в `localStorage`.

### Изменения только в `src/pages/Index.tsx`

1. Добавить `restoredKeyRef = useRef<string | null>(null)`.
2. **Restore-эффект**: проверять `restoredKeyRef.current === key` (не запускаться повторно); в конце ставить `restoredKeyRef.current = key` **всегда** (даже при отсутствии черновика); сбрасывать в `null` при выходе из `screen === "test"`. Если что-то реально восстановили — показать toast «✅ Черновик восстановлен».
3. **Persist-эффект**: в начале `if (restoredKeyRef.current !== key) return;` + обернуть `setItem` в try/catch (приватный режим / quota).
4. **Новый flush-эффект**: на `beforeunload`, `pagehide`, `visibilitychange (hidden)` синхронно писать в `localStorage` объединённый объект всех ответов из существующих refs (`blitz8Ref`, `answers6techFinalQ4Ref`, …). Гарантия сохранения при аварийном закрытии вкладки/обрыве сети.

### Не трогаю

- Формат ключа черновика, схему БД, edge-функции, экраны логина.
- Серверный автосейв (`save-attempt-progress`) — отдельная задача, не нужна для устранения текущего бага.
- Файловые вложения — `File` нельзя класть в `localStorage`, это отдельная история (IndexedDB).

### Затронутые файлы

- `src/pages/Index.tsx` — правка двух useEffect и добавление flush-эффекта (~150 строк изменений).
