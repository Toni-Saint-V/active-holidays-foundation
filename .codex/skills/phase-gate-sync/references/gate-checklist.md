# Gate Checklist

## Entry

- Есть ли конкретный roadmap item или brief?
- Понятно ли, что именно считается done?
- Нет ли открытого решения, которое меняет форму реализации?

## Verification

- typecheck
- tests
- build
- focused manual or UI checks when relevant

## Review

- backend / contracts / lifecycle: bank-grade review
- UI / flows / states: UI audit or lovable redline
- copy / trust text: product-copy review when materially changed

## Notion sync

- Roadmap status соответствует факту?
- Build Brief status соответствует факту?
- Residual risks зафиксированы?
- Есть ли новый blocker, который надо вынести в Open Decisions?

## Exit

Task may move forward only if:
- acceptance criteria are met
- verification passed or failure is explicitly accepted
- review findings are resolved or explicitly accepted
- next phase is not blocked by unresolved upstream ambiguity
