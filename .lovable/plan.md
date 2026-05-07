## Цель
Добавить итоговую теоретическую контрольную за 4 четверть «Основы Python и Логика ветвлений» как работу по **Технологии 8 класса**. Сделать её единственной активной (неоновая подсветка), остальные работы 8 класса (по другим предметам не трогаем — речь именно про меню «Технология 8»).

## Что меняем

### 1. Открываем «Технологию» для 8 класса
**`src/pages/Index.tsx`**, `AVAILABLE_TESTS`:
```ts
"8": ["informatics", "physics", "technology"],
```

### 2. Каталог
В `TESTS_CATALOG["8"]` добавить блок `technology` с одной работой:
```ts
technology: [
  { id: "final-q4-theory", title: "🌟 Итоговая контрольная за 4 четверть. Теория: Python и логика ветвлений" },
],
```
Поскольку другие работы по технологии 8 класса в каталоге не существуют — «затемнять» нечего, в меню будет одна неоновая кнопка. Учительские (db) тесты для `8/technology` тоже скрываем (как для 5 класса) — добавим ранний `return` в эффекте загрузки `dbTests`, чтобы наверняка показывалась только наша работа:
```ts
if (grade === "8" && subject === "technology") { setDbTests([]); return; }
```

### 3. Новый компонент
**`src/components/tests/Grade8TechnologyFinalQ4Theory.tsx`** (по образцу `Grade5TechnologyFinalQ4V2.tsx`):
- Экспорт `FINAL_Q4_TECH8_THEORY_QUIZ_QUESTIONS: QuizQuestion[]` — 15 вопросов из вашего материала, по 60 сек, ключи: 1-Б, 2-В, 3-Б, 4-Б, 5-Б, 6-Г, 7-В, 8-Б, 9-В, 10-Б, 11-В, 12-Б, 13-В, 14-А, 15-Б.
- Письменная часть: 6 развёрнутых вопросов (Часть 2) с подробной формулировкой и `<Textarea>` + опциональный `FileAttach` для каждого.
- Props: `answers: string[]` (длина 6), `attachments`, колбэки, `studentName`. Без paste-блокировки (это теория).

### 4. Подключение в `src/pages/Index.tsx`
- Импорт компонента и `FINAL_Q4_TECH8_THEORY_QUIZ_QUESTIONS`.
- В `TESTS_WITH_QUIZ` добавить `"8_technology_final-q4-theory"` (60 сек/вопрос).
- Стейт `answers8techFinalQ4Theory` (массив длины 6) и `attachments8techFinalQ4Theory`.
- Подключить везде, где обрабатывается `answers8physFinalQ4` (по найденным строкам ~380, 482, 546, 584, 736, 776): автосейв, восстановление черновика, handleSubmit, deps массивы. `test_type` для submit: `grade8technologyFinalQ4Theory`.
- В блоке рендера добавить новую ветку:
```tsx
{grade === "8" && subject === "technology" && testId === "final-q4-theory" && (
  <Grade8TechnologyFinalQ4Theory ... />
)}
```

### 5. Подсветка «неоном» (актуальная работа)
В блоке test-pick (~стр. 1440) расширить `featuredId`:
```ts
const featuredId =
  grade === "7" && subject === "technology" ? "final-q4" :
  grade === "8" && subject === "technology" ? "final-q4-theory" :
  null;
```
Существующая логика уже даёт ring + shadow + scale на featured и `opacity-50 grayscale` на остальных. Усилю «неон» только для featured-кнопки (без новых keyframes):
```
shadow-[0_0_24px_hsl(var(--primary)/0.55)]
```
— добавлю это в className рядом с текущими `ring-2 ring-primary shadow-lg`.

### 6. `src/lib/quizRegistry.ts`
Добавить:
```ts
import { FINAL_Q4_TECH8_THEORY_QUIZ_QUESTIONS } from "@/components/tests/Grade8TechnologyFinalQ4Theory";
// ...
grade8technologyFinalQ4Theory: FINAL_Q4_TECH8_THEORY_QUIZ_QUESTIONS,
```

### 7. Память
Обновить `mem://content/available-tests` — добавить запись о новой работе по технологии 8 класса.

## Что НЕ трогаем
- БД, edge-функции, RLS.
- Другие классы (5/6/7/9) и другие предметы 8 класса.
- Информатику и физику 8 класса (их кнопки в меню «Информатика»/«Физика» остаются как есть).

## Затронутые файлы
- создаём: `src/components/tests/Grade8TechnologyFinalQ4Theory.tsx`
- редактируем: `src/pages/Index.tsx`, `src/lib/quizRegistry.ts`
- память: `mem://content/available-tests`
