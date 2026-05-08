#!/bin/bash
# SessionStart hook for Carpeta.
# Installs the formatters/linters used by this repo so Claude Code on the web
# can run them. Local sessions are expected to manage their own toolchain.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Python: ruff for lint + format of notion-to-creators.py and scan-photos.py.
if ! command -v ruff >/dev/null 2>&1; then
  pip3 install --user --quiet ruff==0.15.8
fi

# Node: prettier for HTML/CSS/JS/Markdown.
if [ -f "$CLAUDE_PROJECT_DIR/package.json" ]; then
  (cd "$CLAUDE_PROJECT_DIR" && npm install --no-audit --no-fund --silent)
fi

# Make local node_modules/.bin and pip --user bin available for the session.
echo 'export PATH="$CLAUDE_PROJECT_DIR/node_modules/.bin:$HOME/.local/bin:$PATH"' >> "$CLAUDE_ENV_FILE"
