# Personal Dashboard

Personal Dashboard 2.0 is a private, offline, local-first Daily Record reader
with Today, Calendar, and Habits destinations.

## Build and install the Mac application

The active application uses Tauri 2, Rust, plain TypeScript, semantic HTML, and
CSS. Install the JavaScript and Rust build prerequisites, then run:

```sh
npm install
. "$HOME/.cargo/env"
npm run check
npm run build:mac
```

The release application bundle is produced at:

```text
src-tauri/target/release/bundle/macos/Personal Dashboard.app
```

It can be copied into Applications or opened directly through macOS Launch
Services:

```sh
open "src-tauri/target/release/bundle/macos/Personal Dashboard.app"
```

Verify the complete Tauri-only release boundary rather than a development
process:

```sh
npm run accept:cutover
```

The acceptance check verifies that the active source and README expose only the
Tauri product, confirms the recoverable baseline tag, relocates a bundle copy,
launches it through macOS Launch Services, verifies the arm64 application
identity, and confirms that the app uses neither Python nor a listening TCP
socket. The private release targets the current Apple Silicon Mac and macOS
environment. It is ad-hoc signed but is not Developer ID signed or notarized.

## 2.0 workspace

The packaged app opens on Today and exposes exactly three primary destinations:
Today, Calendar, and Habits. Today and Calendar read the selected Tortilla Flat
vault's Daily Records; Habits reads the validated, on-demand projection at
`<selected-vault>/.personal-dashboard/derived/habits-v1.json`. The app does not
call Dida365 or run a producer itself.

The retired This Week, History, Settings/Profile, and exercise-reminder
surfaces are not registered by the 2.0 application runtime. Historical modules
remain in source only to validate and enumerate old state during the bounded
cutover and to preserve prior regression evidence.

## Today Daily Record recovery

Today reads and performs bounded updates directly against the selected Tortilla
Flat vault's canonical Daily Record. It prepares the recovery directory before
activation. Immediately after the atomic exchange, while the exact inode
displaced from the canonical path is still linked at the temporary path, the
app creates and syncs a same-volume hard-link recovery entry under:

```text
<selected-vault>/.personal-dashboard-recovery/today/
```

The recovery entry is recovery material, not a second life record: Today never
reads it as application state or presents it as canonical content. Keeping that
exact displaced inode linked means an editor that retained its file descriptor
cannot later write into an unlinked, unrecoverable file. Byte equality is not
used as a substitute for file identity. The temporary link is removed only
after the durable recovery link exists. If recovery-directory preparation
fails, no activation is attempted. If linking the displaced inode fails after
activation, the app returns an error and attempts an atomic rollback; it never
unlinks the displaced inode. A successful rollback restores that inode at the
canonical path and leaves the rejected candidate at its temporary path. If
rollback also fails, the displaced inode remains linked at the reported
temporary path for manual recovery.

Snapshots have no automatic expiry. They remain until the user explicitly
deletes them, which avoids inventing an unsafe time after which a retained
external descriptor must have closed. Close Dashboard and external editors and
inspect any needed recovery content before manually removing old snapshots.
The vault `.gitignore` excludes this runtime-only directory from version
control.

This is preservation, not cross-application locking or merging. An external
editor can still supersede the canonical path, and Today may report a conflict
that requires manual reconciliation. Recovery links also reflect later writes
made through a retained descriptor; that is intentional. The guarantee relies
on macOS same-volume atomic exchange and hard links, and does not claim tested
power-loss durability within the exchange/link interval.

The compatible 2.0 representation for an independently retained morning
baseline, the still-current arrangement, explicit writer transitions, and old
record behavior is documented in
[`docs/daily-record-baseline.md`](docs/daily-record-baseline.md). Reader support
does not by itself activate or prove the future production writer.

## Retiring the old Exercise runtime

Normal 2.0 startup never reads, creates, imports, or schedules from the retired
Profile/Exercise state. A separately gated cutover path is available only when
`PERSONAL_DASHBOARD_2_CUTOVER_CANDIDATE` names the exact reviewed candidate.
It validates the old state, stops only the exact historical Python launchd job,
cancels and verifies the complete derived notification set, deletes only the
approved app-owned objects, and writes an atomic completion marker. Unknown
files stop the operation without mutation. Set
`PERSONAL_DASHBOARD_DATA_DIR` and
`PERSONAL_DASHBOARD_LEGACY_EXERCISE_DIR` for an isolated rehearsal.

The complete owned-state inventory, authorization boundary, ordered procedure,
and failure semantics are documented in
[`docs/acceptance/personal-dashboard-2-cutover-plan.md`](docs/acceptance/personal-dashboard-2-cutover-plan.md).
The deterministic application seam is:

```sh
cargo test --manifest-path src-tauri/Cargo.toml --test cutover_workflow
```

A live cutover additionally requires explicit approval for the exact installed
bundle and for any live daily-loop skill, Dida365, or automation change. Building
or running the isolated seam does not grant that approval.

## Cutover evidence and limitations

The completed 20-scenario baseline inventory is mapped to the active Tauri
application suites, and the Mac and physical-device gate evidence is collected
in [`docs/acceptance/tauri-cutover.md`](docs/acceptance/tauri-cutover.md).
The iPad and Samsung results prove shared-foundation compilation, installation,
launch, and offline rendering only. Full standalone mobile behavior,
notifications, profile transfer, and production layouts remain future work.

## Recoverable completed baseline

Personal Dashboard 2.0 is the sole active product implementation in this
checkout. Normal use runs through the packaged Tauri application; the current
checkout contains no Python dashboard, localhost server, or separate reminder
runner. Old Exercise/Profile behavior remains covered as historical validation
code, but is not registered by normal 2.0 startup.

The completed pre-Tauri application remains immutable and recoverable through
the annotated Git tag `python-exercise-tracker-complete`. Its behavior, data
contract, synthetic migration fixture, and detached-worktree recovery procedure
are recorded in
[`docs/migration/completed-python-baseline.md`](docs/migration/completed-python-baseline.md).
