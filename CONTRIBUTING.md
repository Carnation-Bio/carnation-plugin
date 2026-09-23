# Contributing

This repository distributes Carnation's customer-facing plugin. Please open an issue before proposing a behavior change.

Keep the package thin and auditable:

- Do not add hooks, scripts, executables, credentials, or a static copy of Carnation's live step catalog.
- Keep Claude Code and Codex pointed at the same hosted MCP endpoint.
- Keep workflow guidance in `plugins/carnation/skills/carnation/SKILL.md` so both clients use one source.
- Update the portable, Codex compatibility, Claude, and marketplace versions together.
- Preserve explicit user intent before a pipeline save.

Before opening a pull request, run the JSON checks from `.github/workflows/validate.yml`, the Codex plugin validator, the skill validator, and `claude plugin validate --strict plugins/carnation`.

By contributing, you agree that your contribution is licensed under Apache License 2.0.
