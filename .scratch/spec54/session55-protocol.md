# Ticket #55 runtime schema recovery evidence

Parent: [Spec #54](https://github.com/absurdwall/personal-dashboard/issues/54).
Ticket: [#55](https://github.com/absurdwall/personal-dashboard/issues/55).

Tested the installed Codex CLI 0.160.0 App Server in a fresh temporary CODEX_HOME and empty working directory. The probe did not use the user's credentials, Vault, installed Dashboard, or personal objects. It started one synthetic tool, recorded an unauthenticated synthetic turn, and resumed the thread with a different `dynamicTools` value.

- Generated `ThreadStartParams` supports `dynamicTools`.
- Generated `ThreadResumeParams`, `ThreadSettingsUpdateParams`, and `TurnStartParams` do not expose dynamic-tool replacement.
- `thread/resume` returned success with the unknown `dynamicTools` argument. The persisted SessionMeta still contained only the original synthetic tool. Unknown arguments being accepted therefore do not demonstrate a tool schema upgrade.

The implementation stores a fingerprint of the current dynamic tool definitions. An automatic-to-human transition or a legacy session without that fingerprint starts a new native transport thread inside the same saved Dashboard session. Existing messages and operation results become explicitly historical context, never replayed requests or new write authority. Subsequent rounds with the same schema resume normally. Stable Dashboard session, request, operation, and receipt identities remain intact. Automatic rounds continue to have only initial-plan write authority.

Application workflow coverage verifies automatic planning, same-session human Task completion, replan preserving the morning baseline, local Habit completion, real long-term-memory persistence, duplicate delivery, reopened history, and legacy-session upgrade without approving old proposals. Existing selected-Vault, revision-conflict, receipt-recovery, and review-first tests remain relevant.

This protocol probe and controlled workflow suite do not establish installed Dashboard model behavior or packaged persistence acceptance. An isolated-Vault packaged run must still exercise the same saved session, read the actual tool schemas and business files, and reopen the app.

Validation: frontend build succeeded; all 302 frontend tests passed. The selected application suites passed 48 Collaboration Task-operation workflows, 16 Collaboration workflows, and 4 evening-review integrations. The automatic-round fixture also attempts unauthorized Task and memory calls and verifies rejection before the allowed initial plan. Memory recovery compares the entire expected document after a history-save failure, confirms current effect through readback, and performs no additional source write; it does not attribute the original write to a particular actor.
