# Sourced by macos-ipc-workflow.sh; shares its isolated candidate lifecycle and driver.
run_task_saved_readback_scenario() {
  local vault="$acceptance_directory/task-readback-vault"
  local record="$vault/life/Journal/Daily/2026/2026-09/2026-09-08.md"
  local tasks="$vault/life/.personal-dashboard/tasks/v1/tasks.json"
  local original="Readback original task"
  local saved="Readback saved task"
  local record_hash
  fixed_now_epoch_millis="1788891000000"
  fixed_utc_offset_minutes="-240"
  current_step="preparing isolated Task saved-value fixtures"
  mkdir -p "$vault/.obsidian" "$(dirname "$record")" "$(dirname "$tasks")" "$acceptance_data_directory"
  cat > "$record" <<'RECORD'
---
type: daily-record
date: 2026-09-08
---
# 2026-09-08

## 白天更新

- Synthetic Task readback acceptance. No personal data.
RECORD
  cat > "$tasks" <<'TASKS'
{"schemaVersion":2,"lists":[{"id":"inbox","name":"Inbox","system":true,"archived":false}],"tasks":[{"id":"saved-readback","name":"Readback original task","content":"Original saved content","date":"2026-09-08","time":null,"listId":"inbox","source":{"kind":"manual","reference":null},"state":"pending","deletedAt":null,"completion":null,"createdAt":"2026-09-08T08:00:00-04:00","modifiedAt":"2026-09-08T08:00:00-04:00","changes":[]}]}
TASKS
  printf '{"schemaVersion":1,"selectedVault":"%s"}\n' "$vault" > "$acceptance_data_directory/today-workspace.json"
  printf '{"schemaVersion":1,"interfaceLanguage":"en"}\n' > "$acceptance_data_directory/interface-language.json"
  record_hash="$(shasum -a 256 "$record" | awk '{print $1}')"
  launch_app_waiting_for_text "$original" 30
  run_driver set-size "969x723" 10

  current_step="discarding an edited Task when navigating away"
  run_driver press "Tasks" 10
  run_driver press-contains "Details · $original" 10
  run_driver assert-field-value "Content|Original saved content" 10
  run_driver type-text "Content|Unsaved content must disappear" 10
  run_driver press "Today" 10
  run_driver press "Tasks" 10
  run_driver press-contains "Details · $original" 10
  run_driver assert-field-value "Content|Original saved content" 10

  current_step="saving through Today while the previously opened Task form is untouched"
  run_driver press "Today" 10
  run_driver press-contains "Details · $original" 10
  run_driver type-text "Name|$saved" 10
  run_driver type-text "Content|Replacement canonical content" 10
  run_driver press "Save" 10
  wait_for_task_property "$tasks" "saved-readback" "name" "$saved" || fail "Today Task save did not persist"
  assert_task_property "$tasks" "saved-readback" "content" "Replacement canonical content" || fail "Today content mismatch"
  run_driver press "Tasks" 10
  run_driver wait-active-text "$saved" 20
  run_driver press-contains "Details · $saved" 10
  run_driver assert-field-value "Name · $saved|$saved" 10
  run_driver assert-field-value "Content|Replacement canonical content" 10

  current_step="discarding an edited Task on explicit refresh"
  run_driver type-text "Content|Unsaved before explicit refresh" 10
  run_driver press "Refresh tasks" 10
  run_driver press-contains "Details · $saved" 10
  run_driver assert-field-value "Content|Replacement canonical content" 10

  current_step="clearing canonical content and reading the real empty field"
  run_driver type-text "Content|" 10
  run_driver press "Save" 10
  wait_for_task_property "$tasks" "saved-readback" "content" "null" || fail "Task content was not cleared"
  run_driver press "Refresh tasks" 10
  run_driver press-contains "Details · $saved" 10
  run_driver assert-field-value "Content|" 10
  run_driver press "Today" 10
  run_driver wait-active-text "$saved" 20
  run_driver press "Calendar" 10
  run_driver press-contains "Sep 8" 10
  run_driver wait-active-text "$saved" 20
  run_driver press-contains "Details · $saved" 10
  run_driver assert-field-value "Content|" 10

  current_step="reopening the real candidate and reading its saved Task detail"
  stop_app || fail "candidate did not exit before saved Task readback"
  launch_app_waiting_for_text "$saved" 30
  run_driver press "Tasks" 10
  run_driver wait-active-text "$saved" 20
  run_driver press-contains "Details · $saved" 10
  run_driver assert-field-value "Name · $saved|$saved" 10
  run_driver assert-field-value "Content|" 10
  assert_task_property "$tasks" "saved-readback" "date" "2026-09-08" || fail "saved Task identity/date changed"
  assert_task_property "$tasks" "saved-readback" "state" "pending" || fail "saved Task state changed"
  [[ "$(shasum -a 256 "$record" | awk '{print $1}')" == "$record_hash" ]] || fail "Task edits changed Daily Record"
  echo "Packaged Task saved-value acceptance passed: navigation/refresh discard, untouched old form, canonical replacement/clear, Today/Tasks/Calendar identity, and actual App process reopen."
  echo "Task writes used real candidate IPC and canonical TaskApplication; synthetic Vault/profile only. Collaboration model write remains separate #127/#131 evidence."
}
