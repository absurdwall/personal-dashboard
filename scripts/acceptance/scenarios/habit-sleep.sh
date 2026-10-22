# Sourced by macos-ipc-workflow.sh. Real packaged IPC; owned synthetic Vault only.
# Keep expected values literal: Thu 02:00 belongs to Wed's sleep Habit, while
# Thu 07:30/07:35 belongs to Thu's wake Habit. The same night lasts 330/335 min.
habit_sleep_assert_record() {
  local file="$1" stage="$2" identity_file="$3"
  node - "$file" "$stage" "$identity_file" <<'NODE'
const fs = require('node:fs');
const assert = require('node:assert/strict');
const [file, stage, identityFile] = process.argv.slice(2);
(async () => {
  let last;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const document = JSON.parse(fs.readFileSync(file, 'utf8'));
      assert.equal(document.schemaVersion, 1);
      assert.equal(document.records.length, 1, 'supplement/correction must retain one night');
      const record = document.records[0];
      assert.ok(record.id, 'saved record has a stable identity');
      if (fs.existsSync(identityFile)) assert.equal(record.id, fs.readFileSync(identityFile, 'utf8'));
      assert.equal(record.wakeDate, '2026-09-10');
      const wakeTime = stage === 'corrected' ? '07:35' : '07:30';
      assert.deepEqual(record.getUp, {kind:'point', date:'2026-09-10', time:wakeTime, utcOffsetMinutes:-240, approximate:false});
      if (stage === 'wake-only') {
        assert.deepEqual(record.sleepOnset, {kind:'unrecorded'});
        assert.equal(record.estimatedDurationMinutes, null);
        assert.equal(document.operations.length, 1);
      } else {
        assert.deepEqual(record.sleepOnset, {kind:'point', date:'2026-09-10', time:'02:00', utcOffsetMinutes:-240, approximate:false});
        assert.equal(record.estimatedDurationMinutes, stage === 'corrected' ? 335 : 330);
        assert.equal(document.operations.length, stage === 'corrected' ? 3 : 2);
      }
      if (!fs.existsSync(identityFile)) fs.writeFileSync(identityFile, record.id, {flag:'wx'});
      return;
    } catch (error) { last = error; }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw last;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
NODE
}

habit_sleep_assert_preserved() {
  [[ "$(shasum -a 256 "$sleep_today_record" | awk '{print $1}')" == "$sleep_record_hash" ]] ||
    fail "sleep recording changed the existing Daily Record"
  [[ ! -e "$sleep_historical_record" ]] || fail "sleep recording created an absent historical Daily Record"
  [[ "$(shasum -a 256 "$sleep_completions" | awk '{print $1}')" == "$sleep_completion_hash" ]] ||
    fail "sleep recording changed Habit completion facts"
  [[ "$(shasum -a 256 "$sleep_snapshot" | awk '{print $1}')" == "$sleep_snapshot_hash" ]] ||
    fail "sleep viewing/recording rewrote the sourced Habit snapshot"
  [[ "$(shasum -a 256 "$sleep_names" | awk '{print $1}')" == "$sleep_names_hash" ]] ||
    fail "sleep viewing/recording rewrote Habit display names"
}

run_habit_sleep_scenario() {
  local vault="$acceptance_directory/habit-sleep-vault"
  local captures="${PERSONAL_DASHBOARD_ACCEPTANCE_CAPTURE_DIRECTORY:-$acceptance_directory/captures}"
  local sleep_today_record="$vault/life/Journal/Daily/2026/2026-09/2026-09-10.md"
  local sleep_historical_record="$vault/life/Journal/Daily/2026/2026-09/2026-09-09.md"
  local sleep_completions="$vault/life/.personal-dashboard/habit-completions/v1/completions.json"
  local sleep_snapshot="$vault/life/.personal-dashboard/derived/habits-v1.json"
  local sleep_names="$vault/life/.personal-dashboard/habit-names/v1/names.json"
  local canonical="$vault/life/.personal-dashboard/sleep/v1/sessions.json"
  local identity="$acceptance_directory/sleep-record-identity"
  local sleep_record_hash sleep_completion_hash sleep_snapshot_hash sleep_names_hash saved_hash
  local size language period_label metric_label
  fixed_now_epoch_millis="1789047000000" # 2026-09-10 09:30 at -04:00
  fixed_utc_offset_minutes="-240"
  current_step="preparing the owned offline Habit sleep Vault"
  mkdir -p "$vault/.obsidian" "$(dirname "$sleep_today_record")" "$(dirname "$sleep_snapshot")" \
    "$(dirname "$sleep_completions")" "$(dirname "$sleep_names")" "$acceptance_data_directory" "$captures"
  printf '{"schemaVersion":1,"selectedVault":"%s"}\n' "$vault" > "$acceptance_data_directory/today-workspace.json"
  printf '{"schemaVersion":1,"interfaceLanguage":"en"}\n' > "$acceptance_data_directory/interface-language.json"
  cat > "$sleep_today_record" <<'RECORD'
---
type: daily-record
date: 2026-09-10
---
# 2026-09-10

## 今天的大致安排

- **下午：** Synthetic existing arrangement; sleep acceptance must preserve these bytes.

## 白天更新

- **10:15：** Synthetic independent confirmed fact.
RECORD
  cat > "$sleep_completions" <<'COMPLETIONS'
{"schemaVersion":1,"completions":[{"habitKey":"exercise","livedDate":"2026-09-08","completedAt":"2026-09-08T13:00-04:00","modifiedAt":"2026-09-08T13:00-04:00","changes":[{"id":"synthetic-preserved-completion","kind":"completed","changedAt":"2026-09-08T13:00-04:00"}]}],"noOpReceipts":[]}
COMPLETIONS
  cat > "$sleep_names" <<'NAMES'
{"schemaVersion":1,"habits":{"wake":{"zh":"起床","en":"Wake up"},"sleep":{"zh":"睡觉","en":"Go to bed"}}}
NAMES
  node - "$repository_root/src-tauri/tests/fixtures/habits-v1-complete.json" "$sleep_snapshot" <<'NODE'
const fs=require('node:fs');
const [source,destination]=process.argv.slice(2);
const snapshot=JSON.parse(fs.readFileSync(source,'utf8'));
snapshot.generatedAt='2026-09-10T09:00:00-04:00';snapshot.range.to='2026-09-10';
fs.writeFileSync(destination,JSON.stringify(snapshot,null,2)+'\n',{flag:'wx'});
NODE
  sleep_record_hash="$(shasum -a 256 "$sleep_today_record" | awk '{print $1}')"
  sleep_completion_hash="$(shasum -a 256 "$sleep_completions" | awk '{print $1}')"
  sleep_snapshot_hash="$(shasum -a 256 "$sleep_snapshot" | awk '{print $1}')"
  sleep_names_hash="$(shasum -a 256 "$sleep_names" | awk '{print $1}')"

  current_step="saving the current wake endpoint through the actual Today entry"
  launch_app_waiting_for_text "Today · 2026-09-10" 30
  run_driver set-size "969x723" 10
  run_driver press "Record time · Wake up · 2026-09-10" 10
  run_driver type-text "Actual time · Wake up · 2026-09-10|07:30" 10
  run_driver press "Save time · Wake up · 2026-09-10" 10
  habit_sleep_assert_record "$canonical" wake-only "$identity" || fail "current wake endpoint was not saved exactly"
  run_driver wait-text "Correct time · Wake up · 2026-09-10" 20
  run_driver wait-active-text "Actual: 07:30" 20
  habit_sleep_assert_preserved

  current_step="reading the wake row and shared seven/thirty-day overview"
  run_driver press "Habits" 10
  run_driver focus-contains "2026-09-10 · Wake up" 10
  run_driver assert-focused-text "07:30" 10
  run_driver capture-window "$captures/sleep-current-wake-row-en.png" 10
  run_driver press "View Wake up details" 10
  run_driver wait-active-text "Wake time" 20
  run_driver press "30 days" 10
  run_driver capture-window "$captures/sleep-overview-30-days-en.png" 10
  run_driver press "7 days" 10
  run_driver press "Back to today's Habits" 10

  current_step="using a missing historical sleep date then its explicit record action"
  run_driver focus-contains "2026-09-09 · Go to bed" 10
  run_driver press-key "space" 10
  run_driver wait-active-text "2026-09-09 · Go to bed" 20
  run_driver press "View or record time · Go to bed · 2026-09-09" 10
  run_driver wait-active-text "Selected day · 2026-09-09" 20
  run_driver assert-focused-text "Actual time · Go to bed · 2026-09-09" 10
  run_driver type-text "Actual time · Go to bed · 2026-09-09|02:00" 10
  run_driver press "Save time · Go to bed · 2026-09-09" 10
  habit_sleep_assert_record "$canonical" supplemented "$identity" || fail "historical sleep did not supplement the same night"
  run_driver wait-active-text "Actual: next day 02:00" 20
  run_driver press "Daytime" 10
  run_driver press-contains "Open next day 02:00: Go to bed" 10
  run_driver wait-text "2026-09-10 02:00" 20
  run_driver wait-text "Reported sleep fact" 10
  run_driver wait-text "Canonical record: $(cat "$identity")" 10
  run_driver wait-text "Actual date: 2026-09-10 02:00 · UTC−04:00" 10
  run_driver wait-text "Selected day: 2026-09-09 · day starts at 04:00" 10
  run_driver capture-window "$captures/sleep-historical-fact-en.png" 10
  run_driver press "Close fact details" 10
  habit_sleep_assert_preserved

  current_step="correcting the wake endpoint through the current Habit date"
  run_driver press "Habits" 10
  run_driver focus-contains "2026-09-10 · Wake up" 10
  run_driver press-key "space" 10
  run_driver press "View or record time · Wake up · 2026-09-10" 10
  run_driver wait-active-text "Today · 2026-09-10" 20
  run_driver assert-focused-text "Actual time · Wake up · 2026-09-10" 10
  run_driver type-text "Actual time · Wake up · 2026-09-10|07:35" 10
  run_driver press "Save time · Wake up · 2026-09-10" 10
  habit_sleep_assert_record "$canonical" corrected "$identity" || fail "correction did not preserve identity and other endpoint"
  run_driver press "Daytime" 10
  run_driver press-contains "Open 07:35: Wake up" 10
  run_driver wait-text "2026-09-10 07:35" 20
  run_driver wait-text "Canonical record: $(cat "$identity")" 10
  run_driver wait-text "Actual date: 2026-09-10 07:35 · UTC−04:00" 10
  run_driver press "Close fact details" 10
  run_driver assert-absent-text "Open next day 02:00: Go to bed" 10
  run_driver capture-window "$captures/sleep-current-today-en.png" 10
  habit_sleep_assert_preserved
  saved_hash="$(shasum -a 256 "$canonical" | awk '{print $1}')"

  current_step="reopening the real candidate and reading the saved endpoint visibly"
  stop_app || fail "candidate did not exit before sleep persistence readback"
  launch_app_waiting_for_text "Today · 2026-09-10" 30
  run_driver wait-active-text "Actual: 07:35" 20
  run_driver press "Correct time · Wake up · 2026-09-10" 10
  run_driver press "Cancel time edit · Wake up · 2026-09-10" 10
  run_driver press "Habits" 10
  run_driver focus-contains "2026-09-10 · Wake up" 10
  run_driver assert-focused-text "07:35" 10
  run_driver press "View Go to bed details" 10
  run_driver wait-active-text "Sleep time" 20
  run_driver focus-contains "2026-09-09 · Sleep time" 10
  run_driver assert-focused-text "next day 02:00" 10
  for language in en zh; do
    if [[ "$language" == zh ]]; then
      run_driver press "Switch to Chinese" 10
      metric_label="入睡"
    else
      metric_label="Sleep time"
    fi
    for size in "830x758" "969x723" "1280x720"; do
      run_driver set-size "$size" 10
      run_driver assert-size "$size" 10
      if [[ "$language" == zh ]]; then period_label="7 天"; else period_label="7 days"; fi
      run_driver press-exact "$period_label" 10
      run_driver assert-window-visible "2026-09-04 · $metric_label" 10
      run_driver assert-window-visible "2026-09-10 · $metric_label" 10
      run_driver capture-window "$captures/sleep-reopened-overview-7-$size-$language.png" 10
      if [[ "$language" == zh ]]; then period_label="30 天"; else period_label="30 days"; fi
      run_driver press-exact "$period_label" 10
      run_driver assert-window-visible "2026-08-12 · $metric_label" 10
      run_driver assert-window-visible "2026-09-10 · $metric_label" 10
      run_driver capture-window "$captures/sleep-reopened-overview-30-$size-$language.png" 10
    done
  done
  habit_sleep_assert_record "$canonical" corrected "$identity" || fail "sleep canonical state changed after process reopen"
  [[ "$(shasum -a 256 "$canonical" | awk '{print $1}')" == "$saved_hash" ]] || fail "read-only sleep navigation/reopen wrote canonical data"
  habit_sleep_assert_preserved
  echo "Packaged Habit sleep workflow passed: current save, historical next-day supplement, correction, Habit chart/overview, Today points and actual process reopen."
  echo "Synthetic offline Vault/profile only. Captures require visual review; user native acceptance and controlled Collaboration coverage are separate evidence."
}
