#!/usr/bin/env bash
#
# Deterministic project state — no AI, just facts. Read at session-start.
#
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "=== razbiram-anki state ==="
echo "branch:       $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
echo "HEAD:         $(git rev-parse --short HEAD 2>/dev/null || echo '?')  $(git log -1 --pretty=%s 2>/dev/null || true)"
echo "uncommitted:  $(git status --porcelain 2>/dev/null | wc -l | tr -d ' ') file(s)"
if git rev-parse --abbrev-ref '@{u}' >/dev/null 2>&1; then
  echo "unpushed:     $(git rev-list --count '@{u}'..HEAD 2>/dev/null || echo '?') commit(s)"
else
  echo "unpushed:     (no upstream tracked)"
fi

app_loc="$(find src -type f \( -name '*.ts' -o -name '*.tsx' \) ! -name '*.test.ts' 2>/dev/null | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')"
test_loc="$(find src -type f -name '*.test.ts' 2>/dev/null | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')"
echo "web src LoC:  ${app_loc:-0}  (tests ${test_loc:-0})"
echo "test files:   $(find src -type f -name '*.test.ts' 2>/dev/null | wc -l | tr -d ' ')"

if [ -d node_modules ]; then
  passed="$(npx vitest run 2>&1 | grep -oE 'Tests[[:space:]]+[0-9]+ passed' | grep -oE '[0-9]+' | head -1 || true)"
  echo "vitest:       ${passed:-?} passed"
else
  echo "vitest:       (node_modules missing — run ./start.sh)"
fi

echo "legacy CLI:   frozen in legacy/ (Python forward bridge)"
