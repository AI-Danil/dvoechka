## Что делаем

Новый тест **«Информатика 7 класс. Итоговая Q4 (квиз, 45 вопросов)»** — 30 MC + 15 текстовых полей с проверкой нейросетью. Существующий «Технология 7 класс Q4» **не трогаем**.

## Решения по развилкам

1. **Старый Grade7TechnologyFinalQ4 не меняю** — добавляю отдельный новый тип `grade7informaticsFinalQ4Quiz`, отдельный пункт в меню. Старые сабмиты остаются валидными.
2. **AI-проверка блока 3+4 — батчем при сабмите** (1 запрос к Lovable AI Gateway со всеми текстовыми ответами): быстрее, дешевле, не блокирует ученика. Если AI упал — сохраняем «неоценено», балл = 0, в админке через существующий `ai-grade-written` можно перепроверить руками.
3. **Текстовое поле — внутри Quiz.tsx** через расширение типа `QuizQuestion` (новый kind `"text"`), без отдельной обёртки. Автосохранение/таймер/восстановление работают для обоих типов автоматически.

## Гарантии (проверено в коде сейчас)

| Что | Где | Статус |
|-----|-----|--------|
| Автосохранение ответов в localStorage на каждый ответ/тик | `Quiz.tsx` строки 149–207, `persist()` | ✓ работает |
| Flush на `pagehide`/`visibilitychange`/`beforeunload` | `Quiz.tsx` строка 200–207 | ✓ работает |
| Восстановление прогресса при перезагрузке | `Quiz.tsx` строка 75–101 | ✓ работает |
| Серверный черновик в `student_drafts.quiz` | `save-draft` edge function | ✓ работает |
| Запись экрана rrweb → bucket `rrweb-sessions` | `src/hooks/useRrwebRecorder.ts` | ✓ работает |
| Зеркало GitHub → GitLab | `.github/workflows/mirror-to-gitlab.yml` | ✓ настроено |
| GitLab CI | `.gitlab-ci.yml` | ✓ настроено |
| GitHub Pages deploy | `.github/workflows/deploy-pages.yml` | ✓ настроено |
| Telegram отчёт | `send-test-results` через connector-gateway | ✓ работает |

Новый квиз идёт по тем же путям — отдельной работы по «починить зеркала / автосейв» делать не надо, только убедиться что новый тип в whitelists.

## Структура квиза

| Блок | Вопросы | Тип | Время |
|------|---------|-----|-------|
| 1. База | 1–10 | 8 MC + 2 текст | 30 сек |
| 2. Сложные | 11–20 | 7 MC + 3 текст | 60–90 сек |
| 3. Открытые | 21–35 | 15 текст (AI) | 45–120 сек |
| 4. Задачи | 36–45 | 1 MC + 9 текст (AI) | 45–120 сек |

Итого 45 вопросов, ~36 минут — укладывается в 40-минутный урок.

## Что меняем в коде

### 1. `src/components/Quiz.tsx` — расширение модели вопроса
```ts
export type QuizQuestion =
  | { kind?: "mc"; q: string; options: [string,string,string,string]; correct: number; seconds?: number; block?: number }
  | { kind: "text"; q: string; expected: string; gradingHint?: string; seconds?: number; block?: number };
```
- Для `kind: "text"` рендерим `<Textarea>` вместо четырёх кнопок.
- Кнопка «Ответить» становится активной при непустом тексте; по таймауту — пустой ответ.
- В `QuizResults.answers` для текстовых вопросов вместо `number` пишем `string` (тип расширяем до `(number | string)[]`).
- **Автосейв и persist работают без изменений** — текстовое значение тоже сериализуется.

### 2. Новый файл `src/components/tests/Grade7InformaticsFinalQ4Quiz.tsx`
Только экспорт `FINAL_Q4_INF7_QUIZ_QUESTIONS: QuizQuestion[]` со всеми 45 вопросами из твоего сообщения. Никакого UI — рендерится через существующий `<Quiz>`.

### 3. `src/pages/Index.tsx`
- Импорт нового списка.
- В `TEST_DEFS` добавить запись `"7_informatics_final-q4_quiz"` с `secondsPerQuestion: 60`.
- Добавить пункт в меню 7 класса: «Информатика — Итоговая Q4 (квиз, 45 вопросов)».
- При сабмите тип = `grade7informaticsFinalQ4Quiz`, в `answers` кладём плоский массив `[{ position, kind, q, given, expected?, correctIdx? }]` — удобно и для админки, и для AI.

### 4. Новая edge-функция `supabase/functions/grade-quiz-text-batch/index.ts`
Вход:
```json
{ "items": [{ "position": 4, "question": "...", "expected": "Слайд", "given": "слаид", "hint": "..." }] }
```
Выход:
```json
{ "results": [{ "position": 4, "correct": true, "partial": false, "score": 1.0, "reason": "опечатка, по смыслу совпадает" }] }
```
- Lovable AI Gateway, `google/gemini-3-flash-preview`, structured output через **tool calling** (надёжнее JSON-mode).
- Системный промпт: «Ты учитель информатики 7 класса. Засчитывай ответы по смыслу, игнорируй опечатки/синонимы/перестановку слов/регистр. partial=true если идея верна, но не полна. Будь снисходителен к формулировкам».
- CORS, обработка 429/402, валидация zod, лог ошибок.

### 5. `supabase/functions/send-test-results/index.ts`
- Добавить `grade7informaticsFinalQ4Quiz` в whitelist на сохранение `answers` (без этого ответы не запишутся в БД — баг, который мы уже видели на 5 классе).
- Перед формированием Telegram-отчёта: если тип = новый квиз → внутренний fetch к `grade-quiz-text-batch` для всех `kind: "text"`. Обогатить `answers` полями `aiCorrect`, `aiScore`, `aiReason`.
- Посчитать итоговый балл (MC: correct?1:0, text: `score`).
- Записать в `test_results.ai_grading` и `test_results.ai_total_score`.
- В Telegram-отчёт добавить разбивку: блок1 X/10, блок2 Y/10, блок3 Z/15, блок4 W/10, итого N/45 (M%). Перечислить вопросы блока 3+4 со статусом ✓/✗ и кратким AI-комментом.

### 6. `src/components/LegacyAnswerView.tsx` — админка
Добавить ветку для `grade7informaticsFinalQ4Quiz`: отрисовать каждый вопрос блоками, для текстовых — показать «Ответ ученика», «Эталон», AI-вердикт (✓/✗ + reason). Кнопка «Перепроверить AI» (вызов существующего `ai-grade-written`) остаётся.

## Чего НЕ делаем

- Не показываем ученику «верно/неверно» по ходу квиза (это контрольная, не тренажёр).
- Не делаем live-вызов AI после каждого текстового ответа (15 запросов × 30 учеников = риск 429).
- Не создаём новых таблиц БД — используем `test_results.ai_grading` (jsonb).
- Не трогаем существующий «Технология 7 класс Q4».
- Не правим mirror-to-gitlab / .gitlab-ci / deploy-pages — они уже работают, новый код пойдёт через них автоматически.

## Файлы

**Новые:**
- `src/components/tests/Grade7InformaticsFinalQ4Quiz.tsx`
- `supabase/functions/grade-quiz-text-batch/index.ts`

**Меняем:**
- `src/components/Quiz.tsx` — поддержка `kind: "text"`
- `src/pages/Index.tsx` — пункт меню + рендер + сабмит
- `supabase/functions/send-test-results/index.ts` — whitelist + вызов AI-батча + расширенный TG-отчёт
- `src/components/LegacyAnswerView.tsx` — рендер нового формата
