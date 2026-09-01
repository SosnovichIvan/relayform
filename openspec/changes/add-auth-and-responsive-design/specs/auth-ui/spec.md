## Purpose

Определяет визуальный контракт базовых auth-форм Relayform до реализации настоящей аутентификации.

## ADDED Requirements

### Requirement: Экраны входа и регистрации
Система дизайна MUST содержать экраны Login и Registration в Light и Dark.

#### Scenario: Просмотр auth-экранов
- **WHEN** пользователь открывает страницу Dashboard в Figma
- **THEN** он видит отдельные подписанные формы входа и регистрации для обеих тем

### Requirement: Поля и первичное действие
Login SHALL иметь поля e-mail и пароль. Registration MUST дополнительно иметь имя и confirmation checkbox. Обе формы содержат один жёлтый primary action.

#### Scenario: Заполнение формы
- **WHEN** пользователь просматривает форму
- **THEN** он понимает, какие данные требуются и какое действие отправляет форму

### Requirement: Мобильные auth-версии
Система дизайна SHALL содержать mobile Login и Registration Light/Dark frames шириной 390 px без горизонтального переполнения.

#### Scenario: Проверка mobile auth
- **WHEN** дизайнер открывает mobile auth frame
- **THEN** поля и primary action доступны в одной колонке и сохраняют семантические цветовые роли
