

## План: Тест по технологии для 7 класса + защита от копирования

### 1. Новый компонент `src/components/tests/Grade7Technology.tsx`

По паттерну `Grade7Informatics.tsx`:
- **Блок 1 (7 теоретических, Input)**: ОС, Enter, ОЗУ, IP, разделитель папок, редактирование, бит
- **Блок 2 (6 задач, Textarea + FileAttach)**: объем статьи КОИ-8, палитра 128x128, скорость скачивания, файловая система, маска файлов, Ctrl+X/Ctrl+V

Props идентичны Grade7Informatics: `theory`, `practice`, `attachments`, callbacks.

### 2. Обновить `src/pages/Index.tsx`

- `AVAILABLE_TESTS["7"]` → `["informatics", "technology"]`
- Новые state: `theory7tech` (Array(7)), `practice7tech` (Array(6)), `attachments7tech`
- Refs + sync effects по существующему паттерну
- Autosave restore/persist: ветка `grade === "7" && subject === "technology"`
- Progress: ветка для 7+technology, total=13
- doSubmit: `g === "7" && s === "technology"` → `type: "grade7technology"`, theory + practice
- Render: `grade === "7" && subject === "technology"` → `<Grade7Technology />`
- Существующий `grade === "7"` рендер уточнить до `grade === "7" && subject === "informatics"`

### 3. Edge-функция `supabase/functions/send-test-results/index.ts`

- В блоке сохранения в БД: добавить `body.type === "grade7technology"` → `answersData.theory + practice`
- Новая ветка форматирования `else if (body.type === "grade7technology")`:
  - Теория (1-7): подписи вопросов
  - Задачи (8-13): подписи + `📎` для вложений

### 4. Защита от копирования текста вопросов + уведомление в Telegram

- В компонентах тестов: CSS `user-select: none` на текст вопросов (Label, p)
- В `Index.tsx` (античит-секция): добавить обработчики:
  - `copy`, `cut` → `e.preventDefault()` + лог + toast предупреждение + вызов edge-функции
  - `contextmenu` → `e.preventDefault()`
  - `keydown`: блокировать Ctrl+C, Ctrl+A, Ctrl+U, Ctrl+S
  - `selectstart` → `e.preventDefault()` на контейнере вопросов
- Новая edge-функция `supabase/functions/notify-copy-attempt/index.ts`:
  - Принимает `studentName`, `grade`, `subject`, `event`
  - Мгновенно отправляет в Telegram: "🚨 ПОПЫТКА КОПИРОВАНИЯ — [ФИО], [класс], [предмет], [событие], [время]"
  - Использует тот же Telegram connector

### Файлы

| Действие | Файл |
|----------|------|
| Создать | `src/components/tests/Grade7Technology.tsx` |
| Создать | `supabase/functions/notify-copy-attempt/index.ts` |
| Изменить | `src/pages/Index.tsx` (state, refs, autosave, progress, submit, render, антикопирование) |
| Изменить | `supabase/functions/send-test-results/index.ts` (grade7technology ветка) |

