

## Проблема

Ошибка в edge-функции `send-test-results`: `TypeError: Cannot read properties of undefined (reading 'forEach')` на строке 202.

**Причина**: тип `grade9physics` не обрабатывается в ветке форматирования сообщения. Код проваливается в `else`-блок (строка 210), который ожидает `body.blitz` и `body.tasks` — но физика отправляет `body.answers`. Вызов `blitz.forEach()` падает, т.к. `blitz` = `undefined`.

Данные при этом **сохраняются в БД успешно** (лог: "Results saved to DB successfully"), но сообщение в Telegram не уходит.

## Исправление

В `supabase/functions/send-test-results/index.ts` добавить ветку `else if (body.type === "grade9physics")` перед `else`-блоком (перед строкой 210).

Ветка должна:
- Извлечь `body.answers` как `string[]` (14 элементов)
- Сформатировать в 3 секции:
  - Теория (1-7): Законы Ньютона, ЗСЭ, моменты, волны, звук, преломление, ЭМ-волна
  - Расчёты (8-13): кинематика, статика, импульс, ЗСЭ, звук, линзы
  - Качественная задача (14): преломление/ложка
- Для задач 8-14 показывать 📎 если есть вложение

### Файл
- **Изменить**: `supabase/functions/send-test-results/index.ts` — добавить ~30 строк `else if` блока

