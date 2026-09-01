# Задача backend: первый инкремент Relayform

## Цель

Реализовать API и фоновые процессы, которые принимают заявки с сайта, создают независимые доставки и отправляют их через сервисные каналы Relayform. Детальный контракт — в [backendDeliveryContract.md](backendDeliveryContract.md).

## Порядок работ

1. Выбрать и зафиксировать runtime, PostgreSQL, очередь, миграции, secret manager и observability. Добавить `/health` и `/ready`.
2. Реализовать auth, пользователей, проекты, хешированные project API keys и audit log.
3. Реализовать `Form`, `Destination`, `Submission`, `DeliveryAttempt`, `EmailTemplate`; миграции, ownership-проверки и CRUD API.
4. Реализовать recipient onboarding и состояния `pendingActivation`, `active`, `disabled`, `invalid`. Сервисные bot/API credentials принадлежат Relayform и не входят в пользовательские DTO.
5. Реализовать защищённый `POST /v1/events`: signature/API-key проверка, schema validation, rate limit, idempotency по `eventId`, нормализация и fan-out в очередь.
6. Отдельный production worker, bounded retry с jitter, классификация ошибок, redacted diagnostics и owner-scoped dead-letter replay с аудитом реализованы. Следующий инкремент — расширенные метрики и операционные политики.
7. Реализовать e-mail подтверждения: подтверждение адреса, шаблонный контент, короткоживущие ссылки/коды, лимиты и аудит.
8. Реализовать провайдеры по одному после согласования доступа: сначала Telegram и e-mail, затем VK и MAX. Для каждого — `validateRecipient`, `send`, `normalizeError` и integration tests с mock transport.

## Минимальный API-контракт

- `POST /v1/auth/register`, `POST /v1/auth/login`, `GET /v1/me`.
- `GET|POST|PATCH|DELETE /v1/forms` и `/v1/forms/{id}/destinations`.
- `POST /v1/destinations/{id}/telegram-activation`, `POST /v1/integrations/telegram/webhook`.
- `GET|POST /v1/destinations/{id}/vk-activation`, `POST /v1/integrations/vk/callback`.
- `GET|POST /v1/destinations/{id}/max-activation`, `POST /v1/integrations/max/webhook`.
- `POST /v1/destinations/{id}/email-activation`, `POST /v1/destination-email-activations/confirm`.
- `GET|POST|PATCH|DELETE /v1/email-templates`.
- `POST /v1/email-verifications`, `POST /v1/email-verifications/confirm`.
- `POST /v1/events`, `GET /v1/delivery-attempts/{id}`, `GET /v1/projects/{id}/delivery-stats`.
- `GET /v1/projects/{id}/failed-deliveries`, `POST /v1/projects/{id}/delivery-attempts/{attemptId}/replay`.

DTO, коды ошибок, pagination, лимиты и схема подписи должны быть утверждены в SDD перед реализацией endpoint.

## Безопасность

- Пароли хешируются; ключи проектов хранятся только как hash.
- На MVP Provider credentials поступают только из `APP_TOKENS_FILE` на VPS через Compose `env_file`; при масштабировании они переносятся в secret manager/envelope encryption. В API они не возвращаются.
- PII минимизируется, маскируется в логах; webhook/API защищены от replay и лимитированы.
- VK требует подтверждённого разрешения сообщений.

## Критерии приёмки

- Повтор одного `eventId` не создаёт дублирующую доставку для того же назначения и версии конфигурации.
- Сбой одного назначения не блокирует остальные; статус и redacted причина доступны в кабинете.
- Пользовательский API не принимает и не возвращает token, password, `chatId` или иной секрет provider-а.
- Тесты покрывают authorization, idempotency, onboarding, retry/terminal failure и e-mail verification. Verification token хранится только как digest, действует 15 минут и потребляется атомарно один раз.
- Service запускается в Docker Compose, слушает loopback port через proxy и корректно отвечает `/health`/`/ready`.
