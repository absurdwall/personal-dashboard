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
drive_acceptance_vault=""

fixed_now_epoch_millis="${PERSONAL_DASHBOARD_ACCEPTANCE_NOW_EPOCH_MILLIS:-1786406400000}"
fixed_utc_offset_minutes="${PERSONAL_DASHBOARD_ACCEPTANCE_UTC_OFFSET_MINUTES:--240}"
acceptance_scenario="${PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO:-list-first}"
scenario_budget_seconds="${PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS:-240}"
suite_budget_seconds="${PERSONAL_DASHBOARD_ACCEPTANCE_SUITE_TIMEOUT_SECONDS:-1800}"
main_shell_pid="$$"
scenario_watchdog_pid=""
suite_deadline_monotonic_millis=0

sanitize_acceptance_output() {
  sed -E 's#GoogleDrive-[^/[:space:]]+#GoogleDrive-<account>#g'
}

fail() {
  local sanitized_message
  sanitized_message="$(printf '%s' "$1" | sanitize_acceptance_output)"
  printf 'Packaged IPC acceptance failed at %s: %s\n' \
    "$current_step" "$sanitized_message" >&2
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

  for scenario in settings-vault-colors interface-language background-image day-tasks planning-tasks local-habit-completion historical-corrections dashboard-3 dashboard-4; do
    run_bounded_scenario "$scenario"
  done

  echo "Packaged IPC Personal Dashboard 4.0 local candidate gate passed"
  echo "Coverage: integrated bilingual Today, Calendar, Habits, Settings, Tasks, appearance, and history workflows"
  echo "Retirement: former 2.0 cutover and Exercise/Profile runtime scenarios remain explicit historical seams and are not part of normal-startup 4.0 acceptance"
  echo "Persistence: each workflow runs in an isolated packaged profile and verifies relaunch where required"
  echo "Boundary: actual Drive cloud/version/trash acceptance remains a separate dependency and is not implied by this local gate"
  echo "Budget: ${scenario_budget_seconds}s per scenario, ${suite_budget_seconds}s overall"
}

# The gate delegates setup and cleanup to its bounded child scenarios. Do not
# copy an app bundle or compile a driver in this outer dispatcher first.
if [[ "$acceptance_scenario" == "gate" ]]; then
  run_final_gate
  exit 0
fi

require_positive_integer "scenario budget" "$scenario_budget_seconds"

if [[ "$acceptance_scenario" == "drive-compatibility" ]]; then
  drive_acceptance_vault="${PERSONAL_DASHBOARD_DRIVE_VAULT:-}"
  [[ -n "$drive_acceptance_vault" ]] ||
    fail "drive-compatibility requires PERSONAL_DASHBOARD_DRIVE_VAULT"
  node "$script_directory/drive-vault-policy.mjs" "$drive_acceptance_vault" ||
    fail "Drive acceptance Vault failed the marker and File Provider path policy"
  drive_acceptance_vault="$(cd "$drive_acceptance_vault" && pwd -P)" ||
    fail "could not resolve the Drive acceptance Vault"
fi

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
  printf '%s\n' "$output" | sanitize_acceptance_output
}

open_native_picker_with_retry() {
  local control_label="$1"
  local expected_title="$2"
  local output=""

  for attempt in 1 2; do
    run_driver press "$control_label" 10
    if output="$("$driver_binary" "$app_pid" assert-picker-title "$expected_title" 10 2>&1)"; then
      printf '%s\n' "$output" | sanitize_acceptance_output
      return 0
    fi
    if (( attempt == 1 )); then
      echo "Native picker was not ready; closing any partial panel and retrying once" >&2
      "$driver_binary" "$app_pid" cancel-folder picker 5 >/dev/null 2>&1 || true
      sleep 1
    fi
  done

  fail "$output"
}

capture_background_signature() {
  local output
  if ! output="$("$driver_binary" "$app_pid" content-background-signature "Personal Dashboard 工作区" 10 2>&1)"; then
    fail "$output"
  fi
  printf '%s\n' "$output"
}

open_vault_picker_from_settings() {
  run_driver press "设置" 10
  run_driver press "数据与 Vault" 10
  open_native_picker_with_retry "更换 Vault…" "选择 Tortilla Flat Vault"
}

launch_app_waiting_for_text() {
  local expected_text="$1"
  local timeout_seconds="${2:-30}"
  local output=""

  for attempt in 1 2; do
    launch_app
    if output="$("$driver_binary" "$app_pid" wait-text "$expected_text" "$timeout_seconds" 2>&1)"; then
      sleep 0.3
      if pid_is_running "$app_pid"; then
        printf '%s\n' "$output"
        return 0
      fi
      output="the isolated packaged app exited immediately after Accessibility readiness"
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

task_id_for_name() {
  local file="$1"
  local task_name="$2"
  node - "$file" "$task_name" <<'NODE'
const fs = require("node:fs");
const [file, taskName] = process.argv.slice(2);
const document = JSON.parse(fs.readFileSync(file, "utf8"));
const task = document.tasks.find((candidate) => candidate.name === taskName);
if (!task) process.exit(1);
process.stdout.write(task.id);
NODE
}

assert_task_property() {
  local file="$1"
  local task_id="$2"
  local property_path="$3"
  local expected="$4"
  node - "$file" "$task_id" "$property_path" "$expected" <<'NODE'
const fs = require("node:fs");
const [file, taskId, propertyPath, expected] = process.argv.slice(2);
const document = JSON.parse(fs.readFileSync(file, "utf8"));
const task = document.tasks.find((candidate) => candidate.id === taskId);
if (!task) process.exit(1);
const actual = propertyPath.split(".").reduce((value, key) => value?.[key], task);
const matches = expected === "not-null"
  ? actual !== null && actual !== undefined
  : expected === "null"
    ? actual === null
    : actual === expected;
if (!matches) {
  process.stderr.write(`${taskId}.${propertyPath}: expected ${expected}, got ${JSON.stringify(actual)}\n`);
  process.exit(1);
}
NODE
}

wait_for_task_property() {
  local file="$1"
  local task_id="$2"
  local property_path="$3"
  local expected="$4"
  for _ in {1..50}; do
    if assert_task_property "$file" "$task_id" "$property_path" "$expected" 2>/dev/null; then
      return 0
    fi
    sleep 0.1
  done
  return 1
}

wait_for_list_property() {
  local file="$1"
  local list_id="$2"
  local property="$3"
  local expected="$4"
  for _ in {1..50}; do
    if assert_list_property "$file" "$list_id" "$property" "$expected" 2>/dev/null; then
      return 0
    fi
    sleep 0.1
  done
  return 1
}

assert_list_property() {
  local file="$1"
  local list_id="$2"
  local property="$3"
  local expected="$4"
  node - "$file" "$list_id" "$property" "$expected" <<'NODE'
const fs = require("node:fs");
const [file, listId, property, expected] = process.argv.slice(2);
const document = JSON.parse(fs.readFileSync(file, "utf8"));
const list = document.lists.find((candidate) => candidate.id === listId);
if (!list) process.exit(1);
const actual = list[property];
const matches = expected === "true"
  ? actual === true
  : expected === "false"
    ? actual === false
    : actual === expected;
if (!matches) {
  process.stderr.write(
    listId + "." + property + ": expected " + expected +
      ", got " + JSON.stringify(actual) + "\n"
  );
  process.exit(1);
}
NODE
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
  run_driver focus "Profile & data" 10
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
  launch_app_waiting_for_text "1 of 3 completed" 30

  current_step="checking direct-record persistence after relaunch"
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
  run_driver press "Profile & data" 10
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
  launch_app_waiting_for_text "Undo skip" 30
  run_driver press "Undo skip" 10
  run_driver assert-text "0 of 3 completed"
  run_driver assert-state "Monday|pressed" 10
  run_driver assert-text "Monday"
  run_driver press-contains "Monday" 10
  run_driver assert-text "Record workout"
  run_driver assert-text "Change to another time"

  current_step="opening the change-time editor and checking its choices"
  run_driver press "Change to another time" 10
  run_driver assert-text "Change this workout time"
  run_driver assert-text "Check this time"
  run_driver assert-select-option "Monday · August 10" 10
  # Native menu enumeration may already leave this target selected; the
  # contract is the resulting Saturday value, not a mandatory value delta.
  run_driver select-contains-allow-unchanged "Saturday · August 15" 10
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
  run_driver press "Profile & data" 10
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
    run_driver wait-text "2026-08-10 还没有 Daily Record" 20
    run_driver assert-text "只有明确保存一句记录时才会建立最小记录"

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

  current_step="refusing a stale dated-note write after an external editor save"
  printf '\n<!-- external conflict marker -->\n' >> "$record_file"
  run_driver type-text "Short record text|这条冲突候选不能覆盖外部编辑" 10
  run_driver press "保存记录" 10
  run_driver wait-text "外部发生变化" 10
  grep -Fq "<!-- external conflict marker -->" "$record_file" ||
    fail "stale Today write removed the external edit"
  if grep -Fq "这条冲突候选不能覆盖外部编辑" "$record_file"; then
    fail "stale Today write reached canonical Markdown"
  fi
  run_driver press "刷新" 10
  run_driver wait-text "紧急工作已经完成" 10

  current_step="saving and correcting a dated note through packaged Tauri IPC"
  run_driver type-text "Short record text|跑步 30 分钟" 10
  run_driver press "保存记录" 10
  run_driver wait-text "简短记录已写入 Daily Record" 10
  run_driver assert-text "跑步 30 分钟"
  grep -Fq "跑步 30 分钟" "$record_file" ||
    fail "dated-note IPC save did not update the canonical Markdown"
  run_driver press "更正这条" 10
  run_driver type-text "Short record text|跑步 25 分钟" 10
  run_driver press "保存更正" 10
  run_driver wait-text "更正及修改记录已写入 Daily Record" 10
  run_driver assert-text "跑步 25 分钟"
  grep -Fq "原文：跑步 30 分钟" "$record_file" ||
    fail "dated-note correction did not retain the original text"
  grep -Fq "新文：跑步 25 分钟" "$record_file" ||
    fail "dated-note correction did not append the corrected text"

  if [[ "$acceptance_scenario" == "today" || "$acceptance_scenario" == "today-write" || "$acceptance_scenario" == "installed-cycle" ]]; then
    current_step="relaunching before the independent evening write flow"
    if ! stop_app; then
      fail "app process did not exit after the daytime Today write"
    fi
    sleep 1
    launch_app_waiting_for_text "Log workout now" 30
    run_driver press "Today" 10
    run_driver wait-text "完成原定项目" 20
    run_driver press "Daytime" 10
    run_driver wait-text "跑步 25 分钟" 10
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
  run_driver assert-text "补充与更正"
  run_driver assert-text "跑步 25 分钟"
  run_driver assert-text "Agent 原文保持不变"

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
    echo "Writes: dated-note add/correct/relaunch and bounded Evening actions crossed real Tauri IPC and were verified in canonical Markdown"
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

run_calendar_scenario() {
  local vault_directory="$acceptance_directory/tortilla-flat-vault"
  local record_directory="$vault_directory/life/Journal/Daily/2026/2026-08"
  local reviewed_file="$record_directory/2026-08-08.md"
  local unreviewed_file="$record_directory/2026-08-09.md"
  local malformed_file="$record_directory/2026-08-07.md"
  local today_file="$record_directory/2026-08-10.md"
  local before_hashes
  local after_hashes

  current_step="preparing isolated Calendar Daily Records"
  mkdir -p "$vault_directory/.obsidian" "$record_directory" "$acceptance_data_directory"
  printf '{\n  "schemaVersion": 1,\n  "selectedVault": "%s"\n}\n' \
    "$vault_directory" > "$acceptance_data_directory/today-workspace.json"

  cat > "$reviewed_file" <<'EOF'
---
type: daily-record
date: 2026-08-08
---
# 2026-08-08

## 早间基准

### 初始安排

- **上午：** 周六的初始安排。

### 初始计划依据

## 今天的大致安排

- **下午：** 周六的当前安排。

## 白天更新

### 15:00 — 有意义的事件

- 观察事实：周六完成了明确工作。

## 晚间复盘

### 今天发生了什么

- 周六晚间复盘内容。
EOF

  cat > "$unreviewed_file" <<'EOF'
---
type: daily-record
date: 2026-08-09
---
# 2026-08-09

## 早间基准

### 初始安排

- **上午：** 周日的初始安排。

### 初始计划依据

## 今天的大致安排

- **下午：** 周日的当前安排。

## 白天更新

### 14:00 — 有意义的事件

- 观察事实：周日有一条明确记录。

## 晚间复盘
EOF

  cat > "$malformed_file" <<'EOF'
---
type: note
date: 2026-08-07
---
# malformed Calendar record
EOF

  cat > "$today_file" <<'EOF'
---
type: daily-record
date: 2026-08-10
---
# 2026-08-10

## 早间基准

### 初始安排

- **上午：** 今天的初始安排。

### 初始计划依据

## 今天的大致安排

- **下午：** 今天的当前安排。

## 白天更新

## 晚间复盘

### 今天发生了什么

- 今天的晚间复盘内容。
EOF

  before_hashes="$(shasum -a 256 "$reviewed_file" "$unreviewed_file" "$malformed_file" "$today_file")"

  current_step="opening the FINAL Calendar month and selected-day summary"
  launch_app_waiting_for_text "Today" 30
  run_driver set-size "960x720" 10
  run_driver press "Calendar" 10
  run_driver wait-text "2026 年 8 月" 20
  run_driver assert-semantic "calendar"
  run_driver assert-text "Month view"
  run_driver assert-text "Selected day"
  run_driver assert-text "Calendar 浏览不会修改 Daily Record"
  run_driver assert-text "今天的晚间复盘内容"

  current_step="operating independent year and month Calendar navigation"
  run_driver select-contains "1 月" 10
  run_driver wait-text "2026 年 1 月" 20
  run_driver press "上个月" 10
  run_driver wait-text "2025 年 12 月" 20
  run_driver press "下个月" 10
  run_driver wait-text "2026 年 1 月" 20
  run_driver select-contains "2027 年" 10
  run_driver wait-text "2027 年 1 月" 20
  run_driver select-contains "2 月" 10
  run_driver wait-text "2027 年 2 月" 20
  run_driver press "今天" 10
  run_driver wait-text "2026 年 8 月" 20
  run_driver assert-text "今天的晚间复盘内容"

  current_step="opening a reviewed historical day in Evening"
  run_driver press-contains "8 月 8 日" 10
  run_driver wait-text "周六晚间复盘内容" 10
  run_driver assert-text "有复盘"
  run_driver press "打开完整 Today" 10
  run_driver wait-text "周六晚间复盘内容" 20
  run_driver assert-state "Evening|selected" 10
  run_driver assert-text "Selected day · 2026-08-08"
  run_driver assert-absent-text "保存晚间更新"

  current_step="preserving the selected date and phase through refresh"
  run_driver press "Daytime" 10
  run_driver assert-state "Daytime|selected" 10
  /usr/bin/perl -0pi -e 's/周六的当前安排/周六刷新后的当前安排/' "$reviewed_file"
  run_driver press "刷新" 10
  run_driver wait-text "周六刷新后的当前安排" 10
  run_driver assert-state "Daytime|selected" 10
  run_driver assert-text "Selected day · 2026-08-08"

  current_step="opening an unreviewed historical day in Daytime"
  run_driver press "Calendar" 10
  run_driver press-contains "8 月 9 日" 10
  run_driver wait-text "这一天有 Daily Record，但没有晚间复盘" 10
  run_driver press "打开完整 Today" 10
  run_driver wait-text "周日的当前安排" 20
  run_driver assert-state "Daytime|selected" 10
  run_driver assert-absent-text "保存白天更新"

  current_step="keeping malformed and empty days independently readable"
  run_driver press "Calendar" 10
  run_driver press-contains "8 月 7 日" 10
  run_driver wait-text "读取错误" 10
  run_driver press-contains "8 月 6 日" 10
  run_driver wait-text "没有 Daily Record；保持空白" 10
  [[ ! -e "$record_directory/2026-08-06.md" ]] || fail "Calendar browsing created an empty-day record"
  run_driver press "打开完整 Today" 10
  run_driver wait-text "Selected day · 2026-08-06" 20
  run_driver assert-state "Daytime|selected" 10
  run_driver assert-semantic "dashboard-2-today-daytime"
  run_driver assert-absent-text "保存白天更新"
  run_driver press "Morning" 10
  run_driver assert-state "Morning|selected" 10
  run_driver press "Evening" 10
  run_driver assert-state "Evening|selected" 10
  run_driver press "Calendar" 10
  run_driver wait-text "2026 年 8 月" 20

  current_step="checking compact Calendar and keyboard date movement"
  run_driver set-size "640x520" 10
  run_driver assert-size "640x520" 10
  run_driver assert-semantic "calendar"
  run_driver focus-contains "8 月 8 日" 10
  run_driver press-key "right" 10
  run_driver wait-text "这一天有 Daily Record，但没有晚间复盘" 10
  run_driver assert-state "8 月 9 日|pressed" 10
  run_driver assert-focused-text "8 月 9 日" 10

  current_step="returning to the current local Today"
  run_driver press "Today" 10
  run_driver wait-text "今天的初始安排" 20
  run_driver assert-text "Today · 2026-08-10"
  run_driver assert-state "Morning|selected" 10

  after_hashes="$(shasum -a 256 "$reviewed_file" "$unreviewed_file" "$malformed_file" "$today_file")"
  [[ "$before_hashes" != "$after_hashes" ]] || fail "external refresh fixture did not change as expected"
  [[ "$(printf '%s\n' "$after_hashes" | sed -n '2,4p')" == "$(printf '%s\n' "$before_hashes" | sed -n '2,4p')" ]] ||
    fail "Calendar browsing changed an unrelated source record"

  echo "Packaged IPC Calendar-to-Today acceptance passed"
  echo "Dates: reviewed, unreviewed, malformed, empty, and current local day remained distinct"
  echo "Navigation: selected date survived phase refresh; Today restored 2026-08-10"
  echo "Viewport: Calendar summary, grid, and keyboard date movement remained available at 960x720 and 640x520"
}

run_habits_scenario() {
  local vault_directory="$acceptance_directory/tortilla-flat-vault"
  local snapshot_directory="$vault_directory/.personal-dashboard/derived"
  local snapshot_file="$snapshot_directory/habits-v1.json"
  local record_directory="$vault_directory/life/Journal/Daily/2026/2026-09"
  local record_file="$record_directory/2026-09-07.md"
  local new_record_file="$record_directory/2026-09-06.md"
  local before_snapshot_hash
  local before_malformed_record_hashes

  current_step="preparing isolated Habits snapshot and Daily Record context"
  fixed_now_epoch_millis="1788891000000"
  mkdir -p "$vault_directory/.obsidian" "$snapshot_directory" "$record_directory" "$acceptance_data_directory"
  printf '{\n  "schemaVersion": 1,\n  "selectedVault": "%s"\n}\n' \
    "$vault_directory" > "$acceptance_data_directory/today-workspace.json"
  /bin/cp "$repository_root/src-tauri/tests/fixtures/habits-v1-complete.json" "$snapshot_file"
  cat > "$record_file" <<'EOF'
---
type: daily-record
date: 2026-09-07
---
# 2026-09-07

## 白天更新

### 简短记录

<!-- personal-dashboard:short-record id=run-1 category=exercise created-at=2026-09-07T19:00:00-04:00 needs-review=false -->
- 只是文字记录，不自动计次
EOF
  before_snapshot_hash="$(shasum -a 256 "$snapshot_file")"

  current_step="opening the FINAL Habits snapshot surface"
  launch_app_waiting_for_text "Today" 30
  run_driver set-size "960x720" 10
  run_driver press "习惯" 10
  run_driver wait-text "4 / 15" 20
  run_driver assert-semantic "habits"
  run_driver assert-text "已知次数 / 目标次数"
  run_driver assert-text "Exercise"
  run_driver assert-text "2 / 3"
  run_driver assert-text "营养药"
  run_driver assert-text "2 / 7"
  run_driver assert-text "Reset living space"
  run_driver assert-text "0 / 5"
  run_driver assert-text "07:18"
  run_driver assert-text "仅阈值证据"
  run_driver assert-text "2026-06-22 — 2026-09-13"
  run_driver assert-text "2026-06-22 — 2026-09-08"
  run_driver assert-text "2026-09-08T14:10:00-04:00"
  run_driver assert-text "今天锚点"

  current_step="opening a cross-source OR-completion date and 12-week history"
  run_driver press-contains "2026-09-07 · Exercise" 10
  run_driver wait-text "近 12 周记录" 10
  run_driver assert-text "6 月"
  run_driver assert-text "周一"
  run_driver assert-text "已知完成"
  run_driver assert-text "只是文字记录，不自动计次"
  run_driver assert-text "历史目标 context"
  run_driver wait-text "写一句 · 2026-09-07" 10
  run_driver assert-text "健身 · 日期与关联已预设"

  current_step="preserving a Habits draft across an external record conflict"
  printf '\n<!-- external Habits conflict marker -->\n' >> "$record_file"
  run_driver type-text "健身记录内容|这条 Habits 冲突草稿不能覆盖外部编辑" 10
  run_driver press "保存记录" 10
  run_driver wait-text "外部发生变化" 10
  run_driver assert-text "这条 Habits 冲突草稿不能覆盖外部编辑"
  grep -Fq "<!-- external Habits conflict marker -->" "$record_file" ||
    fail "stale Habits write removed the external edit"
  if grep -Fq "这条 Habits 冲突草稿不能覆盖外部编辑" "$record_file"; then
    fail "stale Habits write reached canonical Markdown"
  fi

  current_step="explicitly creating a missing dated Exercise note from Habits"
  [[ ! -e "$new_record_file" ]] || fail "missing-date Habits fixture already exists"
  run_driver press-contains "2026-09-06 · Exercise" 10
  run_driver wait-text "写一句 · 2026-09-06" 10
  run_driver type-text "健身记录内容|跑步 30 分钟" 10
  run_driver press "保存记录" 10
  run_driver wait-text "健身短句已写入 Daily Record" 20
  run_driver assert-text "跑步 30 分钟"
  run_driver assert-text "2 / 3"
  wait_for_file_text "$new_record_file" "跑步 30 分钟" ||
    fail "Habits note save did not create the canonical dated Daily Record"
  [[ "$(shasum -a 256 "$snapshot_file")" == "$before_snapshot_hash" ]] ||
    fail "Habits note save changed the derived snapshot"

  current_step="reading the same note through Calendar and correcting it in Today"
  run_driver press "Calendar" 10
  run_driver wait-text "2026 年 9 月" 20
  run_driver wait-text "没有 Daily Record；保持空白" 20
  run_driver press-contains "9 月 6 日" 10
  run_driver wait-text "这一天有 Daily Record，但没有晚间复盘" 10
  run_driver press "打开完整 Today" 10
  run_driver wait-text "跑步 30 分钟" 20
  run_driver assert-state "Daytime|selected" 10
  run_driver assert-semantic "dashboard-2-today-daytime"
  run_driver press "更正这条" 10
  run_driver type-text "Short record text|跑步 20 分钟" 10
  run_driver press "保存更正" 10
  run_driver wait-text "更正及修改记录已写入 Daily Record" 20
  run_driver assert-text "跑步 20 分钟"
  [[ "$(grep -c 'personal-dashboard:short-record id=' "$new_record_file")" == "1" ]] ||
    fail "cross-entry correction duplicated the stable short-record identity"
  grep -Fq "原文：跑步 30 分钟" "$new_record_file" ||
    fail "cross-entry correction did not preserve the original text"
  grep -Fq "新文：跑步 20 分钟" "$new_record_file" ||
    fail "cross-entry correction did not append the corrected text"

  current_step="relaunching and reading the corrected stable entry back in Habits"
  if ! stop_app; then
    fail "app process did not exit after the cross-entry correction"
  fi
  launch_app_waiting_for_text "Today" 30
  run_driver press "习惯" 10
  run_driver wait-text "4 / 15" 20
  run_driver press-contains "2026-09-06 · Exercise" 10
  run_driver wait-text "跑步 20 分钟" 20
  run_driver assert-text "修改记录 · 1"
  run_driver assert-text "2 / 3"

  current_step="correcting the shared stable entry directly from Habits"
  run_driver press "更正这条" 10
  run_driver type-text "健身记录内容|跑步 25 分钟" 10
  run_driver press "保存更正" 10
  run_driver wait-text "更正及修改记录已写入 Daily Record" 20
  run_driver assert-text "跑步 25 分钟"
  run_driver assert-text "修改记录 · 2"
  [[ "$(grep -c 'personal-dashboard:short-record id=' "$new_record_file")" == "1" ]] ||
    fail "Habits correction duplicated the stable short-record identity"
  grep -Fq "原文：跑步 20 分钟" "$new_record_file" ||
    fail "Habits correction did not preserve its preceding text"
  grep -Fq "新文：跑步 25 分钟" "$new_record_file" ||
    fail "Habits correction did not append its corrected text"

  current_step="reading the Habits correction through Calendar, Today, and Evening"
  run_driver press "Calendar" 10
  run_driver wait-text "2026 年 9 月" 20
  run_driver press-contains "9 月 6 日" 10
  run_driver wait-text "这一天有 Daily Record，但没有晚间复盘" 10
  run_driver press "打开完整 Today" 10
  run_driver wait-text "跑步 25 分钟" 20
  run_driver press "Evening" 10
  run_driver wait-text "补充与更正" 10
  run_driver assert-text "跑步 25 分钟"
  run_driver assert-text "修改记录 · 2"

  current_step="returning to Habits for compact and retention checks"
  run_driver press "习惯" 10
  run_driver wait-text "4 / 15" 20

  current_step="checking compact Habits layout and destination switcher"
  run_driver set-size "640x520" 10
  run_driver assert-size "640x520" 10
  run_driver assert-semantic "habits"
  run_driver assert-text "Today"
  run_driver assert-text "Calendar"
  run_driver assert-text "Habits"
  run_driver assert-text "4 / 15"
  run_driver assert-text "近 12 周记录"

  current_step="retaining the last valid reading after malformed refresh"
  before_malformed_record_hashes="$(shasum -a 256 "$record_file" "$new_record_file")"
  printf '{"schemaVersion":2}\n' > "$snapshot_file"
  run_driver press "刷新快照" 10
  run_driver wait-text "继续显示上个有效快照" 20
  run_driver assert-text "4 / 15"
  [[ "$(shasum -a 256 "$record_file" "$new_record_file")" == "$before_malformed_record_hashes" ]] ||
    fail "Habits refresh changed Daily Record content"

  echo "Packaged IPC Habits snapshot acceptance passed"
  echo "Projection: corrected 4 / 15 OR-merged summary, daily actual-time evidence, recent dots, and 12-week history crossed real Tauri IPC"
  echo "Entry: Habits created and corrected one dated Exercise note; Calendar, Today, and Evening read the same stable entry across relaunch"
  echo "Boundary: the note changed only the canonical Daily Record; no producer, Dida365 call, polling, snapshot count, or snapshot write"
  echo "Failure: malformed refresh retained the last valid in-process reading with visible status"
  echo "Viewport: Habits remained readable at 960x720 and 640x520"
}

run_local_habit_completion_scenario() {
  local vault_directory="$acceptance_directory/local-habit-vault"
  local snapshot_directory="$vault_directory/.personal-dashboard/derived"
  local snapshot_file="$snapshot_directory/habits-v1.json"
  local snapshot_candidate="$snapshot_directory/habits-v1.candidate.json"
  local completion_file="$vault_directory/life/.personal-dashboard/habit-completions/v1/completions.json"
  local checkbox_label='记录“Reset living space”今天完成'
  local snapshot_hash

  current_step="preparing an isolated local-habit Vault and external snapshot"
  fixed_now_epoch_millis="1788891000000"
  mkdir -p "$vault_directory/.obsidian" "$vault_directory/life/Journal/Daily" \
    "$snapshot_directory" "$acceptance_data_directory"
  printf '{\n  "schemaVersion": 1,\n  "selectedVault": "%s"\n}\n' \
    "$vault_directory" > "$acceptance_data_directory/today-workspace.json"
  /bin/cp "$repository_root/src-tauri/tests/fixtures/habits-v1-complete.json" "$snapshot_file"
  snapshot_hash="$(shasum -a 256 "$snapshot_file" | awk '{print $1}')"

  current_step="recording a local completion through the compact Habits row"
  launch_app_waiting_for_text "Today" 30
  run_driver set-size "1120x760" 10
  run_driver press "习惯" 10
  run_driver wait-text "4 / 15" 20
  run_driver assert-text "Reset living space"
  run_driver assert-text "0 / 5"
  run_driver assert-text "尚无完成证据"
  run_driver press "$checkbox_label" 10
  run_driver wait-text "本地完成已保存到所选 Vault" 20
  run_driver assert-text "1 / 5"
  run_driver assert-text "Dashboard 本地完成"
  run_driver assert-state "$checkbox_label|selected" 10
  wait_for_file_text "$completion_file" '"habitKey": "reset"' ||
    fail "packaged habit completion did not create the canonical local document"
  wait_for_file_text "$completion_file" '"kind": "completed"' ||
    fail "packaged habit completion did not append a completion change"
  [[ "$(shasum -a 256 "$snapshot_file" | awk '{print $1}')" == "$snapshot_hash" ]] ||
    fail "recording a local completion changed the external snapshot"

  current_step="relaunching with the local completion still selected"
  if ! stop_app; then
    fail "app process did not exit before local-habit relaunch"
  fi
  launch_app_waiting_for_text "Today" 30
  run_driver press "习惯" 10
  run_driver wait-text "1 / 5" 20
  run_driver assert-state "$checkbox_label|selected" 10
  run_driver assert-text "Dashboard 本地完成"

  current_step="replacing only the external projection and OR-merging both sources"
  /bin/cp "$snapshot_file" "$snapshot_candidate"
  /usr/bin/perl -0pi -e \
    's/2026-09-08T09:00:00-04:00", "status": "partial"/2026-09-08T09:00:00-04:00", "status": "completed"/' \
    "$snapshot_candidate"
  /bin/mv "$snapshot_candidate" "$snapshot_file"
  snapshot_hash="$(shasum -a 256 "$snapshot_file" | awk '{print $1}')"
  run_driver press "刷新快照" 10
  run_driver wait-text "本地 + 外部：Dida365 打卡、Personal Dashboard local" 20
  run_driver assert-text "1 / 5"
  run_driver assert-state "$checkbox_label|selected" 10

  current_step="withdrawing only local state while external completion remains"
  run_driver press "$checkbox_label" 10
  run_driver wait-text "本地完成已取消；外部来源仍标记完成" 20
  run_driver assert-text "本地已取消；外部仍完成：Dida365 打卡"
  run_driver assert-text "1 / 5"
  run_driver assert-state "$checkbox_label|selected" 10
  wait_for_file_text "$completion_file" '"kind": "withdrawn"' ||
    fail "packaged local withdrawal was not appended"
  [[ "$(shasum -a 256 "$snapshot_file" | awk '{print $1}')" == "$snapshot_hash" ]] ||
    fail "withdrawing a local completion changed the external snapshot"

  current_step="checking the merged completion in the compact Habits layout"
  run_driver set-size "640x520" 10
  run_driver assert-size "640x520" 10
  run_driver assert-state "$checkbox_label|selected" 10
  run_driver assert-text "本地已取消；外部仍完成：Dida365 打卡"

  current_step="checking English source explanation and final relaunch persistence"
  run_driver press "切换为英文" 10
  run_driver wait-text "Local withdrawn; external remains: Dida365 打卡" 10
  run_driver assert-state 'Record “Reset living space” complete today|selected' 10
  if ! stop_app; then
    fail "app process did not exit before final local-habit relaunch"
  fi
  launch_app_waiting_for_text "Today" 30
  run_driver press "Habits" 10
  run_driver wait-text "Local withdrawn; external remains: Dida365 打卡" 20
  run_driver assert-state 'Record “Reset living space” complete today|selected' 10

  echo "Packaged IPC local habit-completion acceptance passed"
  echo "Persistence: local completion and withdrawal survived relaunch in the selected synthetic Vault"
  echo "Merge: external replacement was OR-merged; local withdrawal remained distinct while the merged checkbox stayed selected"
  echo "Boundary: completion operations never changed the rebuildable external snapshot"
  echo "Presentation: the compact checkbox and source explanation were verified in Chinese and English"
}

run_historical_corrections_scenario() {
  local vault="$acceptance_directory/historical-corrections-vault"
  local snapshot="$vault/.personal-dashboard/derived/habits-v1.json"
  local past_record="$vault/life/Journal/Daily/2026/2026-09/2026-09-07.md"
  local prior_week_record="$vault/life/Journal/Daily/2026/2026-08/2026-08-31.md"
  local today_record="$vault/life/Journal/Daily/2026/2026-09/2026-09-08.md"
  local today_tasks="$vault/life/.personal-dashboard/day-tasks/v1/2026/2026-09-08.json"
  local completions="$vault/life/.personal-dashboard/habit-completions/v1/completions.json"
  local completion_label='更正 2026-09-07 的“Reset living space”本地完成'
  local record_hash
  local snapshot_hash
  local completion_change_count
  local completed_change_count
  local withdrawn_change_count

  current_step="preparing an isolated historical-correction Vault"
  fixed_now_epoch_millis="1788841800000"
  mkdir -p "$vault/.obsidian" "$(dirname "$past_record")" "$(dirname "$snapshot")" \
    "$acceptance_data_directory"
  printf '{\n  "schemaVersion": 1,\n  "selectedVault": "%s"\n}\n' \
    "$vault" > "$acceptance_data_directory/today-workspace.json"
  /bin/cp "$repository_root/src-tauri/tests/fixtures/habits-v1-complete.json" "$snapshot"
  cat > "$past_record" <<'EOF'
---
type: daily-record
date: 2026-09-07
---
# 2026-09-07

## 今天的大致安排

- **下午：** 历史日原安排。

## 晚间复盘

### 今天发生了什么

- 历史复盘正文必须逐字保留。
EOF
  record_hash="$(shasum -a 256 "$past_record" | awk '{print $1}')"
  snapshot_hash="$(shasum -a 256 "$snapshot" | awk '{print $1}')"

  current_step="opening the selected past date without mutating its review"
  launch_app_waiting_for_text "当天任务" 30
  run_driver set-size "1120x760" 10
  current_step="reproducing the missing historical completion entry from Habits"
  run_driver press "习惯" 10
  run_driver wait-active-text "本周统计" 20
  run_driver press "展开" 10
  run_driver press-contains "2026-09-07 · Exercise" 10
  run_driver wait-active-text "2026-09-07 · Exercise" 20
  run_driver wait-active-text "查看并补记 2026-09-07 的本地习惯完成" 10
  run_driver set-size "680x760" 10
  run_driver press "查看并补记 2026-09-07 的本地习惯完成" 10
  run_driver wait-active-text "所选日期 · 2026-09-07" 20

  current_step="selecting a prior-week correction date from Habits"
  run_driver set-size "1120x760" 10
  run_driver press "习惯" 10
  run_driver wait-active-text "本周统计" 20
  run_driver press-contains "展开“Reset living space”的历史" 10
  run_driver press-contains "2026-08-31 · Reset living space" 10
  run_driver wait-active-text "2026-08-31 · Reset living space" 20
  run_driver assert-active-text "查看并补记 2026-08-31 的本地习惯完成"
  run_driver press "查看并补记 2026-08-31 的本地习惯完成" 10
  run_driver wait-active-text "所选日期 · 2026-08-31" 20

  current_step="verifying today's Habits cell has no historical correction action"
  run_driver press "习惯" 10
  run_driver wait-active-text "本周统计" 20
  run_driver press-contains "2026-09-08 · Reset living space" 10
  run_driver wait-active-text "2026-09-08 · Reset living space" 20
  run_driver assert-active-absent-text "查看并补记 2026-09-08 的本地习惯完成"
  run_driver press-contains "2026-09-07 · Reset living space" 10
  run_driver wait-active-text "2026-09-07 · Reset living space" 20
  run_driver press "查看并补记 2026-09-07 的本地习惯完成" 10
  run_driver wait-active-text "所选日期 · 2026-09-07" 20

  current_step="opening the selected past date without mutating its review"
  run_driver press "日历" 10
  run_driver wait-active-text "2026年9月" 20
  run_driver press-contains "9月7日" 10
  run_driver wait-active-text "历史复盘正文必须逐字保留" 20
  run_driver press "打开完整 Today" 10
  run_driver wait-active-text "所选日期 · 2026-09-07" 20
  run_driver press "当日进展" 10
  run_driver assert-active-text "本地习惯更正"
  run_driver assert-active-text "当周目标：每周 5 次"
  [[ "$(shasum -a 256 "$past_record" | awk '{print $1}')" == "$record_hash" ]] ||
    fail "opening the historical correction surface changed the existing review"

  current_step="recording and withdrawing the selected date local habit completion"
  run_driver press "习惯" 10
  run_driver wait-active-text "本周统计" 20
  run_driver press "查看并补记 2026-09-07 的本地习惯完成" 10
  run_driver wait-active-text "所选日期 · 2026-09-07" 20
  run_driver press "$completion_label" 10
  run_driver wait-active-text "本地完成已保存到所选 Vault" 20
  run_driver assert-state "$completion_label|selected" 10
  run_driver press "$completion_label" 10
  run_driver wait-active-text "本地完成已取消" 20
  run_driver assert-active-text "本地更正记录 · 2"
  run_driver scroll-text-visible "2026-09-08T00:30-04:00 · 补记本地完成" 10
  run_driver scroll-text-visible "2026-09-08T00:30-04:00 · 撤回本地完成" 10
  run_driver press "$completion_label" 10
  run_driver wait-active-text "本地完成已保存到所选 Vault" 20
  run_driver assert-state "$completion_label|selected" 10
  run_driver assert-active-text "本地更正记录 · 3"
  run_driver scroll-text-visible "2026-09-08T00:30-04:00 · 补记本地完成" 10
  wait_for_file_text "$completions" '"livedDate": "2026-09-07"' ||
    fail "historical habit completion was not bound to the selected lived date"
  completion_change_count="$(awk '/"changedAt": "2026-09-08T00:30-04:00"/ { count++ } END { print count + 0 }' "$completions")"
  completed_change_count="$(awk '/"kind": "completed"/ { count++ } END { print count + 0 }' "$completions")"
  withdrawn_change_count="$(awk '/"kind": "withdrawn"/ { count++ } END { print count + 0 }' "$completions")"
  [[ "$completion_change_count" == "3" && "$completed_change_count" == "2" &&
    "$withdrawn_change_count" == "1" ]] ||
    fail "the selected lived date did not persist a complete-withdraw-complete trace"
  [[ "$(shasum -a 256 "$past_record" | awk '{print $1}')" == "$record_hash" ]] ||
    fail "historical corrections rewrote the existing Daily Record review"
  [[ "$(shasum -a 256 "$snapshot" | awk '{print $1}')" == "$snapshot_hash" ]] ||
    fail "historical corrections rewrote the external habit snapshot"
  [[ ! -e "$prior_week_record" ]] ||
    fail "browsing the prior-week date created a Daily Record"

  current_step="returning to current Today without historical corrections"
  run_driver press "习惯" 10
  run_driver wait-active-text "本周统计" 20
  run_driver assert-active-text "5 / 15"
  run_driver wait-active-text "2026-09-07 · Reset living space" 20
  run_driver assert-active-text "已知完成"
  run_driver press "今天" 10
  run_driver wait-active-text "今天 · 2026-09-08" 20
  run_driver assert-active-absent-text "本地习惯更正"
  [[ ! -e "$today_tasks" ]] || fail "historical task correction created today's task document"
  [[ ! -e "$today_record" ]] || fail "historical habit correction created today's Daily Record"

  current_step="relaunching and verifying historical traces in English"
  if ! stop_app; then
    fail "app process did not exit before historical-correction relaunch"
  fi
  launch_app_waiting_for_text "当天任务" 30
  run_driver press "日历" 10
  run_driver press-contains "9月7日" 10
  run_driver press "打开完整 Today" 10
  run_driver press "当日进展" 10
  run_driver wait-active-text "本地习惯更正" 20
  run_driver assert-active-text "本地更正记录 · 3"
  run_driver press "切换为英文" 10
  run_driver wait-active-text "Local habit corrections" 20
  run_driver assert-active-text "Target for that week: 5 times per week"
  run_driver assert-active-text "Local correction history · 3"
  run_driver press "Habits" 10
  run_driver wait-active-text "Reset living space" 20
  run_driver press-contains "Expand history for “Reset living space”" 10
  run_driver press-contains "2026-09-07 · Reset living space" 10
  run_driver wait-active-text "2026-09-07 · Reset living space" 20
  run_driver assert-active-text "Review and record local habit completion for 2026-09-07"
  run_driver press "Today" 10
  run_driver wait-active-text "Today · 2026-09-08" 20
  run_driver assert-active-absent-text "Local habit corrections"

  echo "Packaged IPC historical-corrections acceptance passed"
  echo "Binding: habit changes stayed on 2026-09-07 while Today remained clean"
  echo "Trace: actual 2026-09-08 modification times and append-only habit history remained visible after relaunch"
  echo "Boundary: the reviewed Daily Record and external snapshot remained byte-identical; no Agent or external service ran"
  echo "Presentation: the Calendar-to-Today correction surface was verified in Chinese and English"
}

run_drive_compatibility_scenario() {
  local vault="$drive_acceptance_vault"
  local record="$vault/life/Journal/Daily/2026/2026-09/2026-09-08.md"
  local record_candidate="$record.drive-candidate"
  local past_record="$vault/life/Journal/Daily/2026/2026-09/2026-09-07.md"
  local task_document="$vault/life/.personal-dashboard/day-tasks/v1/2026/2026-09-08.json"
  local completion_document="$vault/life/.personal-dashboard/habit-completions/v1/completions.json"
  local control_vault="$acceptance_directory/local-isolation-control-vault"
  local control_record="$control_vault/life/Journal/Daily/2026/2026-09/2026-09-08.md"
  local local_task="Drive 离线本地任务 · Synthetic"
  local conflict_draft="Drive 冲突后草稿 · Preserved"
  local historical_task="Drive 历史更正 · Synthetic"
  local habit_label='记录“Reset living space”今天完成'
  local historical_habit_label='更正 2026-09-07 的“Reset living space”本地完成'
  local current_review_hash
  local past_review_hash

  current_step="checking the explicitly stopped Drive client and fresh marker-owned fixture"
  fixed_now_epoch_millis="1788891000000"
  ! pgrep -x "Google Drive" >/dev/null ||
    fail "Drive desktop client must be stopped for the offline-save phase"
  [[ -f "$record" && -f "$past_record" ]] ||
    fail "Drive acceptance fixture is missing its synthetic Daily Records"
  [[ ! -e "$task_document" && ! -e "$completion_document" ]] ||
    fail "Drive acceptance fixture must be fresh; use a new marker-owned folder"
  current_review_hash="$(shasum -a 256 "$record" | awk '{print $1}')"
  past_review_hash="$(shasum -a 256 "$past_record" | awk '{print $1}')"

  current_step="selecting and reading the cached Drive Vault through the packaged app"
  launch_app_waiting_for_text "连接 Tortilla Flat vault" 30
  run_driver set-size "1120x760" 10
  run_driver press "设置" 10
  run_driver press "数据与 Vault" 10
  run_driver press "更换 Vault…" 10
  run_driver choose-folder "$vault" 35
  current_step="opening Today from the selected cached Drive Vault"
  run_driver press "今天" 10
  run_driver press "当日进展" 10
  run_driver wait-active-text "Drive 隔离验收的当前安排" 20
  run_driver wait-active-text "Drive 生产者任务 · Synthetic" 20
  run_driver assert-active-absent-text "Drive 建议不得成为任务"
  run_driver press "刷新" 10
  run_driver wait-active-text "Drive 生产者任务 · Synthetic" 20
  run_driver assert-active-absent-text "Drive 建议不得成为任务"
  run_driver assert-active-text "每日流程导入"

  current_step="saving task and habit completion while the Drive client is stopped"
  run_driver type-text "添加当天任务|$local_task" 10
  run_driver press "添加" 10
  run_driver wait-active-text "$local_task" 20
  run_driver press "切换“${local_task}”的完成状态" 10
  run_driver assert-state "切换“${local_task}”的完成状态|selected" 10
  wait_for_file_text "$task_document" "$local_task" ||
    fail "offline task save did not reach the selected Drive fixture"
  run_driver press "习惯" 10
  run_driver wait-text "Reset living space" 20
  run_driver press "$habit_label" 10
  run_driver wait-text "本地完成已保存到所选 Vault" 20
  wait_for_file_text "$completion_document" '"kind": "completed"' ||
    fail "offline habit completion did not reach the selected Drive fixture"

  current_step="recording a historical correction without changing either review"
  run_driver press "日历" 10
  run_driver wait-active-text "2026年9月" 20
  run_driver press-contains "9月7日" 10
  run_driver press "打开完整 Today" 10
  run_driver wait-active-text "所选日期 · 2026-09-07" 20
  run_driver type-text "添加当天任务|$historical_task" 10
  run_driver press "添加" 10
  run_driver wait-active-text "$historical_task" 20
  run_driver press "$historical_habit_label" 10
  run_driver wait-active-text "本地完成已保存到所选 Vault" 20
  run_driver assert-state "$historical_habit_label|selected" 10
  run_driver press "$historical_habit_label" 10
  run_driver wait-active-text "本地完成已取消" 20
  run_driver assert-active-text "本地更正记录 · 2"
  [[ "$(shasum -a 256 "$record" | awk '{print $1}')" == "$current_review_hash" ]] ||
    fail "offline writes changed the current synthetic Daily Record"
  [[ "$(shasum -a 256 "$past_record" | awk '{print $1}')" == "$past_review_hash" ]] ||
    fail "historical correction changed the synthetic historical review"

  current_step="relaunching offline and rereading local state"
  if ! stop_app; then
    fail "app process did not exit before the offline Drive relaunch"
  fi
  launch_app_waiting_for_text "当天任务" 30
  run_driver wait-active-text "$local_task" 20
  run_driver assert-state "切换“${local_task}”的完成状态|selected" 10
  run_driver press "习惯" 10
  run_driver wait-text "Dashboard 本地完成" 20
  run_driver assert-state "$habit_label|selected" 10
  run_driver press "日历" 10
  run_driver press-contains "9月7日" 10
  run_driver press "打开完整 Today" 10
  run_driver wait-active-text "$historical_task" 20
  run_driver assert-active-text "本地更正记录 · 2"

  current_step="rereading an atomic external replacement and rejecting a stale save"
  /bin/cp "$record" "$record_candidate"
  /usr/bin/perl -0pi -e \
    's/- Drive 隔离验收的当前复盘。/- Drive 隔离验收的当前复盘。\n- Drive 外部替换已重读 · Synthetic/' \
    "$record_candidate"
  /bin/mv "$record_candidate" "$record"
  run_driver press "今天" 10
  run_driver press "刷新" 10
  run_driver press "晚间复盘" 10
  run_driver wait-active-text "Drive 外部替换已重读 · Synthetic" 20
  run_driver type-text "重命名任务|$conflict_draft" 10
  printf ' ' >> "$task_document"
  run_driver press "保存任务" 10
  run_driver wait-active-text "任务未保存" 20
  run_driver assert-active-text "$conflict_draft"
  run_driver press "刷新" 10
  run_driver wait-active-text "$conflict_draft" 20
  run_driver press "保存任务" 10
  run_driver wait-active-text "当天任务已保存" 20
  wait_for_file_text "$task_document" "$conflict_draft" ||
    fail "retry after the external replacement did not save the preserved draft"

  current_step="using a local-only Vault strictly as a cross-Vault isolation control"
  mkdir -p "$control_vault/.obsidian" "$(dirname "$control_record")"
  printf '%s\n' \
    '---' \
    'type: daily-record' \
    'date: 2026-09-08' \
    '---' \
    '# 2026-09-08' \
    '' \
    '## 今天的大致安排' \
    '' \
    '- **上午：** 仅用于隔离控制的本地 Vault。' > "$control_record"
  open_vault_picker_from_settings
  run_driver choose-folder "$control_vault" 35
  run_driver press "今天" 10
  run_driver press "当日进展" 10
  run_driver wait-active-text "仅用于隔离控制的本地 Vault" 20
  run_driver assert-active-absent-text "$conflict_draft"
  open_vault_picker_from_settings
  run_driver choose-folder "$vault" 35
  run_driver press "今天" 10
  run_driver wait-active-text "$conflict_draft" 20
  run_driver assert-active-absent-text "仅用于隔离控制的本地 Vault"

  echo "Packaged IPC Drive compatibility local phase passed"
  echo "Offline: native Vault selection, producer receipt, task save, habit completion, historical correction, and relaunch succeeded while the Drive client was stopped"
  echo "Conflict: an external atomic replacement was reread; a stale task write failed visibly and retained its draft for explicit refresh and retry"
  echo "Isolation: the ordinary temporary Vault was used only as a negative cross-Vault control, never as Drive sync evidence"
  echo "Cloud boundary: this scenario proves local application behavior inside a Drive File Provider root; File Provider upload and remote recovery require separate evidence"
}

run_vault_selection_scenario() {
  local vault_a="$acceptance_directory/vault-a"
  local vault_b="$acceptance_directory/vault-b"
  local snapshot_relative=".personal-dashboard/derived/habits-v1.json"
  local record_relative="life/Journal/Daily/2026/2026-09/2026-09-08.md"
  local record_a="$vault_a/$record_relative"
  local record_b="$vault_b/$record_relative"
  local before_a_hash
  local before_b_hash

  current_step="preparing two isolated Vault selection fixtures"
  fixed_now_epoch_millis="1788891000000"
  mkdir -p \
    "$vault_a/.obsidian" "$vault_b/.obsidian" \
    "$vault_a/$(dirname "$record_relative")" "$vault_b/$(dirname "$record_relative")" \
    "$vault_a/$(dirname "$snapshot_relative")" "$vault_b/$(dirname "$snapshot_relative")" \
    "$acceptance_data_directory"
  /bin/cp "$repository_root/src-tauri/tests/fixtures/habits-v1-complete.json" \
    "$vault_a/$snapshot_relative"
  /bin/cp "$repository_root/src-tauri/tests/fixtures/habits-v1-complete.json" \
    "$vault_b/$snapshot_relative"
  cat > "$record_a" <<'EOF'
---
type: daily-record
date: 2026-09-08
---
# 2026-09-08

## 早间基准

### 初始安排

- **上午：** A Vault 的安排。

### 初始计划依据

## 今天的大致安排

- **上午：** A Vault 的当前安排。

## 白天更新

### 简短记录

<!-- personal-dashboard:short-record id=run-a category=exercise created-at=2026-09-08T12:00:00-04:00 needs-review=false -->
- A Vault 的原始短句。

## 晚间复盘
EOF
  cat > "$record_b" <<'EOF'
---
type: daily-record
date: 2026-09-08
---
# 2026-09-08

## 早间基准

### 初始安排

- **上午：** B Vault 的安排。

### 初始计划依据

## 今天的大致安排

- **上午：** B Vault 的当前安排。

## 白天更新

## 晚间复盘

### 今天发生了什么

- B Vault 的复盘。
EOF
  before_a_hash="$(shasum -a 256 "$record_a" | awk '{print $1}')"
  before_b_hash="$(shasum -a 256 "$record_b" | awk '{print $1}')"

  current_step="launching the isolated Vault selection behavior scenario"
  launch_app_waiting_for_text "Today" 30
  run_driver wait-text "连接 Tortilla Flat vault" 20
  run_driver press "选择 Vault…" 10
  run_driver choose-folder "$vault_a" 20
  run_driver wait-text "Vault: vault-a" 20
  run_driver press "Daytime" 10
  run_driver wait-text "A Vault 的当前安排" 20

  current_step="preserving a Daytime draft when Vault selection is cancelled"
  run_driver type-text "Short record text|取消选择后仍保留的日间草稿" 10
  open_vault_picker_from_settings
  run_driver cancel-folder 20
  run_driver press "Today" 10
  run_driver assert-state "Daytime|selected" 10
  run_driver assert-text "取消选择后仍保留的日间草稿"

  current_step="preserving a Daytime draft when the current Vault is reselected"
  open_vault_picker_from_settings
  run_driver choose-folder "$vault_a" 20
  run_driver press "Today" 10
  run_driver press "Daytime" 10
  run_driver assert-state "Daytime|selected" 10
  run_driver assert-text "取消选择后仍保留的日间草稿"

  current_step="preserving correction state when Vault selection is cancelled"
  run_driver press "更正这条" 10
  run_driver type-text "Short record text|取消选择后仍保留的更正" 10
  open_vault_picker_from_settings
  run_driver cancel-folder 20
  run_driver press "Today" 10
  run_driver press "Daytime" 10
  run_driver assert-state "Daytime|selected" 10
  run_driver assert-text "取消选择后仍保留的更正"
  run_driver assert-text "保存更正"

  current_step="preserving a Habits draft and selected history date on Vault cancellation"
  run_driver press "Habits" 10
  run_driver wait-text "3 / 15" 20
  run_driver press-contains "2026-09-08 · Exercise" 10
  run_driver wait-text "写一句 · 2026-09-08" 20
  run_driver type-text "健身记录内容|取消选择后仍保留的健身草稿" 10
  open_vault_picker_from_settings
  run_driver cancel-folder 20
  run_driver press "Habits" 10
  run_driver assert-text "取消选择后仍保留的健身草稿"
  run_driver assert-text "2026-09-08 · Exercise"

  current_step="proving a real Vault switch clears old state before reading the new Vault"
  open_vault_picker_from_settings
  run_driver choose-folder "$vault_b" 20
  run_driver press "Calendar" 10
  run_driver wait-text "B Vault 的复盘" 20
  run_driver assert-text "有复盘"
  run_driver assert-absent-text "取消选择后仍保留的健身草稿"
  run_driver assert-absent-text "A Vault 的当前安排"
  run_driver press "Today" 10
  run_driver wait-text "Vault: vault-b" 20
  run_driver press "Daytime" 10
  run_driver wait-text "B Vault 的当前安排" 20

  [[ "$(shasum -a 256 "$record_a" | awk '{print $1}')" == "$before_a_hash" ]] ||
    fail "Vault selection behavior changed the old Vault Daily Record"
  [[ "$(shasum -a 256 "$record_b" | awk '{print $1}')" == "$before_b_hash" ]] ||
    fail "Vault selection behavior changed the new Vault Daily Record"

  echo "Packaged IPC Vault selection behavior acceptance passed"
  echo "Cancel: native picker cancellation preserved Today draft, correction, Habits draft, and selected date"
  echo "Same Vault: reselecting the active Vault preserved the Daytime draft and phase"
  echo "Switch: selecting a different Vault cleared old projections before Calendar/Today read the new source"
  echo "Data: both synthetic Vault Daily Records remained byte-identical"
}

run_vault_recovery_scenario() {
  local vault_a="$acceptance_directory/vault-a"
  local vault_bad="$acceptance_directory/vault-bad"
  local record_relative="life/Journal/Daily/2026/2026-09/2026-09-08.md"
  local record_a="$vault_a/$record_relative"
  local record_bad="$vault_bad/$record_relative"
  local workspace_file="$acceptance_data_directory/today-workspace.json"

  current_step="preparing malformed workspace and unreadable selected Vault fixtures"
  fixed_now_epoch_millis="1788891000000"
  mkdir -p \
    "$vault_a/.obsidian" "$vault_bad/.obsidian" \
    "$vault_a/$(dirname "$record_relative")" "$vault_bad/$(dirname "$record_relative")" \
    "$acceptance_data_directory"
  cat > "$record_a" <<'EOF'
---
type: daily-record
date: 2026-09-08
---
# 2026-09-08

## 早间基准

### 初始安排

- **上午：** Recovery A 的安排。

### 初始计划依据

## 今天的大致安排

- **上午：** Recovery A 的当前安排。

## 白天更新

## 晚间复盘

### 今天发生了什么

- Recovery A 的复盘。
EOF
  printf '\377\376' > "$record_bad"
  printf '{not-json\n' > "$workspace_file"

  current_step="surfacing malformed workspace failures on the active Calendar destination"
  launch_app_waiting_for_text "Today" 30
  run_driver press "Calendar" 10
  run_driver wait-active-text "Calendar 读取失败" 20
  run_driver assert-active-text "无法读取 Calendar" 10
  run_driver assert-active-text "The Today workspace setting is invalid" 10
  run_driver press "Today" 10
  run_driver wait-active-text "The Today workspace setting is invalid" 20

  current_step="recovering malformed workspace settings through explicit native selection"
  run_driver press "设置：选择 Vault" 10
  run_driver choose-folder "$vault_a" 20
  run_driver wait-active-text "Vault: vault-a" 20
  run_driver press "Daytime" 10
  run_driver wait-active-text "Recovery A 的当前安排" 20
  grep -Fq '"selectedVault": "'"$vault_a"'"' "$workspace_file" ||
    fail "explicit Vault selection did not repair the malformed workspace setting"

  current_step="surfacing an unreadable new Vault without switching the active Calendar source"
  run_driver press "Calendar" 10
  run_driver wait-active-text "Recovery A 的复盘" 20
  run_driver press "设置：选择 Vault" 10
  run_driver choose-folder "$vault_bad" 20
  run_driver wait-active-text "Vault 选择失败" 20
  run_driver assert-active-text "无法选择 Vault" 10
  run_driver assert-active-text "UTF-8" 10
  grep -Fq '"selectedVault": "'"$vault_a"'"' "$workspace_file" ||
    fail "failed new Vault read changed the committed workspace selection"

  current_step="recovering the failed new Vault selection after its record becomes readable"
  cat > "$record_bad" <<'EOF'
---
type: daily-record
date: 2026-09-08
---
# 2026-09-08

## 早间基准

### 初始安排

- **上午：** Recovery B 的安排。

### 初始计划依据

## 今天的大致安排

- **上午：** Recovery B 的当前安排。

## 白天更新

## 晚间复盘

### 今天发生了什么

- Recovery B 的复盘。
EOF
  run_driver press "设置：选择 Vault" 10
  run_driver choose-folder "$vault_bad" 20
  run_driver wait-active-text "Recovery B 的复盘" 20
  grep -Fq '"selectedVault": "'"$vault_bad"'"' "$workspace_file" ||
    fail "successful Vault recovery did not commit the new workspace selection"
  run_driver press "Today" 10
  run_driver wait-active-text "Vault: vault-bad" 20
  run_driver press "Daytime" 10
  run_driver wait-active-text "Recovery B 的当前安排" 20

  echo "Packaged IPC Vault recovery acceptance passed"
  echo "Malformed settings: Calendar surfaced an active-destination error and explicit native selection repaired the setting"
  echo "Commit semantics: an unreadable new Vault preserved the previous committed selection and active Calendar error"
  echo "Recovery: the same synthetic Vault became selectable after its Daily Record was repaired"
}

run_final_state_matrix_scenario() {
  local vault_directory="$acceptance_directory/vault-final-state-matrix"
  local snapshot_directory="$vault_directory/.personal-dashboard/derived"
  local record_directory="$vault_directory/life/Journal/Daily/2026/2026-09"
  local reviewed_file="$record_directory/2026-09-08.md"
  local unreviewed_file="$record_directory/2026-09-07.md"

  current_step="preparing the missing Calendar and Habits state-size matrix"
  fixed_now_epoch_millis="1788917400000"
  mkdir -p "$vault_directory/.obsidian" "$snapshot_directory" "$record_directory" \
    "$acceptance_data_directory"
  printf '{\n  "schemaVersion": 1,\n  "selectedVault": "%s"\n}\n' \
    "$vault_directory" > "$acceptance_data_directory/today-workspace.json"
  /bin/cp "$repository_root/src-tauri/tests/fixtures/habits-v1-complete.json" \
    "$snapshot_directory/habits-v1.json"
  cat > "$reviewed_file" <<'EOF'
---
type: daily-record
date: 2026-09-08
---
# 2026-09-08

## 早间基准

### 初始安排

- **上午：** 矩阵测试的初始安排。

### 初始计划依据

## 今天的大致安排

- **上午：** 矩阵测试的当前安排。
- **下午：** 矩阵验收的长文本用于检查窄窗口换行与阅读密度；这段内容保持在当前安排语义内，不生成额外状态。

## 白天更新

### 简短记录

<!-- personal-dashboard:short-record id=matrix-1 category=exercise created-at=2026-09-08T12:00:00-04:00 needs-review=false -->
- 矩阵测试的原始健身记录。

## 晚间复盘

### 今天发生了什么

- 矩阵测试的复盘。
EOF
  cat > "$unreviewed_file" <<'EOF'
---
type: daily-record
date: 2026-09-07
---
# 2026-09-07

## 今天的大致安排

- **上午：** 矩阵测试的无复盘日。

## 白天更新

### 12:00 — 一条记录

- 观察事实：这是一个有 Daily Record 但没有晚间复盘的日期。
EOF

  launch_app_waiting_for_text "Today" 30
  for viewport in 1180x820 800x640 640x520; do
    current_step="checking Calendar empty and unreviewed states at ${viewport}"
    run_driver set-size "$viewport" 10
    run_driver assert-size "$viewport" 10
    run_driver press "Calendar" 10
    run_driver wait-active-text "2026 年 9 月" 20
    run_driver assert-active-text "Month view" 10
    run_driver assert-active-text "Selected day" 10
    run_driver press-contains "9 月 7 日" 10
    run_driver wait-active-text "这一天有 Daily Record，但没有晚间复盘" 10
    run_driver press-contains "9 月 6 日" 10
    run_driver wait-active-text "没有 Daily Record；保持空白" 10
    run_driver press-contains "9 月 8 日" 10
    run_driver wait-active-text "矩阵测试的复盘" 10

    current_step="checking Habits edit and correction states at ${viewport}"
    run_driver press "Habits" 10
    run_driver wait-active-text "3 / 15" 20
    run_driver assert-active-text "本周统计" 10
    run_driver assert-active-text "本周习惯在今天" 10
    run_driver press-contains "2026-09-08 · Exercise" 10
    run_driver wait-active-text "写一句 · 2026-09-08" 20
    run_driver type-text "健身记录内容|矩阵 ${viewport} 新记录" 10
    run_driver press "保存记录" 10
    run_driver wait-active-text "健身短句已写入 Daily Record" 20
    run_driver press "更正这条" 10
    run_driver wait-active-text "更正记录 · 2026-09-08" 10
    run_driver type-text "健身记录内容|矩阵 ${viewport} 更正" 10
    run_driver press "保存更正" 10
    run_driver wait-active-text "更正及修改记录已写入 Daily Record" 20
    run_driver assert-active-text "修改记录" 10
    current_step="checking long Today text and keyboard focus at ${viewport}"
    run_driver press "Today" 10
    run_driver press "Daytime" 10
    run_driver wait-active-text "矩阵验收的长文本用于检查窄窗口换行" 10
    run_driver focus "Daytime" 10
    run_driver assert-state "Daytime|selected" 10
  done

  grep -Fq "矩阵 640x520 更正" "$reviewed_file" ||
    fail "Habits edit/correction matrix did not reach the disposable Daily Record"

  echo "Packaged IPC Calendar/Habits state-size matrix acceptance passed"
  echo "Calendar: empty and unreviewed summaries were checked in the visible active destination at 1180x820, 800x640, and 640x520"
  echo "Habits: edit and correction composer states were executed in the visible active destination at all required sizes"
}

run_dashboard_2_scenario() {
  local vault_directory="$acceptance_directory/tortilla-flat-vault"
  local snapshot_directory="$vault_directory/.personal-dashboard/derived"
  local record_directory="$vault_directory/life/Journal/Daily/2026/2026-09"
  local record_file="$record_directory/2026-09-08.md"
  local before_record_hash
  local before_snapshot_hash

  current_step="preparing one continuous FINAL synthetic schedule"
  fixed_now_epoch_millis="1788917400000"
  mkdir -p "$vault_directory/.obsidian" "$snapshot_directory" "$record_directory" "$acceptance_data_directory"
  printf '{\n  "schemaVersion": 1,\n  "selectedVault": "%s"\n}\n' \
    "$vault_directory" > "$acceptance_data_directory/today-workspace.json"
  /bin/cp "$repository_root/src-tauri/tests/fixtures/habits-v1-complete.json" \
    "$snapshot_directory/habits-v1.json"
  cat > "$record_file" <<'EOF'
---
type: daily-record
date: 2026-09-08
source: final-dashboard-2-acceptance
---
# 2026-09-08

## 早间基准

### 初始安排

- **早上（07:30–10:00）：** 先学习，再处理上午的固定安排；早餐、学习一小时，不把空档填满。
- **上午（10:00–12:00）：** 工作 check-in → insurance reimbursement；固定安排后，集中处理今天到期的 reimbursement。
- **中午（12:00–13:30）：** 午饭、留白和 buffer；至少半小时不安排事项，为上午延伸留余地。
- **下午（13:30–17:00）：** 推进 apartment-renewal；若没有紧急事项，给它一个完整工作块。
- **晚上（17:30 以后）：** 取饭、Exercise、自由恢复；取饭后争取 30 分钟锻炼，其余时间不设必须事项。

### 初始计划依据

#### 固定安排

- 10:00 工作 check-in
- 17:30 取晚饭

#### Tasks（任务）

- Insurance reimbursement · 今天到期
- Apartment-renewal · 周五到期

#### Habits（习惯）

- Exercise · normal 30 分钟 / low-energy baseline 走 10 分钟
- Reset living space · 10 分钟

#### Options（选项）

- 学习 Agent memory · 小型 Vibe code · 玩游戏

## 今天的大致安排

- **现在：** 处理需要 17:00 前完成的紧急工作。
- **17:30：** 取晚饭仍然保留。
- **Exercise：** 退到 low-energy baseline，走 10 分钟即可。
- **晚饭后：** 不再安排必须事项，保护恢复空间。
- **未知：** 上午学习实际做了多少、Reset living space 均未记录。

## 计划依据

### 固定安排

- 10:00 工作 check-in
- 17:30 取晚饭

### Tasks（任务）

- Insurance reimbursement · 今天到期
- Apartment-renewal · 周五到期

### Habits（习惯）

- Exercise · normal 30 分钟 / low-energy baseline 走 10 分钟
- Reset living space · 10 分钟

### Options（选项）

- 学习 Agent memory · 小型 Vibe code · 玩游戏

## 白天更新

### 07:18 — 有意义的记录

- 观察事实：07:18 起床。

### 10:00 — 有意义的记录

- 观察事实：参加工作 check-in，午前集中完成 insurance reimbursement。

### 13:40 — 有意义的事件

- 观察事实：出现紧急工作，打断原安排。

### 14:10 — 重大调整

- 原计划意图：下午原本推进 apartment-renewal。
- 变化原因：能量很低 + 临时出现紧急工作。
- 修订方向：紧急工作优先；Exercise 退到 low-energy baseline；17:30 取饭；晚饭后保护休息。

## 晚间复盘

### 今天发生了什么

- 07:18 起床。
- 10:00 参加工作 check-in，上午处理报销。
- 13:40 临时工作打断原安排，14:10 将下午改为先处理急事。
- 17:30 取饭，19:00 跑步 30 分钟，之后休息。
- 原定项目没有继续，早间学习完成量没有记录。

### 计划与实际

下午因紧急工作偏离早间基准，完成急事后保护了恢复时间。

### 简单总结（可选）

完成了必要事项，也保留了恢复空间。
EOF
  before_record_hash="$(shasum -a 256 "$record_file")"
  before_snapshot_hash="$(shasum -a 256 "$snapshot_directory/habits-v1.json")"

  current_step="checking wide FINAL Today with complete schedule content"
  launch_app_waiting_for_text "Today" 30
  run_driver set-size "1180x820" 10
  run_driver assert-size "1180x820" 10
  run_driver assert-text "Personal Dashboard"
  run_driver assert-text "Daily life"
  run_driver assert-text "设置"
  run_driver assert-text "更多选项暂不可用"
  run_driver assert-text "TODAY · 2026-09-08"
  run_driver assert-text "9 月 8 日"
  run_driver press "Today" 10
  run_driver wait-text "先学习，再处理上午的固定安排" 20
  run_driver assert-semantic "dashboard-2-today"
  run_driver assert-text "Today · 2026-09-08"
  run_driver assert-text "5 个时间块"
  run_driver assert-text "取饭、Exercise、自由恢复"
  run_driver press-contains "初始计划依据" 10
  run_driver assert-text "Options"
  run_driver assert-text "小型 Vibe code"
  run_driver press "Daytime" 10
  run_driver assert-state "Daytime|selected" 10
  run_driver assert-semantic "dashboard-2-today-daytime"
  run_driver assert-text "07:18 起床"
  run_driver assert-text "处理需要 17:00 前完成的紧急工作"
  run_driver assert-text "下午原本推进 apartment-renewal"
  run_driver assert-text "Exercise 退到 low-energy baseline"
  run_driver assert-text "Reset living space 均未记录"
  run_driver press "Evening" 10
  run_driver assert-state "Evening|selected" 10
  run_driver focus "Evening" 10
  run_driver assert-semantic "dashboard-2-today-evening"
  run_driver wait-text "19:00 跑步 30 分钟" 10
  run_driver wait-text "19:00 跑步 30 分钟" 10
  run_driver scroll-to-bottom "today" 10
  run_driver wait-text "早间学习完成量没有记录" 10
  run_driver wait-text "完成了必要事项，也保留了恢复空间" 10
  run_driver assert-document-fixed "document" 10

  current_step="checking wide FINAL Calendar against the same schedule"
  run_driver press "Calendar" 10
  run_driver wait-text "2026 年 9 月" 20
  run_driver assert-semantic "dashboard-2-calendar"
  run_driver assert-text "有复盘"
  run_driver assert-text "07:18 起床"
  run_driver assert-document-fixed "document" 10

  current_step="checking wide FINAL Habits against the same schedule"
  run_driver press "Habits" 10
  run_driver wait-text "3 / 15" 20
  run_driver assert-semantic "dashboard-2-habits"
  run_driver assert-text "07:18"
  run_driver assert-text "仅阈值证据"
  run_driver press-contains "2026-09-08 · Exercise" 10
  run_driver assert-text "已知完成"
  run_driver assert-text "Dida365 打卡"
  run_driver assert-document-fixed "document" 10

  current_step="checking intermediate FINAL layouts and complete content"
  run_driver set-size "800x640" 10
  run_driver assert-size "800x640" 10
  run_driver assert-semantic "dashboard-2-habits"
  run_driver assert-text "近 12 周记录"
  run_driver press "Calendar" 10
  run_driver assert-semantic "dashboard-2-calendar"
  run_driver assert-text "Selected day"
  run_driver press "Today" 10
  run_driver press "Daytime" 10
  run_driver assert-state "Daytime|selected" 10
  run_driver assert-semantic "dashboard-2-today-daytime"
  run_driver assert-text "17:30 取饭"
  run_driver assert-text "Exercise 退到 low-energy baseline"
  run_driver assert-document-fixed "document" 10

  current_step="checking narrow FINAL layouts, hierarchy, and primary actions"
  run_driver set-size "640x520" 10
  run_driver assert-size "640x520" 10
  run_driver assert-semantic "dashboard-2-today-daytime"
  run_driver assert-text "Today"
  run_driver assert-text "Calendar"
  run_driver assert-text "Habits"
  run_driver assert-text "Reset living space 均未记录"
  run_driver press "Calendar" 10
  run_driver assert-semantic "dashboard-2-calendar"
  run_driver assert-text "打开完整 Today"
  run_driver press "Habits" 10
  run_driver wait-text "3 / 15" 20
  run_driver assert-semantic "dashboard-2-habits"
  run_driver press-contains "2026-09-08 · Exercise" 10
  run_driver assert-text "近 12 周记录"
  run_driver press "Today" 10
  run_driver press "Evening" 10
  run_driver assert-state "Evening|selected" 10
  run_driver scroll-to-bottom "today" 10
  run_driver assert-semantic "dashboard-2-today-evening"
  run_driver assert-text "完成了必要事项，也保留了恢复空间"
  run_driver assert-document-fixed "document" 10

  [[ "$(shasum -a 256 "$record_file")" == "$before_record_hash" ]] ||
    fail "FINAL visual reading changed the canonical Daily Record"
  [[ "$(shasum -a 256 "$snapshot_directory/habits-v1.json")" == "$before_snapshot_hash" ]] ||
    fail "FINAL visual reading changed the Habits snapshot"

  echo "Packaged IPC Personal Dashboard 2.0 FINAL composite acceptance passed"
  echo "Continuity: one complete 2026-09-08 schedule crossed Today, Calendar, and Habits without changing source bytes"
  echo "Content: baseline, explicit facts, daytime replan, actual evening account, unknown learning, and sourced habit evidence remained distinct"
  echo "Viewport: semantic hierarchy, complete content, and primary actions passed at 1180x820, 800x640, and 640x520"
}

run_settings_vault_colors_scenario() {
  local vault_a="$acceptance_directory/settings-vault-a"
  local vault_b="$acceptance_directory/settings-vault-b"
  local record_relative="life/Journal/Daily/2026/2026-09/2026-09-08.md"
  local record_a="$vault_a/$record_relative"
  local record_b="$vault_b/$record_relative"
  local appearance_file="$acceptance_data_directory/appearance.json"
  local before_a_hash
  local before_b_hash

  current_step="preparing isolated Settings, Vault, and color fixtures"
  fixed_now_epoch_millis="1788891000000"
  mkdir -p \
    "$vault_a/.obsidian" "$vault_b/.obsidian" \
    "$vault_a/$(dirname "$record_relative")" "$vault_b/$(dirname "$record_relative")" \
    "$acceptance_data_directory"
  cat > "$record_a" <<'EOF'
---
type: daily-record
date: 2026-09-08
---
# 2026-09-08

## 今天的大致安排

- **上午：** Settings Vault A 的合成安排。
EOF
  cat > "$record_b" <<'EOF'
---
type: daily-record
date: 2026-09-08
---
# 2026-09-08

## 今天的大致安排

- **上午：** Settings Vault B 的合成安排。
EOF
  before_a_hash="$(shasum -a 256 "$record_a" | awk '{print $1}')"
  before_b_hash="$(shasum -a 256 "$record_b" | awk '{print $1}')"

  current_step="opening Settings and selecting an isolated local Vault"
  launch_app_waiting_for_text "连接 Tortilla Flat vault" 30
  run_driver press "设置" 10
  run_driver wait-active-text "外观" 10
  run_driver assert-active-text "保存在这台 Mac，不随 Vault 切换"
  run_driver press "数据与 Vault" 10
  run_driver assert-active-text "尚未配置本地 Vault"
  run_driver assert-active-text "无需 Dashboard 账号"
  run_driver assert-active-text "本地已保存"
  run_driver assert-active-text "云端已同步"
  open_native_picker_with_retry "更换 Vault…" "选择 Tortilla Flat Vault"
  run_driver choose-folder "$vault_a" 35
  run_driver wait-active-text "$vault_a" 20
  run_driver assert-active-text "本地位置可用"

  current_step="saving a shared accent color and proving packaged relaunch persistence"
  run_driver press "外观" 10
  run_driver press "雾蓝" 10
  run_driver wait-active-text "颜色已保存在这台 Mac" 10
  run_driver assert-same-rendered-color "全局主题色样本|雾蓝" 10
  run_driver press "今天" 10
  run_driver assert-same-rendered-color "刷新|全局主题色样本" 10
  run_driver press "日历" 10
  run_driver assert-same-rendered-color "今天|全局主题色样本" 10
  run_driver press "习惯" 10
  run_driver assert-same-rendered-color "刷新快照|全局主题色样本" 10
  run_driver press "设置" 10
  grep -Fq '"accentColor": "blue"' "$appearance_file" ||
    fail "packaged color choice was not persisted in isolated app data"
  if ! stop_app; then
    fail "app process did not exit before color persistence relaunch"
  fi
  launch_app_waiting_for_text "早间基准" 30
  run_driver assert-same-rendered-color "刷新|全局主题色样本" 10
  run_driver press "当日进展" 10
  run_driver wait-active-text "Settings Vault A 的合成安排" 20
  run_driver press "设置" 10
  run_driver assert-state "雾蓝|pressed" 10

  current_step="switching Vault without changing the Mac-local color preference"
  run_driver press "数据与 Vault" 10
  open_native_picker_with_retry "更换 Vault…" "选择 Tortilla Flat Vault"
  run_driver choose-folder "$vault_b" 35
  run_driver wait-active-text "$vault_b" 20
  grep -Fq '"accentColor": "blue"' "$appearance_file" ||
    fail "Vault switch changed the Mac-local accent preference"
  run_driver press "今天" 10
  run_driver press "当日进展" 10
  run_driver wait-active-text "Settings Vault B 的合成安排" 20

  current_step="showing unavailable-Vault recovery and restoring defaults safely"
  if ! stop_app; then
    fail "app process did not exit before unavailable-Vault check"
  fi
  /bin/mv "$vault_b" "$acceptance_directory/settings-vault-b-moved"
  launch_app_waiting_for_text "当前 Vault 文件夹不可用" 30
  run_driver assert-active-text "选择 Vault…"
  run_driver press "设置" 10
  run_driver press "数据与 Vault" 10
  run_driver assert-active-text "$vault_b"
  run_driver assert-active-text "本地位置不可用"
  open_native_picker_with_retry "更换 Vault…" "选择 Tortilla Flat Vault"
  run_driver choose-folder "$vault_a" 35
  run_driver press "外观" 10
  run_driver press "恢复默认外观" 10
  run_driver wait-active-text "Vault 数据未更改" 10
  run_driver assert-state "松绿|pressed" 10
  run_driver press "今天" 10
  run_driver assert-same-rendered-color "刷新|全局主题色样本" 10
  grep -Fq '"accentColor": "forest"' "$appearance_file" ||
    fail "default appearance was not persisted"

  [[ "$(shasum -a 256 "$record_a" | awk '{print $1}')" == "$before_a_hash" ]] ||
    fail "Settings or appearance actions changed Vault A data"
  [[ "$(shasum -a 256 "$acceptance_directory/settings-vault-b-moved/$record_relative" | awk '{print $1}')" == "$before_b_hash" ]] ||
    fail "Settings or appearance actions changed Vault B data"

  echo "Packaged IPC Settings, Vault, and color acceptance passed"
  echo "Settings: Appearance and Data & Vault remained distinct and exposed the local path/status plus Drive desktop-client boundary"
  echo "Vault: native selection, cross-Vault reading, and unavailable-location recovery used isolated synthetic records"
  echo "Appearance: rendered theme pixels matched the selected swatch across all three pages and relaunch; restoring defaults left both Vault records byte-identical"
}

run_interface_language_scenario() {
  local vault_a="$acceptance_directory/language-vault-a"
  local vault_b="$acceptance_directory/language-vault-b"
  local record_relative="life/Journal/Daily/2026/2026-09/2026-09-08.md"
  local record_a="$vault_a/$record_relative"
  local record_b="$vault_b/$record_relative"
  local language_file="$acceptance_data_directory/interface-language.json"
  local before_b_hash
  local after_save_hash
  local draft_text="未保存草稿 · Keep my words exactly"
  local long_drive_copy='Ordinary local Vaults also work. Dashboard does not convert arbitrary notes, manage Google accounts, or upload files. “Saved locally” does not mean “synced to the cloud.” Google Drive manages versions and trash.'

  current_step="preparing isolated bilingual-interface fixtures"
  fixed_now_epoch_millis="1788891000000"
  mkdir -p \
    "$vault_a/.obsidian" "$vault_b/.obsidian" \
    "$vault_a/$(dirname "$record_relative")" "$vault_b/$(dirname "$record_relative")" \
    "$acceptance_data_directory"
  cat > "$record_a" <<'EOF'
---
type: daily-record
date: 2026-09-08
---
# 2026-09-08

## 今天的大致安排

- **上午：** 中文个人内容 · Keep source English unchanged.
EOF
  cat > "$record_b" <<'EOF'
---
type: daily-record
date: 2026-09-08
---
# 2026-09-08

## 今天的大致安排

- **上午：** 第二份中文个人内容 · Keep source English unchanged.
EOF
  printf '{\n  "schemaVersion": 1,\n  "selectedVault": "%s"\n}\n' \
    "$vault_a" > "$acceptance_data_directory/today-workspace.json"
  before_b_hash="$(shasum -a 256 "$record_b" | awk '{print $1}')"

  current_step="checking the Chinese interface and preserving an in-progress draft"
  launch_app_waiting_for_text "早间基准" 30
  run_driver set-size "800x640" 10
  run_driver assert-size "800x640" 10
  run_driver assert-active-text "今天"
  run_driver assert-active-text "日历"
  run_driver assert-active-text "习惯"
  run_driver press "当日进展" 10
  run_driver assert-active-text "中文个人内容 · Keep source English unchanged"
  run_driver type-text "简短记录内容|$draft_text" 10
  run_driver assert-active-text "$draft_text"
  run_driver assert-state "当日进展|selected" 10

  current_step="checking the Chinese native Vault picker title without changing Vault"
  run_driver press "设置" 10
  run_driver press "数据与 Vault" 10
  open_native_picker_with_retry "更换 Vault…" "选择 Tortilla Flat Vault"
  run_driver cancel-folder "picker" 10
  run_driver press "今天" 10
  run_driver press "当日进展" 10
  run_driver assert-active-text "$draft_text"

  current_step="switching the live packaged interface to English without replacing state"
  run_driver press "切换为英文" 10
  run_driver wait-active-text "Settings" 10
  run_driver assert-active-text "Today"
  run_driver assert-active-text "Calendar"
  run_driver assert-active-text "Habits"
  run_driver assert-active-text "Daytime progress"
  run_driver assert-state "Daytime progress|selected" 10
  run_driver assert-active-text "$draft_text"
  run_driver assert-active-text "中文个人内容 · Keep source English unchanged"
  run_driver assert-active-absent-text "保存记录"

  current_step="checking long English Settings copy and localized Calendar and Habits states"
  run_driver press "Settings" 10
  run_driver wait-active-text "Appearance" 10
  run_driver press "Data & Vault" 10
  run_driver assert-active-text "Your records remain in the local folder you choose"
  run_driver assert-active-text "Saved locally"
  run_driver assert-active-text "synced to the cloud"
  run_driver scroll-text-visible "$long_drive_copy" 10
  run_driver assert-long-text-fits "$long_drive_copy" 10
  run_driver assert-document-fixed "document" 10
  run_driver press "Calendar" 10
  run_driver wait-active-text "September 2026" 20
  run_driver assert-active-text "Tue, Sep 8"
  run_driver assert-active-text "Choose a date to preview its summary"
  run_driver press "Habits" 10
  run_driver wait-active-text "No Habits snapshot exists" 20
  run_driver assert-active-text "Habits this week"

  current_step="saving the preserved draft verbatim after returning to Today"
  run_driver press "Today" 10
  run_driver press "Daytime progress" 10
  run_driver assert-active-text "$draft_text"
  run_driver press "Save note" 10
  run_driver wait-active-text "short note was saved" 20
  wait_for_file_text "$record_a" "$draft_text" ||
    fail "the preserved bilingual draft was not saved verbatim"
  grep -Fq "中文个人内容 · Keep source English unchanged" "$record_a" ||
    fail "language switching rewrote existing personal Markdown"
  after_save_hash="$(shasum -a 256 "$record_a" | awk '{print $1}')"

  current_step="switching Vault while retaining the independent English preference"
  run_driver press "Settings" 10
  run_driver press "Data & Vault" 10
  open_native_picker_with_retry "Change Vault…" "Select the Tortilla Flat Vault"
  run_driver choose-folder "$vault_b" 35
  run_driver wait-active-text "$vault_b" 20
  grep -Fq '"interfaceLanguage": "en"' "$language_file" ||
    fail "the packaged English preference was not persisted"
  run_driver press "Today" 10
  run_driver press "Daytime progress" 10
  run_driver wait-active-text "第二份中文个人内容 · Keep source English unchanged" 20
  run_driver assert-state "Daytime progress|selected" 10
  [[ "$(shasum -a 256 "$record_b" | awk '{print $1}')" == "$before_b_hash" ]] ||
    fail "language or Vault switching changed Vault B Markdown"

  current_step="proving English relaunch persistence"
  if ! stop_app; then
    fail "app process did not exit before language persistence relaunch"
  fi
  launch_app_waiting_for_text "Morning baseline" 30
  run_driver assert-active-text "Settings"
  run_driver press "Daytime progress" 10
  run_driver assert-active-text "第二份中文个人内容 · Keep source English unchanged"
  grep -Fq '"interfaceLanguage": "en"' "$language_file" ||
    fail "English preference did not survive packaged relaunch"

  current_step="recovering an invalid local preference to usable Chinese defaults"
  if ! stop_app; then
    fail "app process did not exit before invalid-language recovery"
  fi
  printf '{\n  "schemaVersion": 1,\n  "interfaceLanguage": "fr"\n}\n' > "$language_file"
  launch_app_waiting_for_text "早间基准" 30
  run_driver assert-active-text "设置"
  run_driver press "当日进展" 10
  run_driver assert-active-text "第二份中文个人内容 · Keep source English unchanged"
  run_driver assert-active-absent-text "Daytime progress"
  [[ "$(shasum -a 256 "$record_a" | awk '{print $1}')" == "$after_save_hash" ]] ||
    fail "language preference recovery changed Vault A Markdown"
  [[ "$(shasum -a 256 "$record_b" | awk '{print $1}')" == "$before_b_hash" ]] ||
    fail "language preference recovery changed Vault B Markdown"

  echo "Packaged IPC interface-language acceptance passed"
  echo "Language: Chinese and English fixed copy covered navigation, Today, Calendar, Habits, Settings, statuses, and long Drive guidance"
  echo "State: the selected phase, date, and unsaved draft survived switching; the draft and existing source content remained verbatim"
  echo "Persistence: English survived Vault switching and relaunch; an invalid local preference recovered to Chinese without changing either Vault"
}

run_background_image_scenario() {
  local vault_directory="$acceptance_directory/background-vault"
  local record_file="$vault_directory/life/Journal/Daily/2026/2026-09/2026-09-08.md"
  local appearance_file="$acceptance_data_directory/appearance.json"
  local language_file="$acceptance_data_directory/interface-language.json"
  local vault_preference_file="$acceptance_data_directory/today-workspace.json"
  local background_directory="$acceptance_data_directory/background-images"
  local light_source="$acceptance_directory/light-background.png"
  local moved_light_source="$acceptance_directory/light-background-moved.png"
  local complex_source="$acceptance_directory/complex-background.png"
  local invalid_source="$acceptance_directory/invalid-background.png"
  local before_record_hash
  local before_language_hash
  local before_vault_preference_hash
  local before_selection_hash
  local owned_image
  local no_image_wide_signature
  local today_wide_signature
  local calendar_wide_signature
  local habits_wide_signature
  local today_intermediate_signature
  local calendar_intermediate_signature
  local habits_intermediate_signature
  local restored_intermediate_signature

  current_step="preparing isolated background-image fixtures"
  fixed_now_epoch_millis="1788891000000"
  mkdir -p "$vault_directory/.obsidian" "$(dirname "$record_file")" "$acceptance_data_directory"
  cat > "$record_file" <<'EOF'
---
type: daily-record
date: 2026-09-08
---
# 2026-09-08

## 今天的大致安排

- **上午：** 背景图片验收的合成安排。
EOF
  printf '{\n  "schemaVersion": 1,\n  "selectedVault": "%s"\n}\n' \
    "$vault_directory" > "$vault_preference_file"
  printf '{\n  "schemaVersion": 1,\n  "interfaceLanguage": "zh"\n}\n' > "$language_file"
  "$driver_binary" 0 make-image-fixture "light|$light_source" 10 >/dev/null ||
    fail "could not generate the light background fixture"
  "$driver_binary" 0 make-image-fixture "complex|$complex_source" 10 >/dev/null ||
    fail "could not generate the complex background fixture"
  printf '\211PNG\r\n\032\nsynthetic corrupt bodyIEND\256B\140\202' > "$invalid_source"
  before_record_hash="$(shasum -a 256 "$record_file" | awk '{print $1}')"
  before_language_hash="$(shasum -a 256 "$language_file" | awk '{print $1}')"
  before_vault_preference_hash="$(shasum -a 256 "$vault_preference_file" | awk '{print $1}')"

  current_step="importing a light image through the real Mac picker"
  launch_app_waiting_for_text "早间基准" 30
  run_driver set-size "1120x760" 10
  run_driver assert-size "1120x760" 10
  no_image_wide_signature="$(capture_background_signature)"
  run_driver press "设置" 10
  run_driver wait-active-text "默认：无背景图片" 10
  run_driver press "雾蓝" 10
  run_driver wait-active-text "颜色已保存在这台 Mac" 10
  open_native_picker_with_retry "选择图片…" "选择本地背景图片"
  run_driver choose-file "$light_source" 35
  run_driver wait-active-text "背景图片副本已保存在这台 Mac" 20
  run_driver assert-active-text "背景图片已保存在这台 Mac"
  run_driver assert-rendered-variation "背景图片预览|20" 10
  run_driver assert-same-rendered-color "全局主题色样本|雾蓝" 10
  grep -Fq '"accentColor": "blue"' "$appearance_file" ||
    fail "background import did not preserve the selected accent color"
  grep -Fq '"backgroundImage"' "$appearance_file" ||
    fail "background import did not persist an app-owned reference"
  [[ "$(find "$background_directory" -type f | wc -l | tr -d ' ')" == "1" ]] ||
    fail "background import did not create exactly one app-owned image"

  current_step="checking the shared wide-page backdrop and cancelling safely"
  run_driver press "今天" 10
  run_driver press "当日进展" 10
  run_driver wait-active-text "背景图片验收的合成安排" 20
  run_driver assert-same-rendered-color "刷新|全局主题色样本" 10
  today_wide_signature="$(capture_background_signature)"
  run_driver press "日历" 10
  run_driver wait-active-text "2026年9月" 20
  run_driver assert-same-rendered-color "今天|全局主题色样本" 10
  run_driver assert-calendar-cells-transparent "2026年9月|4" 10
  calendar_wide_signature="$(capture_background_signature)"
  run_driver press "习惯" 10
  run_driver wait-active-text "尚无 Habits 快照" 20
  run_driver assert-same-rendered-color "刷新快照|全局主题色样本" 10
  habits_wide_signature="$(capture_background_signature)"
  [[ "$today_wide_signature" != "$no_image_wide_signature" ]] ||
    fail "the selected image did not change the rendered page backdrop"
  [[ "$calendar_wide_signature" != "$no_image_wide_signature" &&
    "$habits_wide_signature" != "$no_image_wide_signature" ]] ||
    fail "the selected image did not reach every destination's main content surface"
  [[ "$today_wide_signature" == "$calendar_wide_signature" ]] ||
    fail "Today and Calendar did not share the same translucent main-content layer: Today=$today_wide_signature Calendar=$calendar_wide_signature"
  run_driver press "设置" 10
  before_selection_hash="$(shasum -a 256 "$appearance_file" | awk '{print $1}')"
  run_driver press "选择图片…" 10
  run_driver cancel-folder "picker" 10
  run_driver wait-active-text "已取消选择；当前背景未更改" 10
  [[ "$(shasum -a 256 "$appearance_file" | awk '{print $1}')" == "$before_selection_hash" ]] ||
    fail "cancelling the background picker changed the confirmed preference"

  current_step="rejecting an invalid import while keeping the current image"
  run_driver press "选择图片…" 10
  run_driver choose-file "$invalid_source" 35
  run_driver wait-active-text "无法解码所选背景图片" 20
  run_driver assert-active-text "背景图片已保存在这台 Mac"
  [[ "$(shasum -a 256 "$appearance_file" | awk '{print $1}')" == "$before_selection_hash" ]] ||
    fail "a rejected background import changed the confirmed preference"
  [[ -f "$invalid_source" ]] || fail "a rejected import removed the user's source file"

  current_step="removing only the app-owned light image"
  run_driver press "移除图片" 10
  run_driver wait-active-text "背景图片已移除；原始图片未更改" 20
  run_driver assert-active-text "默认：无背景图片"
  [[ -f "$light_source" ]] || fail "removing a background deleted the user's original image"
  [[ -z "$(find "$background_directory" -type f -print 2>/dev/null)" ]] ||
    fail "removing a background left the referenced app-owned copy behind"

  current_step="reimporting, moving the source, and proving relaunch persistence"
  run_driver press "选择图片…" 10
  run_driver choose-file "$light_source" 35
  run_driver wait-active-text "背景图片副本已保存在这台 Mac" 20
  /bin/mv "$light_source" "$moved_light_source"
  if ! stop_app; then
    fail "app process did not exit before owned-copy relaunch"
  fi
  launch_app_waiting_for_text "早间基准" 30
  run_driver press "设置" 10
  run_driver wait-active-text "背景图片已保存在这台 Mac" 20
  run_driver assert-rendered-variation "背景图片预览|20" 10
  [[ -f "$moved_light_source" ]] || fail "the moved user source image is missing"

  current_step="showing damaged-copy recovery and importing a complex replacement"
  if ! stop_app; then
    fail "app process did not exit before damaged-copy recovery"
  fi
  owned_image="$(find "$background_directory" -type f -print -quit)"
  [[ -n "$owned_image" ]] || fail "could not locate the app-owned background copy"
  printf 'damaged app-owned bytes' > "$owned_image"
  launch_app_waiting_for_text "早间基准" 30
  run_driver press "设置" 10
  run_driver wait-active-text "背景图片已损坏或不可用" 20
  run_driver press "赤陶" 10
  run_driver wait-active-text "颜色已保存在这台 Mac" 10
  run_driver press "选择图片…" 10
  run_driver choose-file "$complex_source" 35
  run_driver wait-active-text "背景图片副本已保存在这台 Mac" 20
  run_driver assert-rendered-variation "背景图片预览|100" 10
  run_driver assert-same-rendered-color "全局主题色样本|赤陶" 10

  current_step="checking complex-image readability at the intermediate width"
  run_driver set-size "800x640" 10
  run_driver assert-size "800x640" 10
  run_driver press "今天" 10
  run_driver press "当日进展" 10
  run_driver wait-active-text "背景图片验收的合成安排" 20
  run_driver assert-document-fixed "document" 10
  today_intermediate_signature="$(capture_background_signature)"
  run_driver press "日历" 10
  run_driver wait-active-text "2026年9月" 20
  run_driver assert-document-fixed "document" 10
  run_driver assert-calendar-cells-transparent "2026年9月|4" 10
  calendar_intermediate_signature="$(capture_background_signature)"
  run_driver press "习惯" 10
  run_driver wait-active-text "尚无 Habits 快照" 20
  run_driver assert-document-fixed "document" 10
  habits_intermediate_signature="$(capture_background_signature)"
  [[ "$today_intermediate_signature" == "$calendar_intermediate_signature" ]] ||
    fail "Today and Calendar did not share the same intermediate-width content layer: Today=$today_intermediate_signature Calendar=$calendar_intermediate_signature"

  current_step="restoring no-image defaults without touching language or Vault data"
  run_driver press "设置" 10
  run_driver press "恢复默认外观" 10
  run_driver wait-active-text "已恢复默认外观；Vault 数据未更改" 20
  run_driver assert-active-text "默认：无背景图片"
  run_driver press "今天" 10
  run_driver assert-same-rendered-color "刷新|全局主题色样本" 10
  restored_intermediate_signature="$(capture_background_signature)"
  [[ "$restored_intermediate_signature" != "$today_intermediate_signature" ]] ||
    fail "restoring no-image defaults did not change the rendered backdrop"
  [[ "$restored_intermediate_signature" != "$calendar_intermediate_signature" &&
    "$restored_intermediate_signature" != "$habits_intermediate_signature" ]] ||
    fail "restoring no-image defaults did not clear every destination's content backdrop"
  grep -Fq '"accentColor": "forest"' "$appearance_file" ||
    fail "restoring appearance did not restore the forest accent"
  grep -Fq '"backgroundImage": null' "$appearance_file" ||
    fail "restoring appearance did not clear the background reference"
  [[ -z "$(find "$background_directory" -type f -print 2>/dev/null)" ]] ||
    fail "restoring appearance left an app-owned background copy behind"
  [[ -f "$moved_light_source" && -f "$complex_source" ]] ||
    fail "background actions removed a user's source image"
  [[ "$(shasum -a 256 "$record_file" | awk '{print $1}')" == "$before_record_hash" ]] ||
    fail "background actions changed Vault-owned Markdown"
  [[ "$(shasum -a 256 "$language_file" | awk '{print $1}')" == "$before_language_hash" ]] ||
    fail "restoring appearance changed the interface-language preference"
  [[ "$(shasum -a 256 "$vault_preference_file" | awk '{print $1}')" == "$before_vault_preference_hash" ]] ||
    fail "background actions changed the selected-Vault preference"

  echo "Packaged IPC background-image acceptance passed"
  echo "Ownership: native imports used app-owned copies; moving, rejecting, removing, damaging, and restoring never changed user or Vault files"
  echo "Persistence: the light image survived source movement and packaged relaunch; damaged state remained recoverable with a complex replacement"
  echo "Presentation: light, complex, and no-image states covered blue, clay, and forest accents across Today, Calendar, and Habits at 1120x760 and 800x640"
}

run_day_tasks_scenario() {
  local vault_a="$acceptance_directory/day-tasks-vault-a"
  local vault_b="$acceptance_directory/day-tasks-vault-b"
  local record_relative="life/Journal/Daily/2026/2026-09/2026-09-08.md"
  local record_a="$vault_a/$record_relative"
  local record_b="$vault_b/$record_relative"
  local task_relative="life/.personal-dashboard/day-tasks/v1/2026/2026-09-08.json"
  local tasks_a="$vault_a/$task_relative"
  local tasks_b="$vault_b/$task_relative"
  local previous_tasks_a="$vault_a/life/.personal-dashboard/day-tasks/v1/2026/2026-09-07.json"
  local before_a_hash
  local before_b_hash
  local task_a="整理厨房 · Task A"
  local renamed_a="整理厨房与餐桌 · Task A"
  local conflict_draft="冲突后保留草稿 · Retry me"
  local add_draft_a="仅属于第一库的未保存新增草稿"
  local task_b="第二库任务 · Task B"
  local disposable="待删除任务 · Delete me"

  current_step="preparing isolated day-task fixtures"
  fixed_now_epoch_millis="1788891000000"
  mkdir -p \
    "$vault_a/.obsidian" "$vault_b/.obsidian" \
    "$vault_a/$(dirname "$record_relative")" "$vault_b/$(dirname "$record_relative")" \
    "$acceptance_data_directory"
  cat > "$record_a" <<'EOF'
---
type: daily-record
date: 2026-09-08
---
# 2026-09-08

## User section

Vault A Markdown must remain byte-identical.
EOF
  cat > "$record_b" <<'EOF'
---
type: daily-record
date: 2026-09-08
---
# 2026-09-08

## User section

Vault B Markdown must remain byte-identical.
EOF
  printf '{\n  "schemaVersion": 1,\n  "selectedVault": "%s"\n}\n' \
    "$vault_a" > "$acceptance_data_directory/today-workspace.json"
  before_a_hash="$(shasum -a 256 "$record_a" | awk '{print $1}')"
  before_b_hash="$(shasum -a 256 "$record_b" | awk '{print $1}')"

  current_step="adding, renaming, completing, reopening, and deleting through the packaged UI"
  launch_app_waiting_for_text "当天任务" 30
  run_driver set-size "1120x760" 10
  run_driver assert-active-text "昨天的任务不会自动带入"
  run_driver type-text "添加当天任务|$task_a" 10
  run_driver press "添加" 10
  run_driver wait-active-text "$task_a" 20
  run_driver type-text "重命名任务|$renamed_a" 10
  run_driver press "保存任务" 10
  run_driver wait-active-text "$renamed_a" 20
  run_driver press "切换“${renamed_a}”的完成状态" 10
  run_driver assert-state "切换“${renamed_a}”的完成状态|selected" 10
  wait_for_file_text "$tasks_a" '"completedAt": "2026-09-08T' ||
    fail "packaged completion was not persisted"
  run_driver press "切换“${renamed_a}”的完成状态" 10
  wait_for_file_text "$tasks_a" '"completedAt": null' ||
    fail "packaged reopening was not persisted"
  run_driver type-text "添加当天任务|$disposable" 10
  run_driver press "添加" 10
  run_driver wait-active-text "$disposable" 20
  run_driver press "删除任务“${disposable}”" 10
  run_driver assert-active-absent-text "$disposable"
  wait_for_file_text "$tasks_a" '"deletedAt": "2026-09-08T' ||
    fail "packaged delete did not retain a tombstone"

  current_step="keeping the task rail visible across phases and recovering a stale revision"
  run_driver press "当日进展" 10
  run_driver assert-active-text "$renamed_a"
  run_driver press "晚间复盘" 10
  run_driver assert-active-text "$renamed_a"
  run_driver press "早间基准" 10
  run_driver type-text "重命名任务|$conflict_draft" 10
  printf ' ' >> "$tasks_a"
  run_driver press "保存任务" 10
  run_driver wait-active-text "任务未保存" 20
  run_driver assert-active-text "$conflict_draft"
  run_driver press "刷新" 10
  run_driver wait-active-text "$conflict_draft" 20
  run_driver press "保存任务" 10
  run_driver wait-active-text "当天任务已保存" 20
  wait_for_file_text "$tasks_a" "$conflict_draft" ||
    fail "retry after the packaged conflict did not save the preserved rename draft"
  run_driver type-text "添加当天任务|$add_draft_a" 10
  run_driver assert-active-text "$add_draft_a"

  current_step="binding an unsaved add draft to its original date"
  run_driver press "日历" 10
  run_driver wait-active-text "2026年9月" 20
  run_driver press-contains "9月7日" 10
  run_driver press "打开完整 Today" 10
  run_driver wait-active-text "所选日期 · 2026-09-07" 20
  run_driver assert-active-absent-text "$add_draft_a"
  [[ ! -e "$previous_tasks_a" ]] ||
    fail "date navigation created or wrote a task document for the wrong date"
  run_driver press "日历" 10
  run_driver press-contains "9月8日" 10
  run_driver press "打开完整 Today" 10
  run_driver wait-active-text "今天 · 2026-09-08" 20
  run_driver assert-active-text "$add_draft_a"

  current_step="switching isolated Vaults and proving independent relaunch persistence"
  open_vault_picker_from_settings
  run_driver choose-folder "$vault_b" 35
  run_driver press "今天" 10
  run_driver wait-active-text "day-tasks-vault-b" 20
  run_driver assert-active-text "昨天的任务不会自动带入"
  run_driver assert-active-absent-text "$conflict_draft"
  run_driver assert-active-absent-text "$add_draft_a"
  run_driver type-text "添加当天任务|$task_b" 10
  run_driver press "添加" 10
  run_driver wait-active-text "$task_b" 20
  if ! stop_app; then
    fail "app process did not exit before day-task relaunch"
  fi
  launch_app_waiting_for_text "$task_b" 30
  grep -Fq "$task_b" "$tasks_b" || fail "Vault B task did not survive relaunch"
  run_driver set-size "800x640" 10
  run_driver assert-active-text "当天任务"
  open_vault_picker_from_settings
  run_driver choose-folder "$vault_a" 35
  run_driver press "今天" 10
  run_driver wait-active-text "$conflict_draft" 20
  run_driver assert-active-absent-text "$task_b"

  current_step="checking English fixed copy without translating personal task text"
  run_driver press "切换为英文" 10
  run_driver wait-active-text "Day tasks" 10
  run_driver assert-active-text "Unchecked means unconfirmed"
  run_driver assert-active-text "$conflict_draft"

  [[ "$(shasum -a 256 "$record_a" | awk '{print $1}')" == "$before_a_hash" ]] ||
    fail "day-task operations changed unrelated Vault A Markdown"
  [[ "$(shasum -a 256 "$record_b" | awk '{print $1}')" == "$before_b_hash" ]] ||
    fail "day-task operations changed unrelated Vault B Markdown"

  echo "Packaged IPC day-task acceptance passed"
  echo "Lifecycle: add, rename, complete, reopen, delete, refresh, conflict retry, and relaunch used the real Today task rail"
  echo "Isolation: two synthetic Vaults retained independent versioned task documents and byte-identical Markdown"
  echo "Presentation: the B-layout rail remained visible across all Today phases at 1120x760 and 800x640 with bilingual fixed copy"
}

run_planning_tasks_scenario() {
  local vault="$acceptance_directory/planning-task-vault"
  local record="$vault/life/Journal/Daily/2026/2026-09/2026-09-08.md"
  local plan="$vault/life/.personal-dashboard/day-task-plans/v1/2026/2026-09-08.json"
  local plan_candidate="$plan.candidate"
  local tasks="$vault/life/.personal-dashboard/day-tasks/v1/2026/2026-09-08.json"
  local before_record_hash
  local original_a="整理厨房 · Flow A"
  local renamed_a="整理厨房与餐桌 · User rename"
  local renamed_after_error="整理厨房与餐桌 · Rename while input invalid"
  local completed_b="洗衣服 · Flow B"
  local reordered_c="启动扫地机器人 · Flow C"
  local suggestion="如果有空可以散步 · Suggestion only"
  local rearranged_c="再次明确安排扫地 · Flow C2"

  current_step="preparing the isolated planning-task contract fixture"
  fixed_now_epoch_millis="1788891000000"
  mkdir -p "$vault/.obsidian" "$(dirname "$record")" "$(dirname "$plan")" \
    "$acceptance_data_directory"
  cat > "$record" <<'EOF'
---
type: daily-record
date: 2026-09-08
---
# 2026-09-08

## 晚间复盘

This existing review must remain byte-identical.
EOF
  printf '{\n  "schemaVersion": 1,\n  "selectedVault": "%s"\n}\n' \
    "$vault" > "$acceptance_data_directory/today-workspace.json"
  before_record_hash="$(shasum -a 256 "$record" | awk '{print $1}')"

  current_step="receiving structured actions while excluding a suggestion"
  launch_app_waiting_for_text "当天任务" 30
  run_driver assert-active-absent-text "$original_a"
  cat > "$plan_candidate" <<EOF
{
  "schemaVersion": 1,
  "date": "2026-09-08",
  "candidates": [
    {"kind":"action","taskId":"flow-a","sourceReference":"plan-a","text":"$original_a"},
    {"kind":"action","taskId":"flow-b","sourceReference":"plan-b","text":"$completed_b"},
    {"kind":"suggestion","sourceReference":"plan-suggestion","text":"$suggestion"}
  ]
}
EOF
  /bin/mv "$plan_candidate" "$plan"
  run_driver press "刷新" 10
  run_driver wait-active-text "$original_a" 20
  run_driver assert-active-text "$completed_b"
  run_driver assert-active-absent-text "$suggestion"
  run_driver assert-active-text "每日流程导入"
  wait_for_file_text "$tasks" '"reference": "plan-a"' ||
    fail "the packaged reread did not merge the structured action"
  [[ "$(grep -Fc '"reference": "plan-a"' "$tasks")" == "1" ]] ||
    fail "the first structured action was duplicated"

  current_step="preserving user rename and completion through a replan"
  run_driver type-text "重命名任务|$renamed_a" 10
  run_driver press "保存任务" 10
  run_driver wait-active-text "$renamed_a" 20
  run_driver press "切换“${completed_b}”的完成状态" 10
  run_driver assert-state "切换“${completed_b}”的完成状态|selected" 10
  cat > "$plan_candidate" <<EOF
{
  "schemaVersion": 1,
  "date": "2026-09-08",
  "candidates": [
    {"kind":"action","taskId":"flow-c","sourceReference":"plan-c","text":"$reordered_c"},
    {"kind":"action","taskId":"flow-a","sourceReference":"plan-a","text":"上游新文字不能覆盖用户改名"},
    {"kind":"action","taskId":"flow-b","sourceReference":"plan-b","text":"$completed_b"}
  ]
}
EOF
  /bin/mv "$plan_candidate" "$plan"
  run_driver press "刷新" 10
  run_driver wait-active-text "$reordered_c" 20
  run_driver assert-active-text "$renamed_a"
  run_driver assert-state "切换“${completed_b}”的完成状态|selected" 10

  current_step="retaining deletion intent and requiring a distinct rearrangement identity"
  run_driver press "删除任务“${reordered_c}”" 10
  run_driver assert-active-absent-text "$reordered_c"
  run_driver press "刷新" 10
  run_driver assert-active-absent-text "$reordered_c"
  cat > "$plan_candidate" <<EOF
{
  "schemaVersion": 1,
  "date": "2026-09-08",
  "candidates": [
    {"kind":"action","taskId":"flow-c-2","sourceReference":"plan-c","text":"不能借旧来源复活"}
  ]
}
EOF
  /bin/mv "$plan_candidate" "$plan"
  run_driver press "刷新" 10
  run_driver wait-active-text "规划任务来源身份已绑定到另一任务" 20
  run_driver assert-active-text "$renamed_a"
  run_driver assert-active-absent-text "不能借旧来源复活"
  run_driver type-text "重命名任务|$renamed_after_error" 10
  run_driver press "保存任务" 10
  run_driver wait-active-text "$renamed_after_error" 20
  run_driver assert-active-text "规划任务来源身份已绑定到另一任务"
  cat > "$plan_candidate" <<EOF
{
  "schemaVersion": 1,
  "date": "2026-09-08",
  "candidates": [
    {"kind":"action","taskId":"flow-c-2","sourceReference":"plan-c-2","text":"$rearranged_c"},
    {"kind":"action","taskId":"flow-a","sourceReference":"plan-a","text":"仍不覆盖用户改名"}
  ]
}
EOF
  /bin/mv "$plan_candidate" "$plan"
  run_driver press "刷新" 10
  run_driver wait-active-text "$rearranged_c" 20
  run_driver assert-active-text "$renamed_after_error"
  run_driver assert-state "切换“${completed_b}”的完成状态|selected" 10
  [[ "$(grep -Fc '"reference": "plan-a"' "$tasks")" == "1" ]] ||
    fail "repeated planning input duplicated an existing task"
  grep -Fq '"deletedAt": "2026-09-08T' "$tasks" ||
    fail "the packaged replan lost the deleted task tombstone"

  current_step="proving relaunch persistence and bilingual source copy"
  if ! stop_app; then
    fail "app process did not exit before planning-task relaunch"
  fi
  launch_app_waiting_for_text "$rearranged_c" 30
  run_driver assert-active-text "$renamed_after_error"
  run_driver assert-state "切换“${completed_b}”的完成状态|selected" 10
  run_driver press "切换为英文" 10
  run_driver wait-active-text "Imported by the daily flow" 10
  run_driver assert-active-text "$renamed_after_error"
  [[ "$(shasum -a 256 "$record" | awk '{print $1}')" == "$before_record_hash" ]] ||
    fail "planning-task receipt or task clicks changed the existing evening review"

  echo "Packaged IPC planning-task acceptance passed"
  echo "Contract: structured actions entered Today, suggestions stayed out, and repeated reads remained idempotent"
  echo "Preservation: reorder retained completion and user text; tombstones blocked the old identity until a distinct rearrangement arrived"
  echo "Boundary: only synthetic Vault input was used; no Agent, skill, Dida365, MCP, automation, or Daily Record review was changed"
}

run_dashboard_3_scenario() {
  local vault_directory="$acceptance_directory/dashboard-3-vault"
  local record_directory="$vault_directory/life/Journal/Daily/2026/2026-09"
  local record_file="$record_directory/2026-09-08.md"
  local reviewed_file="$record_directory/2026-09-07.md"
  local snapshot_directory="$vault_directory/.personal-dashboard/derived"
  local snapshot_file="$snapshot_directory/habits-v1.json"
  local plan_file="$vault_directory/life/.personal-dashboard/day-task-plans/v1/2026/2026-09-08.json"
  local background_source="$acceptance_directory/dashboard-3-background.png"
  local moved_background_source="$acceptance_directory/dashboard-3-background-moved.png"
  local capture_root="$repository_root/output/playwright"
  local capture_directory="${PERSONAL_DASHBOARD_ACCEPTANCE_CAPTURE_DIRECTORY:-$acceptance_directory/dashboard-3-captures}"
  local capture_parent
  local before_record_hash
  local before_reviewed_hash
  local before_snapshot_hash
  local long_drive_copy='Ordinary local Vaults also work. Dashboard does not convert arbitrary notes, manage Google accounts, or upload files. “Saved locally” does not mean “synced to the cloud.” Google Drive manages versions and trash.'

  current_step="preparing the integrated 3.0 candidate fixtures and capture boundary"
  fixed_now_epoch_millis="1788891000000"
  mkdir -p "$vault_directory/.obsidian" "$record_directory" "$snapshot_directory" \
    "$(dirname "$plan_file")" "$acceptance_data_directory"
  printf '{\n  "schemaVersion": 1,\n  "selectedVault": "%s"\n}\n' \
    "$vault_directory" > "$acceptance_data_directory/today-workspace.json"
  printf '{\n  "schemaVersion": 1,\n  "interfaceLanguage": "zh"\n}\n' \
    > "$acceptance_data_directory/interface-language.json"
  /bin/cp "$repository_root/src-tauri/tests/fixtures/habits-v1-complete.json" "$snapshot_file"
  cat > "$record_file" <<'EOF'
---
type: daily-record
date: 2026-09-08
source: dashboard-3-packaged-candidate
---
# 2026-09-08

## 早间基准

### 初始安排

- **早上（07:30–10:00）：** 早餐后学习一小时，再为工作 check-in 做准备。
- **上午（10:00–12:00）：** 工作 check-in 后完成 insurance reimbursement。
- **中午（12:00–13:30）：** 午饭、留白和 buffer，不把空档填满。
- **下午（13:30–17:00）：** 推进 apartment-renewal，预留连续工作块。
- **晚上（17:30 以后）：** 取饭、Exercise 和自由恢复。

### 初始计划依据

#### 固定安排

- 10:00 工作 check-in
- 17:30 取晚饭

#### Tasks（任务）

- Insurance reimbursement · 今天到期
- Apartment-renewal · 周五到期

#### Habits（习惯）

- Exercise · normal 30 分钟 / low-energy baseline 走 10 分钟
- Reset living space · 10 分钟

## 今天的大致安排

- **现在：** 处理需要 17:00 前完成的紧急工作。
- **17:30：** 取晚饭仍然保留。
- **Exercise：** 退到 low-energy baseline，走 10 分钟即可。
- **晚饭后：** 不再安排必须事项，保护恢复空间。
- **未知：** 上午学习实际完成量没有记录。

## 白天更新

### 07:18 — 有意义的记录

- 观察事实：07:18 起床。

### 13:40 — 有意义的事件

- 观察事实：出现紧急工作，打断原安排。

### 14:10 — 重大调整

- 原计划意图：下午原本推进 apartment-renewal。
- 变化原因：能量很低，加上临时出现紧急工作。
- 修订方向：紧急工作优先；Exercise 退到 low-energy baseline；晚饭后保护休息。

## 晚间复盘

### 今天发生了什么

- 07:18 起床，上午完成工作 check-in 和报销。
- 13:40 临时工作打断原安排，14:10 调整下午计划。
- 17:30 取饭，19:00 跑步 30 分钟，之后休息。
- 原定项目没有继续，早间学习完成量没有记录。

### 计划与实际

下午因紧急工作偏离早间基准，完成急事后保护了恢复时间。

### 简单总结（可选）

完成了必要事项，也保留了恢复空间。
EOF
  cat > "$reviewed_file" <<'EOF'
---
type: daily-record
date: 2026-09-07
source: dashboard-3-packaged-candidate
---
# 2026-09-07

## 今天的大致安排

- **下午：** 完成历史更正验收前的合成安排。

## 白天更新

### 18:10 — 有意义的记录

- 观察事实：完成一次 Exercise，并保留当日来源说明。

## 晚间复盘

### 今天发生了什么

- 完成安排，并在晚间核对历史记录。

### 简单总结（可选）

历史日有可读复盘。
EOF
  cat > "$plan_file" <<'EOF'
{
  "schemaVersion": 1,
  "date": "2026-09-08",
  "candidates": [
    {
      "kind": "action",
      "taskId": "candidate-review",
      "sourceReference": "dashboard-3-candidate-action",
      "text": "Review candidate evidence"
    },
    {
      "kind": "suggestion",
      "sourceReference": "dashboard-3-candidate-suggestion",
      "text": "Optional suggestion must not become a task"
    }
  ]
}
EOF
  "$driver_binary" 0 make-image-fixture "complex|$background_source" 10 >/dev/null ||
    fail "could not generate the candidate background fixture"

  if [[ -n "${PERSONAL_DASHBOARD_ACCEPTANCE_CAPTURE_DIRECTORY:-}" ]]; then
    [[ "$capture_directory" == /* ]] ||
      fail "candidate capture directory must be absolute"
    [[ ! -e "$capture_directory" ]] ||
      fail "candidate capture directory already exists: $capture_directory"
    mkdir -p "$capture_root"
    capture_root="$(cd "$capture_root" && pwd -P)"
    capture_parent="$(dirname "$capture_directory")"
    [[ -d "$capture_parent" ]] ||
      fail "candidate capture parent directory does not exist: $capture_parent"
    capture_parent="$(cd "$capture_parent" && pwd -P)"
    case "$capture_parent" in
      "$capture_root" | "$capture_root"/*) ;;
      *) fail "candidate captures must stay under $capture_root" ;;
    esac
    mkdir "$capture_directory"
    capture_directory="$(cd "$capture_directory" && pwd -P)"
    case "$capture_directory" in
      "$capture_root"/*) ;;
      *) fail "candidate captures must stay under $capture_root" ;;
    esac
  else
    mkdir -p "$capture_directory"
  fi
  "$driver_binary" 0 assert-capture-non-overwrite \
    "$acceptance_directory/capture-race-sentinel" 10 >/dev/null ||
    fail "window capture could overwrite a destination created by another writer"

  before_record_hash="$(shasum -a 256 "$record_file" | awk '{print $1}')"
  before_reviewed_hash="$(shasum -a 256 "$reviewed_file" | awk '{print $1}')"
  before_snapshot_hash="$(shasum -a 256 "$snapshot_file" | awk '{print $1}')"

  current_step="selecting the candidate color and background through the real picker"
  launch_app_waiting_for_text "Review candidate evidence" 30
  run_driver set-size "1120x760" 10
  run_driver assert-size "1120x760" 10
  run_driver assert-active-absent-text "Optional suggestion must not become a task"
  run_driver press "设置" 10
  run_driver wait-active-text "外观" 10
  run_driver press "雾蓝" 10
  run_driver wait-active-text "颜色已保存在这台 Mac" 10
  open_native_picker_with_retry "选择图片…" "选择本地背景图片"
  run_driver choose-file "$background_source" 35
  run_driver wait-active-text "背景图片副本已保存在这台 Mac" 20
  run_driver assert-rendered-variation "背景图片预览|20" 10
  /bin/mv "$background_source" "$moved_background_source"

  current_step="capturing the Chinese wide B layout and shared background layers"
  run_driver press "今天" 10
  run_driver press "早间基准" 10
  run_driver wait-active-text "早餐后学习一小时" 20
  run_driver assert-active-text "Review candidate evidence"
  run_driver capture-window "$capture_directory/product-zh-today-morning-wide.png" 10
  run_driver press "当日进展" 10
  run_driver wait-active-text "紧急工作优先" 10
  run_driver assert-active-text "Review candidate evidence"
  run_driver capture-window "$capture_directory/product-zh-today-daytime-wide.png" 10
  run_driver press "晚间复盘" 10
  run_driver wait-active-text "19:00 跑步 30 分钟" 10
  run_driver assert-active-text "Review candidate evidence"
  run_driver capture-window "$capture_directory/product-zh-today-evening-wide.png" 10
  run_driver press "日历" 10
  run_driver wait-active-text "2026年9月" 20
  run_driver press-contains "9月7日" 10
  run_driver wait-active-text "完成安排，并在晚间核对历史记录" 10
  run_driver assert-calendar-cells-transparent "2026年9月|4" 10
  run_driver capture-window "$capture_directory/product-zh-calendar-wide.png" 10
  run_driver press "习惯" 10
  run_driver wait-active-text "4 / 15" 20
  run_driver press-contains "2026-09-07 · Exercise" 10
  run_driver wait-active-text "近 12 周记录" 10
  run_driver capture-window "$capture_directory/product-zh-habits-expanded-wide.png" 10
  run_driver press "设置" 10
  run_driver wait-active-text "外观" 10
  run_driver assert-state "雾蓝|pressed" 10
  run_driver capture-window "$capture_directory/product-zh-settings-appearance-wide.png" 10

  current_step="relaunching after the source image moved and retaining local appearance"
  if ! stop_app; then
    fail "app process did not exit before 3.0 candidate relaunch"
  fi
  launch_app_waiting_for_text "Review candidate evidence" 30
  run_driver press "设置" 10
  run_driver wait-active-text "背景图片已保存在这台 Mac" 20
  run_driver assert-state "雾蓝|pressed" 10
  run_driver assert-rendered-variation "背景图片预览|20" 10
  [[ -f "$moved_background_source" ]] ||
    fail "moving the user source removed it instead of leaving the app-owned copy independent"

  current_step="capturing the bilingual medium candidate surfaces"
  run_driver press "切换为英文" 10
  run_driver wait-active-text "Appearance" 10
  run_driver set-size "800x640" 10
  run_driver assert-size "800x640" 10
  run_driver press "Today" 10
  run_driver press "Morning baseline" 10
  run_driver wait-active-text "早餐后学习一小时" 10
  run_driver assert-active-text "Day tasks"
  run_driver assert-active-text "Unchecked means unconfirmed"
  run_driver capture-window "$capture_directory/product-en-today-morning-medium.png" 10
  run_driver press "Calendar" 10
  run_driver wait-active-text "September 2026" 20
  run_driver capture-window "$capture_directory/product-en-calendar-medium.png" 10
  run_driver press "Habits" 10
  run_driver wait-active-text "4 / 15" 20
  run_driver press-contains "2026-09-07 · Exercise" 10
  run_driver wait-active-text "Past 12 weeks" 10
  run_driver capture-window "$capture_directory/product-en-habits-expanded-medium.png" 10
  run_driver press "Settings" 10
  run_driver wait-active-text "Appearance" 10
  run_driver press "Data & Vault" 10
  run_driver scroll-text-visible "$long_drive_copy" 10
  run_driver assert-long-text-fits "$long_drive_copy" 10
  run_driver assert-document-fixed "document" 10
  run_driver capture-window "$capture_directory/product-en-settings-vault-medium.png" 10

  current_step="capturing the narrow candidate without flattening Habits"
  run_driver set-size "640x520" 10
  run_driver assert-size "640x520" 10
  run_driver press "Today" 10
  run_driver press "Daytime progress" 10
  run_driver wait-active-text "紧急工作优先" 10
  run_driver assert-active-text "Review candidate evidence"
  run_driver capture-window "$capture_directory/product-en-today-daytime-narrow.png" 10
  run_driver press "Calendar" 10
  run_driver wait-active-text "September 2026" 20
  run_driver capture-window "$capture_directory/product-en-calendar-narrow.png" 10
  run_driver press "Habits" 10
  run_driver wait-active-text "4 / 15" 20
  run_driver press-contains "2026-09-07 · Exercise" 10
  run_driver wait-active-text "Past 12 weeks" 10
  run_driver assert-document-fixed "document" 10
  run_driver capture-window "$capture_directory/product-en-habits-expanded-narrow.png" 10
  run_driver press "Settings" 10
  run_driver wait-active-text "Appearance" 10
  run_driver capture-window "$capture_directory/product-en-settings-appearance-narrow.png" 10

  [[ "$(find "$capture_directory" -type f -name '*.png' | wc -l | tr -d ' ')" == "14" ]] ||
    fail "candidate capture matrix did not produce exactly 14 non-overwritten screenshots"
  [[ "$(shasum -a 256 "$record_file" | awk '{print $1}')" == "$before_record_hash" ]] ||
    fail "3.0 visual acceptance changed the current Daily Record"
  [[ "$(shasum -a 256 "$reviewed_file" | awk '{print $1}')" == "$before_reviewed_hash" ]] ||
    fail "3.0 visual acceptance changed the reviewed Daily Record"
  [[ "$(shasum -a 256 "$snapshot_file" | awk '{print $1}')" == "$before_snapshot_hash" ]] ||
    fail "3.0 visual acceptance changed the external Habits snapshot"

  echo "Packaged IPC Personal Dashboard 3.0 integrated local candidate acceptance passed"
  echo "Capture directory: $capture_directory"
  echo "Visuals: Chinese wide Today phases, Calendar, expanded Habits, and Appearance plus English medium/narrow surfaces were captured from the real app"
  echo "Persistence: Mist blue and the app-owned background survived relaunch after the synthetic source image moved"
  echo "Boundary: focused gate scenarios cover task replan, habit OR, historical corrections, errors, and late responses; Drive cloud/version/trash evidence remains separate and incomplete"
}

run_dashboard_4_scenario() {
  local vault_a="$acceptance_directory/dashboard-4-vault-a"
  local vault_b="$acceptance_directory/dashboard-4-vault-b"
  local record_relative="life/Journal/Daily/2026/2026-09/2026-09-08.md"
  local record_a="$vault_a/$record_relative"
  local record_b="$vault_b/$record_relative"
  local task_relative="life/.personal-dashboard/tasks/v1/tasks.json"
  local tasks_a="$vault_a/$task_relative"
  local tasks_b="$vault_b/$task_relative"
  local names_a="$vault_a/life/.personal-dashboard/habit-names/v1/names.json"
  local names_b="$vault_b/life/.personal-dashboard/habit-names/v1/names.json"
  local snapshot_relative=".personal-dashboard/derived/habits-v1.json"
  local snapshot_a="$vault_a/$snapshot_relative"
  local snapshot_b="$vault_b/$snapshot_relative"
  local capture_root="$repository_root/output/playwright"
  local capture_directory="${PERSONAL_DASHBOARD_ACCEPTANCE_CAPTURE_DIRECTORY:-$acceptance_directory/dashboard-4-captures}"
  local capture_parent
  local before_record_hash
  local before_names_hash
  local before_snapshot_hash
  local external_candidate="$acceptance_directory/dashboard-4-external-tasks.json"
  local new_task_id
  local today_new_task_id
  local calendar_new_task_id
  local record_marker="Dashboard 4 synthetic morning baseline"
  local late_task="晚到完成 · Late completion"
  local overdue_task="仍待处理 · Overdue pending"
  local abandon_task="放弃后可恢复 · Abandon and restore"
  local delete_task="删除后可恢复 · Delete and restore"
  local future_task="未来任务 · Future task"
  local shared_task="共享身份 · Shared task · 窄窗口双语长名称验收"
  local archived_task="归档仍可回看 · Archived Calendar task"
  local new_task="Inbox 默认新建 · No date"
  local today_new_task="Today 默认新建 · Today date"
  local calendar_new_task="Calendar 默认新建 · Selected date"
  local vault_b_task="Vault B sentinel · switched source"
  local long_drive_copy_zh='普通本地 Vault 也可使用。Dashboard 不会自动转换任意笔记，不管理 Google 账号或上传；“本地已保存”不代表“云端已同步”。版本与回收站由 Google Drive 管理。'
  local long_drive_copy_en='Ordinary local Vaults also work. Dashboard does not convert arbitrary notes, manage Google accounts, or upload files. “Saved locally” does not mean “synced to the cloud.” Google Drive manages versions and trash.'

  current_step="preparing isolated 4.0 Tasks, Daily Record, Habits, and Vault-switch fixtures"
  fixed_now_epoch_millis="1788891000000"
  mkdir -p \
    "$vault_a/.obsidian" "$vault_b/.obsidian" \
    "$vault_a/$(dirname "$record_relative")" "$vault_b/$(dirname "$record_relative")" \
    "$(dirname "$tasks_a")" "$(dirname "$tasks_b")" \
    "$(dirname "$names_a")" "$(dirname "$names_b")" \
    "$(dirname "$snapshot_a")" "$(dirname "$snapshot_b")" \
    "$acceptance_data_directory"
  cat > "$record_a" <<EOF
---
type: daily-record
date: 2026-09-08
source: dashboard-4-packaged-candidate
---
# 2026-09-08

## 早间基准

### 初始安排

- $record_marker
- 共享 Tasks、Today 与 Calendar 的同一任务正本。

## 今天的大致安排

- 先核对任务状态，再保留晚间恢复空间。

## 白天更新

- 仅作合成验收背景；任务操作不应改写本记录。

## 晚间复盘

- 合成记录保持只读。
EOF
  cat > "$record_b" <<EOF
---
type: daily-record
date: 2026-09-08
source: dashboard-4-vault-b
---
# 2026-09-08

## 早间基准

### 初始安排

- Vault B isolated marker.
EOF
  cat > "$tasks_a" <<'EOF'
{
  "schemaVersion": 2,
  "lists": [
    {"id":"inbox","name":"Inbox","system":true,"archived":false},
    {"id":"focus-list","name":"Focus · 工作重点","system":false,"archived":false},
    {"id":"archive-list","name":"Archive · 历史回看","system":false,"archived":true}
  ],
  "tasks": [
    {
      "id":"late-task","name":"晚到完成 · Late completion","content":"Scheduled yesterday; completion must retain the scheduled date.","date":"2026-09-07","time":"09:00","listId":"inbox","source":{"kind":"manual","reference":null},"state":"pending","deletedAt":null,"completion":null,"createdAt":"2026-09-07T08:00:00-04:00","modifiedAt":"2026-09-07T08:00:00-04:00","changes":[]
    },
    {
      "id":"overdue-task","name":"仍待处理 · Overdue pending","content":"An overdue pending task belongs in Today until it is resolved.","date":"2026-09-07","time":"08:00","listId":"inbox","source":{"kind":"manual","reference":null},"state":"pending","deletedAt":null,"completion":null,"createdAt":"2026-09-07T07:00:00-04:00","modifiedAt":"2026-09-07T07:00:00-04:00","changes":[]
    },
    {
      "id":"abandon-task","name":"放弃后可恢复 · Abandon and restore","content":null,"date":null,"time":null,"listId":"inbox","source":{"kind":"manual","reference":null},"state":"pending","deletedAt":null,"completion":null,"createdAt":"2026-09-08T08:01:00-04:00","modifiedAt":"2026-09-08T08:01:00-04:00","changes":[]
    },
    {
      "id":"delete-task","name":"删除后可恢复 · Delete and restore","content":null,"date":null,"time":null,"listId":"inbox","source":{"kind":"manual","reference":null},"state":"pending","deletedAt":null,"completion":null,"createdAt":"2026-09-08T08:02:00-04:00","modifiedAt":"2026-09-08T08:02:00-04:00","changes":[]
    },
    {
      "id":"future-task","name":"未来任务 · Future task","content":"A future date must not enter Today.","date":"2026-12-31","time":"09:30","listId":"focus-list","source":{"kind":"manual","reference":null},"state":"pending","deletedAt":null,"completion":null,"createdAt":"2026-09-08T08:03:00-04:00","modifiedAt":"2026-09-08T08:03:00-04:00","changes":[]
    },
    {
      "id":"shared-task","name":"共享身份 · Shared task · 窄窗口双语长名称验收","content":"One task identity across Tasks, Today, and Calendar.","date":"2026-09-08","time":"10:00","listId":"focus-list","source":{"kind":"manual","reference":null},"state":"pending","deletedAt":null,"completion":null,"createdAt":"2026-09-08T08:04:00-04:00","modifiedAt":"2026-09-08T08:04:00-04:00","changes":[]
    },
    {
      "id":"calendar-task-a","name":"Calendar preview A · Pending","content":null,"date":"2026-09-08","time":null,"listId":"inbox","source":{"kind":"manual","reference":null},"state":"pending","deletedAt":null,"completion":null,"createdAt":"2026-09-08T08:05:00-04:00","modifiedAt":"2026-09-08T08:05:00-04:00","changes":[]
    },
    {
      "id":"calendar-task-b","name":"Calendar preview B · Completed","content":null,"date":"2026-09-08","time":null,"listId":"focus-list","source":{"kind":"manual","reference":null},"state":"completed","deletedAt":null,"completion":{"completedOn":"2026-09-08","completedTime":"12:00","recordedAt":"2026-09-08T12:00:00-04:00","source":"date-correction"},"createdAt":"2026-09-08T08:06:00-04:00","modifiedAt":"2026-09-08T12:00:00-04:00","changes":[]
    },
    {
      "id":"archived-task","name":"归档仍可回看 · Archived Calendar task","content":"Archiving a list does not remove historical Calendar lookup.","date":"2026-09-08","time":null,"listId":"archive-list","source":{"kind":"daily-flow","reference":"daily-flow-archive-check"},"state":"pending","deletedAt":null,"completion":null,"createdAt":"2026-09-08T08:07:00-04:00","modifiedAt":"2026-09-08T08:07:00-04:00","changes":[]
    }
  ]
}
EOF
  cat > "$tasks_b" <<EOF
{
  "schemaVersion": 2,
  "lists": [{"id":"inbox","name":"Inbox","system":true,"archived":false}],
  "tasks": [{"id":"vault-b-task","name":"$vault_b_task","content":"Vault switching must replace the shared source.","date":null,"time":null,"listId":"inbox","source":{"kind":"manual","reference":null},"state":"pending","deletedAt":null,"completion":null,"createdAt":"2026-09-08T08:10:00-04:00","modifiedAt":"2026-09-08T08:10:00-04:00","changes":[]}]
}
EOF
  /bin/cp "$repository_root/src-tauri/tests/fixtures/habits-v1-complete.json" "$snapshot_a"
  /bin/cp "$snapshot_a" "$snapshot_b"
  cat > "$names_a" <<'EOF'
{
  "schemaVersion": 1,
  "habits": {
    "exercise": {"zh":"锻炼 · 长名称习惯","en":"Exercise · Long localized habit"},
    "nutrition": {"zh":"营养药"},
    "reset": {"zh":"整理空间","en":"Reset living space"}
  }
}
EOF
  /bin/cp "$names_a" "$names_b"
  printf '{\n  "schemaVersion": 1,\n  "selectedVault": "%s"\n}\n' \
    "$vault_a" > "$acceptance_data_directory/today-workspace.json"
  printf '{\n  "schemaVersion": 1,\n  "interfaceLanguage": "zh"\n}\n' \
    > "$acceptance_data_directory/interface-language.json"
  before_record_hash="$(shasum -a 256 "$record_a" | awk '{print $1}')"
  before_names_hash="$(shasum -a 256 "$names_a" | awk '{print $1}')"
  before_snapshot_hash="$(shasum -a 256 "$snapshot_a" | awk '{print $1}')"

  if [[ -n "${PERSONAL_DASHBOARD_ACCEPTANCE_CAPTURE_DIRECTORY:-}" ]]; then
    [[ "$capture_directory" == /* ]] ||
      fail "4.0 candidate capture directory must be absolute"
    [[ ! -e "$capture_directory" ]] ||
      fail "4.0 candidate capture directory already exists: $capture_directory"
    mkdir -p "$capture_root"
    capture_root="$(cd "$capture_root" && pwd -P)"
    capture_parent="$(dirname "$capture_directory")"
    [[ -d "$capture_parent" ]] ||
      fail "4.0 candidate capture parent directory does not exist: $capture_parent"
    capture_parent="$(cd "$capture_parent" && pwd -P)"
    case "$capture_parent" in
      "$capture_root" | "$capture_root"/*) ;;
      *) fail "4.0 candidate captures must stay under $capture_root" ;;
    esac
    mkdir "$capture_directory"
    capture_directory="$(cd "$capture_directory" && pwd -P)"
  else
    mkdir -p "$capture_directory"
  fi

  current_step="verifying the Tasks destination, Inbox defaults, and persistent lifecycle history"
  launch_app_waiting_for_text "$record_marker" 30
  run_driver set-size "1120x760" 10
  run_driver assert-size "1120x760" 10
  run_driver press "任务" 10
  run_driver wait-active-text "$shared_task" 30
  run_driver press "新建任务" 10
  run_driver assert-active-text "加入收集箱"
  run_driver assert-active-text "$future_task"
  run_driver type-text "新建任务名称|$new_task" 10
  run_driver press "加入收集箱" 10
  run_driver wait-active-text "任务已保存到所选 Vault" 20
  wait_for_file_text "$tasks_a" "\"name\": \"$new_task\"" ||
    fail "Tasks entry point did not persist the new Inbox task"
  new_task_id="$(task_id_for_name "$tasks_a" "$new_task")" ||
    fail "new Inbox task was not retained in the task document"
  assert_task_property "$tasks_a" "$new_task_id" "listId" "inbox" ||
    fail "new Inbox task did not keep its Inbox default"
  assert_task_property "$tasks_a" "$new_task_id" "date" "null" ||
    fail "new Inbox task did not keep its no-date default"

  run_driver press-contains "完成 · $late_task" 10
  wait_for_task_property "$tasks_a" "late-task" "state" "completed" ||
    fail "late completion did not persist a completed state"
  wait_for_task_property "$tasks_a" "late-task" "date" "2026-09-07" ||
    fail "late completion moved the scheduled task date"
  run_driver wait-active-text "已完成" 20
  run_driver press-contains "详情 · $late_task" 10
  run_driver type-text "实际完成日期 · $late_task|2026-09-07" 10
  run_driver type-text "实际完成时刻（可空） · $late_task|18:30" 10
  run_driver press-contains "更正完成记录 · $late_task" 10
  wait_for_task_property "$tasks_a" "late-task" "completion.completedOn" "2026-09-07" ||
    fail "completion correction did not persist the lived completion date"
  wait_for_task_property "$tasks_a" "late-task" "completion.completedTime" "18:30" ||
    fail "completion correction did not persist the explicit completion time"

  run_driver select-contains "待办" 10
  run_driver press-contains "放弃 · $abandon_task" 10
  wait_for_task_property "$tasks_a" "abandon-task" "state" "abandoned" ||
    fail "abandon action did not persist"
  run_driver select-contains "已放弃" 10
  run_driver wait-active-text "$abandon_task" 20
  run_driver assert-active-text "已放弃"

  run_driver select-contains "待办" 10
  run_driver press-contains "删除 · $delete_task" 10
  wait_for_task_property "$tasks_a" "delete-task" "deletedAt" "not-null" ||
    fail "delete action did not persist a recoverable tombstone"
  run_driver select-contains "已删除" 10
  run_driver assert-active-text "$delete_task"
  run_driver assert-active-text "撤销删除"
  run_driver press-contains "撤销删除 · $delete_task" 10
  run_driver select-contains "待办" 10
  run_driver assert-active-text "$delete_task"
  wait_for_task_property "$tasks_a" "delete-task" "deletedAt" "null" ||
    fail "restored task did not clear its tombstone"

  current_step="verifying list archive and restore without changing task state"
  run_driver select-contains "全部未删除" 10
  run_driver press "新建清单" 10
  run_driver press "归档清单" 10
  wait_for_list_property "$tasks_a" "focus-list" "archived" "true" ||
    fail "archived task list did not persist before history verification"
  if ! stop_app; then
    fail "app process did not exit before archived-list relaunch"
  fi
  launch_app_waiting_for_text "$record_marker" 30
  run_driver press "任务" 10
  run_driver press "已归档" 20
  run_driver assert-active-text "$shared_task"
  run_driver press "新建清单" 10
  run_driver press "恢复清单" 10
  wait_for_list_property "$tasks_a" "focus-list" "archived" "false" ||
    fail "restored task list did not persist before scope verification"
  if ! stop_app; then
    fail "app process did not exit before restored-list relaunch"
  fi
  launch_app_waiting_for_text "$record_marker" 30
  run_driver press "任务" 10
  run_driver wait-active-text "$shared_task" 20
  assert_task_property "$tasks_a" "shared-task" "listId" "focus-list" ||
    fail "list archive/restore changed the shared task identity"
  assert_list_property "$tasks_a" "focus-list" "archived" "false" ||
    fail "list archive/restore did not restore the list"

  current_step="verifying shared Tasks, Today, and Calendar projections plus the overflow panel"
  run_driver capture-window "$capture_directory/product-zh-tasks-wide.png" 10
  run_driver press "今天" 10
  run_driver wait-active-text "$shared_task" 20
  run_driver assert-active-text "$overdue_task"
  run_driver assert-active-absent-text "$archived_task"
  run_driver assert-active-absent-text "$future_task"
  run_driver assert-active-text "默认今天和收集箱"
  run_driver capture-window "$capture_directory/product-zh-today-wide.png" 10

  # Mutate the shared task through Today, then observe the same canonical
  # identity in Calendar. This catches projections that only happen to render
  # the same name while retaining independent state.
  run_driver press-contains "完成 · $shared_task" 10
  wait_for_task_property "$tasks_a" "shared-task" "state" "completed" ||
    fail "Today completion did not persist through the shared task source"
  run_driver wait-active-text "已完成" 20

  run_driver press "日历" 10
  run_driver wait-active-text "2026年9月" 20
  run_driver assert-active-text "$shared_task"
  run_driver assert-active-text "已完成"
  run_driver assert-active-text "默认日期为选中日期，清单为收集箱"
  run_driver assert-active-text "+2"
  run_driver press-contains "+2" 10
  run_driver wait-active-text "$archived_task" 20
  run_driver assert-active-text "$shared_task"
  run_driver capture-window "$capture_directory/product-zh-calendar-wide.png" 10

  run_driver scroll-text-visible "默认日期为选中日期，清单为收集箱" 10
  run_driver scroll-text-visible "新建任务名称" 10
  run_driver type-text "新建任务名称|$calendar_new_task" 10
  run_driver press "加入收集箱" 10
  run_driver wait-active-text "任务已保存到所选 Vault" 20
  wait_for_file_text "$tasks_a" "\"name\": \"$calendar_new_task\"" ||
    fail "Calendar did not persist its selected-date task"
  calendar_new_task_id="$(task_id_for_name "$tasks_a" "$calendar_new_task")" ||
    fail "Calendar task was not retained in the task document"
  assert_task_property "$tasks_a" "$calendar_new_task_id" "listId" "inbox" ||
    fail "Calendar task did not keep its Inbox default"
  assert_task_property "$tasks_a" "$calendar_new_task_id" "date" "2026-09-08" ||
    fail "Calendar task did not inherit the selected date"

  run_driver press "今天" 10
  run_driver wait-active-text "$shared_task" 20
  run_driver scroll-text-visible "默认今天和收集箱" 10
  run_driver scroll-text-visible "新建任务名称" 10
  run_driver type-text "新建任务名称|$today_new_task" 10
  run_driver press "加入收集箱" 10
  run_driver wait-active-text "任务已保存到所选 Vault" 20
  wait_for_file_text "$tasks_a" "\"name\": \"$today_new_task\"" ||
    fail "Today did not persist its default-date task"
  today_new_task_id="$(task_id_for_name "$tasks_a" "$today_new_task")" ||
    fail "Today task was not retained in the task document"
  assert_task_property "$tasks_a" "$today_new_task_id" "listId" "inbox" ||
    fail "Today task did not keep its Inbox default"
  assert_task_property "$tasks_a" "$today_new_task_id" "date" "2026-09-08" ||
    fail "Today task did not inherit the fixed current date"

  current_step="checking bilingual long-name layout, Habits fallback, and external configuration recovery"
  run_driver press "设置" 10
  run_driver press "数据与 Vault" 10
  run_driver scroll-text-visible "$long_drive_copy_zh" 10
  run_driver assert-long-text-fits "$long_drive_copy_zh" 10
  run_driver assert-document-fixed "document" 10
  open_vault_picker_from_settings
  run_driver choose-folder "$vault_b" 35
  run_driver press "任务" 10
  run_driver wait-active-text "$vault_b_task" 20
  run_driver press "设置" 10
  run_driver press "数据与 Vault" 10
  open_vault_picker_from_settings
  run_driver choose-folder "$vault_a" 35
  run_driver wait-active-text "当前 Vault" 20
  run_driver press "习惯" 10
  run_driver wait-active-text "锻炼 · 长名称习惯" 20
  run_driver assert-active-text "营养药"
  run_driver capture-window "$capture_directory/product-zh-habits-wide.png" 10
  printf '%s\n' '{"schemaVersion":99,"habits":{}}' > "$acceptance_directory/dashboard-4-invalid-names.json"
  /bin/mv "$acceptance_directory/dashboard-4-invalid-names.json" "$names_a"
  run_driver press "刷新快照" 10
  run_driver wait-active-text "习惯名称配置无效；已回退快照中的原始名称" 20
  run_driver assert-active-text "Exercise"
  /bin/cp "$names_b" "$acceptance_directory/dashboard-4-valid-names.json"
  /bin/mv "$acceptance_directory/dashboard-4-valid-names.json" "$names_a"
  run_driver press "刷新快照" 10
  run_driver wait-active-text "锻炼 · 长名称习惯" 20

  current_step="capturing English and narrow surfaces, then proving packaged relaunch persistence"
  run_driver press "设置" 10
  run_driver press "切换为英文" 10
  run_driver wait-active-text "Appearance" 20
  run_driver press "Data & Vault" 10
  run_driver scroll-text-visible "$long_drive_copy_en" 10
  run_driver assert-long-text-fits "$long_drive_copy_en" 10
  run_driver assert-document-fixed "document" 10
  run_driver set-size "640x520" 10
  run_driver assert-size "640x520" 10
  run_driver press "Tasks" 10
  run_driver press "New task" 10
  run_driver wait-active-text "$shared_task" 20
  run_driver assert-active-text "New task name"
  run_driver assert-active-text "Add to Inbox"
  run_driver assert-document-fixed "document" 10
  run_driver capture-window "$capture_directory/product-en-tasks-narrow.png" 10
  run_driver press "Calendar" 10
  run_driver wait-active-text "September 2026" 20
  run_driver assert-active-text "+4"
  run_driver assert-document-fixed "document" 10
  run_driver focus-contains "+4" 10
  run_driver assert-visible-focus "+4" 10
  run_driver press-key "space" 10
  run_driver wait-active-text "$archived_task" 20
  run_driver assert-active-text "$shared_task"
  run_driver capture-window "$capture_directory/product-en-calendar-narrow.png" 10
  run_driver press "Today" 10
  run_driver wait-active-text "$shared_task" 20
  run_driver assert-active-text "Today tasks"
  run_driver assert-active-text "Overdue pending"
  run_driver capture-window "$capture_directory/product-en-today-narrow.png" 10
  run_driver press "Habits" 10
  run_driver wait-active-text "Exercise · Long localized habit" 20
  run_driver assert-active-text "营养药"
  run_driver assert-document-fixed "document" 10
  run_driver capture-window "$capture_directory/product-en-habits-narrow.png" 10

  if ! stop_app; then
    fail "app process did not exit before 4.0 packaged relaunch"
  fi
  launch_app_waiting_for_text "$record_marker" 30
  run_driver press "Tasks" 10
  run_driver wait-active-text "$new_task" 20
  run_driver assert-active-text "$shared_task"
  run_driver assert-active-text "Completed"
  run_driver select-contains "Completed" 10
  run_driver wait-active-text "$late_task" 20
  run_driver press-contains "Details · $late_task" 10
  run_driver assert-active-text "Task date: Mon, Sep 7 · 09:00"
  run_driver assert-active-text "Actual completion: Mon, Sep 7 · 18:30"
  run_driver select-contains "Abandoned" 10
  run_driver wait-active-text "$abandon_task" 20
  run_driver assert-active-text "Abandoned"
  run_driver select-contains "Pending" 10
  run_driver wait-active-text "$delete_task" 20
  run_driver assert-active-text "Pending"
  run_driver press-contains "Delete · $delete_task" 10
  run_driver select-contains "Deleted" 10
  run_driver wait-active-text "$delete_task" 20
  run_driver assert-active-text "Restore task"

  if ! stop_app; then
    fail "app process did not exit before deleted-task persistence relaunch"
  fi
  launch_app_waiting_for_text "$record_marker" 30
  run_driver press "Tasks" 10
  run_driver select-contains "Deleted" 10
  run_driver wait-active-text "$delete_task" 20
  run_driver assert-active-text "Restore task"
  run_driver press-contains "Restore task · $delete_task" 10
  run_driver select-contains "Pending" 10
  run_driver wait-active-text "$delete_task" 20
  run_driver assert-active-text "Pending"

  current_step="proving a bounded external task change retains a recoverable draft"
  run_driver select-contains "All active" 10
  run_driver press "New task" 10
  run_driver type-text "New task name|Conflict draft preserved after refresh" 10
  /bin/cp "$tasks_a" "$external_candidate"
  /usr/bin/perl -0pi -e 's/\n\z/\n\n/' "$external_candidate"
  /bin/mv "$external_candidate" "$tasks_a"
  run_driver press "Add to Inbox" 10
  run_driver wait-active-text "Task not saved" 20
  run_driver assert-active-text "Conflict draft preserved after refresh"
  run_driver press "Refresh tasks" 10
  run_driver wait-active-text "Conflict draft preserved after refresh" 20
  run_driver press "Add to Inbox" 10
  run_driver wait-active-text "Task saved to the selected Vault" 20
  wait_for_file_text "$tasks_a" '"name": "Conflict draft preserved after refresh"' ||
    fail "recoverable conflict draft was not saved after explicit refresh"

  [[ "$(find "$capture_directory" -type f -name '*.png' | wc -l | tr -d ' ')" == "8" ]] ||
    fail "4.0 candidate capture matrix did not produce exactly 8 screenshots"
  [[ "$(shasum -a 256 "$record_a" | awk '{print $1}')" == "$before_record_hash" ]] ||
    fail "Tasks, Today, Calendar, or Habits acceptance changed the Daily Record"
  [[ "$(shasum -a 256 "$names_a" | awk '{print $1}')" == "$before_names_hash" ]] ||
    fail "Habit name recovery did not restore the original sidecar bytes"
  [[ "$(shasum -a 256 "$snapshot_a" | awk '{print $1}')" == "$before_snapshot_hash" ]] ||
    fail "Habit snapshot acceptance changed the external snapshot"
  [[ -f "$record_b" && -f "$tasks_b" ]] ||
    fail "Vault-switch fixture was not retained for isolation checks"

  echo "Packaged IPC Personal Dashboard 4.0 integrated local candidate acceptance passed"
  echo "Coverage: Tasks, Today, Calendar, Habits, list archive, lifecycle history, default Inbox capture, Vault switch, conflict draft recovery, bilingual and narrow surfaces"
  echo "Shared source: Tasks, Today, and Calendar reused the same task identity; archived tasks remained Calendar-readable and excluded from Today"
  echo "Persistence: late completion, correction, abandonment, deletion/restore, list restore, and a new Inbox task survived packaged relaunch"
  echo "Visuals: eight screenshots captured from the rebuilt packaged app at wide and 640x520 narrow sizes"
  echo "Boundary: synthetic Vaults only; 08 daily-flow adapter evidence and 3.0 Drive evidence remain separate; no personal Vault, Dida365, automation, or live daily run"
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

case "$acceptance_scenario" in
  shell) run_shell_scenario ;;
  direct) run_direct_record_scenario ;;
  state-semantics) run_state_semantics_scenario ;;
  progress) run_progress_scenario ;;
  workouts) run_workout_recording_scenario ;;
  list-first | baseline) run_list_first_scenario ;;
  exceptions) run_exception_scenario ;;
  responsive) run_responsive_scenario ;;
  compact) run_compact_scenario ;;
  keyboard) run_keyboard_scenario ;;
  week-close) run_week_close_scenario ;;
  today | today-write | installed-cycle) run_today_scenario ;;
  calendar) run_calendar_scenario ;;
  habits) run_habits_scenario ;;
  vault-selection) run_vault_selection_scenario ;;
  vault-recovery) run_vault_recovery_scenario ;;
  final-state-matrix) run_final_state_matrix_scenario ;;
  dashboard-2) run_dashboard_2_scenario ;;
  settings-vault-colors) run_settings_vault_colors_scenario ;;
  interface-language) run_interface_language_scenario ;;
  background-image) run_background_image_scenario ;;
  day-tasks) run_day_tasks_scenario ;;
  planning-tasks) run_planning_tasks_scenario ;;
  local-habit-completion) run_local_habit_completion_scenario ;;
  historical-corrections) run_historical_corrections_scenario ;;
  dashboard-3) run_dashboard_3_scenario ;;
  dashboard-4) run_dashboard_4_scenario ;;
  drive-compatibility) run_drive_compatibility_scenario ;;
  live-cycle) run_live_daily_cycle_scenario ;;
  *) fail "unknown acceptance scenario: $acceptance_scenario" ;;
esac
