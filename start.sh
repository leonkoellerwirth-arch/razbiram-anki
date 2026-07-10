#!/usr/bin/env bash
#
# Launch the razbiram-anki web app (Vite dev server). Client-only — it parses the
# .apkg and builds deck.json in the browser, so there is no API and no token.
#
#   ./start.sh              install deps if needed, start Vite, open the browser
#   ./start.sh --no-open    don't open a browser
#   ./start.sh --free-port  stop whatever holds the port first (opt-in)
#   ./start.sh -h|--help    show this help
#
# Ctrl-C stops the dev server.

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FE_PORT="${FE_PORT:-5173}"
OPEN=1; FREE_PORT=0

for arg in "$@"; do
  case "$arg" in
    --no-open) OPEN=0 ;;
    --free-port) FREE_PORT=1 ;;
    -h|--help) sed -n '3,11p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

cd "$APP_DIR"

command -v node >/dev/null 2>&1 || { echo "Node.js is required (see https://nodejs.org)." >&2; exit 1; }

ensure_port_free() {
  local port="$1" pids
  command -v lsof >/dev/null 2>&1 || return 0
  pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
  [ -z "$pids" ] && return 0
  if [ "$FREE_PORT" = 1 ]; then
    echo "Freeing port $port (PID(s): $pids) — you passed --free-port."
    kill $pids 2>/dev/null || true; sleep 1; return 0
  fi
  { echo "Port $port is in use by PID(s): $pids."
    echo "Stop it, re-run with --free-port, or set FE_PORT."; } >&2
  exit 1
}

ensure_port_free "$FE_PORT"

# Install dependencies on first run (or after they change).
if [ ! -d node_modules ]; then
  echo "Installing dependencies…"
  npm install
fi

echo "razbiram-anki → http://127.0.0.1:$FE_PORT"
if [ "$OPEN" = 1 ]; then
  exec npm run dev -- --port "$FE_PORT" --strictPort --open
else
  exec npm run dev -- --port "$FE_PORT" --strictPort
fi
