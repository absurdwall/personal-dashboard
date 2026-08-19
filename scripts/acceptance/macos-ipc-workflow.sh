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

fixed_now_epoch_millis="${PERSONAL_DASHBOARD_ACCEPTANCE_NOW_EPOCH_MILLIS:-1786406400000}"
fixed_utc_offset_minutes="${PERSONAL_DASHBOARD_ACCEPTANCE_UTC_OFFSET_MINUTES:--240}"
acceptance_scenario="${PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO:-list-first}"

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

run_direct_record_scenario() {
  current_step="launching direct-record packaged scenario"
  launch_app

  current_step="waiting for a due planned workout"
  run_driver wait-text "Log workout now" 30
  run_driver press-contains "Monday" 10
  run_driver assert-text "Monday workout"
  run_driver assert-text "Record workout"
  run_driver assert-text "Unrecorded — ready to record"
  run_driver press-contains "Record workout" 10

  current_step="choosing Elliptical in the direct-record flow"
  run_driver press "Elliptical" 10
  current_step="choosing the 30-minute preset in the direct-record flow"
  run_driver press "30" 10
  current_step="choosing Moderate effort in the direct-record flow"
  run_driver press "Moderate" 10

  current_step="checking the direct-record result"
  run_driver assert-text "1 of 3 completed"
  run_driver assert-text "Completed"
  run_driver press-contains "Monday" 10
  run_driver assert-text "Elliptical"
  run_driver assert-text "Counts toward weekly progress"

  current_step="relaunching after the direct-record result"
  if ! stop_app; then
    fail "app process did not exit after termination"
  fi
  launch_app

  current_step="checking direct-record persistence after relaunch"
  run_driver wait-text "1 of 3 completed" 30
  run_driver assert-text "Completed"
  run_driver press-contains "Monday" 10
  run_driver assert-text "Elliptical"
  run_driver assert-text "Counts toward weekly progress"

  echo "Packaged IPC direct-record acceptance passed"
  echo "Workflow: a due planned workout crossed Tauri IPC without a departure response"
  echo "Persistence: the direct record remained visible after relaunch"
  echo "Clock: now=$fixed_now_epoch_millis offset_minutes=$fixed_utc_offset_minutes"
}

run_workout_recording_scenario() {
  current_step="launching scheduled-and-unscheduled packaged scenario"
  launch_app

  current_step="opening a due planned workout with visible source context"
  run_driver wait-text "Log workout now" 30
  run_driver press-contains "Monday" 10
  run_driver assert-text "Monday workout"
  run_driver assert-text "Primary workout"
  run_driver assert-text "Record workout"
  run_driver assert-text "Unrecorded — ready to record"
  run_driver press "Record workout" 10
  run_driver assert-text "What activity did you do?"

  current_step="persisting the planned workout draft before relaunch"
  run_driver press "Elliptical" 10
  run_driver assert-text "About how long was the workout?"
  if ! stop_app; then
    fail "app process did not exit after saving the planned workout draft"
  fi
  launch_app

  current_step="resuming the planned workout after relaunch"
  run_driver wait-text "Resume workout" 30
  run_driver press-contains "Monday" 10
  run_driver assert-text "About how long was the workout?"
  run_driver press "Under 20" 10
  run_driver assert-text "How strenuous did this workout feel?"
  run_driver press "Easy" 10

  current_step="checking the scheduled record result and restored focus"
  run_driver assert-text "0 of 3 completed"
  run_driver assert-text "Completed"
  run_driver assert-text "Workout recorded"
  run_driver assert-absent-text "Monday workout"
  run_driver assert-focused-text "Monday" 10
  run_driver press-contains "Monday" 10
  run_driver assert-text "Primary workout"
  run_driver assert-text "Elliptical"
  run_driver assert-text "Short effort — does not count toward weekly progress"
  run_driver press "Close" 10

  current_step="recording an independent unscheduled qualifying workout"
  run_driver press "Log workout now" 10
  run_driver assert-text "Unscheduled workout"
  run_driver assert-text "What activity did you do?"
  run_driver press "Weight training" 10
  run_driver press "30" 10
  run_driver press "Moderate" 10
  run_driver assert-text "1 of 3 completed"
  run_driver assert-absent-text "Monday workout"
  run_driver assert-focused-text "Log workout now" 10

  current_step="checking both sources and short-effort semantics in current-week history"
  run_driver press "History" 10
  run_driver assert-text "Recorded workouts"
  run_driver assert-text "Primary workout"
  run_driver assert-text "Unscheduled workout"
  run_driver assert-text "Weight training"
  run_driver assert-text "Short effort — does not count toward weekly progress"
  run_driver assert-text "Counts toward weekly progress"

  current_step="relaunching after scheduled and unscheduled records"
  if ! stop_app; then
    fail "app process did not exit after scheduled and unscheduled records"
  fi
  launch_app

  current_step="checking scheduled and unscheduled persistence after relaunch"
  run_driver wait-text "1 of 3 completed" 30
  run_driver press "History" 10
  run_driver assert-text "Primary workout"
  run_driver assert-text "Unscheduled workout"
  run_driver assert-text "Weight training"
  run_driver assert-text "Short effort — does not count toward weekly progress"

  echo "Packaged IPC scheduled-and-unscheduled acceptance passed"
  echo "Workflow: a due planned record and an independent unscheduled record crossed Tauri IPC"
  echo "Persistence: the draft and both completed records remained visible after relaunch"
  echo "Focus: scheduled completion returned focus to Monday; unscheduled completion returned focus to Log workout now"
  echo "Clock: now=$fixed_now_epoch_millis offset_minutes=$fixed_utc_offset_minutes"
}

run_list_first_scenario() {
  current_step="waiting for rendered list-first dashboard"
  launch_app
  run_driver wait-text "Log workout now" 30

  current_step="checking the default This Week agenda"
  run_driver assert-text "WEEK OF MONDAY, AUGUST 10"
  run_driver assert-text "0 of 3 completed"
  run_driver assert-text "Next departure"
  run_driver assert-text "Primary departures"
  run_driver assert-text "Monday"
  run_driver assert-text "Wednesday"
  run_driver assert-text "Friday"
  run_driver assert-text "Open capacity"
  run_driver assert-text "Saturday"
  run_driver assert-text "Sunday"
  run_driver assert-text "History"
  run_driver assert-text "Settings"
  run_driver assert-absent-text "Selected workout"
  run_driver assert-absent-text "Monday workout"
  run_driver assert-absent-text "Leaving for gym"
  run_driver assert-absent-text "Move to fallback"
  run_driver assert-absent-text "Fallback availability"

  current_step="checking direct destination switching"
  run_driver press "History" 10
  run_driver assert-text "Previous weeks"
  run_driver press "Settings" 10
  run_driver assert-text "Profile & data"
  run_driver press "This Week" 10

  current_step="opening and closing a future workout sheet"
  run_driver press-contains "Wednesday" 10
  run_driver assert-text "Selected workout"
  run_driver assert-text "Wednesday workout"
  run_driver assert-absent-text "Record workout"
  run_driver press "Close" 10
  run_driver assert-absent-text "Wednesday workout"
  run_driver assert-text "0 of 3 completed"

  current_step="opening a due workout sheet without recording it"
  run_driver press-contains "Monday" 10
  run_driver assert-text "Monday workout"
  run_driver assert-text "Record workout"
  run_driver press "Close" 10
  run_driver assert-absent-text "Monday workout"
  run_driver assert-text "0 of 3 completed"

  echo "Packaged IPC list-first acceptance passed"
  echo "Workflow: the packaged This Week agenda stayed list-first until an explicit row selection"
  echo "Sheet: future and due rows exposed distinct detail state without the departure-response surface"
  echo "Clock: now=$fixed_now_epoch_millis offset_minutes=$fixed_utc_offset_minutes"
}

if [[ "$acceptance_scenario" == "direct" ]]; then
  run_direct_record_scenario
  exit 0
fi
if [[ "$acceptance_scenario" == "workouts" ]]; then
  run_workout_recording_scenario
  exit 0
fi
if [[ "$acceptance_scenario" == "list-first" || "$acceptance_scenario" == "baseline" ]]; then
  run_list_first_scenario
  exit 0
fi
if [[ "$acceptance_scenario" != "direct" && "$acceptance_scenario" != "workouts" ]]; then
  fail "unknown acceptance scenario: $acceptance_scenario"
fi
