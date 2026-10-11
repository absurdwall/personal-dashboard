# PDEX-09 — Collaboration command completion evidence

Date: 2026-10-10
Branch: `codex/pdex-09`
Worktree: `/tmp/pdex-09`
Implementation: `7ebe2c2`
Base: integration claim `32b7ff7`, descending from approved `8960c80`
Integration synchronized: `4e95520` merges `0fd4362` without rewriting history.

## Delivered behavior

The production Collaboration composer discovers the existing `/retro` command
at the leading slash token. Typing filters it; arrows select; Tab, Enter or a
click inserts editable text. Enter with a candidate, including Cmd/Ctrl+Enter,
completes rather than sending. Escape closes discovery until a subsequent edit.
URLs, paths, ordinary slash text, and command arguments keep ordinary input
behavior. A selected range, received dictation or a disabled composer cannot
turn a stale option into an overwrite or submission.

Completion dispatches the editor's existing input event. The production
cache/debounced save/session-date draft path remains authoritative; execution
still uses the ordinary message and embedded Personal Retro usage skill.
There is no new Retro executor and no Workflow Retro suggestion.

Redundant section labels were removed while keeping the destination, session
list and selected conversation headings. Introductory background and input/save
help open on demand. Live dictation status, preview, stop/send controls,
operation failures and recovery/work history remain outside the folded help.

## Automated checks

- `npm run build`: passed.
- `npm run test:frontend`: 396 tests passed, zero failed/skipped on macOS.
- The final strengthened form-submit + shipped stylesheet harness rerun passed
  all eight DOM tests; no production code changed after the full suite.
- Eight new tests execute the actual production DOM initializer against the
  shipped HTML and CSS inside macOS WebKit. They check slash discovery/filtering,
  ArrowUp/ArrowDown, Enter/Tab/click, editable argument preservation, Escape,
  caret movement, ordinary slash text, deliberately requested send, synthetic
  composition events/keycode 229, help disclosure and stale suggestion safety.
  Submission is observed at the real HTML form's submit event after
  `requestSubmit()`, not through a substitute submit implementation.
  Expected draft strings and submission counts come from the ticket, not
  source/CSS string checks or a parallel command implementation.
- Existing frontend regressions continue to cover original-session dictation,
  save failure, refresh/date/session switching, queue/stop controls and work
  history including failure followed by recovery.

## TDD observations

The first DOM test failed because slash did not display a suggestion. The next
slice failed because moving the caret beyond the command retained an open menu.
Subsequent slices exposed stale suggestions modifying a disabled composer and
replacing a selected draft. The production guards were added only after these
behavioral failures; the final full frontend suite is green.

## Native persistence verification

The added `retro_draft_survives_restart_without_running_until_explicit_submission`
case uses the real CollaborationApplication/FileCollaborationStore in an
isolated synthetic profile. It saves the completed `/retro ` draft, reopens the
application and observes no messages or model requests, edits the draft, then
explicitly submits and reopens again to read the same request and target date.
Only the external runtime transport/context source use synthetic fixtures.

The first focused invocation passed on the shared target, but that invocation
is supporting evidence only: concurrent worktree builds can replace test
binaries. The isolated-target dependency build was intentionally terminated on
the parent orchestrator's instruction to reduce three concurrent rebuilds on
the 32 GB host. SIGTERM compiler messages from that stop are not source failures.
The parent retains the required serialized native verification after merge:

```sh
cargo test --manifest-path src-tauri/Cargo.toml --test collaboration_workflow retro_draft_survives_restart_without_running_until_explicit_submission -- --exact
```

This authoritative native check is pending at this handoff. The first focused
shared-target run passed one test with 28 filtered out; it is not upgraded into
final verification.

## Acceptance boundary

Code and automated frontend interaction coverage are complete. This evidence is not a
packaged App acceptance or a real operating-system Chinese IME acceptance.
WebKit events use real DOM behavior with synthetic input; they do not prove
physical keyboard/IME or microphone behavior in a packaged Tauri application.
The common packaged candidate and real IME checks remain pending under PDEX-11.
No user Vault, real Task/Daily Record, App installation, remote publication or
protected-main state was modified.
