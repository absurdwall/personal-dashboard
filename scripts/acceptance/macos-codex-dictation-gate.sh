#!/usr/bin/env bash
set -euo pipefail

script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd "$script_directory/../.." && pwd)"
gate_root="$(mktemp -d /tmp/personal-dashboard-dictation-gate.XXXXXX)"
mv "$gate_root" "$gate_root.noindex"
gate_root="$gate_root.noindex"
existing_profile_root="${PERSONAL_DASHBOARD_VOICE_GATE_DATA_DIR:-$HOME/Library/Application Support/com.tortillaflat.personal-dashboard}"
[[ -d "$existing_profile_root/codex-profile" ]] || {
  echo 'An existing Dashboard ChatGPT profile is required; credentials are never copied.' >&2
  exit 1
}
cat > "$gate_root/window.json" <<'JSON'
{"app":{"windows":[{"label":"main","title":"Personal Dashboard voice gate","url":"voice-runtime-gate.html","width":960,"height":720}]}}
JSON
cd "$repository_root"
npm run tauri -- build --bundles app --config "$gate_root/window.json"
target_directory="${CARGO_TARGET_DIR:-$repository_root/src-tauri/target}"
source_bundle="$target_directory/release/bundle/macos/Personal Dashboard.app"
app_bundle="$gate_root/Personal Dashboard.app"
ditto "$source_bundle" "$app_bundle"
fixture_environment=()
if [[ -n "${PERSONAL_DASHBOARD_VOICE_GATE_FIXTURE:-}" ]]; then
  fixture_environment=(--env "PERSONAL_DASHBOARD_VOICE_GATE_FIXTURE=$PERSONAL_DASHBOARD_VOICE_GATE_FIXTURE")
fi
open -n \
  --env "PERSONAL_DASHBOARD_DATA_DIR=$gate_root/profile" \
  --env "PERSONAL_DASHBOARD_BASELINE_FILE=$gate_root/no-baseline.json" \
  --env "PERSONAL_DASHBOARD_VOICE_GATE_RESULT=$gate_root/result.json" \
  --env "PERSONAL_DASHBOARD_VOICE_GATE_DATA_DIR=$existing_profile_root" \
  "${fixture_environment[@]}" "$app_bundle"
echo "Diagnostic bundle: $app_bundle"
echo "Sanitized metadata: $gate_root/result.json"
echo 'Click the explicit microphone/connection controls. Stop capture before leaving.'
echo 'A configured synthetic fixture uses Web Audio without speaker playback or a live microphone.'
echo 'No raw transcript/audio/SDP is saved by the diagnostic. Product acceptance remains separate.'
