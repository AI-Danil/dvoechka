# План: зеркало на GitLab + деплой на GitLab Pages

## Что делаем перед моим кодом (руками, 5 минут)

1. **Регистрируешься на gitlab.com** (можно через GitHub-аккаунт).
2. **Создаёшь пустой проект** `dvoechka` (New project → Create blank project). Видимость — Public (иначе Pages не будут публичными на бесплатном тарифе без авторизации). Снять галку «Initialize repository with a README».
3. **Получаешь Project Access Token** для push-зеркала:
   - В новом проекте: **Settings → Access Tokens → Add new token**.
   - Name: `github-mirror`, Role: **Maintainer**, Scopes: `write_repository`.
   - Скопировать токен (показывается один раз).
4. **Кладёшь токен в GitHub Secrets**:
   - github.com → репо `dvoechka` → **Settings → Secrets and variables → Actions → New repository secret**.
   - Name: `GITLAB_MIRROR_TOKEN`, Value: токен из шага 3.
   - Ещё один секрет: `GITLAB_REPO_URL` = `https://gitlab.com/<твой-юзер>/dvoechka.git` (без токена, токен подставится в workflow).

После шага 4 жмёшь «Implement plan» — я делаю остальное.

---

## Что прописываю я

### 1. `.github/workflows/mirror-to-gitlab.yml` (новый)
Workflow на каждый push в `main`:
- checkout с `fetch-depth: 0` (вся история);
- `git push --mirror https://oauth2:$GITLAB_MIRROR_TOKEN@gitlab.com/<user>/dvoechka.git`;
- триггер также `workflow_dispatch` для ручного запуска.

Таким образом коммиты из Lovable/GitHub попадают в GitLab за 10–20 секунд.

### 2. `.gitlab-ci.yml` (новый)
Один job `pages` на образе `oven/bun`:
```text
- bun install --no-frozen-lockfile
- GITLAB_PAGES=true bun run build
- mv dist public         # GitLab Pages раздаёт папку public/
artifacts:
  paths: [public]
only: [main]
```
Env-переменные (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`) — с дефолтами как в GitHub Actions, чтоб не настраивать в UI GitLab. При желании можно переопределить в Settings → CI/CD → Variables.

### 3. `vite.config.ts` (правка)
Сейчас есть ветка `GITHUB_PAGES=true → base="/<repo>/"`. Добавляю аналогичную для `GITLAB_PAGES=true` — берёт имя репо из `CI_PROJECT_NAME` (стандартная env в GitLab CI).

### 4. `public/404.html` уже есть — работает и для GitLab Pages (тот же SPA-fallback трюк). Ничего не трогаю.

### 5. `docs/DEPLOYMENT.md` (правка)
Добавляю раздел **GitLab Pages** с URL `https://<user>.gitlab.io/dvoechka/` и таблицу зеркал расширяю до 5 штук.

### 6. `README.md` (правка)
В строке про мульти-зеркало добавляю GitLab.

---

## Файлы

- new `.github/workflows/mirror-to-gitlab.yml`
- new `.gitlab-ci.yml`
- edit `vite.config.ts`
- edit `docs/DEPLOYMENT.md`
- edit `README.md`

---

## После деплоя проверочный чеклист

- [ ] Запушить пустой коммит → workflow `mirror-to-gitlab` зелёный → коммит виден на GitLab.
- [ ] На GitLab: **Build → Pipelines** — `pages` job зелёный.
- [ ] Открыть `https://<user>.gitlab.io/dvoechka/` — главная грузится, авторизация через Supabase работает.
- [ ] Проверить из мобильной сети РФ без VPN, что URL открывается.

---

## Альтернатива, если не хочется трогать GitHub Actions

Pull-mirror на GitLab (он сам тянет из GitHub раз в 30 минут) — тогда workflow не нужен, только `.gitlab-ci.yml` + правка vite. Скажи в чате после плана — переделаю.
