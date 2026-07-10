#!/usr/bin/env bash
#
# The hard quality gate. Must print "GATE: PASS" before building on a state.
#   ./scripts/gate.sh            web app: tsc --noEmit + vite build + vitest
#   ./scripts/gate.sh --legacy   also run the legacy Python CLI's ruff + pytest
#
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

LEGACY=0
[ "${1:-}" = "--legacy" ] && LEGACY=1
fail=0

if [ ! -d node_modules ]; then
  echo "node_modules missing — run ./start.sh (or npm install) first." >&2
  exit 1
fi

echo "→ build (tsc --noEmit && vite build)"
if ! npm run build >/tmp/rza_gate_build.log 2>&1; then
  echo "  BUILD FAILED:"; tail -25 /tmp/rza_gate_build.log; fail=1
fi

echo "→ test (vitest)"
if ! npm test >/tmp/rza_gate_test.log 2>&1; then
  echo "  TESTS FAILED:"; tail -25 /tmp/rza_gate_test.log; fail=1
fi

if [ "$LEGACY" = 1 ] && [ -x .venv/bin/python ]; then
  echo "→ legacy ruff + pytest"
  if ! ( .venv/bin/ruff check legacy/src legacy/tests && .venv/bin/python -m pytest -q legacy/tests ) >/tmp/rza_gate_legacy.log 2>&1; then
    echo "  LEGACY FAILED:"; tail -25 /tmp/rza_gate_legacy.log; fail=1
  fi
fi

if [ "$fail" = 0 ]; then echo "GATE: PASS"; else echo "GATE: FAIL"; exit 1; fi
