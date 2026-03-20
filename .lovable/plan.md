

## План: Контрольная по физике для 7 класса (3 четверть)

### Структура теста — 11 вопросов

**Часть 1. Анализ и конструирование (4, Textarea + FileAttach)**:
1. Мраморная колонна — ошибка ученика (вес ≠ масса, давление — не вектор)
2. Банка, вода, бумага — атмосферное давление + почему не работает с трещиной
3. Архимедова сила — почему строго вверх
4. Варёное vs сырое яйцо — закон Паскаля

**Часть 2. Расчётные и графические задачи (7, Textarea + FileAttach)**:
- Базовый: 5. Автомобиль на льду (90 кПа), 6. Гидравлический пресс
- Средний: 7. Кубик на дне аквариума (динамометр 68 Н)
- Нормальный: 8. Атмосферное давление на шприц
- Сложный: 9. Льдина (объём подводной части)
- ⭐ 10. U-образная трубка (вода + масло)

Итого: индексы 0–10, все с Textarea + FileAttach (решение в тетради).

### Файлы

**Создать**: `src/components/tests/Grade7Physics.tsx`
- Props: `answers` (string[11]), `attachments`, `onAnswerChange`, `onAttachmentChange`
- Две карточки: Часть 1 (4 вопроса) и Часть 2 (7 задач с подуровнями)
- Полные тексты задач, `user-select: none`
- Задача 10 помечена «⭐ со звёздочкой»

**Изменить**: `src/pages/Index.tsx`
1. `AVAILABLE_TESTS["7"]` → `["informatics", "technology", "physics"]`
2. Новые state: `answers7phys` (Array(11)), `attachments7phys`
3. Refs + sync effects
4. Autosave restore/persist: ветка `grade === "7" && subject === "physics"`
5. Progress: total=11
6. doSubmit: `g === "7" && s === "physics"` → `type: "grade7physics"`, answers
7. Render: `<Grade7Physics />`
8. Import

**Изменить**: `supabase/functions/send-test-results/index.ts`
- DB save: `body.type === "grade7physics"` → `answersData.answers`
- Telegram formatting: Часть 1 (4 вопроса) + Часть 2 (7 задач) с подписями + 📎

