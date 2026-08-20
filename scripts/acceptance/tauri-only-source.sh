#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repository_root"

fail() {
  echo "Tauri-only cutover acceptance failed: $1" >&2
  exit 1
}

active_python_files="$(
  find src tests -type f \( -name '*.py' -o -name '*.pyc' \) -print 2>/dev/null || true
)"
if [[ -n "$active_python_files" ]]; then
  echo "Tauri-only cutover acceptance failed: active Python files remain:" >&2
  echo "$active_python_files" >&2
  exit 1
fi

if grep -Eq 'PYTHONPATH=src|python3 -m exercise_tracker|http://127[.]0[.]0[.]1' README.md; then
  fail "README still presents Python or localhost as an active product path"
fi

if grep -R -n -E 'fetch[[:space:]]*[(]|XMLHttpRequest|WebSocket|EventSource|https?://|localhost|127[.]0[.]0[.]1|[.]scratch/' \
  frontend src-tauri/src 2>/dev/null; then
  fail "production frontend/Rust sources contain a network or fixture dependency"
fi

[[ "$(git cat-file -t python-exercise-tracker-complete)" == "tag" ]] ||
  fail "completed baseline is not preserved by an annotated Git tag"
[[ "$(git rev-parse python-exercise-tracker-complete^{commit})" == \
  "7856f5019f69a62fbb168e38a03f328c8d0cb983" ]] ||
  fail "completed baseline tag no longer resolves to the recorded commit"

echo "Tauri-only source acceptance passed"
echo "Active product: Tauri 2, Rust, TypeScript, HTML, and CSS"
echo "Recoverable baseline: annotated tag python-exercise-tracker-complete"
echo "Boundary: production frontend/Rust sources contain no network or fixture dependency"
