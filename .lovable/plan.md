

## Две проблемы и их решение

### 1. Файлы не загружаются — кириллица в пути

Ошибка `Invalid key: Тест_9_9/1773607531850_0.jpg` — Supabase Storage **не поддерживает кириллицу** в ключах файлов. Имя ученика используется в пути: `${studentName}_${grade}/...`.

**Исправление в `Index.tsx`**: транслитерировать имя или использовать только латиницу/цифры в пути. Простое решение — заменить кириллицу на `student` + timestamp:

```
const safeName = `student_${Date.now()}`;
const path = `${safeName}_${grade}/${timestamp}_${key}.${ext}`;
```

### 2. Обновление теста 9 класса

Полная переработка `Grade9Informatics.tsx`:
- **Блок 1**: 7 теоретических вопросов (1.1–1.7) — только Textarea, **без FileAttach**
- **Блок 2**: 2 вопроса (2.1, 2.2) — Textarea + FileAttach
- **Блок 3**: 1 вопрос (3.1) — Textarea + FileAttach  
- **Блок 4**: 1 вопрос (4.1) — Textarea + FileAttach
- Итого 11 вопросов, `answers9` = `Array(11)`

Обновить `Index.tsx`: `answers9` с 6 до 11 элементов.

Обновить Edge Function: labels для 11 вопросов вместо 6.

### Файлы
- **Изменить**: `src/components/tests/Grade9Informatics.tsx` (полная переработка)
- **Изменить**: `src/pages/Index.tsx` (fix пути загрузки + answers9 размер)
- **Изменить**: `supabase/functions/send-test-results/index.ts` (labels для grade9)

