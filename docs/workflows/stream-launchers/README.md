# One-Touch Codex Stream Launchers

Double-click the matching `.command` file in Finder.

Each launcher:

- checks the expected worktree exists
- checks the expected branch is active
- stops on dirty worktree state except local `.codex/notes` or `.codex/local` notes
- starts Codex in that worktree with the stream-specific prompt and skill set
- does not edit PR #42 / `docs/project-handoff-ledger`

Launchers:

- `launch-stream-1-business-core.command`
- `launch-stream-2-premium-ui.command`
- `launch-stream-3-ai-infra-audit.command`

Run order:

1. Start Stream 1 and Stream 3 first.
2. Stream 2 may run in parallel, but only planning/screenshot-gate work before broad UI code.
3. Do not merge stream PRs until Stream 3 has reviewed relevant truth-safety risk.
4. If conflicts appear, stop and report instead of merging scopes.
