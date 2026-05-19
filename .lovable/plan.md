# Fix: `TypeError: B.trim is not a function`

## Причина
В `src/pages/Index.tsx` (строки 937 и 950) считаем прогресс по новым `PhysQ4Answer[]` так:

```ts
answers9physFinalQ4.filter((a) => a.skipped || a.text.trim() !== "").length
answers7physFinalQ4.filter((a) => a.skipped || a.text.trim() !== "").length
```

Если в `localStorage` / в серверном черновике (`load-draft`) лежит старая или повреждённая запись, где элемент массива — это `string`, `number`, `null` или объект без `text: string`, то `a.text.trim()` падает с `B.trim is not a function`. Это и есть текущая ошибка с продакшна (минифицированный `B` = `a.text`).

Это касается обоих классов (9 и 7 физика, итоговая Q4), потому что код симметричный.

## Что делать

Только фронт, без бэкенда и без изменения логики проверки.

### 1. `src/pages/Index.tsx` — безопасное чтение `.text`
Заменить в обоих местах (строки ~937 и ~950) проверку на безопасную:

```ts
const isFilled = (a: PhysQ4Answer | undefined) =>
  !!a && (a.skipped || String(a.text ?? "").trim() !== "");
const filled = answers9physFinalQ4.filter(isFilled).length;
```

Аналогично для `answers7physFinalQ4`.

### 2. `src/pages/Index.tsx` — нормализация при восстановлении черновика
В блоках `load-draft` (строки 609–613 и 627–631), где сейчас:

```ts
const arr = (w.answers9physFinalQ4 as PhysQ4Answer[]).slice(0, 6);
while (arr.length < 6) arr.push({ text: "", skipped: false });
```

добавить `.map` с нормализацией каждого элемента к `{ text: string, skipped: boolean }`:

```ts
const normalize = (x: unknown): PhysQ4Answer => {
  if (x && typeof x === "object") {
    const o = x as Record<string, unknown>;
    return {
      text: typeof o.text === "string" ? o.text : "",
      skipped: !!o.skipped,
    };
  }
  if (typeof x === "string") return { text: x, skipped: false };
  return { text: "", skipped: false };
};
const arr = (Array.isArray(w.answers9physFinalQ4) ? w.answers9physFinalQ4 : [])
  .slice(0, 6)
  .map(normalize);
while (arr.length < 6) arr.push({ text: "", skipped: false });
```

Та же нормализация — для `answers7physFinalQ4`.

### 3. Аналогично для `localStorage`-восстановления
Найти места, где `answers9physFinalQ4` / `answers7physFinalQ4` читаются из `localStorage` payload (тот же файл, выше по тексту), и пропустить через ту же `normalize`. Если код переиспользует ту же ветку — достаточно одной правки.

## Чего НЕ делаем
- Не трогаем edge-функции (`send-test-results`, `save-draft`, `load-draft`).
- Не меняем формат `PhysQ4Answer`.
- Не чистим существующие черновики у учеников — нормализация при чтении сделает это автоматически.

## Проверка
1. Открыть `/` как ученик 7-го (физика → итоговая Q4) и 9-го класса — страница не должна падать.
2. В DevTools положить в `localStorage` мусорный драфт вида `{"answers7physFinalQ4":["abc", 1, null]}` под нужным ключом — после перезагрузки страница рендерится, поле пустое или с восстановленным текстом, без `TypeError`.
3. Нормальное заполнение и автосохранение продолжают работать.

## Затронутые файлы
- `src/pages/Index.tsx`
