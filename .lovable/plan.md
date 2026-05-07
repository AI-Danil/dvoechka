## Что чиним

В просмотре результата квиза вместо текста вопросов рисуется `[вопрос недоступен]`. Причина — в реестре `src/lib/quizRegistry.ts` не зарегистрированы два теста, по которым уже сданы работы:

- `grade6technologyFinalQ4` (15 работ в БД, в т.ч. «Ваня Шарло»)
- `grade7technologyFinalQ4` (15 работ в БД)

Сами `*_QUIZ_QUESTIONS` экспорты в коде есть (`Grade6TechnologyFinalQ4.tsx`, `Grade7TechnologyFinalQ4.tsx`), но не подключены к реестру → `getQuizQuestionsForTestType()` возвращает `null` → фронт показывает фолбэк.

## Правки

### 1. `src/lib/quizRegistry.ts`
Добавить два импорта и две записи в `REGISTRY`:
```ts
import { FINAL_Q4_TECH6_QUIZ_QUESTIONS } from "@/components/tests/Grade6TechnologyFinalQ4";
import { FINAL_Q4_TECH7_QUIZ_QUESTIONS } from "@/components/tests/Grade7TechnologyFinalQ4";

const REGISTRY = {
  ...,
  grade6technologyFinalQ4: FINAL_Q4_TECH6_QUIZ_QUESTIONS,
  grade7technologyFinalQ4: FINAL_Q4_TECH7_QUIZ_QUESTIONS,
};
```

После этого все 30 уже сохранённых работ начнут корректно отображать тексты вопросов и варианты — данные в БД не трогаем.

### 2. `src/lib/quizRegistry.test.ts` (новый)
Маленький unit-тест-страховка от повторения: пройтись по списку известных хардкод `test_type` и убедиться, что для каждого реестр возвращает массив длиной ≥ 1. Если кто-то снова добавит тест и забудет реестр — упадёт CI, а не прод.

## Затронутые файлы
- `src/lib/quizRegistry.ts` — правка
- `src/lib/quizRegistry.test.ts` — новый
