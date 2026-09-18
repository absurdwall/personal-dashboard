# Personal Dashboard 4.0 packaged acceptance result

Date: 2026-09-18

Status: **the isolated Dashboard 4.0 review-follow-up rerun passed at the final implementation commit; the broader multi-scenario gate was not rerun, and the Drive fixture-dependent recheck remains pending human acceptance.**

## 2026-09-18 review-follow-up rerun

- Branch/worktree: `codex/dashboard-4-review-follow-up` in the isolated `e99a`
  worktree, built from review base `41289ff`.
- Commit: `e74e2d4` (`test: drive task updates through the async seam`).
- Bundle: `src-tauri/target/release/bundle/macos/Personal Dashboard.app`,
  built with the repository's existing Tauri CLI and the source checkout's
  existing TypeScript binary supplied on `PATH`; no dependency files were
  added to this worktree.
- Command:

  ```sh
  PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=dashboard-4 \
  PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS=420 \
  PERSONAL_DASHBOARD_ACCEPTANCE_CAPTURE_DIRECTORY="$PWD/output/playwright/personal-dashboard-4-review-follow-up-20260918-v7" \
  scripts/acceptance/macos-ipc-workflow.sh
  ```

- Result: **passed**. The synthetic run covered Tasks, Today, Calendar,
  Habits, list archive/restore, task lifecycle history, Inbox defaults, Vault
  switching, conflict draft recovery, bilingual labels, and the narrow
  640×520 surface. It verified persistence across relaunch and produced eight
  non-overwritten captures under
  `output/playwright/personal-dashboard-4-review-follow-up-20260918-v7/`.
- Boundary: this was an isolated synthetic-Vault run. It did not touch a
  personal Vault, Drive, Dida365, automation, or an installed app. It is
  affected-path packaged evidence for ticket 11, not Drive proof and not a
  claim that ticket 09 is resolved.
- Final capture manifest (SHA-256):

  | Capture | SHA-256 |
  | --- | --- |
  | `product-zh-tasks-wide.png` | `593facb7e81aec2d9c5114fb9f9bcf3058675425fc46dd3a036781d386e3a169` |
  | `product-zh-today-wide.png` | `16ccef95cd96b252e2ca5826b208d1a1a653ee4bb1853bdce8dd24780ddf0673` |
  | `product-zh-calendar-wide.png` | `65919fc3a766921ac825838e70ac8d2582529f0fa91154e62d4660b1aeb3c93f` |
  | `product-zh-habits-wide.png` | `01dca60c699ae2912ae5b20b948361c522bc74ea3275cde05b2efb96d8d2765f` |
  | `product-en-tasks-narrow.png` | `bffd03d59367867373bc469cd7dc8050d782ef0a1aac86f69ea3724182ebf942` |
  | `product-en-calendar-narrow.png` | `a2d17622e57a7f4c94fa6620799b19d5b6782e73bac0964418bc2d077b431928` |
  | `product-en-today-narrow.png` | `40af7255ea43696f0ecb0f9b17082264e653131d4f849d6397022baa630c6573` |
  | `product-en-habits-narrow.png` | `baef1446343ad7d5e920555562455cf3d3f0eb8e09a77d9db01f2147e811ec43` |
- Automated follow-up support at this commit: `npm run check` passed with the
  existing source-checkout tool binaries supplied on `PATH`; `npm run
  test:frontend` passed 100/100; `cargo test --manifest-path
  src-tauri/Cargo.toml` passed; the changed Rust files passed targeted
  rustfmt checks. The repository-wide rustfmt check still reports an
  unrelated pre-existing formatting difference in
  `src-tauri/tests/appearance_workflow.rs`.

## Previous 2026-09-17 candidate and boundary

- Branch: `codex/management-daily-integration`.
- Candidate source included the completed 01–08 implementation on base commit
  `5341d25` plus the ticket-09 acceptance changes.
- The Mac bundle was rebuilt with `caffeinate -is npm run build:mac`; the
  acceptance script copied and launched the resulting
  `src-tauri/target/release/bundle/macos/Personal Dashboard.app` in its own
  temporary profile and process group.
- Candidate implementation patch fingerprint (SHA-256 over the staged
  frontend, acceptance-script, Swift-driver, and packaged-test patch):
  `a7e8432202a43aa0cdb884f6b67c2328d1f9de4f56c54dc7d54e373bd8fd9b5f`
  (base `5341d25`). The rebuilt packaged executable fingerprint is
  `c1684d9299736042fd79a7c914294a5a55ae8715bc8f0018233731800dc9d02f`.
- That run used two temporary synthetic Vaults, a fixed 2026-09-08 clock, and
  no personal Vault, Dida365 write, automation change, or installed-app
  replacement.

## Packaged behavior evidence

The direct packaged command passed before the final review-follow-up assertions
were added:

```sh
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=dashboard-4 \
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS=420 \
PERSONAL_DASHBOARD_ACCEPTANCE_CAPTURE_DIRECTORY="$PWD/output/playwright/personal-dashboard-4-candidate-20260917-final" \
scripts/acceptance/macos-ipc-workflow.sh
```

The real packaged window verified:

- Inbox/no-date creation, future-task exclusion from Today, overdue pending
  visibility, late completion retaining its scheduled date, and an explicit
  completion date plus `18:30` correction.
- Abandon/restore and delete/restore while retaining task identity and
  recoverable history; a deleted tombstone remained after a second packaged
  relaunch and was then restored.
- List archive/restore with the shared task surviving two relaunch boundaries;
  archived work remained available through Calendar's historical `+2` panel
  while excluded from Today.
- Shared identity across Tasks, Today, and Calendar; Vault A/B switching;
  bilingual localized Habit names with source-name fallback after an invalid
  sidecar schema; and external task-file conflict recovery that retained the
  draft until explicit refresh and retry.
- Chinese wide and English 640×520 narrow surfaces. The Calendar overflow
  panel was opened through Accessibility focus plus Space, and the document
  remained free of visible page-level vertical scrolling.

## Visual evidence

The run produced exactly eight non-overwritten PNG captures in:

`output/playwright/personal-dashboard-4-candidate-20260917-final/`

They are the Chinese wide Tasks/Today/Calendar/Habits surfaces and the English
narrow Tasks/Calendar/Today/Habits surfaces. The visual spot-check retained the
production shell, existing green/neutral palette, hierarchy, compact Habits
layout, Calendar text previews and right-side panel, while long bilingual names
remained readable at the narrow size.

The mapping of that run is explicit: `product-zh-{tasks,today,calendar,habits}-wide.png`
were captured at 1120×760. The English Tasks artifact in that pre-review
directory is named `product-en-tasks-wide.png`, but its stored dimensions are
1280×1040 (the actual 640×520 capture); the follow-up script now names this
artifact `product-en-tasks-narrow.png`. The other English artifacts are
`product-en-{calendar,today,habits}-narrow.png`, also at 1280×1040. The captures
are local acceptance artifacts under `output/playwright`; the packaged command
above is the reproducible source of truth for regenerating them.

The retained visual evidence is recorded by file and stored pixel dimensions:

| Capture | Stored pixels | SHA-256 |
| --- | ---: | --- |
| `product-zh-tasks-wide.png` | 1920×1440 | `87d4a93c831f05a267ff7ba302de556e928ff0fbb82064478cbea327a70b30bc` |
| `product-zh-today-wide.png` | 1920×1440 | `0ae41719c90681e182c5ffd12bf8b5575578ce3111cf70a699339f68e16e92e5` |
| `product-zh-calendar-wide.png` | 1920×1440 | `a31617b54adaf7ad2fc951239ddfac0930b415f8a90827bdcca4b829adb3f1b6` |
| `product-zh-habits-wide.png` | 1920×1440 | `b3b3e463d9c78d71f9b5bcc30aa76df736c960a52dadba4e8c2faafa4cacb5fe` |
| `product-en-tasks-wide.png` | 1280×1040 | `c9ff1854dd81953d25de14e47e64dfd0a5c051cd8db2314b44f9b11dafdf1b75` |
| `product-en-calendar-narrow.png` | 1280×1040 | `7afa6339b2bf8db8fd379bb5bc7c2f3ec756f14bcbe8f402e25b842a0ad54f81` |
| `product-en-today-narrow.png` | 1280×1040 | `5dce1f5485e6e8a043d2855281cca301dd44b2bfdd96f8629682bf96f3421734` |
| `product-en-habits-narrow.png` | 1280×1040 | `22f55107b3a0997485faec6961517f1f117cbb769ba7477be325f4e8fcd58da0` |

## Historical 2026-09-17 automated support

- `node --test tests/frontend/packaged-acceptance.test.ts`: 7 passed.
- `npm run test:frontend`: 94 passed.
- `npm run check`: passed TypeScript build and `cargo check`.
- `cargo test --manifest-path src-tauri/Cargo.toml`: all Rust unit and workflow
  tests passed, including 27 task, 10 adapter, 2 shared Today-task, 5 Calendar,
  14 Habit snapshot, and 1 daily-flow integration tests.

## Drive boundary

The mounted `~/Library/CloudStorage` roots were inspected read-only. Two
existing `PD-Acceptance-08-*` children containing the exact
`.personal-dashboard-drive-acceptance` marker were found; they are the
historical 3.0 fixtures and were not selected or mutated. No fresh ticket-09
fixture was supplied, so this run did not select or mutate any personal Drive
folder. The existing
`docs/acceptance/personal-dashboard-3-drive-compatibility.md` remains the
bounded historical evidence for the materialized Drive client and cloud
version/trash behavior. It does not prove that the changed 4.0 task/config
writes uploaded. A fresh marker-owned Drive fixture and its provider/cloud
checks are therefore still required before resolving ticket 09.
