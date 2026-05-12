## Проблема

Ответы Якаевой Даны (и всех учеников по «статическим» тестам — grade5/6/7/8 technology, grade7/8/9 informatics, физика и т.д.) **сохранены в БД корректно**. Запись `b3cbfb82-baf7-4c38-87be-a4b2c62337eb` содержит полные `theory[7]` и `practice[6]`.

Не работает только UI. В `src/components/TestResultsList.tsx` (строки 138–147) диалог детализации читает ответы исключительно из `detail.answers.breakdown[]`. Этот формат генерируется только для тестов из БД (`test_type = "db:<uuid>"`). У легаси-тестов в `answers` лежит:

- `{ type, theory: string[], practice: string[] }` — Grade7Informatics, и тип
- `{ type, answers: number[], quizResults: {...} }` — Grade5/6/8 Technology Q4 (квиз+развёрнутый смешанно)
- свои варианты у Grade8/9 Physics, Grade8 Informatics Python и пр.

Поэтому `quizItems`/`writtenItems` пустые → в диалоге пусто → выглядит «ответы не сохранились».

## Решение

Добавить в `TestResultsList.tsx` единый легаси-рендерер, который вызывается, когда `breakdown` отсутствует. Вопросы для большинства тестов уже захардкожены в компонентах `src/components/tests/Grade*.tsx` — оттуда возьмём тексты.

### Шаги

1. **Новый модуль `src/lib/legacyAnswerRenderer.ts`**
   - Экспортирует `getLegacyView(testType: string, answers: any): { quiz?: {q,user,correct?}[], written?: {q,user}[] } | null`.
   - Внутри — карта `testType → { theoryQuestions, practiceQuestions, quizQuestions? }`. Тексты копируем из соответствующих файлов `src/components/tests/*` (это короткие массивы строк, без логики).
   - Поддержать форматы:
     - `theory + practice` (grade7 informatics, grade7 technology, …);
     - `answers (number[]) + quizResults + written` (Grade5/6 technology Q4, Grade8 technology Q4 theory, Grade9 technology Q4 final);
     - падение в `null` для неизвестного типа → диалог покажет «формат не распознан, см. сырой JSON ниже».

2. **Правка `TestResultsList.tsx` (строки 138–147 и блоки рендера 341–490)**
   - Если `breakdown` пустой и `getLegacyView()` вернул данные — рендерим их в тех же двух секциях («Квиз», «Развёрнутые ответы»).
   - Если `getLegacyView()` вернул `null` — показываем `<details><summary>Сырой JSON</summary><pre>...</pre></details>` как fallback (чтобы учитель в крайнем случае мог прочитать).

3. **Не трогаем** ничего в логике сабмита/сохранения, ИИ-оценивания и автосейва — там всё ок, данные на месте.

### Что НЕ делаем

- Не переписываем легаси-тесты под формат `breakdown` — это слишком большой объём, рискуем сломать уже накопленные результаты.
- Не меняем БД и edge-функции.
- ИИ-оценивание развёрнутых частей по легаси-формату пока оставляем как есть (там нужен отдельный маппинг ключей; делаем по запросу отдельной задачей).

## Технические детали

- Карта вопросов держится в одном файле `legacyAnswerRenderer.ts`, на каждый `testType` ~10–15 строк. Это разово, потом не трогаем.
- Тип `LegacyView` совместим с уже существующими TSX-блоками — можно переиспользовать те же `<Table>`/`<pre>` без дублирования.
- Подтверждение, что fix сработает: открыть диалог по записи Якаевой Даны → должны увидеть 7 теоретических + 6 практических ответов.

Подтверди — реализую.
