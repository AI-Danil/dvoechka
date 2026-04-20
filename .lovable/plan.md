
Проверяю по порядку: storage → БД → edge functions logs.

План:
1. SQL: последние 5 записей `test_results` за сегодня — есть ли `replay_url`.
2. SQL: `storage.objects` где `bucket_id='rrweb-sessions'` — сколько файлов, по каким `resultId`.
3. Edge logs `update-replay-url` — был ли вызов с успехом.
4. Доложить что работает / что нет.
