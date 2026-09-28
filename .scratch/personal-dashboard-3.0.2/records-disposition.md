# Scratch record disposition — 2026-09-28

This note maps the decision and delivery records preserved in the reviewable archive to the local-only evidence that remains in the working copy.

## Decision and delivery records in this PR

- The user-approved 3.0.2 product decisions are preserved in `spec.md` and the six issue records: refresh consistency, shared Task time-axis behavior, task-time semantics, readable cards, page framing, and the corrected Habits panel scope. They capture the outcomes of the earlier interview without publishing its question-by-question transcript.
- The resolved ticket map and delivery history are in `map.md` and `delivery-recovery.md`. Per-ticket implementation and acceptance details remain in `issues/01` through `issues/06`; the superseded PR #9 result and its PR #10 correction remain distinguished.
- The collaboration design and manual observations are in `../personal-dashboard-codex-collaboration/spec.md`, `map.md`, and `manual-acceptance-feedback-2026-09-27.md`.

## Public-copy minimization

Exact temporary evidence locations and the home-directory settings path were removed from the public Markdown; acceptance outcomes, app versions, and binary hashes remain. Named task examples were generalized to synthetic title-length/language cases. Voice-feedback notes retain the draft-preservation and missing-prompt observations while omitting the OS version and detailed permission-list state. Acceptance screenshots, fixtures, manifests, and Management JSON remain local and outside the PR.

## Generated Management JSON retained locally

The local `management/` directory contains 90 JSON files totaling 3,426,581 bytes: 36 structured request envelopes, 48 helper result receipts, and 6 state snapshots. They are machine-generated Management protocol records, not user-authored source documents. Fifty-five include machine-local absolute paths. A scan for common credential formats found no matches, but the full snapshots also carry Registry, source, and historical recovery state, so the raw JSON remains local and is not copied into this PR.

The decision-relevant outcomes are preserved in `map.md`, `delivery-recovery.md`, and the issue Answer/Comments sections. Those Markdown records identify the final ticket states, accepted PRs, superseded conclusions, and pending recovery boundaries without duplicating full helper views. One pair of claim-request envelopes has the same operation payload; the remaining JSON records have distinct request or receipt content.

## Interview transcript retained locally

`.scratch/personal-dashboard-3.0.2-grill/session.md` is a user-authored interview transcript. Its own retention note says to keep that interview directory out of archives and commits. The product decisions needed for implementation and review are already captured in this PR's spec and issue records; the private conversation and interview process remain local.
