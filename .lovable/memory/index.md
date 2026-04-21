# Memory: index.md
Updated: now

# Project Memory

## Core
- **Tech Stack:** React SPA, Vite (`@vitejs/plugin-react` ONLY, NO SWC), Supabase.
- **Design:** Academic UI, light gray bg (`#f4f7f6`), green accent. Default light theme.
- **Constraints:** MUST sanitize Cyrillic filenames to ASCII before Supabase upload.
- **Features:** Require exactly 2 Russian words for name. 3rd word digit for hidden retake.

## Memories
- [Visual Style](mem://design/visual-style) — Minimalist academic design, green accent colors, default light theme
- [Testing Flow](mem://features/testing-flow) — 3-screen SPA, class-based dynamic filtering, 40-minute timer with auto-submit
- [Telegram Results Integration](mem://integrations/telegram-results) — Supabase Edge Function for TG reports, handles long messages and anti-cheat logs
- [File Attachments](mem://features/file-attachments) — Supabase storage 'test-attachments', Cyrillic to ASCII sanitization
- [Submission Logic](mem://features/submission-logic) — 2-word name validation, hidden retake feature via digit, draft auto-save
- [Results Management](mem://features/results-management) — 'test_results' Supabase table, admin dashboard
- [Anti-Cheat System](mem://features/anti-cheat-system) — Hidden monitoring, active UI blocking, instant Telegram alerts on copy attempts
- [Available Tests Content](mem://content/available-tests) — Test structures for grades 7, 8, 9 across CS, Physics, and Tech
- [Build Configuration](mem://infrastructure/build-config) — Vite plugin constraint, no SWC plugin due to Lovable environment
- [Live Sessions](mem://features/live-sessions) — Code-based live test rooms with shared countdown timer (ends_at) and waiting room
