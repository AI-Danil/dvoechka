# Changelog

Формат: [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/).
Версионирование: [SemVer](https://semver.org/lang/ru/).

## [Unreleased]

### Security
- Сняты широкие SELECT-политики со `storage.objects` для `test-attachments`
  и `rrweb-sessions` (запрет анонимного `LIST`).
- Отозван `EXECUTE` у `anon`/`authenticated` для SECURITY DEFINER функций
  `has_role`, `set_updated_at`, `get_session_by_code`.
- Включён HIBP-чек паролей в Supabase Auth.

### Added
- Серверный автосейв черновика (`student_drafts`) для обычного режима
  с 5-секундным debounce, восстановлением при возврате и beacon-флэшем
  при закрытии вкладки.
- Документация: `docs/{ARCHITECTURE,DATABASE,EDGE_FUNCTIONS,AUTH_AND_ROLES,
  TESTING_FLOW,SECURITY,DEPLOYMENT,DEVELOPMENT,CHANGELOG}.md`.

### Changed
- `README.md` переработан: вынесена детальная инструкция по деплою в
  `docs/DEPLOYMENT.md`, README стал кратким обзором.
