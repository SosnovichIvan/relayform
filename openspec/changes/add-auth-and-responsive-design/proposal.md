## Why

Лендинг Relayform требует завершить desktop hero без вторичного перехода «Как это работает →», показать базовые формы входа и регистрации и проверить дизайн на мобильной ширине в обеих темах.

## What Changes

- Убрать вторичный текстовый переход из hero Light и Dark desktop-лендингов.
- Создать в Figma отдельные формы входа и регистрации в Light и Dark.
- Создать мобильные адаптивные фреймы лендинга и auth-форм в Light и Dark.
- Сохранить существующие semantic variables, Inter, тёплую палитру и desktop-экраны.

## Capabilities

### New Capabilities

- `auth-ui`: Базовые адаптивные интерфейсы входа и регистрации Relayform в Light и Dark.
- `responsive-marketing-design`: Мобильные версии маркетингового лендинга Relayform в Light и Dark.

### Modified Capabilities

- `marketing-landing`: Hero не содержит вторичной текстовой CTA «Как это работает →».

## Impact

- Figma pages `01 • Landing` и `02 • Dashboard` (для auth-экранов).
- AI-context и OpenSpec change package.
- Кодовая реализация не входит в этот design change.
