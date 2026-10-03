#!/usr/bin/env bash
# State-only real WKWebView composer probe. Requires English candidate UI.
set -u
candidate_bundle="${1:?Pass the noindex candidate .app path.}"
ui_driver="${2:?Pass the compiled macos-ui-driver path.}"
case "$candidate_bundle" in *.noindex/Personal\ Dashboard.app) ;; *) echo 'Expected a task-owned noindex candidate.' >&2; exit 3;; esac
candidate_pid=$(python3 - "$candidate_bundle/Contents/MacOS/personal-dashboard" <<'PY'
import os,subprocess,sys
expected=os.path.realpath(sys.argv[1])
rows=[line.strip().split(maxsplit=1) for line in subprocess.check_output(['ps','-axo','pid=,args='],text=True).splitlines()]
pids=[pid for pid,args in rows if args==expected]
if len(pids)!=1:raise SystemExit('Expected exactly one candidate process.')
print(pids[0])
PY
) || exit 3
run_ui() { PERSONAL_DASHBOARD_ACCEPTANCE_POINTER_FREE=1 "$ui_driver" "$candidate_pid" "$@" >/dev/null 2>&1; }
trap 'run_ui press "Cancel" 2 || true' EXIT
started_at=$(date +%s)
run_ui press 'Start dictation' 5 || exit 3
if run_ui wait-text 'Dictating through Codex' 15; then
  state=recording; status=0
elif run_ui assert-text 'Requesting microphone permission' 1; then
  state=permission-pending; status=1
elif run_ui assert-text 'Connecting to Codex' 1; then
  state=connection-pending; status=1
else
  state=failed-or-ended; status=2
fi
run_ui press 'Cancel' 5 || true
cancelled=false
run_ui assert-text 'Voice input cancelled' 1 && cancelled=true
printf '{"state":"%s","elapsedSeconds":%s,"cancelled":%s}\n' "$state" "$(( $(date +%s)-started_at ))" "$cancelled"
exit "$status"
