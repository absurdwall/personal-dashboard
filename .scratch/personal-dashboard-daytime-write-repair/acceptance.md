# Daytime write authorization repair — 2026-10-04

Status: locally implemented, packaged and installed as 4.0.5. GitHub publication and PR merge are pending because the account is suspended (HTTP 403). Main remains untouched; branch: `codex/fix-daytime-write-authority`, based on `a4594a1`.

## Observed failure and feedback loop

The running installation was 4.0.4 at `/Applications/Personal Dashboard.app`. Its saved native tool trace rejected the explicit instruction “把我上一条说的今天经过，记入 2026-10-04 Daily Record 的白天更新” before proposal or source mutation: `the quoted wording does not directly authorize this operation. No data was changed.` The actual trace also showed missing optional payload fields during earlier attempts and a whole-message uncertainty rejection. No personal narration or credentials are retained in this project record.

The pre-fix reproduction used the real dynamic-tool handler and selected-Vault writer with a controlled resolver and synthetic data:

```sh
cargo test --manifest-path src-tauri/Cargo.toml --test collaboration_task_operations explicit_daytime_save_with_prior_content_reaches_the_real_vault_writer -- --nocapture
```

It failed with the same authorization rejection (1 failed, 0 passed). The completed loop passes and reads the actual Markdown file, preserves baseline/current arrangement/user sections, and checks that retries do not duplicate the event.

## Cause and change

The guard recognized a limited set of contiguous action phrases and otherwise required the exact event text inside the authorization quote. An explicit instruction referencing earlier narration therefore failed. Whole-quote uncertainty checks also confused tentative activities inside the record with uncertainty about saving it.

Daytime-event instructions now identify the save action separately from record content. The current quote must still belong to the active request; denial, deferred writes and review-first requests remain guarded. Task, Habit, memory and external write authority are not expanded.

An unresolved direct daytime save request retains its exact bounded draft without a source write. A complete short confirmation can execute only the single immediately preceding draft with identical payload, date and Vault. It uses the original revision and operation identity; it cannot select older, ambiguous, changed, rejected or automatic drafts. The existing receipt path attributes the result to the confirmation round and avoids duplicate source writes. The tool guidance describes conversational confirmation and concrete drafts instead of authorization formulas.

The new negative case `授权，先给我看方案` exposed an existing UTF-8 panic in review-first clause parsing. The punctuation boundary now advances by the character width, not one byte.

## Verification

- 9 authorization unit tests passed, including mixed actual/planned narration, explicit save, future save, denial and review-first wording.
- 125 real application workflow tests passed: 95 collaboration operation tests, 18 collaboration tests, 4 evening-review tests and 8 Daily Plan tests. New cases cover current instruction, short confirmation, exact payload, duplicate delivery, stale revision, no draft, multiple drafts, intervening requests, changed captured target and reopened history.
- 329 frontend tests passed. The version-consistency test was updated to 4.0.5 and passed separately after the version bump.
- `npm run build:mac` and packaged Launch Services acceptance passed for the final 4.0.5 bundle; strict deep signature verification passed.
- A signed isolated candidate exercised the real installed Codex runtime through the Mac UI, with a synthetic selected Vault. A first request to prepare prose without saving left the record byte-identical. The previously rejected explicit instruction then saved a `daytimeEvent` under `## 白天更新`. Its tentative evening plan remained tentative.
- A following review-first request prepared a concrete second daytime proposal without modifying the record. The next user message was just `授权`. It saved the original exact proposal, with two total applied operations and one occurrence of each event. No Task was created or completed. The real UI displayed source-saved receipts for both requests; Markdown readback confirmed the effects.
- The isolated live candidate used the same source implementation before the package-only version bump. Final 4.0.5 was separately built, signed, launch-tested, installed and opened with the original profile. The original Vault and conversation were visible; no historical request was automatically replayed.

## Installation and retained state

Installed bundle: `/Applications/Personal Dashboard.app`, version 4.0.5.

Installed binary SHA-256: `301de4d58d9af35b9d33689e4371c48ac002ae9c7d9770c853cb42e87aa63ca1`.

Previous bundle backup: `/Users/tingranwang/.codex/backups/personal-dashboard/20261004-daytime-write-repair.noindex/Personal Dashboard-before-4.0.5.app`.

The installed binary matches the built final bundle exactly. All 42 inventoried production life Markdown and managed JSON files remained byte-identical. The original profile and conversation were retained. All business-write acceptance effects used the isolated Vault; the user's previously failed record was not silently replayed. Temporary copied test authentication was removed after closing the candidate. Candidate and previously registered backup bundles were unregistered from Launch Services; unregistered/unscannable build/backup paths were already outside that registry.

Evidence and isolated synthetic profile are outside the repository at `~/.codex/artifacts/personal-dashboard-daytime-write-20261004.noindex/`. No personal data or credentials are committed.

Management connection and identity were confirmed using the installed helper. Reconciliation identified the suspended GitHub source as unavailable and the existing malformed historical collaboration source. No issue completion or summary verification was claimed from unavailable remote evidence.
