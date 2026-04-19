---
name: commit
description: Interactive `/commit` assistant command: propose commit message from git diff, stage all changes, and commit after confirmation.
argument-hint: commit
user-invocable: true
---

When the user invokes the `/commit` command, the assistant will:

1. Inspect the repository and working tree:
   - Run `git status --porcelain --branch` to get branch status and changed files.
   - Run `git diff --name-status HEAD` to list changed file paths and operations.
   - Optionally show the unified diff for specific files on request.
2. Run quick safety checks:
   - Detect obvious secrets or sensitive files (e.g. `.env`, credentials) and warn the user instead of committing them automatically.
    - Run project lints for recently edited files (use ReadLints) and summarize any new linter errors that would be committed.
    - Run code formatters and linters as appropriate for the repository before committing. Examples:
       - Web/JS/TS: run Prettier then ESLint. Suggested commands:
          - `npx prettier --check .` (check formatting)
          - `npx prettier --write .` (optionally fix formatting)
          - `npx eslint . --ext .js,.jsx,.ts,.tsx` (check lint issues)
          - `npx eslint . --ext .js,.jsx,.ts,.tsx --fix` (optionally auto-fix lintable issues)
       - Java: prefer the project's Gradle formatting tasks (Spotless/Eclipse formatter). Suggested commands:
          - `./gradlew spotlessCheck` (verify formatting)
          - `./gradlew spotlessApply` (apply formatting fixes)
          - `./gradlew check` (run general verification and tests)
       - Other languages: run the project's configured formatter/linter (e.g., `black`/`flake8` for Python, `gofmt`/`golangci-lint` for Go).
    - If auto-fix commands are offered, present changes to the user and require confirmation before staging/committing the fixes.
   - Run a robust secret scan using a world-class scanner (recommended: Gitleaks). Scan staged diffs and any form/CI-submitted inputs for API keys, tokens, private keys, or other secrets. If secrets are detected, warn clearly and require explicit user confirmation before proceeding. Suggested commands:
     - `gitleaks detect --source . --verbose` (scan repository)
     - `git diff --staged | gitleaks detect --stdin` (scan staged diff)
     - Fallback tools: `truffleHog`, `git-secrets`, or equivalent organizational scanners.
3. Synthesize a detailed, human-friendly commit message:
   - Produce a one-line header using conventional prefixes (e.g. `feat:`, `fix:`, `chore:`) plus a concise scope and short description.
   - Provide a multi-line body (2–8 lines) explaining the rationale and high-level changes — focus on why the change was made and any important notes for reviewers.
   - When appropriate, include a brief test plan or mention of follow-up tasks.
4. Present the proposed commit message and summary to the user and ask for action:
   - Confirm: commit with the suggested message.
   - Edit: provide an edited message to use instead.
   - Inspect: request diffs or file lists before deciding.
   - Cancel: abort without making changes.
5. On user approval:
   - Stage files (`git add -A`) and create the commit (`git commit -m "<final message>"`).
   - Report the new commit short hash and updated branch status (e.g., ahead/behind origin).

Rules & constraints:
- Never push to any remote automatically. Pushing requires explicit user permission.
- If secrets or files flagged by the project's `.gitignore` are staged, warn and require explicit confirmation before committing.
- If linter errors are present in the staged changes, summarize them and ask whether to proceed.
- Keep commit messages focused on the "why" and include minimal necessary "what". Prefer small, focused commits.

Example flows:
- Quick commit:
  - User: `/commit`
  - Assistant: shows status/diff, proposes a one-line header + short body, user replies "Yes" → assistant commits.
- Edit message:
  - User: `/commit`
  - Assistant: proposes message, user replies "Edit: fix: normalize newline handling in parser\n\nFixes inconsistent CRLF behavior across platforms." → assistant commits with the edited message.

Implementation notes for the assistant:
- Use `ReadLints` to check recent edits for linter issues before committing.
- If the repository contains very large files (>5MB) in the staged set, warn the user and request confirmation.
- Always display the commit hash and a concise summary of changed files after committing.
- If the helper script `.github/skills/commit/commit.sh` exists, prefer invoking it to perform the actual `git add` and `git commit` steps. Invoke it by piping the finalized commit message to stdin (example below). The script already performs a basic `.env` check; still run the secret and large-file scans described above before calling it.

   Example invocation:

   echo "<commit message>" | .github/skills/commit/commit.sh

Implementation guidance:
- Prefer integrating a proven secret-scanning step (Gitleaks) into the pre-commit/CI path the assistant recommends. When offering to commit, the assistant should run the scanner locally first and surface any matches with context (file, line, snippet) and recommended remediation (redact, rotate, move to secret store).
- If the repository or org provides a managed secret-scanning service or policy, prefer that and surface its findings instead of local-only scans.
- Never attempt to exfiltrate or transmit suspected secret contents; only present masked excerpts and clear remediation steps to the user.
 - Format & lint guidance:
   - Run configured formatters and linters before proposing a commit. If the repo exposes `package.json` scripts (e.g., `npm run format` or `npm run lint`) or Gradle tasks (`spotlessApply`), prefer those.
   - When automatic fixes are available (`prettier --write`, `eslint --fix`, `spotlessApply`), ask the user whether to run them and show the resulting diff before staging.
   - If formatter or linter checks fail and the user still wants to proceed, require explicit confirmation to commit with known issues.
   - Prefer local, deterministic tools; if linters are slow, run checks only on changed files to save time.
