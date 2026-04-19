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
   - Run quick project lints for recently edited files (use ReadLints) and summarize any new linter errors that would be committed. Detailed formatting, linting, and secret-scanning are handled by the deterministic commit flow below.
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

Deterministic commit flow (fully deterministic; the assistant follows these exact steps every time):

Overview: the assistant executes a fixed sequence of checks and fixes. It will only pause and prompt the user for explicit confirmation in the three deterministic failure cases: (A) repository inconsistent (merge/rebase/conflict), (B) probable secret detected by the secret scanner, or (C) non-fixable linter errors or large files (>5MB). All other steps are automatic and reproducible.

Steps (exact order):

1) Repository sanity
   - Run: `git status --porcelain --branch`.
   - If output indicates an in-progress merge/rebase or unresolved conflicts, abort and report the state. Do not attempt corrections or prompt for decisions — the user must resolve and re-run `/commit`.

2) Gather changed files
   - Run: `git diff --name-only HEAD` to list working-tree changes (modified) and `git ls-files --others --exclude-standard` for untracked files.
   - The assistant will operate on the combined set of changed + untracked files.

3) Formatters and auto-fix linters (deterministic rules)
   - Determine file groups by extension:
     - JS/TS: .js .jsx .ts .tsx .json .css .scss .html
     - Java: .java
     - Python: .py
     - Docs: .md .rst
   - Run these commands in this exact order (only on the files in the changed set):
     a) JS/TS group: `npx prettier --write <file1> <file2> ...` then `npx eslint --fix <file1> <file2> ...`
     b) Java group: `./gradlew --no-daemon spotlessApply --quiet` (applies formatting) — if Gradle is unavailable, skip and note it.
     c) Python group: `python -m black <file1> <file2> ...` then `python -m isort <file1> <file2> ...`
     d) Docs: `npx prettier --write <docs files>`
   - After running each command, run `git add` on the affected files to include auto-fixed changes.
   - These commands are always run automatically; if they modify files, the assistant stages the modifications automatically and continues (no prompt).

4) Linter verification (deterministic)
   - Run linters (non-fix mode) on the changed set in this order:
     a) `npx eslint --ext .js,.jsx,.ts,.tsx <files>`
     b) `./gradlew --no-daemon check --quiet` (Java checks)
     c) `python -m flake8 <files>`
   - If any linter reports errors that were not auto-fixed, this is a deterministic failure: pause, present a concise JSON-style summary (file, rule, count) and require explicit user confirmation to continue. The assistant must not proceed without that confirmation.

5) Secret scan (deterministic)
   - Run: `git add -A` (to ensure staged diff reflects current state) then `git diff --staged | gitleaks detect --stdin`.
   - If the scanner finds any probable secrets, pause and present masked excerpts and remediation steps. Require explicit user confirmation to continue. Do not auto-redact or transmit secret content.

6) Large-file check
   - Inspect staged files for size > 5MB. If any are found, pause and require explicit confirmation to continue.

7) Commit message generation (value-focused, deterministic template)
    - High-level rule: commit messages must describe the value delivered (why, impact) rather than simply enumerating file changes. The assistant deterministically infers the primary value from the changed code (bug fix, feature, performance improvement, refactor, docs, tests) and composes a concise, human-friendly message focused on the outcome.
    - Header (one-line): choose a conventional prefix (`feat:`, `fix:`, `perf:`, `refactor:`, `docs:`, `test:`, `style:`, `chore:`) based on the inferred value, then a short scope and value-oriented description. Examples:
       - `fix(auth): prevent token leak during login` (value: security/bug fix)
       - `perf(worldgen): reduce map generation CPU by 30%` (value: performance)
       - `feat(export): add PNG export option for maps` (value: new capability)
    - Body (structured, deterministic): always follow this exact block order and phrasing. Fill fields deterministically using the repo context and diffs.
       1. `Why:` — one concise sentence describing the user/business/developer value (e.g., "Fixes a race that could drop user sessions", "Adds export capability for end-users").
       2. `What:` — one-line summary of the change (implementation-neutral; no file lists). If necessary, include one short note about scope (e.g., "applies to map export flow").
       3. `Impact:` — short bullet(s) explaining who/what benefits and any backward-compatibility notes.
       4. `Test:` — deterministic test steps or automated checks run (e.g., "Ran `./gradlew test` and verified export image matches expected hash").
    - Footer (appendix, optional): include a deterministic, machine-friendly appendix containing the list of changed files and the exact commands run (for audit); this must not be used as the primary message content. Example appendix header: `--- Audit: files & commands` followed by the lists.

8) Commit step (deterministic)
   - If no pause conditions were triggered, run: `git add -A` then `git commit -m "<header>\n\n<body>"`.
   - Report the commit short hash and the list of changed files.

Audit & logging
   - The assistant logs the exact commands run, their exit codes, and the diffs produced (or summarized diffs if large). These logs are presented after the commit completes.

Prompting and failure cases (only three deterministic pause points)
   - Case A: repository inconsistent (merge/rebase/conflicts) — abort and require user fix.
   - Case B: gitleaks reports probable secrets — pause, show masked excerpts, require confirmation.
   - Case C: linters report non-fixable errors or large files found (>5MB) — pause and require confirmation.

Policy overrides
   - If a repository contains a policy file at `.github/commit-policy.yml` that defines a stricter required flow, the assistant stops and reports the policy; it will not auto-adapt the flow without explicit user approval to follow the repo policy.
5. On user approval:
   - Stage files (`git add -A`) and create the commit (`git commit -m "<final message>"`).
   - Report the new commit short hash and updated branch status (e.g., ahead/behind origin).

Rules & constraints:
- Never push to any remote automatically. Pushing requires explicit user permission.
- If secrets or files flagged by the project's `.gitignore` are staged, warn and require explicit confirmation before committing.
- If linter errors are present in the staged changes, summarize them and ask whether to proceed.
- Keep commit messages focused on the "why" and include minimal necessary "what". Prefer small, focused commits.

Examples: see `.github/skills/commit/EXAMPLES.md` for concise usage examples.

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
 
