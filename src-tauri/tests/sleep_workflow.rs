use personal_dashboard_lib::sleep::{SleepMutationInput, SleepWorkflow};
use serde_json::json;
use std::fs;

#[test]
fn reported_night_is_read_back_supplemented_and_reopened_without_copying_daily_data() {
    let root = std::env::temp_dir().join(format!("pd-sleep-{}", std::process::id()));
    fs::create_dir_all(root.join(".obsidian")).unwrap();
    fs::create_dir_all(root.join("life/Journal/Daily")).unwrap();
    let workflow = SleepWorkflow::new(&root);
    let opened = workflow.read().unwrap();
    let first = workflow.save(serde_json::from_value::<SleepMutationInput>(json!({
        "wakeDate":"2026-10-21","changeId":"first", "targetBinding":opened.target_binding,
        "expectedRevision":opened.revision,
        "sleepOnset":{"kind":"point","date":"2026-10-20","time":"23:50","utcOffsetMinutes":-240,"approximate":true}
    })).unwrap()).unwrap();
    let saved = workflow
        .save(
            serde_json::from_value(json!({
                "recordId":first.records[0].id,"wakeDate":"2026-10-21","changeId":"supplement",
                "targetBinding":first.target_binding,"expectedRevision":first.revision,
                "getUp":{"kind":"point","date":"2026-10-21","time":"07:20","utcOffsetMinutes":-240}
            }))
            .unwrap(),
        )
        .unwrap();
    assert_eq!(saved.records[0].estimated_duration_minutes, Some(450));
    assert_eq!(SleepWorkflow::new(&root).read().unwrap(), saved);
    assert_eq!(
        fs::read_dir(root.join("life/Journal/Daily"))
            .unwrap()
            .count(),
        0
    );
    fs::remove_dir_all(root).unwrap();
}

fn vault(label: &str) -> std::path::PathBuf {
    let root = std::env::temp_dir().join(format!(
        "pd-sleep-{label}-{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ));
    fs::create_dir_all(root.join(".obsidian")).unwrap();
    fs::create_dir_all(root.join("life/Journal/Daily")).unwrap();
    root
}
fn save(
    workflow: &SleepWorkflow,
    mut patch: serde_json::Value,
) -> personal_dashboard_lib::sleep::SleepView {
    let view = workflow.read().unwrap();
    patch["targetBinding"] = json!(view.target_binding);
    patch["expectedRevision"] = json!(view.revision);
    workflow
        .save(serde_json::from_value(patch).unwrap())
        .unwrap()
}
fn point(date: &str, time: &str, offset: i32) -> serde_json::Value {
    json!({"kind":"point","date":date,"time":time,"utcOffsetMinutes":offset})
}

#[test]
fn same_calendar_early_morning_and_daylight_saving_use_actual_endpoints() {
    let root = vault("actual-endpoints");
    let workflow = SleepWorkflow::new(&root);
    let same = save(
        &workflow,
        json!({"wakeDate":"2026-10-21","changeId":"same-day","sleepOnset":point("2026-10-21","00:10",-240),"getUp":point("2026-10-21","08:10",-240)}),
    );
    assert_eq!(same.records[0].estimated_duration_minutes, Some(480));
    let dst = save(
        &workflow,
        json!({"wakeDate":"2026-11-01","changeId":"dst","sleepOnset":point("2026-11-01","00:30",-240),"getUp":point("2026-11-01","07:30",-300)}),
    );
    assert_eq!(dst.records[1].estimated_duration_minutes, Some(480));
    fs::remove_dir_all(root).unwrap();
}
#[test]
fn unknown_unrecorded_ranges_and_original_words_remain_distinct_and_have_no_duration() {
    let root = vault("precision");
    let workflow = SleepWorkflow::new(&root);
    let partial = save(
        &workflow,
        json!({"wakeDate":"2026-10-21","changeId":"known","getUp":{"kind":"unknown"}}),
    );
    assert_eq!(
        serde_json::to_value(&partial.records[0].sleep_onset).unwrap(),
        json!({"kind":"unrecorded"})
    );
    assert_eq!(
        serde_json::to_value(&partial.records[0].get_up).unwrap(),
        json!({"kind":"unknown"})
    );
    let fuzzy = save(
        &workflow,
        json!({"wakeDate":"2026-10-21","changeId":"fuzzy","getUp":{"kind":"text","date":"2026-10-21","text":"八点多"}}),
    );
    assert_eq!(fuzzy.records[0].estimated_duration_minutes, None);
    let bounded = save(
        &workflow,
        json!({"wakeDate":"2026-10-21","changeId":"range","getUp":{"kind":"range","start":{"date":"2026-10-21","time":"08:00","utcOffsetMinutes":-240},"end":{"date":"2026-10-21","time":"09:00","utcOffsetMinutes":-240},"reportedText":"八点到九点"}}),
    );
    assert_eq!(bounded.records[0].estimated_duration_minutes, None);
    fs::remove_dir_all(root).unwrap();
}
#[test]
fn invalid_order_ambiguous_date_conflicts_and_other_vault_binding_do_not_write() {
    let root = vault("reject");
    let workflow = SleepWorkflow::new(&root);
    let original = workflow.read().unwrap();
    let input = json!({"wakeDate":"2026-10-21","changeId":"reverse","targetBinding":original.target_binding,"expectedRevision":null,"sleepOnset":point("2026-10-21","23:50",-240),"getUp":point("2026-10-21","07:20",-240)});
    assert!(workflow
        .save(serde_json::from_value(input).unwrap())
        .is_err());
    assert_eq!(workflow.read().unwrap(), original);
    assert!(serde_json::from_value::<SleepMutationInput>(
        json!({"changeId":"ambiguous","sleepOnset":point("2026-10-21","02:00",-240)})
    )
    .is_err());
    let other_root = vault("other");
    let other = SleepWorkflow::new(&other_root);
    assert!(other.save(serde_json::from_value(json!({"wakeDate":"2026-10-21","changeId":"wrong-vault","targetBinding":original.target_binding,"expectedRevision":null,"getUp":{"kind":"unknown"}})).unwrap()).is_err());
    assert!(other.read().unwrap().records.is_empty());
    fs::remove_dir_all(root).unwrap();
    fs::remove_dir_all(other_root).unwrap();
}
#[test]
fn corrections_keep_identity_block_occupied_dates_and_repeated_delivery_is_idempotent() {
    let root = vault("correction");
    let workflow = SleepWorkflow::new(&root);
    let first = save(
        &workflow,
        json!({"wakeDate":"2026-08-01","changeId":"old-night","getUp":{"kind":"unknown"}}),
    );
    let first_id = first.records[0].id.clone();
    let moved = save(
        &workflow,
        json!({"recordId":first_id,"wakeDate":"2026-08-02","changeId":"move","sleepOnset":point("2026-08-02","02:00",-240)}),
    );
    assert_eq!(moved.records.len(), 1);
    assert_eq!(moved.records[0].id, first_id);
    let second = save(
        &workflow,
        json!({"wakeDate":"2026-08-03","changeId":"second-night","getUp":{"kind":"unknown"}}),
    );
    let conflict = json!({"recordId":first_id,"wakeDate":"2026-08-03","changeId":"occupied","targetBinding":second.target_binding,"expectedRevision":second.revision,"getUp":{"kind":"unknown"}});
    assert!(workflow
        .save(serde_json::from_value(conflict).unwrap())
        .is_err());
    assert_eq!(workflow.read().unwrap(), second);
    let exact:SleepMutationInput=serde_json::from_value(json!({"recordId":first_id,"wakeDate":"2026-08-02","changeId":"repeat","targetBinding":second.target_binding,"expectedRevision":second.revision,"getUp":point("2026-08-02","08:00",-240)})).unwrap();
    let saved = workflow.save(exact.clone()).unwrap();
    assert_eq!(workflow.save(exact).unwrap(), saved);
    let stale = json!({"wakeDate":"2026-08-02","changeId":"stale","targetBinding":second.target_binding,"expectedRevision":second.revision,"getUp":{"kind":"unknown"}});
    assert!(workflow
        .save(serde_json::from_value(stale).unwrap())
        .is_err());
    assert_eq!(workflow.read().unwrap(), saved);
    fs::remove_dir_all(root).unwrap();
}

#[cfg(target_os = "macos")]
#[test]
fn saving_a_sleep_correction_preserves_later_external_writes_to_the_displaced_file() {
    use std::io::{Seek, SeekFrom, Write};
    let root = vault("retained-external-file");
    let workflow = SleepWorkflow::new(&root);
    let first = save(
        &workflow,
        json!({"wakeDate":"2026-10-21","changeId":"initial","getUp":{"kind":"unknown"}}),
    );
    let path = root.join("life/.personal-dashboard/sleep/v1/sessions.json");
    let mut retained = fs::OpenOptions::new().write(true).open(&path).unwrap();
    let mut external: serde_json::Value =
        serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
    external["records"][0]["getUp"] =
        json!({"kind":"text","date":"2026-10-21","text":"External editor: 八点多"});
    let external_bytes = serde_json::to_vec_pretty(&external).unwrap();
    let saved = save(
        &workflow,
        json!({"recordId":first.records[0].id,"wakeDate":"2026-10-21","changeId":"correction","getUp":point("2026-10-21","07:20",-240)}),
    );
    retained.set_len(0).unwrap();
    retained.seek(SeekFrom::Start(0)).unwrap();
    retained.write_all(&external_bytes).unwrap();
    retained.sync_all().unwrap();
    assert_eq!(workflow.read().unwrap(), saved);
    let recovery = root.join("life/.personal-dashboard/recovery/today");
    assert!(
        recovery.is_dir(),
        "the displaced sleep file must remain recoverable"
    );
    assert!(
        fs::read_dir(recovery)
            .unwrap()
            .any(|entry| fs::read(entry.unwrap().path()).unwrap() == external_bytes),
        "late external bytes must remain reachable through recovery"
    );
    fs::remove_dir_all(root).unwrap();
}
