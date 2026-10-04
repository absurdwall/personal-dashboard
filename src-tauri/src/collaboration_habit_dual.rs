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

fn clause_scope(text: &str) -> Option<&'static str> {
    let text = text.to_lowercase();
    let local = [
        "只记本地",
        "只改本地",
        "只撤本地",
        "只撤回本地",
        "仅本地",
        "只更新本地",
        "只在本地",
        "只保存在本地",
        "仅记录本地",
        "只记录本地",
        "仅本地",
        "only in dashboard",
        "local only",
        "only local",
        "only the local",
        "only dashboard",
        "只在dashboard",
    ]
    .iter()
    .any(|m| text.contains(m));
    let external = [
        "只记滴答",
        "只改滴答",
        "只撤滴答",
        "只撤回滴答",
        "仅滴答",
        "只更新滴答",
        "只保存在滴答",
        "只记录滴答",
        "仅记录滴答",
        "only in dida",
        "only in ticktick",
        "external only",
        "only external",
        "only dida",
        "only ticktick",
        "只在滴答",
    ]
    .iter()
    .any(|m| text.contains(m));
    match (local, external) {
        (true, false) => Some("local"),
        (false, true) => Some("external"),
        (true, true) => Some("ambiguous"),
        _ => None,
    }
}

fn names_target(text: &str, key: &str, name: &str) -> bool {
    let text = text.to_lowercase();
    text.contains(&key.to_lowercase())
        || (!name.is_empty() && text.contains(&name.to_lowercase()))
        || (key == "exercise"
            && ["运动", "锻炼", "workout", "worked out"]
                .iter()
                .any(|marker| text.contains(marker)))
}
fn task_clause(text: &str) -> bool {
    ["任务", "清单", " task", "task ", "list"]
        .iter()
        .any(|marker| text.to_lowercase().contains(marker))
        && !["习惯", "打卡", "habit"]
            .iter()
            .any(|marker| text.to_lowercase().contains(marker))
}
/// Scope belongs to a concrete Habit clause. A Task destination cannot narrow
/// another Habit's native capability, and neighboring Habit scopes do not bleed.
pub(super) fn scope_for_habit(text: &str, key: &str, name: &str) -> Option<&'static str> {
    let mut scopes = Vec::new();
    let mut previous_target = false;
    for clause in text.split(['。', '；', ';', '\n', '.', '!', '?', '！', '？', ',', '，']) {
        let target = names_target(clause, key, name) && !task_clause(clause);
        let scoped = clause_scope(clause);
        // A short source qualifier after this exact Habit fact (", only local")
        // attaches to it; a different named fact starts its own clause.
        let qualifier_text = clause
            .trim()
            .trim_end_matches("就好")
            .trim_end_matches("即可")
            .trim()
            .to_lowercase();
        let qualifier = previous_target
            && [
                "只记本地",
                "只记录本地",
                "仅本地",
                "只在本地",
                "只记滴答",
                "只在滴答",
                "只改本地",
                "只撤本地",
                "只撤滴答",
                "local only",
                "only local",
                "only dida",
                "only external",
            ]
            .contains(&qualifier_text.as_str())
            || (previous_target && scoped == Some("ambiguous") && qualifier_text.starts_with("只"));
        if target || qualifier {
            scopes.push(scoped);
        }
        if !clause.trim().is_empty() {
            previous_target = target || qualifier;
        }
    }
    let local = scopes.iter().any(|scope| *scope == Some("local"));
    let external = scopes.iter().any(|scope| *scope == Some("external"));
    if scopes.contains(&Some("ambiguous")) || (local && external) {
        Some("ambiguous")
    } else if local {
        Some("local")
    } else if external {
        Some("external")
    } else {
        None
    }
}
/// A verified source check-in stamp belongs to its own factual date clause.
/// Other dated reports about the same Habit cannot change this action's scope.
pub(super) fn scope_for_habit_date(text: &str, key: &str, name: &str, stamp: &str) -> Option<&'static str> {
    if stamp.len()!=8 { return scope_for_habit(text,key,name); }
    let date=format!("{}-{}-{}",&stamp[..4],&stamp[4..6],&stamp[6..]);
    let clauses:Vec<_>=text.split(['。','；',';','\n','!','！','?','？'])
        .filter(|clause| clause.contains(&date) && names_target(clause,key,name) && !task_clause(clause)).collect();
    if clauses.is_empty() { return scope_for_habit(text,key,name); }
    scope_for_habit(&clauses.join("；"),key,name)
}
pub(super) fn scope_for_effect(message:&str,quote:&str,key:&str,name:&str,date:&str)->Option<&'static str> {
    let current=scope_for_habit_date(message,key,name,&date.replace('-',""));
    let quoted=scope_for_habit(quote,key,name);
    // Exact per-effect quotes separate otherwise conflicting date clauses, but
    // cannot omit a destination already explicit for this concrete date.
    if current==Some("ambiguous") && message.contains(date) { current }
    else if current==Some("ambiguous") { quoted.or(current) } else { current.or(quoted) }
}
pub(super) fn only_local_habit_effects(text: &str, snapshot: &HabitSnapshotView) -> bool {
    let mentioned: Vec<_> = snapshot
        .habits
        .iter()
        .filter(|habit| {
            text.split(['。', '；', ';', '\n', '.', '!', '?', '！', '？', ',', '，'])
                .any(|clause| names_target(clause, &habit.key, &habit.name) && !task_clause(clause))
        })
        .collect();
    !mentioned.is_empty()
        && mentioned
            .iter()
            .all(|habit| scope_for_habit(text, &habit.key, &habit.name) == Some("local"))
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
                        && message.delivery_state == "completed"
                        && !super::is_review_before_write_request(&message.text.to_lowercase()))
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
                    && message.delivery_state == "completed"
                    && !super::is_review_before_write_request(&message.text.to_lowercase()))
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
fn withdrawal_dates(
    text: &str,
    key: &str,
    name: &str,
    dates: &super::CollaborationDateContext,
) -> Option<Vec<String>> {
    let mut resolved = Vec::new();
    for clause in text
        .split(['。', '；', ';', '\n'])
        .filter(|clause| names_target(clause, key, name) && !task_clause(clause))
    {
        let explicit = clause
            .split(|c: char| !c.is_ascii_digit() && c != '-')
            .filter_map(crate::today::CalendarDate::parse)
            .map(|date| date.to_string())
            .collect::<std::collections::BTreeSet<_>>();
        if explicit.len() > 1 {
            return None;
        }
        if let Some(date) = explicit.into_iter().next() {
            resolved.push(date);
            continue;
        }
        let lower = clause.to_lowercase();
        let yesterday = lower.contains("昨天") || lower.contains("yesterday");
        let today = lower.contains("今天") || lower.contains("today");
        if yesterday && today {
            return None;
        }
        let date = if yesterday || today {
            crate::today::CalendarDate::parse(&dates.request_natural_date)?
                .plus_days(if yesterday { -1 } else { 0 })
                .to_string()
        } else {
            dates.target_date.clone()
        };
        resolved.push(date);
    }
    Some(resolved)
}

pub(super) fn native_habit_writes_allowed(
    text: &str,
    dates: &super::CollaborationDateContext,
    snapshot: &HabitSnapshotView,
    origins: &Value,
) -> bool {
    if only_local_habit_effects(text, snapshot) {
        return false;
    }
    let lower = text.to_lowercase();
    if !["撤回", "撤销", "withdraw", "retract"]
        .iter()
        .any(|marker| lower.contains(marker))
    {
        return true;
    }
    snapshot
        .habits
        .iter()
        .filter(|habit| names_target(text, &habit.key, &habit.name))
        .any(|habit| {
            let Some(targets) = withdrawal_dates(text, &habit.key, &habit.name, dates) else {
                return false;
            };
            if matches!(
                scope_for_habit(text, &habit.key, &habit.name),
                Some("external")
            ) {
                return true;
            }
            origins
                .as_array()
                .into_iter()
                .flatten()
                .filter(|origin| origin["habitKey"] == habit.key)
                .filter(|origin| {
                    origin["date"]
                        .as_str()
                        .is_some_and(|date| targets.iter().any(|target| target == date))
                })
                .any(|origin| {
                    ["both", "external"].contains(&origin["scope"].as_str().unwrap_or("ambiguous"))
                })
        })
}

pub(super) fn context(snapshot: &HabitSnapshotView) -> Value {
    json!(snapshot.habits.iter().filter(|habit|habit.can_record_completion).map(|habit|json!({
        "habitKey":habit.key,"name":habit.name,"externalHabitId":mapped_id(snapshot,&habit.key),
        "sourceState":format!("{:?}",snapshot.state),"identityBasis":"existing catalog key + explicit source mapping; never name matching",
        "localCompletionRevision":snapshot.completion_revision,
        "localDates":habit.history.iter().map(|cell|json!({"date":cell.date,"state":format!("{:?}",cell.local_completion_state)})).collect::<Vec<_>>(),
    })).collect::<Vec<_>>())
}

pub(super) fn natural_authority(completed: bool, quote: &str) -> bool {
    if [
        "明天",
        "下周",
        "打算",
        "准备",
        "也许",
        "可能",
        "tomorrow",
        "next week",
        "maybe",
        "plan to",
        "will ",
    ]
    .iter()
    .any(|m| quote.contains(m))
    {
        return false;
    }
    let negative = [
        "没完成",
        "未完成",
        "没锻炼",
        "没运动",
        "not done",
        "not completed",
        "did not",
        "didn't",
    ]
    .iter()
    .any(|m| quote.contains(m));
    if completed {
        !negative
            && [
                "完成了",
                "已完成",
                "锻炼了",
                "运动了",
                "运动完成",
                "锻炼完成",
                "做完了",
                "finished",
                "completed",
                "i exercised",
                "i worked out",
                "is done",
                "was done",
            ]
            .iter()
            .any(|m| quote.contains(m))
    } else {
        negative
            || [
                "撤回",
                "撤销",
                "只撤本地",
                "只撤滴答",
                "取消打卡",
                "记错",
                "undo",
                "withdraw",
                "uncheck",
                "incorrect completion",
            ]
            .iter()
            .any(|m| quote.contains(m))
    }
}

pub(super) const GUIDANCE: &str = "For an eligible existing completion-type Habit, a clear report such as yesterday's exercise was completed authorizes its local fact and uniquely mapped Dida Habit by default. Use setLocalHabitCompletion with scope=both, concrete resolved targetDate, stable habitKey and executionMode=execute; do not force review merely because external projection is stale. The local operation writes only the existing canonical local endpoint; its receipt supplies original scope and mapped source identity. Perform the external endpoint through the discovered native upsert_habit_checkins schema, reading that exact ID/date first and after writing. Desired status is 2 for completion and 0 for withdrawal; if current source already confirms desired state, preserve it and do not repeat the check-in. Record actual time/duration/threshold wording in a dated Daily Record operation, never derive minutes or occurred-time from opTime/save time. Only actual supported source fields may be sent. For corrections/withdrawals consult habitCompletionTargets.origins and use scope=original and the original receipt's mapped ID/scope. Legacy local-only receipts remain local-only; never silently expand their withdrawal. Explicit only-local uses scope=local; explicit only-Dida uses native MCP only. Respect the original source/date and resolve ambiguous IDs, never pair names or create a local Habit. Existing local identity/revision can save when Dida is stale/unavailable, and Dida can save when local storage fails; preserve each successful endpoint, no rollback or cross-source transaction. Query unknown endpoint state before retry; do not repeat confirmed local history/check-ins. Continue still-authorized unconfirmed remaining work in the current request. After completion or withdrawal, query fresh native Habit catalog/object and full-window adjacent-envelope check-ins and call dashboard_refresh_habits with the verified mappings and exact factual authorizationQuote. Pre-write reads cannot publish a post-write projection; host verification reads are not producer evidence. Report local, Dida and projection outcomes independently. Local OR external counts once; withdrawing only one end can leave overall completion true. A failed refresh leaves display unconfirmed/retained, not refreshed.";

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn exact_date_scope_cannot_be_omitted_by_a_shorter_effect_quote() {
        let message="2026-10-03运动完成，只记本地；2026-10-02运动完成，只记滴答。";
        assert_eq!(scope_for_effect(message,"2026-10-03运动完成","exercise","Exercise","2026-10-03"),Some("local"));
        assert_eq!(scope_for_effect(message,"2026-10-02运动完成","exercise","Exercise","2026-10-02"),Some("external"));
        assert_eq!(scope_for_effect("2026-10-03运动完成，只记本地又只记滴答。","2026-10-03运动完成","exercise","Exercise","2026-10-03"),Some("ambiguous"));
        assert_eq!(scope_for_effect("2026-10-03运动完成，只记本地又只记滴答。","2026-10-03运动完成，只记本地","exercise","Exercise","2026-10-03"),Some("ambiguous"));
    }
    #[test]
    fn destination_scope_is_per_habit_clause_and_never_inherited_from_tasks_or_other_names() {
        assert_eq!(
            scope_for_habit(
                "买菜只在本地任务里创建。今天运动完成了。",
                "exercise",
                "Exercise"
            ),
            None
        );
        assert_eq!(
            scope_for_habit("运动完成了，只记本地。", "exercise", "Exercise"),
            Some("local")
        );
        let text = "运动完成了，营养药只记本地。";
        assert_eq!(scope_for_habit(text, "exercise", "Exercise"), None);
        assert_eq!(scope_for_habit(text, "nutrition", "营养药"), Some("local"));
        let text = "运动只记本地。营养药只记滴答。";
        assert_eq!(scope_for_habit(text, "exercise", "Exercise"), Some("local"));
        assert_eq!(
            scope_for_habit(text, "nutrition", "营养药"),
            Some("external")
        );
    }
}
