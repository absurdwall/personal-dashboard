# Beta 1 first-use local check (#117)

Canonical scope: [#117](https://github.com/absurdwall/personal-dashboard/issues/117),
part of [#116](https://github.com/absurdwall/personal-dashboard/issues/116).
This record describes developer-machine checks of first-use fixes. It is not
final-DMG installation acceptance or a public-release approval.

## Scope and agreed seams

The approved seams in #116 Testing Decisions and #117 are the existing public
business/application commands, frontend flows, and packaged acceptance tools.
Business checks observe saved results through those commands and independent
reopening of synthetic sources. Frontend checks cover user-visible controls,
drafts and navigation. Packaged acceptance checks the real candidate process.
A protocol declaration or fixture runtime does not prove real model execution,
a fresh user's login, microphone recognition quality, or a downloaded DMG.

All test data is synthetic and isolated. No installed App, personal Vault,
maintainer login or optional Dida account is used for acceptance. Shared build
cache started empty (0 bytes) under an unindexed temporary directory; final
size and candidate binding are recorded in the final acceptance handoff.

## First use

- In Settings → Data and Vault, choose **Create personal space…**, select its
  parent location and name the new folder. Today also exposes this action
  before a space is connected. Cancelling preserves the previous selection.
- The App creates only the compatibility directories `.obsidian` and
  `life/Journal/Daily`. Obsidian is not an application dependency. There are no
  sample Tasks, Habits, Daily Records, personal background, skills or credentials.
- Existing compatible Vaults use the separate selection action. A destination
  that already exists is not converted or overwritten by the creation action.
- Browse dates freely; only an explicit business save creates a record. Local
  Tasks, Habits and Daily Records remain independent of Codex, ChatGPT and Dida.
- Optional long-term background and a separately installed daily workflow are
  not prerequisites for ordinary AI Task/Habit/record work. Their missing states
  remain visible and missing personal history remains unknown.

## Source and environment

- Baseline: `9e8132b96a6669259d34981fcb602c48774efaf8` (internal 4.0.7).
- Empty-space/automation implementation: `c6e180c`; runtime implementation:
  `69dc5e5`; combined code: `1f93490fe52770d2d2595b73a4ed63667f94643b`.
- Host: Apple Silicon macOS 27.0.1 (26A434). Tests used temporary synthetic
  folders, application settings and transport fixtures. No personal profile
  or selected external account was borrowed.
- This ticket does not produce the final App/DMG. Its hash, release identity,
  installed process and real restart evidence belong to the #118/#120 candidate
  record. A reconstructed application in an integration test is not an App
  process restart or a clean macOS-user installation.

## Changes and checked behavior

New personal spaces initialize through the existing workspace-selection and
business persistence boundaries. Setup refuses an existing destination,
including an incompatible nonempty directory; users can separately select an
existing compatible Vault. Creation errors preserve the old selection and only
remove empty directories owned by the failed operation. New user content is
never recursively deleted. The native chooser asks for the location and new
folder name; the business tests supply its result at the approved exchange seam.

Automatic morning planning still defaults off. A new user can enable it without
claiming to have paused a nonexistent old schedule. A separate checkbox records
whether an external schedule exists; when it does, the handoff confirmation is
still required. Older persisted settings without the new field retain the old
handoff guard. Existing per-Vault/date deduplication and in-process shutdown
behavior are retained.

| Check | Result and limit |
| --- | --- |
| New empty space, independent read, no records on date browsing | Passed through public Today commands and filesystem readback |
| Cancelled chooser result | Passed at the existing exchange seam; previous selection retained |
| Existing incompatible content, missing parent, read-only parent | Passed using real synthetic directories; no conversion or overwritten content |
| Settings save failure | Passed; old selection retained and only empty owned structure removed |
| Tasks create/edit, identity and history, shared Today/Calendar projection, reopen | Passed through existing task/calendar command suites |
| New local Habit, completion/withdrawal, no prebuilt snapshot, reopen | Passed through existing Habit command suite |
| Explicit first minimal Daily Record; future/browsed dates stay unwritten | Passed through dated-note/Today suites |
| External edits, stale revisions and recovery inode/content preservation | Passed through existing real file-conflict tests; frontend draft/navigation tests passed |
| Fresh automatic schedule, legacy missing-field migration guard, repeated checks and persisted plan outcomes | Passed with synthetic runtime; real service execution remains separate |
| Optional missing background/routine | Task/Daily tools remain registered; embedded usage guidance now explicitly allows basic work without those sources |
| Missing/old/unusable Codex candidate | Passed at `AppServerTransport.inspect`, including nonexecutable, failed version/schema and rejected initialize candidates before a compatible standalone candidate |
| Real standalone Codex 0.160.0 install, schema and initialize | Passed locally without login; see [runtime evidence](codex-runtime.md) |
| Fixed first-use/recovery messages in Chinese and English | Passed; underlying OS diagnostics and paths remain unchanged |
| Real process quit/relaunch and Finder launch | Not executed in this local command-test record; final candidate check remains with #120 |
| Physical offline run and real network/quota/login-cancel failures | Not executed here; fixture failures are supporting evidence, not a service acceptance claim |
| Real microphone Chinese/English/mixed recognition | Not executed; automated voice/draft tests do not establish recognition quality |
| User-owned fresh ChatGPT login and real AI modification/readback | Not executed; no maintainer credential was reused |
| Final DMG download/install, Gatekeeper, upgrade, manual backup/restore | Not executed here; follow-on candidate gates in #120 |

Executed checks:

- `npm run build`: passed.
- Targeted frontend space, language, Vault selection, schedule, memory and
  connection suites: **51 passed, 0 failed**.
- Frontend draft, navigation, Today and presentation regressions after the final
  copy fix: **75 passed, 0 failed**.
- Public business suites `calendar_workflow`, `collaboration_task_operations`,
  `dated_notes_workflow`, `habit_definition_workflow`, `task_workflow` and
  `today_workflow`: **231 passed, 0 failed, 1 ignored**. The ignored test requires
  an explicitly authorized live Codex profile and makes real model calls.
- Merged Rust library: **110 passed, 0 failed, 6 ignored**. Ignored checks require
  an explicitly selected installed Codex runtime or real Dida account/owned
  mutation fixtures; none was silently counted as passed.
- Source diff whitespace check: passed. Private machine-local logs remain
  outside the repository. The shared reusable build cache was **3.4 GiB** at
  this handoff; later candidate builds share it rather than duplicate it.

The full frontend baseline on `9e8132b` also passed **537/537**, checked by the
integration owner. This is baseline evidence, not a substitute for the changed
seams or final package.

## User-accepted deferral and follow-on gates

On 2026-10-17 the user explicitly deferred the clean macOS-user test because no
clean account/test environment is available. This is an accepted test-scope
deviation for preparing the candidate, not a pass. The decision is recorded in
[#116 comment](https://github.com/absurdwall/personal-dashboard/issues/116#issuecomment-6242965225).
An alternate ChatGPT-account login remains an optional human check; no credential
was requested or reused. Live model, microphone quality, final-package and actual
published-asset results must keep their individual status in #120. The local
checks do not establish a public release or authorize closing #116/#120.
