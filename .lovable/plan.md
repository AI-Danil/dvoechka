

## Улучшение античит-мониторинга: отслеживание скриншотов

### Что сейчас
Текущий `onKeyUp` ловит только `PrintScreen` и `Meta` по отдельности. Комбинации вроде `Win+Shift+S` (Windows Snipping Tool) не отслеживаются.

### Что нужно сделать

Заменить обработчик `onKeyUp` на `onKeyDown`, который отслеживает:

1. **PrintScreen** — прямой скриншот
2. **Win+Shift+S** (`e.metaKey && e.shiftKey && e.key === "s"`) — Windows Snipping Tool
3. **Ctrl+Shift+S** (`e.ctrlKey && e.shiftKey && e.key === "s"`) — альтернативная комбинация на некоторых системах
4. **Cmd+Shift+3 / Cmd+Shift+4** (macOS) — `e.metaKey && e.shiftKey && (e.key === "3" || e.key === "4")`
5. **Meta (Win/Cmd)** — одиночное нажатие (оставить как есть)

### Техническое замечание
- `keydown` надёжнее `keyup` для перехвата комбинаций, т.к. некоторые комбинации (PrintScreen) не всегда генерируют `keyup`
- Все события уже попадают в `cheatLog` и отправляются в Telegram при завершении теста — никаких изменений в Edge Function не нужно

### Изменения
- **`src/pages/Index.tsx`** — заменить обработчик `onKeyUp` на `onKeyDown` с расширенной логикой распознавания комбинаций скриншотов

