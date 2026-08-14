#!/usr/bin/env bash

set -euo pipefail

script_directory="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd "$script_directory/../.." && pwd)"
source_app_bundle="${PERSONAL_DASHBOARD_APP_BUNDLE:-$repository_root/src-tauri/target/release/bundle/macos/Personal Dashboard.app}"
acceptance_directory=""
app_bundle=""
app_executable=""
app_pid=""
acceptance_data_directory=""
acceptance_baseline_file=""

fail() {
  echo "Packaged launch acceptance failed: $1" >&2
  exit 1
}

find_app_pids() {
  while read -r candidate_pid candidate_command; do
    if [[ "$candidate_command" == "$app_executable" ]]; then
      echo "$candidate_pid"
    fi
  done < <(ps -axo pid=,command=)
}

cleanup() {
  if [[ -n "$app_pid" ]] && kill -0 "$app_pid" 2>/dev/null; then
    kill -TERM "$app_pid"
    wait "$app_pid" 2>/dev/null || true
  fi
  if [[ -n "$acceptance_directory" && -d "$acceptance_directory" ]]; then
    case "$acceptance_directory" in
      /tmp/personal-dashboard-packaged-launch.* | /private/tmp/personal-dashboard-packaged-launch.*)
        find "$acceptance_directory" -depth -delete
        ;;
    esac
  fi
}

trap cleanup EXIT

[[ -d "$source_app_bundle" ]] || fail "missing application bundle at $source_app_bundle"

acceptance_directory="$(mktemp -d /tmp/personal-dashboard-packaged-launch.XXXXXX)"
acceptance_directory="$(cd "$acceptance_directory" && pwd -P)"
app_bundle="$acceptance_directory/Personal Dashboard.app"
/usr/bin/ditto "$source_app_bundle" "$app_bundle"
app_executable="$app_bundle/Contents/MacOS/personal-dashboard"
acceptance_data_directory="$acceptance_directory/profile"
acceptance_baseline_file="$acceptance_directory/no-completed-baseline/state.json"

[[ -x "$app_executable" ]] || fail "missing executable at $app_executable"

bundle_name="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleName' "$app_bundle/Contents/Info.plist")"
[[ "$bundle_name" == "Personal Dashboard" ]] || fail "unexpected bundle name: $bundle_name"

executable_architectures="$(lipo -archs "$app_executable")"
[[ " $executable_architectures " == *" arm64 "* ]] || fail "bundle does not contain an arm64 executable"

if find "$app_bundle" -type f \( -name '*.py' -o -name 'python' -o -name 'python3' \) -print -quit | grep -q .; then
  fail "bundle contains a Python runtime or source file"
fi

if otool -L "$app_executable" | grep -qi python; then
  fail "bundle executable links to Python"
fi

existing_pids=" $(find_app_pids | tr '\n' ' ')"
open -n \
  --env "PERSONAL_DASHBOARD_DATA_DIR=$acceptance_data_directory" \
  --env "PERSONAL_DASHBOARD_BASELINE_FILE=$acceptance_baseline_file" \
  "$app_bundle"

for _ in {1..50}; do
  while read -r candidate_pid; do
    if [[ " $existing_pids " != *" $candidate_pid "* ]]; then
      app_pid="$candidate_pid"
      break 2
    fi
  done < <(find_app_pids)
  sleep 0.1
done

[[ -n "$app_pid" ]] || fail "Launch Services did not start a new app process"
sleep 1
kill -0 "$app_pid" 2>/dev/null || fail "app process exited during launch"

if /usr/sbin/lsof -Pan -p "$app_pid" -iTCP -sTCP:LISTEN 2>/dev/null | grep -q .; then
  fail "app process opened a listening TCP socket"
fi

if ps -axo ppid=,pid=,command= | awk -v parent_pid="$app_pid" '$1 == parent_pid && tolower($0) ~ /python|http[.]server/ { found = 1 } END { exit !found }'; then
  fail "app process launched a Python or localhost child process"
fi

echo "Packaged launch acceptance passed"
echo "Built bundle: $source_app_bundle"
echo "Launch: relocated copy opened through macOS Launch Services"
echo "Profile: isolated temporary app-owned data with no baseline source"
echo "Architecture: $executable_architectures"
echo "Runtime: native app process with no Python or listening TCP socket"
