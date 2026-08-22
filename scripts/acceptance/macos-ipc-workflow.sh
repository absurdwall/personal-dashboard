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
  if supervised_processes_running "$child_pid" "$child_group_id" "$supervision_directory"; then
    return 1
  fi
  remove_acceptance_directory "$supervision_directory"
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

  for scenario in list-first direct state-semantics progress workouts exceptions responsive compact keyboard week-close; do
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
if [[ "$acceptance_scenario" != "shell" && "$acceptance_scenario" != "direct" && "$acceptance_scenario" != "state-semantics" && "$acceptance_scenario" != "progress" && "$acceptance_scenario" != "workouts" && "$acceptance_scenario" != "exceptions" && "$acceptance_scenario" != "responsive" && "$acceptance_scenario" != "compact" && "$acceptance_scenario" != "keyboard" && "$acceptance_scenario" != "week-close" ]]; then
  fail "unknown acceptance scenario: $acceptance_scenario"
fi
