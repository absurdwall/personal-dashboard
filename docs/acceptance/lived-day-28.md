# Issue #28: lived days and daily-use improvements

Implementation: [PR #35](https://github.com/absurdwall/personal-dashboard/pull/35), covering tickets #29–#34.

Status: local acceptance repairs are ready for independent review; packaged acceptance is partial. Live collaboration writes, human speech and physical sleep/wake remain outstanding. PR #35 stays open and unchanged at `eb0b44f`; newer commits are local only. The daily installation was preserved, but early testing exposed shared collaboration-state contamination; see the isolation incident below.

## Delivered behavior

- Rust determines the lived date at local 04:00 independently of natural dates and real timestamps. Today, habits, new collaboration sessions, and automatic planning share this rule. Explicit current calendar dates remain writable before 04:00; future facts remain rejected.
- The timeline covers 04:00 through next-day 04:00, defaults to 06:00–24:00, expands either end, labels next-day times, and exposes the current time. Tasks keep their original identity and calendar schedule; existing records and external habit sources retain their ownership.
- Started notes, task drafts, evening reviews, queued collaboration, and voice transcripts keep their original targets. Legacy review/daytime IPC also carries and checks the visible date and Vault binding. Automatic scheduling compares times within the lived-day cycle and never retargets a queued plan after rollover.
- Historical habit entry directly reaches the correction controls. Collaboration auxiliary panels collapse and resize independently, adapt to narrow windows, and restore local preferences. Voice offers remembered Mandarin and US English choices with explicit capability checks, microphone controls, cancellation, and editable original-session drafts.

## Earlier Linux automated and browser evidence

Verified against implementation commit `ab31bc2` on Linux, using the prepared environment at `/workspace/.setup/env.sh` for the native library sysroot:

- `npm run check`: passed, including the frontend build and full Tauri Rust compilation.
- `npm run test:frontend`: 168 passed, 1 failed. The same baseline test, `daily-flow-integration.test.ts`, requires the external Tortilla Flat `life-daily-loop` skill absent from this environment. No fixture or assertion was replaced to make it pass.
- `cargo test --manifest-path src-tauri/Cargo.toml --no-fail-fast`: 296 passed, 75 failed. The original commit `7d16390` under the same environment produced 280 passed, 76 failed. Comparing failure names found no new failures. Many retained failures exercise macOS-only conditional persistence. One voice cleanup test failed only in the baseline run; the Rust voice implementation is unchanged.
- Added service checks passed for local 03:59/04:00, month/year/DST boundary date selection, explicit current-date facts before 04:00, original-target note/habit/review writes, source preservation, cross-date Task projection, collaboration operation dates and queued work, automatic midnight scheduling, and late reopening. Portable write checks use test doubles for the unsupported macOS atomic exchange; they do not verify that native operation.
- Chromium panel interaction checks passed at 1280, 680, and 400 pixels: pointer/keyboard resizing, independent collapse, restart preferences, localized names, focus and draft retention, and page overflow. Timeline checks at 960×720 and 640×520 covered next-day labels, opening at 01:00, folding, locating now, and overlap reveal.
- A final Chromium probe of the compiled evening editor confirmed that a draft spanning 03:59–04:00 retained its visible date and sent the original date, Vault binding, and revision to IPC. These browser probes use synthetic context and do not constitute packaged Mac acceptance.
- `git diff --check` and the existing macOS IPC script's shell syntax check passed. The historical-correction and timeline packaged scenarios were extended but not run on macOS.

## Code review

Standards review found no documented violations. Its optional duplication finding was resolved by preparing clipped timeline entries once for both visual layers; the follow-up found no actionable findings.

Spec review identified automatic-plan natural-date targeting and evening-draft rollover as material defects. Both were fixed and independently rechecked; the follow-up found no actionable regressions in those changes.

## Acceptance requirements

Run the existing packaged Mac IPC workflow in an isolated temporary Vault, including date rollover, restart/resume, historical correction, timeline, collaboration date interpretation, and panel interactions. Verify actual window behavior and saved facts. Linux results do not validate Mac persistence, Apple Speech compilation, or live model interpretation of ambiguous date language.

For Mandarin and US English, separately perform real human recording, stop, transcription, editing, and manual send. Check recognition quality, missing models, permissions, cancellation, empty results, errors, restart preferences, and original-session/date protection across navigation and 04:00. See [voice evidence and checklist](lived-day-voice-34.md). Issue #19 remains open; no speech-quality acceptance is claimed.

The earlier cloud workspace lacked the user-local Management helper. The local Mac follow-up uses the installed helper and bound workspace; source coverage remains partial because an existing collaboration Markdown source is malformed.

## Earlier published Mac repair checkpoint (2026-10-02)

The live PR was rechecked at head `78a850b716a6baac4264f18c4aabb09b0114156a`, base/merge-base `7d163902b221d96c48b01ea8eec587d169cfd2f6`. Repairs use the isolated checkout `/Users/tingranwang/.codex/worktrees/lived-day-review-repairs/personal-dashboard`; unrelated canonical checkout changes were preserved.

- Folded overlap grouping now uses the clipped entries and visible bounds used by rendering. Label clamping occurs in the shared marker layout. Source time labels and anchors retain their meaning.
- Existing Today Task editors and their edited drafts now participate in the rollover target guard. Automatic focus/resume refresh avoids replacing an active editor after the clock check. Explicit navigation remains available.
- The compiled renderer/clock-handler regression initially failed seven tests on the reviewed head. A separate focus/resume regression then failed on editor replacement before its repair. All 11 regressions now pass: folded start/end, clipped and short ranges, expansion, reveal/focus/detail actions, pending/completed Task editors and drafts, idle rollover, pending writes, explicit history, and stale Vault clock results. DOM and IPC boundaries are substituted; these checks are not packaged acceptance.
- Final frontend suite: **182 passed, zero failed**. Full Rust suite on macOS: **376 passed, zero failed**. `npm run check`, `npm run build:mac`, `git diff --check`, and acceptance shell syntax passed. Existing installed frontend tools were reused; no dependencies were added.
- The relocated packaged launch check passed with an isolated profile: arm64, no Python runtime, no listening TCP socket. Apple's Speech helper compiled on macOS 27.0.1 (`26A434`). Its real capability probe returned `en-US` and other English locales, but no installed Mandarin locale. No speech recording or recognition-quality claim is made.
- Packaged timeline interaction partially passed: 06:00/06:50 cards had a shared reveal control, cycling focused the second card, and both start-card times/hit targets fit when scrolled into view. Folded end cards also had a shared fanned stack/reveal control. Captures: `/tmp/dashboard-repair-captures-4/folded-start.png` and `folded-end.png`. The end-card fit check hit the driver's scrolling limit. Explicit cross-midnight dates became visible after expansion; the card-fit locator needed its full next-day label. The complete scenario has **not passed**.
- The older historical-corrections scenario initially timed out in Habits. Its frozen clock was 02:30 on September 8, which now belongs to September 7; the harness is corrected to 10:30 on September 8. It has **not been rerun** after that correction.
- A live, ephemeral, read-only GPT-6.1 Sol/High CLI probe at synthetic October 2 01:00 passed four date cases: contextual today and tomorrow both October 2, explicit October 3 retained, unresolved write ambiguity required clarification. Result: `/tmp/dashboard-live-date-dicnde7l/result.json`. This is a supplied-context semantic probe, not the Dashboard App Server proposal/approval/save path.
- Computer Use read the isolated packaged Today accessibility surface. Subsequent pointer-dependent work was stopped when the user requested uninterrupted use of their mouse. The advancing-clock packaged rollover/save/restart scenario, historical correction persistence, collaboration panel dragging/resizing, and packaged live-model writes remain unverified. Resume/sleep behavior has handler regression evidence, not a physical Mac sleep/wake acceptance run.

The existing IPC script now has a bounded `lived-day-repairs` scenario using disposable Vault/profile directories and an advancing real epoch with a synthetic local offset; it does not alter the Mac clock. Run it on an available desktop with `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=lived-day-repairs PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS=480 scripts/acceptance/macos-ipc-workflow.sh`. Its completion message must not be treated as evidence until the full scenario actually passes. Preserve the separate human speech checklist and keep #19 and tickets #28–#34 open while their acceptance remains pending.

Optional Standards disposition: retain the proposal identity/date parameter group in `collaboration.rs`. The review found no hard violation; replacing it across four authorization-sensitive branches would expand this focused frontend repair. Captured request date and resolved write date intentionally remain distinct. No Rust production code changed in that earlier published checkpoint. The local isolation repair below changes the shared application-data path resolver.


## Resumed Mac acceptance and local repairs (2026-10-02)

This checkpoint supersedes the earlier “not rerun” statements above. The existing Swift Accessibility driver now has opt-in `PERSONAL_DASHBOARD_ACCEPTANCE_POINTER_FREE=1`: candidate activation, mouse events and global keyboard input are disabled; AX actions and keys sent to the candidate PID remain available. It fails before any mouse fallback. Native global focus, focus-return and physical sleep/wake are not claimed in this mode. The Mac clock was not changed.

Two product failures were reproduced and repaired locally:

- `bca016363be38042757ca413bd7711d163bd2a1c`: collaboration now resolves its directory through the same `PERSONAL_DASHBOARD_DATA_DIR` override as other app data. Previously it ignored the temporary profile and shared the daily collaboration state/runtime. A red regression failed when the override still called the native directory resolver; both resolver regressions pass after the repair. Full macOS Rust suite: **378 passed, zero failed** (`/tmp/dashboard-isolation-rust-tests.log`).
- `cd1ff6fc48a1fdbff8b2b88432383903e4058f85`: saving a note preserves open Today Task editors and actual form values for the same date and Vault. The packaged pending-Task/note run had saved the note correctly but closed the Task editor and lost uncached field values. Three compiled-handler regressions reproduced the failure, then passed; the full frontend suite is **185 passed, zero failed** (`/tmp/dashboard-note-task-frontend-tests.log`). Unchanged open editors do not acquire a false dirty draft; other date/Vault bindings do not receive copied fields.

`npm run build:mac` passed for the final source candidate (`/tmp/dashboard-final-acceptance-build.log`). Its source bundle binary SHA-256 is `980b1a5150d828de8a456031d23915bed7d26bb6f618f5f611374dec7a9eeb1d`. Temporary voice diagnostics were removed before that build. The copied acceptance bundle has a distinct identifier and ad-hoc signature; its different binary hash is recorded in the scenario log.

| Packaged check | Result and exact evidence |
| --- | --- |
| Historical habits, completion → withdrawal → completion, reload and restart in Chinese/English | Passed at `bca0163`; `/tmp/dashboard-isolated-historical.log`, profile `/private/tmp/personal-dashboard-ipc.pointerfree.4u1vjs`. Three traces retain selected September 7 and actual September 8 10:30 timestamps. Past/current Daily Records and external habit snapshot remain byte-identical; no unintended Task document is created. The current plan is seeded to isolate corrections from automatic planning. |
| Completed Task edit across advancing 04:00, save and restart | Passed at `bca0163`; `/tmp/dashboard-isolated-lived-day-passed.log`, profile `/private/tmp/personal-dashboard-ipc.pointerfree.wtDYIU`. Editor value, Task ID, original calendar date and completed state persist; restart defaults to the new lived date and the prior completed Task is absent there. Daily Record hash is unchanged. Copied binary hash: `66306830168ab24a8304f70f3681bc2c9e466e184098a67623516d55f478dd72`. |
| Pending Task plus note across 04:00, note save then Task save and restart | Passed at source `cd1ff6f`; `/tmp/dashboard-final-pending-note.log`, profile `/private/tmp/personal-dashboard-ipc.pointerfree.go04XW`. After advancing 04:00 the note saves only to its original October 1 record and preserves the plan; then the Task editor remains usable and saves its edited name, ID, original date and pending state. Restart defaults to October 2 and shows it as overdue without inferring failure. Copied binary hash: `2096d5ddde5ff1e105a872ee75caedaef670f792b9d94e3640d5cd52a6c1470c`. |
| Timeline folding, overlap reveal, both-end expansion and full cross-midnight card | Passed in the two rollover scenarios for measured start-card time/hit-target bounds and full cross-midnight title/time bounds. Both folded stacks expose a shared reveal control. A final `cd1ff6f` native check measured both end-card times/hit targets inside the scroll viewport (`/tmp/dashboard-final-end-fit.log`) and AX-pressed the unique three-item end reveal button; the AX tree moved its reveal container to the cross-midnight entry. Global native focus remains unaccepted. Captures are under each profile's `captures/`. Reading does not change the source record. |
| Collaboration panels in the packaged app | Passed at `bca0163` with the `wtDYIU` profile: independent history/context collapse, 1440×850 and 800×640 window layouts, keyboard/AX adjustments (history 216→232; context 304→320), history Home/End limits 180/640, and restart preserving 640/expanded history plus collapsed context. October 2 01:00 retains the October 1 session target. Both wide and narrow captures were visually inspected: `/tmp/dashboard-resume-panels-wide.png` and `/tmp/dashboard-resume-panels-narrow.png`. No pointer dragging is claimed. |

The isolated collaboration profile correctly reports “ChatGPT is not connected.” Sign-in in that test profile is required for native App Server proposal → concrete target → approval → persisted-write checks. Daily credentials were not copied. The existing read-only CLI probe remains supporting evidence only; contextual today/tomorrow at 01:00, explicit dates, write ambiguity and queued requests crossing midnight/04:00 are still unaccepted through the native write path.

### Isolation incident and cleanup boundary

Before `bca0163`, the override defect allowed the early disposable tests to use the daily collaboration history file under `~/Library/Application Support/com.tortillaflat.personal-dashboard/collaboration/`. Read-only audit `/tmp/dashboard-shared-state-test-audit.json` found one test automatic-plan session and six test automation-run entries, identified by exact temporary-Vault keys. This corrects the earlier blanket “personal data untouched” statement: the installed app and personal Vault content were not replaced, but its shared collaboration history received test rows.

The exact session is `automatic-plan-session-18dac0ce8eb906c0-3`, Vault key `vault-f23efdce33c2845f`, target September 8. Run keys/date pairs are `vault-f23efdce33c2845f`, `vault-f990ecb2da95b832`, `vault-0f7b49c064aa907d` on September 8, and `vault-5fbcaf5aa6f1450e`, `vault-13edf44437877f33`, `vault-9835761504931b97` on October 1. These seven entries have not been deleted. The daily app remains running; overwriting its state could lose concurrent user changes. Cleanup requires explicit approval to stop that app, make a restricted local backup, reread the latest file, remove only those exact matches, verify every other value is unchanged, and restart it. No whole-file rollback is proposed.

### Remaining handoff

Keep #19 and #28–#34 open. Human participation is still needed for test-profile sign-in, US-English microphone/transcript/edit/manual-send acceptance, and physical sleep/wake. Mandarin is supported by the OS but its model is not installed; no model/resource installation was performed. Return the local diff to the originating **Review PR #35** chat for another independent parallel Standards/Spec review. Human consent in that chat is required before any push or PR change; no merge is requested.
