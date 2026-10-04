//! Outcome verification for native MCP actions, using the MCP's own reads.
//! This never dispatches business writes or substitutes Dashboard tool schemas.
use super::{dida, stable_effect_fingerprint, ExternalToolActionView};
use serde_json::{json, Value};

pub(super) const WRITE_TOOLS: &[&str] = &[
    "create_task",
    "update_task",
    "complete_task",
    "delete_task",
    "move_task",
    "create_habit",
    "update_habit",
    "upsert_habit_checkins",
];

pub(super) fn is_mutation(action: &ExternalToolActionView) -> bool {
    action.source_id == dida::SERVER && WRITE_TOOLS.contains(&action.tool_id.as_str())
}

pub(super) fn unresolved(action: &ExternalToolActionView) -> bool {
    is_mutation(action)
        && !["saved", "failed"].contains(&action.status.as_str())
        && action
            .verification
            .as_ref()
            .and_then(|v| v.get("sourceObserved"))
            .and_then(Value::as_bool)
            != Some(true)
}

fn decoded_payload(result: &Value) -> Value {
    let structured = result
        .get("structuredContent")
        .filter(|v| !v.is_null())
        .cloned();
    let decoded = structured.or_else(|| {
        result
            .get("content")
            .and_then(Value::as_array)
            .and_then(|content| {
                content.iter().find_map(|block| {
                    block
                        .get("text")
                        .and_then(Value::as_str)
                        .and_then(|text| serde_json::from_str(text).ok())
                })
            })
    });
    decoded.unwrap_or_else(|| result.clone())
}

fn payload(result: &Value) -> Value {
    let decoded = decoded_payload(result);
    decoded.get("result").cloned().unwrap_or(decoded)
}

fn complete_source_envelope(value: &Value) -> bool {
    !value.get("error").is_some_and(|error| !error.is_null())
        && value.get("success") != Some(&json!(false))
        && !["nextCursor", "next_cursor"]
            .iter()
            .any(|key| value.get(key).is_some_and(|cursor| !cursor.is_null()))
        && !["partial", "hasMore", "has_more"]
            .iter()
            .any(|key| value.get(key) == Some(&json!(true)))
}

fn normalized_field(key: &str, value: &Value) -> Value {
    if let Some(number) = value.as_f64().filter(|number| {
        number.is_finite() && number.fract() == 0.0 && number.abs() < 9_007_199_254_740_992.0
    }) {
        return json!(number as i64);
    }
    if ["startDate", "dueDate"].contains(&key)
        && (value == "1970-01-01T00:00:00.000+0000" || value == "")
    {
        return Value::Null;
    }
    if ["startDate", "dueDate", "completedTime", "opTime", "time"].contains(&key) {
        if let Some(epoch) = value.as_str().and_then(iso_epoch_millis) {
            return json!({"epochMillis":epoch});
        }
    }
    value.clone()
}

// Normalize only explicit offset ISO instants; date-only or unknown times stay
// unchanged. This does not infer local time, a timezone or a completion date.
pub(super) fn iso_epoch_millis(text: &str) -> Option<i64> {
    let (date, time) = text.split_once('T')?;
    let time = if matches!(time.get(5..6), Some("+" | "-" | "Z")) {
        format!("{}:00{}", time.get(..5)?, time.get(5..)?)
    } else { time.to_owned() };
    super::validate_date(date).ok()?;
    let year: i64 = date.get(..4)?.parse().ok()?;
    let month: i64 = date.get(5..7)?.parse().ok()?;
    let day: i64 = date.get(8..10)?.parse().ok()?;
    let hour: i64 = time.get(..2)?.parse().ok()?;
    let minute: i64 = time.get(3..5)?.parse().ok()?;
    let second: i64 = time.get(6..8)?.parse().ok()?;
    if hour > 23 || minute > 59 || second > 59 {
        return None;
    }
    let remainder = time.get(8..)?;
    let offset_index = remainder.find(['+', '-', 'Z'])?;
    let fraction = remainder
        .get(..offset_index)?
        .strip_prefix('.')
        .unwrap_or("");
    if !fraction.chars().all(|c| c.is_ascii_digit()) {
        return None;
    }
    let millis: i64 = format!("{fraction:0<3}").get(..3)?.parse().ok()?;
    let offset = remainder.get(offset_index..)?;
    let offset_minutes = if offset == "Z" {
        0
    } else {
        let sign = match offset.get(..1)? {
            "+" => 1,
            "-" => -1,
            _ => return None,
        };
        let digits = offset.get(1..)?.replace(':', "");
        if digits.len() != 4 {
            return None;
        }
        let hours: i64 = digits.get(..2)?.parse().ok()?;
        let minutes: i64 = digits.get(2..)?.parse().ok()?;
        if hours > 23 || minutes > 59 {
            return None;
        }
        sign * (hours * 60 + minutes)
    };
    let year = year - i64::from(month <= 2);
    let era = year.div_euclid(400);
    let yoe = year - era * 400;
    let doy = (153 * (month + if month > 2 { -3 } else { 9 }) + 2) / 5 + day - 1;
    let days = era * 146097 + yoe * 365 + yoe / 4 - yoe / 100 + doy - 719468;
    Some(
        days * 86400000 + hour * 3600000 + minute * 60000 + second * 1000 + millis
            - offset_minutes * 60000,
    )
}

fn field_fingerprint(key: &str, value: &Value) -> String {
    stable_effect_fingerprint(&normalized_field(key, value))
}

fn fingerprints(fields: &Value) -> Value {
    Value::Object(
        fields
            .as_object()
            .into_iter()
            .flatten()
            .filter(|(key, _)| key.as_str() != "etag")
            .map(|(key, value)| (key.clone(), json!(field_fingerprint(key, value))))
            .collect(),
    )
}

fn stamp_envelope(stamp: i64) -> Option<(i64, i64)> {
    let text = stamp.to_string();
    if text.len() != 8 {
        return None;
    }
    let date = format!("{}-{}-{}", &text[..4], &text[4..6], &text[6..]);
    let previous = super::shift_calendar_date(&date, -1)?
        .replace('-', "")
        .parse()
        .ok()?;
    let next = super::shift_calendar_date(&date, 1)?
        .replace('-', "")
        .parse()
        .ok()?;
    Some((previous, next))
}

fn check(tool: &str, args: Value, fields: Value, selector: Value) -> Value {
    json!({"tool":tool,"arguments":args,"fields":fingerprints(&fields),"selector":selector})
}

fn add_source_identity(action: &mut ExternalToolActionView) {
    let mut identities = Vec::new();
    for entry in action
        .verification
        .as_ref()
        .and_then(|v| v.get("checks"))
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        let id = entry["arguments"]["task_id"]
            .as_str()
            .or_else(|| entry["arguments"]["habit_id"].as_str())
            .or_else(|| entry["selector"]["habitId"].as_str());
        if let Some(id) = id {
            let id = super::bounded_string(id, 160);
            if !identities.contains(&id) && identities.len() < 16 {
                identities.push(id);
            }
        }
    }
    if !identities.is_empty() {
        action
            .result_summary
            .push_str(&format!(" Source object IDs: {}.", identities.join(", ")));
    }
}

// Store stable source IDs and expected field fingerprints, not raw task content
// or large MCP results. This survives response/history loss and restart.
pub(super) fn attach_verification(action: &mut ExternalToolActionView, item: &Value) {
    if !is_mutation(action) {
        return;
    }
    let args = item.get("arguments").unwrap_or(&Value::Null);
    let result = payload(item.get("result").unwrap_or(&Value::Null));
    let id = |key: &str| args.get(key).and_then(Value::as_str).map(str::to_owned);
    let returned_id = result.get("id").and_then(Value::as_str).map(str::to_owned);
    let mut checks = Vec::new();
    match action.tool_id.as_str() {
        "create_task" | "update_task" | "complete_task" | "delete_task" => {
            let task = args.get("task").cloned().unwrap_or(json!({}));
            let task_id = if action.tool_id == "create_task" {
                returned_id.clone()
            } else {
                id("task_id").or_else(|| task.get("id").and_then(Value::as_str).map(str::to_owned))
            };
            if let Some(task_id) = task_id {
                let mut expected = task.as_object().cloned().unwrap_or_default();
                expected.insert("id".into(), json!(task_id));
                if action.tool_id == "complete_task" {
                    expected.insert("status".into(), json!(2));
                }
                let mut entry = check(
                    "get_task_by_id",
                    json!({"task_id":task_id}),
                    Value::Object(expected),
                    Value::Null,
                );
                if action.tool_id == "delete_task" {
                    entry["absent"] = json!(true);
                }
                checks.push(entry);
            } else if let Some(title) = task
                .get("title")
                .and_then(Value::as_str)
                .filter(|title| title.len() <= 500)
            {
                let mut fields = task.as_object().cloned().unwrap_or_default();
                fields.remove("id");
                let mut entry = check(
                    "search_task",
                    json!({"query":title}),
                    Value::Object(fields),
                    Value::Null,
                );
                entry["identityRecoveryOnly"] = json!(true);
                checks.push(entry);
            }
        }
        "move_task" => {
            for movement in args
                .get("moves")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
            {
                if let (Some(task_id), Some(project)) = (
                    movement.get("taskId").and_then(Value::as_str),
                    movement.get("toProjectId").and_then(Value::as_str),
                ) {
                    checks.push(check(
                        "get_task_by_id",
                        json!({"task_id":task_id}),
                        json!({"id":task_id,"projectId":project}),
                        Value::Null,
                    ));
                }
            }
        }
        "create_habit" | "update_habit" => {
            let habit = args.get("habit").cloned().unwrap_or(json!({}));
            let habit_id = if action.tool_id == "create_habit" {
                returned_id.clone()
            } else {
                id("habit_id")
                    .or_else(|| habit.get("id").and_then(Value::as_str).map(str::to_owned))
            };
            if let Some(habit_id) = habit_id {
                let mut expected = habit.as_object().cloned().unwrap_or_default();
                expected.insert("id".into(), json!(habit_id));
                checks.push(check(
                    "get_habit",
                    json!({"habit_id":habit_id}),
                    Value::Object(expected),
                    Value::Null,
                ));
            } else if habit.get("name").and_then(Value::as_str).is_some() {
                let mut fields = habit.as_object().cloned().unwrap_or_default();
                fields.remove("id");
                let mut entry = check("list_habits", json!({}), Value::Object(fields), Value::Null);
                entry["identityRecoveryOnly"] = json!(true);
                checks.push(entry);
            }
        }
        "upsert_habit_checkins" => {
            if let (Some(habit_id), Some(data)) = (id("habit_id"), args.get("checkin_data")) {
                if let Some(stamp) = data.get("stamp").and_then(Value::as_i64) {
                    if let Some((from_stamp, to_stamp)) = stamp_envelope(stamp) {
                        let mut read_args = json!({"habit_ids":[habit_id],"from_stamp":from_stamp,"to_stamp":to_stamp});
                        if let Some(timezone) = args.get("client_timezone") {
                            read_args["client_timezone"] = timezone.clone();
                        }
                        checks.push(check(
                            "get_habit_checkins",
                            read_args,
                            data.clone(),
                            json!({"habitId":habit_id,"stamp":stamp}),
                        ));
                    }
                }
            }
        }
        _ => {}
    }
    action.verification = Some(json!({"checks":checks}));
    if action.tool_id=="upsert_habit_checkins" {
        action.verification.as_mut().unwrap()["habitCheckin"] = json!({"habitId":args.get("habit_id"),"stamp":args["checkin_data"].get("stamp"),"status":args["checkin_data"].get("status")});
    }
    let native_failure = item.get("status").and_then(Value::as_str) == Some("failed")
        || item
            .get("result")
            .and_then(|result| result.get("isError"))
            .and_then(Value::as_bool)
            == Some(true)
        || result.get("error").is_some();
    action.status = "unknown".into();
    action.result_summary = if native_failure {
        "Dida reported failure. The external outcome has not been assumed saved; query source state before retrying.".into()
    } else {
        "External mutation outcome awaits source readback. The tool receipt alone does not prove saved state.".into()
    };
    add_source_identity(action);
}

fn task_absent(response: &Value, task_id: &str) -> bool {
    // Native MCP source observed after deleting an owned object. Only its
    // resource_not_found code for this exact stable identity proves absence.
    let prefix = format!("Error executing tool get_task_by_id: TickTick API error [resource_not_found]: task not found: {task_id} (errorId:");
    response.get("isError").and_then(Value::as_bool) == Some(true)
        && response
            .get("content")
            .and_then(Value::as_array)
            .is_some_and(|blocks| {
                blocks.iter().any(|block| {
                    block
                        .get("text")
                        .and_then(Value::as_str)
                        .is_some_and(|text| text.starts_with(&prefix))
                })
            })
}

fn matching_payload(value: &Value, selector: &Value) -> Option<Value> {
    if selector.is_null() {
        return Some(value.clone());
    }
    let habit = selector.get("habitId")?.as_str()?;
    let stamp = selector.get("stamp")?.as_i64()?;
    value
        .as_array()?
        .iter()
        .filter(|doc| doc.get("habitId").and_then(Value::as_str) == Some(habit))
        .flat_map(|doc| {
            doc.get("checkins")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
        })
        .find(|entry| entry.get("stamp").and_then(Value::as_i64) == Some(stamp))
        .cloned()
}

// Read-only native RPCs are also used during recovery. Never replay a write.
pub(super) fn verify(
    action: &mut ExternalToolActionView,
    mut read: impl FnMut(&str, Value) -> Result<Value, String>,
) {
    if !is_mutation(action) {
        return;
    }
    let Some(checks) = action
        .verification
        .as_ref()
        .and_then(|v| v.get("checks"))
        .and_then(Value::as_array)
        .filter(|v| !v.is_empty())
    else {
        action.status = "unknown".into();
        action.result_summary = "The external object identity is unavailable. Read the source and resolve it before any retry; no write was replayed.".into();
        return;
    };
    let mut confirmed = true;
    let mut all_sources_observed = true;
    for entry in checks {
        let Some(tool) = entry
            .get("tool")
            .and_then(Value::as_str)
            .filter(|tool| dida::READ_TOOLS.contains(tool))
        else {
            confirmed = false;
            all_sources_observed = false;
            break;
        };
        let Ok(response) = read(tool, entry.get("arguments").cloned().unwrap_or(json!({}))) else {
            confirmed = false;
            all_sources_observed = false;
            break;
        };
        let decoded = decoded_payload(&response);
        if !complete_source_envelope(&response) || !complete_source_envelope(&decoded) {
            confirmed = false; all_sources_observed = false; break;
        }
        let value = decoded.get("result").cloned().unwrap_or(decoded);
        if entry.get("absent").and_then(Value::as_bool) == Some(true) {
            let task_id = entry["arguments"]["task_id"].as_str().unwrap_or("");
            if !task_absent(&response, task_id) {
                confirmed = false;
                if response.get("isError").and_then(Value::as_bool) == Some(true)
                    || value.get("error").is_some()
                {
                    all_sources_observed = false;
                }
            }
            continue;
        }
        if tool == "get_task_by_id" && task_absent(&response, entry["arguments"]["task_id"].as_str().unwrap_or("")) {
            // Exact current absence is observed source state, but cannot prove
            // that the earlier historical mutation succeeded before deletion.
            confirmed = false; continue;
        }
        if response.get("isError").and_then(Value::as_bool) == Some(true)
            || value.get("error").is_some()
        {
            confirmed = false;
            all_sources_observed = false;
            break;
        }
        if entry.get("identityRecoveryOnly").and_then(Value::as_bool) == Some(true) {
            // Native creation ignores caller IDs. Without the source receipt,
            // query candidates but never pretend a match proves this creation.
            // Successful observation permits unrelated current authorized work;
            // the earlier creation remains unknown and must not be replayed.
            confirmed = false;
            continue;
        }
        let Some(actual) = matching_payload(&value, &entry["selector"]) else {
            // Only a successfully queried adjacent-day envelope can prove an
            // unmarked check-in via absence; other missing requested fields
            // remain unknown.
            let only_unmark_fields = entry["fields"].as_object().is_some_and(|fields| {
                fields
                    .keys()
                    .all(|key| ["stamp", "status"].contains(&key.as_str()))
            });
            let expected_zero = only_unmark_fields
                && entry["fields"]["status"].as_str()
                    == Some(field_fingerprint("status", &json!(0)).as_str());
            if !(tool == "get_habit_checkins" && expected_zero && value.as_array().is_some()) {
                confirmed = false;
            }
            continue;
        };
        let Some(fields) = entry.get("fields").and_then(Value::as_object) else {
            confirmed = false;
            break;
        };
        if fields.iter().any(|(key, expected)| {
            Some(field_fingerprint(
                key,
                actual.get(key).unwrap_or(&Value::Null),
            ))
            .as_deref()
                != expected.as_str()
        }) {
            confirmed = false;
        }
    }
    if let Some(verification) = action.verification.as_mut() {
        verification["sourceObserved"] = json!(all_sources_observed);
    }
    action.status = if confirmed { "saved" } else { "unknown" }.into();
    action.result_summary = if confirmed {
        "Current Dida source readback confirms the requested outcome for the recorded stable object identity. No write was replayed; source confirmation does not reconstruct a lost original receipt.".into()
    } else if all_sources_observed {
        "The current source was read, but differs from the earlier requested outcome. That earlier effect remains unknown; preserve later source edits and continue only the current user's authorized request, without replaying the old effect.".into()
    } else {
        "Current Dida readback is unavailable. Preserve any confirmed effects, resolve the source state before retrying, and do not repeat creation while unknown.".into()
    };
    add_source_identity(action);
}

pub(super) fn with_outcomes(mut text: String, actions: &[ExternalToolActionView]) -> String {
    let writes = actions
        .iter()
        .filter(|action| is_mutation(action))
        .collect::<Vec<_>>();
    if !writes.is_empty() {
        text.push_str("\n\nDida source outcomes:");
        for action in writes {
            text.push_str(&format!(
                "\n- {}: {}. {}",
                action.tool_id, action.status, action.result_summary
            ));
        }
    }
    text
}

#[cfg(test)]
fn creation_namespace(execution_id: &str) -> String {
    let value =
        stable_effect_fingerprint(&json!({"source":dida::SERVER,"executionId":execution_id}));
    // Existing fingerprints are hexadecimal; ObjectId accepts exactly 24.
    format!("{}00000000", &value[..16])
}

pub(super) const GUIDANCE: &str = "Manual Dida writes use the existing discovered MCP schemas directly. Execute only the exact current user's authorized external effect: new tasks default to Dashboard unless Dida is specified, existing external objects retain their source and stable IDs, and clear reported completion can authorize that matching external object. Possibilities and discussion authorize no mutation. Resolve same-name or date ambiguity before writing. Putting a local Task into Dida needs explicit copy versus move intent; never delete the local original by default. Read the current object before changing it and preserve unrelated fields. Use actual Task status semantics exposed by the MCP (0 active, -1 abandoned, 2 completed), and check-in status semantics (0 unmarked, 1 not completed, 2 completed); do not guess Habit status/deletion meanings or pretend an unsupported real-time field exists. Keep historical check-in stamp distinct from opTime and supply the actual user timezone. Check-in range endpoints can exclude an exact-day query; read an adjacent-day envelope and select the requested stamp exactly before confirming saved state. The selected MCP generates creation IDs and ignores caller IDs. Record the returned stable source ID immediately. If a creation receipt is lost, reread search_task for its exact title or list_habits for its exact name and inspect current source candidates; matching names alone do not prove identity. Preserve that creation as unknown when identity cannot be confirmed, never repeat it automatically, and continue only the still-authorized remaining or unrelated current actions. Never claim saved because a mutation tool returned: read back the exact stable source object, verify requested fields, and separately report each saved/failed/unknown effect. Unknown effects must be read back before retries; sourceObserved means current source was read, not that the old requested effect succeeded. Preserve later edits and do not replay old effects to match stale fingerprints. do not recreate an object whose original outcome or identity remains unknown. Automatic and review-first rounds cannot mutate Dida. Prior external action metadata is history and recovery context, never permission to replay an old request. A request to review first gets a textual proposal only. Dida source changes do not change Dashboard data or refresh the Habit snapshot by themselves.";

#[cfg(test)]
mod tests {
    use super::*;
    // Only transport/source responses are scripted. Application persistence,
    // current-round capability gating, Task saves and the verifier are production.
    #[derive(Clone)]
    struct WorkflowVault(std::path::PathBuf);
    impl crate::today::TodayWorkspacePersistence for WorkflowVault {
        fn load_selected_vault(&self) -> Result<Option<std::path::PathBuf>, String> {
            Ok(Some(self.0.clone()))
        }
        fn save_selected_vault(&self, _: &std::path::Path) -> Result<(), String> {
            Ok(())
        }
    }
    #[derive(Clone, Copy)]
    struct WorkflowClock;
    impl crate::today::TodayClock for WorkflowClock {
        fn current_date(&self) -> String {
            "2026-09-27".into()
        }
        fn current_time_label(&self) -> String {
            "12:00".into()
        }
        fn current_timestamp_label(&self) -> String {
            "2026-09-27T12:00:00+00:00".into()
        }
    }
    impl crate::collaboration::CollaborationClock for WorkflowClock {
        fn current_timestamp(&self) -> String {
            "2026-09-27T12:00:00+00:00".into()
        }
        fn current_date(&self) -> String {
            "2026-09-27".into()
        }
        fn current_time(&self) -> String {
            "12:00".into()
        }
    }
    struct WorkflowContext;
    impl crate::collaboration::CollaborationContextSource for WorkflowContext {
        fn current_vault_key(&self) -> Result<Option<String>, String> {
            Ok(Some("owned-fixture".into()))
        }
        fn read_context(
            &self,
            _: Option<&str>,
            date: &str,
        ) -> Result<crate::collaboration::CollaborationContextView, String> {
            use crate::collaboration::{CollaborationContextView, ContextPaneView};
            let empty = || ContextPaneView {
                state: "empty".into(),
                message: "Confirmed empty fixture context".into(),
                items: vec![],
            };
            Ok(CollaborationContextView {
                date: date.into(),
                vault_name: Some("synthetic".into()),
                daily_record: empty(),
                tasks: empty(),
                task_revision: None,
                task_target_binding: None,
                task_records: vec![],
                task_lists: vec![],
                habits: empty(),
            })
        }
    }
    struct WorkflowSource {
        response: Result<Value, String>,
        scopes: Vec<bool>,
        writes: usize,
        starts: usize,
    }
    struct WorkflowTransport(std::sync::Arc<std::sync::Mutex<WorkflowSource>>);
    impl crate::collaboration::AppServerTransport for WorkflowTransport {
        fn inspect(&mut self) -> Result<crate::collaboration::RuntimeConnectionView, String> {
            Ok(crate::collaboration::RuntimeConnectionView {
                executable_path: Some("owned-fixture".into()),
                version: Some("fixture".into()),
                experimental: true,
                read_only_text_turns_available: true,
                text_turn_unavailable_reason: None,
                authenticated: true,
                auth_mode: Some("chatgpt".into()),
                account_email: None,
                plan_type: None,
                models: vec![],
                selected_model: None,
                selected_reasoning_effort: None,
                error: None,
            })
        }
        fn start_chatgpt_login(&mut self) -> Result<(), String> {
            Err("No login in fixture".into())
        }
        fn start_thread(&mut self, _: Option<&str>, _: &str) -> Result<String, String> {
            let mut source = self.0.lock().unwrap();
            source.starts += 1;
            Ok(format!("owned-thread-{}", source.starts))
        }
        fn resume_thread(&mut self, _: &str) -> Result<(), String> {
            Ok(())
        }
        fn configure_external_writes(&mut self, allowed: bool) {
            self.0.lock().unwrap().scopes.push(allowed);
        }
        fn reconcile_external_action(
            &mut self,
            mut action: ExternalToolActionView,
        ) -> ExternalToolActionView {
            let response = self.0.lock().unwrap().response.clone();
            verify(&mut action, |_, _| response.clone());
            action
        }
        fn send_turn(
            &mut self,
            _: crate::collaboration::RuntimeTurnRequest,
        ) -> Result<crate::collaboration::RuntimeTurnResult, String> {
            unreachable!()
        }
        fn send_turn_with_external_actions(
            &mut self,
            request: crate::collaboration::RuntimeTurnRequest,
            _: std::sync::Arc<std::sync::atomic::AtomicBool>,
            tools: Option<crate::collaboration::RuntimeDynamicToolHandler>,
            actions: Option<crate::collaboration::RuntimeExternalActionHandler>,
            _: Option<crate::collaboration::RuntimeExternalApprovalHandler>,
        ) -> Result<crate::collaboration::RuntimeTurnResult, String> {
            let turn = format!("turn-{}", request.execution_id);
            let mut effects = vec![];
            if request.user_text.starts_with("创建买菜任务") {
                let result = tools.unwrap()(crate::collaboration::RuntimeDynamicToolCall {
                    thread_id: request.thread_id.clone(),
                    turn_id: turn.clone(),
                    call_id: "local-owned-task".into(),
                    tool: "dashboard_task_operation".into(),
                    arguments: json!({"operation":"createTask","name":"买菜","date":null,"content":null,"time":null,"listId":null,"executionMode":"execute","authorizationQuote":"创建买菜任务"}),
                });
                assert!(result.success, "{:?}", result);
                let mut effect = if request.user_text.contains("withdraw") {
                    action(
                        "upsert_habit_checkins",
                        json!({"habit_id":"owned-habit","checkin_data":{"stamp":20260927,"status":0}}),
                        json!({}),
                    )
                } else {
                    action(
                        "complete_task",
                        json!({"task_id":"owned-task-a"}),
                        json!({}),
                    )
                };
                self.0.lock().unwrap().writes += 1;
                effect = self.reconcile_external_action(effect);
                actions.as_ref().unwrap()(effect.clone());
                effects.push(effect);
            } else if request.user_text == "当前明确授权的其他滴答任务B" {
                assert_eq!(self.0.lock().unwrap().scopes.last(), Some(&true));
                let mut effect = action(
                    "create_task",
                    json!({"task":{"title":"Owned unrelated B"}}),
                    json!({"id":"owned-task-b"}),
                );
                verify(&mut effect, |_, _| {
                    Ok(
                        json!({"isError":false,"structuredContent":{"id":"owned-task-b","title":"Owned unrelated B"}}),
                    )
                });
                self.0.lock().unwrap().writes += 1;
                actions.as_ref().unwrap()(effect.clone());
                effects.push(effect);
            }
            Ok(crate::collaboration::RuntimeTurnResult {
                text: "Saved local receipt and independent external readback outcomes.".into(),
                runtime_turn_id: Some(turn),
                stopped: false,
                external_actions: effects,
            })
        }
    }
    fn workflow_app(
        root: &std::path::Path,
        source: std::sync::Arc<std::sync::Mutex<WorkflowSource>>,
    ) -> crate::collaboration::CollaborationApplication {
        use crate::collaboration::{
            CollaborationApplication, FileCollaborationStore, TaskApplicationCollaborationAdapter,
        };
        use crate::tasks::{FileTaskStore, TaskApplication};
        CollaborationApplication::with_adapters(
            std::sync::Arc::new(FileCollaborationStore::new(
                root.join("profile/conversation.json"),
            )),
            Box::new(WorkflowTransport(source)),
            std::sync::Arc::new(WorkflowContext),
            std::sync::Arc::new(WorkflowClock),
            root.join("runtime"),
            "Scripted native readback fixture".into(),
        )
        .with_task_service(std::sync::Arc::new(
            TaskApplicationCollaborationAdapter::new(TaskApplication::new(
                WorkflowVault(root.into()),
                WorkflowClock,
                FileTaskStore,
            )),
        ))
    }
    fn workflow_submit(
        app: &crate::collaboration::CollaborationApplication,
        id: &str,
        text: &str,
    ) -> crate::collaboration::CollaborationSessionView {
        app.submit_message("owned-fixture", id, "2026-09-27", text)
            .unwrap();
        for _ in 0..300 {
            let session = app.session("owned-fixture", id).unwrap();
            if session.run_state == "completed" {
                return session;
            }
            assert_ne!(session.run_state, "error", "{}", session.progress);
            std::thread::sleep(std::time::Duration::from_millis(10));
        }
        panic!("Owned readback workflow did not finish");
    }
    #[test]
    fn highest_native_readback_workflow_preserves_saved_local_receipt_and_never_replays_unknown_effects(
    ) {
        use std::sync::{Arc, Mutex};
        let variants = [
            json!({"partial":true}),
            json!({"hasMore":true}),
            json!({"nextCursor":"next"}),
            json!({"success":false}),
        ];
        for (index, mut marker) in variants.into_iter().enumerate() {
            let root = std::env::temp_dir().join(format!("pd-readback-{}-{index}", std::process::id()));
            std::fs::create_dir_all(root.join(".obsidian")).unwrap();
            std::fs::create_dir_all(root.join("life/Journal/Daily")).unwrap();
            marker["result"] = json!([]);
            let source = Arc::new(Mutex::new(WorkflowSource {
                response: Ok(json!({"isError":false,"structuredContent":marker})),
                scopes: vec![],
                writes: 0,
                starts: 0,
            }));
            let app = workflow_app(&root, Arc::clone(&source));
            let session = app.create_default_session().unwrap();
            let saved = workflow_submit(
                &app,
                &session.id,
                "创建买菜任务；withdraw owned native check-in",
            );
            assert_eq!(saved.task_operations[0].status, "applied");
            assert_eq!(saved.messages[0].external_actions[0].status, "unknown");
            assert_eq!(
                saved.messages[0].external_actions[0]
                    .verification
                    .as_ref()
                    .unwrap()["sourceObserved"],
                false
            );
            let task_id = saved.task_operations[0].task_id.clone();
            let revision = saved.task_operations[0].result_revision.clone();
            app.shutdown().unwrap();
            let app = workflow_app(&root, Arc::clone(&source));
            let still = workflow_submit(&app, &session.id, "读取当前剩余请求，不重复先前保存");
            assert_eq!(source.lock().unwrap().scopes.last(), Some(&false));
            assert_eq!(still.task_operations.len(), 1);
            assert_eq!(still.task_operations[0].task_id, task_id);
            assert_eq!(still.task_operations[0].result_revision, revision);
            source.lock().unwrap().response =
                Ok(json!({"isError":false,"structuredContent":{"result":[]}}));
            let confirmed = workflow_submit(&app, &session.id, "读取当前剩余请求，不重复先前保存");
            assert_eq!(confirmed.messages[0].external_actions[0].status, "saved");
            assert_eq!(source.lock().unwrap().scopes.last(), Some(&true));
            assert_eq!(source.lock().unwrap().writes, 1);
            assert_eq!(confirmed.task_operations.len(), 1);
            assert_eq!(confirmed.task_operations[0].task_id, task_id);
            app.shutdown().unwrap();
            std::fs::remove_dir_all(root).unwrap();
        }
    }
    #[test]
    fn highest_exact_task_absence_observes_current_source_without_claiming_old_success_or_blocking_unrelated_write(
    ) {
        use std::sync::{Arc, Mutex};
        for restart in [false, true] {
            let root = std::env::temp_dir().join(format!("pd-absent-{}-{restart}", std::process::id()));
            std::fs::create_dir_all(root.join(".obsidian")).unwrap();
            std::fs::create_dir_all(root.join("life/Journal/Daily")).unwrap();
            let source = Arc::new(Mutex::new(WorkflowSource {
                response: Err("Network/authentication unavailable".into()),
                scopes: vec![],
                writes: 0,
                starts: 0,
            }));
            let app = workflow_app(&root, Arc::clone(&source));
            let session = app.create_default_session().unwrap();
            workflow_submit(
                &app,
                &session.id,
                "创建买菜任务；complete owned native Task A",
            );
            let app = if restart {
                app.shutdown().unwrap();
                workflow_app(&root, Arc::clone(&source))
            } else {
                app
            };
            let unavailable = workflow_submit(&app, &session.id, "读取当前剩余请求，不重复先前保存");
            assert_eq!(
                unavailable.messages[0].external_actions[0].status,
                "unknown"
            );
            assert_eq!(source.lock().unwrap().scopes.last(), Some(&false));
            source.lock().unwrap().response = Ok(
                json!({"isError":true,"content":[{"type":"text","text":"Error executing tool get_task_by_id: TickTick API error [resource_not_found]: task not found: owned-task-a (errorId: synthetic)"}]}),
            );
            let current = workflow_submit(&app, &session.id, "当前明确授权的其他滴答任务B");
            assert_eq!(current.messages[0].external_actions[0].status, "unknown");
            assert_eq!(
                current.messages[0].external_actions[0]
                    .verification
                    .as_ref()
                    .unwrap()["sourceObserved"],
                true
            );
            assert_eq!(
                current
                    .messages
                    .iter()
                    .flat_map(|message| &message.external_actions)
                    .last()
                    .unwrap()
                    .status,
                "saved"
            );
            assert_eq!(current.task_operations.len(), 1);
            assert_eq!(source.lock().unwrap().writes, 2);
            let current = workflow_submit(&app, &session.id, "读取当前剩余请求，不重复先前保存");
            assert_eq!(source.lock().unwrap().scopes.last(), Some(&true));
            assert_eq!(source.lock().unwrap().writes, 2);
            assert_eq!(current.task_operations.len(), 1);
            app.shutdown().unwrap();
            std::fs::remove_dir_all(root).unwrap();
        }
    }

    #[test]
    fn incomplete_empty_withdrawal_readback_is_unknown_and_exact_task_absence_is_observed() {
        for marker in [
            json!({"partial":true}),
            json!({"hasMore":true}),
            json!({"nextCursor":"next"}),
            json!({"success":false}),
        ] {
            let mut effect = action(
                "upsert_habit_checkins",
                json!({"habit_id":"id","checkin_data":{"stamp":20260927,"status":0}}),
                json!({}),
            );
            let mut envelope = marker;
            envelope["result"] = json!([]);
            verify(&mut effect, |_, _| {
                Ok(json!({"isError":false,"structuredContent":envelope}))
            });
            assert_eq!(effect.status, "unknown");
            assert!(unresolved(&effect));
        }
        let mut effect = action(
            "upsert_habit_checkins",
            json!({"habit_id":"id","checkin_data":{"stamp":20260927,"status":0}}),
            json!({}),
        );
        verify(&mut effect, |_, _| {
            Ok(json!({"isError":false,"structuredContent":{"result":[]}}))
        });
        assert_eq!(effect.status, "saved");
        let mut old = action("complete_task", json!({"task_id":"id"}), json!({}));
        verify(&mut old, |_, _| {
            Ok(
                json!({"isError":true,"content":[{"type":"text","text":"Error executing tool get_task_by_id: TickTick API error [resource_not_found]: task not found: id (errorId: owned-test)"}]}),
            )
        });
        assert_eq!(old.status, "unknown");
        assert!(!unresolved(&old));
        verify(&mut old, |_, _| Err("network unavailable".into()));
        assert_eq!(old.status, "unknown");
        assert!(unresolved(&old));
    }

    fn action(tool: &str, args: Value, result: Value) -> ExternalToolActionView {
        let mut action = ExternalToolActionView {
            action_id: "thread:item".into(),
            source_id: dida::SERVER.into(),
            source_name: "Dida".into(),
            tool_id: tool.into(),
            status: "completed".into(),
            target_scope: "2026-10-02".into(),
            input_summary: String::new(),
            result_summary: String::new(),
            verification: None,
        };
        attach_verification(
            &mut action,
            &json!({"arguments":args,"result":{"structuredContent":result}}),
        );
        action
    }
    #[test]
    fn lost_receipt_is_recovered_by_stable_source_read_without_creation() {
        let mut action = action(
            "create_task",
            json!({"task":{"id":"000000000000000000000001","title":"Test"}}),
            json!({"id":"000000000000000000000001"}),
        );
        assert_eq!(action.status, "unknown");
        verify(&mut action, |tool, args| {
            assert_eq!(tool, "get_task_by_id");
            assert_eq!(args["task_id"], "000000000000000000000001");
            Ok(json!({"structuredContent":{"id":"000000000000000000000001","title":"Test"}}))
        });
        assert_eq!(action.status, "saved");
        let previous = action.clone();
        verify(&mut action, |_, _| {
            Ok(json!({"structuredContent":{"id":"000000000000000000000001","title":"Test"}}))
        });
        assert_eq!(previous, action);
    }
    #[test]
    fn partial_or_failed_source_does_not_become_saved_or_get_replayed() {
        let mut action = action(
            "update_task",
            json!({"task_id":"id","task":{"title":"Changed"}}),
            json!({"id":"id"}),
        );
        verify(&mut action, |_, _| {
            Ok(json!({"structuredContent":{"id":"id","title":"Before"}}))
        });
        assert_eq!(action.status, "unknown");
        assert!(!unresolved(&action), "Current source differs but was successfully observed; later edits must not permanently lock unrelated requests");
        verify(&mut action, |_, _| Err("authentication required".into()));
        assert_eq!(action.status, "unknown");
        assert!(unresolved(&action));
        assert!(!action.result_summary.contains("authentication required"));
    }
    #[test]
    fn missing_creation_identity_blocks_retry_and_does_not_guess_an_object() {
        let mut action = action(
            "create_habit",
            json!({"habit":{"name":"Test"}}),
            Value::Null,
        );
        verify(&mut action, |tool, _| {
            assert_eq!(tool, "list_habits");
            Ok(json!({"structuredContent":[]}))
        });
        assert_eq!(action.status, "unknown");
        assert!(!unresolved(&action),"Successful source candidate query permits unrelated current work but does not authorize recreation");
    }
    #[test]
    fn historical_checkin_reads_exact_habit_and_stamp_and_confirms_requested_state() {
        let mut action = action(
            "upsert_habit_checkins",
            json!({"habit_id":"habit","checkin_data":{"stamp":20261002,"status":2},"client_timezone":"America/New_York"}),
            Value::Null,
        );
        verify(&mut action, |tool, args| {
            assert_eq!(tool, "get_habit_checkins");
            assert_eq!(
                args,
                json!({"habit_ids":["habit"],"from_stamp":20261001,"to_stamp":20261003,"client_timezone":"America/New_York"})
            );
            Ok(
                json!({"structuredContent":{"result":[{"habitId":"habit","checkins":[{"stamp":20261002,"status":2}]}]}}),
            )
        });
        assert_eq!(action.status, "saved");
    }
    #[test]
    fn date_clearing_and_explicit_offset_instants_match_source_normalization() {
        assert_eq!(
            field_fingerprint("dueDate", &json!("1970-01-01T00:00:00.000+0000")),
            field_fingerprint("dueDate", &Value::Null)
        );
        assert_eq!(
            field_fingerprint("dueDate", &json!("2026-10-03T09:30:00.000-0400")),
            field_fingerprint("dueDate", &json!("2026-10-03T13:30:00Z"))
        );
        assert_eq!(
            field_fingerprint("value", &json!(1)),
            field_fingerprint("value", &json!(1.0))
        );
        assert_ne!(
            field_fingerprint("dueDate", &json!("2026-10-03")),
            field_fingerprint("dueDate", &json!("2026-10-03T00:00:00Z"))
        );
        let mut action = action(
            "update_task",
            json!({"task_id":"id","task":{"dueDate":"1970-01-01T00:00:00.000+0000"}}),
            Value::Null,
        );
        verify(&mut action, |_, _| {
            Ok(json!({"structuredContent":{"id":"id"}}))
        });
        assert_eq!(action.status, "saved");
    }
    #[test]
    fn native_failure_can_have_saved_effect_and_requires_source_readback() {
        let mut action = action(
            "update_task",
            json!({"task_id":"id","task":{"title":"Changed"}}),
            json!({"error":"Connection lost"}),
        );
        assert_eq!(action.status, "unknown");
        verify(&mut action, |_, _| {
            Ok(json!({"structuredContent":{"id":"id","title":"Changed"}}))
        });
        assert_eq!(action.status, "saved");
    }
    #[test]
    fn deletion_requires_verified_not_found_not_arbitrary_failure() {
        let mut action = action(
            "delete_task",
            json!({"task_id":"id","project_id":"project"}),
            json!({"result":{"deleted":"id"}}),
        );
        verify(&mut action, |_, _| {
            Ok(json!({"structuredContent":{"result":{"error":"Unauthorized"}}}))
        });
        assert_eq!(action.status, "unknown");
        verify(&mut action, |_, _| {
            Ok(
                json!({"isError":true,"content":[{"type":"text","text":"Error executing tool get_task_by_id: TickTick API error [resource_not_found]: task not found: id (errorId: fixture)"}]}),
            )
        });
        assert_eq!(action.status, "saved");
    }
}

#[cfg(test)]
mod runtime_gate {
    use super::*;
    use crate::collaboration::{
        RuntimeShutdownHandle, StdioJsonlClient, COLLABORATION_READ_PERMISSION_PROFILE,
    };
    #[test]
    #[ignore = "Uses only explicitly owned PD Spec54 Test Task; real Dida mutation/readback/cleanup"]
    fn native_manual_task_writes_use_stable_ids_and_are_absent_from_automatic_thread() {
        let executable = crate::collaboration::discover_codex_cli().unwrap();
        let connection =
            dida::discover(&executable).expect("Selected existing Dida connection required");
        let nonce = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let root = std::env::temp_dir().join(format!(
            "personal-dashboard-dida-write-{}-{nonce}",
            std::process::id()
        ));
        let namespace = creation_namespace(&format!("PD Spec54 Test {nonce}"));
        let title = format!("PD Spec54 Test {nonce}");
        let mut client = StdioJsonlClient::spawn_with_selected_dida(
            &executable,
            &root,
            RuntimeShutdownHandle::default(),
            Some(&connection),
        )
        .unwrap();
        client.initialize().unwrap();
        let manual = client.request("thread/start",json!({"cwd":root,"permissions":COLLABORATION_READ_PERMISSION_PROFILE,"approvalPolicy":"never","ephemeral":true,"config":dida::thread_config(Some(&connection),true)})).unwrap();
        let mut thread = manual["thread"]["id"].as_str().unwrap().to_owned();
        let mut catalog = Value::Null;
        for _ in 0..3 {
            catalog = client.request("mcpServerStatus/list", json!({"threadId":thread,"serverName":dida::SERVER,"detail":"toolsAndAuthOnly"})).unwrap();
            if catalog["data"][0]["tools"]
                .as_object()
                .is_some_and(|tools| tools.values().any(|tool| tool["name"] == "create_task"))
            {
                break;
            }
            let retry = client.request("thread/start",json!({"cwd":root,"permissions":COLLABORATION_READ_PERMISSION_PROFILE,"approvalPolicy":"never","ephemeral":true,"config":dida::thread_config(Some(&connection),true)})).unwrap();
            thread = retry["thread"]["id"].as_str().unwrap().to_owned();
        }
        let error_text = catalog["data"][0]["toolsError"].to_string().to_lowercase();
        eprintln!(
            "safe native discovery executable={} timeout={} auth={} transport={} error-fields={:?}",
            executable.display(),
            error_text.contains("time"),
            error_text.contains("auth"),
            error_text.contains("transport"),
            catalog["data"][0]["toolsError"]
                .as_object()
                .map(|v| v.keys().collect::<Vec<_>>())
        );
        assert!(
            catalog["data"][0]["tools"]
                .as_object()
                .unwrap()
                .values()
                .any(|tool| tool["name"] == "create_task" && tool["inputSchema"].is_object()),
            "Manual actual MCP schema must include writes; safe status {:?}; requested count {}",
            dida::source_status(Ok(catalog.clone())),
            connection["enabled_tools"].as_array().unwrap().len()
        );
        let call = |client: &mut StdioJsonlClient, tool: &str, args: Value| {
            client.request(
                "mcpServer/tool/call",
                json!({"threadId":thread,"server":dida::SERVER,"tool":tool,"arguments":args}),
            )
        };
        let projects = payload(&call(&mut client, "list_projects", json!({})).unwrap());
        let destination = projects
            .as_array()
            .and_then(|rows| {
                rows.iter()
                    .find(|row| row["id"].as_str().is_some_and(|id| id != "inbox"))
            })
            .and_then(|row| row["id"].as_str())
            .map(str::to_owned);
        let mut ids = vec![namespace.clone()];
        let attempt = (|| -> Result<(), String> {
            let args = json!({"task":{"id":namespace,"title":title,"content":"Owned temporary source probe; no genuine personal Task or Habit changes."},"client_timezone":"America/New_York"});
            let created = call(&mut client, "create_task", args.clone())?;
            let created_value = payload(&created);
            if let Some(id) = created_value["id"].as_str() {
                ids.push(id.to_owned());
            }
            let returned = created_value["id"]
                .as_str()
                .ok_or("Missing owned creation receipt ID")?
                .to_owned();
            std::fs::write("/tmp/pd-spec54/dida59-task-id-contract.json", json!({"requestedId":namespace,"returnedId":returned,"preserved":created_value["id"] == namespace}).to_string()).unwrap();
            let namespace = returned;
            let mut action = ExternalToolActionView {
                action_id: format!("{thread}:owned-create"),
                source_id: dida::SERVER.into(),
                source_name: "Dida".into(),
                tool_id: "create_task".into(),
                status: "completed".into(),
                target_scope: "source".into(),
                input_summary: String::new(),
                result_summary: String::new(),
                verification: None,
            };
            attach_verification(&mut action, &json!({"arguments":args,"result":created}));
            verify(&mut action, |tool, args| call(&mut client, tool, args));
            if action.status != "saved" {
                let current = call(&mut client, "get_task_by_id", json!({"task_id":namespace}))?;
                std::fs::write("/tmp/pd-spec54/dida59-task-create-readback.json", json!({"arguments":args,"receipt":created_value,"current":current,"status":action.status,"summary":action.result_summary}).to_string()).unwrap();
            }
            if action.status != "saved" {
                return Err("Native creation source readback did not confirm saved state".into());
            }
            let updated = call(
                &mut client,
                "update_task",
                json!({"task_id":namespace,"task":{"id":namespace,"title":format!("{title} updated")}}),
            )?;
            if payload(&updated).get("error").is_some() {
                return Err("Owned update failed".into());
            }
            let current = payload(&call(
                &mut client,
                "get_task_by_id",
                json!({"task_id":namespace}),
            )?);
            if current["title"] != format!("{title} updated") {
                return Err("Owned update source readback mismatch".into());
            }
            let mut project = current["projectId"]
                .as_str()
                .ok_or("Missing source project identity")?
                .to_owned();
            if let Some(destination) = &destination {
                call(
                    &mut client,
                    "move_task",
                    json!({"moves":[{"taskId":namespace,"fromProjectId":project,"toProjectId":destination}]}),
                )?;
                let moved = payload(&call(
                    &mut client,
                    "get_task_by_id",
                    json!({"task_id":namespace}),
                )?);
                if moved["projectId"] != *destination {
                    return Err("Owned move source readback mismatch".into());
                }
                project = destination.clone();
            }
            call(
                &mut client,
                "complete_task",
                json!({"task_id":namespace,"project_id":project}),
            )?;
            let completed = payload(&call(
                &mut client,
                "get_task_by_id",
                json!({"task_id":namespace}),
            )?);
            if completed["status"] != 2 {
                return Err("Owned completion source readback mismatch".into());
            }
            Ok(())
        })();
        // Even a failed probe cleans only identities read back as its own object.
        for id in ids {
            if let Ok(response) = call(&mut client, "get_task_by_id", json!({"task_id":id})) {
                let value = payload(&response);
                if value["title"]
                    .as_str()
                    .is_some_and(|name| name.starts_with(&title))
                {
                    let project = value["projectId"]
                        .as_str()
                        .expect("Owned object project required");
                    call(
                        &mut client,
                        "delete_task",
                        json!({"task_id":id,"project_id":project}),
                    )
                    .unwrap();
                    let absence = payload(
                        &call(&mut client, "get_task_by_id", json!({"task_id":id})).unwrap(),
                    );
                    // Do not dump output; record only exact not-found vocabulary.
                    std::fs::write("/tmp/pd-spec54/dida59-task-cleanup-shape.json", json!({"id":id,"title":title,"isNull":absence.is_null(),"keys":absence.as_object().map(|v| v.keys().cloned().collect::<Vec<_>>()),"error":absence.get("error"),"fixturePayload":absence}).to_string()).unwrap();
                    let raw = call(&mut client, "get_task_by_id", json!({"task_id":id})).unwrap();
                    assert!(
                        task_absent(&raw, &id),
                        "Owned deletion must return native resource_not_found for the exact object"
                    );
                }
            }
        }
        let automatic = client.request("thread/start",json!({"cwd":root,"permissions":COLLABORATION_READ_PERMISSION_PROFILE,"approvalPolicy":"never","ephemeral":true,"config":dida::thread_config(Some(&connection),false)})).unwrap();
        let automatic_catalog = client.request("mcpServerStatus/list",json!({"threadId":automatic["thread"]["id"],"serverName":dida::SERVER,"detail":"toolsAndAuthOnly"})).unwrap();
        assert!(automatic_catalog["data"][0]["tools"].as_object().is_some_and(|tools|tools.values().any(|tool|tool["name"] == "get_user_preference")),"Automatic connection must actually expose verified reads, not merely an empty failed catalog");
        assert!(
            !automatic_catalog["data"][0]["tools"]
                .as_object()
                .unwrap()
                .values()
                .any(|tool| WRITE_TOOLS.iter().any(|name| tool["name"] == *name)),
            "Automatic native thread must expose no mutation schema after manual writes"
        );
        drop(client);
        std::fs::remove_dir_all(root).unwrap();
        assert!(
            attempt.is_ok(),
            "Owned native Task probe failed: {:?}",
            attempt.err()
        );
    }
    #[test]
    #[ignore = "Uses one explicitly owned retained PD Spec54 Test Habit; resets check-in to unmarked"]
    fn native_owned_habit_update_and_historical_checkin_readback() {
        let executable = crate::collaboration::discover_codex_cli().unwrap();
        let mut connection =
            dida::discover(&executable).expect("Selected existing Dida connection required");
        // Acceptance-only allowance for observed intermittent cold startup.
        connection["startup_timeout_sec"] = json!(60);
        let fixture_path = std::path::Path::new("/tmp/pd-spec54/dida59-owned-habit.json");
        let fixture: Value = if fixture_path.exists() {
            serde_json::from_slice(&std::fs::read(fixture_path).unwrap()).unwrap()
        } else {
            let nonce = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos();
            let fixture = json!({"id":creation_namespace(&format!("PD Spec54 Test Habit {nonce}")),"name":format!("PD Spec54 Test Habit {nonce}"),"prepared":true});
            std::fs::write(fixture_path, serde_json::to_vec(&fixture).unwrap()).unwrap();
            fixture
        };
        let root = std::env::temp_dir().join(format!(
            "personal-dashboard-dida-habit-{}",
            std::process::id()
        ));
        let mut client = StdioJsonlClient::spawn_with_selected_dida(
            &executable,
            &root,
            RuntimeShutdownHandle::default(),
            Some(&connection),
        )
        .unwrap();
        client.initialize().unwrap();
        let started = client.request("thread/start",json!({"cwd":root,"permissions":COLLABORATION_READ_PERMISSION_PROFILE,"approvalPolicy":"never","ephemeral":true,"config":dida::thread_config(Some(&connection),true)})).unwrap();
        let mut thread = started["thread"]["id"].as_str().unwrap().to_owned();
        let mut available = false;
        for _ in 0..3 {
            let catalog = client.request("mcpServerStatus/list",json!({"threadId":thread,"serverName":dida::SERVER,"detail":"toolsAndAuthOnly"})).unwrap();
            if catalog["data"][0]["toolsError"].is_string() {
                let diagnostic = catalog["data"][0]["toolsError"].as_str().unwrap();
                let safe = diagnostic
                    .split_whitespace()
                    .map(|word| {
                        if word.contains("http") || word.contains("token") {
                            "[omitted]"
                        } else {
                            word
                        }
                    })
                    .collect::<Vec<_>>()
                    .join(" ");
                std::fs::write("/tmp/pd-spec54/dida59-safe-discovery-error.txt", safe).unwrap();
            }
            if catalog["data"][0]["tools"]
                .as_object()
                .is_some_and(|tools| tools.values().any(|tool| tool["name"] == "create_habit"))
            {
                available = true;
                break;
            }
            let retry = client.request("thread/start",json!({"cwd":root,"permissions":COLLABORATION_READ_PERMISSION_PROFILE,"approvalPolicy":"never","ephemeral":true,"config":dida::thread_config(Some(&connection),true)})).unwrap();
            thread = retry["thread"]["id"].as_str().unwrap().to_owned();
        }
        assert!(
            available,
            "Native Habit schema unavailable before mutations"
        );
        let call = |client: &mut StdioJsonlClient, tool: &str, args: Value| {
            client.request(
                "mcpServer/tool/call",
                json!({"threadId":thread,"server":dida::SERVER,"tool":tool,"arguments":args}),
            )
        };
        let id = fixture["id"].as_str().unwrap();
        let name = fixture["name"].as_str().unwrap();
        let existing = payload(&call(&mut client, "get_habit", json!({"habit_id":id})).unwrap());
        if existing["id"] != id {
            assert!(
                fixture["prepared"] == true,
                "An existing fixture with unknown source outcome cannot be recreated"
            );
            let created = payload(
                &call(
                    &mut client,
                    "create_habit",
                    json!({"habit":{"id":id,"name":name}}),
                )
                .unwrap(),
            );
            if let Some(returned) = created["id"].as_str() {
                std::fs::write(
                    fixture_path,
                    json!({"id":returned,"requestedId":id,"name":name,"prepared":false})
                        .to_string(),
                )
                .unwrap();
            }
            // Native Habit create ignores the caller ID. Persist its returned
            // identity before any later call; rerun reads that same owned object.
            return;
        }
        let habit = payload(&call(&mut client, "get_habit", json!({"habit_id":id})).unwrap());
        assert!(
            habit["name"] == name || habit["name"] == format!("{name} updated"),
            "Only the expressly owned Habit may be changed"
        );
        std::fs::write(
            fixture_path,
            json!({"id":id,"name":name,"prepared":false,"retained":true}).to_string(),
        )
        .unwrap();
        std::fs::write(
            "/tmp/pd-spec54/dida59-habit-source.json",
            serde_json::to_vec(&habit).unwrap(),
        )
        .unwrap();
        let untouched = call(&mut client,"get_habit_checkins",json!({"habit_ids":[id],"from_stamp":20200101,"to_stamp":20200131,"client_timezone":"America/New_York"})).unwrap();
        std::fs::write(
            "/tmp/pd-spec54/dida59-habit-empty-read.json",
            serde_json::to_vec(&untouched).unwrap(),
        )
        .unwrap();
        let updated_name = format!("{name} updated");
        let attempt = (|| -> Result<(), String> {
            call(
                &mut client,
                "update_habit",
                json!({"habit_id":id,"habit":{"id":id,"name":updated_name}}),
            )?;
            let updated = payload(&call(&mut client, "get_habit", json!({"habit_id":id}))?);
            if updated["name"] != updated_name {
                return Err("Habit update source readback mismatch".into());
            }
            let receipt = call(
                &mut client,
                "upsert_habit_checkins",
                json!({"habit_id":id,"checkin_data":{"stamp":20261002,"status":2},"client_timezone":"America/New_York"}),
            )?;
            std::fs::write(
                "/tmp/pd-spec54/dida59-habit-checkin-receipt.json",
                serde_json::to_vec(&receipt).unwrap(),
            )
            .unwrap();
            let current = payload(&call(
                &mut client,
                "get_habit_checkins",
                json!({"habit_ids":[id],"from_stamp":20261001,"to_stamp":20261003,"client_timezone":"America/New_York"}),
            )?);
            std::fs::write(
                "/tmp/pd-spec54/dida59-habit-completed-read.json",
                serde_json::to_vec(&current).unwrap(),
            )
            .unwrap();
            if matching_payload(&current, &json!({"habitId":id,"stamp":20261002}))
                .as_ref()
                .and_then(|v| v.get("status"))
                != Some(&json!(2))
            {
                return Err("Historical check-in readback mismatch".into());
            }
            Ok(())
        })();
        // The MCP has no verified Habit teardown tool/status. Retain this owned
        // fixture and reset only its exact historical check-in and test name.
        call(&mut client,"upsert_habit_checkins",json!({"habit_id":id,"checkin_data":{"stamp":20261002,"status":0},"client_timezone":"America/New_York"})).unwrap();
        let reset = payload(&call(&mut client,"get_habit_checkins",json!({"habit_ids":[id],"from_stamp":20261001,"to_stamp":20261003,"client_timezone":"America/New_York"})).unwrap());
        std::fs::write(
            "/tmp/pd-spec54/dida59-habit-reset-read.json",
            serde_json::to_vec(&reset).unwrap(),
        )
        .unwrap();
        let reset_entry = matching_payload(&reset, &json!({"habitId":id,"stamp":20261002}));
        assert!(
            reset.as_array().is_some_and(|entries| entries.is_empty())
                || reset_entry.is_some_and(|entry| entry["status"] == 0),
            "Reset must confirm native unmarked/absent exact check-in"
        );
        call(
            &mut client,
            "update_habit",
            json!({"habit_id":id,"habit":{"id":id,"name":name}}),
        )
        .unwrap();
        assert_eq!(
            payload(&call(&mut client, "get_habit", json!({"habit_id":id})).unwrap())["name"],
            name
        );
        // #62 explicit local-only capability is enforced by the native schema,
        // while unrelated Task writes retain their separately authorized scope.
        let local=client.request("thread/start",json!({"cwd":root,"permissions":COLLABORATION_READ_PERMISSION_PROFILE,"approvalPolicy":"never","ephemeral":true,"config":dida::thread_config_with_habit_writes(Some(&connection),true,false)})).unwrap();
        let local_thread=local["thread"]["id"].as_str().unwrap();
        let local_catalog=client.request("mcpServerStatus/list",json!({"threadId":local_thread,"serverName":dida::SERVER,"detail":"toolsAndAuthOnly"})).unwrap();
        let names:Vec<_>=local_catalog["data"][0]["tools"].as_object().unwrap().values().filter_map(|tool|tool["name"].as_str()).collect();
        assert!(names.contains(&"get_habit_checkins") && names.contains(&"create_task"));
        for tool in ["create_habit","update_habit","upsert_habit_checkins"] { assert!(!names.contains(&tool),"Only-local native schema must exclude {tool}"); }
        let current=client.request("mcpServer/tool/call",json!({"threadId":local_thread,"server":dida::SERVER,"tool":"get_habit","arguments":{"habit_id":id}})).unwrap();
        assert_eq!(payload(&current)["id"],id);
        std::fs::write("/tmp/pd-spec54/dual62-native-scope-evidence.json",json!({"source":"dida365","localOnlyHabitMutationsAbsent":true,"taskWriteSchemaPreserved":true,"ownedStableIdReadConfirmed":true,"ownedCheckinResetConfirmed":true,"ownedNameRestored":true}).to_string()).unwrap();
        drop(client);
        std::fs::remove_dir_all(root).unwrap();
        assert!(
            attempt.is_ok(),
            "Owned Habit gate failed: {:?}",
            attempt.err()
        );
    }
}
