## Цель

Заменить заглушку `7_physics_final-q4-stub` на полноценную итоговую контрольную за 4 четверть по физике, 7 класс («Механическая работа и мощность. Простые механизмы. Энергия»). Структура — 1-в-1 как у 9 класса физики `final-q4-quiz`: квиз (10 вопросов со штрафами) + 6 расчётных задач с возможностью пропуска без штрафа.

## Новые файлы

### `src/components/tests/Grade7PhysicsFinalQ4Quiz.tsx`

Экспорт `FINAL_Q4_PHYS7_QUIZ_QUESTIONS: QuizQuestion[]` — 10 MC-вопросов из присланного материала. Все `kind: "mc"`, `block: 1`, `allowSkip: true`, `seconds: 45`. `correct` — индексы по ключам:

1. → 3 (г) «Подъемный кран»
2. → 1 (б) Мощность
3. → 2 (в) Джоули
4. → 2 (в) Подвижный блок
5. → 1 (б) В 3 раза короче
6. → 3 (г) Работе
7. → 0 (а) Трение и вес деталей
8. → 2 (в) Масса и высота
9. → 1 (б) В 4 раза
10. → 0 (а) Потенциальная → кинетическая

### `src/components/tests/Grade7PhysicsFinalQ4Written.tsx`

Полная копия структуры `Grade9PhysicsFinalQ4Written` (тот же `PhysQ4Answer` через re-export или локальный тип-алиас). Массив `PHYS7_FINAL_Q4_TASKS` из 6 задач (Кран 300 кДж, Вентилятор 60 Вт, Рычаг 15 см, Мяч 45 Дж, Наклонная плоскость 75 %, ЗСЭ 300 Дж) с полями `title`, `text`, `expected`, `gradingHint` для AI-грейдинга.

## Изменения в `src/pages/Index.tsx`

1. **Импорты** (после строки 56): добавить `Grade7PhysicsFinalQ4Quiz` и `Grade7PhysicsFinalQ4Written` (плюс `FINAL_Q4_PHYS7_QUIZ_QUESTIONS`).
2. **`TESTS_CATALOG["7"].physics`** (стр. 109–112): убрать `final-q4-stub`, добавить `{ id: "final-q4-quiz", title: "🌟 Итоговая годовая контрольная за 4 четверть. Работа, мощность, энергия (квиз + 6 задач, штрафная шкала)" }` первым.
3. **`TESTS_WITH_QUIZ`** (стр. 146–160): добавить `"7_physics_final-q4-quiz": { questions: FINAL_Q4_PHYS7_QUIZ_QUESTIONS, secondsPerQuestion: 45 }`.
4. **State** (рядом со стр. 282): новый `answers7physFinalQ4: PhysQ4Answer[]` (длина 6) + ref.
5. **Все блоки, где упомянут `9_physics_final-q4-quiz` / `answers9physFinalQ4`** (нашёл по `rg`: строки ~475, 592, 666, 910, 1295, 1417, 2178) — продублировать параллельные ветки для `grade === "7" && testId === "final-q4-quiz"` с `answers7physFinalQ4`. То же для localStorage-черновика, серверного `save-draft` / `load-draft` (ключ в JSON: `answers7physFinalQ4`), сабмита (`send-test-results` payload — массив текстов задач + флаги skipped), и финального рендера компонента.
6. **Рендер списка тестов** (стр. 1720): удалить ветку `t.id === "final-q4-stub"` — больше не нужна.
7. **Условие, какие тесты считаются «со штрафами»** (стр. 1295) — добавить `(_g === "7" && _s === "physics" && _t === "final-q4-quiz")`.
8. **Рендер части 2 (стр. 2110)**: `grade === "7" && subject === "physics" && testId !== "work-power"` сейчас рендерит `Grade7Physics` по умолчанию — заменить на проверку `testId === "final-q4-quiz"` → новый компонент, иначе старая логика. Аналогично подгонять стр. 2095 (`work-power`).

## Что не трогаем

- DB-тесты, сохранение видео, зеркала GitHub/GitLab — без изменений.
- Quiz.tsx и общая логика штрафной системы — уже поддерживает (используется 9 классом).
- Никаких изменений в БД.

## Технические детали

```text
Index.tsx касания (по блокам):
  imports               +2 строки
  TESTS_CATALOG         -1 / +1 запись (7 physics)
  TESTS_WITH_QUIZ       +1 запись
  state + ref           +2 хука
  localStorage save     +1 ветка (≈ стр. 475)
  localStorage load     +1 ветка (≈ стр. 592)
  server save-draft     +1 ветка (≈ стр. 666)
  server load-draft     +1 ветка (≈ стр. 910)
  penalty-tests flag    +1 проверка (≈ стр. 1295)
  send-test-results     +1 ветка (≈ стр. 1417)
  список карточек       -1 ветка stub (стр. 1720)
  рендер части 2        условие на testId (стр. 2095 / 2110)
```

Поля payload для отправки повторяют формат 9 класса (`answers9physFinalQ4`): массив `{ text, skipped }`. Для Telegram-отчёта используется существующий обработчик — переменное имя поля можно оставить общим `answersPhysFinalQ4` если так удобнее, но проще зеркалить.

## Файлы

- `src/components/tests/Grade7PhysicsFinalQ4Quiz.tsx` (новый)
- `src/components/tests/Grade7PhysicsFinalQ4Written.tsx` (новый)
- `src/pages/Index.tsx` (правки в ~10 местах)
- `.lovable/plan.md` — короткая заметка
