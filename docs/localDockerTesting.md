# Локальное ручное тестирование в Docker

Локальный стенд запускает production-сборки frontend и backend, отдельный delivery worker и PostgreSQL. Для проверки регистрации, входа, проектов, форм, направлений, статистики и шаблонов писем реальные provider-токены не нужны.

## Требования

- Docker Desktop либо Docker Engine с Compose;
- свободные loopback-порты `3000`, `3001` и `5433`;
- не менее 4 GB доступной Docker-памяти на время сборки.

## Запуск

```bash
npm run local:up
```

Команда собирает образы, запускает PostgreSQL, автоматически применяет миграции через backend и ожидает готовности сервисов.

После успешного запуска доступны:

- приложение: <http://localhost:3000>;
- frontend health: <http://localhost:3000/api/health>;
- backend health: <http://localhost:3001/health>;
- backend readiness: <http://localhost:3001/ready>;
- PostgreSQL: `postgresql://relayform:relayform-local@127.0.0.1:5433/relayform`.

Состояние и логи:

```bash
npm run local:status
npm run local:logs
```

`Ctrl+C` завершает просмотр логов, но не останавливает контейнеры.

## Базовый smoke test

1. Открыть лендинг и проверить переключение Light/Dark.
2. Зарегистрировать нового пользователя и убедиться, что открывается кабинет.
3. Создать проект, форму обратной связи и несколько направлений.
4. Обновить и удалить форму, проверив подтверждение удаления.
5. Создать и отредактировать шаблон письма подтверждения, проверить обе темы preview.
6. Перезапустить стенд и убедиться, что данные сохранились.
7. Проверить `health` и `ready`: оба endpoint должны отвечать HTTP `200`.

Без реальных provider-токенов внешняя доставка и активация направлений ожидаемо недоступны; остальной продуктовый сценарий сохраняется в PostgreSQL и пригоден для ручного теста.

## Проверка реальной доставки

Создать локальный файл токенов из примера:

```bash
cp ops/serviceTokens.example.env ops/serviceTokens.env
```

Заполнить только необходимые значения по инструкции [Получение provider credentials](providerCredentialsGuide.md), затем запустить:

```bash
APP_TOKENS_FILE=ops/serviceTokens.env npm run local:up
```

`ops/serviceTokens.env` исключён из Git и передаётся только backend и worker. Не добавляйте токены в `ops/localAppEnv.example.env`, Compose-файл, frontend-переменные или логи.

## Настройка портов и окружения

Порты можно переопределить на один запуск:

```bash
APP_HTTP_PORT=3100 API_HTTP_PORT=3101 POSTGRES_PORT=5434 npm run local:up
```

Для локальных несекретных настроек скопировать `ops/localAppEnv.example.env` в игнорируемый `ops/localAppEnv.env` и передать путь:

```bash
APP_ENV_FILE=ops/localAppEnv.env npm run local:up
```

## Остановка и сброс

Обычная остановка сохраняет базу данных:

```bash
npm run local:down
```

Полный сброс удаляет контейнеры и именованный PostgreSQL volume со всеми локальными тестовыми данными:

```bash
npm run local:reset
```

## Диагностика

- Если порт занят, переопределить его переменной из раздела выше.
- Если сервис не стал healthy, выполнить `npm run local:status`, затем `npm run local:logs`.
- Если миграция завершилась ошибкой после изменения схемы, сначала изучить backend logs; `local:reset` использовать только если локальные данные больше не нужны.
- После изменения исходного кода снова выполнить `npm run local:up`: Compose пересоберёт изменившийся образ.
