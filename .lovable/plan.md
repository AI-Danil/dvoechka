
## Цель

Не давать ученику начать тест, пока не подтверждено, что запись экрана (rrweb → Supabase Storage) реально работает. Если sentinel-загрузка падает — показать ошибку и не пускать в тест.

## Где менять

Запись экрана стартует в двух местах:
1. `src/pages/Index.tsx` — основной поток (классический тест по коду из localStorage). `setResultId(...)` + `setScreen("test")` в `startTest()` (строки 1103–1124).
2. `src/components/LiveSessionRunner.tsx` — live-сессии по коду от учителя. `useState(() => safeRandomUUID())` + `useRrwebRecorder({ enabled: isActive })`.

Sentinel-загрузка сейчас живёт **внутри** `useRrwebRecorder` (только логирует в консоль). Надо вынести её в отдельную функцию-предчек, которую вызываем **до** перехода на экран теста.

## Что делаем

### 1. Новый утилитный модуль `src/lib/checkRecordingStorage.ts`

Экспортирует `async function checkRecordingStorage(resultId: string): Promise<{ ok: true } | { ok: false; reason: string }>`:

- грузит `<resultId>/preflight.txt` (2 байта) в bucket `rrweb-sessions` с `upsert: false`;
- если есть ошибка — возвращает `{ ok: false, reason: error.message }`;
- если ок — возвращает `{ ok: true }` (файл остаётся, занимает 2 байта — не страшно);
- ловит и сетевые исключения (нет интернета / CORS / т.п.) → `ok: false`.

### 2. Index.tsx: гейт перед стартом теста

В `startTest(chosenTestId)`:

```text
1. сгенерировать newResultId = safeRandomUUID()
2. показать спиннер / disabled state на кнопке (новый стейт checkingStorage)
3. await checkRecordingStorage(newResultId)
4a. если ok=false → toast.error("Не удалось включить запись экрана. Обновите страницу или смените браузер. Тест начать нельзя.") + опционально вызвать notify-copy-attempt с алертом учителю
4b. если ok=true → setResultId(newResultId), setScreen("test"), как сейчас
```

### 3. LiveSessionRunner.tsx: тот же гейт

Сейчас resultId генерится в `useState`, и тест сразу активен. Меняем:
- добавляем локальный стейт `storageReady: "checking" | "ok" | "failed"`;
- `useEffect` при маунте → `checkRecordingStorage(resultId)` → выставляет `ok`/`failed`;
- пока `checking` — показываем экран «Подготавливаем запись экрана…»;
- при `failed` — экран ошибки с кнопкой «Повторить проверку» и текстом «Без записи тест начать нельзя»;
- активным (`isActive`) тест становится только при `storageReady === "ok"`.

### 4. Убрать дублирующий sentinel из `useRrwebRecorder`

Внутренний sentinel-аплоад (строки 115–126) больше не нужен — мы уже проверили storage до старта. Удаляем, чтобы не плодить мусорные файлы.

### 5. Telegram-алерт учителю (мягкий)

Если предчек не прошёл — fire-and-forget вызов `notify-copy-attempt` с сообщением вида:
`⚠️ Ученик «Имя» (5 класс) не смог запустить тест: запись экрана недоступна. UA=...`

Это даст учителю сразу понять, что у конкретного ученика проблема с устройством, а не «потерянные ответы» постфактум.

## UX-тексты (RU)

- Кнопка во время проверки: «Проверяем запись экрана…»
- Toast при провале: «Запись экрана не работает на этом устройстве. Обновите страницу, попробуйте другой браузер (Chrome) или подойдите к учителю. Без записи тест начать нельзя.»
- Экран в LiveSessionRunner при `failed`: заголовок «Запись экрана недоступна», кнопка «Повторить проверку».

## Что НЕ делаем

- Не трогаем 6 уже потерянных результатов — данных физически нет.
- Не меняем RLS — всё уже корректно с прошлой сессии.
- Не добавляем глобальный health-check бакета на уровне приложения — проверяем именно при старте теста с реальным `resultId`, потому что только так ловим RLS-проблемы по конкретному пути.

## Файлы

- `src/lib/checkRecordingStorage.ts` (новый)
- `src/pages/Index.tsx` (правка `startTest` + новый стейт)
- `src/components/LiveSessionRunner.tsx` (гейт перед `isActive`)
- `src/hooks/useRrwebRecorder.ts` (убрать внутренний sentinel)
