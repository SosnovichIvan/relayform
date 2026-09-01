# Relayform project rules

## Стек

Next.js App Router, React, TypeScript и Tailwind CSS v4. Серверные компоненты используются по умолчанию; `"use client"` добавляется только для состояния, событий браузера или клиентских хуков.

## FSD

```text
src/
  app/        # Next.js routes, providers, global styles
  pages/      # composed page-level screens (not Next.js routes)
  widgets/    # independent page blocks
  features/   # user-facing actions
  entities/   # business entities
  shared/     # reusable UI, API client, config, lib, assets
```

Слайсы называют по предметной области: `lead`, `project`, `notificationChannel`; не `components`, `hooks` или `utils`. Внутри слайса допустимы сегменты `ui`, `model`, `api`, `lib`, `config`. Импорты направлены только вниз по слоям; внешнее использование слайса — только через его public API (`index.ts`). `app` и `shared` не имеют слайсов.

## Naming

- Директории, файлы, функции, props, hooks, переменные и CSS custom properties — `camelCase`.
- React-компоненты и их типы — `PascalCase`: это требование JSX/React. Например, файл `leadForm.tsx` экспортирует `LeadForm`.
- Хуки начинаются с `use`; булевы значения — с `is`, `has`, `can` или `should`.
- Не создавать barrel-файлы для внутренних сегментов; `index.ts` разрешён на public API слайса.

## Design tokens

Использовать только семантические CSS-переменные из темы: `--color-bg-*`, `--color-text-*`, `--color-border-*`, `--color-action-*`, `--color-status-*`. Не добавлять произвольные hex-значения в JSX/Tailwind-классах.

## Quality gates

- Statement, branch, function and line coverage from the configured test runner MUST be at least 90% for each implementation change.
- `lint`, `typecheck`, tests with coverage and production build are required before handoff. A temporarily untestable path needs an explicit OpenSpec exception approved by the user.

## AI knowledge maintenance

Перед работой агент читает `.ai/context/project-context.md` и релевантную спецификацию. После завершения значимой реализации, дизайн-решения, review или устойчивого замечания пользователя агент обновляет контекст и соответствующий skill/правило. В skills попадают только повторяемые, проверенные договорённости; разовые пожелания фиксируются в спецификации или decision log с причиной и датой.

## OpenSpec workflow

OpenSpec — единственный разрешённый workflow для задач в этом репозитории. Каждая задача оформляется как change package в `openspec/changes/<changeId>/`, проходит валидацию и только затем берётся в работу. В change package должны быть proposal, design при необходимости, tasks и изменения затронутых спецификаций. Реализацию, дизайн-изменения, исправления по review и конфигурационные изменения нельзя начинать до успешной валидации. Перед handoff change package обновляется и валидируется повторно.
