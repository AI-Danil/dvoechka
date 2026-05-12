## Что нашёл

Нашёл причину. В логах `send-test-results`:

```
Rejected: empty answersData for type grade9technologyFinalQ4 — full body keys:
[ studentName, grade, subject, attempt, testId, testTitle, resultId,
  type, answers, quizResults, attachments, cheatLog, timeSpent ]
```

В `supabase/functions/send-test-results/index.ts` есть whitelist типов тестов, для которых функция собирает `answersData = { answers, quizResults }`. В этом списке есть:
- `grade9physicsAtom`, `grade7physicsWork`, `grade8informaticsPython`
- `grade8physicsFinalQ4`, `grade6technologyFinalQ4`, `grade7technologyFinalQ4`, `grade8technologyFinalQ4Theory`
- `grade5technologyFinalQ4V2`

Но НЕТ:
- `grade9technologyFinalQ4` ← это сдавали оба Дмитрия (9 кл технология итоговая Q4)
- `grade5technologyFinalQ4V3` ← новый вариант 5 класса, сейчас тоже сабмитится из `Index.tsx:1347`

Когда тип не попадает ни в одну ветку, `answersData` остаётся `{ type }`, срабатывает guard "empty answersData" и функция возвращает `400`. Ответы НЕ сохраняются в БД, в `test_results` ничего не появляется. У клиента при этом ничего не "переотправляется" — он показывает ошибку, но сам Дмитрий мог её не заметить (или закрыть вкладку), а черновик в `student_drafts` остался последним сохранённым (у Малинина — на 13/15 квиза). Второго Дмитрия в `student_drafts` за последние 6 часов нет вообще — значит он или решал с другого устройства/имени, или вкладка закрылась без save-draft. В любом случае корень — отказ функции.

## Что чиню

Один файл — `supabase/functions/send-test-results/index.ts`.

Добавляю `grade9technologyFinalQ4` и `grade5technologyFinalQ4V3` в ту же ветку, где уже лежат остальные `*FinalQ4*` тесты (`answersData.answers = body.answers; answersData.quizResults = body.quizResults;`).

```ts
} else if (
  body.type === "grade9physicsAtom" ||
  body.type === "grade7physicsWork" ||
  body.type === "grade8informaticsPython" ||
  body.type === "grade8physicsFinalQ4" ||
  body.type === "grade6technologyFinalQ4" ||
  body.type === "grade7technologyFinalQ4" ||
  body.type === "grade8technologyFinalQ4Theory" ||
  body.type === "grade5technologyFinalQ4V2" ||
  body.type === "grade5technologyFinalQ4V3" ||   // +
  body.type === "grade9technologyFinalQ4"        // +
) {
  answersData.answers = body.answers;
  answersData.quizResults = body.quizResults;
}
```

После деплоя (автоматический) новые сабмиты будут проходить и записываться в `test_results`.

## Что НЕ делаю

- Не "промочу" черновик Малинина в `test_results` автоматически — это отдельное действие, могу сделать после фикса по отдельной просьбе (есть `quiz.perQuestion` на 13/15 + 3 письменных).
- Не трогаю `start-attempt`, `grade-quiz-submission`, БД-схему — это легаси-флоу хардкод-тестов через `send-test-results`, его и фикшу.
- Не меняю UI.

## Файлы

- edit: `supabase/functions/send-test-results/index.ts`

## После фикса

Скажи — могу:
1. Вытащить черновик Малинина Дмитрия из `student_drafts` и руками положить в `test_results` (в "Результатах" появится как полноценный сабмит).
2. Попросить второго Дмитрия пересдать (сейчас у него нет ни драфта, ни сабмита — данных просто нет).
