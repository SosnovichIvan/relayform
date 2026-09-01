# GitHub Actions CI

Workflow [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) запускается для каждого pull request, push в `main` и вручную через `workflow_dispatch`. Новый запуск для той же ветки отменяет устаревший, чтобы не расходовать Actions minutes на уже заменённый commit.

## Обязательные проверки

В branch protection ветки `main` следует включить **Require status checks to pass before merging** и потребовать три стабильных check name:

- `Frontend` — TypeScript, ESLint, Vitest с четырьмя порогами покрытия не ниже 90% и production Next.js build;
- `Backend` — TypeScript, ESLint и Vitest API workspace с теми же порогами покрытия;
- `Deployment configuration` — разрешение production Compose с безопасными example env-файлами без запуска контейнеров.

Workflow не выполняет deployment и не читает repository/environment secrets. `GITHUB_TOKEN` имеет только `contents: read`; checkout не сохраняет credential. GitHub-authored actions закреплены полными commit SHA официальных релизов, а комментарий версии на той же строке позволяет Dependabot обновлять их проверяемым pull request.

## Локальная проверка

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run typecheck --workspace @relayform/api
npm run lint --workspace @relayform/api
npm test --workspace @relayform/api
```

Compose-проверка использует только шаблоны:

```bash
APP_ENV_FILE=ops/appEnv.example.env APP_TOKENS_FILE=ops/serviceTokens.example.env APP_HTTP_PORT=3000 POSTGRES_PASSWORD=compose-validation-only docker compose -f dockerCompose.production.yml config --quiet
```

Еженедельные обновления action references настроены в [`.github/dependabot.yml`](../.github/dependabot.yml). Каждое такое обновление проходит этот же CI; автоматическое слияние не включено.
