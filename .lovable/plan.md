
Проверяю: storage чанки, БД replay_url, edge function logs.

План:
1. SQL: новые `test_results` за последние 30 минут — есть ли записи с `replay_url IS NOT NULL`.
2. SQL: `storage.objects` в `rrweb-sessions` — какие новые папки/чанки появились.
3. Edge logs `update-replay-url` и `notify-copy-attempt` — был ли успешный POST или алерт о 0 chunks.
4. Если всё ок — подтвердить рабочесть. Если нет — показать конкретную точку отказа.

После approve выполню SELECT-запросы и просмотр логов (read-only, файлы менять не надо).
