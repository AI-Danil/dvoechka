# Серверный автосейв для обычного режима

## Зачем
Сейчас в обычном режиме (вне live-сессии) и квиз, и письменные ответы сохраняются **только в `localStorage`**. Если ученик пересядет за другой компьютер, очистит кеш или браузер сам почистит storage — всё пропадёт. В live-режиме письменные ответы уже льются в `test_attempts.draft_answers` через `save-attempt-progress`. Нужно сделать аналог для обычного режима.

## Архитектура

Локальный `localStorage` остаётся как primary (мгновенный, оффлайн). Сервер — как backup и для смены устройства. При входе на тест сравниваем `updated_at` localStorage и сервера, берём новее.

### 1. Новая таблица `student_drafts`

```
id          uuid pk
student_name text not null
grade        text not null
subject      text not null
test_id      text not null         -- наш строковый id ('final-q4', 'python-hero', ...)
attempt      text not null default '1'
written      jsonb not null default '{}'  -- весь объект письменных ответов как сейчас в getDraftKey
quiz         jsonb                         -- { v:1, total, idx, perQuestion, secondsLeft, savedAt }
updated_at   timestamptz not null default now()

unique (student_name, grade, subject, test_id, attempt)
```

RLS:
- SELECT — только teachers/admins (для отладки).
- INSERT/UPDATE/DELETE для клиента закрыты — всё через edge-функции с service role.

### 2. Edge-функции

**`save-draft`** (POST, `verify_jwt = false`):
- Body: `{ student_name, grade, subject, test_id, attempt, written?, quiz? }`.
- Валидация Zod: имя 2 слова (как в остальном коде), grade в whitelist, размер payload < 256 KB.
- Upsert в `student_drafts` по `(student_name, grade, subject, test_id, attempt)`. Обновляются только переданные поля.

**`load-draft`** (POST, `verify_jwt = false`):
- Body: `{ student_name, grade, subject, test_id, attempt }`.
- Возвращает `{ written, quiz, updated_at } | null`.

**`clear-draft`** (POST, `verify_jwt = false`):
- Удаляет запись после успешного сабмита. Параметры те же.

Все три — стандартный CORS-блок, как в `save-attempt-progress`.

### 3. Клиент: `src/pages/Index.tsx`

- После ввода имени и до старта теста: вызвать `load-draft`. Сравнить с `localStorage.getItem(getDraftKey(...))` по `updated_at` (в localStorage добавим обёртку `{ updated_at, data }`). Берём новее, прокидываем в setState и показываем тост «Черновик восстановлен с сервера»/«… с этого устройства».
- Хук `useDebouncedServerSave(written, quiz, 5000)` — после 5с тишины шлёт `save-draft`. Также флашит на `pagehide`/`beforeunload` через `navigator.sendBeacon` (без CORS-преflight).
- При успешном сабмите — `clear-draft` (fire-and-forget) + чистка локальных ключей (как сейчас).
- Аналогично для квизового ключа: новый колбэк `onProgress` от `Quiz` поднимает свежий snapshot наверх, наверху он попадает в тот же дебаунсер.

### 4. Клиент: `src/components/Quiz.tsx`

- Добавить опциональный prop `onProgress?: (state: PersistedQuizState) => void`.
- Вызывать его рядом с каждым `persist()` (на ответ и раз в N секунд — например, дросселировать до 1 раза в 5с, чтобы не дёргать сеть на каждый тик).
- `localStorage` как и сейчас — без изменений.

### 5. UX-нюансы
- Если сервер недоступен — молча игнорируем, локальный сейв работает. Никаких алертов ученику.
- На экране входа в тест, если `load-draft` нашёл черновик с другого устройства, показываем модалку «Найден незавершённый тест от {дата}. Продолжить или начать заново?». Заново → `clear-draft` + сброс localStorage.
- Конфликт «локально новее» → используем локальный, но всё равно шлём его на сервер (выровнять).

## Файлы

- **миграция:** новая таблица `student_drafts` + RLS.
- **новые edge-функции:** `supabase/functions/save-draft/index.ts`, `load-draft/index.ts`, `clear-draft/index.ts`.
- **`src/pages/Index.tsx`:** хук-дебаунсер, вызов `load-draft` на входе, `clear-draft` на сабмите, обёртка `{updated_at,data}` для localStorage, модалка конфликта.
- **`src/components/Quiz.tsx`:** prop `onProgress`, дроссель 5с.
- *(опционально)* `src/components/LiveSessionRunner.tsx` — без изменений, там сервер уже есть.

## Что НЕ делаем
- Не трогаем `test_attempts` (она для live).
- Не делаем realtime — обычный POST с дебаунсом 5с достаточен.
- Не вводим аутентификацию учеников — ключ это (имя + класс + предмет + тест + попытка), как и сейчас в проекте.
