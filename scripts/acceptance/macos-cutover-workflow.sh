#!/usr/bin/env bash

set -euo pipefail

script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd "$script_directory/../.." && pwd)"
source_app_bundle="${PERSONAL_DASHBOARD_APP_BUNDLE:-$repository_root/src-tauri/target/release/bundle/macos/Personal Dashboard.app}"
acceptance_directory=""
app_pid=""

fail() {
  echo "Packaged cutover acceptance failed: $1" >&2
  exit 1
}

pid_is_running() {
  local process_state
  [[ "$1" =~ ^[0-9]+$ ]] || return 1
  process_state="$(ps -o stat= -p "$1" 2>/dev/null | tr -d ' ')"
  [[ -n "$process_state" && "$process_state" != Z* ]]
}

cleanup() {
  if [[ -n "$app_pid" ]] && pid_is_running "$app_pid"; then
    kill -TERM "$app_pid" 2>/dev/null || true
    wait "$app_pid" 2>/dev/null || true
  fi
  if [[ -n "$acceptance_directory" && -d "$acceptance_directory" ]]; then
    case "$acceptance_directory" in
      /tmp/personal-dashboard-cutover.* | /private/tmp/personal-dashboard-cutover.*)
        find "$acceptance_directory" -depth -delete
        ;;
    esac
  fi
}

trap cleanup EXIT

[[ -d "$source_app_bundle" ]] || fail "missing application bundle at $source_app_bundle"
[[ -f "$script_directory/macos-ui-driver.swift" ]] || fail "missing Accessibility driver"

acceptance_directory="$(mktemp -d /tmp/personal-dashboard-cutover.XXXXXX)"
acceptance_directory="$(cd "$acceptance_directory" && pwd -P)"
app_bundle="$acceptance_directory/Personal Dashboard.app"
app_executable="$app_bundle/Contents/MacOS/personal-dashboard"
app_data="$acceptance_directory/app-data"
python_data="$acceptance_directory/python-data"
vault="$acceptance_directory/vault"
daily_directory="$vault/life/Journal/Daily/2026/2026-09"
daily_record="$daily_directory/2026-09-08.md"
driver="$acceptance_directory/macos-ui-driver"
candidate_commit="$(git -C "$repository_root" rev-parse HEAD)"

/usr/bin/ditto "$source_app_bundle" "$app_bundle"
/usr/libexec/PlistBuddy -c \
  'Set :CFBundleIdentifier com.tortillaflat.personal-dashboard.cutover-acceptance' \
  "$app_bundle/Contents/Info.plist"
/usr/bin/codesign --force --sign - "$app_bundle" >/dev/null
swiftc "$script_directory/macos-ui-driver.swift" \
  -framework ApplicationServices \
  -framework AppKit \
  -o "$driver"
[[ -x "$app_executable" ]] || fail "packaged executable is missing"
candidate_bundle_sha256="$(shasum -a 256 "$app_executable" | awk '{print $1}')"
[[ "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$app_bundle/Contents/Info.plist")" == "2.0.0" ]] ||
  fail "bundle is not version 2.0.0"

mkdir -p "$app_data/.profile-restore-transaction" \
  "$app_data/.baseline-migration-transaction" "$python_data" \
  "$vault/.obsidian" "$daily_directory"

cat > "$app_data/profile.json" <<'EOF'
{
  "schema_version": 3,
  "profile_label": "Retired synthetic profile",
  "authority": "active",
  "pending_notification_cancellations": ["exercise-orphan-profile"]
}
EOF

cat > "$app_data/exercise.json" <<'EOF'
{
  "schema_version": 10,
  "routine": {
    "weekly_goal": 3,
    "primary": [
      {"weekday": 0, "day": "Monday", "departure_time": "16:00", "order": 1},
      {"weekday": 2, "day": "Wednesday", "departure_time": "16:00", "order": 2},
      {"weekday": 4, "day": "Friday", "departure_time": "16:00", "order": 3}
    ],
    "fallback": [
      {"weekday": 5, "day": "Saturday", "departure_time": "16:00", "order": 1},
      {"weekday": 6, "day": "Sunday", "departure_time": "16:00", "order": 2}
    ]
  },
  "weeks": [],
  "pending_reminder_reconciliation": {
    "cancel_notification_ids": ["exercise-orphan-cancel"],
    "desired_notification_ids": ["exercise-orphan-desired"]
  },
  "workout_draft": null,
  "departure_decision": null,
  "next_unscheduled_sequence": 1,
  "next_adjusted_sequence": 1
}
EOF

printf 'previous-profile\n' > "$app_data/.profile-restore-transaction/profile.previous.json"
printf 'previous-exercise\n' > "$app_data/.profile-restore-transaction/exercise.previous.json"
printf 'prepared\n' > "$app_data/.profile-restore-transaction/prepared"
printf 'migrated-profile\n' > "$app_data/.baseline-migration-transaction/profile.migrated.json"
printf 'migrated-exercise\n' > "$app_data/.baseline-migration-transaction/exercise.migrated.json"
printf 'prepared\n' > "$app_data/.baseline-migration-transaction/prepared"
printf 'temporary\n' > "$app_data/profile.json.tmp-123"
printf 'temporary\n' > "$app_data/exercise.json.tmp-456"
printf 'python-state\n' > "$python_data/state.json"
printf 'synthetic-plist\n' > "$python_data/com.tortillaflat.exercise-habit-tracker.reminders.plist"
printf '{\n  "schemaVersion": 1,\n  "selectedVault": "%s"\n}\n' "$vault" > "$app_data/today-workspace.json"

cat > "$daily_record" <<'EOF'
---
type: daily-record
date: 2026-09-08
---
# 2026-09-08

## 今天的大致安排

- **上午：** Packaged cutover retained this Daily Record.

## 计划依据

## 白天更新

## 晚间复盘
EOF

today_hash_before="$(shasum -a 256 "$app_data/today-workspace.json")"
record_hash_before="$(shasum -a 256 "$daily_record")"

printf 'preserve-me\n' > "$app_data/unknown.keep"
  PERSONAL_DASHBOARD_DATA_DIR="$app_data" \
  PERSONAL_DASHBOARD_LEGACY_EXERCISE_DIR="$python_data" \
  PERSONAL_DASHBOARD_2_CUTOVER_MODE="preflight" \
  PERSONAL_DASHBOARD_2_CUTOVER_COMMIT="$candidate_commit" \
  PERSONAL_DASHBOARD_2_CUTOVER_BUNDLE_SHA256="$candidate_bundle_sha256" \
  PERSONAL_DASHBOARD_NOW_EPOCH_MILLIS="1788901200000" \
  PERSONAL_DASHBOARD_UTC_OFFSET_MINUTES="-240" \
  "$app_executable" > "$acceptance_directory/blocked.log" 2>&1 &
blocked_pid="$!"
sleep 1
[[ -f "$app_data/profile.json" && -f "$app_data/exercise.json" ]] ||
  fail "unknown-file preflight changed retired state"
[[ ! -f "$app_data/personal-dashboard-2-cutover-progress.json" ]] ||
  fail "unknown-file preflight wrote progress before approval"
if ! grep -Fq '"unknownPaths":["app-data/unknown.keep"]' "$acceptance_directory/blocked.log"; then
  sed -n '1,120p' "$acceptance_directory/blocked.log" >&2 || true
  fail "unknown-file preflight did not report the blocking path"
fi
if pid_is_running "$blocked_pid"; then
  kill -TERM "$blocked_pid" 2>/dev/null || true
fi
wait "$blocked_pid" 2>/dev/null || true
sleep 1

rm "$app_data/unknown.keep"
PERSONAL_DASHBOARD_DATA_DIR="$app_data" \
  PERSONAL_DASHBOARD_LEGACY_EXERCISE_DIR="$python_data" \
  PERSONAL_DASHBOARD_2_CUTOVER_MODE="preflight" \
  PERSONAL_DASHBOARD_2_CUTOVER_COMMIT="$candidate_commit" \
  PERSONAL_DASHBOARD_2_CUTOVER_BUNDLE_SHA256="$candidate_bundle_sha256" \
  PERSONAL_DASHBOARD_NOW_EPOCH_MILLIS="1788901200000" \
  PERSONAL_DASHBOARD_UTC_OFFSET_MINUTES="-240" \
  "$app_executable" > "$acceptance_directory/preflight.log" 2>&1 &
preflight_pid="$!"
sleep 1
wait "$preflight_pid" 2>/dev/null || true
grep -Fq "PERSONAL_DASHBOARD_CUTOVER_PREFLIGHT=" "$acceptance_directory/preflight.log" ||
  fail "read-only preflight artifact is missing"
grep -Fq "\"candidateCommit\":\"$candidate_commit\"" "$acceptance_directory/preflight.log" ||
  fail "preflight artifact lost the candidate commit"
grep -Fq "\"bundleSha256\":\"$candidate_bundle_sha256\"" "$acceptance_directory/preflight.log" ||
  fail "preflight artifact lost the bundle hash"
grep -Fq "\"selectedVault\":\"$vault\"" "$acceptance_directory/preflight.log" ||
  fail "preflight artifact lost the selected vault"
[[ -f "$app_data/profile.json" && ! -f "$app_data/personal-dashboard-2-cutover-progress.json" ]] ||
  fail "read-only preflight mutated app state"

PERSONAL_DASHBOARD_DATA_DIR="$app_data" \
  PERSONAL_DASHBOARD_LEGACY_EXERCISE_DIR="$python_data" \
  PERSONAL_DASHBOARD_2_CUTOVER_MODE="execute" \
  PERSONAL_DASHBOARD_2_CUTOVER_COMMIT="$candidate_commit" \
  PERSONAL_DASHBOARD_2_CUTOVER_BUNDLE_SHA256="$candidate_bundle_sha256" \
  PERSONAL_DASHBOARD_NOW_EPOCH_MILLIS="1788901200000" \
  PERSONAL_DASHBOARD_UTC_OFFSET_MINUTES="-240" \
  "$app_executable" > "$acceptance_directory/cutover.log" 2>&1 &
app_pid="$!"

"$driver" "$app_pid" wait-text "Today" 30 >/dev/null || fail "2.0 UI did not become accessible"
"$driver" "$app_pid" assert-text "Calendar" >/dev/null || fail "Calendar destination is missing"
"$driver" "$app_pid" assert-text "Habits" >/dev/null || fail "Habits destination is missing"
"$driver" "$app_pid" assert-absent-text "This Week" >/dev/null || fail "retired This Week UI remains"
"$driver" "$app_pid" assert-absent-text "Profile & data" >/dev/null || fail "retired Profile UI remains"

for retired in \
  "$app_data/profile.json" \
  "$app_data/exercise.json" \
  "$app_data/.profile-restore-transaction" \
  "$app_data/.baseline-migration-transaction" \
  "$app_data/profile.json.tmp-123" \
  "$app_data/exercise.json.tmp-456" \
  "$python_data/state.json" \
  "$python_data/com.tortillaflat.exercise-habit-tracker.reminders.plist"; do
  [[ ! -e "$retired" ]] || fail "retired object remains: $retired"
done
[[ -f "$app_data/personal-dashboard-2-cutover.json" ]] || fail "completion marker is missing"
grep -Fq '"phase": "completed"' "$app_data/personal-dashboard-2-cutover.json" ||
  fail "completion marker does not report completed"
grep -Fq "\"candidateCommit\": \"$candidate_commit\"" "$app_data/personal-dashboard-2-cutover.json" ||
  fail "completion marker lost candidate commit"
grep -Fq "\"bundleSha256\": \"$candidate_bundle_sha256\"" "$app_data/personal-dashboard-2-cutover.json" ||
  fail "completion marker lost bundle hash"
[[ "$(shasum -a 256 "$app_data/today-workspace.json")" == "$today_hash_before" ]] ||
  fail "cutover changed today-workspace.json"
[[ "$(shasum -a 256 "$daily_record")" == "$record_hash_before" ]] ||
  fail "cutover changed the Daily Record"

kill -TERM "$app_pid"
wait "$app_pid" 2>/dev/null || true
app_pid=""
sleep 1

PERSONAL_DASHBOARD_DATA_DIR="$app_data" \
  PERSONAL_DASHBOARD_LEGACY_EXERCISE_DIR="$python_data" \
  PERSONAL_DASHBOARD_NOW_EPOCH_MILLIS="1788901200000" \
  PERSONAL_DASHBOARD_UTC_OFFSET_MINUTES="-240" \
  "$app_executable" > "$acceptance_directory/relaunch.log" 2>&1 &
app_pid="$!"
sleep 0.3
if ! pid_is_running "$app_pid"; then
  sed -n '1,120p' "$acceptance_directory/relaunch.log" >&2 || true
  fail "normal 2.0 relaunch exited before Accessibility readiness"
fi
"$driver" "$app_pid" wait-text "Today" 30 >/dev/null || fail "normal 2.0 relaunch did not open"
[[ ! -e "$app_data/profile.json" && ! -e "$app_data/exercise.json" ]] ||
  fail "normal 2.0 relaunch recreated retired state"

echo "Packaged macOS cutover acceptance passed"
echo "Scope: unknown-file fail-closed, exact owned-state deletion, Today/vault preservation"
echo "Runtime: completion marker, normal relaunch no-import, FINAL three destinations"
echo "Notifications: native cancellation and pending-request verification path completed for synthetic identifiers"
