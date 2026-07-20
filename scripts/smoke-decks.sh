#!/usr/bin/env bash
# Local smoke test: run the REAL .apkg → deck.json pipeline over a folder of real
# Anki exports and print a pass/fail table. This is the "does it actually work on
# real decks" check the golden-set unit tests can't be (they use one fixture).
#
# Usage: scripts/smoke-decks.sh [DIR]   (DIR defaults to ~/Downloads)
set -euo pipefail
cd "$(dirname "$0")/.."
DIR="${1:-$HOME/Downloads}"

shopt -s nullglob
files=("$DIR"/*.apkg)
if [ ${#files[@]} -eq 0 ]; then
  echo "no .apkg files in $DIR"; exit 0
fi

pass=0; fail=0
for f in "${files[@]}"; do
  out=$(node_modules/.bin/vite-node scripts/try-apkg.mts -- "$f" 2>&1 | grep -E "^(RESULT|FAILED)" | head -1 || true)
  if echo "$out" | grep -q "^RESULT: OK"; then
    printf "  \033[32mOK\033[0m   %-48s %s\n" "$(basename "$f")" "${out#RESULT: OK — }"
    pass=$((pass+1))
  else
    printf "  \033[31mFAIL\033[0m %-48s %s\n" "$(basename "$f")" "$out"
    fail=$((fail+1))
  fi
done
echo "----"
echo "  $pass passed, $fail failed (of $((pass+fail)))"
[ "$fail" -eq 0 ]
