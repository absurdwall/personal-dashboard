//! Links completion endpoints through existing operation/action receipts. The
//! canonical local completion store and native MCP writes remain independent.
use super::{
    CollaborationTaskOperation, CollaborationTaskOperationBaseline, StoredCollaborationSession,
};
use crate::habits::{explicit_dida_mapping_id, HabitSnapshotView};
use serde_json::{json, Value};

pub(super) fn mapped_id(snapshot: &HabitSnapshotView, key: &str) -> Option<String> {
    let mut ids = snapshot
        .habit(key)?
        .source_labels
        .iter()
        .filter_map(|label| explicit_dida_mapping_id(label, key))
        .collect::<Vec<_>>();
    ids.sort_unstable();
    ids.dedup();
    (ids.len() == 1).then(|| ids[0].to_owned())
}

pub(super) fn receipt_scope(
    baseline: &CollaborationTaskOperationBaseline,
) -> Option<(&str, Option<&str>)> {
    match baseline {
        CollaborationTaskOperationBaseline::HabitCompletion {
            destination_scope,
            external_habit_id,
            ..
        } => Some((
            destination_scope.as_deref().unwrap_or("local"),
            external_habit_id.as_deref(),
        )),
        _ => None,
    }
}

pub(super) const UNCONFIRMED_SCOPE: &str = "Original Habit completion scope is unconfirmed. Read the current canonical history and source; clarify the endpoints before withdrawing.";

// Scope survives chats, but only within the selected Vault, canonical completion
// target and exact mapped source identity. Cross-chat or unproven chronology
// cannot widen scope; completed direct turns in one chat retain their queue order.
pub(super) fn original_scope(
    sessions: &[StoredCollaborationSession],
    vault_key: &str,
    snapshot: &HabitSnapshotView,
    key: &str,
    date: &str,
) -> Result<(String, Option<String>), String> {
    let mapped = mapped_id(snapshot, key);
    let stamp = date
        .replace('-', "")
        .parse::<i64>()
        .map_err(|_| UNCONFIRMED_SCOPE)?;
    let mut candidates = Vec::new();
    for session in sessions
        .iter()
        .filter(|session| session.vault_key.as_deref() == Some(vault_key))
    {
        for message in session
            .messages
            .iter()
            .filter(|message| message.role == "user")
        {
            let at = super::dida_writes::iso_epoch_millis(&message.created_at);
            for local in session.task_operations.iter().filter(|item| {
                item.execution_id.as_str() == message.execution_id.as_deref().unwrap_or("")
                    && item.vault_key == vault_key && item.status == "applied" && item.target_date == date
                    && snapshot.completion_target_binding.as_deref() == Some(item.target_binding.as_str())
                    && matches!(&item.operation, CollaborationTaskOperation::SetLocalHabitCompletion { habit_key, completed: true } if habit_key == key)
            }) {
                let (scope, id) = receipt_scope(&local.baseline).unwrap_or(("local", None));
                if id.is_some() && id != mapped.as_deref() { continue; }
                // A newer independent canonical completion is not this receipt's effect.
                let newer_local = snapshot.habit(key).and_then(|habit| habit.cell(date)).is_some_and(|cell| {
                    cell.local_completion_state == crate::habits::HabitLocalCompletionState::Completed
                        && cell.details.iter().any(|detail| match detail {
                            crate::habits::HabitDetailView::LocalCompletion { changed_at, .. } => {
                                match (super::dida_writes::iso_epoch_millis(changed_at), super::dida_writes::iso_epoch_millis(&local.updated_at)) {
                                    (Some(current), Some(saved)) => current > saved,
                                    _ => changed_at != &local.updated_at,
                                }
                            },
                            _ => false,
                        })
                });
                if !newer_local {
                    let saved_at = super::dida_writes::iso_epoch_millis(&local.updated_at);
                    let direct_order = (local.execute_attempted
                        && local.created_at == local.updated_at && saved_at.is_some() && saved_at == at
                        && message.delivery_state == "completed")
                        .then_some(message.queue_order).flatten().map(|order| (session.id.as_str(), order));
                    candidates.push((saved_at, scope.to_owned(), id.map(str::to_owned), direct_order));
                }
            }
            for action in &message.external_actions {
                let Some(v) = action.verification.as_ref() else {
                    continue;
                };
                if action.status != "saved"
                    || v["sourceObserved"] != true
                    || action.source_id != "dida365"
                    || action.tool_id != "upsert_habit_checkins"
                    || mapped.is_none()
                    || v["habitCheckin"]["habitId"].as_str() != mapped.as_deref()
                    || v["habitCheckin"]["stamp"].as_i64() != Some(stamp)
                    || v["habitCheckin"]["status"] != 2
                {
                    continue;
                }
                let Some(scope) = v["habitScope"].as_str() else {
                    continue;
                };
                let direct_order = (at.is_some()
                    && message.delivery_state == "completed")
                .then_some(message.queue_order)
                .flatten()
                .map(|order| (session.id.as_str(), order));
                candidates.push((at, scope.to_owned(), mapped.clone(), direct_order));
            }
        }
    }
    let latest = candidates.iter().filter_map(|(at, _, _, _)| *at).max();
    let mut latest_candidates = candidates
        .into_iter()
        .filter(|(at, _, _, _)| at.is_none() || *at == latest)
        .collect::<Vec<_>>();
    // Minute-precision timestamps need not erase provable direct-turn ordering.
    // All tied origins must belong to the same saved chat and be completed direct
    // turns. Approval/recovery with uncertain save order never borrows this rule.
    if let Some((session, _)) = latest_candidates.first().and_then(|candidate| candidate.3) {
        if latest_candidates
            .iter()
            .all(|candidate| candidate.3.is_some_and(|(id, _)| id == session))
        {
            let newest_order = latest_candidates
                .iter()
                .filter_map(|candidate| candidate.3.map(|(_, order)| order))
                .max();
            latest_candidates
                .retain(|candidate| candidate.3.map(|(_, order)| order) == newest_order);
        }
    }
    let mut scopes = latest_candidates
        .into_iter()
        .map(|(_, scope, id, _)| (scope, id))
        .collect::<Vec<_>>();
    scopes.sort();
    scopes.dedup();
    if scopes.len() == 1 && ["local", "external", "both"].contains(&scopes[0].0.as_str()) {
        Ok(scopes.remove(0))
    } else {
        Err(UNCONFIRMED_SCOPE.into())
    }
}

pub(super) fn origins(
    sessions: &[StoredCollaborationSession],
    vault_key: &str,
    snapshot: &HabitSnapshotView,
) -> Value {
    let mut dates = std::collections::BTreeSet::new();
    for session in sessions
        .iter()
        .filter(|session| session.vault_key.as_deref() == Some(vault_key))
    {
        for item in &session.task_operations {
            if matches!(
                item.operation,
                CollaborationTaskOperation::SetLocalHabitCompletion { .. }
            ) {
                dates.insert(item.target_date.clone());
            }
        }
    }
    for habit in snapshot
        .habits
        .iter()
        .filter(|habit| habit.can_record_completion)
    {
        for cell in &habit.history {
            if cell.has_external_completion
                || cell.local_completion_state != crate::habits::HabitLocalCompletionState::None
            {
                dates.insert(cell.date.clone());
            }
        }
    }
    json!(snapshot.habits.iter().filter(|habit|habit.can_record_completion).flat_map(|habit|dates.iter().map(|date| {
        match original_scope(sessions,vault_key,snapshot,&habit.key,date) {
            Ok((scope,id)) => json!({"habitKey":habit.key,"date":date,"scope":scope,"externalHabitId":id}),
            Err(_) => json!({"habitKey":habit.key,"date":date,"scope":"ambiguous","message":UNCONFIRMED_SCOPE}),
        }
    })).collect::<Vec<_>>())
}

// This is preflight capability selection, not a new natural-language date service.
// Reuse the request's captured calendar date; the 04:00 lived target is a fallback
// only when no explicit/relative date is stated. The model still resolves effects.
pub(super) fn context(snapshot: &HabitSnapshotView) -> Value {
    json!(snapshot.habits.iter().filter(|habit|habit.can_record_completion).map(|habit|json!({
        "habitKey":habit.key,"name":habit.name,"externalHabitId":mapped_id(snapshot,&habit.key),
        "sourceState":format!("{:?}",snapshot.state),"identityBasis":"existing catalog key + explicit source mapping; never name matching",
        "localCompletionRevision":snapshot.completion_revision,
        "localDates":habit.history.iter().map(|cell|json!({"date":cell.date,"state":format!("{:?}",cell.local_completion_state)})).collect::<Vec<_>>(),
    })).collect::<Vec<_>>())
}
