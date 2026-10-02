# Spec #36 candidate acceptance

Status: implementation, technical verification and user acceptance complete; PR #40 merged

PR: https://github.com/absurdwall/personal-dashboard/pull/40
Baseline: `3cf574a4e2b1387f953bb38a6d693768fccd8082` (merged PR #35).

## Before repair

- #37: verified installed PR #35 binary SHA-256 `980b1a5150d828de8a456031d23915bed7d26bb6f618f5f611374dec7a9eeb1d`, copied to an isolated synthetic profile. At 1440×900 Sessions was visible; at 1040×800 it disappeared. Actual window captures and Accessibility evidence retained outside the repository.
- #38: actual WebKit loaded shipped compiled renderer, index and CSS. A 248.73px Today side card allocated 140.94px to the long label and 83.80px to the Chinese body, making the body 495px tall. The readable-width assertion failed before the CSS change.
- #39: actual isolated Mac screenshot at 1120×760 shows early, late and Locate now as three prominent controls together above the timeline. Compiled-handler regression will check endpoint placement and scroll anchoring.

## Integrated verification

- Product build: `d9a92ae835f38d2083638d5ee72f06a9231d1f82`; subsequent commits change native acceptance evidence only. Final frontend tree: `32b1d7b10f0c1dbce4ca518139b95f7128d28a8c`.
- `npm run build`, 192 frontend tests (0 failures, 0 skips), and macOS package build passed. Frontend tests include 100 actual WebKit text combinations and timeline geometry/handler checks at 1440, 1100 and 680px. Native driver compilation, shell syntax, and diff checks passed.
- Standards review: 0 actionable findings. Spec review: one P2 focused-separator issue found and fixed; re-review has 0 unresolved findings. Native candidate confirms focused context separator moves focus to Current work on three→two transition.
- Packaged collaboration: 1440×900 → 1040×800 → 640×720 → 1440×900 passed, along with context disclosure below chat, explicit collapse/reopen, Chinese/English UI, retained automatic-plan session/draft, and restart. At 1040×800 Sessions measured 217px and conversation 545px.
- Packaged Today: 1120×760, 960×720, 800×640 and 640×520 passed full long-label/body geometry plus source-panel/composer disjointness. AX body ink widths were 179, 168, 168 and 350px, respectively, using each actual card's available width. Complete long content was visible; original synthetic Daily Record SHA-256 remained `00ed834630065aa8079c4ef3e457936a8fd553bd0e0d2275bea16dac94eb2860`.
- Packaged timeline: endpoint positions, 37×37 Locate-now target, independent early/late expand/collapse with stable visible reading anchors, folded overlap reveal, cross-midnight source labels, completed Task edit across an advancing 04:00, persisted identity/date/state and restart passed. Native physical sleep/wake and shared-desktop global input checks remain outside this result.

## Runnable candidate

Kept outside the repository under `~/.codex/artifacts/personal-dashboard-spec36-candidate/`. Launch with `Launch Spec36 Candidate.command`; it uses Launch Services with explicit isolated profile, synthetic Vault and fixed 2026-10-01 10:00 clock. Candidate bundle identifier: `com.tortillaflat.personal-dashboard.spec36candidate`; version label remains 4.0.4. Candidate binary SHA-256: `677165e656f4c8d62403fcd22a0f92164f4db81ad449bbce49cee2677d0b4bb6`. Code signature verification passed. Candidate was opened and its three/two columns, retained draft and separator-focus repair inspected. It remains available for user operation.

Screenshots, native logs, code-review reports and an explicit receipt are kept in the candidate's `evidence/` directory and `/tmp/spec36-evidence/`. The receipt records product commit/tree, binary identity, synthetic record hash before/after agent UI checks, and pending user decisions.

## Regression interpretation

The first native attempts exposed acceptance-driver assumptions, not additional product changes: a reused generic acceptance identity carried prior panel preferences; the fixture's fullwidth semicolon was already normalized by the existing arrangement renderer; AX measures text ink and needs comparison with actual card space, not a fixed minimum on every window. Native scenarios now use distinct identities and measured card space. The unchanged 100-case WebKit box-width matrix remains the stronger geometry check.

An offscreen late AX activation includes a focus/scroll action. Native late checks now bring that endpoint into view and use an unclipped 22:00 reading card; the WebKit midpoint regression still covers the pure toggle calculation. The final full native scenario passed, and these adjustments did not change timeline product behavior.

## User decision

- User review of runnable candidate: pending.
- User acceptance of #37, #38 and #39: pending; each issue remains open.
- Explicit merge authorization: pending.
- Daily installation replacement authorization: pending.

The PR remains draft until candidate acceptance. No installed daily app or real personal Vault is replaced or changed by this candidate workflow.

## Previous acceptance

GitHub #28–#34 and #19 remain open at the start of this run. Speech recognition, native collaboration proposal/approval/persisted-write, and physical sleep/wake acceptance are separate from these three UI repairs. This candidate does not close those requirements.

## User acceptance and merge — 2026-10-02

The user separately authorized replacing the daily `/Applications/Personal Dashboard.app`, then inspected it with their existing Vault and confirmed: “可以，这帮我很满意，我们可以去 merge 了。” This accepts the three UI repairs and explicitly authorizes PR #40 merge. The reviewed head `4b71bb21585a54d818d6ceccd8427ec800478052` merged as `7fcc272c0c1f03ed280e0230336ac46328e34a96`; #36–#39 are closed. Installed version remains 4.0.4, with normal bundle identity and binary SHA-256 `c928465e5ed4a17b125374e5555dd4f79d8e70f616fcd08a42e52d6d34f07505`. Its executable sections match the isolated candidate; signing metadata differs. Launch verification retained the selected Vault and all 27 Daily Record hashes. Historical pending decisions above describe the earlier candidate checkpoint and are superseded for these three repairs by this acceptance. Other old acceptance items remain separate.
