# One candidate, one synthetic Vault, real App UI and real Codex connection.
# The feature/env-gated audio source is a local fixture; no microphone fallback.
experience_124_driver() {
  local output
  if ! output="$("$driver_binary" "$app_pid" "$@" 2>&1)"; then
    "$driver_binary" "$app_pid" dump-window "" 3 > "$captures/failure-accessibility.txt" 2>&1 || true
    "$driver_binary" "$app_pid" capture-window "$captures/failure-window.png" 3 >/dev/null 2>&1 || true
    if [[ -f "$acceptance_directory/app.log" ]]; then cp "$acceptance_directory/app.log" "$captures/failure-app.log"; fi
    fail "$output"
  fi
  printf '%s\n' "$output" | sanitize_acceptance_output
}

experience_124_readback() {
  node - "$1" "${2:-10}" "$collaboration_file" "$sleep_file" "$task_file" \
    "${sleep_id:-}" "${generated_title:-}" <<'NODE'
const fs=require('node:fs');
const [mode,seconds,collaborationFile,sleepFile,taskFile,originalSleepId,generatedTitle]=process.argv.slice(2);
const date='2026-09-08',name='Integrated acceptance task';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const ensure=(condition,message)=>{if(!condition)throw Error(message);};
const sleep=()=>read(sleepFile).records.find(record=>record.wakeDate===date);
const session=()=>read(collaborationFile).sessions.find(value=>value.messages.some(message=>message.role==='user'));
function taskAndSleep(){
  const records=read(taskFile).tasks;
  ensure(records.length===1,'Expected one canonical Task, without a duplicate');
  const task=records[0];
  ensure(task.name===name&&task.content==='Saved through real Collaboration','Task text does not match the saved request');
  ensure(task.date===date&&task.time==='09:00'&&task.listId==='inbox'&&task.state==='pending'&&!task.deletedAt,'Task identity/schedule/state differs');
  const record=sleep();
  ensure(record?.id===originalSleepId,'Collaboration replaced the existing night identity');
  ensure(record.sleepOnset.kind==='point'&&record.sleepOnset.date==='2026-09-07'&&record.sleepOnset.time==='23:50','Sleep onset differs from the correction');
  ensure(record.getUp.kind==='point'&&record.getUp.date===date&&record.getUp.time==='07:20','Get-up differs from the supplement');
  ensure(record.sleepOnset.utcOffsetMinutes===-240&&record.getUp.utcOffsetMinutes===-240&&record.estimatedDurationMinutes===450,'Actual endpoint offsets/duration differ');
  const history=read(sleepFile).records;
  ensure(history.length===3&&history.find(value=>value.id==='old-synthetic-night')?.estimatedDurationMinutes===450,'Unrelated sleep history was changed');
  return task;
}
function check(){
  if(mode==='manual'){
    const record=sleep();
    ensure(record?.sleepOnset.kind==='text'&&record.sleepOnset.text==='八点多'&&record.sleepOnset.date===date,'Manual original wording was not saved');
    ensure(record.getUp.kind==='unrecorded'&&record.estimatedDurationMinutes===null,'Missing endpoint became a fabricated time/duration');
    return record.id;
  }
  const saved=session();
  ensure(saved,'First Collaboration message is not saved');
  if(mode==='temporary'){
    ensure(saved.title&&saved.titleGeneration?.temporaryTitle===saved.title,'First message has no persistent temporary title');
    return saved.title;
  }
  if(['error','interrupted'].includes(saved.runState)){
    const error=Error(`Real Collaboration ended ${saved.runState}: ${saved.progress}`);error.fatal=true;throw error;
  }
  ensure(saved.runState==='completed','Real Collaboration is still running');
  const task=taskAndSleep();
  ensure(saved.taskOperations.length===1&&saved.taskOperations[0].status==='applied','Expected one applied Task operation');
  if(mode==='reply')return task.id;
  if(saved.titleGeneration?.status==='failed'){
    const error=Error('Actual title generation failed; temporary title is retained');error.fatal=true;throw error;
  }
  ensure(saved.titleGeneration?.status==='generated','Actual title generation has not finished');
  ensure(saved.title&&saved.title!==saved.titleGeneration.temporaryTitle&&!saved.title.includes('\n'),'Generated title is empty, unchanged or multiline');
  if(mode==='title')return saved.title;
  ensure(saved.title===generatedTitle,'Saved generated title changed unexpectedly');
  ensure(saved.messages.length===2,'Dictation automatically submitted a message or altered the first exchange');
  if(mode==='voice'){
    ensure(saved.draft.includes('Synthetic keyboard before dictation.'),'Keyboard prefix was lost');
    ensure(saved.draft.toLowerCase().includes('personal dashboard'),'Real final transcript is not in the saved draft');
  } else {
    ensure(saved.draft==='Editable integrated synthetic transcript. 中文 English.','Edited draft was not retained');
  }
  return task.id;
}
(async()=>{
  const deadline=Date.now()+Number(seconds)*1000;let last;
  do{
    try{process.stdout.write(check());return;}catch(error){if(error.fatal)throw error;last=error;}
    await new Promise(resolve=>setTimeout(resolve,100));
  }while(Date.now()<deadline);
  throw last;
})().catch(error=>{console.error(error.message);process.exitCode=1;});
NODE
}

run_experience_124_scenario() {
  local vault="$acceptance_directory/experience-124-vault"
  local captures="${PERSONAL_DASHBOARD_ACCEPTANCE_CAPTURE_DIRECTORY:-$acceptance_directory/experience-124-captures}"
  local auth="${PERSONAL_DASHBOARD_ACCEPTANCE_CODEX_AUTH:-}"
  local record="$vault/life/Journal/Daily/2026/2026-09/2026-09-08.md"
  local snapshot="$vault/life/.personal-dashboard/derived/habits-v1.json"
  local sleep_file="$vault/life/.personal-dashboard/sleep/v1/sessions.json"
  local task_file="$vault/life/.personal-dashboard/tasks/v1/tasks.json"
  local collaboration_file="$acceptance_data_directory/collaboration/collaboration-v1.json"
  local sleep_id generated_title temporary_title task_id record_hash snapshot_hash candidate_hash
  local prompt='In this isolated synthetic Vault, correct the existing sleep record indexed 2026-09-08: I actually fell asleep on 2026-09-07 at 23:50 and got out of bed on 2026-09-08 at 07:20, both UTC-04:00. Replace the earlier 八点多 wording, keep that same night identity, and save both exact endpoints now. Also create exactly one local Inbox Task named Integrated acceptance task, content Saved through real Collaboration, date 2026-09-08, time 09:00. Save it now. Keep Daily Records, Habit evidence and all unrelated data unchanged. Reply briefly in English with the saved results.'
  [[ -f "$auth" ]] || fail "provide explicit existing auth.json for the isolated synthetic profile"
  [[ -f "${PERSONAL_DASHBOARD_VOICE_GATE_FIXTURE:-}" && -n "${PERSONAL_DASHBOARD_VOICE_GATE_RESULT:-}" ]] ||
    fail "synthetic fixture and diagnostic environment gate are required; no microphone fallback"
  /usr/bin/strings "$app_executable" | rg -F "Gate is not enabled" > /dev/null ||
    fail "candidate lacks the explicitly gated synthetic audio capability"
  current_step="preparing one isolated Vault for integrated experience acceptance"
  fixed_now_epoch_millis="1788891000000"
  fixed_utc_offset_minutes="-240"
  mkdir -p "$vault/.obsidian" "$(dirname "$record")" "$(dirname "$snapshot")" \
    "$(dirname "$sleep_file")" "$acceptance_data_directory/codex-profile" "$captures"
  cp "$auth" "$acceptance_data_directory/codex-profile/auth.json"
  chmod 600 "$acceptance_data_directory/codex-profile/auth.json"
  printf '{"schemaVersion":1,"selectedVault":"%s"}\n' "$vault" > "$acceptance_data_directory/today-workspace.json"
  printf '{"schemaVersion":1,"interfaceLanguage":"en"}\n' > "$acceptance_data_directory/interface-language.json"
  cp "$repository_root/src-tauri/tests/fixtures/habits-v1-complete.json" "$snapshot"
  cat > "$record" <<'RECORD'
---
type: daily-record
date: 2026-09-08
source: integrated-synthetic-acceptance
---
# 2026-09-08

## 早间基准

### 初始安排

- Retain this synthetic Daily Record while checking shared canonical facts.

## 白天更新

- No personal data. Task and sleep writes must not change this text.
RECORD
  cat > "$sleep_file" <<'SLEEP'
{"schemaVersion":1,"records":[{"id":"old-synthetic-night","wakeDate":"2026-06-12","sleepOnset":{"kind":"point","date":"2026-06-11","time":"23:30","utcOffsetMinutes":-240,"approximate":false},"getUp":{"kind":"point","date":"2026-06-12","time":"07:00","utcOffsetMinutes":-240,"approximate":false},"estimatedDurationMinutes":450},{"id":"prior-synthetic-night","wakeDate":"2026-09-07","sleepOnset":{"kind":"point","date":"2026-09-07","time":"00:10","utcOffsetMinutes":-240,"approximate":false},"getUp":{"kind":"point","date":"2026-09-07","time":"08:10","utcOffsetMinutes":-240,"approximate":false},"estimatedDurationMinutes":480}],"operations":[]}
SLEEP
  record_hash="$(shasum -a 256 "$record" | awk '{print $1}')"
  snapshot_hash="$(shasum -a 256 "$snapshot" | awk '{print $1}')"
  candidate_hash="$(shasum -a 256 "$app_executable" | awk '{print $1}')"

  launch_app_waiting_for_text "Today" 30
  experience_124_driver set-size "969x723" 10
  if [[ "${PERSONAL_DASHBOARD_ACCEPTANCE_ACTIVATE_OWNED:-0}" == "1" ]]; then experience_124_driver activate-owned "" 5; fi
  current_step="saving one manual dated fuzzy endpoint through Today"
  experience_124_driver press-contains "Sleep · 2026-09-08" 10
  experience_124_driver wait-text "Sleep and wake record" 10
  experience_124_driver wait-text "Sleep onset precision" 10
  experience_124_driver scroll-text-visible "Sleep onset precision" 10
  experience_124_driver select-field "Sleep onset precision|Original wording" 10
  experience_124_driver type-text "Sleep onset · Original wording|八点多" 10
  experience_124_driver scroll-text-visible "Save record" 10
  experience_124_driver press-exact "Save record" 10
  sleep_id="$(experience_124_readback manual 10)" || fail "manual sleep record was not confirmed"
  experience_124_driver wait-text "八点多" 10
  experience_124_driver capture-window "$captures/01-today-manual-sleep.png" 10

  current_step="saving Task and correcting the same night through real Collaboration"
  experience_124_driver press-exact "Collaboration" 10
  experience_124_driver press-exact "New chat" 10
  experience_124_driver type-text "Message|$prompt" 10
  experience_124_driver press-exact "Send" 10
  temporary_title="$(experience_124_readback temporary 10)" || fail "first message temporary title was not saved"
  experience_124_driver wait-text "$temporary_title" 10
  task_id="$(experience_124_readback reply 180)" || fail "real Collaboration save failed exact readback"
  generated_title="$(experience_124_readback title 60)" || fail "real first-reply title was not generated"
  experience_124_driver wait-text "$generated_title" 15
  experience_124_driver assert-role-text "AXHeading|$generated_title" 10
  experience_124_driver press-contains "$generated_title" 10
  experience_124_driver capture-window "$captures/02-collaboration-generated-title.png" 10

  current_step="reading the same Task from Tasks, Today and Calendar"
  experience_124_driver press-exact "Tasks" 10
  experience_124_driver press-exact "Refresh tasks" 10
  experience_124_driver press-contains "Details · Integrated acceptance task" 10
  experience_124_driver assert-field-value "Content|Saved through real Collaboration" 10
  experience_124_driver capture-window "$captures/03-task-canonical-detail.png" 10
  experience_124_driver press-exact "Today" 10
  experience_124_driver wait-active-text "Integrated acceptance task" 10
  experience_124_driver wait-text "Onset 23:50 · Get-up 07:20" 10
  experience_124_driver capture-window "$captures/04-today-saved-task-and-sleep.png" 10
  experience_124_driver press-exact "Calendar" 10
  experience_124_driver press-contains "Sep 8" 10
  experience_124_driver wait-active-text "Integrated acceptance task" 10

  current_step="checking retained Habit baseline and shared sleep statistics/history"
  experience_124_driver press-exact "Habits" 10
  experience_124_driver wait-text "Sleep · last seven days" 15
  experience_124_driver assert-text "THIS WEEK" 10
  experience_124_driver assert-text "Weekly habits today" 10
  experience_124_driver assert-text "Exercise" 10
  experience_124_driver capture-window "$captures/05-habits-seven-day-curves.png" 10
  experience_124_driver press-exact "Sleep onset" 10
  experience_124_driver wait-text "Average 00:00" 10
  experience_124_driver assert-state "Sleep onset|pressed" 10
  experience_124_driver press-exact "Get-up" 10
  experience_124_driver wait-text "Average 07:45" 10
  experience_124_driver press-exact "Estimated duration" 10
  experience_124_driver wait-text "Average 7h 45m" 10
  experience_124_driver press-exact "30 days" 10
  experience_124_driver capture-window "$captures/06-sleep-detail-duration-history.png" 10
  experience_124_driver scroll-text-visible "2026-06-12 ·" 10
  experience_124_driver press-contains "2026-06-12 ·" 10
  experience_124_driver press-exact "Sleep onset" 10
  experience_124_driver wait-text "Average 23:30" 10
  experience_124_driver press-exact "Close" 10

  experience_124_driver press-exact "Collaboration" 10
  experience_124_driver press-contains "$generated_title" 10
  if [[ "${PERSONAL_DASHBOARD_ACCEPTANCE_CORE_ONLY:-0}" == "1" ]]; then
    current_step="retaining a keyboard draft with real voice explicitly unmet"
    printf 'PARTIAL MODE: real voice skipped; keyboard draft checks cannot satisfy dictation acceptance.\n'
  else
    current_step="retaining real synthetic dictation as an editable unsent draft"
    experience_124_driver type-text "Message|Synthetic keyboard before dictation." 10
    capture_synthetic_composer_dictation experience_124_driver press-exact "personal dashboard" 6
    assert_synthetic_composer_dictation_complete experience_124_driver
    experience_124_readback voice 10 >/dev/null || fail "real transcript/draft state was not confirmed"
    experience_124_driver capture-window "$captures/07-real-voice-unsent-draft.png" 10
  fi
  experience_124_driver type-text "Message|Editable integrated synthetic transcript. 中文 English." 10
  experience_124_driver assert-field-value "Message|Editable integrated synthetic transcript. 中文 English." 10
  experience_124_readback edited 10 >/dev/null || fail "edited draft was not retained"

  current_step="quitting and reopening the same candidate for exact visible readback"
  stop_app || fail "candidate did not exit before integrated readback"
  launch_app_waiting_for_text "Today" 30
  experience_124_driver press-exact "Tasks" 10
  experience_124_driver press-contains "Details · Integrated acceptance task" 10
  experience_124_driver assert-field-value "Content|Saved through real Collaboration" 10
  experience_124_driver press-exact "Today" 10
  experience_124_driver wait-text "Onset 23:50 · Get-up 07:20" 10
  experience_124_driver press-exact "Habits" 10
  experience_124_driver wait-text "Sleep · last seven days" 10
  experience_124_driver press-exact "Get-up" 10
  experience_124_driver assert-state "Get-up|pressed" 10
  experience_124_driver wait-text "Average 07:45" 10
  experience_124_driver press-exact "Close" 10
  experience_124_driver press-exact "Collaboration" 10
  experience_124_driver press-contains "$generated_title" 10
  experience_124_driver assert-role-text "AXHeading|$generated_title" 10
  experience_124_driver assert-field-value "Message|Editable integrated synthetic transcript. 中文 English." 10
  experience_124_readback reopened 10 >/dev/null || fail "integrated reopened canonical values differ"
  experience_124_driver capture-window "$captures/08-reopened-title-and-draft.png" 10
  experience_124_driver dump-window "" 10 > "$captures/reopened-accessibility.txt"
  [[ "$(shasum -a 256 "$record" | awk '{print $1}')" == "$record_hash" ]] || fail "Task/sleep writes changed Daily Record"
  [[ "$(shasum -a 256 "$snapshot" | awk '{print $1}')" == "$snapshot_hash" ]] || fail "Task/sleep writes changed Habit evidence"
  [[ ! -e "$vault/life/.personal-dashboard/habit-completions/v1/completions.json" ]] || fail "Sleep/Task writes created automatic Habit completions"
  [[ "$(shasum -a 256 "$app_executable" | awk '{print $1}')" == "$candidate_hash" ]] || fail "candidate binary changed during acceptance"
  cp "$sleep_file" "$captures/canonical-sleep.json"
  cp "$task_file" "$captures/canonical-tasks.json"
  cp "$collaboration_file" "$captures/synthetic-collaboration.json"
  # Exit nonzero so the deliberate voice omission can never be mistaken for
  # this ticket's combined acceptance, even after the core reopen checks pass.
  if [[ "${PERSONAL_DASHBOARD_ACCEPTANCE_CORE_ONLY:-0}" == "1" ]]; then
    printf 'PARTIAL CHECKPOINT ONLY: integrated sleep, Task, generated title, history and keyboard draft retained after actual App reopen; real voice was skipped and remains unmet. Spec #124 / ticket #131 remains unaccepted.\nCandidate SHA256: %s\n' "$candidate_hash"
    return 2
  fi
  printf 'Integrated experience #124 acceptance passed: one candidate, one synthetic Vault, manual and Collaboration sleep/Task writes, shared trends/history, generated title, real unsent dictation, and actual App reopen.\nCandidate SHA256: %s\nTask identity: %s\nSleep identity: %s\n' "$candidate_hash" "$task_id" "$sleep_id"
}
