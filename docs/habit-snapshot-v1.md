# Habit snapshot v1

Personal Dashboard reads one rebuildable, on-demand JSON projection at:

```text
<selected Tortilla Flat vault>/.personal-dashboard/derived/habits-v1.json
```

The Dashboard is a reader. It does not call Dida365, poll any source, start an Agent, or create this file. The external daily-flow Agent is the producer, but activating that producer belongs to the 2.0 cutover task. The checked-in [synthetic fixture](../src-tauri/tests/fixtures/habits-v1-complete.json) is the complete production shape and contains semantic keys only—never private external IDs.

## Producer handoff

1. Establish the local lived date for this generation run. The 12-week window starts on Monday eleven weeks before that generation date's Monday. `range.to` is the latest date actually proved by the source read, cannot be after `generatedAt`'s local date, and cannot be in the future.
2. Build a complete candidate document from already-read source results. Preserve the stable catalog `key` when a display `name` changes. Never fuzzy-match similar names.
3. Validate the entire candidate against this contract before it can replace the canonical file. A source failure, empty response, invalid date, unsupported schema, or partial candidate must leave the prior canonical file untouched.
4. Write the candidate to a new temporary file in the same directory, flush the file, atomically rename it over `habits-v1.json`, then flush the parent directory. Do not truncate or update the canonical file in place.
5. Report producer failure in the Agent flow; do not replace prior history with an empty snapshot. Dashboard refresh also keeps the last valid in-process reading if a later canonical read is malformed. After an app restart, durable recovery depends on the producer having honored the atomic replacement rule.

This ticket does not activate or modify the live daily-loop skill. The cutover task must explicitly wire the producer and verify its atomic candidate validation before claiming the live loop.

## Top-level document

The document is strict JSON. Unknown fields, missing required fields, duplicate source keys, duplicate habit keys, duplicate lived dates, or unsupported enum values make the whole candidate invalid.

| Field | Contract |
| --- | --- |
| `schemaVersion` | Integer `1`. Other versions are rejected. |
| `generatedAt` | `YYYY-MM-DDTHH:mm:ss±HH:mm`, including the offset in effect at generation. It cannot be later than the Dashboard's current local date. |
| `range.from` | Monday eleven weeks before the Monday containing `generatedAt`. A reader crossing into a later week keeps the old valid document as stale and projects the current 12-week display window from it; the UI labels that display window separately from this source-coverage range. |
| `range.to` | Latest proved lived date, between `range.from` and the current local date. |
| `producer.kind` | Non-empty producer class such as `agent-derived`. |
| `producer.label` | Human-readable provenance displayed in the app. |
| `sources[]` | Source catalog with stable lowercase `key`, `kind`, and display `label`. |
| `habits[]` | Habit catalog and bounded observations described below. |

Allowed source `kind` values are `dida365`, `manual`, `dashboard`, and `other`. Only `dida365` and explicit `manual` outcomes can contribute weekly completion evidence. Dashboard Daily Record exercise notes are read separately by the app as context and never increment a count.

## Habit and goal

Each habit has:

- `key`: stable semantic identity using lowercase letters, digits, and hyphens; rename only `name`.
- `name`: display name.
- `active`: whether a valid weekly goal contributes to the current denominator.
- `trackingKind`: `weekly-count` or `daily-time`, independent of whether a current goal exists.
- `goal`: the current standard goal, or `null`. A missing goal remains visible and is excluded from the aggregate denominator.
- `goalHistory`: zero or more past-Monday entries with `weekOf`, a human `label`, and that week's typed `goal`. The Dashboard displays this context but does not invent missing historical targets or rates.
- `days`: unique bounded lived-date entries.

A weekly goal is `{"kind":"weekly-count","standard":3}` with a positive integer standard. A daily-time goal is `{"kind":"daily-time","standard":"07:30","dayRelation":"same-day"}`. `dayRelation` is `same-day`, `next-day`, or `unresolved`. Ideal and baseline tiers are observations of one behavior, not separate goals or extra denominator entries.

## Day, coverage, and observation

Each day has a unique `livedDate`, `coverage`, and `observations`. Coverage is one of:

- `complete`: the declared source scope for this habit and date was fully read.
- `partial`: only part of the source scope was proved.
- `unavailable`: the intended source could not be read.
- `unknown`: the date was not read or cannot be interpreted.

An empty or absent observation is unknown, never implicit `not-done`. Explicit non-completion requires a sourced `not-done` observation.

Every observation includes a declared source key, an offset-bearing `observedAt` no later than `generatedAt`, a `status`, and an evidence kind. Supported statuses are `completed`, `not-done`, `partial`, `baseline`, `unavailable`, `actual-time`, and `threshold-met`. Evidence kinds are `check-in`, `manual-completion`, `explicit-time`, and `threshold-check-in`.

For the same habit, lived date, and source, the newest `observedAt` replaces older observations from that source. Equal-timestamp contradictory observations are invalid. After same-source replacement:

- multiple completion sources still contribute at most one completion for that habit and lived date;
- a `completed` and `not-done` disagreement across Dida365/manual sources is a visible conflict and contributes zero;
- `partial`, `baseline`, threshold-only, unavailable, unclear duration text, and local Dashboard notes contribute zero;
- weekly totals use Monday through Sunday lived dates, and future dates remain unknown;
- the aggregate numerator is the sum of known completed days; the denominator is the sum of positive current standard goals for active weekly-count habits only. Daily-time targets and no-goal habits are excluded. Counts are not capped or cross-subsidized.

## Exact time and lived-day evidence

Only `status: "actual-time"` with `evidence: "explicit-time"` may include `actualTime`:

```json
{
  "occurredOn": "2026-09-09",
  "localTime": "00:30",
  "utcOffsetMinutes": -240,
  "dayRelation": "next-day"
}
```

`occurredOn` preserves the actual local calendar date. `dayRelation: "next-day"` is valid only when `occurredOn` is the day after `livedDate`, and the UI renders `次日 00:30`. `same-day` requires the same date. `unresolved` remains non-exact in the projection. A `threshold-met` / `threshold-check-in` observation never produces a minute value.

## Reader states

- No selected vault: `unconfigured`.
- No canonical file: `missing`; the app does not generate one.
- Valid current-day file: `ready`.
- Valid file generated before the current local date: `stale`; still readable and explicitly not real-time.
- Invalid refresh after a valid in-process read: `retained`; the prior reading stays visible with the failure.
- Invalid first read: `error`; no data is synthesized.

The recent strip covers the seven lived dates ending today. Expanded history always exposes the 12 Monday–Sunday weeks in the bounded window. A dot means there is a source observation or Dashboard short record; its color/status and date detail show whether it counted.
