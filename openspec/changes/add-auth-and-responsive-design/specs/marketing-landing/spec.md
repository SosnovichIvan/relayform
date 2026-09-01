## Purpose

Фиксирует правила hero и мобильного desktop-to-mobile reference для лендинга Relayform.

## MODIFIED Requirements

### Requirement: Один основной CTA в hero
Hero лендинга MUST показывать primary CTA для подключения первой формы и не должен содержать текстовую CTA «Как это работает →».

#### Scenario: Просмотр hero
- **WHEN** посетитель открывает Light или Dark desktop/mobile landing
- **THEN** он видит один основной призыв к подключению формы без вторичного перехода в hero

### Requirement: Мобильный reference
Система дизайна SHALL содержать Light и Dark mobile landing frames шириной 390 px, в которых контент расположен в одной колонке без горизонтального переполнения.

#### Scenario: Проверка мобильного лендинга
- **WHEN** дизайнер открывает mobile landing frame
- **THEN** hero, form-to-channel demo, steps, benefits, CTA и footer читаемы и помещаются по ширине
