# PDCR-09 execution evidence and developer workflow retro

## Implemented contract

The existing request, WorkHistory, usage binding and business receipts remain
the shared evidence source. No parallel history store was added.

- Original request/messageDate/targetDate/execution identity, actual item/call
  identities, observed/native timestamps, statuses, canonical result revisions,
  native diff witnesses and managed-memory witnesses are selected together.
- A usage binding captures requested model/effort separately from observed
  thread/start or resume values, native executable/version, app version,
  optional embedded build revision and exact resource/tool fingerprints.
  Missing effective values and unsupported turn overrides remain gaps.
- WorkItem `inputFingerprint` retains a signature of the actual observed
  argument JSON. Matching signatures are repeated-input candidates, not proof
  of redundancy, duplicate effects or per-tool cost.
- The production date-projection refresh boundary records scoped actual source
  read status, returned source state and renderer application/cached/not-visible
  state on the original execution. These observations survive later history
  snapshots. Observation failure never repeats a canonical write.
- An internal renderer observation callback supports that normal product flow;
  no developer command or automatic retro edit was added to Dashboard.

## Reusable developer entry

The checked-in `.agents/skills/personal-dashboard-workflow-retro/SKILL.md`
points to its evidence contract and stdlib `scripts/read_evidence.py`.
The reader requires an absolute explicit source plus session/execution/period
selection. It reads existing bytes directly without constructing the app or
FileCollaborationStore, loading profiles, reconciliation, writes or login.
Period selection uses captured request messageDate, independently of target date.

Explicit field projection excludes settings/auth/raw responses and hidden
reasoning. Credential-like strings are withheld with pointer-specific omissions;
the conservative filter can also withhold innocuous strings. Source/text/export
bounds, legacy missing fields, unavailable usage, absent page observations,
empty selection and damaged/unsupported schema are distinguished. Every exported
reference resolves to an original JSON Pointer plus SHA256 of the opened source.
Selected ordinary request/reply/diff text can still be private; exports belong
in the explicitly chosen private destination.

## Complete synthetic chain and actual skill findings

The public application test
`developer_reader_complete_chain_keeps_rejected_target_overwrite_unknown_replay_and_stale_render`
uses actual FileCollaborationStore, Task and managed-memory adapters and real
synthetic file writes. Native events are injected at the agreed JSONL boundary;
they are not live external RPCs or live model behavior. The five executions
retain:

1. Invalid attempt before confirmed Task save, plus two equal-input read items.
2. Requested groceries/date versus attempted missing-owned-B/other date. The
   real latest-Task baseline rejects the absent object, canonical Task revision
   remains unchanged, no applied receipt is fabricated, and the deliberately
   inaccurate final reply remains available for comparison.
3. Actual deletion of an unrelated synthetic paragraph, native diff, and bounded
   `sourceObserved` result revision. Original before bytes remain unavailable.
4. An unfinished external-result item followed by a separate equal-input
   completed item and an overclaiming reply. This demonstrates observable replay
   risk; it does not prove a real duplicate external mutation.
5. Managed background append with actual guarded source/result revisions and
   independent complete expected-document readback; unrelated content remains.

A scoped synthetic renderer-seam observation additionally retains
readCompleted/sourceState=stale/pageState=rendered beside a saved result. It
does not replace native UI pixel/read/render acceptance.

The Codex developer actually followed the skill: read the contract and CLI help,
ran explicit selectors, reviewed ordered attempts/receipts/witnesses/replies,
inspected relevant current code, separated observations from causes, wrote the
requested private reports and checked every cited reference. Findings identify
capability, impact, evidence, possible cause and bounded improvement; the review
does not edit the app, skills or Vault.

Private reproducible bundle:
`/tmp/pdcr-09-synthetic.noindex/{complete-history.json,complete-export.json,workflow-retro.md}`.
Source SHA256:
`6b162f811345f8632f2bca51affeccad0e1da0419ef3d7021aa48a646d1bc511`.
All 68 exported refs and 16 report-cited refs resolve. Synthetic usage is labeled
as injected runtime aggregates; absent usage is explicit, with no invented money.

## New actual native runtime/model execution

This gate uses a fresh isolated synthetic Vault and process-local native profile
outside Spotlight indexing. Authentication was copied privately to a 0700
temporary profile/0600 auth file and never logged. Installed profile, personal
Vault, installed app and global user environment remain untouched. The owned
harness child selects its intended CODEX_HOME only; isolated Dida discovery is
unavailable/no connection, not live Dida validation.

The first real attempt on product `8af2032` failed before model dispatch:
native thread/start returned `invalid transport` in mcp_servers.dida365. The
existing absent-connection config still created an enabled_tools-only MCP block.
A narrow public regression went red, and both configuration helpers now retain
an empty override when no selected transport exists. Connected native scopes
and their manual per-tool overrides remain tested.

Failed execution `run-18dcf3a7a93802b8-5` is preserved separately, including
original request/target and genuine observed error. No thread/history/config or
effective model is invented. Its requested default model/effort is independently
documented by the private harness input/build record; the old history reader
explicitly leaves missing captured config unavailable. Failed source SHA256:
`ab002d3123370bfdd4a9f976ad38c0c2b239566b5a947966da03a3d89456dfdc`.
All four exported refs resolve.

The fresh real execution on fixed product `d5235cd`:

- Execution: `run-18dcf3da5588c6b0-5`; terminal completed.
- Native runtime: codex-cli 0.160.0; observed thread/start model gpt-6.1-sol,
  provider openai; requested model/effort default null. Effective reasoning
  effort was unavailable and remains an explicit gap.
- App version 4.0.7; captured full build revision
  `d5235cd4344e3b762c5743b199d2fbc33d40c2dd`; loaded package/tool set 1.3.0,
  package fingerprint a09edbbefd9d61f3.
- Actual Dashboard SaveDailyPlan DaytimeEvent receipt is applied with result
  revision `7be8b8ab78a9bfce`. Independent harness readback finds the requested
  12-minute synthetic walk fact and preserves morning baseline, current
  arrangement and unrelated private-extension paragraph. Final reply agrees.
- Native `total=61818` retains thread aggregate; `last=21201` is the
  runtime-reported-last aggregate with its observed thread/turn provenance.
  Allocation to the complete app execution/per-tool is unavailable. No price
  or per-tool token cost is inferred.
- Four visible native work items include two distinct Dashboard dynamic calls.
  This headless execution has no page refresh/render observation; the reader
  exposes that gap rather than claiming a fresh visible page.

Private bundle:
`/tmp/pdcr-09-actual.noindex/{history.json,export.json,workflow-retro.md,reference-validation.json}`,
with failed-prefixed source/export/build records retained separately.
Successful source SHA256:
`d4fb7e6d3277c0cfa8547ef5f59dc3e91690acca8daa93de52083efe939d1462`.
All 13 successful refs and all seven actual-report cited refs resolve against
their respective sources. The skill's report includes the actual startup
failure, verified code cause/repair, fresh successful model/save evidence and
the retained refresh/config/usage scope gaps.

## Validation and remaining gates

After merging PDCR-03/06/10 and integration ea88a9e:

- Rust library: 95 passed, six existing native/environment gates ignored.
- Frontend: 362 passed; frontend build passed.
- Reader public CLI privacy/selection/bounds/startup/nested-damage tests:
  four passed. Source bytes, permissions, mtime and directory contents remain
  unchanged by reading; malformed evidence returns an error rather than an
  invented empty success.
- Absent-native-connection configuration regression and connected scope suite:
  six passed. `git diff --check` passed.

Logs: `/tmp/pdcr-09-{reader,signature,config,refresh,no-connection,chain,start-reader,nested-reader}-{red,green}.log`
where applicable; final checks in
`/tmp/pdcr-09-final-{rust,frontend,build,reader}.log`. The initial complete-chain
red exposed a synthetic reused-turn identity collision; the fixture now uses
distinct execution-bound turn identities. This is not claimed as a production
failure or a separate live model retry.

The actual d5235cd proof precedes additive PDCR-10 guidance and later integrated
producer changes. It remains exactly that build's evidence; the final combined
candidate native UI/model acceptance remains PDCR-11. Native before/sourceObserved
qualifiers remain intact. Live Dida operations remain PDCR-12 with its separately
recorded prerequisite gap. No package/native UI, live Dida, live voice or personal
data acceptance is inferred from the headless actual execution or synthetic chain.
