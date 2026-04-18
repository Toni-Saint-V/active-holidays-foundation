# Skill Contracts

Use this matrix to keep skills from interfering with each other.

## Ownership model

Each skill has:
- one primary input
- one primary output
- one main decision it owns

If a skill is asked to operate outside that contract, route to the correct upstream or downstream skill instead.

## Contracts

### `product-os-audit`
- Input: repo reality + Notion reality
- Output: drift map + next target artifact
- Owns: diagnosis of what is out of sync

### `market-reality-product-innovation`
- Input: product bet or business decision
- Output: market-validated recommendation set
- Owns: reality-check against market and strong future bets

### `notion-ai-sync-director`
- Input: approved source pages + repo audit summary
- Output: prompt for Notion AI + Codex cleanup list
- Owns: the first broad sync pass in Notion

### `build-brief-orchestrator`
- Input: approved product direction
- Output: executor-specific briefs and handoff prompts
- Owns: task framing and separation of ownership

### `lovable-step-prompts`
- Input: approved screen contract or UI brief
- Output: one strong Lovable prompt for one step
- Owns: precise Lovable instruction writing

### `lovable-redline`
- Input: existing or planned Lovable UI result
- Output: concrete product-safe UI redline
- Owns: product/UX/visual correction of a Lovable outcome

### `ai-interactive-screen-audit`
- Input: screen or flow
- Output: AI-native and interactivity upgrade list
- Owns: deciding where intelligence and interaction add value

### `ui-motion-performance-polish`
- Input: already-correct screen
- Output: premium polish and performance hardening list
- Owns: final quality, motion, and speed pass

### `notion-catalog-sync`
- Input: authoritative Notion product knowledge
- Output: repo data / contract sync plan or changes
- Owns: moving source-of-truth data into versioned repo truth

### `bank-grade-review`
- Input: diff, code, contracts, implementation
- Output: prioritized findings
- Owns: correctness and forward-risk review

### `phase-gate-sync`
- Input: completed implementation packet
- Output: honest status outcome
- Owns: whether work can move forward

## Interference rules

- `lovable-redline` must not replace `build-brief-orchestrator`.
- `ui-motion-performance-polish` must not repair missing states or product ambiguity.
- `phase-gate-sync` must not invent completion; it only judges evidence.
- `market-reality-product-innovation` must not override approved scope silently; it informs the next decision.
- `notion-ai-sync-director` must not become repo truth; `notion-catalog-sync` owns repo truth movement.
