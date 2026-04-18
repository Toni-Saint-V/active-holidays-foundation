# Drift Matrix

Use this matrix to structure the audit.

## 1. Scope drift

Questions:
- Совпадает ли текущий MVP scope в Notion с реально существующими экранами, API и сущностями?
- Не живут ли в repo post-MVP ветки логики как будто они уже part of core?

Evidence:
- router / screens
- shared contracts
- roadmap phase definitions
- master doc / definition of final

## 2. State drift

Questions:
- Описаны ли состояния продукта так же, как они реализованы?
- Есть ли реальные loading / error / empty / success, или только happy-path?
- Есть ли state machines в коде там, где Notion обещает stateful behavior?

Evidence:
- UI routes
- stores
- API status models
- review / case lifecycle code

## 3. Contract drift

Questions:
- Одинаковые ли payload names, enums, thresholds, routes и ownership assumptions в Notion и repo?
- Не требуют ли публичные контракты того, что должно приходить только из server/auth context?

Evidence:
- shared/contracts
- API client
- server routes
- build briefs / screen contracts

## 4. Roadmap drift

Questions:
- Реальны ли текущие статусы задач?
- Не ссылаются ли roadmap items на старый toolchain, старый repo или старую фазу?
- Не скрыты ли блокеры в open decisions?

Evidence:
- roadmap DB entries
- linked build briefs
- branch state
- open decisions

## 5. Brief drift

Questions:
- Можно ли реально выполнять brief без угадывания?
- Не описывает ли brief несуществующие пакеты, API, storybook, dark mode, mocks, infra?
- Один ли executor владеет brief, или там смешана логика разных исполнителей?

Evidence:
- build brief body
- repo paths
- scripts / package.json

## 6. Toolchain drift

Questions:
- Используются ли Codex App / Codex CLI / Lovable по их сильным сторонам?
- Не пытаются ли документы заставить Lovable решать domain logic или Codex придумывать UX?
- Есть ли единый handoff layer между ними?

Evidence:
- execution docs
- lovable/project knowledge guidance
- codex/agents guidance
