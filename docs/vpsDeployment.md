# Развёртывание на VPS

## Что делает скрипт

`ops/deployVps.sh` готовит Ubuntu/Debian VPS для Relayform: устанавливает Docker/Compose, Nginx, Certbot и UFW, обновляет репозиторий через SSH deploy key, запускает production Compose, проверяет health endpoint и выпускает/обновляет Let’s Encrypt сертификат.

Скрипт не содержит и не создаёт secrets, не меняет DNS и не работает, пока в репозитории нет `Dockerfile` и `dockerCompose.production.yml`. Их добавляет первый frontend/backend инкремент.

## Предварительные условия

1. VPS с Ubuntu 22.04+/Debian 12+, публичным IPv4 и доступом по SSH.
2. Домен `APP_DOMAIN` уже имеет A-запись на `VPS_PUBLIC_IPV4`.
3. На VPS создан непривилегированный пользователь `DEPLOY_USER` и SSH deploy key для чтения GitHub-репозитория. Private key: `chmod 600`, владелец — `DEPLOY_USER`.
4. В `DEPLOY_PATH` размещены закрытые runtime env-файлы `APP_ENV_FILE` и `APP_TOKENS_FILE` (`chown DEPLOY_USER`, `chmod 600`); они не коммитятся.
5. Application Compose пробрасывает порт только как `127.0.0.1:${APP_HTTP_PORT}:<containerPort>` и предоставляет `APP_HEALTH_PATH`.

## Настройка

```bash
sudo install -d -m 700 /etc/relayform
sudo install -d -o relayform -g relayform -m 750 /opt/relayform
sudo cp ops/deployConfig.example.env /etc/relayform/deploy.env
sudo chmod 600 /etc/relayform/deploy.env
sudoedit /etc/relayform/deploy.env
sudo bash ops/deployVps.sh /etc/relayform/deploy.env
```

Значения в `deploy.env` не должны содержать пароли, токены или private keys. Provider tokens размещаются только в `APP_TOKENS_FILE` на VPS. Не коммитить этот файл, `APP_ENV_FILE` или deploy key.

Создайте runtime-конфигурацию приложения из безопасного шаблона:

```bash
sudo cp ops/appEnv.example.env /opt/relayform/.env.production
sudo chown relayform:relayform /opt/relayform/.env.production
sudo chmod 600 /opt/relayform/.env.production
sudoedit /opt/relayform/.env.production
```

`EVENT_RATE_LIMIT_MAX` задаёт число запросов на проект в одном окне, `EVENT_RATE_LIMIT_WINDOW_MS` — длительность окна. Значения должны быть положительными целыми; при ошибке backend использует безопасные defaults `60` и `60000`.

## Файл токенов MVP

На VPS создайте файл из [шаблона](../ops/serviceTokens.example.env):

```bash
sudo cp ops/serviceTokens.example.env /opt/relayform/.env.tokens
sudo chown relayform:relayform /opt/relayform/.env.tokens
sudo chmod 600 /opt/relayform/.env.tokens
sudoedit /opt/relayform/.env.tokens
```

В нём хранятся только service credentials Relayform: токены Telegram/MAX, access token и Callback API secrets VK, ключ почтового провайдера. Их не должен читать frontend, они не включаются в логи и не сохраняются в БД как обычные строки.

Пустые значения допустимы только для ещё не включённых адаптеров. Backend валидирует наличие нужного токена при включении конкретного канала.

Где выпустить каждый credential, какие права ему нужны и как провести ротацию — в [инструкции по служебным токенам](providerCredentialsGuide.md). Это работа администратора Relayform, а не пользователя кабинета.

## Контракт production Compose

Первый frontend implementation PR уже добавил `dockerCompose.production.yml` и `Dockerfile`:

- frontend собирается из репозитория, но **не** получает `APP_TOKENS_FILE`;
- backend запускается в Compose с `RUN_DELIVERY_WORKER=false`, применяет миграции, обслуживает API и получает `APP_TOKENS_FILE` только для webhook/активационных операций;
- отдельный закрытый worker получает `APP_TOKENS_FILE` и `DATABASE_URL`, не публикует порт и выполняет доставку из PostgreSQL;
- приложение слушает `APP_HTTP_PORT` внутри/на loopback host mapping;
- health endpoint отвечает HTTP 200 без авторизации;
- PostgreSQL/очередь не публикуют порты наружу;
- все volumes и restart policy описаны явно.

Минимальный фрагмент Compose:

```yaml
services:
  frontend:
    env_file:
      - ${APP_ENV_FILE}
```

`deployVps.sh` передаёт в Compose только пути `APP_ENV_FILE` и `APP_TOKENS_FILE`; frontend использует только первый файл. Backend и worker подключают второй файл, а его содержимое не появляется в аргументах командной строки.

Worker запускается командой `npm run worker`, требует `DATABASE_URL` и использует тот же transport registry, что и тестовый in-process режим. PostgreSQL leases позволяют позднее увеличить число worker-реплик: одно задание одновременно получает только один процесс. При штатном `SIGTERM`/`SIGINT` worker прекращает polling и закрывает pool; при аварийном завершении незаконченная аренда истекает и задание снова становится доступно.

## Операционные заметки

- На первом запуске скрипт останавливается до Certbot, если DNS не указывает на VPS.
- Certbot настраивает HTTPS в Nginx и system timer для renewal. До выпуска сертификата Nginx обслуживает HTTP challenge/proxy-конфигурацию.
- Повторный запуск обновляет Git-ветку fast-forward, Compose и сертификат. Локальные изменения в deploy checkout не допускаются.
- Перед обновлением приложения сделайте backup PostgreSQL и проверьте миграции в staging.
