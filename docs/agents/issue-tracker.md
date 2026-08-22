# Issue tracker: Local Markdown

Issues and specs for this project live as Markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`
- Triage state is recorded as a `Status:` line near the top of each issue file
- Comments and conversation history are appended under `## Comments`

## Publishing

When a skill says “publish to the issue tracker,” create the appropriate file under `.scratch/<feature-slug>/`.

## Fetching

When a skill says “fetch the relevant ticket,” read the referenced local Markdown file.

## Wayfinding

- Map: `.scratch/<effort>/map.md`
- Child ticket: `.scratch/<effort>/issues/NN-<slug>.md`
- `Type:` records `research`, `prototype`, `grilling`, or `task`
- `Status:` records one of the canonical triage states from `triage-labels.md` before execution (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, or `wontfix`); use `claimed` while work is in progress and `resolved` when complete
- `Blocked by:` lists prerequisite ticket numbers
- Claim work by setting `Status: claimed`
- Resolve work by adding `## Answer`, setting `Status: resolved`, and updating the map
