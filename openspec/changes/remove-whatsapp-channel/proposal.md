## Why

WhatsApp исключается из состава Relayform. Его упоминание в макетах, продуктовых документах, backend/frontend-задачах, VPS-настройках и спецификациях создаёт неверное ожидание доступного канала.

## What Changes

- Удалить WhatsApp из списка поддерживаемых направлений доставки, типов, сценариев подключения и порядка реализации.
- Удалить WhatsApp credential из MVP token template и administrator runbook.
- Обновить Figma-экраны Light/Dark desktop/mobile: в списках каналов остаются Telegram, VK, MAX и e-mail.
- Зафиксировать решение в AI context и decision log.

## Non-goals

- Не добавлять замену WhatsApp и не менять существующие сценарии Telegram, VK, MAX или e-mail.
- Не реализовывать адаптеры или миграции данных: репозиторий остаётся на этапе планирования.

## Impact

- Затронуты продуктовые/технические документы, task-документы, OpenSpec-артефакты, `ops/serviceTokens.example.env` и существующий Figma file.
