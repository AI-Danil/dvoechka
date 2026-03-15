

## Диагностика и исправление загрузки файлов

### Проблема
Функция `uploadAttachments` в `Index.tsx` **молча проглатывает ошибки** загрузки — если `supabase.storage.upload()` возвращает ошибку, файл просто пропускается без логирования. В результате `fileUrls` приходит пустым в Edge Function, и ни 📎 пометок, ни файлов в Telegram нет.

Вероятные причины ошибки загрузки:
- Отсутствие `contentType` при загрузке (Supabase может отклонить файл)
- Конфликт имён файлов (повторная загрузка без `upsert`)

### Исправления

**1. `src/pages/Index.tsx` — функция `uploadAttachments`:**
- Добавить `contentType: file.type` в параметры загрузки
- Добавить `upsert: true` для перезаписи при конфликтах
- Добавить `console.error` при ошибках загрузки, чтобы видеть проблему в консоли
- Показывать toast пользователю если загрузка файла не удалась

**2. `supabase/functions/send-test-results/index.ts`:**
- Добавить логирование `attachmentMap` для отладки
- Добавить `console.log` для каждой попытки отправки файла в Telegram

### Файлы
- `src/pages/Index.tsx` — исправить `uploadAttachments`
- `supabase/functions/send-test-results/index.ts` — добавить отладочные логи

