# Local delivery and later remote handoff

2026-10-10. GitHub operations are deferred at the user's request. No push, PR or
main merge was performed in this iteration. Durable implementation, prototype,
tracker, review and closeout records are committed locally.

## Revision and branch identities

| Role | Local identity |
| --- | --- |
| Owning repository | `absurdwall/personal-dashboard` |
| Integration branch to push | `codex/collaboration-redesign-integration` |
| Original specification baseline | `codex/collaboration-redesign-spec`, `9939c23f4f14d0b87dc9949c0ce3850e24e994a2` |
| Most recent reviewed runtime/reader repair | `ac65cfafe2b20fa19e41b1223a521f27b875eca5` |
| Reviewed and installed typography product | `499cdc1e33763f4b8f70a466f9d9e71860f92a14` |
| Local main at this checkpoint | `a4594a151126465cc3d76038364dd696461778ec` (tracks `origin/main`; not fetched) |
| Final durable closeout commit | The commit adding this handoff and final closeout records; use `git rev-parse HEAD` / Git history after checkout, since an in-commit self-hash would be invalid. |

Later closeout changes are Markdown only; reviewed product trees are unchanged.
The standalone prototype's original SHA256 is
`66e7b27204fcec1980fd334f3cf1456148bb255151ec91710529d0e7cf61a622`.
Its reviewed demo-only content is committed in `6e92f98` without byte changes.

Only owned implementation worktrees/branches are cleaned up after reachability
checks. Existing spec/integration/main and unrelated prototype/daytime-repair
branches are retained. No broad branch cleanup is implied by delivery.

Final retained local branch inventory (before this record's own closeout commit):
`codex/collaboration-redesign-integration` at `9445e48`,
`codex/collaboration-redesign-spec` at `9939c23`, `main` at `a4594a1`,
`codex/collaboration-execution-prototype` at `ca05b5f`, and
`codex/fix-daytime-write-authority` at `d9a12a3`. Only integration advances for
this final Markdown receipt. The owned typography branch was removed after
`e8b925d` reachability; its managed worktree is recoverably archived. Canonical
tracked/untracked status is clean. `.githooks` remains configured.

## Commands after GitHub is available

Run from the canonical checkout. Verify local status and the expected commits
before publication; account access and remote main may have changed meanwhile.

```sh
cd /Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard
git switch codex/collaboration-redesign-integration
git status --short
git log -5 --oneline
git fetch origin
git log --left-right --oneline origin/main...HEAD
git push -u origin codex/collaboration-redesign-integration
gh pr create --repo absurdwall/personal-dashboard --draft --base main --head codex/collaboration-redesign-integration \
  --title "Improve Collaboration execution history and evidence" \
  --body-file .scratch/personal-dashboard-collaboration-redesign/pr-body.md
```

If remote main diverged or conflicts arise, assess the diff and follow normal
integration/review; do not force-push or merge main blindly. Original local
implementation need not be recreated. After remote checks/review, mark the PR
ready and merge through the protected-main PR workflow under the applicable
authorization. Pushing a branch is publication, not PR approval/main merge or
native/live acceptance. The prepared PR text already uses owning-repository
links to the pushed integration branch; private local evidence/profile backups
never go into GitHub.

## Local installation and rollback

The sole searchable installation is `/Applications/Personal Dashboard.app`,
version4.0.7, reviewed build revision `499cdc1`. Installed executable SHA256:
`4bd57de7e16c9bdeed3b92ab75e485664a0c7bbd86c30070c9c397bae766618a`.
Signed previous App, retained build and verified profile preimage are in the
private `.noindex` archive:
`/Users/tingranwang/.codex/app-archives.noindex/personal-dashboard/2026-10-10-typography-wa4xnaqn/`.
Its `installation-receipt.json` contains file-level verification; it is private
and is not copied into the repository.

For a later rollback, quit the App, preserve any post-update user data, and
restore the previous App with normal Launch Services/signature verification.
Do not overwrite the live profile with `profile-before` automatically: that
could discard subsequent user work. Its preimage is retained for diagnosis and
an explicitly authorized recovery. [Deferred follow-ups](deferred-follow-ups.md)
remain outside the accepted parent closeout.
