# Правила репозитория и публикация образов

## Защищённые ветки

Активный GitHub ruleset `Protect main and develop` применяется к `main` и `develop`:

- прямые push запрещены всем, включая владельца и администраторов;
- force-push и удаление веток запрещены;
- изменения попадают в ветку только через pull request;
- обязательны проверки `Frontend`, `Backend` и `Deployment configuration` на актуальном состоянии target-ветки;
- обязательны разрешение review discussions и одно актуальное одобрение владельца из `.github/CODEOWNERS`;
- после нового push прежнее одобрение сбрасывается;
- merge разрешён только владельцу репозитория из pull request;
- владелец имеет bypass только в режиме pull request, поэтому может слить собственный PR без невозможного самоодобрения, но не может выполнить прямой или force-push.

Исходный API payload хранится в `.github/rulesets/protectedBranches.json`. Изменение файла само по себе не меняет GitHub: конфигурацию необходимо применить через Repository Rulesets API и затем прочитать обратно для проверки.

## Ветки разработки

Работа ведётся в topic-ветках. Pull request направляется в `develop`; стабилизированный релиз создаётся отдельным pull request из `develop` в `main`. Это организационная рекомендация, а не дополнительное ограничение ruleset: срочный topic PR в `main` технически возможен, но проходит те же проверки и owner-only merge.

## Публикация production images

После успешного workflow `CI` на `main` workflow `Publish container images` собирает точный проверенный commit и публикует:

- `ghcr.io/sosnovichivan/relayform-frontend:sha-<commit>`;
- `ghcr.io/sosnovichivan/relayform-backend:sha-<commit>`.

Тег `main` обновляется для навигации, но VPS должен использовать digest:

```yaml
services:
  frontend:
    image: ghcr.io/sosnovichivan/relayform-frontend@sha256:<digest>
  backend:
    image: ghcr.io/sosnovichivan/relayform-backend@sha256:<digest>
  worker:
    image: ghcr.io/sosnovichivan/relayform-backend@sha256:<same-backend-digest>
    command: ["npm", "run", "worker"]
```

Workflow публикует images через временный `GITHUB_TOKEN` с `contents: read` и `packages: write`. Репозиторный PAT, SSH-доступ к VPS и provider-токены в workflow не передаются. Для скачивания приватного GHCR package VPS использует отдельный read-only credential; runtime provider credentials остаются только в VPS token-файле.

## Применение ruleset

Токен настройки должен принадлежать владельцу и иметь `Administration: write` для репозитория. Секрет нельзя сохранять в репозитории, shell history или документации. Последовательность API:

1. Проверить или создать `refs/heads/develop` на текущем remote `main`.
2. Убедиться, что ruleset с тем же именем отсутствует, либо обновить существующий вместо создания дубликата.
3. Передать содержимое `.github/rulesets/protectedBranches.json` в Repository Rulesets API.
4. Прочитать созданный ruleset и проверить active enforcement, обе ветки, все пять правил, три status checks и единственный owner bypass в режиме `pull_request`.
