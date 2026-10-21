# Optional known-good macOS launch route. Only the task-owned unique acceptance
# identity may be registered; product installation and profile are never opened.
launch_app_via_launch_services() {
  local identifier
  [[ "${PERSONAL_DASHBOARD_ACCEPTANCE_POINTER_FREE:-0}" == "1" ]] || fail "Launch Services acceptance requires the unique candidate identity"
  case "$app_bundle" in
    /private/tmp/personal-dashboard-ipc.*.noindex/Personal\ Dashboard.app) ;;
    *) fail "Launch Services acceptance requires a task-owned noindex candidate" ;;
  esac
  identifier="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$app_bundle/Contents/Info.plist")"
  [[ "$identifier" == com.tortillaflat.personal-dashboard.acceptance* ]] || fail "refusing to launch a product identity through acceptance"
  [[ "$today_time_axis_real_clock" == "0" ]] || fail "Launch Services diagnostic requires the existing fixed acceptance clock"
  local launch_environment=(
    --env "PATH=$PATH"
    --env "PERSONAL_DASHBOARD_DATA_DIR=$acceptance_data_directory"
    --env "PERSONAL_DASHBOARD_BASELINE_FILE=$acceptance_baseline_file"
    --env "PERSONAL_DASHBOARD_NOW_EPOCH_MILLIS=$fixed_now_epoch_millis"
    --env "PERSONAL_DASHBOARD_UTC_OFFSET_MINUTES=$fixed_utc_offset_minutes"
  )
  if [[ -n "${PERSONAL_DASHBOARD_VOICE_GATE_RESULT:-}" ]]; then
    launch_environment+=(--env "PERSONAL_DASHBOARD_VOICE_GATE_RESULT=$PERSONAL_DASHBOARD_VOICE_GATE_RESULT"
      --env "PERSONAL_DASHBOARD_VOICE_GATE_DATA_DIR=$acceptance_data_directory")
  fi
  if [[ -n "${PERSONAL_DASHBOARD_VOICE_GATE_FIXTURE:-}" ]]; then
    launch_environment+=(--env "PERSONAL_DASHBOARD_VOICE_GATE_FIXTURE=$PERSONAL_DASHBOARD_VOICE_GATE_FIXTURE")
  fi
  app_launch_ownership_unknown=1
  /usr/bin/open -n --stdout "$acceptance_directory/app.log" --stderr "$acceptance_directory/app.log" \
    "${launch_environment[@]}" "$app_bundle" || fail "Launch Services could not launch the isolated candidate"
  if ! app_pid="$(python3 - "$app_executable" <<'PY'
import os,subprocess,sys,time
expected=os.path.realpath(sys.argv[1]);deadline=time.monotonic()+10
while time.monotonic()<deadline:
    matches=[]
    for line in subprocess.check_output(['ps','-axo','pid=,comm='],text=True).splitlines():
        row=line.strip().split(maxsplit=1)
        if len(row)==2 and os.path.realpath(row[1])==expected:matches.append(row[0])
    if len(matches)==1:print(matches[0]);break
    if len(matches)>1:raise SystemExit('Ambiguous owned candidate process; retained for diagnosis')
    time.sleep(.1)
else:raise SystemExit('No exact owned candidate PID; retained for diagnosis')
PY
  )"; then
    fail "could not establish exact Launch Services process ownership; candidate retained"
  fi
  app_launch_ownership_unknown=0
  printf '%s\n' "$app_pid" > "$app_pid_file" || fail "could not record the Launch Services candidate PID"
  pid_is_running "$app_pid" || fail "isolated Launch Services candidate exited"
  run_driver activate-owned "" 10
  echo "Launch Services candidate owns its main and focused window."
}
