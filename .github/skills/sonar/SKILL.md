---
name: sonar
description: Interactive `/sonar` assistant command: run Sonar analysis, query issues or hotspots, and prepare small, deterministic repair suggestions.
argument-hint: sonar
user-invocable: true
---

Purpose
-------
Automate common SonarQube tasks for maintainers via the SonarQube MCP server: query project issues, query Security Hotspots, request targeted file analysis, and prepare reversible, pattern-based repair suggestions for simple problems.

Prerequisites
-------------
- Access to the SonarQube MCP server used by your organization. The skill uses the workspace's MCP integration rather than a local `sonar-scanner`.
- A Sonar user token with appropriate permissions available to the MCP service or configured in the MCP connection. Local `SONAR_TOKEN`/`SONAR_HOST_URL` are optional when the MCP integration already provides credentials.
- The workspace must have the SonarQube MCP tools available to the assistant (MCP operations such as `mcp_sonarqube_search_sonar_issues_in_projects`, `mcp_sonarqube_search_security_hotspots`, `sonarqube_analyze_file`, and `sonarqube_exclude_from_analysis`).

Behavior Overview
-----------------
- `scan` action: asks the SonarQube MCP to run or schedule analysis. When a full server scan is not available, the skill will invoke targeted file analysis via `sonarqube_analyze_file` for modified files.
- `query` action: uses the MCP `mcp_sonarqube_search_sonar_issues_in_projects` call to list issues for given `projectKeys`, `rules`, or explicit `issue` keys. By default the query uses `resolved=false`.
- `hotspots` action: uses the MCP `mcp_sonarqube_search_security_hotspots` call to list Security Hotspots.
- Fallback behavior: if an issues query returns zero results, the skill will (by default) call the Hotspots MCP call to surface security hotspots that are not represented as regular issues. Pass `--no-hotspots` to disable this fallback.

Commands and Flags
------------------
- `/sonar scan` — request the MCP to run or schedule a server analysis and report outcome; if unsupported, the skill will perform targeted file analysis via `sonarqube_analyze_file` and report results.
- `/sonar scan --include-resolved` — include resolved/closed issues when querying.
- `/sonar query --rule <ruleKey>` — query for unresolved issues matching a rule (e.g., `javascript:S5852`) using `mcp_sonarqube_search_sonar_issues_in_projects`.
- `/sonar repair --issue <issueKey>` — prepare a suggested, reversible textual patch for the specified issue (assistant will ask for confirmation before applying edits). Uses MCP issue data and `sonarqube_analyze_file` to re-run analysis after edits.
- `/sonar repair --rule <ruleKey> [--limit N]` — prepare suggested, reversible textual patches for the first `N` unresolved issues matching `ruleKey` (defaults to `N=10`) via MCP queries. The assistant will list targeted issues, propose per-file patches, and ask for confirmation before applying any edits.
- `/sonar --hotspots` — explicitly fetch hotspots via the MCP hotspots method (`mcp_sonarqube_search_security_hotspots`).
- `--no-hotspots` — opt out of automatic hotspots fallback when an issues search returns no results.

What the skill returns
----------------------
- For issues: `component`, `textRange`, `message`, `rule`, `severity`, and `quickFixAvailable` (when the MCP provides it).
- For hotspots: `key`, `component`, `line`, `message`, `status`, and `ruleKey`.

Repair Assistance
Repair-by-rule behavior
-----------------------
- When invoked with `--rule`, the skill will:
	- call the MCP issue search (`mcp_sonarqube_search_sonar_issues_in_projects`) to find unresolved issues matching the provided rule for the configured project(s)
	- if the query returns zero results, automatically fetch Security Hotspots via the MCP hotspots method (unless `--no-hotspots`) and present them for manual review
	- for each matching issue (up to `--limit`), attempt a conservative, textual quick-fix template when a deterministic substitution is available
	- skip and report any issue where a safe replacement cannot be determined
	- group suggested edits by file and present a per-file patch summary for interactive confirmation before applying edits

Operational steps when applying patches
--------------------------------------
- Before making edits: the skill will attempt to use the MCP `sonarqube_exclude_from_analysis` or an automatic-analysis toggle API to disable automatic analysis if the MCP exposes it, preventing intermediate events while edits are staged.
- The skill will prepare WorkspaceEdit-style patches and prompt the user to confirm which patches to apply.
- After applying patches locally, the skill MUST call the MCP `sonarqube_analyze_file` (or an `analyze_file_list` helper, if available) to re-analyze the modified files.
- Finally, the skill will re-enable automatic analysis via the MCP toggle API if it was disabled.

Notes on Hotspots fallback
-------------------------
- The documented fallback is: when an issues `--rule` query returns no results, the skill will (by default) call the MCP hotspots method and surface any Security Hotspots. Hotspots are presented for manual review only — the skill will not attempt automated fixes for hotspots.

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
- If MCP calls fail, check the MCP connection and that the assistant has access to the SonarQube MCP tools in the workspace. Ensure the MCP service has the necessary Sonar credentials.
- If hotspot calls return 401/403 via the MCP, ensure the token configured in the MCP has Hotspot viewing permissions in SonarQube (user token, not a project token).

Notes for Maintainers
---------------------
- Review patches locally before committing. The skill intentionally avoids automatic commits or pushes.
- If you want the skill to always include hotspots in queries, use `--hotspots` explicitly; automatic fallback occurs only when an issues query returns zero results.

Implementation guidance for integrators
--------------------------------------
- The assistant will use the workspace MCP functions when available. Integrators should ensure the MCP exposes these operations to the assistant: `mcp_sonarqube_search_sonar_issues_in_projects`, `mcp_sonarqube_search_security_hotspots`, `sonarqube_analyze_file`, `sonarqube_exclude_from_analysis`, and `sonarqube_analyze_file`/`analyze_file_list` helpers.
- If the MCP does not support full-server scan triggering, the skill will fall back to invoking `sonarqube_analyze_file` on the modified files and then re-query issues.
