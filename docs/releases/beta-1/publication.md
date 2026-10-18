# Inert Beta 1 publication runbook

This document is a reviewable procedure, **not authorization or an executable
automation**. No Pages workflow/configuration or public Release is activated by
checking in this file. The user's explicit boundary is to review concrete package,
website/manual and real acceptance results before confirming public release.

## Prepare the review checkpoint

1. Finish the bounded source repairs and independent integration review. Resolve
   review findings in the integration PR, retain unrelated user records, and
   commit a clean source tree before building.
2. Use `release.json` for display/numeric/build/tag/architecture/assets. The final
   preparation declares build 5.0.2. Generate a new candidate from that exact
   committed source with the existing build wrapper and shared external cache;
   keep the initial 5.0.1 bytes and receipt historical.
3. Retain the exact App, DMG, SHA256SUMS, signed resource manifest, actual package
   validation JSON and complete App inventory. Add their source and hashes to
   [acceptance.md](acceptance.md)/[acceptance.json](acceptance.json), preserving
   every unexecuted check and accepted deferral.
4. Execute root-owned native local first use, conflict, normal Quit/relaunch,
   isolated 4.0.7 upgrade and backup/recovery. Check each business source
   independently. Refresh affected real synthetic screenshots and their actual
   source/build/byte hashes; do not relabel the old captures.
5. Regenerate the bilingual site and check actual local files/links, desktop and
   narrow layouts, both languages, identity and disabled download control.
   Audit the requirements, independent Codex installation, local-first behavior,
   online-AI privacy, local-signature/no-notarization and unperformed tests.
6. Present the integration PR, exact candidate files, local website/manual preview,
   actual acceptance and remaining gaps. Wait for the user's confirmation of
   **these specific bytes and public contents**. The specification/final ticket
   stay open. An accepted test deferral is not publication permission.

## Only after explicit authorization

1. Re-read current issues/comments/dependencies and confirm the approval still
   names the same source, build, bytes and public content. Recompute hashes; do
   not silently rebuild or substitute a newer candidate.
2. Prepare any required Pages workflow/configuration and download activation in
   the protected-main integration PR. Never write main directly. Prefer an
   explicit manual dispatch and a main-only, buildless upload of the approved
   static `docs/` directory. Limit permissions to the actual Pages requirement;
   no new host/service/dependency is introduced. No active workflow is included
   before this boundary.
3. Merge through the PR with retained source reachability. Confirm the App's
   embedded source commit is reachable from updated `origin/main`; a squash or
   rebase that changes the claimed source needs honest reconciliation. Keep the
   same App identity and bytes.
4. Create the explicit `v1.0.0-beta.1` tag and a GitHub **prerelease** against the
   approved source. Upload the exact approved
   `Personal-Dashboard_1.0.0-beta.1_arm64.dmg`, SHA256SUMS and bilingual release
   notes. State numeric/build, architecture, tested system, signature and
   limitations. Use versioned asset URLs; never a `releases/latest` shortcut.
5. Read back tag/Release/asset identities, then verify the actual public bytes
   anonymously. Activate only the approved website's real versioned download
   entry; enable same-repository Pages under the PR's approved configuration.
   Do not change repository visibility or send invitations.
6. Use an anonymous browser to download the real public asset, verify SHA-256 and
   Internet quarantine, mount/copy/eject/open the actual App and record the
   per-App Gatekeeper outcome. Static signature checks do not replace this.
   Do not disable global Gatekeeper. If the real chain fails, correct or disable
   the download entry and keep unresolved work visible.
7. Verify anonymous site/manual/asset links and language/identity consistency.
   Refresh Management through the installed bound helper. Only actual approved
   publication plus verification permits final issue closure, retaining the
   accepted deferrals and remaining limits in the public record.
8. Preserve candidates, source receipts, synthetic backups and required recovery
   evidence. Unregister exact temporary App paths; remove only owned rebuildable
   outputs after all final checks. Keep the formal installation and personal
   Vault/profile unchanged unless separately authorized.

## Final values to bind before publication

The current [acceptance record](acceptance.json) intentionally has null final
source/hash/URL fields. Fill them from the actual candidate and actual published
readback; do not prewrite success or invent URLs. Record the exact asset IDs,
source reachability, Pages/Release URLs, anonymous checksum and Gatekeeper result
in the completed publication receipt.

Primary mechanism references, to recheck at the action boundary:
[GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages),
[GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository),
[Apple per-App opening](https://support.apple.com/en-us/102445).
These sources describe mechanisms and confer no authorization.
