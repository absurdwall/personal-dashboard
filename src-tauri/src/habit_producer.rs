//! Rebuild the existing snapshot v1 from host-observed source reads and canonical facts.
//! This module never executes code from a user Vault and never creates a Habit catalog.
use crate::habits::{snapshot_dates_at_local_date, SNAPSHOT_RELATIVE_PATH};
use crate::today::CalendarDate;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::{BTreeMap, BTreeSet};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::Path;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct HabitRefreshInput {
    pub mappings: BTreeMap<String, String>,
    pub authorization_quote: String,
    pub execution_mode: String,
    #[serde(default)]
    pub host_source_reads: Vec<Value>,
}
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitRefreshReport {
    pub query: String,
    pub generation: String,
    pub publication: String,
    pub display: String,
    pub generated_at: Option<String>,
    pub range_from: Option<String>,
    pub range_to: Option<String>,
    pub message: String,
}
impl HabitRefreshReport {
    pub fn failed(stage: &str, message: String) -> Self {
        Self {
            query: if stage == "query" {
                "error"
            } else if stage == "publication" {
                "verifiedMappedScope"
            } else {
                "received"
            }
            .into(),
            generation: if stage == "generation" {
                "error"
            } else if stage == "query" {
                "notStarted"
            } else {
                "validated"
            }
            .into(),
            publication: if stage == "publication" {
                "error"
            } else {
                "notPublished"
            }
            .into(),
            display: "retainedOrMissing".into(),
            generated_at: None,
            range_from: None,
            range_to: None,
            message,
        }
    }
}

pub fn native_source_read(item: &Value) -> Option<Value> {
    let tool = item.get("tool")?.as_str()?;
    if item.get("type")?.as_str()? != "mcpToolCall"
        || item.get("server")?.as_str()? != "dida365"
        || item.get("status")?.as_str()? != "completed"
        || !["list_habits", "get_habit", "get_habit_checkins"].contains(&tool)
        || item.get("error").is_some_and(|v| !v.is_null())
    {
        return None;
    }
    let result = item.get("result")?;
    if result.get("isError").and_then(Value::as_bool) == Some(true)
        || result.to_string().len() > 2_000_000
    {
        return None;
    }
    Some(json!({"tool":tool,"arguments":item.get("arguments")?,"result":result}))
}
pub fn supply_native_evidence(arguments: &mut Value, reads: &[Value]) {
    if let Some(arguments) = arguments.as_object_mut() {
        arguments.insert("hostSourceReads".into(), json!(reads));
    }
}

fn payload(read: &Value) -> Option<Value> {
    let result = read.get("result")?;
    let value = result.get("structuredContent").cloned().or_else(|| {
        result
            .get("content")?
            .as_array()?
            .iter()
            .filter_map(|v| v.get("text")?.as_str())
            .find_map(|t| serde_json::from_str(t).ok())
    })?;
    if value.get("error").is_some_and(|e| !e.is_null())
        || value.get("success") == Some(&Value::Bool(false))
        || ["nextCursor", "next_cursor"]
            .iter()
            .any(|key| value.get(key).is_some_and(|cursor| !cursor.is_null()))
        || ["partial", "hasMore", "has_more"]
            .iter()
            .any(|key| value.get(key) == Some(&Value::Bool(true)))
    {
        return None;
    }
    Some(value.get("result").cloned().unwrap_or(value))
}
fn catalog_ids(value: &Value, ids: &mut BTreeSet<String>) {
    match value {
        Value::Object(v) => {
            if v.get("name").and_then(Value::as_str).is_some() {
                if let Some(id) = v.get("id").and_then(Value::as_str) {
                    ids.insert(id.into());
                }
            }
            for key in ["habits", "habit", "result"] {
                if let Some(child) = v.get(key) {
                    catalog_ids(child, ids);
                }
            }
        }
        Value::Array(v) => {
            for child in v {
                catalog_ids(child, ids);
            }
        }
        _ => {}
    }
}

pub fn rebuild(
    prior: &[u8],
    input: &HabitRefreshInput,
    generated_at: &str,
    today: &str,
    local_facts: &BTreeMap<(String, String), Vec<Value>>,
) -> Result<Vec<u8>, (String, String)> {
    let fail = |stage: &str, msg: &str| (stage.to_owned(), msg.to_owned());
    if crate::habits::timestamp_epoch_seconds(generated_at).is_none() {
        return Err(fail(
            "generation",
            "Generation time must be an offset-bearing timestamp",
        ));
    }
    snapshot_dates_at_local_date(prior, today, &generated_at[..10])
        .map_err(|e| ("generation".into(), e))?;
    let mut doc: Value =
        serde_json::from_slice(prior).map_err(|e| ("generation".into(), e.to_string()))?;
    let from = CalendarDate::parse(&generated_at[..10])
        .ok_or_else(|| fail("generation", "Invalid generation date"))?
        .monday()
        .plus_days(-77)
        .to_string();
    let to = today.to_owned();
    let mut ids = BTreeSet::new();
    for read in &input.host_source_reads {
        if [Some("list_habits"), Some("get_habit")]
            .contains(&read.get("tool").and_then(Value::as_str))
        {
            if let Some(value) = payload(read) {
                catalog_ids(&value, &mut ids);
            }
        }
    }
    let habits = doc["habits"]
        .as_array()
        .ok_or_else(|| fail("generation", "Missing existing Habit catalog"))?;
    let keys: BTreeSet<String> = habits
        .iter()
        .filter_map(|h| h["key"].as_str().map(str::to_owned))
        .collect();
    if keys.is_empty()
        || input.mappings.is_empty()
        || !input.mappings.keys().all(|key| keys.contains(key))
    {
        return Err(fail("query","Explicit verified mappings must identify existing catalog keys; no Habit is created or matched by name"));
    }
    let external_ids: BTreeSet<_> = input.mappings.values().cloned().collect();
    if external_ids.len() != input.mappings.len() || !external_ids.is_subset(&ids) {
        return Err(fail("query","Every mapping needs a unique stable ID verified by a current native Habit catalog/object read"));
    }
    let mut checkins = BTreeMap::<String, Vec<Value>>::new();
    let stamp = |date: &str| date.replace('-', "").parse::<i64>().unwrap_or(0);
    for read in &input.host_source_reads {
        if read["tool"] != "get_habit_checkins" {
            continue;
        }
        let args = &read["arguments"];
        if args["from_stamp"].as_i64().unwrap_or(i64::MAX) >= stamp(&from)
            || args["to_stamp"].as_i64().unwrap_or(0) <= stamp(&to)
        {
            continue;
        }
        let requested: BTreeSet<_> = args["habit_ids"]
            .as_array()
            .into_iter()
            .flatten()
            .filter_map(Value::as_str)
            .map(str::to_owned)
            .collect();
        let Some(Value::Array(results)) = payload(read) else {
            continue;
        };
        if results.is_empty() {
            // Native RPC success with an explicit empty result proves no check-ins
            // for its requested IDs/range. Missing/malformed/error is never empty.
            for id in &requested {
                if ids.contains(id) {
                    checkins.entry(id.clone()).or_default();
                }
            }
        }
        for result in results {
            let Some(id) = result["habitId"].as_str() else {
                continue;
            };
            if !requested.contains(id) {
                continue;
            }
            let Some(entries) = result["checkins"].as_array() else {
                continue;
            };
            checkins
                .entry(id.to_owned())
                .or_default()
                .extend(entries.iter().cloned());
        }
    }
    if !external_ids.iter().all(|id| checkins.contains_key(id)) {
        return Err(fail("query","Source query did not prove the full mapped Habit/date coverage; previous snapshot is retained"));
    }
    let sources = doc["sources"]
        .as_array_mut()
        .ok_or_else(|| fail("generation", "Missing source catalog"))?;
    let dida_keys: BTreeSet<String> = sources
        .iter()
        .filter(|s| s["kind"] == "dida365")
        .filter_map(|s| s["key"].as_str().map(str::to_owned))
        .collect();
    let mut mapped_sources = BTreeMap::new();
    for (key, id) in &input.mappings {
        let source_key = format!("dida-{key}");
        let label = format!("Dida365 explicit mapping {key}={id}");
        let previous = sources.iter().find(|s| s["key"] == source_key);
        if previous.is_some_and(|s| s["kind"] != "dida365" || s["label"] != label) {
            return Err(fail("query","Explicit source identity conflicts with the existing mapping; no snapshot published"));
        }
        if previous.is_none() {
            if !input.authorization_quote.contains(&format!("{key}={id}")) {
                return Err(fail("query","A first semantic Habit/ID association needs explicit user confirmation; matching display names is insufficient"));
            }
            sources.push(json!({"key":source_key,"kind":"dida365","label":label}));
        }
        mapped_sources.insert(key.clone(), source_key);
    }
    const LOCAL: &str = "dashboard-daily-record";
    if let Some(existing) = sources.iter().find(|s| s["key"] == LOCAL) {
        if existing["kind"] != "dashboard" {
            return Err(fail(
                "generation",
                "Local source key already belongs to another source",
            ));
        }
    } else {
        sources.push(
            json!({"key":LOCAL,"kind":"dashboard","label":"Dashboard canonical Daily Record"}),
        );
    }
    for habit in doc["habits"].as_array_mut().unwrap() {
        let key = habit["key"].as_str().unwrap().to_owned();
        let id = input.mappings.get(&key);
        let daily_time = habit["trackingKind"] == "daily-time";
        let mut days = BTreeMap::<String, Value>::new();
        for old in habit["days"].as_array().unwrap() {
            let date = old["livedDate"].as_str().unwrap();
            if date >= from.as_str() && date <= to.as_str() {
                let retained: Vec<_> = old["observations"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .filter(|o| {
                        (id.is_none()
                            || (!dida_keys.contains(o["source"].as_str().unwrap_or(""))
                                && o["source"] != mapped_sources[&key]))
                            && o["source"] != LOCAL
                    })
                    .cloned()
                    .collect();
                days.insert(date.into(),json!({"livedDate":date,"coverage":if id.is_some() {"complete"} else {"partial"},"observations":retained}));
            }
        }
        let mut date = CalendarDate::parse(&from).unwrap();
        let end = CalendarDate::parse(&to).unwrap();
        while date <= end {
            let label = date.to_string();
            days.entry(label.clone()).or_insert_with(||json!({"livedDate":label,"coverage":if id.is_some() {"complete"} else {"unknown"},"observations":[]}));
            date = date.plus_days(1);
        }
        // Same-source newest state is reduced here, without counting duplicate deliveries.
        let mut external = BTreeMap::<String, (Option<i64>, Value)>::new();
        for entry in id.into_iter().flat_map(|id| checkins[id].iter()) {
            let Some(n) = entry["stamp"].as_i64() else {
                return Err(fail("generation", "Invalid source check-in date"));
            };
            let raw = format!("{n:08}");
            if raw.len() != 8 {
                return Err(fail("generation", "Invalid source check-in date"));
            }
            let date = format!("{}-{}-{}", &raw[..4], &raw[4..6], &raw[6..]);
            if CalendarDate::parse(&date).is_none() {
                return Err(fail("generation", "Invalid source check-in date"));
            }
            if date < from || date > to {
                continue;
            }
            let status = match entry["status"].as_i64() {
                Some(0) => "unmarked",
                Some(1) => "not-done",
                Some(2) if daily_time => "threshold-met",
                Some(2) => "completed",
                _ => {
                    return Err(fail(
                        "generation",
                        "Unknown source check-in status; previous snapshot retained",
                    ))
                }
            };
            let observation = if status == "unmarked" {
                Value::Null
            } else {
                json!({"source":mapped_sources[&key],"observedAt":generated_at,"status":status,
                "evidence":if status=="threshold-met" {"threshold-check-in"} else {"check-in"},
                "note":format!("Verified Dida Habit {}; source stamp {n}; queried {from} — {to}; save time is not occurrence time", id.unwrap())})
            };
            let op_time = entry.get("opTime").and_then(|v| {
                v.as_i64()
                    .map(|n| if n > 10_000_000_000 { n / 1000 } else { n })
                    .or_else(|| v.as_str().and_then(crate::habits::timestamp_epoch_seconds))
            });
            match external.get(&date) {
                Some((previous_time, previous)) if previous != &observation => {
                    match (*previous_time,op_time) {
                        (Some(previous),Some(next)) if next>previous => {external.insert(date,(op_time,observation));},
                        (Some(previous),Some(next)) if next<previous => {},
                        _=>return Err(fail("generation","Contradictory equal/unknown-time check-ins require a verified latest source outcome")),
                    }
                }
                None => {
                    external.insert(date, (op_time, observation));
                }
                _ => {}
            }
        }
        for (date, (_, observation)) in external {
            if observation.is_null() {
                continue;
            }
            days.get_mut(&date).unwrap()["observations"]
                .as_array_mut()
                .unwrap()
                .push(observation);
        }
        if daily_time && ["wake", "sleep"].contains(&key.as_str()) {
            for ((fact_key, date), facts) in local_facts {
                if fact_key == &key {
                    if let Some(day) = days.get_mut(date) {
                        day["observations"]
                            .as_array_mut()
                            .unwrap()
                            .extend(facts.iter().cloned());
                    }
                }
            }
        }
        habit["days"] = Value::Array(days.into_values().collect());
    }
    doc["generatedAt"] = json!(generated_at);
    doc["range"] = json!({"from":from,"to":to});
    doc["producer"] = json!({"kind":"dashboard-derived","label":"Verified native Dida reads + canonical Daily Records"});
    let bytes =
        serde_json::to_vec_pretty(&doc).map_err(|e| ("generation".into(), e.to_string()))?;
    snapshot_dates_at_local_date(&bytes, today, &generated_at[..10])
        .map_err(|e| ("generation".into(), e))?;
    Ok(bytes)
}

pub fn publish(vault: &Path, expected: &[u8], candidate: &[u8]) -> Result<(), String> {
    publish_with_source_check(vault, expected, candidate, || Ok(()))
}
// Validate the consumed canonical sources on both sides of atomic activation.
// External editors do not participate in a multi-file transaction; a detected
// revision change rejects this candidate rather than acknowledging stale facts.
pub(crate) fn publish_with_source_check(
    vault: &Path,
    expected: &[u8],
    candidate: &[u8],
    check_sources: impl Fn() -> Result<(), String>,
) -> Result<(), String> {
    publish_at_boundaries(
        vault,
        expected,
        candidate,
        |_| Ok(()),
        |_| Ok(()),
        check_sources,
        |_| Ok(()),
    )
}

#[cfg(test)]
fn publish_with_boundaries(
    vault: &Path,
    expected: &[u8],
    candidate: &[u8],
    before: impl FnOnce(&Path) -> Result<(), String>,
    after: impl FnOnce(&Path) -> Result<(), String>,
) -> Result<(), String> {
    publish_at_boundaries(
        vault,
        expected,
        candidate,
        before,
        after,
        || Ok(()),
        |_| Ok(()),
    )
}

fn publish_at_boundaries(
    vault: &Path,
    expected: &[u8],
    candidate: &[u8],
    before: impl FnOnce(&Path) -> Result<(), String>,
    after: impl FnOnce(&Path) -> Result<(), String>,
    check_sources: impl Fn() -> Result<(), String>,
    before_rollback: impl FnMut(&Path) -> Result<(), String>,
) -> Result<(), String> {
    let vault = vault.canonicalize().map_err(|e| e.to_string())?;
    let path = vault.join(SNAPSHOT_RELATIVE_PATH);
    let parent = path.parent().unwrap();
    for relative in [
        "life",
        "life/.personal-dashboard",
        "life/.personal-dashboard/derived",
        SNAPSHOT_RELATIVE_PATH,
    ] {
        let p = vault.join(relative);
        if fs::symlink_metadata(&p)
            .map_err(|e| e.to_string())?
            .file_type()
            .is_symlink()
        {
            return Err("Snapshot path is redirected; no publication".into());
        }
    }
    if fs::read(&path).map_err(|e| e.to_string())? != expected {
        return Err("Snapshot changed during generation; retained concurrent source bytes".into());
    }
    let temporary = parent.join(format!(
        ".habits-v1-{}-{}.tmp",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_nanos()
    ));
    let mut activated = false;
    let result = (|| {
        let mut file = OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&temporary)
            .map_err(|e| e.to_string())?;
        file.write_all(candidate)
            .and_then(|_| file.sync_all())
            .map_err(|e| e.to_string())?;
        before(&path)?;
        check_sources()?;
        crate::today::atomic_exchange(
            &temporary,
            &path,
            crate::today::StorageDocumentKind::HabitCompletions,
        )
        .map_err(|e| format!("Snapshot atomic publication failed: {e}"))?;
        activated = true;
        let validation = (|| {
            if fs::read(&temporary).map_err(|e| e.to_string())? != expected {
                return Err("Snapshot changed at the atomic publication boundary".to_string());
            }
            after(&path)?;
            check_sources()?;
            fs::File::open(parent)
                .and_then(|f| f.sync_all())
                .map_err(|e| e.to_string())?;
            if fs::read(&path).map_err(|e| e.to_string())? != candidate {
                return Err("Snapshot readback did not confirm generated bytes".to_string());
            }
            Ok(())
        })();
        if let Err(error) = validation {
            return rollback_publication(&path, &temporary, candidate, &error, before_rollback);
        }
        Ok(())
    })();
    if temporary.exists() && (result.is_ok() || !activated) {
        let _ = fs::remove_file(temporary);
    }
    result
}

// Atomic exchange has no compare-and-swap predicate. Preserve every displaced
// version before an attempted rollback, then inspect what the exchange actually
// displaced. A writer arriving after the ownership read is a conflict, not a
// successful restoration. Bounded retries restore its bytes when possible;
// sustained concurrency leaves all versions linked and reports recovery paths.
fn rollback_publication(
    path: &Path,
    temporary: &Path,
    candidate: &[u8],
    error: &str,
    mut before_exchange: impl FnMut(&Path) -> Result<(), String>,
) -> Result<(), String> {
    let mut owned = candidate.to_vec();
    let mut recovery_paths = vec![temporary.to_path_buf()];
    let locations = |paths: &[std::path::PathBuf]| {
        paths
            .iter()
            .map(|p| p.display().to_string())
            .collect::<Vec<_>>()
            .join(", ")
    };
    for attempt in 0..3 {
        if !fs::read(path).is_ok_and(|bytes| bytes == owned) {
            return Err(format!(
                "{error}; a later snapshot writer is active; displaced versions preserved at {}",
                locations(&recovery_paths)
            ));
        }
        let restored = fs::read(temporary).map_err(|e| {
            format!(
                "{error}; could not read displaced snapshot: {e}; recovery at {}",
                locations(&recovery_paths)
            )
        })?;
        let recovery = temporary.with_extension(format!("recovery-{attempt}"));
        let preservation = (|| {
            let mut file = OpenOptions::new()
                .create_new(true)
                .write(true)
                .open(&recovery)?;
            file.write_all(&restored)?;
            file.sync_all()?;
            fs::File::open(path.parent().unwrap())?.sync_all()
        })();
        recovery_paths.push(recovery);
        preservation.map_err(|e| {
            format!(
                "{error}; snapshot recovery preservation failed: {e}; recovery at {}",
                locations(&recovery_paths)
            )
        })?;
        before_exchange(path).map_err(|e| {
            format!(
                "{error}; rollback interrupted: {e}; recovery at {}",
                locations(&recovery_paths)
            )
        })?;
        crate::today::atomic_exchange(
            temporary,
            path,
            crate::today::StorageDocumentKind::HabitCompletions,
        )
        .map_err(|e| {
            format!(
                "{error}; snapshot rollback failed: {e}; recovery at {}",
                locations(&recovery_paths)
            )
        })?;
        // The newest displaced writer may not have synced its own file yet.
        // Keep that recovery file durable even when the retry bound is reached.
        fs::File::open(temporary)
            .and_then(|f| f.sync_all())
            .map_err(|e| {
                format!(
                    "{error}; could not sync displaced snapshot: {e}; recovery at {}",
                    locations(&recovery_paths)
                )
            })?;
        fs::File::open(path.parent().unwrap())
            .and_then(|f| f.sync_all())
            .map_err(|e| {
                format!(
                    "{error}; could not sync rollback: {e}; recovery at {}",
                    locations(&recovery_paths)
                )
            })?;
        let displaced = fs::read(temporary).map_err(|e| {
            format!(
                "{error}; could not verify rollback: {e}; recovery at {}",
                locations(&recovery_paths)
            )
        })?;
        if displaced == owned {
            let status = if fs::read(path).is_ok_and(|bytes| bytes == restored) {
                if attempt == 0 {
                    "displaced snapshot restored"
                } else {
                    "concurrent snapshot restored after rollback conflict"
                }
            } else {
                "a later snapshot writer is active"
            };
            return Err(format!(
                "{error}; {status}; displaced versions preserved at {}",
                locations(&recovery_paths)
            ));
        }
        // The exchange displaced a newer writer. Its bytes remain at temporary;
        // restore them only while the path still contains our prior restoration.
        owned = restored;
    }
    Err(format!("{error}; repeated snapshot writers prevented verified rollback; rollback conflict requires canonical snapshot review, latest displaced writer remains at {}; all displaced versions preserved at {}", temporary.display(), locations(&recovery_paths)))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn native_evidence_accepts_only_successful_bounded_selected_reads_and_replaces_forged_evidence()
    {
        let base = json!({"type":"mcpToolCall","server":"dida365","tool":"get_habit_checkins","status":"completed","arguments":{},"result":{"structuredContent":{"result":[]}}});
        assert!(native_source_read(&base).is_some());
        for (field, value) in [
            ("server", json!("other")),
            ("tool", json!("add_habit_checkin")),
            ("status", json!("failed")),
            ("error", json!({"code":401})),
        ] {
            let mut candidate = base.clone();
            candidate[field] = value;
            assert!(native_source_read(&candidate).is_none());
        }
        let mut is_error = base.clone();
        is_error["result"]["isError"] = json!(true);
        assert!(native_source_read(&is_error).is_none());
        let mut arguments = json!({"hostSourceReads":[{"forged":"agent source data"}]});
        supply_native_evidence(&mut arguments, &[]);
        assert_eq!(arguments["hostSourceReads"], json!([]));
        let read = native_source_read(&base).unwrap();
        supply_native_evidence(&mut arguments, &[read.clone()]);
        assert_eq!(arguments["hostSourceReads"], json!([read]));
    }
    #[test]
    fn atomic_publication_preserves_old_and_concurrent_bytes_on_failed_activation() {
        let root = std::env::temp_dir().join(format!(
            "pd-habit-publish-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let path = root.join(SNAPSHOT_RELATIVE_PATH);
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(&path, b"old complete snapshot").unwrap();
        assert!(publish_with_boundaries(
            &root,
            b"old complete snapshot",
            b"new complete snapshot",
            |_| Err("injected generation boundary failure".into()),
            |_| Ok(())
        )
        .is_err());
        assert_eq!(fs::read(&path).unwrap(), b"old complete snapshot");
        assert!(publish_with_boundaries(
            &root,
            b"old complete snapshot",
            b"new complete snapshot",
            |_| Ok(()),
            |_| Err("injected publication/readback failure".into())
        )
        .is_err());
        assert_eq!(fs::read(&path).unwrap(), b"old complete snapshot");
        assert!(publish_with_boundaries(
            &root,
            b"old complete snapshot",
            b"new complete snapshot",
            |path| fs::write(path, b"concurrent complete snapshot").map_err(|e| e.to_string()),
            |_| Ok(())
        )
        .is_err());
        assert_eq!(fs::read(&path).unwrap(), b"concurrent complete snapshot");
        publish(
            &root,
            b"concurrent complete snapshot",
            b"new complete snapshot",
        )
        .unwrap();
        assert_eq!(fs::read(&path).unwrap(), b"new complete snapshot");
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rollback_detects_a_writer_after_ownership_read_and_preserves_every_version() {
        for writers in [1, 3] {
            let root = std::env::temp_dir().join(format!(
                "pd-habit-rollback-{}-{}-{writers}",
                std::process::id(),
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos()
            ));
            let path = root.join(SNAPSHOT_RELATIVE_PATH);
            fs::create_dir_all(path.parent().unwrap()).unwrap();
            fs::write(&path, b"original snapshot").unwrap();
            let mut exchanges = 0;
            let error = publish_at_boundaries(
                &root,
                b"original snapshot",
                b"rejected candidate",
                |_| Ok(()),
                |_| Err("injected validation failure".into()),
                || Ok(()),
                |path| {
                    exchanges += 1;
                    if exchanges <= writers {
                        fs::write(path, format!("later writer {exchanges}")).unwrap();
                    }
                    Ok(())
                },
            )
            .unwrap_err();
            assert!(error.contains("conflict"), "{error}");
            assert!(error.contains("preserved at"), "{error}");
            let files: Vec<_> = fs::read_dir(path.parent().unwrap())
                .unwrap()
                .map(|entry| fs::read(entry.unwrap().path()).unwrap())
                .collect();
            assert!(files.iter().any(|bytes| bytes == b"original snapshot"));
            for index in 1..=writers {
                assert!(files
                    .iter()
                    .any(|bytes| bytes == format!("later writer {index}").as_bytes()));
            }
            if writers == 1 {
                assert_eq!(fs::read(&path).unwrap(), b"later writer 1");
                assert!(error.contains("concurrent snapshot restored after rollback conflict"));
            } else {
                assert!(error.contains("repeated snapshot writers prevented verified rollback"));
                assert!(!error.contains("snapshot restored"));
            }
            // Every retained recovery file is disclosed in the conflict message.
            for entry in fs::read_dir(path.parent().unwrap()).unwrap() {
                let file = entry.unwrap().path();
                if file != path {
                    assert!(error.contains(&file.display().to_string()), "{error}");
                }
            }
            fs::remove_dir_all(root).unwrap();
        }
    }
}
