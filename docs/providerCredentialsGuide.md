# Служебные токены Relayform: получение и ротация

Этот документ предназначен только для администратора Relayform. Пользователь продукта не получает, не вводит и не передаёт пароль, API key или токен: он подтверждает лишь свой канал-получатель.

## Где хранятся значения

Каждый секрет помещается на VPS в `/opt/relayform/.env.tokens` по шаблону [serviceTokens.example.env](../ops/serviceTokens.example.env). Файл не коммитится, принадлежит пользователю развёртывания и имеет права `600`:

```bash
sudo cp ops/serviceTokens.example.env /opt/relayform/.env.tokens
sudo chown relayform:relayform /opt/relayform/.env.tokens
sudo chmod 600 /opt/relayform/.env.tokens
sudoedit /opt/relayform/.env.tokens
```

Не вставляйте ключ в чат, issue, `.env` frontend-проекта, командную строку, URL или логи. Production-аккаунты провайдеров должны принадлежать организации Relayform, быть защищены MFA и иметь минимум необходимых прав.

| Канал | Переменная секрета | Что получает пользователь |
| --- | --- | --- |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` | Переходит в бот и запускает его; Relayform сохраняет подтверждённый chat ID. |
| VK | `VK_COMMUNITY_ACCESS_TOKEN`, `VK_CALLBACK_SECRET`, `VK_CALLBACK_CONFIRMATION_CODE` | Пишет одноразовую команду сообществу Relayform; sender ID приходит только через Callback API. |
| MAX | `MAX_BOT_TOKEN`, `MAX_WEBHOOK_SECRET` | Переходит в бот по одноразовой ссылке; Relayform связывает `user_id` из защищённого события запуска. |
| E-mail | `EMAIL_PROVIDER_API_KEY` | Подтверждает владение адресом по письму. |

## Telegram

1. В корпоративном Telegram-аккаунте откройте [@BotFather](https://t.me/BotFather), выполните `/newbot`, задайте имя и уникальный username.
2. Скопируйте выданный token в `TELEGRAM_BOT_TOKEN`. Это пароль бота: повторно его не показывайте и не публикуйте.
3. Сгенерируйте независимое случайное значение `TELEGRAM_WEBHOOK_SECRET` из разрешённых Telegram символов `A-Z`, `a-z`, `0-9`, `_`, `-`. Не используйте bot token повторно.
4. Настройте Telegram `setWebhook` на HTTPS endpoint Relayform `/v1/integrations/telegram/webhook`, передав это же значение в `secret_token`. Публичный username бота без `@` запишите в `TELEGRAM_BOT_USERNAME` файла `APP_ENV_FILE`.
5. Пользователь активирует канал только через выданную Relayform ссылку `t.me/<bot>?start=<одноразовый код>`; вручную вводить chat ID не требуется.
6. Для ротации используйте BotFather (`/mybots` → нужный бот → API Token → Revoke/Generate), отдельно замените webhook secret через повторный `setWebhook`, обновите файлы через `sudoedit` и перезапустите deployment.

Официальные источники: [создание и управление ботом](https://core.telegram.org/bots/features), [Bot API](https://core.telegram.org/bots/api).

## VK

1. Создайте или используйте принадлежащее Relayform сообщество VK. В управлении сообществом включите сообщения, иначе пользователь не сможет разрешить получение уведомлений.
2. В настройках сообщества откройте раздел API → «Ключи доступа» и создайте ключ для серверной интеграции с правом работы с сообщениями сообщества. Сохраните его как `VK_COMMUNITY_ACCESS_TOKEN`.
3. В разделе Callback API добавьте HTTPS endpoint `https://<домен>/v1/integrations/vk/callback`. Скопируйте строку подтверждения сервера в `VK_CALLBACK_CONFIRMATION_CODE`.
4. Сгенерируйте отдельный случайный `VK_CALLBACK_SECRET`, укажите его в настройках Callback API и включите событие «Входящее сообщение» (`message_new`). Не используйте access token как callback secret.
5. Числовой ID сообщества запишите в `VK_COMMUNITY_ID`, а публичную HTTPS-ссылку на диалог/сообщество — в `VK_COMMUNITY_URL` файла `APP_ENV_FILE`.
6. Подтвердите адрес Callback API. Backend возвращает confirmation code только при совпадении community ID и secret; рабочие события подтверждаются строкой `ok`.
7. В тестовом окружении создайте VK-назначение, откройте выданную ссылку и отправьте точную команду `/start <одноразовый код>`. После Callback API события статус должен стать `active`, а тестовая заявка — прийти от сообщества.
8. Не используйте личный token администратора: он шире по правам и привязан к человеку, а не к сервису.
9. Для ротации выпустите новый ключ с теми же минимальными правами, обновите файл и deployment, выполните тест доставки, затем удалите старый ключ в разделе API. Callback secret меняйте синхронно в настройках VK и на VPS.

Официальные источники: [схема VK API `messages.send`](https://github.com/VKCOM/vk-api-schema/blob/master/messages/methods.json), [схема Callback API](https://github.com/VKCOM/vk-api-schema/blob/master/callback/objects.json), [документация VK для разработчиков](https://dev.vk.com/ru/guide). Схема фиксирует group-token поддержку, `peer_id`, обязательный уникальный `random_id`, `message_new`, `group_id`, `event_id` и callback `secret`. Названия пунктов интерфейса могут меняться; ориентируйтесь на API/Callback API именно сообщества.

## MAX

1. В кабинете [MAX для разработчиков](https://dev.max.ru/) создайте бота организации Relayform и завершите требуемую платформой модерацию/верификацию.
2. Скопируйте выданный токен бота в `MAX_BOT_TOKEN`; не используйте credentials личного аккаунта сотрудника. Публичное имя бота запишите без `@` в `MAX_BOT_USERNAME` файла `APP_ENV_FILE`.
3. Сгенерируйте независимый случайный `MAX_WEBHOOK_SECRET` длиной 32+ символа из `A-Z`, `a-z`, `0-9`, `_`, `-`. Не повторяйте bot token.
4. Через `POST /subscriptions` настройте webhook `https://<домен>/v1/integrations/max/webhook`, передайте `update_types: ["bot_started"]` и это же значение в `secret`. MAX будет присылать его в `X-Max-Bot-Api-Secret`; Relayform отклоняет запрос до обработки тела, если секрет не совпал.
5. Пользователь открывает `https://max.ru/<bot>?start=<одноразовый токен>`. Relayform хранит только digest токена и активирует канал по положительному `user.user_id` из `bot_started`; вручную вводить ID не требуется.
6. Выполните тест активации, затем тест заявки. Отправка идёт на `https://platform-api2.max.ru/messages?user_id=<user_id>` с токеном только в `Authorization`.
7. При ротации создайте новый token в карточке бота, замените его в файле, разверните сервис и выполните тест отправки. Старый token отзовите после проверки. Webhook secret меняйте синхронно через подписку MAX и на VPS.

Официальные источники: [отправка сообщения](https://dev.max.ru/docs-api/methods/POST/messages), [подписка webhook](https://dev.max.ru/docs-api/methods/POST/subscriptions), [deep link и `bot_started`](https://dev.max.ru/docs/chatbots/bots-coding/masterbot). Если в кабинете отсутствует выпуск токена, не обходите ограничение: сначала запросите доступ в поддержку/программу для разработчиков MAX.

## Транзакционная почта

Для MVP выбран Resend, при этом `EMAIL_PROVIDER_API_KEY` остаётся нейтральным runtime-именем для будущей замены адаптера. До включения канала подтвердите домен отправителя через DNS и заведите отдельный production key только с правом отправки.

MVP-адаптер использует Resend: в Dashboard откройте **API Keys** → **Create API Key**, выберите `Sending access` и ограничьте key доменом Relayform. Скопировать значение можно только при создании. Поместите его в `EMAIL_PROVIDER_API_KEY`. Подтверждённый адрес отправителя укажите как `EMAIL_FROM_ADDRESS` в `APP_ENV_FILE`, а публичный HTTPS origin Relayform — как `PUBLIC_APP_URL`.

Для ротации сначала создайте второй ключ с тем же scope, обновите VPS-файл и проверьте доставку подтверждающего письма, затем удалите прежний. Это исключает простой отправки.

Один Resend key используется сервером для двух фиксированных потоков: подтверждения адреса назначения и последующих уведомлений о заявках. Он никогда не попадает в браузер или tenant DTO. E-mail транспорт включается только когда одновременно заданы key и подтверждённый `EMAIL_FROM_ADDRESS`; `PUBLIC_APP_URL` нужен для HTTPS-ссылки активации.

Официальные источники: [Resend API keys](https://resend.com/docs/dashboard/api-keys/introduction), [подтверждение домена](https://resend.com/docs/dashboard/domains/introduction). При выборе другого провайдера используйте тот же принцип: отдельный service account, право только на sending, проверенный домен и документированная ротация.

## Проверка и экстренная замена

После изменения `/opt/relayform/.env.tokens` выполните обычный deployment из [VPS-инструкции](vpsDeployment.md), затем проверьте health endpoint и одну тестовую доставку каждым включённым адаптером. В логи и тикеты попадает только название канала, ID attempt и код ошибки — не token и не полный адрес получателя.

При подозрении на утечку сначала немедленно отзовите token в кабинете провайдера, затем выпустите новый, обновите VPS-файл и deployment. Не пытайтесь «исправить» скомпрометированный token или оставлять оба ключа активными дольше, чем нужно для контролируемой ротации.
