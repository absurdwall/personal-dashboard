//! Visible runtime projection: actual public text, allowlisted parameters and
//! filtered diagnostics. Hidden reasoning and raw outputs stay outside this
//! boundary. Business receipts remain in their adapters.
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CollaborationWorkParameter {
    pub name: String,
    pub value: String,
}

/// Keep bounded diagnostics, withholding possible credentials/serialized payloads
/// rather than trying to make arbitrary source output safe with partial redaction.
pub(super) fn safe_diagnostic(value: &str) -> Option<String> {
    let lower = value.to_lowercase();
    if [
        "bearer ",
        "authorization",
        "api_key",
        "api-key",
        "apikey",
        "access_token",
        "refresh_token",
        "password",
        "secret",
        "token=",
        "sk-",
        "eyj",
    ]
    .iter()
    .any(|marker| lower.contains(marker))
        || value.trim_start().starts_with(['{', '['])
        || value
            .split_whitespace()
            .any(|word| word.chars().count() > 128)
    {
        return None;
    }
    Some(
        value
            .chars()
            .filter(|c| !c.is_control() || *c == '\n' || *c == '\t')
            .take(2048)
            .collect(),
    )
}

fn safe_parameters(arguments: &Value) -> Vec<CollaborationWorkParameter> {
    [
        "operation",
        "name",
        "date",
        "targetDate",
        "completedOn",
        "time",
        "completedTime",
        "taskId",
        "listId",
        "habitKey",
        "recordId",
        "transition",
        "scope",
        "completed",
        "mode",
        "habit_id",
        "habitId",
        "startDate",
        "endDate",
    ]
    .into_iter()
    .filter_map(|name| {
        let value = match &arguments[name] {
            Value::String(value) => safe_diagnostic(value)?,
            Value::Bool(value) => value.to_string(),
            _ => return None,
        };
        Some(CollaborationWorkParameter {
            name: name.into(),
            value: value.chars().take(200).collect(),
        })
    })
    .collect()
}

const ITEM_OPTIONAL_BYTES: usize = 64 * 1024;
const EXECUTION_OPTIONAL_BYTES: usize = 1024 * 1024;
pub(super) const ARCHIVE_OPTIONAL_BYTES: usize = 8 * 1024 * 1024;
const DETAILED_ITEMS: usize = 128;
const SUMMARY_PARTS: usize = 16;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollaborationPayloadOmission {
    pub field: String,
    pub original_bytes: usize,
    pub retained_bytes: usize,
    #[serde(default)]
    pub retained_from_prior_observation: bool,
    pub input_fingerprint: String,
    pub reason_code: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollaborationWorkItem {
    pub item_id: String,
    pub call_id: Option<String>,
    #[serde(default)]
    pub input_fingerprint: Option<String>,
    pub kind: String,
    pub phase: Option<String>,
    pub text: String,
    pub summary: Vec<String>,
    pub tool: Option<String>,
    pub status: String,
    pub first_sequence: u64,
    pub last_sequence: u64,
    pub observed_at_ms: u64,
    pub updated_at_ms: u64,
    pub runtime_started_at_ms: Option<u64>,
    pub runtime_completed_at_ms: Option<u64>,
    pub runtime_emitted_at_ms: Option<u64>,
    pub authoritative: bool,
    #[serde(default)]
    pub parameters: Vec<CollaborationWorkParameter>,
    #[serde(default)]
    pub diagnostic: Option<String>,
    #[serde(default)]
    pub diagnostic_gap: Option<String>,
    #[serde(default)]
    pub changes: Vec<super::changes::CollaborationChangeEvidence>,
    #[serde(default)]
    pub change_gap: Option<String>,
    #[serde(default)]
    pub payload_omissions: Vec<CollaborationPayloadOmission>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollaborationTokenCounts {
    pub total_tokens: Option<u64>,
    pub input_tokens: Option<u64>,
    pub cached_input_tokens: Option<u64>,
    pub cache_write_input_tokens: Option<u64>,
    pub output_tokens: Option<u64>,
    pub reasoning_output_tokens: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollaborationTokenUsage {
    /// Runtime thread aggregate; not per-tool cost.
    pub total: CollaborationTokenCounts,
    /// Runtime last-turn counts, exactly as reported (no subtraction).
    pub last: CollaborationTokenCounts,
    pub model_context_window: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollaborationRefreshInput {
    pub target: String,
    pub target_date: String,
    pub status: String,
    pub source_state: Option<String>,
    pub page_state: String,
    pub trigger: String,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollaborationRefreshObservation {
    pub id: String,
    #[serde(flatten)]
    pub observation: CollaborationRefreshInput,
    pub observed_at_ms: u64,
    pub history_sequence: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollaborationWorkHistory {
    pub evidence_version: u32,
    /// Bound by the application, never trusted from runtime text.
    pub execution_id: String,
    pub thread_id: String,
    pub turn_id: String,
    pub sequence: u64,
    pub status: String,
    pub observed_at_ms: u64,
    pub updated_at_ms: u64,
    pub runtime_started_at_ms: Option<u64>,
    pub runtime_completed_at_ms: Option<u64>,
    pub items: Vec<CollaborationWorkItem>,
    pub token_usage: Option<CollaborationTokenUsage>,
    #[serde(default)]
    pub refreshes: Vec<CollaborationRefreshObservation>,
    #[serde(default)]
    pub gaps: Vec<String>,
}

pub type RuntimeWorkObserver =
    Arc<dyn Fn(CollaborationWorkHistory) -> Result<(), String> + Send + Sync>;

pub(super) struct RuntimeHistory {
    pub view: CollaborationWorkHistory,
    observer: Option<RuntimeWorkObserver>,
    dirty: bool,
    last_flush: Instant,
    pending_bytes: usize,
}

pub(super) fn observed_now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

impl RuntimeHistory {
    pub fn new(thread_id: &str, turn_id: &str, observer: Option<RuntimeWorkObserver>) -> Self {
        let now = observed_now_ms();
        Self {
            view: CollaborationWorkHistory {
                evidence_version: 1,
                execution_id: String::new(),
                thread_id: thread_id.into(),
                turn_id: turn_id.into(),
                sequence: 0,
                status: "inProgress".into(),
                observed_at_ms: now,
                updated_at_ms: now,
                runtime_started_at_ms: None,
                runtime_completed_at_ms: None,
                items: Vec::new(),
                token_usage: None,
                refreshes: Vec::new(),
                gaps: Vec::new(),
            },
            observer,
            dirty: true,
            last_flush: Instant::now(),
            pending_bytes: 0,
        }
    }

    pub fn flush(&mut self, critical: bool) -> Result<(), String> {
        if self.dirty
            && (critical
                || self.pending_bytes >= 4096
                || self.last_flush.elapsed() >= Duration::from_millis(250))
        {
            if let Some(observer) = &self.observer {
                observer(bound_optional(self.view.clone(), None, EXECUTION_OPTIONAL_BYTES, false))?;
            }
            self.dirty = false;
            self.pending_bytes = 0;
            self.last_flush = Instant::now();
        }
        Ok(())
    }

    pub fn terminal(&mut self, status: &str) -> Result<(), String> {
        self.view.sequence += 1;
        self.view.status = status.into();
        self.view.updated_at_ms = observed_now_ms();
        self.dirty = true;
        self.flush(true)
    }

    pub fn final_text(&self) -> String {
        let messages: Vec<_> = self
            .view
            .items
            .iter()
            .filter(|item| item.kind == "agentMessage")
            .collect();
        let finals: Vec<_> = messages
            .iter()
            .filter(|item| item.phase.as_deref() == Some("final_answer"))
            .collect();
        // Older providers omit phase. Preserve their last unknown message; never
        // mix classified commentary into the final reply or invent its phase.
        if finals.is_empty() {
            messages
                .iter()
                .rev()
                .find(|item| item.phase.is_none())
                .map(|item| item.text.clone())
                .unwrap_or_default()
        } else {
            finals
                .iter()
                .map(|item| item.text.as_str())
                .collect::<Vec<_>>()
                .join("\n\n")
        }
    }

    pub fn consume(&mut self, message: &Value) -> Result<(), String> {
        let params = &message["params"];
        let turn = params["turnId"]
            .as_str()
            .or_else(|| params["turn"]["id"].as_str());
        if params["threadId"].as_str() != Some(&self.view.thread_id)
            || turn != Some(&self.view.turn_id)
        {
            return Ok(());
        }
        let method = message["method"].as_str().unwrap_or_default();
        let supported = matches!(
            method,
            "item/started"
                | "item/completed"
                | "item/agentMessage/delta"
                | "item/reasoning/summaryTextDelta"
                | "item/reasoning/summaryPartAdded"
                | "item/tool/call"
                | "turn/completed"
                | "thread/tokenUsage/updated"
                | "item/mcpToolCall/progress"
                | "error"
        );
        if !supported {
            return Ok(());
        }
        self.view.sequence += 1;
        self.view.updated_at_ms = observed_now_ms();
        self.dirty = true;
        if method == "error" {
            let id = format!("runtime-error:{}", self.view.sequence);
            let index = self.ensure_item(&id, "runtimeError");
            let item = &mut self.view.items[index];
            item.status = if params["willRetry"].as_bool() == Some(true) {
                "retrying"
            } else {
                "failed"
            }
            .into();
            item.authoritative = true;
            item.diagnostic = params["error"]["message"]
                .as_str()
                .and_then(safe_diagnostic);
            item.diagnostic_gap = item.diagnostic.is_none().then(|| {
                "Runtime diagnostic unavailable or withheld by the credential/payload filter."
                    .into()
            });
            return self.flush(true);
        }
        if method == "thread/tokenUsage/updated" {
            self.view.token_usage = serde_json::from_value(params["tokenUsage"].clone()).ok();
            return self.flush(true);
        }
        if method == "turn/completed" {
            // itemsView may be notLoaded/summary. Only apply snapshots actually present.
            if let Some(items) = params["turn"]["items"].as_array() {
                for item in items {
                    self.snapshot(item, true, params, message);
                }
            }
            if !params["turn"]["error"].is_null() {
                let index = self.ensure_item("terminal-error", "runtimeError");
                let item = &mut self.view.items[index];
                item.status = "failed".into();
                item.authoritative = true;
                item.diagnostic = params["turn"]["error"]["message"]
                    .as_str()
                    .and_then(safe_diagnostic)
                    .or(item.diagnostic.clone());
                item.diagnostic_gap = item.diagnostic.is_none().then(|| "Runtime diagnostic unavailable or withheld by the credential/payload filter.".into());
            }
            self.view.runtime_started_at_ms = params["turn"]["startedAt"]
                .as_u64()
                .map(|n| n.saturating_mul(1000));
            self.view.runtime_completed_at_ms = params["turn"]["completedAt"]
                .as_u64()
                .map(|n| n.saturating_mul(1000));
            return self.terminal(params["turn"]["status"].as_str().unwrap_or("unknown"));
        }
        if matches!(method, "item/started" | "item/completed") {
            self.snapshot(&params["item"], method == "item/completed", params, message);
            return self.flush(true);
        }
        let call = method == "item/tool/call";
        let id = if call {
            params["callId"].as_str()
        } else {
            params["itemId"].as_str()
        };
        // Compatibility with older delta streams that did not include itemId.
        let id = id.unwrap_or("legacy-agent-message");
        let kind = if call {
            "dynamicToolCall"
        } else if method.contains("reasoning/") {
            "reasoning"
        } else if method.contains("mcpToolCall") {
            "mcpToolCall"
        } else {
            "agentMessage"
        };
        let index = self.ensure_item(id, kind);
        let item = &mut self.view.items[index];
        item.last_sequence = self.view.sequence;
        item.updated_at_ms = self.view.updated_at_ms;
        item.runtime_emitted_at_ms = message["emittedAtMs"].as_u64();
        if call {
            item.call_id = Some(id.into());
            item.tool = params["tool"].as_str().map(str::to_owned);
            item.status = "inProgress".into();
            item.parameters = safe_parameters(&params["arguments"]);
            item.input_fingerprint = Some(super::stable_effect_fingerprint(&params["arguments"]));
        } else if !item.authoritative {
            let delta = params["delta"].as_str().unwrap_or_default();
            self.pending_bytes += delta.len();
            if kind == "reasoning" {
                let part = params["summaryIndex"].as_u64().unwrap_or(0).min(1024) as usize;
                item.summary
                    .resize(item.summary.len().max(part + 1), String::new());
                item.summary[part].push_str(delta);
            } else if kind == "agentMessage" {
                item.text.push_str(delta);
            }
            // MCP progress text is an unfiltered tool output; activity/status suffices.
        }
        self.flush(call)
    }

    fn ensure_item(&mut self, id: &str, kind: &str) -> usize {
        if let Some(index) = self.view.items.iter().position(|item| item.item_id == id) {
            return index;
        }
        self.view.items.push(CollaborationWorkItem {
            item_id: id.into(),
            call_id: None,
            input_fingerprint: None,
            kind: kind.into(),
            phase: None,
            text: String::new(),
            summary: Vec::new(),
            tool: None,
            status: "inProgress".into(),
            first_sequence: self.view.sequence,
            last_sequence: self.view.sequence,
            observed_at_ms: self.view.updated_at_ms,
            updated_at_ms: self.view.updated_at_ms,
            runtime_started_at_ms: None,
            runtime_completed_at_ms: None,
            runtime_emitted_at_ms: None,
            authoritative: false,
            parameters: Vec::new(),
            diagnostic: None,
            diagnostic_gap: None,
            changes: Vec::new(),
            change_gap: None,
            payload_omissions: Vec::new(),
        });
        self.view.items.len() - 1
    }

    fn snapshot(&mut self, value: &Value, completed: bool, params: &Value, message: &Value) {
        let Some(id) = value["id"].as_str() else {
            return;
        };
        let kind = value["type"].as_str().unwrap_or_default();
        if !matches!(
            kind,
            "agentMessage"
                | "reasoning"
                | "commandExecution"
                | "fileChange"
                | "mcpToolCall"
                | "dynamicToolCall"
                | "webSearch"
                | "functionCallOutput"
        ) {
            return;
        }
        let index = self.ensure_item(id, kind);
        let item = &mut self.view.items[index];
        if item.authoritative && !completed {
            return;
        }
        item.kind = kind.into();
        item.last_sequence = self.view.sequence;
        item.updated_at_ms = self.view.updated_at_ms;
        item.runtime_emitted_at_ms = message["emittedAtMs"]
            .as_u64()
            .or(item.runtime_emitted_at_ms);
        item.runtime_started_at_ms = params["startedAtMs"]
            .as_u64()
            .or(item.runtime_started_at_ms);
        item.runtime_completed_at_ms = params["completedAtMs"]
            .as_u64()
            .or(item.runtime_completed_at_ms);
        item.status = value["status"]
            .as_str()
            .unwrap_or(if completed { "completed" } else { "inProgress" })
            .into();
        item.authoritative = completed;
        if kind == "fileChange" {
            let (changes, gap) = super::changes::native_changes(id, &value["changes"]);
            if !changes.is_empty() {
                item.changes = changes;
            }
            item.change_gap = gap;
        }
        if kind == "agentMessage" {
            item.phase = value["phase"]
                .as_str()
                .filter(|p| matches!(*p, "commentary" | "final_answer"))
                .map(str::to_owned)
                .or(item.phase.clone());
            if let Some(text) = value["text"].as_str() {
                item.text = text.into();
            }
        } else if kind == "reasoning" {
            if let Some(summary) = value["summary"].as_array() {
                item.summary = summary
                    .iter()
                    .filter_map(Value::as_str)
                    .map(str::to_owned)
                    .collect();
            }
        } else {
            item.call_id = value["callId"]
                .as_str()
                .map(str::to_owned)
                .or(item.call_id.clone());
            item.tool = value["tool"]
                .as_str()
                .map(str::to_owned)
                .or(item.tool.clone());
            if !value["arguments"].is_null() {
                item.parameters = safe_parameters(&value["arguments"]);
                item.input_fingerprint =
                    Some(super::stable_effect_fingerprint(&value["arguments"]));
            }
            if value["success"].as_bool() == Some(false) || !value["error"].is_null() {
                item.status = "failed".into();
            }
            if kind == "commandExecution" {
                if !value["command"].is_null() {
                    item.input_fingerprint =
                        Some(super::stable_effect_fingerprint(&serde_json::json!([
                            value["command"],
                            value["cwd"]
                        ])));
                }
                if let Some(code) = value["exitCode"].as_i64() {
                    item.parameters
                        .retain(|parameter| parameter.name != "exitCode");
                    item.parameters.push(CollaborationWorkParameter {
                        name: "exitCode".into(),
                        value: code.to_string(),
                    });
                    if code != 0 {
                        item.status = "failed".into();
                        item.diagnostic = Some(format!("Command exited with code {code}."));
                        item.diagnostic_gap = Some(
                            "Raw command output is not retained in visible work history.".into(),
                        );
                    }
                }
            }
            if item.status == "failed" && kind != "commandExecution" {
                item.diagnostic = value["error"]["message"]
                    .as_str()
                    .or(value["error"].as_str())
                    .and_then(safe_diagnostic)
                    .or(item.diagnostic.clone());
                item.diagnostic_gap = item.diagnostic.is_none().then(|| "Runtime diagnostic unavailable or withheld by the credential/payload filter.".into());
            }
        }
    }

    pub fn source_query_started(
        &mut self,
        id: &str,
        tool: &str,
        arguments: &Value,
    ) -> Result<(), String> {
        self.view.sequence += 1;
        self.view.updated_at_ms = observed_now_ms();
        let index = self.ensure_item(id, "hostSourceRead");
        let item = &mut self.view.items[index];
        item.call_id = Some(id.into());
        item.tool = Some(tool.into());
        item.status = "inProgress".into();
        item.parameters = safe_parameters(arguments);
        item.parameters.push(CollaborationWorkParameter {
            name: "source".into(),
            value: "dida365".into(),
        });
        item.input_fingerprint = Some(super::stable_effect_fingerprint(arguments));
        for name in ["habit_ids", "from_stamp", "to_stamp"] {
            if let Some(value) = arguments.get(name) {
                let scope = value.to_string();
                let displayed: String = scope.chars().take(200).collect();
                if displayed.len() != scope.len() {
                    item.diagnostic_gap = Some("Source scope display truncated at 200 characters; inputFingerprint identifies the exact query arguments".into());
                }
                item.parameters.push(CollaborationWorkParameter {
                    name: name.into(),
                    value: displayed,
                });
            }
        }
        item.authoritative = true;
        item.last_sequence = self.view.sequence;
        item.updated_at_ms = self.view.updated_at_ms;
        self.dirty = true;
        self.flush(true)
    }

    pub fn source_query_finished(
        &mut self,
        id: &str,
        result: Result<(), &str>,
    ) -> Result<(), String> {
        self.view.sequence += 1;
        self.view.updated_at_ms = observed_now_ms();
        let index = self.ensure_item(id, "hostSourceRead");
        let item = &mut self.view.items[index];
        item.status = if result.is_ok() {
            "completed"
        } else {
            "failed"
        }
        .into();
        item.authoritative = true;
        item.last_sequence = self.view.sequence;
        item.updated_at_ms = self.view.updated_at_ms;
        if let Err(error) = result {
            item.diagnostic = safe_diagnostic(error);
            if item.diagnostic.is_none() {
                let withheld = "Source diagnostic withheld by the credential/payload filter";
                item.diagnostic_gap = Some(item.diagnostic_gap.as_ref()
                    .map(|gap| format!("{gap}; {withheld}")).unwrap_or_else(|| withheld.into()));
            }
        }
        self.dirty = true;
        self.flush(true)
    }

    pub fn tool_result(
        &mut self,
        call_id: &str,
        success: bool,
        diagnostic: &str,
    ) -> Result<(), String> {
        self.view.sequence += 1;
        self.view.updated_at_ms = observed_now_ms();
        let index = self.ensure_item(call_id, "dynamicToolCall");
        let item = &mut self.view.items[index];
        item.call_id = Some(call_id.into());
        item.status = if success { "completed" } else { "failed" }.into();
        item.authoritative = true;
        item.last_sequence = self.view.sequence;
        item.updated_at_ms = self.view.updated_at_ms;
        if !success {
            item.diagnostic = safe_diagnostic(diagnostic);
            item.diagnostic_gap = item
                .diagnostic
                .is_none()
                .then(|| "Tool diagnostic withheld by the credential/payload filter.".into());
        }
        self.dirty = true;
        self.flush(true)
    }
}

/// Stable item reconciliation is additive. Runtime sequence numbers belong to
/// the readback reducer, not the original stream, so preserve original ordering
/// and host source observations while applying authoritative terminal facts.
pub(super) fn merge_recovered(existing: &mut CollaborationWorkHistory, recovered: CollaborationWorkHistory) {
    let base = existing.sequence;
    let mut sequence = base;
    for mut incoming in recovered.items {
        sequence = sequence.saturating_add(1);
        if let Some(item) = existing.items.iter_mut().find(|item| item.item_id == incoming.item_id) {
            if item.authoritative && ["failed", "declined"].contains(&item.status.as_str()) && incoming.status != item.status {
                let gap = "Recovered snapshot conflicts with an original failed attempt; its original failure remains retained.".to_owned();
                if !existing.gaps.contains(&gap) { existing.gaps.push(gap); }
                continue;
            }
            if !incoming.authoritative { continue; }
            incoming.first_sequence = item.first_sequence;
            incoming.last_sequence = sequence;
            incoming.observed_at_ms = item.observed_at_ms;
            incoming.runtime_started_at_ms = item.runtime_started_at_ms.or(incoming.runtime_started_at_ms);
            incoming.diagnostic = incoming.diagnostic.or(item.diagnostic.clone());
            incoming.diagnostic_gap = incoming.diagnostic_gap.or(item.diagnostic_gap.clone());
            incoming.input_fingerprint = incoming.input_fingerprint.or(item.input_fingerprint.clone());
            if incoming.parameters.is_empty() { incoming.parameters = item.parameters.clone(); }
            // Original independently observed revisions never become a newer
            // readback attributed to this historical event.
            for saved in &item.changes {
                if saved.observed_at_ms.is_some() {
                    incoming.changes.retain(|change| !((change.id == saved.id ||
                        (change.path == saved.path && change.operation == saved.operation && change.source == saved.source)) &&
                        (change.diff.is_none() || change.diff == saved.diff)));
                    for change in &mut incoming.changes {
                        if change.id == saved.id {
                            change.id = format!("{}:recovered:{}", change.id, super::stable_effect_fingerprint(&change.diff));
                        }
                    }
                }
                if !incoming.changes.iter().any(|change| change.id == saved.id) { incoming.changes.push(saved.clone()); }
            }
            if incoming.change_gap.is_none() { incoming.change_gap = item.change_gap.clone(); }
            *item = incoming;
        } else {
            incoming.first_sequence = sequence;
            incoming.last_sequence = sequence;
            existing.items.push(incoming);
        }
    }
    if existing.items.iter().any(|item| item.status == "inProgress") {
        let gap = "Saved terminal snapshot did not supply authoritative completion for every retained in-progress item; those statuses remain unconfirmed.".to_owned();
        if !existing.gaps.contains(&gap) { existing.gaps.push(gap); }
    }
    existing.sequence = sequence.max(base.saturating_add(1));
    existing.updated_at_ms = recovered.updated_at_ms.max(existing.updated_at_ms);
    existing.runtime_started_at_ms = existing.runtime_started_at_ms.or(recovered.runtime_started_at_ms);
    existing.runtime_completed_at_ms = recovered.runtime_completed_at_ms.or(existing.runtime_completed_at_ms);
    if recovered.token_usage.is_some() { existing.token_usage = recovered.token_usage; }
    for gap in recovered.gaps { if !existing.gaps.contains(&gap) { existing.gaps.push(gap); } }
}

pub(super) fn optional_bytes(history: &CollaborationWorkHistory) -> usize {
    history.items.iter().map(|item| item.text.len() + item.summary.iter().map(String::len).sum::<usize>() +
        item.changes.iter().filter_map(|change| change.diff.as_ref()).map(String::len).sum::<usize>()).sum()
}

/// Prospective optional copies only. Identities/status/failure diagnostics and
/// receipt/revision metadata are never evicted. Existing observations are not
/// retroactively trimmed, even if a legacy archive already exceeds the budget.
pub(super) fn bound_optional(mut history: CollaborationWorkHistory, previous: Option<&CollaborationWorkHistory>, available: usize, aggregate: bool) -> CollaborationWorkHistory {
    let mut remaining = available;
    // Recovery retains unmatched original items and immutable source witnesses.
    // Their existing optional copies consume per-execution/item capacity even
    // when the authoritative snapshot does not repeat them.
    let retained_items = previous.map(|previous| previous.items.iter().filter(|old| {
        !history.items.iter().any(|item| item.item_id == old.item_id)
    }).map(|item| item.text.len() + item.summary.iter().map(String::len).sum::<usize>() +
        item.changes.iter().filter_map(|change| change.diff.as_ref()).map(String::len).sum::<usize>()).sum::<usize>()).unwrap_or(0);
    let mut execution_remaining = EXECUTION_OPTIONAL_BYTES.saturating_sub(retained_items);
    for (index, item) in history.items.iter_mut().enumerate() {
        let prior = previous.and_then(|history| history.items.iter().find(|old| old.item_id == item.item_id));
        let retained_diffs = prior.map(|prior| prior.changes.iter().filter(|saved| {
            saved.observed_at_ms.is_some() && !item.changes.iter().any(|change| {
                (change.id == saved.id || (change.path == saved.path && change.operation == saved.operation && change.source == saved.source))
                    && change.diff == saved.diff
            })
        }).filter_map(|change| change.diff.as_ref()).map(String::len).sum::<usize>()).unwrap_or(0);
        let mut item_remaining = ITEM_OPTIONAL_BYTES.saturating_sub(retained_diffs);
        execution_remaining = execution_remaining.saturating_sub(retained_diffs);
        let mut omissions = item.payload_omissions.clone();
        let mut admit = |field: &str, value: String, old: Option<&str>, force_reason: Option<&str>| -> String {
            if old == Some(value.as_str()) {
                item_remaining = item_remaining.saturating_sub(value.len()); execution_remaining = execution_remaining.saturating_sub(value.len());
                return value;
            }
            if value.is_empty() && old.is_some() && omissions.iter().any(|omission|omission.field==field) {
                let old=old.unwrap().to_owned();
                item_remaining=item_remaining.saturating_sub(old.len());execution_remaining=execution_remaining.saturating_sub(old.len());
                if let Some(omission)=omissions.iter_mut().find(|omission|omission.field==field) {omission.retained_bytes=old.len();omission.retained_from_prior_observation=!old.is_empty();}
                return old;
            }
            let reason = force_reason.or_else(|| prior.and_then(|item|item.payload_omissions.iter().find(|omission|omission.field==field)).map(|_|"priorCapacityBound")).or_else(|| if index >= DETAILED_ITEMS {Some("detailCountBound")}
                else if value.len() > item_remaining {Some("itemByteBound")}
                else if value.len() > execution_remaining {Some("executionByteBound")}
                else if value.len() > remaining {Some(if aggregate {"aggregateByteBound"} else {"executionByteBound"})} else {None});
            if let Some(reason) = reason.filter(|_| !value.is_empty()) {
                let retained = old.unwrap_or_default().to_owned();
                omissions.retain(|omission| omission.field != field);
                item_remaining=item_remaining.saturating_sub(retained.len());execution_remaining=execution_remaining.saturating_sub(retained.len());
                omissions.push(CollaborationPayloadOmission {field:field.into(),original_bytes:value.len(),retained_bytes:retained.len(),retained_from_prior_observation:!retained.is_empty(),input_fingerprint:super::stable_effect_fingerprint(&value),reason_code:reason.into()});
                retained
            } else {remaining = remaining.saturating_sub(value.len()); execution_remaining = execution_remaining.saturating_sub(value.len()); item_remaining = item_remaining.saturating_sub(value.len());value}
        };
        item.text = admit("text", std::mem::take(&mut item.text), prior.map(|item|item.text.as_str()), None);
        let summary = item.summary.join("\n\n");
        let old_summary = prior.map(|item|item.summary.join("\n\n"));
        let summary_reason = (item.summary.len() > SUMMARY_PARTS).then_some("summaryPartBound");
        let admitted = admit("summary", summary.clone(), old_summary.as_deref(), summary_reason);
        if admitted != summary { item.summary = prior.map(|item|item.summary.clone()).unwrap_or_default(); }
        for change in &mut item.changes {
            if let Some(diff) = change.diff.take() {
                let old = prior.and_then(|item|item.changes.iter().find(|old|old.id==change.id)).and_then(|change|change.diff.as_deref());
                let admitted = admit(&format!("changes/{}/diff",change.id),diff,old,None);
                change.diff = (!admitted.is_empty()).then_some(admitted);
            }
        }
        // A legacy observed witness omitted from a newer optional projection is
        // retained by the application merge; never discard its omission record.
        if let Some(prior) = prior {for omission in &prior.payload_omissions {if !omissions.iter().any(|item|item.field==omission.field) {omissions.push(omission.clone());}}}
        item.payload_omissions = omissions;
    }
    if history.items.iter().any(|item|!item.payload_omissions.is_empty()) {
        let gap = "Optional visible payload omitted by evidence capacity bounds; original messages, failures and outcome metadata are retained.".to_owned();
        if !history.gaps.contains(&gap) {history.gaps.push(gap);}
    }
    history
}
