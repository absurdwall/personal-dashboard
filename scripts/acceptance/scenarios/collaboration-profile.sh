# Prepare the isolated profile shared by synthetic Collaboration acceptance.
# Callers validate authorization and own their scenario-specific Vault fixtures.
prepare_isolated_collaboration_profile() {
  local profile="$1" auth="$2" vault="$3"
  mkdir -p "$profile/codex-profile"
  cp "$auth" "$profile/codex-profile/auth.json"
  chmod 600 "$profile/codex-profile/auth.json"
  printf '{"schemaVersion":1,"selectedVault":"%s"}\n' "$vault" > "$profile/today-workspace.json"
  printf '{"schemaVersion":1,"interfaceLanguage":"en"}\n' > "$profile/interface-language.json"
}
