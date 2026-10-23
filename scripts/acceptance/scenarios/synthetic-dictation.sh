# Shared production-composer UI steps. Callers retain their own fixture gates,
# saved-session/draft readback, keyboard-prefix and reopen checks.
capture_synthetic_composer_dictation() {
  local driver="$1" press_action="$2" marker="$3" seconds="$4"
  "$driver" "$press_action" "Start dictation" 10
  "$driver" wait-text "Recording · You can speak" 45
  sleep "$seconds"
  "$driver" "$press_action" "Stop dictation" 10
  "$driver" wait-text "$marker" 30
}

assert_synthetic_composer_dictation_complete() {
  local driver="$1"
  "$driver" assert-state "Start dictation|enabled" 30
  "$driver" assert-absent-text "Microphone stopped · Finishing transcript" 2
  "$driver" assert-absent-text "Transcription ready. Review or edit" 2
  "$driver" assert-absent-text "completeness is unconfirmed" 2
}
