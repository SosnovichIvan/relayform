## Context

Relayform пока не реализован, поэтому WhatsApp можно исключить без миграции production-данных. Поддерживаемый набор каналов после изменения: Telegram, VK, MAX и e-mail.

## Decision

- WhatsApp удаляется целиком из перечислений, моделей provider, сценариев recipient activation, delivery adapter и service credentials.
- Figma сохраняет текущую композицию и визуальную систему; удаляется только WhatsApp option/tag/text, без замены новым каналом.
- Исторические OpenSpec change packages также приводятся к новому продуктовому словарю, чтобы поиск по репозиторию не создавал ложное обещание поддержки.

## Validation

- Репозиторный поиск не находит `WhatsApp`, `whatsapp`, `Ватсап` или `Вацап` вне данного change package до его завершения.
- В Figma на страницах Landing и Cabinet отсутствует WhatsApp в видимом тексте и destination controls; Light/Dark и mobile references сохраняют корректный layout.
