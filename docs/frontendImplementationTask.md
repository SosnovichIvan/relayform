# Задача frontend: первый инкремент Relayform

## Цель

Собрать доступное web-приложение по утверждённым Figma-макетам: лендинг, вход/регистрация и кабинет с формами, каналами доставки и шаблонами подтверждающих писем. Реальные данные подключаются только после появления backend API.

## Порядок работ

1. Инициализировать Next.js App Router, TypeScript, Tailwind CSS v4, ESLint и базовую тестовую инфраструктуру. Добавить `Dockerfile`, `dockerCompose.production.yml` и `/api/health` по контракту [VPS-деплоя](vpsDeployment.md).
2. Создать FSD-слои `shared`, `entities`, `features`, `widgets`, `pages`; настроить semantic theme tokens Light/Dark из Figma Foundations.
3. Реализовать публичные маршруты: лендинг, вход и регистрацию. Состояния форм: initial, loading, validation error, API error, success.
4. Реализовать защищённый shell кабинета: список форм, создание/редактирование, обзор доставок и статистика с loading/empty/error/success состояниями.
5. Реализовать подключение каналов как recipient-only flow: Telegram/MAX — кнопка запуска бота и `pendingActivation`; VK — разрешение сообщений; e-mail — адрес и подтверждение. Не запрашивать provider token или пароль.
6. Реализовать список и редактор подтверждающих писем. Preview имеет фиксированный Relayform-каркас; меняются тема и текст. На mobile preview фиксирован сверху, а поля и сохранение прокручиваются отдельно.
7. Добавить typed API client, обработку 401/403, optimistic updates только после согласования API и тесты критичных пользовательских сценариев.

## API-зависимости

- Auth: регистрация, вход, текущий пользователь, выход.
- Forms/destinations: CRUD формы, назначения, статусы подключения и тест подключения.
- Templates: CRUD шаблонов и preview model.
- Events/deliveries: список, агрегированная статистика и redacted diagnostics.

Финальные DTO и ошибки фиксируются в `.ai/sdd/initialImplementation.md` до начала каждого API-подключения.

## FSD-границы

- `entities/form`, `entities/destination`, `entities/emailTemplate`, `entities/delivery`, `entities/user` — модели и UI-представление данных.
- `features/authentication`, `features/manageForm`, `features/connectDestination`, `features/manageEmailTemplate` — пользовательские действия.
- `widgets/cabinetNavigation`, `widgets/formList`, `widgets/emailEditor`, `widgets/deliveryOverview` — независимые блоки экрана.
- `pages/landing`, `pages/auth`, `pages/cabinet` — композиция.

## Критерии приёмки

- Макеты Light/Dark и mobile соответствуют Figma; нет literal hex в JSX/Tailwind.
- Интерактивные элементы имеют доступные имена, visible focus и корректные состояния загрузки/ошибок.
- Технические идентификаторы чатов и provider credentials не показываются и не запрашиваются в UI.
- Приложение проходит lint, type-check и целевые тесты.
- `/api/health` отвечает `200`; production Docker image запускает приложение на `APP_HTTP_PORT` без публичного проброса контейнерного порта.

## Вне scope первого инкремента

- Реальные отправки провайдерам, биллинг, восстановление пароля, телефонная верификация и полноценная аналитика по воронке.
