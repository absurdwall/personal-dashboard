# Issue tracker: GitHub

## Scoped local tracker: dashboard experience improvements

On 2026-10-10 the user explicitly chose local-only publication, tickets and
subsequent implementation tracking for the accepted Dashboard experience
prototype while GitHub is unavailable. For this initiative,
`.scratch/personal-dashboard-experience/map.md` is the canonical tracker and
its linked `spec.md` is the canonical specification. This scoped exception
takes precedence over the default GitHub operations below.

- Publish and read the complete spec locally; use stable PDEX IDs, preserve
  complete ticket bodies, parent/dependency links and the five-role triage
  vocabulary. Record lifecycle, implementation and acceptance separately.
- A `ready-for-agent` specification is a planning record, not a ticket claim.
  Ticket creation and implementation follow the user's subsequent request.
- Subsequent approved tickets, claims, blockers, reviews, evidence and
  closeout remain local. Do not query or mutate GitHub as part of this scope
  while this mode is active. Existing historical queues stay historical.
- Preserve complete local Git history on `codex/` branches: commit durable
  spec/ticket/state/evidence changes and coherent implementation increments.
  Local Git is available; unavailable remote access does not prevent commits.
  Keep unrelated dirty work, and record base, working branch and integration
  identities rather than relying on chat summaries.
- Do not amend away or squash this initiative's retained evidence/history.
  Main remains protected; local tracking is not authorization to merge main,
  push now or install an App.
- When remote access returns, preserve commits for ordinary branch push and
  protected-main PR integration. Git push does not publish Markdown tickets
  as GitHub Issues: any tracker migration must preserve stable local IDs,
  full bodies, dependencies, state, comments, acceptance and evidence, with
  an explicit local-ID-to-Issue mapping and one canonical destination.
  Do not automatically migrate, renumber or close local records.
- See the initiative's `remote-handoff.md` for the commit chain and handoff
  convention. This exception changes the current initiative only; GitHub
  remains the default for other initiatives.

## Scoped local tracker: Collaboration redesign

On 2026-10-09 the user explicitly chose a fully local tracker for the
Collaboration redesign while their GitHub account is unavailable. For this
initiative, `.scratch/personal-dashboard-collaboration-redesign/map.md` is the
canonical tracker and its linked `spec.md` is the canonical specification.
Subsequent approved tickets and execution records stay in the same local
tracker. This exception takes precedence over the GitHub publication, fetch,
claim, dependency and closeout instructions below for this initiative only.

- Preserve stable local IDs, complete bodies, parent/dependency links, the
  existing five-role triage vocabulary, and explicit lifecycle/acceptance state.
- Read and update the local records instead of querying or writing GitHub.
  A Git commit records a local publication or state transition; it is not a
  GitHub Issue publication, native claim, PR merge or release acceptance.
- Commit authorized durable records on a `codex/` branch. Main remains
  protected. Do not infer permission to merge locally, push, or install an app.
- A ready specification does not authorize ticket creation or implementation.
  Follow the user's subsequent request for each stage.
- Do not automatically migrate this tracker back to GitHub when access returns.
  A later authorized migration must preserve IDs, dependencies and evidence
  and leave a clear pointer to the new canonical location.

Initiatives outside the scoped local exceptions retain the GitHub conventions below. Historical local
records remain historical; this exception does not reactivate old queues.

## Default tracker

The canonical tracker for Personal Dashboard specs and implementation tickets
is GitHub Issues in `absurdwall/personal-dashboard`. Use the `gh` CLI with
`--repo absurdwall/personal-dashboard` explicitly.

## Conventions

- Create: `gh issue create --repo absurdwall/personal-dashboard --title "..." --body-file <file>`.
  Save complete multiline bodies in a temporary UTF-8 file.
- Read: `gh issue view <number> --repo absurdwall/personal-dashboard --json number,title,body,comments,labels,state,assignees,url`.
- List: `gh issue list --repo absurdwall/personal-dashboard --state open --json number,title,body,labels,assignees,url`.
- Comment: `gh issue comment <number> --repo absurdwall/personal-dashboard --body-file <file>`.
- Labels: `gh issue edit <number> --repo absurdwall/personal-dashboard --add-label "<label>"` or `--remove-label "<label>"`.
- Close: `gh issue close <number> --repo absurdwall/personal-dashboard` after the authorized closeout.

## When a skill says "publish to the issue tracker"

Publish the complete spec or approved implementation ticket as a GitHub Issue.
Use `docs/agents/triage-labels.md`; confirmed to-spec specs and approved
to-tickets tickets use `ready-for-agent` unless instructed otherwise.
Reuse an existing matching Issue when updating work.

Verify the published Issue's URL, full body, state and labels before reporting
publication complete. A local file or map update is supporting evidence,
not publication.

## When a skill says "fetch the relevant ticket"

Read the current GitHub Issue's complete body, comments, labels and state.
Read its parent and blockers when relevant. GitHub owns live state,
assignment, dependencies and closeout.

Scope and approval boundaries from the Issue remain applicable.
Publishing a spec does not itself start implementation, authorize ticket
breakdown, or authorize merging a PR.

## Pull requests as a triage surface

**PRs as a request surface: no.**

For an explicitly referenced bare GitHub number, resolve it with
`gh pr view <number> --repo absurdwall/personal-dashboard` and fall back to
`gh issue view <number> --repo absurdwall/personal-dashboard`.
Issues and PRs share one number space.

## Wayfinding operations

- Map: a GitHub Issue labelled `wayfinder:map`, holding Notes,
  Decisions-so-far and Fog.
- Child ticket: a GitHub Issue linked as a native sub-issue of the map and
  labelled `wayfinder:<type>` (`research`, `prototype`, `grilling`, `task`).
  Where sub-issues are unavailable, add a task-list link to the map and
  `Part of #<map>` to the child body.
- Blocking: use native GitHub issue dependencies. The API form is
  `gh api --method POST repos/absurdwall/personal-dashboard/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`.
  Obtain the numeric database id with
  `gh api repos/absurdwall/personal-dashboard/issues/<blocker> --jq .id`.
  Where native dependencies are unavailable, put `Blocked by: #<number>`
  references in the child body.
- Frontier: list the map's open children in map order; inspect current
  blockers and assignees. The first unassigned child with all blockers
  closed is eligible.
- Claim: `gh issue edit <number> --repo absurdwall/personal-dashboard --add-assignee @me`.
  A local status change is not a native claim.
- Resolve: post the answer with `gh issue comment --body-file`, close the
  authorized child, then update Decisions-so-far in the map Issue with a
  context pointer. Preserve the parent Issue's closeout boundary.

## Supporting local records

`.scratch/<feature>/` may retain design discussions, research, spec copies,
maps and acceptance evidence. Link current supporting records to their
canonical GitHub Issue. Local records do not create a second executable queue.

Preserve historical Markdown trackers as historical records. New specs
and implementation tickets are published to GitHub; a local spec copy
does not replace the complete GitHub Issue body.
