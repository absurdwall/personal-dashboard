# Issue #28: lived days and daily-use improvements

Implementation: [PR #35](https://github.com/absurdwall/personal-dashboard/pull/35), covering tickets #29–#34.

Status: review repairs implemented; macOS compilation and launch verified; packaged acceptance is partial and another independent review is pending. Real speech and the packaged live collaboration write path remain outstanding. No daily installation or personal Vault was changed.

## Delivered behavior

- Rust determines the lived date at local 04:00 independently of natural dates and real timestamps. Today, habits, new collaboration sessions, and automatic planning share this rule. Explicit current calendar dates remain writable before 04:00; future facts remain rejected.
- The timeline covers 04:00 through next-day 04:00, defaults to 06:00–24:00, expands either end, labels next-day times, and exposes the current time. Tasks keep their original identity and calendar schedule; existing records and external habit sources retain their ownership.
- Started notes, task drafts, evening reviews, queued collaboration, and voice transcripts keep their original targets. Legacy review/daytime IPC also carries and checks the visible date and Vault binding. Automatic scheduling compares times within the lived-day cycle and never retargets a queued plan after rollover.
- Historical habit entry directly reaches the correction controls. Collaboration auxiliary panels collapse and resize independently, adapt to narrow windows, and restore local preferences. Voice offers remembered Mandarin and US English choices with explicit capability checks, microphone controls, cancellation, and editable original-session drafts.

## Automated and browser evidence

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

## Outstanding acceptance

Run the existing packaged Mac IPC workflow in an isolated temporary Vault, including date rollover, restart/resume, historical correction, timeline, collaboration date interpretation, and panel interactions. Verify actual window behavior and saved facts. Linux results do not validate Mac persistence, Apple Speech compilation, or live model interpretation of ambiguous date language.

For Mandarin and US English, separately perform real human recording, stop, transcription, editing, and manual send. Check recognition quality, missing models, permissions, cancellation, empty results, errors, restart preferences, and original-session/date protection across navigation and 04:00. See [voice evidence and checklist](lived-day-voice-34.md). Issue #19 remains open; no speech-quality acceptance is claimed.

The repository-required user-local `tortilla-flat-management` skill and helper were not available in this cloud workspace. Shared management reconciliation requires that setup; no Registry or identity was inferred.

## Local Mac review repairs (2026-10-02)

The live PR was rechecked at head `78a850b716a6baac4264f18c4aabb09b0114156a`, base/merge-base `7d163902b221d96c48b01ea8eec587d169cfd2f6`. Repairs use the isolated checkout `/Users/tingranwang/.codex/worktrees/lived-day-review-repairs/personal-dashboard`; unrelated canonical checkout changes were preserved.

- Folded overlap grouping now uses the clipped entries and visible bounds used by rendering. Label clamping occurs in the shared marker layout. Source time labels and anchors retain their meaning.
- Existing Today Task editors and their edited drafts now participate in the rollover target guard. Automatic focus/resume refresh avoids replacing an active editor after the clock check. Explicit navigation remains available.
- The compiled renderer/clock-handler regression initially failed seven tests on the reviewed head. A separate focus/resume regression then failed on editor replacement before its repair. All 11 regressions now pass: folded start/end, clipped and short ranges, expansion, reveal/focus/detail actions, pending/completed Task editors and drafts, idle rollover, pending writes, explicit history, and stale Vault clock results. DOM and IPC boundaries are substituted; these checks are not packaged acceptance.
- Final frontend suite: **182 passed, zero failed**. Full Rust suite on macOS: **376 passed, zero failed**. `npm run check`, `npm run build:mac`, `git diff --check`, and acceptance shell syntax passed. Existing installed frontend tools were reused; no dependencies were added.
- The relocated packaged launch check passed with an isolated profile: arm64, no Python runtime, no listening TCP socket. Apple's Speech helper compiled on macOS 27.0.1 (`26A434`). Its real capability probe returned `en-US` and other English locales, but no supported Mandarin locale. No speech recording or recognition-quality claim is made.
- Packaged timeline interaction partially passed: 06:00/06:50 cards had a shared reveal control, cycling focused the second card, and both start-card times/hit targets fit when scrolled into view. Folded end cards also had a shared fanned stack/reveal control. Captures: `/tmp/dashboard-repair-captures-4/folded-start.png` and `folded-end.png`. The end-card fit check hit the driver's scrolling limit. Explicit cross-midnight dates became visible after expansion; the card-fit locator needed its full next-day label. The complete scenario has **not passed**.
- The older historical-corrections scenario initially timed out in Habits. Its frozen clock was 02:30 on September 8, which now belongs to September 7; the harness is corrected to 10:30 on September 8. It has **not been rerun** after that correction.
- A live, ephemeral, read-only GPT-6.1 Sol/High CLI probe at synthetic October 2 01:00 passed four date cases: contextual today and tomorrow both October 2, explicit October 3 retained, unresolved write ambiguity required clarification. Result: `/tmp/dashboard-live-date-dicnde7l/result.json`. This is a supplied-context semantic probe, not the Dashboard App Server proposal/approval/save path.
- Computer Use read the isolated packaged Today accessibility surface. Subsequent pointer-dependent work was stopped when the user requested uninterrupted use of their mouse. The advancing-clock packaged rollover/save/restart scenario, historical correction persistence, collaboration panel dragging/resizing, and packaged live-model writes remain unverified. Resume/sleep behavior has handler regression evidence, not a physical Mac sleep/wake acceptance run.

The existing IPC script now has a bounded `lived-day-repairs` scenario using disposable Vault/profile directories and an advancing real epoch with a synthetic local offset; it does not alter the Mac clock. Run it on an available desktop with `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=lived-day-repairs PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS=480 scripts/acceptance/macos-ipc-workflow.sh`. Its completion message must not be treated as evidence until the full scenario actually passes. Preserve the separate human speech checklist and keep #19 and tickets #28–#34 open while their acceptance remains pending.

Optional Standards disposition: retain the proposal identity/date parameter group in `collaboration.rs`. The review found no hard violation; replacing it across four authorization-sensitive branches would expand this focused frontend repair. Captured request date and resolved write date intentionally remain distinct. No Rust production code changed.
