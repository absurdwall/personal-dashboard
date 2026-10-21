# Real composer + real Codex dictation using an explicitly configured synthetic
# audio fixture. Requires diagnostic-voice-gate candidate; never opens a mic.
run_collaboration_composer_scenario() {
  local vault="$acceptance_directory/composer-vault"
  local captures="${PERSONAL_DASHBOARD_ACCEPTANCE_CAPTURE_DIRECTORY:-$acceptance_directory/captures}"
  local auth="${PERSONAL_DASHBOARD_ACCEPTANCE_CODEX_AUTH:-}"
  local marker="${PERSONAL_DASHBOARD_ACCEPTANCE_VOICE_MARKER:-personal dashboard}"
  local seconds="${PERSONAL_DASHBOARD_ACCEPTANCE_VOICE_SECONDS:-6}"
  local file="$acceptance_data_directory/collaboration/collaboration-v1.json"
  local size language input voice send
  [[ -f "$auth" ]] || fail "provide explicit existing auth.json for the isolated synthetic profile"
  [[ -f "${PERSONAL_DASHBOARD_VOICE_GATE_FIXTURE:-}" && -n "${PERSONAL_DASHBOARD_VOICE_GATE_RESULT:-}" ]] ||
    fail "synthetic fixture and diagnostic environment gate are required; microphone fallback is not an acceptance path"
  # Release optimization can coalesce/split the IPC command name. This error
  # constant only exists inside the feature-gated native fixture command.
  /usr/bin/strings "$app_executable" | rg -F "Fixture is not configured" > /dev/null ||
    fail "candidate lacks diagnostic voice fixture capability; refusing microphone fallback"
  [[ "$seconds" =~ ^([1-9]|1[0-9]|20)$ ]] || fail "voice fixture wait must be 1-20 seconds"
  mkdir -p "$vault/.obsidian" "$acceptance_data_directory/codex-profile" "$captures"
  cp "$auth" "$acceptance_data_directory/codex-profile/auth.json"
  chmod 600 "$acceptance_data_directory/codex-profile/auth.json"
  printf '{"schemaVersion":1,"selectedVault":"%s"}\n' "$vault" > "$acceptance_data_directory/today-workspace.json"
  printf '{"schemaVersion":1,"interfaceLanguage":"en"}\n' > "$acceptance_data_directory/interface-language.json"
  launch_app_waiting_for_text "Today" 30
  run_driver set-size "969x723" 10
  run_driver press "Collaboration" 10
  run_driver press "New chat" 10
  run_driver type-text "Message|Synthetic keyboard before dictation." 10
  current_step="running real synthetic dictation through the production composer"
  run_driver press "Start dictation" 10
  run_driver wait-text "Recording · You can speak" 45
  sleep "$seconds"
  run_driver press "Stop dictation" 10
  run_driver wait-text "$marker" 30
  run_driver wait-text "Start dictation" 30
  run_driver assert-state "Start dictation|enabled" 30
  run_driver assert-absent-text "Microphone stopped · Finishing transcript" 2
  run_driver assert-absent-text "Transcription ready. Review or edit" 2
  run_driver assert-absent-text "completeness is unconfirmed" 2
  # Verify actual saved draft and absence of an automatic message before editing.
  node - "$file" "$marker" <<'NODE'
const fs=require('node:fs');const [path,marker]=process.argv.slice(2);
(async()=>{
  for(let n=0;n<100;n++){
    const session=JSON.parse(fs.readFileSync(path,'utf8')).sessions[0];
    if(session?.draft?.toLowerCase().includes(marker.toLowerCase())){
      if(!session.draft.includes('Synthetic keyboard before dictation.'))throw Error('Keyboard prefix was lost');
      if(session.messages.length)throw Error('Dictation automatically submitted a message');
      return;
    }
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  throw Error('Final synthetic transcript was not retained in canonical draft');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
NODE
  run_driver capture-window "$captures/composer-real-final.png" 10
  for language in en zh; do
    if [[ "$language" == zh ]]; then run_driver press "Switch to Chinese" 10; fi
    if [[ "$language" == en ]]; then input="Message"; voice="Start dictation"; send="Send";
    else input="消息"; voice="开始听写"; send="发送"; fi
    for size in "830x758" "969x723" "1280x720"; do
      current_step="checking editable final composer at $size $language"
      run_driver set-size "$size" 10
      run_driver assert-size "$size" 10
      run_driver assert-window-visible "$voice" 10
      run_driver assert-window-visible "$send" 10
      run_driver assert-elements-disjoint "$voice|$send" 10
      run_driver type-text "$input|Editable synthetic final transcript 中文 English." 10
      run_driver assert-field-value "$input|Editable synthetic final transcript 中文 English." 10
      run_driver capture-window "$captures/composer-$size-$language.png" 10
    done
  done
  current_step="reopening the candidate with its retained editable draft"
  stop_app || fail "candidate did not exit after synthetic dictation"
  launch_app_waiting_for_text "今天" 30
  run_driver press "协作" 10
  run_driver wait-text "Editable synthetic final transcript 中文 English." 20
  run_driver assert-field-value "消息|Editable synthetic final transcript 中文 English." 10
  echo "Real synthetic composer dictation passed: stop/final/end, editable draft, no automatic message, native bilingual viewport matrix and process reopen."
}
