# Unknown native Dida effects: unresolved scope decision

## Requirement and measured constraint

Spec section 5 requires unknown effects to be reconciled from their original
receipt/current source, without replaying the whole request, and without
blocking unrelated objects. PDCR-03 is reopened because the existing native
capability mask blocks all Task and Habit mutations in the selected Vault when
any Dida mutation remains unresolved. Reads and local work remain available.

CLI 0.160.0 exposes native per-tool masks and post-dispatch observations, but its
generated ServerRequest contract has no MCP argument approval/filter request.
An isolated actual-model experiment demonstrated that a synchronous PreToolUse
hook can deny an exact Task or Habit/date before dispatch while allowing other
IDs/dates and reads. The same experiment measured fail-open behavior for hook
exit 1, malformed output and timeout. That hook alone does not establish a
reliable replacement for the existing capability restriction. No such hook has
been added to the product. The [isolated runtime probe](native-hook-probe.md)
retains supported-contract, dispatch and failure evidence, including the broad
trust-bypass scope and unproven concurrent/create-identity cases.

## Reviewable alternatives

1. **Retain the conservative native restriction.** Keep independent readback,
   original receipts, local work and unrelated reads; keep PDCR-03 open for this
   unmet object-scope requirement. A later reliable native transport/adapter
   design would be needed to close it. This preserves the existing mechanism
   and does not claim complete implementation.
2. **Use Codex-led recovery for native mutations.** Keep original scoped
   receipts, host read-only reconciliation and independently observed outcomes;
   remove the global unknown-effect mutation mask. The single usage skill would
   require source verification before retrying an unresolved effect, preserve
   completed effects and continue other objects without replaying the original
   request. No semantic classifier, new Dashboard MCP or additional approval
   layer is added. The native same-object retry decision is model-dependent;
   Dashboard cannot claim a mechanical per-object pre-dispatch guarantee with
   the current interface. This needs an explicit decision about that guarantee.

Neither alternative changes the missing live-Dida prerequisite: no isolated
objects are prepared, so PDCR-12 remains unaccepted. Neither authorizes real
personal-data testing, installation, main merge or publication.

## Current state

No policy change selected. The existing restriction remains in place, with
PDCR-03 open. Concrete page-generation/provenance review fixes and independent
native acceptance continue.
