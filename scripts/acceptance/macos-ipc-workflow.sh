#!/usr/bin/env bash

set -euo pipefail

script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd "$script_directory/../.." && pwd)"
source_app_bundle="${PERSONAL_DASHBOARD_APP_BUNDLE:-$repository_root/src-tauri/target/release/bundle/macos/Personal Dashboard.app}"
acceptance_directory=""
acceptance_directory_owned_by_supervisor=0
app_bundle=""
app_executable=""
app_pid=""
app_pid_file=""
acceptance_data_directory=""
acceptance_baseline_file=""
driver_binary=""
current_step="setup"

fixed_now_epoch_millis="${PERSONAL_DASHBOARD_ACCEPTANCE_NOW_EPOCH_MILLIS:-1786406400000}"
fixed_utc_offset_minutes="${PERSONAL_DASHBOARD_ACCEPTANCE_UTC_OFFSET_MINUTES:--240}"
acceptance_scenario="${PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO:-list-first}"
scenario_budget_seconds="${PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS:-240}"
suite_budget_seconds="${PERSONAL_DASHBOARD_ACCEPTANCE_SUITE_TIMEOUT_SECONDS:-1800}"
main_shell_pid="$$"
scenario_watchdog_pid=""
suite_deadline_monotonic_millis=0

fail() {
  echo "Packaged IPC acceptance failed at ${current_step}: $1" >&2
  exit 1
}

require_positive_integer() {
  local value_name="$1"
  local value="$2"
  [[ "$value" =~ ^[1-9][0-9]*$ ]] ||
    fail "${value_name} must be a positive integer (got: ${value})"
}

monotonic_millis() {
  /usr/bin/perl -MTime::HiRes=clock_gettime,CLOCK_MONOTONIC -e \
    'printf "%d\n", clock_gettime(CLOCK_MONOTONIC) * 1000'
}

process_group_id() {
  ps -o pgid= -p "$1" 2>/dev/null | tr -d ' '
}

pid_is_running() {
  local pid="$1"
  local process_state

  [[ "$pid" =~ ^[0-9]+$ ]] || return 1
  process_state="$(ps -o stat= -p "$pid" 2>/dev/null | tr -d ' ')"
  [[ -n "$process_state" && "$process_state" != Z* ]]
}

process_group_has_running_processes() {
  local group_id="$1"
  local candidate_pid
  local candidate_group_id
  local candidate_state

  [[ "$group_id" =~ ^[0-9]+$ && "$group_id" != "0" ]] || return 1
  while read -r candidate_pid candidate_group_id candidate_state; do
    [[ "$candidate_group_id" == "$group_id" ]] || continue
    [[ "$candidate_pid" =~ ^[0-9]+$ && "$candidate_state" != Z* ]] || continue
    return 0
  done < <(ps -axo pid=,pgid=,stat= 2>/dev/null || true)
  return 1
}

collect_process_tree() {
  local root_pid="$1"
  local descendant_pid

  printf '%s\n' "$root_pid"
  while read -r descendant_pid; do
    [[ "$descendant_pid" =~ ^[0-9]+$ ]] || continue
    collect_process_tree "$descendant_pid"
  done < <(pgrep -P "$root_pid" 2>/dev/null || true)
}

process_list_has_running_pids() {
  local process_pids="$1"
  local candidate_pid

  while read -r candidate_pid; do
    [[ "$candidate_pid" =~ ^[0-9]+$ ]] || continue
    pid_is_running "$candidate_pid" && return 0
  done <<< "$process_pids"
  return 1
}

read_supervised_app_pid() {
  local supervision_directory="$1"
  local pid_file="$supervision_directory/app.pid"
  local supervised_pid=""

  [[ -f "$pid_file" ]] || return 1
  IFS= read -r supervised_pid < "$pid_file" || true
  [[ "$supervised_pid" =~ ^[0-9]+$ ]] || return 1
  printf '%s\n' "$supervised_pid"
}

supervised_app_command_matches() {
  local supervised_pid="$1"
  local supervision_directory="$2"
  local expected_executable="$supervision_directory/Personal Dashboard.app/Contents/MacOS/personal-dashboard"
  local actual_command

  actual_command="$(ps -o command= -p "$supervised_pid" 2>/dev/null | sed 's/[[:space:]]*$//')"
  [[ "$actual_command" == "$expected_executable" ]]
}

supervised_processes_running() {
  local child_pid="$1"
  local child_group_id="$2"
  local supervision_directory="$3"
  local supervised_pid=""
  local parent_group_id

  parent_group_id="$(process_group_id "$$")"
  if [[ -n "$child_group_id" && "$child_group_id" != "0" &&
    "$child_group_id" != "$parent_group_id" ]] &&
    process_group_has_running_processes "$child_group_id"; then
    return 0
  fi
  pid_is_running "$child_pid" && return 0
  if [[ -n "$supervision_directory" && -d "$supervision_directory" ]]; then
    if [[ -f "$supervision_directory/app.pid" ]]; then
      if ! supervised_pid="$(read_supervised_app_pid "$supervision_directory")"; then
        # A malformed ownership record is an unknown live-process state. Keep
        # the directory and fail closed instead of deleting it.
        return 0
      fi
      pid_is_running "$supervised_pid" && return 0
    fi
  fi
  return 1
}

remove_acceptance_directory() {
  local directory="$1"

  [[ -n "$directory" && -d "$directory" ]] || return 0
  case "$directory" in
    /tmp/personal-dashboard-ipc.* | /private/tmp/personal-dashboard-ipc.*)
      find "$directory" -depth -delete
      ;;
    *)
      return 1
      ;;
  esac
}

finalize_supervised_directory() {
  local child_pid="$1"
  local child_group_id="$2"
  local supervision_directory="$3"

  [[ -n "$supervision_directory" && -d "$supervision_directory" ]] || return 0
  for _ in {1..50}; do
    if ! supervised_processes_running "$child_pid" "$child_group_id" "$supervision_directory"; then
      remove_acceptance_directory "$supervision_directory"
      return
    fi
    sleep 0.1
  done
  return 1
}

terminate_process_tree_fallback() {
  local root_pid="$1"
  local descendant_pid

  while read -r descendant_pid; do
    [[ "$descendant_pid" =~ ^[0-9]+$ ]] || continue
    terminate_process_tree_fallback "$descendant_pid"
  done < <(pgrep -P "$root_pid" 2>/dev/null || true)

  kill -TERM "$root_pid" 2>/dev/null || true
}

terminate_child() {
  local child_pid="$1"
  local child_group_id="${2:-}"
  local supervision_directory="${3:-}"
  local parent_group_id
  local supervised_pid=""

  parent_group_id="$(process_group_id "$$")"
  if [[ -n "$child_group_id" && "$child_group_id" != "0" &&
    "$child_group_id" != "$parent_group_id" ]]; then
    kill -TERM "-$child_group_id" 2>/dev/null || true
  else
    terminate_process_tree_fallback "$child_pid"
  fi

  # Give cooperative cleanup a short TERM window, but keep ownership in this
  # outer supervisor because the child shell may be killed before its EXIT trap.
  for _ in {1..60}; do
    supervised_processes_running "$child_pid" "$child_group_id" "$supervision_directory" || return 0
    sleep 0.1
  done

  if [[ -n "$child_group_id" && "$child_group_id" != "0" &&
    "$child_group_id" != "$parent_group_id" ]]; then
    kill -KILL "-$child_group_id" 2>/dev/null || true
  else
    terminate_process_tree_fallback "$child_pid"
    kill -KILL "$child_pid" 2>/dev/null || true
  fi

  # A legacy or unexpectedly re-parented app must still be treated as owned
  # by this timeout path. Only kill the recorded PID when its command remains
  # the isolated packaged executable; otherwise retain the directory below.
  if [[ -n "$supervision_directory" ]] &&
    supervised_pid="$(read_supervised_app_pid "$supervision_directory")" &&
    supervised_app_command_matches "$supervised_pid" "$supervision_directory"; then
    terminate_process_tree_fallback "$supervised_pid"
    kill -KILL "$supervised_pid" 2>/dev/null || true
  fi

  for _ in {1..60}; do
    supervised_processes_running "$child_pid" "$child_group_id" "$supervision_directory" || return 0
    sleep 0.1
  done
  return 1
}

finish_bounded_failure() {
  local child_pid="$1"
  local child_group_id="$2"
  local supervision_directory="$3"
  local failure_message="$4"
  local child_was_waited="${5:-0}"

  if ! terminate_child "$child_pid" "$child_group_id" "$supervision_directory"; then
    if [[ "$child_was_waited" != "1" ]]; then
      wait "$child_pid" 2>/dev/null || true
    fi
    fail "${failure_message}; cleanup could not prove process termination; retained directory at ${supervision_directory}"
  fi
  if [[ "$child_was_waited" != "1" ]]; then
    wait "$child_pid" 2>/dev/null || true
  fi
  if ! finalize_supervised_directory "$child_pid" "$child_group_id" "$supervision_directory"; then
    fail "${failure_message}; cleanup could not prove process termination; retained directory at ${supervision_directory}"
  fi
  fail "$failure_message"
}

run_bounded_scenario() {
  local scenario="$1"
  local started_monotonic_millis
  local now_monotonic_millis
  local scenario_deadline_monotonic_millis
  local child_pid
  local child_group_id=""
  local parent_group_id
  local supervision_directory
  local child_status=0

  [[ "$scenario" != "gate" ]] || fail "the gate cannot recursively invoke itself"
  current_step="running packaged ${scenario} acceptance"
  parent_group_id="$(process_group_id "$$")"
  started_monotonic_millis="$(monotonic_millis)"
  supervision_directory="$(mktemp -d /tmp/personal-dashboard-ipc.XXXXXX)" ||
    fail "could not create packaged ${scenario} supervision directory"
  supervision_directory="$(cd "$supervision_directory" && pwd -P)" ||
    fail "could not resolve packaged ${scenario} supervision directory"
  PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO="$scenario" \
    PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS="$scenario_budget_seconds" \
    PERSONAL_DASHBOARD_ACCEPTANCE_DIRECTORY="$supervision_directory" \
    /usr/bin/perl -e \
      'setpgrp(0, 0); exec @ARGV or die "could not exec acceptance scenario: $!"' \
      "$script_directory/macos-ipc-workflow.sh" &
  child_pid="$!"
  scenario_deadline_monotonic_millis=$((
    started_monotonic_millis + scenario_budget_seconds * 1000
  ))

  for _ in {1..20}; do
    child_group_id="$(process_group_id "$child_pid")"
    [[ -n "$child_group_id" && "$child_group_id" != "$parent_group_id" ]] && break
    sleep 0.01
  done
  [[ -n "$child_group_id" && "$child_group_id" != "$parent_group_id" ]] || {
    finish_bounded_failure "$child_pid" "$child_group_id" "$supervision_directory" \
      "could not identify packaged ${scenario} process group"
  }

  while pid_is_running "$child_pid"; do
    now_monotonic_millis="$(monotonic_millis)"
    if (( suite_deadline_monotonic_millis > 0 &&
      now_monotonic_millis >= suite_deadline_monotonic_millis )); then
      finish_bounded_failure "$child_pid" "$child_group_id" "$supervision_directory" \
        "packaged gate exceeded ${suite_budget_seconds}s"
    fi
    if (( now_monotonic_millis >= scenario_deadline_monotonic_millis )); then
      finish_bounded_failure "$child_pid" "$child_group_id" "$supervision_directory" \
        "packaged ${scenario} acceptance exceeded ${scenario_budget_seconds}s"
    fi
    sleep 0.2
  done

  wait "$child_pid" || child_status="$?"
  now_monotonic_millis="$(monotonic_millis)"
  if (( suite_deadline_monotonic_millis > 0 &&
    now_monotonic_millis >= suite_deadline_monotonic_millis )); then
    finish_bounded_failure "$child_pid" "$child_group_id" "$supervision_directory" \
      "packaged gate exceeded ${suite_budget_seconds}s" 1
  fi
  if (( now_monotonic_millis >= scenario_deadline_monotonic_millis )); then
    finish_bounded_failure "$child_pid" "$child_group_id" "$supervision_directory" \
      "packaged ${scenario} acceptance exceeded ${scenario_budget_seconds}s" 1
  fi
  if ! finalize_supervised_directory "$child_pid" "$child_group_id" "$supervision_directory"; then
    fail "packaged ${scenario} cleanup could not prove process termination; retained directory at ${supervision_directory}"
  fi
  if (( child_status != 0 )); then
    fail "packaged ${scenario} acceptance did not pass"
  fi
}

run_final_gate() {
  require_positive_integer "scenario budget" "$scenario_budget_seconds"
  require_positive_integer "suite budget" "$suite_budget_seconds"
  local suite_started_monotonic_millis
  suite_started_monotonic_millis="$(monotonic_millis)"
  suite_deadline_monotonic_millis=$((
    suite_started_monotonic_millis + suite_budget_seconds * 1000
  ))

  for scenario in list-first direct state-semantics progress workouts exceptions responsive compact keyboard week-close installed-cycle; do
    run_bounded_scenario "$scenario"
  done

  echo "Packaged IPC This Week delivery gate passed"
  echo "Coverage: list-first, direct scheduled record, unresolved state, unscheduled 0-to-3 progress, exceptions, compact workflows, responsive viewports, keyboard Accessibility, and week-close History"
  echo "Persistence: each workflow runs in an isolated packaged profile and verifies relaunch where required"
  echo "Budget: ${scenario_budget_seconds}s per scenario, ${suite_budget_seconds}s overall"
}

# The gate delegates setup and cleanup to its bounded child scenarios. Do not
# copy an app bundle or compile a driver in this outer dispatcher first.
if [[ "$acceptance_scenario" == "gate" ]]; then
  run_final_gate
  exit 0
fi

require_positive_integer "scenario budget" "$scenario_budget_seconds"

stop_app() {
  local app_process_pids=""

  if [[ -n "$app_pid" ]] && pid_is_running "$app_pid"; then
    app_process_pids="$(collect_process_tree "$app_pid")"
    terminate_process_tree_fallback "$app_pid"
    for _ in {1..50}; do
      process_list_has_running_pids "$app_process_pids" || break
      sleep 0.1
    done
    if process_list_has_running_pids "$app_process_pids"; then
      terminate_process_tree_fallback "$app_pid"
      while read -r process_pid; do
        [[ "$process_pid" =~ ^[0-9]+$ ]] || continue
        kill -KILL "$process_pid" 2>/dev/null || true
      done <<< "$app_process_pids"
      for _ in {1..50}; do
        process_list_has_running_pids "$app_process_pids" || break
        sleep 0.1
      done
      process_list_has_running_pids "$app_process_pids" && return 1
    fi
  fi
  app_pid=""
  if [[ -n "$app_pid_file" && -f "$app_pid_file" ]]; then
    rm -f "$app_pid_file"
  fi
  return 0
}

cleanup() {
  local app_stopped=0

  if [[ -n "$scenario_watchdog_pid" ]] && kill -0 "$scenario_watchdog_pid" 2>/dev/null; then
    kill -TERM "$scenario_watchdog_pid" 2>/dev/null || true
    wait "$scenario_watchdog_pid" 2>/dev/null || true
  fi
  scenario_watchdog_pid=""
  if stop_app; then
    app_stopped=1
  else
    echo "Packaged IPC acceptance cleanup warning: app process did not exit" >&2
  fi
  if (( app_stopped == 1 && acceptance_directory_owned_by_supervisor == 0 )); then
    if ! remove_acceptance_directory "$acceptance_directory"; then
      echo "Packaged IPC acceptance cleanup warning: retained directory at ${acceptance_directory}" >&2
    fi
  fi
}

trap cleanup EXIT
trap 'fail "scenario exceeded ${scenario_budget_seconds}s"' TERM

(
  watchdog_deadline_monotonic_millis=$((
    $(monotonic_millis) + scenario_budget_seconds * 1000
  ))
  while :; do
    if (( $(monotonic_millis) >= watchdog_deadline_monotonic_millis )); then
      echo "Packaged IPC acceptance exceeded ${scenario_budget_seconds}s at ${current_step}" >&2
      kill -TERM "$main_shell_pid" 2>/dev/null || true
      exit 0
    fi
    sleep 0.2
  done
) &
scenario_watchdog_pid="$!"

[[ -d "$source_app_bundle" ]] || fail "missing application bundle at $source_app_bundle"
[[ -f "$script_directory/macos-ui-driver.swift" ]] ||
  fail "missing macOS accessibility driver source"

current_step="preparing isolated app"
if [[ -n "${PERSONAL_DASHBOARD_ACCEPTANCE_DIRECTORY:-}" ]]; then
  case "$PERSONAL_DASHBOARD_ACCEPTANCE_DIRECTORY" in
    /tmp/personal-dashboard-ipc.* | /private/tmp/personal-dashboard-ipc.*)
      ;;
    *)
      fail "invalid supervised acceptance directory: $PERSONAL_DASHBOARD_ACCEPTANCE_DIRECTORY"
      ;;
  esac
  [[ -d "$PERSONAL_DASHBOARD_ACCEPTANCE_DIRECTORY" ]] ||
    fail "missing supervised acceptance directory at $PERSONAL_DASHBOARD_ACCEPTANCE_DIRECTORY"
  acceptance_directory="$(cd "$PERSONAL_DASHBOARD_ACCEPTANCE_DIRECTORY" && pwd -P)"
  acceptance_directory_owned_by_supervisor=1
else
  acceptance_directory="$(mktemp -d /tmp/personal-dashboard-ipc.XXXXXX)"
  acceptance_directory="$(cd "$acceptance_directory" && pwd -P)"
fi
app_bundle="$acceptance_directory/Personal Dashboard.app"
acceptance_data_directory="$acceptance_directory/profile"
acceptance_baseline_file="$acceptance_directory/no-completed-baseline/state.json"
driver_binary="$acceptance_directory/macos-ui-driver"
app_pid_file="$acceptance_directory/app.pid"
/usr/bin/ditto "$source_app_bundle" "$app_bundle" || fail "could not copy the packaged app"
app_executable="$app_bundle/Contents/MacOS/personal-dashboard"

current_step="compiling macOS accessibility driver"
swiftc "$script_directory/macos-ui-driver.swift" \
  -framework ApplicationServices \
  -framework AppKit \
  -o "$driver_binary" || fail "could not compile the macOS accessibility driver"

current_step="checking for an interactive unlocked macOS session"
if /usr/sbin/ioreg -n Root -d1 -a 2>/dev/null |
  /usr/bin/plutil -convert json -o - - 2>/dev/null |
  grep -q 'CGSSessionScreenIsLocked.*true'; then
  fail "macOS is locked; packaged Accessibility acceptance requires an interactive desktop"
fi
frontmost_process_name="$(/usr/bin/osascript \
  -e 'tell application "System Events" to tell first process whose frontmost is true to get name' \
  2>/dev/null || true)"
[[ "$frontmost_process_name" != "loginwindow" ]] ||
  fail "macOS loginwindow is frontmost; packaged Accessibility acceptance requires an interactive desktop"

launch_app() {
  current_step="launching isolated packaged app"
  PERSONAL_DASHBOARD_DATA_DIR="$acceptance_data_directory" \
    PERSONAL_DASHBOARD_BASELINE_FILE="$acceptance_baseline_file" \
    PERSONAL_DASHBOARD_NOW_EPOCH_MILLIS="$fixed_now_epoch_millis" \
    PERSONAL_DASHBOARD_UTC_OFFSET_MINUTES="$fixed_utc_offset_minutes" \
    "$app_executable" >"$acceptance_directory/app.log" 2>&1 &
  app_pid="$!"
  printf '%s\n' "$app_pid" > "$app_pid_file" || fail "could not record the isolated app PID"
  sleep 0.3
  pid_is_running "$app_pid" ||
    fail "the isolated packaged app exited during direct launch; see $acceptance_directory/app.log"
}

run_driver() {
  local output
  if ! output="$("$driver_binary" "$app_pid" "$@" 2>&1)"; then
    fail "$output"
  fi
  printf '%s\n' "$output"
}

launch_app_waiting_for_text() {
  local expected_text="$1"
  local timeout_seconds="${2:-30}"
  local output=""

  for attempt in 1 2; do
    launch_app
    if output="$("$driver_binary" "$app_pid" wait-text "$expected_text" "$timeout_seconds" 2>&1)"; then
      printf '%s\n' "$output"
      return 0
    fi
    if (( attempt == 1 )); then
      current_step="retrying packaged app after Accessibility readiness delay"
      stop_app || fail "app process did not exit before the bounded readiness retry"
      sleep 2
    fi
  done
  fail "$output"
}

wait_for_file_text() {
  local file="$1"
  local expected_text="$2"

  for _ in {1..50}; do
    grep -Fq -- "$expected_text" "$file" && return 0
    sleep 0.1
  done
  return 1
}

run_keyboard_scenario() {
  current_step="launching keyboard packaged scenario"
  launch_app

  current_step="checking keyboard-accessible default workspace semantics"
  run_driver wait-text "Log workout now" 30
  run_driver set-size "960x720" 10
  run_driver assert-size "960x720" 10
  run_driver assert-semantic "default"
  run_driver assert-document-fixed "document" 10
  run_driver focus "History" 10
  run_driver assert-visible-focus "History" 10
  run_driver press-key "return" 10
  run_driver assert-text "Previous weeks"
  run_driver focus "Settings" 10
  run_driver press-key "return" 10
  run_driver assert-text "Profile & data"
  run_driver assert-semantic "settings"
  run_driver focus "This Week" 10
  run_driver press-key "return" 10
  run_driver assert-text "Primary departures"
  run_driver assert-state "This Week|current" 10

  current_step="selecting a future row with keyboard activation"
  run_driver focus-contains "Wednesday" 10
  run_driver assert-visible-focus "Wednesday" 10
  run_driver press-key "space" 10
  run_driver assert-semantic "detail"
  run_driver assert-state "Wednesday|pressed" 10
  run_driver assert-text "Wednesday workout"
  run_driver assert-absent-text "Record workout"
  run_driver focus-contains "Close" 10
  run_driver assert-visible-focus "Close" 10
  run_driver press-key "escape" 10
  run_driver assert-focused-text "Wednesday" 10

  current_step="activating Record workout, Skip, and Undo with the keyboard"
  run_driver focus-contains "Monday" 10
  run_driver press-key "space" 10
  run_driver assert-text "Record workout"
  run_driver focus "Skip this session" 10
  run_driver press-key "return" 10
  run_driver assert-text "Skipped"
  run_driver assert-focused-text "Monday" 10
  run_driver focus "Undo skip" 10
  run_driver press-key "return" 10
  run_driver assert-focused-text "Monday" 10
  run_driver press-key "space" 10
  run_driver assert-text "Record workout"
  run_driver assert-focused-text "Close" 10

  current_step="activating conflict confirmation with the keyboard"
  run_driver focus-contains "Monday" 10
  run_driver press-key "space" 10
  run_driver focus "Change to another time" 10
  run_driver press-key "return" 10
  run_driver select-contains "Wednesday · August 12" 10
  # Wednesday retains the source 4:00 PM value; this is an intentional no-op.
  run_driver select-contains-allow-unchanged "4:00 PM" 10
  run_driver focus "Check this time" 10
  run_driver press-key "return" 10
  run_driver assert-text "This time overlaps Wednesday"
  run_driver assert-semantic "warning"
  run_driver assert-live "This time overlaps Wednesday|alert" 10
  run_driver focus "Confirm change" 10
  run_driver assert-visible-focus "Confirm change" 10
  run_driver press-key "return" 10
  run_driver assert-text "Changed this week"
  run_driver assert-focused-text "Monday" 10

  current_step="relaunching the changed target for keyboard direct recording"
  # Keep the moved destination due, but before the 15-minute unresolved state.
  fixed_now_epoch_millis="1786565100000"
  if ! stop_app; then
    fail "app process did not exit after saving the keyboard change-time exception"
  fi
  launch_app
  run_driver wait-text "Unrecorded — ready to record" 30
  run_driver focus-contains "Select Wednesday, August 12, 4:00 PM, Changed workout" 10
  run_driver press-key "space" 10
  run_driver focus "Record workout" 10
  run_driver press-key "return" 10
  run_driver assert-semantic "recording"
  run_driver assert-focused-text "Elliptical" 10
  run_driver press-key "return" 10
  run_driver press "Under 20" 10
  run_driver press "Easy" 10
  run_driver assert-text "Workout recorded"
  run_driver assert-focused-text "Select Wednesday, August 12, 4:00 PM, Changed workout" 10

  current_step="activating the unscheduled workout entry with the keyboard"
  run_driver press-key "escape" 10
  run_driver focus "Log workout now" 10
  run_driver press-key "return" 10
  run_driver assert-text "Unscheduled workout"
  run_driver assert-semantic "detail"

  echo "Packaged IPC keyboard-and-semantics acceptance passed"
  echo "Keyboard: destinations, rows, detail actions, conflict confirmation, and unscheduled entry activated by key events"
  echo "Semantics: landmarks, live status, selected detail, and visible focus were observed through Accessibility"
  echo "Clock: now=$fixed_now_epoch_millis offset_minutes=$fixed_utc_offset_minutes"
}

run_direct_record_scenario() {
  current_step="launching direct-record packaged scenario"
  fixed_now_epoch_millis="1786392300000"
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
  run_driver assert-absent-text "Monday workout"
  run_driver assert-state "Monday|pressed" 10
  run_driver press-contains "Monday" 10
  run_driver assert-text "Elliptical"
  run_driver assert-text "Counts toward weekly progress"
  run_driver assert-absent-text "Record workout"

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
  run_driver assert-absent-text "Record workout"

  echo "Packaged IPC direct-record acceptance passed"
  echo "Workflow: a due planned workout crossed Tauri IPC without a departure response"
  echo "Persistence: the direct record remained visible after relaunch"
  echo "Clock: now=$fixed_now_epoch_millis offset_minutes=$fixed_utc_offset_minutes"
}

run_state_semantics_scenario() {
  current_step="launching unresolved-state packaged scenario"
  fixed_now_epoch_millis="1786366800000"
  launch_app

  current_step="seeding the unanswered due occurrence"
  run_driver wait-text "Log workout now" 30
  if ! stop_app; then
    fail "app process did not exit after seeding the unanswered occurrence"
  fi

  current_step="relaunching after the follow-up becomes due"
  fixed_now_epoch_millis="1786392900000"
  launch_app
  run_driver wait-text "Monday" 30
  run_driver press-contains "Monday" 10
  run_driver assert-text "Unresolved — no response"
  run_driver assert-text "Record workout"
  run_driver assert-absent-text "Leaving for gym"

  echo "Packaged IPC state-semantics acceptance passed"
  echo "State: unresolved remained visibly distinct while its direct record action stayed available"
  echo "Gate: no departure-response screen was required"
  echo "Clock: now=$fixed_now_epoch_millis offset_minutes=$fixed_utc_offset_minutes"
}

run_progress_scenario() {
  current_step="launching unscheduled-progress packaged scenario"
  launch_app

  current_step="checking zero progress and preserving an unscheduled draft"
  run_driver wait-text "Log workout now" 30
  run_driver assert-text "0 of 3 completed"
  run_driver press "Log workout now" 10
  run_driver assert-text "Unscheduled workout"
  run_driver press "Elliptical" 10
  run_driver assert-text "About how long was the workout?"
  run_driver assert-text "0 of 3 completed"
  if ! stop_app; then
    fail "app process did not exit after saving the unscheduled workout draft"
  fi

  current_step="resuming the unscheduled draft without counting it"
  launch_app
  run_driver wait-text "Resume workout" 30
  run_driver press "Resume workout" 10
  run_driver assert-text "Unscheduled workout"
  run_driver assert-text "About how long was the workout?"
  run_driver press "Under 20" 10
  run_driver press "Easy" 10
  run_driver assert-text "0 of 3 completed"

  current_step="recording the first qualifying unscheduled workout"
  run_driver press "Log workout now" 10
  run_driver assert-text "Unscheduled workout"
  run_driver press "Weight training" 10
  run_driver press "30" 10
  run_driver press "Moderate" 10
  run_driver assert-text "1 of 3 completed"

  current_step="recording the second qualifying unscheduled workout"
  run_driver press "Log workout now" 10
  run_driver assert-text "Unscheduled workout"
  run_driver press "Elliptical" 10
  run_driver press "45" 10
  run_driver press "Hard" 10
  run_driver assert-text "2 of 3 completed"

  current_step="completing weekly progress with the third qualifying unscheduled workout"
  run_driver press "Log workout now" 10
  run_driver assert-text "Unscheduled workout"
  run_driver press "Other exercise" 10
  run_driver press "60+ minutes" 10
  run_driver press "Very hard" 10
  run_driver assert-text "3 of 3 completed"
  run_driver assert-text "Weekly goal complete"
  run_driver assert-text "Weekly goal complete — optional workouts welcome"
  run_driver assert-absent-text "Monday workout"

  current_step="checking current-week History source identity and outcomes"
  run_driver press "History" 10
  run_driver assert-text "Recorded workouts"
  run_driver assert-text "Unscheduled workout"
  run_driver assert-text "Short effort — does not count toward weekly progress"
  run_driver assert-text "Counts toward weekly progress"
  run_driver assert-text "Weight training"
  run_driver assert-text "Elliptical"
  run_driver assert-text "Other exercise"

  current_step="checking progress after returning to This Week"
  run_driver press "This Week" 10
  run_driver assert-text "3 of 3 completed"

  current_step="checking complete unscheduled progress after relaunch"
  if ! stop_app; then
    fail "app process did not exit after completing unscheduled progress"
  fi
  launch_app
  run_driver wait-text "3 of 3 completed" 30
  run_driver press "History" 10
  run_driver assert-text "Recorded workouts"
  run_driver assert-text "Unscheduled workout"
  run_driver assert-text "Short effort — does not count toward weekly progress"
  run_driver assert-text "Counts toward weekly progress"

  echo "Packaged IPC unscheduled-progress acceptance passed"
  echo "Workflow: an independent draft crossed relaunch, then Under 20 stayed at zero while qualifying records reached 1, 2, and 3"
  echo "History: current-week records retained the Unscheduled workout source and outcome labels after relaunch"
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
  run_driver assert-text "Unresolved — no response"
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
  run_driver press-contains "Close" 10

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

run_shell_scenario() {
  current_step="launching production shell packaged scenario"
  launch_app

  current_step="checking the default This Week shell at supported viewport sizes"
  run_driver wait-text "Log workout now" 30
  run_driver set-size "960x720" 10
  run_driver assert-size "960x720" 10
  run_driver assert-semantic "default"
  run_driver assert-document-fixed "document" 10
  run_driver assert-text "WEEK OF MONDAY, AUGUST 10"
  run_driver assert-text "0 of 3 completed"
  run_driver assert-text "Next departure"
  run_driver assert-text "Primary departures"
  run_driver assert-text "Open capacity"
  run_driver assert-text "Log workout now"
  run_driver assert-absent-text "Selected workout"
  run_driver assert-absent-text "Leaving for gym"

  run_driver set-size "800x640" 10
  run_driver assert-size "800x640" 10
  run_driver assert-semantic "default"
  run_driver assert-document-fixed "document" 10
  run_driver assert-text "Primary departures"
  run_driver assert-text "Open capacity"

  run_driver set-size "640x520" 10
  run_driver assert-size "640x520" 10
  run_driver assert-semantic "compact"
  run_driver assert-document-fixed "document" 10
  run_driver assert-scroll-surface "agenda" 10
  run_driver assert-text "Destination"
  run_driver assert-text "This Week"
  run_driver assert-absent-text "Selected workout"

  current_step="checking explicit row selection and temporary detail return"
  run_driver set-size "960x720" 10
  run_driver assert-size "960x720" 10
  run_driver press-contains "Wednesday" 10
  run_driver assert-text "Wednesday workout"
  run_driver assert-state "Wednesday|pressed" 10
  run_driver press-contains "Close" 10
  run_driver assert-absent-text "Wednesday workout"
  run_driver assert-state "Wednesday|pressed" 10

  echo "Packaged IPC production shell acceptance passed"
  echo "Shell: This Week stayed list-first with full-width agenda hierarchy at 960x720, 800x640, and 640x520"
  echo "Detail: explicit row selection opened the temporary surface and Close returned to the selected agenda context"
  echo "Clock: now=$fixed_now_epoch_millis offset_minutes=$fixed_utc_offset_minutes"
}

run_list_first_scenario() {
  current_step="waiting for rendered list-first dashboard"
  launch_app
  run_driver wait-text "Log workout now" 30

  current_step="checking the default This Week agenda"
  run_driver set-size "960x720" 10
  run_driver assert-size "960x720" 10
  run_driver assert-semantic "default"
  run_driver assert-document-fixed "document" 10
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
  run_driver assert-text "Available"
  run_driver assert-text "History"
  run_driver assert-text "Settings"
  run_driver assert-absent-text "Selected workout"
  run_driver assert-absent-text "Monday workout"
  run_driver assert-absent-text "Leaving for gym"
  run_driver assert-absent-text "Move to fallback"
  run_driver assert-absent-text "Fallback availability"

  current_step="checking the default shell at intermediate and compact sizes"
  run_driver set-size "800x640" 10
  run_driver assert-size "800x640" 10
  run_driver assert-semantic "default"
  run_driver assert-text "Primary departures"
  run_driver assert-text "Open capacity"
  run_driver set-size "640x520" 10
  run_driver assert-size "640x520" 10
  run_driver assert-semantic "compact"
  run_driver assert-text "This Week"
  run_driver assert-text "Destination"
  run_driver set-size "960x720" 10
  run_driver assert-size "960x720" 10

  current_step="checking direct destination switching"
  run_driver press "History" 10
  run_driver assert-text "Previous weeks"
  run_driver assert-destination-inset "History" 10
  run_driver assert-document-fixed "history" 10
  run_driver press "Settings" 10
  run_driver assert-text "Profile & data"
  run_driver assert-semantic "settings"
  run_driver assert-text "This device keeps one versioned profile"
  run_driver assert-text "No account or network required"
  run_driver assert-destination-inset "Settings" 10
  run_driver assert-document-fixed "settings" 10

  current_step="checking secondary destination insets at compact size"
  run_driver set-size "640x520" 10
  run_driver assert-size "640x520" 10
  run_driver assert-destination-inset "Settings" 10
  run_driver assert-document-fixed "settings" 10
  run_driver assert-scroll-surface "settings" 10
  run_driver set-size "960x720" 10
  run_driver assert-size "960x720" 10
  run_driver press "History" 10
  run_driver assert-text "Previous weeks"
  run_driver set-size "640x520" 10
  run_driver assert-size "640x520" 10
  run_driver assert-destination-inset "History" 10
  run_driver assert-document-fixed "history" 10
  run_driver set-size "960x720" 10
  run_driver assert-size "960x720" 10
  run_driver press "This Week" 10

  current_step="opening and closing a future workout sheet"
  run_driver press-contains "Wednesday" 10
  run_driver assert-text "Selected workout"
  run_driver assert-text "Wednesday workout"
  run_driver assert-text "Scheduled"
  run_driver assert-absent-text "Record workout"
  run_driver press-contains "Close" 10
  run_driver assert-absent-text "Wednesday workout"
  run_driver assert-text "0 of 3 completed"

  current_step="opening a due workout sheet without recording it"
  run_driver press-contains "Monday" 10
  run_driver assert-text "Monday workout"
  run_driver assert-text "Record workout"
  run_driver press-contains "Close" 10
  run_driver assert-absent-text "Monday workout"
  run_driver assert-text "0 of 3 completed"

  echo "Packaged IPC list-first acceptance passed"
  echo "Workflow: the packaged This Week agenda stayed list-first until an explicit row selection"
  echo "Sheet: future and due rows exposed distinct detail state without the departure-response surface"
  echo "Clock: now=$fixed_now_epoch_millis offset_minutes=$fixed_utc_offset_minutes"
}

run_week_close_scenario() {
  current_step="launching week-close packaged scenario"
  fixed_now_epoch_millis="1786392900000"
  launch_app

  current_step="checking an unresolved occurrence and a qualifying record before week close"
  run_driver wait-text "Log workout now" 30
  run_driver assert-text "0 of 3 completed"
  run_driver press-contains "Monday" 10
  run_driver assert-text "Monday workout"
  run_driver assert-text "Unresolved — no response"
  run_driver assert-text "Record workout"
  run_driver press-contains "Close" 10
  run_driver press "Log workout now" 10
  run_driver press "Weight training" 10
  run_driver press "30" 10
  run_driver press "Moderate" 10
  run_driver assert-text "1 of 3 completed"

  current_step="relaunching in the following week"
  if ! stop_app; then
    fail "app process did not exit after the pre-close persistence assertion"
  fi
  fixed_now_epoch_millis="1786971600000"
  launch_app

  current_step="checking week-close History and the fresh default workspace"
  run_driver wait-text "0 of 3 completed" 30
  run_driver assert-semantic "default"
  run_driver assert-text "Primary departures"
  run_driver assert-text "This Week"
  run_driver assert-absent-text "Selected workout"
  run_driver assert-absent-text "Monday workout"
  run_driver press "History" 10
  run_driver assert-text "Previous weeks"
  run_driver assert-text "Monday, August 10 – Sunday, August 16"
  run_driver assert-text "Missed — no response"
  run_driver assert-text "1 of 3 completed"
  run_driver assert-text "Unscheduled workout"
  run_driver assert-text "Weight training"
  run_driver assert-text "Counts toward weekly progress"
  run_driver press "This Week" 10
  run_driver assert-text "Primary departures"
  run_driver assert-text "0 of 3 completed"
  run_driver assert-absent-text "Selected workout"
  run_driver assert-absent-text "Monday workout"

  echo "Packaged IPC week-close acceptance passed"
  echo "Week close: an unresolved no-record occurrence became Missed — no response while a qualifying unscheduled record remained 1 of 3 in History"
  echo "Relaunch: the new app opened list-first on This Week without reopening stale detail"
  echo "Clock: pre_close=1786392900000 post_close=1786971600000 offset_minutes=$fixed_utc_offset_minutes"
}

run_exception_scenario() {
  current_step="launching change-time-and-skip packaged scenario"
  launch_app

  current_step="skipping a due workout without a reason"
  run_driver wait-text "Log workout now" 30
  run_driver set-size "960x720" 10
  run_driver press-contains "Monday" 10
  run_driver assert-text "Change to another time"
  run_driver assert-text "Skip this session"
  run_driver press "Skip this session" 10
  run_driver assert-text "Skipped"
  run_driver assert-text "Undo skip"
  run_driver assert-text "0 of 3 completed"
  run_driver assert-state "Monday|pressed" 10
  run_driver assert-text "Monday"

  current_step="relaunching and undoing the direct skip"
  if ! stop_app; then
    fail "app process did not exit after saving the direct skip"
  fi
  launch_app
  run_driver wait-text "Undo skip" 30
  run_driver press "Undo skip" 10
  run_driver assert-text "0 of 3 completed"
  run_driver assert-state "Monday|pressed" 10
  run_driver assert-text "Monday"
  run_driver press-contains "Monday" 10
  run_driver assert-text "Record workout"
  run_driver assert-text "Change to another time"

  current_step="opening the change-time editor with logical keyboard focus"
  run_driver press "Change to another time" 10
  run_driver assert-text "Change this workout time"
  run_driver assert-text "Check this time"
  run_driver assert-select-option "Monday · August 10" 10
  run_driver select-contains "Monday · August 10" 10
  run_driver select-contains "Saturday · August 15" 10
  # Saturday preserves the source 4:00 PM value as its suggested time.
  run_driver select-contains-allow-unchanged "4:00 PM" 10
  run_driver wait-text "Saturday · August 15" 10
  run_driver wait-text "suggested" 10
  run_driver assert-select-option "Sunday · August 16" 10
  run_driver press "Cancel" 10
  run_driver press "Change to another time" 10
  run_driver assert-text "Change this workout time"

  current_step="previewing and saving an arbitrary Tuesday change-time choice"
  run_driver select-contains "Tuesday · August 11" 10
  run_driver wait-text "Tuesday · August 11" 10
  # Tuesday retains the source 4:00 PM value; this is an intentional no-op.
  run_driver select-contains-allow-unchanged "4:00 PM" 10
  run_driver wait-text "Check this time" 10
  run_driver press "Check this time" 10
  run_driver assert-text "No conflict found"
  run_driver wait-text "Final time:" 10
  run_driver wait-text "Tuesday" 10
  run_driver press-contains "Change to Tuesday" 10
  run_driver assert-text "Changed this week"
  run_driver assert-text "Tuesday"
  run_driver assert-text "0 of 3 completed"
  run_driver assert-state "Monday|pressed" 10
  run_driver assert-focused-text "Monday" 10

  current_step="advancing the isolated packaged clock to the changed target"
  # Keep the moved destination due, but before the 15-minute unresolved state.
  fixed_now_epoch_millis="1786478700000"
  if ! stop_app; then
    fail "app process did not exit after saving the change-time exception"
  fi
  launch_app

  run_driver wait-text "Unrecorded — ready to record" 30
  run_driver assert-text "Changed this week"
  run_driver assert-text "Tuesday"
  current_step="skipping and undoing the moved destination occurrence"
  run_driver press-contains "Tuesday" 10
  run_driver assert-text "Record workout"
  run_driver assert-text "Change to another time"
  run_driver press "Skip this session" 10
  run_driver assert-text "Skipped"
  run_driver assert-text "Undo skip"
  run_driver assert-absent-text "Record workout"
  run_driver assert-absent-text "Change to another time"
  run_driver assert-state "Tuesday|pressed" 10
  run_driver assert-focused-text "Tuesday" 10
  if ! stop_app; then
    fail "app process did not exit after skipping the moved destination"
  fi
  launch_app
  run_driver wait-text "Undo skip" 30
  run_driver press "Undo skip" 10
  run_driver assert-text "0 of 3 completed"
  run_driver assert-state "Tuesday|pressed" 10
  run_driver assert-focused-text "Tuesday" 10
  run_driver press-contains "Tuesday" 10
  run_driver assert-text "Record workout"
  run_driver assert-text "Change to another time"

  current_step="confirming an intentional conflict from the due changed target"
  run_driver press "Change to another time" 10
  run_driver wait-text "Saturday · August 15" 10
  run_driver select-contains "Wednesday · August 12" 10
  # Wednesday retains the current 4:00 PM value; this is an intentional no-op.
  run_driver select-contains-allow-unchanged "4:00 PM" 10
  run_driver wait-text "Check this time" 10
  run_driver press "Check this time" 10
  run_driver assert-text "This time overlaps Wednesday"
  run_driver assert-text "Confirm change"
  run_driver press "Confirm change" 10
  run_driver assert-text "Changed this week"
  run_driver assert-text "Wednesday"
  run_driver assert-text "0 of 3 completed"
  run_driver assert-state "Tuesday|pressed" 10
  run_driver assert-focused-text "Tuesday" 10

  current_step="recording the independent changed target occurrence"
  # Keep the moved destination due, but before the 15-minute unresolved state.
  fixed_now_epoch_millis="1786565100000"
  if ! stop_app; then
    fail "app process did not exit after confirming the conflict"
  fi
  launch_app
  run_driver wait-text "Unrecorded — ready to record" 30
  run_driver assert-text "Changed this week"
  run_driver assert-text "Tuesday"
  run_driver assert-text "Wednesday"
  run_driver press-contains "Select Wednesday, August 12, 4:00 PM, Changed workout" 10
  run_driver assert-semantic "detail" 10
  run_driver assert-text "Wednesday workout"
  run_driver assert-text "Record workout"
  run_driver press "Record workout" 10
  run_driver press "Elliptical" 10
  run_driver press "30" 10
  run_driver press "Moderate" 10
  run_driver assert-text "1 of 3 completed"
  run_driver assert-text "Completed"
  run_driver assert-state "Select Wednesday, August 12, 4:00 PM, Changed workout|pressed" 10
  run_driver assert-focused-text "Select Wednesday, August 12, 4:00 PM, Changed workout" 10

  current_step="checking original and changed target persistence after relaunch"
  if ! stop_app; then
    fail "app process did not exit after recording the changed target occurrence"
  fi
  launch_app
  run_driver wait-text "1 of 3 completed" 30
  run_driver assert-text "Changed this week"
  run_driver assert-text "Tuesday"
  run_driver assert-text "Wednesday"
  run_driver assert-text "Completed"
  run_driver press-contains "Monday" 10
  run_driver assert-text "Changed this week to Tuesday"
  run_driver assert-absent-text "Record workout"
  run_driver assert-absent-text "Change to another time"
  run_driver assert-absent-text "Skip this session"
  run_driver press-contains "Close" 10
  run_driver assert-state "Monday|pressed" 10
  run_driver press-contains "Select Wednesday, August 12, 4:00 PM, Changed workout" 10
  run_driver assert-text "Workout recorded"

  echo "Packaged IPC change-time-and-skip acceptance passed"
  echo "Workflow: direct Skip and Undo crossed Tauri IPC without the departure-response tree"
  echo "Change-time: an arbitrary Tuesday choice was saved, then an intentional Wednesday conflict was previewed and explicitly confirmed"
  echo "Target: the independent changed occurrence was recorded after the isolated clock advanced"
  echo "Persistence: the moved original and recorded target remained visible after relaunch"
  echo "Clock: now=$fixed_now_epoch_millis offset_minutes=$fixed_utc_offset_minutes"
}

run_responsive_scenario() {
  current_step="launching responsive packaged scenario"
  launch_app

  current_step="checking the full desktop workspace at 960x720"
  run_driver wait-text "Log workout now" 30
  run_driver set-size "960x720" 10
  run_driver assert-size "960x720" 10
  run_driver assert-document-fixed "document" 10
  run_driver assert-text "This Week"
  run_driver assert-text "Primary departures"
  run_driver assert-text "Open capacity"
  run_driver press-contains "Wednesday" 10
  run_driver assert-text "Wednesday workout"
  run_driver assert-text "Close"
  run_driver assert-absent-text "Back"

  current_step="preserving the selected sheet at an intermediate narrow viewport"
  run_driver set-size "800x640" 10
  run_driver assert-size "800x640" 10
  run_driver assert-text "Wednesday workout"
  run_driver assert-text "Close"
  run_driver assert-focused-text "Close" 10
  run_driver assert-text "Primary departures"
  run_driver assert-text "History"
  run_driver assert-text "Settings"

  current_step="preserving the selected sheet and switching to compact Back"
  run_driver set-size "640x520" 10
  run_driver assert-size "640x520" 10
  run_driver wait-text "Wednesday workout" 10
  run_driver wait-text "Back" 10
  run_driver assert-semantic "detail-compact"
  run_driver assert-text "Wednesday workout"
  run_driver assert-text "Back"
  run_driver assert-focused-text "Back" 10
  run_driver assert-absent-text "Primary departures"
  run_driver press "Back" 10
  run_driver assert-absent-text "Wednesday workout"
  run_driver assert-text "Primary departures"
  run_driver assert-focused-text "Wednesday" 10

  current_step="keeping closed agenda state closed while resizing"
  run_driver set-size "800x640" 10
  run_driver assert-size "800x640" 10
  run_driver assert-absent-text "Wednesday workout"
  run_driver press "Settings" 10
  run_driver assert-text "Profile & data"
  run_driver assert-semantic "settings"
  run_driver assert-text "This device keeps one versioned profile"
  run_driver assert-text "No account or network required"
  run_driver assert-document-fixed "settings" 10
  run_driver press "This Week" 10
  run_driver assert-text "Primary departures"
  run_driver set-size "960x720" 10
  run_driver assert-size "960x720" 10
  run_driver assert-absent-text "Wednesday workout"

  current_step="checking compact destination labels"
  run_driver set-size "640x520" 10
  run_driver assert-size "640x520" 10
  run_driver assert-semantic "compact"
  run_driver select-contains "History" 10
  run_driver assert-text "Previous weeks"
  run_driver select-contains "Settings" 10
  run_driver assert-text "Profile & data"
  run_driver select-contains "This Week" 10
  run_driver wait-text "Primary departures" 10

  current_step="preserving a pending exception editor across resize"
  run_driver set-size "960x720" 10
  run_driver assert-size "960x720" 10
  run_driver wait-text "Select Monday, August 10" 10
  run_driver focus-contains "Select Monday, August 10" 10
  run_driver press-key "return" 10
  run_driver wait-text "Close" 10
  run_driver press "Change to another time" 10
  run_driver wait-text "Change this workout time" 10
  run_driver focus "Close" 10
  run_driver set-size "800x640" 10
  run_driver assert-size "800x640" 10
  run_driver assert-text "Change this workout time"
  run_driver assert-state "Monday|pressed" 10
  run_driver assert-text "Close"
  run_driver assert-semantic "detail"
  run_driver press "Cancel" 10
  run_driver assert-text "Change to another time"
  run_driver press "Close" 10
  run_driver assert-absent-text "Monday workout"
  run_driver set-size "640x520" 10
  run_driver assert-size "640x520" 10
  run_driver assert-semantic "compact"
  run_driver assert-scroll-surface "agenda" 10
  run_driver assert-text "Primary departures"

  current_step="preserving a pending workout draft across resize"
  run_driver set-size "960x720" 10
  run_driver assert-size "960x720" 10
  run_driver press-contains "Monday" 10
  run_driver assert-text "Close"
  run_driver press "Record workout" 10
  run_driver wait-text "What activity did you do?" 10
  run_driver assert-focused-text "Elliptical" 10
  run_driver press "Elliptical" 10
  run_driver assert-text "About how long was the workout?"
  run_driver focus "Close" 10
  run_driver set-size "800x640" 10
  run_driver assert-size "800x640" 10
  run_driver assert-text "About how long was the workout?"
  run_driver assert-state "Monday|pressed" 10
  run_driver assert-semantic "detail"
  run_driver press "Close" 10
  run_driver assert-absent-text "Monday workout"
  run_driver set-size "640x520" 10
  run_driver assert-size "640x520" 10
  run_driver assert-semantic "compact"
  run_driver assert-scroll-surface "agenda" 10

  echo "Packaged IPC responsive-navigation acceptance passed"
  echo "Viewport: 960x720 desktop, 800x640 intermediate, and 640x520 compact"
  echo "State: selected detail, exception editor, and workout draft survived resize"
  echo "Navigation: compact destination labels and Back restored agenda focus"
  echo "Clock: now=$fixed_now_epoch_millis offset_minutes=$fixed_utc_offset_minutes"
}

run_compact_scenario() {
  current_step="launching compact workflow packaged scenario"
  launch_app

  current_step="checking the compact This Week interaction surface"
  run_driver wait-text "Log workout now" 30
  run_driver set-size "640x520" 10
  run_driver assert-size "640x520" 10
  run_driver assert-semantic "compact"
  run_driver assert-document-fixed "document" 10
  run_driver assert-scroll-surface "agenda" 10

  current_step="opening and cancelling compact change-time editing"
  run_driver press-contains "Monday" 10
  run_driver assert-semantic "detail-compact"
  run_driver assert-text "Back"
  run_driver assert-text "Change to another time"
  run_driver press "Change to another time" 10
  run_driver assert-text "Change this workout time"
  run_driver select-contains "Tuesday · August 11" 10
  # Compact Tuesday retains the source 4:00 PM value; this is an intentional no-op.
  run_driver select-contains-allow-unchanged "4:00 PM" 10
  run_driver wait-text "Check this time" 10
  run_driver press "Check this time" 10
  run_driver assert-text "No conflict found"
  run_driver press "Cancel" 10
  run_driver assert-text "Change to another time"

  current_step="skipping and undoing the compact due occurrence"
  run_driver press "Skip this session" 10
  run_driver assert-text "Skipped"
  run_driver assert-focused-text "Monday" 10
  run_driver press "Undo skip" 10
  run_driver assert-focused-text "Monday" 10
  run_driver press-contains "Select Monday, August 10" 10
  run_driver wait-text "Record workout" 10

  current_step="recording the compact scheduled occurrence"
  run_driver press "Record workout" 10
  run_driver assert-semantic "recording"
  run_driver assert-focused-text "Elliptical" 10
  run_driver press "Elliptical" 10
  run_driver press "30" 10
  run_driver press "Moderate" 10
  run_driver assert-text "Workout recorded"
  run_driver assert-focused-text "Monday" 10

  current_step="recording an unscheduled workout in compact mode"
  run_driver press "Log workout now" 10
  run_driver assert-text "Unscheduled workout"
  run_driver assert-semantic "recording"
  run_driver assert-focused-text "Elliptical" 10
  run_driver press "Elliptical" 10
  run_driver press "30" 10
  run_driver press "Moderate" 10
  run_driver wait-text "2 of 3 completed" 10
  run_driver assert-focused-text "Log workout now" 10

  echo "Packaged IPC compact-workflow acceptance passed"
  echo "Compact: Change, Skip, Undo, scheduled Record, and unscheduled Log workout remained actionable at 640x520"
  echo "Focus: mutation completion returned to the affected agenda row or Log workout trigger"
  echo "Clock: now=$fixed_now_epoch_millis offset_minutes=$fixed_utc_offset_minutes"
}

run_today_scenario() {
  local vault_directory="$acceptance_directory/tortilla-flat-vault"
  local record_directory="$vault_directory/life/Journal/Daily/2026/2026-08"
  local record_file="$record_directory/2026-08-10.md"
  local before_phase_hash
  local after_phase_hash

  current_step="preparing an isolated representative Tortilla Flat vault"
  mkdir -p "$vault_directory/.obsidian" "$record_directory"

  mkdir -p "$acceptance_data_directory"
  if [[ "$acceptance_scenario" != "installed-cycle" ]]; then
    current_step="preselecting the isolated vault for the Today scenario"
    printf '{\n  "schemaVersion": 1,\n  "selectedVault": "%s"\n}\n' \
      "$vault_directory" > "$acceptance_data_directory/today-workspace.json"
  fi

  if [[ "$acceptance_scenario" == "installed-cycle" ]]; then
    current_step="launching the installed daily-cycle scenario with a missing record"
    launch_app
    [[ "$(ps -o command= -p "$app_pid" | sed 's/[[:space:]]*$//')" == "$app_executable" ]] ||
      fail "the packaged app was not launched through its production executable"
    if command -v lsof >/dev/null 2>&1 &&
      lsof -nP -a -p "$app_pid" -iTCP -sTCP:LISTEN 2>/dev/null | grep -q .; then
      fail "the packaged app opened a local TCP listener"
    fi
    run_driver wait-text "Log workout now" 30
    run_driver press "Today" 10
    run_driver wait-text "连接 Tortilla Flat vault" 20
    current_step="selecting the isolated vault through the native folder picker"
    run_driver press "选择 Vault…" 10
    run_driver choose-folder "$vault_directory" 20
    [[ -f "$acceptance_data_directory/today-workspace.json" ]] ||
      fail "the native folder picker closed without persisting a workspace selection"
    [[ "$(/usr/bin/plutil -extract selectedVault raw "$acceptance_data_directory/today-workspace.json" 2>/dev/null)" == "$vault_directory" ]] ||
      fail "the native folder picker persisted a different workspace selection"
    run_driver wait-text "Today 需要一份 Daily Record" 20
    run_driver assert-text "请让 Codex 运行早间流程"

    current_step="surfacing malformed Daily Record identity without guessing"
    cat > "$record_file" <<'EOF'
---
type: note
date: 2026-08-09
---
# malformed representative record

## 用户内容

- 这一行不能被错误状态改写。
EOF
    run_driver press "刷新" 10
    run_driver wait-text "今天的 Daily Record 需要修复" 20
    run_driver assert-text "请修复 type 和 date"
    grep -Fq "这一行不能被错误状态改写" "$record_file" ||
      fail "malformed-state presentation changed the source Markdown"
  fi

  current_step="preparing a canonical daily record in the isolated vault"
  cat > "$record_file" <<'EOF'
---
type: daily-record
date: 2026-08-10
owner: user
source: morning-planning
custom-field: preserve-me
notes: |
  ## 晚间复盘
  ### 用户修正
  这些只是 frontmatter 中的 YAML multiline 内容。
---
# 2026-08-10

## 早间基准

### 初始安排

- **上午：** 完成原定项目；学习是否完成保持未知。
- **下午：** 推进 apartment-renewal。
- **晚上：** 取饭并保留运动选项。

### 初始计划依据

#### 固定安排

- 10:00 check-in

#### Tasks / Habits

- Insurance reimbursement
- Exercise

## 今天的大致安排

- **下午：** 先处理需要 17:00 前完成的紧急工作。
- **晚上：** 17:30 取饭；之后保护恢复空间。

## 计划依据

### 固定安排

- 10:00 check-in

### Tasks（任务）

- [Insurance reimbursement](ticktick://task/123)

### Habits（习惯）

- 深蹲

### Options（可选项）

- 阅读一篇论文

## 用户自己的段落

- [[Private Context]] remains ordinary Obsidian Markdown.

## 白天更新

### 13:40 — 重大调整

- 修订方向：先暂停原定项目。

### 14:10 — 重大调整

突然出现紧急工作，同时能量很低。放弃原本的下午安排。

- 修订方向：17:00 前完成紧急工作；
- 修订方向：Exercise 改为 low-energy baseline：步行 10 分钟；
- 修订方向：晚饭后用于恢复。
- 中午已经休息了一会儿。

### 16:40 — 有意义的记录

紧急工作已经完成，比预期更早恢复了一点精力。

## 晚间复盘

### 今天发生了什么

- 完成主要工作和紧急工作；
- 步行约 12 分钟；
- living space 是否整理保持 unknown。

### 计划与实际

下午因紧急工作偏离原计划，之后保护了恢复时间。

### 简单总结（可选）

这是受约束的一天，不是失败的一天。

### 开放问题

- 有没有一件重要但尚未记录的事？
EOF

  if [[ "$acceptance_scenario" == "installed-cycle" ]]; then
    current_step="refreshing from malformed identity to the repaired canonical record"
    run_driver press "刷新" 10
    run_driver wait-text "完成原定项目" 20
  else
    current_step="launching Today packaged scenario"
    launch_app_waiting_for_text "Log workout now" 30

    current_step="opening the preselected canonical Daily Record"
    run_driver press "Today" 10
    run_driver wait-text "完成原定项目" 20
  fi
  run_driver set-size "960x720" 10

  current_step="checking presentation hierarchy and compact evidence"
  run_driver assert-semantic "today"
  run_driver assert-text "Daily Record"
  run_driver assert-text "当天的初始安排"
  run_driver assert-text "3 个时间块"
  run_driver assert-text "完成原定项目"
  run_driver assert-absent-text "先处理需要 17:00 前完成的紧急工作"
  run_driver assert-absent-text "ticktick://task/123"
  run_driver press "初始计划依据" 10
  run_driver assert-text "Insurance reimbursement"

  current_step="navigating the read-only Daytime and Evening projections"
  before_phase_hash="$(shasum -a 256 "$record_file" | awk '{print $1}')"
  run_driver press "Daytime" 10
  run_driver assert-semantic "today-daytime"
  run_driver assert-state "Daytime|selected" 10
  run_driver assert-text "时间轴 + 记录"
  run_driver assert-text "现在怎么走"
  run_driver assert-text "已发生 / 已确认"
  run_driver assert-text "接下来计划"
  run_driver assert-text "当日简短记录"
  run_driver assert-text "安排变化"
  run_driver assert-text "先暂停原定项目"
  run_driver assert-text "不依据先后顺序判断哪一条仍然有效"
  run_driver assert-text "先处理需要 17:00 前完成的紧急工作"
  run_driver assert-absent-text "完成原定项目"
  run_driver assert-text "14:10 — 重大调整"
  run_driver assert-text "背景"
  run_driver assert-text "突然出现紧急工作"
  run_driver assert-text "接下来这样安排"
  run_driver assert-text "记录内容"
  run_driver assert-text "中午已经休息了一会儿"
  run_driver assert-text "紧急工作已经完成"

  current_step="refusing a stale Daytime write after an external editor save"
  printf '\n<!-- external conflict marker -->\n' >> "$record_file"
  run_driver type-text "Daytime update text|这条冲突候选不能覆盖外部编辑" 10
  run_driver press "保存白天更新" 10
  run_driver wait-text "外部发生变化" 10
  grep -Fq "<!-- external conflict marker -->" "$record_file" ||
    fail "stale Today write removed the external edit"
  if grep -Fq "这条冲突候选不能覆盖外部编辑" "$record_file"; then
    fail "stale Today write reached canonical Markdown"
  fi
  run_driver press "刷新" 10
  run_driver wait-text "紧急工作已经完成" 10

  current_step="saving a bounded daytime update through packaged Tauri IPC"
  run_driver type-text "Daytime update text|确认下午继续推进主要工作" 10
  run_driver press "保存白天更新" 10
  run_driver wait-text "白天更新已写入 Daily Record" 10
  run_driver assert-text "确认下午继续推进主要工作"
  grep -Fq "确认下午继续推进主要工作" "$record_file" ||
    fail "daytime IPC save did not update the canonical Markdown"

  if [[ "$acceptance_scenario" == "today" || "$acceptance_scenario" == "today-write" || "$acceptance_scenario" == "installed-cycle" ]]; then
    current_step="relaunching before the independent evening write flow"
    if ! stop_app; then
      fail "app process did not exit after the daytime Today write"
    fi
    sleep 1
    launch_app_waiting_for_text "Log workout now" 30
    run_driver press "Today" 10
    run_driver wait-text "完成原定项目" 20
  fi

  current_step="opening the refreshed Evening phase"
  run_driver press "Evening" 10
  run_driver assert-state "Evening|selected" 10
  run_driver wait-text "Agent 整理的今日记录" 10
  run_driver assert-semantic "today-evening"
  run_driver assert-state "Evening|selected" 10
  run_driver assert-text "完成主要工作和紧急工作"
  run_driver assert-text "下午因紧急工作偏离原计划"
  run_driver assert-text "这是受约束的一天，不是失败的一天"
  run_driver assert-text "有没有一件重要但尚未记录的事"

  current_step="saving a bounded evening addition through packaged Tauri IPC"
  run_driver type-text "Evening update text|补记：和家人通了电话" 10
  run_driver press "保存晚间更新" 10
  wait_for_file_text "$record_file" "- 补记：和家人通了电话" ||
    fail "evening IPC save did not update the canonical Markdown"
  if [[ "$acceptance_scenario" != "installed-cycle" ]]; then
    run_driver wait-text "晚间更新已写入 Daily Record" 10
    run_driver assert-text "补记：和家人通了电话"
  fi
  grep -Fq "owner: user" "$record_file" ||
    fail "Today writes changed unrelated frontmatter"
  grep -Fq "custom-field: preserve-me" "$record_file" ||
    fail "Today writes changed unfamiliar frontmatter"
  grep -Fq "  ## 晚间复盘" "$record_file" ||
    fail "Today writes changed heading-like YAML multiline content"
  grep -Fq "  ### 用户修正" "$record_file" ||
    fail "Today writes changed subsection-like YAML multiline content"
  grep -Fq "[[Private Context]] remains ordinary Obsidian Markdown." "$record_file" ||
    fail "Today writes changed an unfamiliar Markdown section"
  [[ -n "$(find "$vault_directory/.personal-dashboard-recovery/today" -type f -name '*.snapshot' -print -quit 2>/dev/null)" ]] ||
    fail "Today writes did not retain a non-canonical recovery snapshot"
  after_phase_hash="$(shasum -a 256 "$record_file" | awk '{print $1}')"
  [[ "$before_phase_hash" != "$after_phase_hash" ]] ||
    fail "packaged write flows did not change the canonical Daily Record"

  if [[ "$acceptance_scenario" == "today-write" ]]; then
    current_step="checking exercise isolation after Today writes"
    if ! stop_app; then
      fail "app process did not exit after the evening Today write"
    fi
    launch_app
    run_driver wait-text "Primary departures" 30
    run_driver assert-text "Log workout now"
    echo "Packaged IPC Today write acceptance passed"
    echo "Writes: bounded Daytime and Evening actions crossed real Tauri IPC and were verified in canonical Markdown"
    echo "Isolation: the existing exercise destination remained reachable"
    return
  fi

  current_step="refreshing all phase projections after an external update"
  /usr/bin/perl -0pi -e \
    's/先处理需要 17:00 前完成的紧急工作/先处理已更新的紧急工作/; s/紧急工作已经完成/紧急工作更新后已经完成/; s/这是受约束的一天/这是外部更新后的受约束一天/' \
    "$record_file"
  run_driver press "刷新" 10
  run_driver wait-text "这是外部更新后的受约束一天" 10
  run_driver press "Daytime" 10
  run_driver wait-text "紧急工作更新后已经完成" 10
  run_driver assert-text "先处理已更新的紧急工作"
  run_driver press "Morning" 10
  run_driver wait-text "完成原定项目" 10
  run_driver assert-absent-text "先处理已更新的紧急工作"

  current_step="checking intermediate and compact Today layouts"
  run_driver set-size "800x640" 10
  run_driver assert-size "800x640" 10
  run_driver press "Daytime" 10
  run_driver assert-semantic "today-daytime"
  current_step="relaunching for the independent compact Evening projection"
  if ! stop_app; then
    fail "app process did not exit before the compact Evening projection"
  fi
  sleep 1
  launch_app_waiting_for_text "Log workout now" 30
  run_driver set-size "960x720" 10
  run_driver press "Today" 10
  run_driver set-size "640x520" 10
  run_driver wait-text "完成原定项目" 20
  run_driver set-size "640x520" 10
  run_driver assert-size "640x520" 10
  run_driver press "Evening" 10
  run_driver wait-text "Agent 整理的今日记录" 10
  run_driver assert-semantic "today-evening"
  run_driver assert-text "这是外部更新后的受约束一天"

  current_step="checking quiet partial-record phase states"
  /usr/bin/perl -0pi -e 's/## 白天更新.*\z/## 白天更新\n\n## 晚间复盘\n/s' "$record_file"
  if ! stop_app; then
    fail "app process did not exit before the partial Evening projection"
  fi
  sleep 1
  launch_app_waiting_for_text "Log workout now" 30
  run_driver set-size "960x720" 10
  run_driver press "Today" 10
  run_driver set-size "640x520" 10
  run_driver press "Evening" 10
  run_driver wait-text "Agent 还没有准备晚间复盘" 10
  if ! stop_app; then
    fail "app process did not exit before the partial Daytime projection"
  fi
  sleep 1
  launch_app_waiting_for_text "Log workout now" 30
  run_driver set-size "960x720" 10
  run_driver press "Today" 10
  run_driver set-size "640x520" 10
  run_driver press "Daytime" 10
  run_driver wait-text "今天还没有明确记录的安排变化" 10
  run_driver assert-text "当前安排 · 未按时间推断"
  run_driver assert-text "尚未明确记录修订方向"
  run_driver assert-text "先处理已更新的紧急工作"
  run_driver assert-absent-text "这是外部更新后的受约束一天"

  current_step="checking old-record compatibility without inventing a baseline"
  /usr/bin/perl -0pi -e 's/## 早间基准.*?(?=## 今天的大致安排)//s' "$record_file"
  if ! stop_app; then
    fail "app process did not exit before the old-record compatibility projection"
  fi
  sleep 1
  launch_app_waiting_for_text "Log workout now" 30
  run_driver set-size "960x720" 10
  run_driver press "Today" 10
  run_driver wait-text "未独立保存早间基准" 10
  run_driver assert-absent-text "完成原定项目"
  run_driver press "Daytime" 10
  run_driver wait-text "先处理已更新的紧急工作" 10

  current_step="checking the existing exercise destination remains reachable"
  if [[ "$acceptance_scenario" == "installed-cycle" ]]; then
    if ! stop_app; then
      fail "app process did not exit before the Exercise regression check"
    fi
    sleep 1
    launch_app_waiting_for_text "Primary departures" 30
  else
    run_driver set-size "960x720" 10
    run_driver assert-size "960x720" 10
    run_driver press "This Week" 10
    run_driver wait-text "Primary departures" 10
  fi
  run_driver assert-text "Log workout now"

  if [[ "$acceptance_scenario" == "installed-cycle" ]]; then
    current_step="independently inspecting the resulting canonical Markdown"
    iconv -f UTF-8 -t UTF-8 "$record_file" >/dev/null ||
      fail "the resulting Daily Record is not readable UTF-8 Markdown"
    grep -Fq "type: daily-record" "$record_file" ||
      fail "the resulting Daily Record lost its canonical type"
    grep -Fq "date: 2026-08-10" "$record_file" ||
      fail "the resulting Daily Record lost its canonical date"
    grep -Fq "[[Private Context]] remains ordinary Obsidian Markdown." "$record_file" ||
      fail "the resulting Daily Record lost unfamiliar Obsidian content"
    [[ "$(find "$vault_directory/life" -type f | wc -l | tr -d ' ')" == "1" ]] ||
      fail "the app created a second life data file beside the canonical Daily Record"
    [[ -z "$(find "$acceptance_data_directory" -type f -name '*.md' -print)" ]] ||
      fail "the app created a parallel Markdown life ledger in application data"

    echo "Packaged IPC installed daily-cycle acceptance passed"
    echo "States: native vault selection, missing, malformed identity, repaired valid record, external conflict/refresh, and quiet partial phases"
    echo "Writes: bounded Daytime and Evening actions crossed real Tauri IPC"
    echo "Markdown: UTF-8 canonical identity and unfamiliar Obsidian content survived; no app-owned life ledger was created"
    echo "Viewport: Morning, Daytime, and Evening remained available at 960x720, 800x640, and 640x520"
    echo "Launch: direct packaged executable, no local TCP listener, and existing Exercise destination remained reachable"
    return
  fi

  echo "Packaged IPC Today lifecycle acceptance passed"
  echo "Vault: isolated workspace setting resolved the canonical date path"
  echo "Writes: bounded Daytime and Evening actions crossed real Tauri IPC and were verified in canonical Markdown"
  echo "Refresh: one external record update appeared consistently in every phase"
  echo "Hierarchy: phase-specific primary reading and expandable evidence held at 960x720, 800x640, and 640x520"
  echo "Clock: now=$fixed_now_epoch_millis offset_minutes=$fixed_utc_offset_minutes"
}

run_live_daily_cycle_scenario() {
  local vault_directory="${PERSONAL_DASHBOARD_ACCEPTANCE_LIVE_VAULT:-}"
  local record_date="${PERSONAL_DASHBOARD_ACCEPTANCE_LIVE_DATE:-}"
  local live_phase="${PERSONAL_DASHBOARD_ACCEPTANCE_LIVE_PHASE:-daytime}"
  local expected_morning_text="${PERSONAL_DASHBOARD_ACCEPTANCE_LIVE_MORNING_TEXT:-}"
  local update_text="${PERSONAL_DASHBOARD_ACCEPTANCE_LIVE_UPDATE_TEXT:-}"
  local record_file

  [[ -n "$vault_directory" && -d "$vault_directory/.obsidian" ]] ||
    fail "live-cycle requires PERSONAL_DASHBOARD_ACCEPTANCE_LIVE_VAULT pointing to an Obsidian vault"
  [[ "$record_date" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] ||
    fail "live-cycle requires PERSONAL_DASHBOARD_ACCEPTANCE_LIVE_DATE in YYYY-MM-DD form"
  [[ "$live_phase" == "daytime" || "$live_phase" == "evening" ]] ||
    fail "live-cycle phase must be daytime or evening"
  [[ -n "$expected_morning_text" && -n "$update_text" ]] ||
    fail "live-cycle requires expected morning and update text"
  vault_directory="$(cd "$vault_directory" && pwd -P)"
  record_file="$vault_directory/life/Journal/Daily/${record_date:0:4}/${record_date:0:7}/$record_date.md"
  [[ -f "$record_file" ]] || fail "missing live Daily Record at $record_file"

  current_step="preselecting the live canonical System Workspace"
  mkdir -p "$acceptance_data_directory"
  printf '{\n  "schemaVersion": 1,\n  "selectedVault": "%s"\n}\n' \
    "$vault_directory" > "$acceptance_data_directory/today-workspace.json"

  current_step="launching the packaged app against the live Daily Record"
  launch_app_waiting_for_text "Log workout now" 30
  run_driver set-size "960x720" 10
  run_driver press "Today" 10
  run_driver wait-text "$expected_morning_text" 20
  run_driver assert-semantic "today"

  if [[ "$live_phase" == "daytime" ]]; then
    current_step="writing the live meaningful Daytime update through Tauri IPC"
    run_driver press "Daytime" 10
    run_driver type-text "Daytime update text|$update_text" 10
    run_driver press "保存白天更新" 10
    wait_for_file_text "$record_file" "$update_text" ||
      fail "live Daytime IPC write did not reach the canonical Daily Record"
  else
    current_step="reading the Codex Minimal Review and writing the live Evening addition through Tauri IPC"
    run_driver press "Evening" 10
    run_driver wait-text "今天发生了什么" 10
    run_driver type-text "Evening update text|$update_text" 10
    run_driver press "保存晚间更新" 10
    wait_for_file_text "$record_file" "- $update_text" ||
      fail "live Evening IPC write did not reach the canonical Daily Record"
  fi

  current_step="independently validating the live Daily Record after Dashboard IPC"
  iconv -f UTF-8 -t UTF-8 "$record_file" >/dev/null ||
    fail "live Daily Record is not readable UTF-8 Markdown"
  grep -Fq "type: daily-record" "$record_file" || fail "live Daily Record lost canonical type"
  grep -Fq "date: $record_date" "$record_file" || fail "live Daily Record lost canonical date"
  [[ -z "$(find "$acceptance_data_directory" -type f -name '*.md' -print)" ]] ||
    fail "live-cycle created a parallel Markdown ledger in application data"

  echo "Packaged IPC live ${live_phase} cycle passed"
  echo "Record: $record_file"
  echo "Boundary: the packaged app wrote the canonical Markdown through Tauri IPC without an app-owned life ledger"
}

if [[ "$acceptance_scenario" == "shell" ]]; then
  run_shell_scenario
  exit 0
fi
if [[ "$acceptance_scenario" == "direct" ]]; then
  run_direct_record_scenario
  exit 0
fi
if [[ "$acceptance_scenario" == "state-semantics" ]]; then
  run_state_semantics_scenario
  exit 0
fi
if [[ "$acceptance_scenario" == "progress" ]]; then
  run_progress_scenario
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
if [[ "$acceptance_scenario" == "exceptions" ]]; then
  run_exception_scenario
  exit 0
fi
if [[ "$acceptance_scenario" == "responsive" ]]; then
  run_responsive_scenario
  exit 0
fi
if [[ "$acceptance_scenario" == "compact" ]]; then
  run_compact_scenario
  exit 0
fi
if [[ "$acceptance_scenario" == "keyboard" ]]; then
  run_keyboard_scenario
  exit 0
fi
if [[ "$acceptance_scenario" == "week-close" ]]; then
  run_week_close_scenario
  exit 0
fi
if [[ "$acceptance_scenario" == "today" || "$acceptance_scenario" == "today-write" || "$acceptance_scenario" == "installed-cycle" ]]; then
  run_today_scenario
  exit 0
fi
if [[ "$acceptance_scenario" == "live-cycle" ]]; then
  run_live_daily_cycle_scenario
  exit 0
fi
if [[ "$acceptance_scenario" != "shell" && "$acceptance_scenario" != "direct" && "$acceptance_scenario" != "state-semantics" && "$acceptance_scenario" != "progress" && "$acceptance_scenario" != "workouts" && "$acceptance_scenario" != "exceptions" && "$acceptance_scenario" != "responsive" && "$acceptance_scenario" != "compact" && "$acceptance_scenario" != "keyboard" && "$acceptance_scenario" != "week-close" && "$acceptance_scenario" != "today" && "$acceptance_scenario" != "today-write" && "$acceptance_scenario" != "installed-cycle" && "$acceptance_scenario" != "live-cycle" ]]; then
  fail "unknown acceptance scenario: $acceptance_scenario"
fi
