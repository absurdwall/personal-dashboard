# Issue #28: lived days and daily-use improvements

Implementation: [PR #35](https://github.com/absurdwall/personal-dashboard/pull/35), covering tickets #29–#34.

Status: code implemented and reviewed; packaged macOS, real speech, and live-model acceptance remain outstanding. No daily installation or personal Vault was changed.

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
