

## Проблема: авто-отправка отправляет пустые ответы

Таймер создаётся в `useEffect` с зависимостью `[screen]` — один раз при старте теста. Внутри `setInterval` вызывается `handleSubmit`, но это замыкание захватывает начальные значения всех state-переменных (blitz8, tasks8, answers9 и т.д. — все пустые). Когда время истекает и вызывается `handleSubmit`, он отправляет пустые массивы.

## Решение

Использовать `useRef` для хранения актуальной ссылки на `handleSubmit`, чтобы таймер всегда вызывал свежую версию функции.

### Изменения в `src/pages/Index.tsx`:

1. **Добавить ref для handleSubmit:**
   ```typescript
   const handleSubmitRef = useRef<() => Promise<void>>();
   ```

2. **Синхронизировать ref с актуальной функцией:**
   ```typescript
   handleSubmitRef.current = handleSubmit;
   ```
   (после объявления `handleSubmit`)

3. **В таймере вызывать через ref:**
   ```typescript
   if (prev <= 1) {
     clearInterval(timerRef.current!);
     handleSubmitRef.current?.();
     return 0;
   }
   ```

### Файлы
- `src/pages/Index.tsx`

