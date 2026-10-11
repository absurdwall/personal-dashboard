# Normal local installation — 2026-10-11

The human authorized replacing the daily installation in the review chat. `/Applications/Personal Dashboard.app` now contains the reviewed experience implementation, built fresh from `6af11982193760f7f16091356884228c4ef3a448` under normal checked-in production configuration. This supersedes earlier “installed App unchanged / no installation” checkpoints for current local release status; those statements remain true for their historical checkpoints. Installation does not close PDEX-09/PDEX-11 or the parent.

## Frozen production provenance

- Source remains product-identical to reviewed/frozen B `ffa1b85056fe3f2bc3ab68ce652001b3b6f9537e`; full requested `8960c80` ancestry and unsquashed repairs remain retained.
- Build: `npm run build:mac`, isolated source Git archive/private APFS-cloned Cargo target under `/tmp/pdex-local-install-20261011.noindex`, existing dependencies reused. Exit 0; strict deep codesign verification passed. No external Tauri config or frontend route override.
- Identifier `com.tortillaflat.personal-dashboard`, title `Personal Dashboard`, version `4.0.7`, arm64. Version metadata is unchanged; installed identity is distinguished by source and hashes.
- Installed executable SHA-256 `a6a277f68b25002f88c4958ed56a93c19b7497dc36eb49fa571a2f7b85b3d833`; complete bundle file-tree SHA-256 `929a2edec63da571c7ff1f1d4fb3b9cd2f6094bd54d35586da6decedadd51d51`. Stage, final installation and candidate files matched exactly. [Exact provenance and sanitized verification](local-install-2026-10-11.json).

## Replacement and normal launch

Old installed executable was `33941698a758314fc9c24d8095e02c65e10a77d1d2825503ab0fcb953ae0da55`. Root first copied and verified a recoverable old bundle, then staged/verified the new production bundle. Bound-app CUA showed no unsaved current input, dictation or active work; persisted state had no queued/in-progress requests. Normal Cmd+Q was used. The first post-quit observation automatically relaunched the old app (old PID 1629 ended, new old-build PID 57607); it is retained as an unsuccessful lifecycle observation. Root quit again through CUA and used read-only process checks, avoiding further auto-launch observations before swapping.

Once stopped, root made and verified a complete app-data backup in the mode-0700 private directory. The original bundle was moved recoverably into `.noindex` only after backup and staged hashes passed. The replacement was copied to the exact Applications path and verified before CUA normal launch. No QA data/clock/baseline/runtime override was supplied. Normal installed PID 57687 has zero PERSONAL_DASHBOARD override environment keys and no synthetic runtime path. Existing real ChatGPT connection became visible; no model turn, microphone capture, test message, Task edit or Daily Record edit was requested.

The actual normal Today view displayed retained selected-Vault data, English `Around 13:00`, new overlap reveal control and approximate placement; Collaboration loaded the existing reply/history with an empty current composer and Send disabled. Normal local clock/lived-day behavior applies, rather than candidate B's September fixed clock.

All 48 inspected canonical life Markdown/JSON files remained byte-identical. Selected Vault, language/appearance preference bytes and authentication file hashes remain unchanged. All 41 stored sessions, 105 messages, drafts-by-date, settings, runtime thread bindings and automation entries remain semantically exact. The Collaboration store changed only JSON serialization bytes: complete decoded old/new documents are equal. Eleven normal runtime/profile files changed during startup; this is not a claim of full profile-byte identity. Real content, account identifiers and raw screenshots/AX are retained privately outside Git.

Temporary build/stage/backup paths are outside Spotlight indexing. Their unregister requests returned the known `.noindex` Spotlight scan diagnostic -10814; the subsequent exact Launch Services dump contains no temporary installation paths. Production registration succeeded, and Spotlight's identifier query returns only `/Applications/Personal Dashboard.app`. No existing personal data, unrelated branches, main or remote was changed.

## Recovery and remaining acceptance

The verified old bundle and stopped profile were also preserved in durable, mode-0700 `.noindex` storage outside `/tmp`: `/Users/tingranwang/Library/Application Support/Personal Dashboard Backups.noindex/dashboard-experience-20261011`. Recoverable App: `bundles/Personal Dashboard.app`; moved-original copy: `bundles/retired-original.app`; complete private profile: `profile/`. All copied bundle/profile file hashes match the verified pre-swap backups; signature still verifies. This archive contains private account data and must not be committed/shared. Temporary copies remain historical raw evidence. Keep the durable archive until human acceptance.

Rollback if needed: gracefully quit the installed process through CUA, verify it has stopped, preserve the replacement bundle separately under `.noindex`, copy the verified old backup to the exact Applications path, verify old executable/bundle hashes/signature, register that path and launch normally. App rollback does not require replacing the profile. Do not restore an old profile over newer user drafts or personal work; reconcile any real data issue separately against the preserved backup. The swap helper had a guarded immediate restoration path if copying/signature/hash checks failed; it was not needed.

[Current manual acceptance guide](../manual-acceptance.md) explains the exact blocked gates and how human/environment evidence closes them. Native IME, held edge/active resize and final installed narrow-window remain unverified. The quota-exhaustion subgate is accepted by explicit human waiver below, without an observed exhaustion test. Earlier Q4/candidate checks remain supporting evidence with their exact source qualifications. Installation is confirmed; full user/native acceptance remains partial.


## Human quota acceptance decision — 2026-10-11

The human explicitly accepted the quota-exhaustion criterion and waived further actual exhaustion testing in review chat `01a128ff-8865-7493-9698-cc48c19d7939` (direct user reply `01a12969-8b59-76a3-a544-d67411f4656f`). The quota subgate is **accepted by human waiver on existing evidence**, not an observed exhaustion result. No controlled injection, new model request or artificial quota spending is required or performed. Historical statements that actual exhaustion was not established remain true observations; their pending-test/blocker status is superseded by this explicit decision.

PDEX-11's conflict/write-failure/unconfirmed-result combined criterion is now checked: existing qualified source/persistence/production native evidence supports those constituents, and the quota constituent is explicitly accepted by the human. Remaining required gates are real Sogou composition, sustained native edge/active resize cancellation and fresh final-installed 830×758 narrow-window behavior. PDEX-09/PDEX-11 remain blocked, parent open, and nine other tickets resolved. [Current manual checks](../manual-acceptance.md) no longer asks for quota exhaustion. Installation remains confirmed and does not by itself close the remaining gates.


## Human IME acceptance and PDEX-09 resolution — 2026-10-11

The direct human message `01a1296a-888d-7193-9c10-77ca83962f5f` in review chat explicitly accepts the real Chinese IME criterion on existing evidence and waives dedicated native composition testing; normal daily Chinese use will supply future issue feedback. This is **human acceptance/test waiver**, not an observed OS composition result. Existing keyboard/completion/ordinary-slash/draft checks and independent review are complete, so PDEX-09 is now locally resolved/closed with all acceptance criteria accounted for. The same shared IME subgate is accepted for PDEX-11. No additional test message, input-source change or model request is required.

Current tracker: ten resolved, one blocked (PDEX-11), parent open. PDEX-11's slash/draft/date/Evening combined criterion is checked using existing qualified behavior evidence plus the explicit IME waiver; its quota/conflict/failure criterion is already accepted as recorded above. Only sustained native edge dragging/active gesture cancellation and resize, plus fresh final-installed 830×758 narrow-window behavior remain required. [Current two manual check categories](../manual-acceptance.md) supersede earlier pending-IME/quota lists without erasing historical observations. Installation is confirmed; full native acceptance and parent closure remain pending these two categories.
