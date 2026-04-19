#!/usr/bin/env bash
set -euo pipefail

# run_checks.sh
# Runs formatters, auto-fix linters and a secret scan on the deterministic "changed_set" (Added/Modified + untracked).
# Designed as a concrete helper the assistant can invoke; configurable via environment variables when the project prefers different tools.

# Configuration (override with env vars):
: ${PRETTIER_CMD:="npx prettier --write"}
: ${ESLINT_CMD:="npx eslint --fix --ext .js,.jsx,.ts,.tsx"}
: ${PY_BLACK_CMD:="python -m black"}
: ${PY_ISORT_CMD:="python -m isort"}
: ${PY_FLAKE_CMD:="python -m flake8"}
: ${GRADLEW_CMD:="./gradlew --no-daemon"}
: ${SECRET_SCANNER_CMD:="gitleaks detect --stdin"}

echo "[run_checks] Computing changed_set (Added/Modified + untracked)"
changed=$(git diff --name-only --diff-filter=AM HEAD || true)
untracked=$(git ls-files --others --exclude-standard || true)

# combine and deduplicate
changed_set=$(printf "%s\n%s" "$changed" "$untracked" | awk 'NF' | sort -u)
if [ -z "$(echo "$changed_set" | tr -d '\n')" ]; then
  echo "[run_checks] No added/modified or untracked files to process. Exiting success."
  exit 0
fi

echo "[run_checks] Files to process:"
echo "$changed_set"

# helpers to filter by extension
filter_ext() {
  ext_pattern="$1"
  echo "$changed_set" | grep -E "$ext_pattern" || true
}

js_files=$(filter_ext '\\.(js|jsx|ts|tsx|json|css|scss|html)$')
java_files=$(filter_ext '\\.(java)$')
py_files=$(filter_ext '\\.(py)$')
doc_files=$(filter_ext '\\.(md|rst)$')

# Run JS/TS formatters & auto-fixers
if [ -n "$js_files" ]; then
  echo "[run_checks] Running Prettier on JS/TS files"
  # shellcheck disable=SC2086
  $PRETTIER_CMD $(echo "$js_files" | tr '\n' ' ')
  echo "[run_checks] Running ESLint --fix on JS/TS files"
  # shellcheck disable=SC2086
  $ESLINT_CMD $(echo "$js_files" | tr '\n' ' ')
  git add $(echo "$js_files" | tr '\n' ' ')
fi

# Run Java formatter if Java files present and gradlew exists
if [ -n "$java_files" ]; then
  if [ -x "${GRADLEW_CMD%% *}" ] || [ -f "gradlew" ]; then
    echo "[run_checks] Running Gradle formatting/checks for Java files"
    $GRADLEW_CMD spotlessApply --quiet || true
    # Stage any formatted files
    git add $(echo "$java_files" | tr '\n' ' ')
  else
    echo "[run_checks] Gradle wrapper not found or not executable; skipping Java format step"
  fi
fi

# Python formatters
if [ -n "$py_files" ]; then
  echo "[run_checks] Running Black on Python files"
  $PY_BLACK_CMD $(echo "$py_files" | tr '\n' ' ')
  echo "[run_checks] Running isort on Python files"
  $PY_ISORT_CMD $(echo "$py_files" | tr '\n' ' ')
  git add $(echo "$py_files" | tr '\n' ' ')
fi

# Docs formatting
if [ -n "$doc_files" ]; then
  if command -v npx >/dev/null 2>&1; then
    echo "[run_checks] Running Prettier on docs"
    $PRETTIER_CMD $(echo "$doc_files" | tr '\n' ' ')
    git add $(echo "$doc_files" | tr '\n' ' ')
  else
    echo "[run_checks] npx not available; skipping docs formatting"
  fi
fi

# Run linters (non-fix mode) on changed_set. Use project's canonical tools when configured.
lint_failed=0

if [ -n "$js_files" ]; then
  if command -v npx >/dev/null 2>&1; then
    echo "[run_checks] Running ESLint (check-only) on JS/TS files"
    # run check-only (non-fix) to detect remaining errors
    if ! npx eslint --ext .js,.jsx,.ts,.tsx $(echo "$js_files" | tr '\n' ' '); then
      lint_failed=1
    fi
  else
    echo "[run_checks] npx not available; skipping eslint check"
  fi
fi

if [ -n "$java_files" ]; then
  if [ -f "gradlew" ] || command -v gradle >/dev/null 2>&1; then
    echo "[run_checks] Running Gradle check (Java)"
    if ! $GRADLEW_CMD check --quiet; then
      lint_failed=1
    fi
  else
    echo "[run_checks] Gradle wrapper not found; skipping Java check"
  fi
fi

if [ -n "$py_files" ]; then
  if python -c 'import sys' >/dev/null 2>&1; then
    echo "[run_checks] Running flake8 on Python files"
    if ! $PY_FLAKE_CMD $(echo "$py_files" | tr '\n' ' '); then
      lint_failed=1
    fi
  else
    echo "[run_checks] Python not available; skipping flake8"
  fi
fi

if [ "$lint_failed" -ne 0 ]; then
  echo "{\"status\":\"lint_failed\",\"message\":\"Linters reported non-fixable errors.\"}"
  exit 2
fi

# Secret scan (attempt configured scanner; fail-fast on findings)
# Ensure staged state is current
git add -A
if command -v gitleaks >/dev/null 2>&1; then
  echo "[run_checks] Running gitleaks on staged diff"
  if ! git diff --staged | gitleaks detect --stdin; then
    echo "{\"status\":\"secrets_found\",\"message\":\"Secret scanner detected probable secrets.\"}"
    exit 3
  fi
else
  echo "[run_checks] gitleaks not found; skipping secret scan. To require a scan, set SECRET_SCANNER_CMD or install a scanner."
fi

# Large file check (>5MB)
large_files=$(git ls-files --stage | awk '{print $4}' | xargs -I{} bash -c 'if [ -f "{}" ] && [ $(stat -f%z "{}") -gt $((5*1024*1024)) ]; then echo "{}"; fi' 2>/dev/null || true)
if [ -n "$large_files" ]; then
  echo "{\"status\":\"large_files\",\"files\":[$(echo "$large_files" | awk '{printf "\"%s\",", $0}' | sed 's/,$//')] }"
  exit 4
fi

echo "[run_checks] All checks passed. Ready to commit."
exit 0
