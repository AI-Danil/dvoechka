## Проблема

В логе видно:
```
* [new branch]      main -> main         ← успех
! [remote rejected] origin/main -> origin/main (deny updating a hidden ref)
error: failed to push some refs
```

`main` уже улетел на GitLab — но `git push --mirror` дополнительно пытается запушить `refs/remotes/origin/main` (служебный ref от `actions/checkout`), а GitLab такие "скрытые" refs отвергает → exit 1.

Хорошая новость: код уже на GitLab. Плохая — workflow красный, и при следующем push та же ошибка повторится.

## Фикс

Заменить `git push --mirror` на явный push только веток и тегов — без служебных refs.

### Правка `.github/workflows/mirror-to-gitlab.yml`

Текущий блок:
```yaml
AUTH_URL="${GITLAB_REPO_URL/https:\/\//https://oauth2:${GITLAB_MIRROR_TOKEN}@}"
git remote add gitlab "$AUTH_URL"
git push gitlab --mirror
```

Меняется на:
```yaml
AUTH_URL="${GITLAB_REPO_URL/https:\/\//https://oauth2:${GITLAB_MIRROR_TOKEN}@}"
git remote add gitlab "$AUTH_URL"
# Push only real branches and tags. --mirror also pushes refs/remotes/origin/*
# which actions/checkout creates locally and GitLab rejects as "hidden refs".
git push --force gitlab "refs/heads/*:refs/heads/*"
git push --force gitlab "refs/tags/*:refs/tags/*"
```

`--force` нужен, чтобы будущие rebase/amend в Lovable доезжали до GitLab без отказа (это всё-таки одностороннее зеркало).

## Файлы

- edit `.github/workflows/mirror-to-gitlab.yml`

## Проверка после

1. После apply закоммитится правка → workflow `Mirror to GitLab` стартанёт автоматически на этот же коммит.
2. Жди зелёную галку (~20 сек).
3. На GitLab обнови страницу проекта — увидишь свежий коммит.
4. Сразу там же стартанёт pipeline `pages` (Build → Pipelines) — 1-2 минуты на билд.
5. Deploy → Pages → URL `https://ai-danil.gitlab.io/dvoechka/` — открой и проверь, что грузится.

Если pipeline на GitLab упадёт — скинь лог упавшего job, разберёмся отдельно.
