---
name: docker-scout
description: Scan Dockerfiles and container images for known vulnerabilities using `docker scout quickview`.
argument-hint: docker-scout
user-invocable: false
---

Purpose

- Provide a focused check that inspects `Dockerfile` artifacts and repository container images (when available) for known vulnerabilities using Docker Scout's `quickview` command.

Behavior

- Detect `Dockerfile` files in the repository root and subdirectories. If no `Dockerfile` is present, the skill will no-op with exit code `0` and a brief note.
- For each detected `Dockerfile` (or the repository root when a `Dockerfile` is at root) the skill will invoke Docker Scout directly (no wrapper scripts). The skill should prefer machine-readable output (JSON) when available and will parse that output to produce a concise report. Example invocation form (tooling may require an explicit artifact scheme):

    docker scout quickview --output json fs://<path>

  The skill must not print or suggest extra ad-hoc shell commands unless they are strictly required for triage. When remediation actions are needed, the skill will present exact, minimal remediation steps. Any attempt to *apply* fixes must only occur when the caller provided `--fix` to the `checks` orchestrator; otherwise the skill will only report and recommend fixes.

- The skill should capture and parse JSON output when available to produce a concise human-readable summary mapping vulnerable packages to advisories (CVE/GHSA/OSV) and suggested remediations.
- If `docker` or `docker scout` are not present in PATH or the Docker daemon is unreachable, the skill MUST return an exit code indicating the scanner could not run (see exit codes) and include clear remediation steps (install Docker, sign in to Docker Hub if required, or install Docker Scout CLI plugin).

Robustness

- Use sensible timeouts for the command (default ~60s per invocation) and surface transient network errors as retriable information in the report.
- Continue scanning other Dockerfiles even if one invocation fails; aggregate results and per-file statuses in the final report.

Exit codes

- `0` — no vulnerabilities detected in scanned Dockerfiles/contexts.
- `9` — vulnerabilities found that require human review (assistant must pause and present summary and remediation options).
- `10` — scanner could not be invoked (missing `docker`/`docker scout` or Docker daemon unavailable); report what was tried and how to fix it.
- other non-zero — execution error; include raw logs.

Output

- The human-readable summary must include:
  - which Dockerfile(s) were scanned (path links when possible),
  - per-context list of found vulnerabilities: package/component, installed/base version, severity, advisory ID and link, and suggested remediation (e.g., update base image tag or rebuild image with patched base),
  - actionable remediation commands where strictly necessary for human triage (for example: `# update base image in Dockerfile: FROM ubuntu:22.04 -> FROM ubuntu:22.04@sha256:<patched>`). The skill will avoid recommending general convenience commands unless they are required to verify a remediation.
  - a short "Next steps" section advising CI scans, pinning base images, and re-running `docker scout quickview` after fixes.

Notes

- The skill must not attempt automatic remediation or create commits. It will provide exact commands and diffs (if applicable) for human review, but will only attempt to run remediation steps when the caller explicitly supplied `--fix` to `checks`. Even then, any file modifications remain uncommitted and the skill must present diffs and require explicit confirmation before committing or pushing.
- The skill is intentionally minimal: it relies on `docker scout quickview` output and does not attempt to re-implement vulnerability databases.
