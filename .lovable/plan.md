## Фиксы

1. **`src/pages/Index.tsx`** — обернуть `doSubmit` в `useCallback` (или вызывать через ref), включить в deps useEffect автосабмита (строка 1052). Убирает риск stale closure при тайм-ауте.
2. **`src/hooks/useRrwebRecorder.ts`** — удалить мёртвый `// eslint-disable-next-line react-hooks/exhaustive-deps` (строка 160).
3. **`src/pages/Replay.tsx`** — заменить три `as any` + комментарии eslint-disable на узкие типы:
   - `{ $destroy?: () => void }` для destroy
   - `{ goto?: (n: number) => void }` для seek
   - корректный тип events для конструктора rrwebPlayer

После правок — `vitest run` + `eslint` для верификации.

## Файлы
- `src/pages/Index.tsx`
- `src/hooks/useRrwebRecorder.ts`
- `src/pages/Replay.tsx`
