# Issue tracker: GitHub

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
