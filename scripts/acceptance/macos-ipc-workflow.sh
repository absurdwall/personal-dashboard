#!/usr/bin/env bash

set -euo pipefail

script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd "$script_directory/../.." && pwd)"
source_app_bundle="${PERSONAL_DASHBOARD_APP_BUNDLE:-$repository_root/src-tauri/target/release/bundle/macos/Personal Dashboard.app}"
acceptance_directory=""
app_bundle=""
app_executable=""
app_pid=""
acceptance_data_directory=""
acceptance_baseline_file=""
driver_binary=""
current_step="setup"

fixed_now_epoch_millis="${PERSONAL_DASHBOARD_ACCEPTANCE_NOW_EPOCH_MILLIS:-1786366800000}"
fixed_utc_offset_minutes="${PERSONAL_DASHBOARD_ACCEPTANCE_UTC_OFFSET_MINUTES:--240}"

fail() {
  echo "Packaged IPC acceptance failed at ${current_step}: $1" >&2
  exit 1
}

find_app_pids() {
  while read -r candidate_pid candidate_command; do
    if [[ "$candidate_command" == "$app_executable" ]]; then
      echo "$candidate_pid"
    fi
  done < <(ps -axo pid=,command=)
}

stop_app() {
  if [[ -n "$app_pid" ]] && kill -0 "$app_pid" 2>/dev/null; then
    kill -TERM "$app_pid"
    for _ in {1..50}; do
      kill -0 "$app_pid" 2>/dev/null || break
      sleep 0.1
    done
    if kill -0 "$app_pid" 2>/dev/null; then
      return 1
    fi
  fi
  app_pid=""
}

cleanup() {
  if ! stop_app; then
    echo "Packaged IPC acceptance cleanup warning: app process did not exit" >&2
  fi
  if [[ -n "$acceptance_directory" && -d "$acceptance_directory" ]]; then
    case "$acceptance_directory" in
      /tmp/personal-dashboard-ipc.* | /private/tmp/personal-dashboard-ipc.*)
        find "$acceptance_directory" -depth -delete
        ;;
    esac
  fi
}

trap cleanup EXIT

[[ -d "$source_app_bundle" ]] || fail "missing application bundle at $source_app_bundle"
[[ -f "$script_directory/macos-ui-driver.swift" ]] ||
  fail "missing macOS accessibility driver source"

current_step="preparing isolated app"
acceptance_directory="$(mktemp -d /tmp/personal-dashboard-ipc.XXXXXX)"
acceptance_directory="$(cd "$acceptance_directory" && pwd -P)"
app_bundle="$acceptance_directory/Personal Dashboard.app"
acceptance_data_directory="$acceptance_directory/profile"
acceptance_baseline_file="$acceptance_directory/no-completed-baseline/state.json"
driver_binary="$acceptance_directory/macos-ui-driver"
/usr/bin/ditto "$source_app_bundle" "$app_bundle" || fail "could not copy the packaged app"
app_executable="$app_bundle/Contents/MacOS/personal-dashboard"

current_step="compiling macOS accessibility driver"
swiftc "$script_directory/macos-ui-driver.swift" \
  -framework ApplicationServices \
  -framework AppKit \
  -o "$driver_binary" || fail "could not compile the macOS accessibility driver"

launch_app() {
  current_step="launching isolated packaged app"
  open -n \
    --env "PERSONAL_DASHBOARD_DATA_DIR=$acceptance_data_directory" \
    --env "PERSONAL_DASHBOARD_BASELINE_FILE=$acceptance_baseline_file" \
    --env "PERSONAL_DASHBOARD_NOW_EPOCH_MILLIS=$fixed_now_epoch_millis" \
    --env "PERSONAL_DASHBOARD_UTC_OFFSET_MINUTES=$fixed_utc_offset_minutes" \
    "$app_bundle" || fail "Launch Services could not open the isolated app"
  sleep 0.3
  open -a "$app_bundle" || fail "Launch Services could not activate the isolated app"

  for _ in {1..80}; do
    while read -r candidate_pid; do
      app_pid="$candidate_pid"
      break 2
    done < <(find_app_pids)
    sleep 0.1
  done
  [[ -n "$app_pid" ]] || fail "Launch Services did not start the isolated app process"
}

run_driver() {
  local output
  if ! output="$("$driver_binary" "$app_pid" "$@" 2>&1)"; then
    fail "$output"
  fi
  printf '%s\n' "$output"
}

current_step="waiting for rendered dashboard"
launch_app
run_driver wait-text "Log workout now" 30
run_driver assert-text "WEEK OF MONDAY, AUGUST 10"

current_step="checking persistent workspace destinations"
run_driver wait-text "This Week" 10
run_driver assert-text "History"
run_driver assert-text "Settings"
run_driver press "History" 10
run_driver assert-text "Previous weeks"
run_driver press "Settings" 10
run_driver assert-text "Profile & data"
run_driver press "This Week" 10
run_driver assert-text "Primary departures"
run_driver assert-text "Monday"
run_driver assert-text "Wednesday"
run_driver assert-text "Friday"
run_driver assert-text "Scheduled"
run_driver assert-text "Fallback availability"
run_driver assert-text "available"
run_driver assert-text "Selected departure: Monday"
run_driver press-contains "Wednesday" 10
run_driver assert-text "Selected departure: Wednesday"
run_driver assert-text "Window fixed · pane-owned overflow"

current_step="clicking Log workout now through the rendered UI"
run_driver press "Log workout now" 10
current_step="choosing Elliptical through the rendered UI"
run_driver press "Elliptical" 10
current_step="choosing the 30-minute preset through the rendered UI"
run_driver press "30" 10
current_step="choosing Moderate effort through the rendered UI"
run_driver press "Moderate" 10

current_step="checking the visible completed workout"
run_driver assert-text "1 of 3 completed"
run_driver assert-text "Elliptical"
run_driver assert-text "Counts toward weekly progress"

current_step="closing the packaged app before persistence check"
if ! stop_app; then
  fail "app process did not exit after termination"
fi
launch_app

current_step="checking persisted visible state after relaunch"
run_driver wait-text "Log workout now" 30
run_driver assert-text "WEEK OF MONDAY, AUGUST 10"
run_driver assert-text "1 of 3 completed"
run_driver assert-text "Elliptical"
run_driver assert-text "Counts toward weekly progress"

echo "Packaged IPC acceptance passed"
echo "Workflow: rendered controls crossed Tauri IPC and recorded an Elliptical workout"
echo "Persistence: isolated packaged app relaunched with the saved result visible"
echo "Clock: now=$fixed_now_epoch_millis offset_minutes=$fixed_utc_offset_minutes"
