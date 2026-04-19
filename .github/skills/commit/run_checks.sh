#!/usr/bin/env bash
set -euo pipefail

# run_checks.sh
# Runs formatters, auto-fix linters and a secret scan on the deterministic "changed_set" (Added/Modified + untracked).
# Designed as a concrete helper the assistant can invoke; configurable via environment variables when the project prefers different tools.

# Configuration (override with env vars):
: ${PRETTIER_CMD:="npx prettier --write"}
: ${PRETTIER_FLAGS:=""}
: ${ESLINT_CMD:="npx eslint --fix --ext .js,.jsx,.ts,.tsx"}
: ${ESLINT_FLAGS:=""}
: ${ESLINT_CHECK_CMD:="npx eslint --ext .js,.jsx,.ts,.tsx"}
: ${ESLINT_CHECK_FLAGS:=""}
: ${PY_BLACK_CMD:="python -m black"}
: ${BLACK_FLAGS:=""}
: ${PY_ISORT_CMD:="python -m isort"}
: ${ISORT_FLAGS:=""}
: ${PY_FLAKE_CMD:="python -m flake8"}
: ${FLAKE_FLAGS:=""}
: ${GRADLEW_CMD:="./gradlew --no-daemon"}
: ${GRADLE_FLAGS:=""}
: ${SECRET_SCANNER_CMD:="gitleaks detect --stdin"}

# By default enable verbose flags for formatters/linters so outputs are shown to user
: ${VERBOSE:=1}
if [ "$VERBOSE" -ne 0 ]; then
  PRETTIER_FLAGS="--loglevel debug"
  ESLINT_FLAGS="--debug"
  ESLINT_CHECK_FLAGS="--debug"
  BLACK_FLAGS="-v"
  ISORT_FLAGS="-v"
  FLAKE_FLAGS="-v"
  GRADLE_FLAGS="--info"
fi

# Helper: run a command but don't exit script on failure (useful for formatters)
run_nonfatal() {
  echo "[run_checks] + $*"
  # evaluate and preserve stdout/stderr so user sees verbose output
  if ! eval "$*"; then
    echo "[run_checks] Command failed (non-fatal): $*"
  fi
}

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
js_files=$(echo "$changed_set" | grep -E '\.(js|jsx|ts|tsx|json|css|scss|html)$' || true)
java_files=$(echo "$changed_set" | grep -E '\.(java)$' || true)
py_files=$(echo "$changed_set" | grep -E '\.(py)$' || true)
doc_files=$(echo "$changed_set" | grep -E '\.(md|rst)$' || true)

echo "[run_checks-debug] js_files=<<EOF\n$js_files\nEOF"
echo "[run_checks-debug] java_files=<<EOF\n$java_files\nEOF"
echo "[run_checks-debug] py_files=<<EOF\n$py_files\nEOF"
echo "[run_checks-debug] doc_files=<<EOF\n$doc_files\nEOF"

# Detect common eslint config files (including legacy .eslintrc.* formats) and configure ESLint commands to use them.
eslint_config=""
for f in .eslintrc.js .eslintrc.cjs .eslintrc.mjs .eslintrc.json .eslintrc.yml .eslintrc.yaml package.json; do
  if [ -f "$f" ]; then
    if [ "$f" = "package.json" ]; then
      if grep -q '"eslintConfig"' package.json; then
        eslint_config="$f"
        break
      fi
    else
      eslint_config="$f"
      break
    fi
  fi
done
if [ -n "$eslint_config" ]; then
  echo "[run_checks] Found ESLint config: $eslint_config — configuring ESLint to use it"
  ESLINT_CMD="$ESLINT_CMD --config $eslint_config"
  ESLINT_CHECK_CMD="$ESLINT_CHECK_CMD --config $eslint_config"
else
  # No config found. If JS/TS files changed, ask the user whether to create a default
  # `eslint.config.js` in the repo root. When non-interactive, respect
  # `AUTO_CREATE_ESLINT_CONFIG=1` to auto-create; otherwise proceed and let ESLint
  # attempt internal/default resolution.
  if [ -n "$(echo "$js_files" | tr -d '\n')" ]; then
    echo "[run_checks] No ESLint config detected and JS/TS files changed."
    create_default="no"
    if [ -t 0 ]; then
      # Interactive terminal — ask the user
      read -r -p "[run_checks] Create a default eslint.config.js in the repo root? [y/N] " ans || ans=n
      case "$ans" in
        [Yy]* ) create_default="yes" ;;
        * ) create_default="no" ;;
      esac
    else
      # Non-interactive: allow env override
      if [ "${AUTO_CREATE_ESLINT_CONFIG:-0}" = "1" ]; then
        create_default="yes"
      else
        create_default="no"
      fi
    fi

    if [ "$create_default" = "yes" ]; then
      # Enforce presence of the canonical template shipped with the skill.
      TEMPLATE_PATH=".github/skills/commit/templates/eslint.config.js"
      if [ -f "$TEMPLATE_PATH" ]; then
        echo "[run_checks] Copying ESLint template from $TEMPLATE_PATH to ./eslint.config.js"
        cp "$TEMPLATE_PATH" eslint.config.js
      else
        echo "{\"status\":\"config_missing\",\"message\":\"Required ESLint template missing: $TEMPLATE_PATH. Add the template before running checks.\"}"
        echo "[run_checks] ERROR: Required ESLint template missing at $TEMPLATE_PATH. Aborting."
        exit 1
      fi
      # Ensure the parser/plugin devDependencies required by the template are available.
      if command -v node >/dev/null 2>&1; then
        if node -e "require.resolve('@babel/eslint-parser')" >/dev/null 2>&1; then
          echo "[run_checks] @babel/eslint-parser already available"
        else
          echo "[run_checks] @babel/eslint-parser not found; attempting to install required devDependencies"
          if command -v npm >/dev/null 2>&1; then
            echo "[run_checks] Installing with npm..."
            npm install --save-dev @babel/core @babel/eslint-parser eslint-plugin-react
          elif command -v yarn >/dev/null 2>&1; then
            echo "[run_checks] Installing with yarn..."
            yarn add --dev @babel/core @babel/eslint-parser eslint-plugin-react
          else
            echo "{\"status\":\"install_failed\",\"message\":\"npm or yarn not available to install ESLint devDependencies.\"}"
            echo "[run_checks] ERROR: npm/yarn not found; cannot install ESLint devDependencies. Aborting."
            exit 1
          fi
          # re-check installation
          if ! node -e "require.resolve('@babel/eslint-parser')" >/dev/null 2>&1; then
            echo "{\"status\":\"install_failed\",\"message\":\"Failed to install @babel/eslint-parser.\"}"
            echo "[run_checks] ERROR: installation completed but parser still not resolvable. Aborting."
            exit 1
          fi
        fi
      else
        echo "[run_checks] node not available; cannot verify or install ESLint parser. Aborting."
        exit 1
      fi
      # Do not stage files automatically; leave staging to the user for review
      eslint_config="eslint.config.js"
      ESLINT_CMD="$ESLINT_CMD --config $eslint_config"
      ESLINT_CHECK_CMD="$ESLINT_CHECK_CMD --config $eslint_config"
      echo "[run_checks] Created eslint.config.js from template. You can customize rules and commit the file."
      echo "[run_checks] Recommended devDependencies for this template:"
      echo "  npm install --save-dev @babel/core @babel/eslint-parser eslint-plugin-react"
      echo "  (or: yarn add --dev @babel/core @babel/eslint-parser eslint-plugin-react)"
    else
      echo "[run_checks] Not creating a config; running ESLint with internal defaults. Set AUTO_CREATE_ESLINT_CONFIG=1 to auto-create in non-interactive runs."
      eslint_config=""
    fi
  else
    echo "[run_checks] No ESLint config detected; no JS/TS changes in changed_set — skipping config creation."
    eslint_config=""
  fi
fi

# Run JS/TS formatters & auto-fixers
if [ -n "$js_files" ]; then
  echo "[run_checks] Running Prettier on JS/TS files"
  if command -v ${PRETTIER_CMD%% *} >/dev/null 2>&1 || command -v npx >/dev/null 2>&1; then
    run_nonfatal $PRETTIER_CMD $PRETTIER_FLAGS $(echo "$js_files" | tr '\n' ' ')
  else
    echo "[run_checks] Prettier not available; skipping"
  fi

  echo "[run_checks] Running ESLint --fix on JS/TS files"
  if command -v ${ESLINT_CMD%% *} >/dev/null 2>&1 || command -v npx >/dev/null 2>&1; then
    run_nonfatal $ESLINT_CMD $ESLINT_FLAGS $(echo "$js_files" | tr '\n' ' ')
  else
    echo "[run_checks] ESLint not available; skipping --fix step"
  fi

  # Do not auto-stage formatted JS/TS files; leave staging to the user
fi

# Run Java formatter if Java files present and gradlew exists
if [ -n "$java_files" ]; then
  if [ -f "gradlew" ] || command -v gradle >/dev/null 2>&1; then
    echo "[run_checks] Running Gradle formatting/checks for Java files"
    run_nonfatal $GRADLEW_CMD spotlessApply $GRADLE_FLAGS || true
    # Do not auto-stage formatted Java files; leave staging to the user
  else
    echo "[run_checks] Gradle wrapper not found; skipping Java format step"
  fi
fi

# Python formatters
if [ -n "$py_files" ]; then
  echo "[run_checks] Running Black on Python files"
  if command -v python >/dev/null 2>&1; then
    run_nonfatal $PY_BLACK_CMD $BLACK_FLAGS $(echo "$py_files" | tr '\n' ' ')
    run_nonfatal $PY_ISORT_CMD $ISORT_FLAGS $(echo "$py_files" | tr '\n' ' ')
    # Do not auto-stage formatted Python files; leave staging to the user
  else
    echo "[run_checks] Python not available; skipping Python formatting"
  fi
fi

# Docs formatting
if [ -n "$doc_files" ]; then
  if command -v ${PRETTIER_CMD%% *} >/dev/null 2>&1 || command -v npx >/dev/null 2>&1; then
    echo "[run_checks] Running Prettier on docs"
    run_nonfatal $PRETTIER_CMD $PRETTIER_FLAGS $(echo "$doc_files" | tr '\n' ' ')
    # Do not auto-stage formatted docs; leave staging to the user
  else
    echo "[run_checks] Prettier not available; skipping docs formatting"
  fi
fi

# Run linters (non-fix mode) on changed_set. Use project's canonical tools when configured.
lint_failed=0

if [ -n "$js_files" ]; then
  if command -v ${ESLINT_CHECK_CMD%% *} >/dev/null 2>&1 || command -v npx >/dev/null 2>&1; then
    echo "[run_checks] Running ESLint (check-only) on JS/TS files"
    if ! $ESLINT_CHECK_CMD $ESLINT_CHECK_FLAGS $(echo "$js_files" | tr '\n' ' '); then
      lint_failed=1
    fi
  else
    echo "[run_checks] ESLint not available; skipping eslint check"
  fi
fi

if [ -n "$java_files" ]; then
  if [ -f "gradlew" ] || command -v gradle >/dev/null 2>&1; then
    echo "[run_checks] Running Gradle check (Java)"
    if ! $GRADLEW_CMD check $GRADLE_FLAGS; then
      lint_failed=1
    fi
  else
    echo "[run_checks] Gradle wrapper not found; skipping Java check"
  fi
fi

if [ -n "$py_files" ]; then
  if command -v python >/dev/null 2>&1; then
    echo "[run_checks] Running flake8 on Python files"
    if ! $PY_FLAKE_CMD $FLAKE_FLAGS $(echo "$py_files" | tr '\n' ' '); then
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
if command -v gitleaks >/dev/null 2>&1; then
  echo "[run_checks] Running secret scanner (gitleaks) on diff vs HEAD"
  # Detect supported stdin/pipe option for the installed gitleaks
  if gitleaks detect --help 2>&1 | grep -q -- '--pipe'; then
    echo "[run_checks] Using 'gitleaks detect --pipe' to scan diff"
    if ! git diff HEAD | gitleaks detect --pipe; then
      echo "{\"status\":\"secrets_found\",\"message\":\"Secret scanner detected probable secrets.\"}"
      exit 3
    fi
  elif gitleaks detect --help 2>&1 | grep -q -- '--stdin'; then
    echo "[run_checks] Using 'gitleaks detect --stdin' to scan diff"
    if ! git diff HEAD | gitleaks detect --stdin; then
      echo "{\"status\":\"secrets_found\",\"message\":\"Secret scanner detected probable secrets.\"}"
      exit 3
    fi
  else
    echo "[run_checks] gitleaks installed but no stdin/pipe option detected; running repo scan as fallback"
    if ! gitleaks detect --source .; then
      echo "{\"status\":\"secrets_found\",\"message\":\"Secret scanner detected probable secrets on repo scan.\"}"
      exit 3
    fi
  fi
else
  echo "[run_checks] gitleaks not found; skipping secret scan. To require a scan, set SECRET_SCANNER_CMD or install a scanner."
fi

# Large file check (>5MB)
# Large file check (>5MB) only within changed_set
large_files_list=""
while IFS= read -r f; do
  if [ -f "$f" ]; then
    # use portable stat: macOS uses -f%z, linux uses -c%s
    if stat -f%z "$f" >/dev/null 2>&1; then
      size=$(stat -f%z "$f")
    else
      size=$(stat -c%s "$f" 2>/dev/null || echo 0)
    fi
    if [ "$size" -gt $((5*1024*1024)) ]; then
      large_files_list="$large_files_list\n$f"
    fi
  fi
done <<<"$changed_set"

if [ -n "$(echo "$large_files_list" | tr -d '\n')" ]; then
  echo "{\"status\":\"large_files\",\"files\":[$(echo "$large_files_list" | awk 'NF{printf "\"%s\",", $0}' | sed 's/,$//')] }"
  exit 4
fi

echo "[run_checks] All checks passed. Ready to commit."
exit 0
