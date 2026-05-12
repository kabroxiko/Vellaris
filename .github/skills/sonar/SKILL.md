---
name: sonar
description: Interactive `/sonar` assistant command: run Sonar analysis, query issues or hotspots, and prepare small, deterministic repair suggestions.
argument-hint: sonar
user-invocable: true
---

Purpose
-------
Automate common SonarQube tasks for maintainers: run `sonar-scanner`, query project issues, query Security Hotspots, and prepare reversible, pattern-based repair suggestions for simple problems.

Prerequisites
-------------
- `SONAR_TOKEN` environment variable with a Sonar user token available in the shell (token must have the permissions needed for the requested API calls).
- `SONAR_HOST_URL` environment variable pointing to the SonarQube instance (e.g. `https://sonarqube.example.com`).
- `sonar-scanner` installed and available on PATH (or the repo supplies a wrapper).

Behavior Overview
-----------------
- `scan` action: runs `sonar-scanner` from repository root and waits for analysis to complete.
- `query` action: calls Sonar Issues API to list issues for given `projectKeys`, `rules`, or explicit `issue` keys. By default the query uses `resolved=false`.
- `hotspots` action: calls the Hotspots API (`/api/hotspots/search`) to list Security Hotspots.
- Fallback behavior: if an issues query returns zero results, the skill will (by default) call the Hotspots API to surface security hotspots that are not represented as regular issues. Pass `--no-hotspots` to disable this fallback.

Commands and Flags
------------------
- `/sonar scan` — run `sonar-scanner` and report analysis outcome.
- `/sonar scan --include-resolved` — include resolved/closed issues when querying.
- `/sonar query --rule <ruleKey>` — query for unresolved issues matching a rule (e.g., `javascript:S5852`).
- `/sonar repair --issue <issueKey>` — prepare a suggested, reversible textual patch for the specified issue (assistant will ask for confirmation before applying edits).
- `/sonar --hotspots` — explicitly fetch hotspots via `/api/hotspots/search`.
- `--no-hotspots` — opt out of automatic hotspots fallback when an issues search returns no results.

What the skill returns
----------------------
- For issues: `component`, `textRange`, `message`, `rule`, `severity`, and `quickFixAvailable` (when the API provides it).
- For hotspots: `key`, `component`, `line`, `message`, `status`, and `ruleKey`.

Repair Assistance
-----------------
- The skill only suggests deterministic, small, reversible textual changes (no semantic AST transforms). Examples: replace `parts[parts.length-1]` with `parts.at(-1)`, replace `String.prototype.replace(/.../g)` with `replaceAll(...)` when safe, or add input-length guards before expensive regex operations.
- The assistant will prepare a patch and present a human-readable summary of the change and affected files. It will NOT apply patches without explicit user approval.

Limitations and Safety
----------------------
- Not a full refactoring tool: no complex program analysis or cross-file semantic refactors.
- Does not push commits or modify remote branches; produces patches for maintainer review.
- Hotspots API calls require additional Sonar permissions. If the token lacks hotspot access, the skill will report the error and stop the hotspot step.
- The skill favors conservative, reversible edits. If a safe textual replacement cannot be determined, the skill will surface the finding and recommend a manual review.

Examples
--------
- `/sonar scan` — run analysis and list unresolved issues.
- `/sonar query --rule javascript:S5852` — return unresolved S5852 issues; if none found, automatically query hotspots (unless `--no-hotspots`).
- `/sonar repair --issue ca827621-090b-42a4-be07-cd48f8129493` — prepare a suggested fix for the specified issue and ask for confirmation before editing files.

Troubleshooting
---------------
- If `sonar-scanner` fails, check that `SONAR_HOST_URL` and `SONAR_TOKEN` are correct and that the wrapper (if used) returns a non-zero exit code on error.
- If hotspot calls return 401/403, ensure the token has Hotspot viewing permissions in SonarQube (user token, not a project token).

Notes for Maintainers
---------------------
- Review patches locally before committing. The skill intentionally avoids automatic commits or pushes.
- If you want the skill to always include hotspots in queries, use `--hotspots` explicitly; automatic fallback occurs only when an issues query returns zero results.
