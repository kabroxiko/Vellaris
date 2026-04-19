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
   - Run a secret-scan using the repository-or-organization-configured scanner. Scan staged diffs (and repository-supplied inputs where policy requires) for API keys, tokens, private keys, or other secrets. If probable secrets are detected, warn clearly with masked excerpts and require explicit user confirmation before proceeding. Do not assume a specific scanner; prefer the tool the project or organization designates.
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

1. Repository sanity
   - Run: `git status --porcelain --branch`.
   - If output indicates an in-progress merge/rebase or unresolved conflicts, abort and report the state. Do not attempt corrections or prompt for decisions — the user must resolve and re-run `/commit`.

2. Gather changed files
   - Run: `git diff --name-only --diff-filter=AM HEAD` to list files that are Added or Modified relative to HEAD, and `git ls-files --others --exclude-standard` to include untracked files. Combined, this yields the deterministic "new & modified" file set the assistant will operate on (deleted files are excluded).
   - The assistant records this file list as `changed_set` and will use it for all subsequent formatter/linter/scan steps.

3. Formatters, linters, secret-scan and checks (script-required)
   - Repository requirement: The repository MUST contain the helper script at `.github/skills/commit/run_checks.sh`. The script is a mandatory dependency for the assistant's `/commit` flow; if the file is missing the assistant MUST abort and request that the user add the script. The assistant must not proceed with per-tool invocations or fallbacks when the script is absent.
   - Execution behavior: when the script is present, the assistant MUST invoke it with the repository root as CWD. If the script exists but is not executable, the assistant MAY offer to make it executable (`chmod +x .github/skills/commit/run_checks.sh`) and re-run it; if the user declines or making it executable fails, the assistant must abort and report the error.
   - Interpret `run_checks.sh` exit codes as follows:
     - `0`: all checks passed — proceed with commit.
     - `2`: linters reported non-fixable errors — pause and require explicit confirmation to continue.
     - `3`: secret scanner found probable secrets — pause and require explicit confirmation to continue.
     - `4`: large files detected (>5MB) — pause and require explicit confirmation to continue.
     - other non-zero: treat as failure, present logs, and abort.
   - No fallback: the assistant must not substitute per-tool commands for the missing script. The repository owner or maintainer must add the required script; the assistant may offer to create a suggested template only after explicit user approval.

4. Commit message generation and commit step remain unchanged. The assistant treats the presence of the script as a hard requirement and will not proceed until the script is added or the user explicitly instructs creation of the script.

5. Commit message generation (value-focused, deterministic template)
   - High-level rule: commit messages must describe the value delivered (why, impact) rather than simply enumerating file changes. The assistant deterministically infers the primary value from the changed code (bug fix, feature, performance improvement, refactor, docs, tests) and composes a concise, human-friendly message focused on the outcome.
   - Header (one-line): choose a conventional prefix (`feat:`, `fix:`, `perf:`, `refactor:`, `docs:`, `test:`, `style:`, `chore:`) based on the inferred value, then a short scope and value-oriented description. Examples:
     - `fix(auth): prevent token leak during login` (value: security/bug fix)
     - `perf(worldgen): reduce map generation CPU by 30%` (value: performance)
     - `feat(export): add PNG export option for maps` (value: new capability)
   - Body (structured, deterministic): always follow this exact block order and phrasing. Fill fields deterministically using the repo context and diffs.
     1. `Why:` — one concise sentence describing the user/business/developer value (e.g., "Fixes a race that could drop user sessions", "Adds export capability for end-users").
     2. `What:` — one-line summary of the change (implementation-neutral; no file lists). If necessary, include one short note about scope (e.g., "applies to map export flow").
     3. `Impact:` — short bullet(s) explaining who/what benefits and any backward-compatibility notes.
     4. `Test:` — deterministic test steps or automated checks run (e.g., "Ran the project's canonical test command and verified expected outcomes").
   - Footer: do not include any appendix, file lists, command invocations, or audit information in the commit message. Commit messages must contain only the header and the structured body (`Why:`, `What:`, `Impact:`, `Test:`).

6. Commit step (deterministic)
   - Repository requirement: The repository MUST contain the helper script at `.github/skills/commit/commit.sh` to perform the final staging and commit step. If the file is missing the assistant MUST abort and request that the user add the script. The assistant must not run `git add`/`git commit` directly when the script is present.
   - Execution behavior: when the script is present, the assistant MUST invoke it by piping the finalized commit message to stdin from the repository root, e.g.:

     echo "<commit message>" | .github/skills/commit/commit.sh

     If the script exists but is not executable, the assistant MAY offer to make it executable (`chmod +x .github/skills/commit/commit.sh`) and re-run it; if the user declines or making it executable fails, the assistant must abort and report the error.

   - Interpret `commit.sh` exit codes: `0` indicates success — report the commit short hash and list of changed files; any non-zero exit code must be treated as failure, present the script logs, and abort.
   - If `commit.sh` is absent, do not substitute `git` commands. The assistant may offer to create a suggested `commit.sh` template only after explicit user approval.

AUDIT LOGGING

- Audit records (changed files, commands run, exit codes) must never be embedded into the git commit message. The assistant may keep separate audit logs outside of the commit message for traceability, but these must not be added to the commit or its footer.

Prompting and failure cases (only three deterministic pause points)

- Case A: repository inconsistent (merge/rebase/conflicts) — abort and require user fix.
- Case B: secret scanner reports probable secrets — pause, show masked excerpts, require confirmation.
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
- The repository MUST provide `.github/skills/commit/commit.sh` to perform the final staging and commit step. The assistant MUST pipe the finalized commit message to the script's stdin to perform the commit and must not run `git add`/`git commit` itself when the script exists. The script is expected to perform any final checks (for example, refusing an unsafe commit) and to exit with `0` on success. If the script is missing, the assistant must abort and request it be added, or ask for explicit permission to create a recommended template.

Helper script: `run_checks.sh`

- If present, prefer invoking `.github/skills/commit/run_checks.sh` prior to committing to perform deterministic, concrete checks (formatters, auto-fix linters, linters, secret-scan, large-file check) on the repository's new & modified files. The assistant should run this script and interpret exit codes:
  - `0`: all checks passed — proceed with commit.
  - `2`: linters reported non-fixable errors — pause and require explicit confirmation.
  - `3`: secret scanner found probable secrets — pause and require explicit confirmation.
  - `4`: large files detected (>5MB) — pause and require explicit confirmation.
  - other non-zero: treat as failure and abort with details.
- The script is configurable via environment variables to select concrete tools (for example: `PRETTIER_CMD`, `ESLINT_CMD`, `PY_BLACK_CMD`, `SECRET_SCANNER_CMD`). When invoking the script, prefer the project's defaults but allow overrides when the repository specifies alternative tooling.

Behavior when no ESLint config exists:

- If `run_checks.sh` detects JS/TS changes in the deterministic `changed_set` and there is no repository ESLint configuration, it will prompt the user (interactive runs) asking whether to create a default `eslint.config.js` at the repository root. This default is a minimal flat-config that enables linting for `*.js,*.jsx,*.ts,*.tsx` files.
- For non-interactive runs (CI or plumbing), the script will not prompt; to auto-create a default config in that mode, set the environment variable `AUTO_CREATE_ESLINT_CONFIG=1` before invoking the script.
- If the user approves creation, the script will create and stage `eslint.config.js` and then run ESLint using that config. If the user declines (or auto-create is not enabled), the script will run ESLint with internal/default resolution and warn that repository-level customization is recommended.

Requisite: ESLint configuration richness

- The repository's ESLint configuration must be "richer" than a bare minimum. "Richer" means the config should include appropriate parser and plugin settings so ESLint can parse modern JavaScript, JSX, and TypeScript files (for example, a parser such as `@babel/eslint-parser` or `@typescript-eslint/parser`, and plugins such as `eslint-plugin-react` or `@typescript-eslint`).
- When `run_checks.sh` creates a default `eslint.config.js`, it will generate a richer starter configuration that includes parser/plugin entries suitable for JSX/TSX and modern syntax. The script will stage the file and will also emit clear guidance and recommended `npm` install commands for any required devDependencies. CI users should set `AUTO_CREATE_ESLINT_CONFIG=1` if they want the richer config created automatically.
- If the richer config references parsers or plugins that are not installed, the script will surface a clear error message and instructions for installing the missing devDependencies; the assistant will not silently assume those dependencies are present.

Implementation guidance:

- Prefer integrating a proven secret-scanning step (the project or organization's designated scanner) into the pre-commit/CI path the assistant recommends. When offering to commit, the assistant should run the configured scanner locally first and surface any matches with context (masked excerpts) and recommended remediation (rotate, move to secret store).
- If the repository or org provides a managed secret-scanning service or policy, prefer that and surface its findings instead of local-only scans.
- Never attempt to exfiltrate or transmit suspected secret contents; only present masked excerpts and clear remediation steps to the user.
