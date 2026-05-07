## Что произошло

Вчерашняя миграция `20260506123947_..._security hardening` дропнула политики:
- `Anon can update rrweb sessions`
- `Anon can read rrweb sessions`
- `Anyone can read test attachments` / `Public read test-attachments`

Осталась только INSERT-политика. Но загрузка чанков rrweb идёт с флагом `upsert: true` (см. `useRrwebRecorder.ts`). Supabase Storage при upsert выполняет `INSERT ... ON CONFLICT DO UPDATE`, и Postgres требует **и INSERT, и UPDATE** прав по RLS — даже если объект новый.

В итоге **все** чанки (включая sentinel) получают `403 new row violates row-level security policy`. В бакете `rrweb-sessions` для resultId `b77f2a14-...` (свежая работа) — 0 файлов. Записи реально нет. Файлы вложений (`test-attachments`) тоже грузятся с `upsert: true` через `FileAttach.tsx` — это сломалось аналогично.

Файлы прикреплённые в дашборде «пропали» по той же причине: бакет публичный, но мы удалили политику публичного чтения. Прямые `getPublicUrl` ссылки на объекты, которые отдаются эндпоинтом `/object/public/...`, должны работать без RLS — но если фронт где-то делает list/signed запросы, они тоже падают. Главное: новые загрузки вообще не сохраняются.

## План

Новая миграция, которая возвращает работоспособные политики (без отката security-улучшений по `has_role` и пр.):

```sql
-- rrweb-sessions: разрешить upsert (INSERT + UPDATE) с anon, чтение остаётся через service_role + signed URL
CREATE POLICY "Anon can upsert rrweb sessions (update)"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'rrweb-sessions')
WITH CHECK (bucket_id = 'rrweb-sessions');

-- test-attachments: бакет публичный, но восстановим явные политики на read + update для upsert
CREATE POLICY "Public read test-attachments"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'test-attachments');

CREATE POLICY "Anon can update test-attachments"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'test-attachments')
WITH CHECK (bucket_id = 'test-attachments');
```

## Что это починит

1. Загрузка rrweb-чанков снова заработает → у новых работ появятся записи экрана.
2. Прикрепляемые ученикам файлы снова будут сохраняться в `test-attachments` и отображаться в дашборде учителя.
3. Старые работы без записи (до сегодняшнего бага) останутся без записи — восстановить уже нельзя, чанки не были загружены.

## Файлы

- Новая миграция в `supabase/migrations/`.
- Код менять не нужно: `useRrwebRecorder.ts` и `FileAttach.tsx` остаются как есть.

## Что сделать ученикам сейчас

Если у двух сегодняшних работ rrweb не сохранился — записи восстановить нельзя (чанки никогда не доехали до бакета). Сами ответы и баллы в `test_results` целы, виден только сам результат без видео. После применения миграции у всех следующих работ запись будет писаться нормально.