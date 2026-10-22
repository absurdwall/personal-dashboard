use personal_dashboard_lib::sleep::SleepMutationInput;
use personal_dashboard_lib::today::{
    TodayApplication, TodayClock, TodayWorkspaceExchange, TodayWorkspacePersistence,
};
use serde_json::json;
use std::fs;
use std::path::{Path, PathBuf};

#[test]
fn reported_night_is_read_back_supplemented_and_reopened_without_copying_daily_data() {
    let root = vault("reported-night");
    let workflow = application(&root);
    let opened = workflow.sleep_records().unwrap();
    let first = workflow.save_sleep_record(serde_json::from_value::<SleepMutationInput>(json!({
        "wakeDate":"2026-10-21","changeId":"first", "targetBinding":opened.target_binding,
        "expectedRevision":opened.revision,
        "sleepOnset":{"kind":"point","date":"2026-10-20","time":"23:50","utcOffsetMinutes":-240,"approximate":true}
    })).unwrap()).unwrap();
    let saved = workflow
        .save_sleep_record(
            serde_json::from_value(json!({
                "recordId":first.records[0].id,"wakeDate":"2026-10-21","changeId":"supplement",
                "targetBinding":first.target_binding,"expectedRevision":first.revision,
                "getUp":{"kind":"point","date":"2026-10-21","time":"07:20","utcOffsetMinutes":-240}
            }))
            .unwrap(),
        )
        .unwrap();
    assert_eq!(saved.records[0].estimated_duration_minutes, Some(450));
    assert_eq!(application(&root).sleep_records().unwrap(), saved);
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

#[derive(Clone)]
struct Selected(PathBuf);
impl TodayWorkspacePersistence for Selected {
    fn load_selected_vault(&self) -> Result<Option<PathBuf>, String> {
        Ok(Some(self.0.clone()))
    }
    fn save_selected_vault(&self, _: &Path) -> Result<(), String> {
        Ok(())
    }
}
struct NoSelection;
impl TodayWorkspaceExchange for NoSelection {
    fn select_vault(&self) -> Result<Option<PathBuf>, String> {
        Ok(None)
    }
}
struct FixedClock;
impl TodayClock for FixedClock {
    fn current_date(&self) -> String {
        "2026-10-22".into()
    }
    fn current_time_label(&self) -> String {
        "09:00".into()
    }
    fn current_timestamp_label(&self) -> String {
        "2026-10-22T09:00:00-04:00".into()
    }
}
fn application(root: &Path) -> TodayApplication<Selected, NoSelection, FixedClock> {
    TodayApplication::new(Selected(root.to_owned()), NoSelection, FixedClock)
}

fn save(
    workflow: &TodayApplication<Selected, NoSelection, FixedClock>,
    mut patch: serde_json::Value,
) -> personal_dashboard_lib::sleep::SleepView {
    let view = workflow.sleep_records().unwrap();
    patch["targetBinding"] = json!(view.target_binding);
    patch["expectedRevision"] = json!(view.revision);
    workflow
        .save_sleep_record(serde_json::from_value(patch).unwrap())
        .unwrap()
}
fn point(date: &str, time: &str, offset: i32) -> serde_json::Value {
    json!({"kind":"point","date":date,"time":time,"utcOffsetMinutes":offset})
}

#[test]
fn same_night_endpoints_project_to_independent_lived_days_without_completing_habits() {
    let root = vault("lived-endpoints");
    let app = application(&root);
    let saved = save(
        &app,
        json!({"wakeDate":"2026-10-22","changeId":"early-onset", "sleepOnset":point("2026-10-22","02:00",-240), "getUp":point("2026-10-22","07:30",-240)}),
    );
    let facts = serde_json::to_value(&saved).unwrap()["facts"].clone();
    assert_eq!(facts[0]["habitKey"], "sleep");
    assert_eq!(facts[0]["livedDate"], "2026-10-21");
    assert_eq!(facts[0]["dayRelation"], "next-day");
    assert_eq!(facts[1]["habitKey"], "wake");
    assert_eq!(facts[1]["livedDate"], "2026-10-22");
    assert_eq!(saved.records[0].estimated_duration_minutes, Some(330));
    assert!(!root
        .join("life/.personal-dashboard/habit-completions/v1/completions.json")
        .exists());
    assert_eq!(
        fs::read_dir(root.join("life/Journal/Daily"))
            .unwrap()
            .count(),
        0
    );
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn uncertain_endpoints_keep_explicit_context_and_partial_correction_preserves_other_endpoint() {
    let root = vault("precision-context");
    let app = application(&root);
    let first = save(
        &app,
        json!({"wakeDate":"2026-10-22","changeId":"unknown", "sleepOnset":{"kind":"unknown"}, "sleepOnsetLivedDate":"2026-10-21"}),
    );
    assert_eq!(
        serde_json::to_value(&first).unwrap()["facts"][0]["livedDate"],
        "2026-10-21"
    );
    let supplied = save(
        &app,
        json!({"recordId":first.records[0].id,"wakeDate":"2026-10-22","changeId":"supply-wake", "getUp":point("2026-10-22","07:30",-240)}),
    );
    assert_eq!(
        serde_json::to_value(&supplied).unwrap()["facts"][0]["livedDate"],
        "2026-10-21"
    );
    let corrected = save(
        &app,
        json!({"recordId":first.records[0].id,"wakeDate":"2026-10-22","changeId":"correct-actual-date", "getUp":point("2026-10-23","03:30",-240)}),
    );
    assert_eq!(corrected.records[0].id, first.records[0].id);
    assert_eq!(corrected.records[0].wake_date, "2026-10-22");
    assert_eq!(
        serde_json::to_value(&corrected).unwrap()["facts"][1]["livedDate"],
        "2026-10-22"
    );
    let cross_boundary = save(
        &app,
        json!({"recordId":first.records[0].id,"wakeDate":"2026-10-22","changeId":"cross-boundary", "sleepOnset":{"kind":"range","start":{"date":"2026-10-22","time":"03:30","utcOffsetMinutes":-240},"end":{"date":"2026-10-22","time":"04:30","utcOffsetMinutes":-240},"reportedText":"三点半到四点半"}}),
    );
    assert_eq!(
        serde_json::to_value(&cross_boundary).unwrap()["facts"][0]["livedDate"],
        serde_json::Value::Null
    );
    assert_eq!(cross_boundary.records[0].estimated_duration_minutes, None);
    assert_eq!(application(&root).sleep_records().unwrap(), cross_boundary);
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn original_habit_actual_slot_reads_canonical_facts_by_identity_and_preserves_completion_evidence()
{
    let root = vault("habit-projection");
    let path = root.join(personal_dashboard_lib::habits::SNAPSHOT_RELATIVE_PATH);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    let mut snapshot: serde_json::Value =
        serde_json::from_str(include_str!("fixtures/habits-v1-complete.json")).unwrap();
    snapshot["generatedAt"] = json!("2026-10-22T08:00:00-04:00");
    snapshot["range"] = json!({"from":"2026-08-03","to":"2026-10-22"});
    snapshot["habits"]
        .as_array_mut()
        .unwrap()
        .retain(|h| ["sleep", "wake"].contains(&h["key"].as_str().unwrap()));
    for habit in snapshot["habits"].as_array_mut().unwrap() {
        habit["name"] = json!(format!("Renamed {}", habit["key"].as_str().unwrap()));
        habit["days"] = json!([{"livedDate":"2026-10-21","coverage":"complete","observations":[{"source":"dida","observedAt":"2026-10-22T03:00:00-04:00","status":"threshold-met","evidence":"threshold-check-in"}]}]);
    }
    fs::write(path, serde_json::to_vec(&snapshot).unwrap()).unwrap();
    let app = application(&root);
    let before = app.habits().unwrap();
    assert_eq!(before.habits.len(), 2, "{before:?}");
    save(
        &app,
        json!({"wakeDate":"2026-10-22","changeId":"canonical-row", "sleepOnset":point("2026-10-22","02:00",-240), "getUp":point("2026-10-22","07:30",-240)}),
    );
    let after = app.habits().unwrap();
    let sleep = after.habit("sleep").unwrap().cell("2026-10-21").unwrap();
    assert_eq!(sleep.actual_time_label.as_deref(), Some("次日 02:00"));
    assert_eq!(
        serde_json::to_value(sleep).unwrap()["sleepFact"]["habitKey"],
        "sleep"
    );
    let wake = after.habit("wake").unwrap().cell("2026-10-22").unwrap();
    assert_eq!(wake.actual_time_label.as_deref(), Some("07:30"));
    assert!(!wake.counts_as_completion);
    let previous = before.habit("sleep").unwrap().cell("2026-10-21").unwrap();
    assert_eq!(sleep.counts_as_completion, previous.counts_as_completion);
    assert_eq!(
        sleep.completion_source_labels,
        previous.completion_source_labels
    );
    assert_eq!(sleep.coverage, previous.coverage);
    assert_eq!(
        after.habit("sleep").unwrap().goal_label,
        before.habit("sleep").unwrap().goal_label
    );
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn selected_habit_and_lived_day_supplement_a_unique_night_without_user_facing_night_ids() {
    let root = vault("habit-entry");
    let app = application(&root);
    let opened = app.sleep_records().unwrap();
    let first_input = json!({"habitKey":"sleep","livedDate":"2026-10-21","endpoint":point("2026-10-22","02:00",-240),"changeId":"manual-sleep","targetBinding":opened.target_binding,"expectedRevision":opened.revision});
    let first = app
        .save_habit_sleep_time(serde_json::from_value(first_input.clone()).unwrap())
        .unwrap();
    let second = app.save_habit_sleep_time(serde_json::from_value(json!({"habitKey":"wake","livedDate":"2026-10-22","endpoint":point("2026-10-22","07:30",-240),"changeId":"manual-wake","targetBinding":first.target_binding,"expectedRevision":first.revision})).unwrap()).unwrap();
    assert_eq!(second.records.len(), 1);
    assert_eq!(second.records[0].id, first.records[0].id);
    assert_eq!(second.records[0].estimated_duration_minutes, Some(330));
    let duplicate = app
        .save_habit_sleep_time(serde_json::from_value(first_input).unwrap())
        .unwrap();
    assert_eq!(duplicate, second);
    let correction = app.save_habit_sleep_time(serde_json::from_value(json!({"habitKey":"sleep","livedDate":"2026-10-21","endpoint":{"kind":"unknown"},"changeId":"manual-correct","targetBinding":second.target_binding,"expectedRevision":second.revision})).unwrap()).unwrap();
    assert_eq!(correction.records[0].id, first.records[0].id);
    assert_eq!(
        serde_json::to_value(&correction).unwrap()["facts"][0]["livedDate"],
        "2026-10-21"
    );
    assert_eq!(correction.records[0].get_up, second.records[0].get_up);
    assert_eq!(correction.records[0].estimated_duration_minutes, None);
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn same_calendar_early_morning_and_daylight_saving_use_actual_endpoints() {
    let root = vault("actual-endpoints");
    let workflow = application(&root);
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
    let workflow = application(&root);
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
        json!({"recordId":partial.records[0].id,"wakeDate":"2026-10-21","changeId":"fuzzy","getUp":{"kind":"text","date":"2026-10-21","text":"八点多"}}),
    );
    assert_eq!(fuzzy.records[0].estimated_duration_minutes, None);
    let bounded = save(
        &workflow,
        json!({"recordId":fuzzy.records[0].id,"wakeDate":"2026-10-21","changeId":"range","getUp":{"kind":"range","start":{"date":"2026-10-21","time":"08:00","utcOffsetMinutes":-240},"end":{"date":"2026-10-21","time":"09:00","utcOffsetMinutes":-240},"reportedText":"八点到九点"}}),
    );
    assert_eq!(bounded.records[0].estimated_duration_minutes, None);
    fs::remove_dir_all(root).unwrap();
}
#[test]
fn invalid_order_ambiguous_date_conflicts_and_other_vault_binding_do_not_write() {
    let root = vault("reject");
    let workflow = application(&root);
    let original = workflow.sleep_records().unwrap();
    let input = json!({"wakeDate":"2026-10-21","changeId":"reverse","targetBinding":original.target_binding,"expectedRevision":null,"sleepOnset":point("2026-10-21","23:50",-240),"getUp":point("2026-10-21","07:20",-240)});
    assert!(workflow
        .save_sleep_record(serde_json::from_value(input).unwrap())
        .is_err());
    assert_eq!(workflow.sleep_records().unwrap(), original);
    assert!(serde_json::from_value::<SleepMutationInput>(
        json!({"changeId":"ambiguous","sleepOnset":point("2026-10-21","02:00",-240)})
    )
    .is_err());
    let other_root = vault("other");
    let other = application(&other_root);
    assert!(other.save_sleep_record(serde_json::from_value(json!({"wakeDate":"2026-10-21","changeId":"wrong-vault","targetBinding":original.target_binding,"expectedRevision":null,"getUp":{"kind":"unknown"}})).unwrap()).is_err());
    assert!(other.sleep_records().unwrap().records.is_empty());
    fs::remove_dir_all(root).unwrap();
    fs::remove_dir_all(other_root).unwrap();
}
#[test]
fn corrections_keep_identity_block_occupied_dates_and_repeated_delivery_is_idempotent() {
    let root = vault("correction");
    let workflow = application(&root);
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
        .save_sleep_record(serde_json::from_value(conflict).unwrap())
        .is_err());
    assert_eq!(workflow.sleep_records().unwrap(), second);
    let exact:SleepMutationInput=serde_json::from_value(json!({"recordId":first_id,"wakeDate":"2026-08-02","changeId":"repeat","targetBinding":second.target_binding,"expectedRevision":second.revision,"getUp":point("2026-08-02","08:00",-240)})).unwrap();
    let saved = workflow.save_sleep_record(exact.clone()).unwrap();
    assert_eq!(workflow.save_sleep_record(exact).unwrap(), saved);
    let stale = json!({"wakeDate":"2026-08-02","changeId":"stale","targetBinding":second.target_binding,"expectedRevision":second.revision,"getUp":{"kind":"unknown"}});
    assert!(workflow
        .save_sleep_record(serde_json::from_value(stale).unwrap())
        .is_err());
    assert_eq!(workflow.sleep_records().unwrap(), saved);
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn creating_an_occupied_night_rejects_without_receipt_or_record_changes() {
    let root = vault("occupied-create");
    let workflow = application(&root);
    let first = save(
        &workflow,
        json!({"wakeDate":"2026-10-21","changeId":"initial-night","getUp":{"kind":"unknown"}}),
    );
    let path = root.join("life/.personal-dashboard/sleep/v1/sessions.json");
    let bytes = fs::read(&path).unwrap();
    let mut input: SleepMutationInput = serde_json::from_value(json!({
        "recordId":null,"wakeDate":"2026-10-21","changeId":"attempted-new-night",
        "targetBinding":first.target_binding,"expectedRevision":first.revision,
        "getUp":point("2026-10-21","07:20",-240)
    }))
    .unwrap();
    assert!(
        workflow.save_sleep_record(input.clone()).is_err(),
        "creation must not silently revise the occupied night"
    );
    assert_eq!(workflow.sleep_records().unwrap(), first);
    assert_eq!(
        fs::read(&path).unwrap(),
        bytes,
        "a rejected creation must not append a receipt"
    );
    input.record_id = Some(first.records[0].id.clone());
    let corrected = workflow.save_sleep_record(input).unwrap();
    assert_eq!(corrected.records.len(), 1);
    assert_eq!(corrected.records[0].id, first.records[0].id);
    assert_eq!(
        serde_json::to_value(&corrected.records[0].get_up).unwrap(),
        json!({"kind":"point","date":"2026-10-21","time":"07:20","utcOffsetMinutes":-240,"approximate":false})
    );
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn certainly_reversed_point_and_range_pairs_are_rejected_without_writes() {
    let root = vault("certainly-reversed-bounds");
    let workflow = application(&root);
    let before = workflow.sleep_records().unwrap();
    for (label, onset, up) in [
        (
            "point-range",
            point("2026-10-21", "23:00", -240),
            range("2026-10-21", "08:00", "09:00", -240),
        ),
        (
            "range-point",
            range("2026-10-21", "22:00", "23:00", -240),
            point("2026-10-21", "09:00", -240),
        ),
        (
            "range-range",
            range("2026-10-21", "22:00", "23:00", -240),
            range("2026-10-21", "08:00", "09:00", -240),
        ),
    ] {
        let input = json!({"wakeDate":"2026-10-21","changeId":label,"targetBinding":before.target_binding,"expectedRevision":before.revision,"sleepOnset":onset,"getUp":up});
        assert!(
            workflow
                .save_sleep_record(serde_json::from_value(input).unwrap())
                .is_err(),
            "{label} has get-up certainly before onset"
        );
        assert_eq!(workflow.sleep_records().unwrap(), before);
        assert!(!root
            .join("life/.personal-dashboard/sleep/v1/sessions.json")
            .exists());
    }
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn overlapping_or_offset_ordered_ranges_preserve_uncertainty_without_duration() {
    for (label, date, onset, up) in [
        (
            "overlap-point-range",
            "2026-10-21",
            point("2026-10-21", "10:00", -240),
            range("2026-10-21", "09:00", "11:00", -240),
        ),
        (
            "overlap-range-point",
            "2026-10-21",
            range("2026-10-21", "08:00", "10:00", -240),
            point("2026-10-21", "09:00", -240),
        ),
        (
            "overlap-range-range",
            "2026-10-21",
            range("2026-10-21", "08:00", "10:00", -240),
            range("2026-10-21", "09:00", "11:00", -240),
        ),
        (
            "dst-point-range",
            "2026-11-01",
            point("2026-11-01", "01:30", -240),
            range("2026-11-01", "01:00", "01:15", -300),
        ),
        (
            "dst-range-point",
            "2026-11-01",
            range("2026-11-01", "01:30", "01:45", -240),
            point("2026-11-01", "01:00", -300),
        ),
    ] {
        let root = vault(label);
        let workflow = application(&root);
        let saved = save(
            &workflow,
            json!({"wakeDate":date,"changeId":label,"sleepOnset":onset,"getUp":up}),
        );
        assert_eq!(
            saved.records[0].sleep_onset,
            serde_json::from_value(onset).unwrap()
        );
        assert_eq!(saved.records[0].get_up, serde_json::from_value(up).unwrap());
        assert_eq!(saved.records[0].estimated_duration_minutes, None);
        assert_eq!(application(&root).sleep_records().unwrap(), saved);
        fs::remove_dir_all(root).unwrap();
    }
}

#[test]
fn bound_order_uses_actual_offsets_even_when_local_clocks_appear_ordered() {
    let root = vault("reversed-dst-bounds");
    let workflow = application(&root);
    let before = workflow.sleep_records().unwrap();
    let input = json!({"wakeDate":"2026-11-01","changeId":"dst-reverse","targetBinding":before.target_binding,"expectedRevision":before.revision,
        "sleepOnset":point("2026-11-01","01:30",-300),"getUp":range("2026-11-01","01:45","02:00",-240)});
    assert!(workflow
        .save_sleep_record(serde_json::from_value(input).unwrap())
        .is_err());
    assert_eq!(workflow.sleep_records().unwrap(), before);
    assert!(!root
        .join("life/.personal-dashboard/sleep/v1/sessions.json")
        .exists());
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn duplicate_sleep_delivery_does_not_confirm_a_later_conflicting_canonical_record() {
    let root = vault("replayed-readback-conflict");
    let workflow = application(&root);
    let before = workflow.sleep_records().unwrap();
    let input: SleepMutationInput = serde_json::from_value(json!({"wakeDate":"2026-10-21","changeId":"original-save","targetBinding":before.target_binding,"expectedRevision":before.revision,"getUp":point("2026-10-21","07:20",-240)})).unwrap();
    workflow.save_sleep_record(input.clone()).unwrap();
    let path = root.join("life/.personal-dashboard/sleep/v1/sessions.json");
    let mut external: serde_json::Value =
        serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
    external["records"][0]["getUp"] = json!({"kind":"point","date":"2026-10-21","time":"09:20","utcOffsetMinutes":-240,"approximate":false});
    let replacement = serde_json::to_vec_pretty(&external).unwrap();
    fs::write(&path, &replacement).unwrap();
    let error = workflow
        .save_sleep_record(input)
        .expect_err("an old receipt does not confirm changed current endpoints");
    assert!(error.contains("已保存") && error.contains("读回"));
    assert!(!error.contains("未写入"));
    assert_eq!(
        fs::read(&path).unwrap(),
        replacement,
        "never replay the old edit over a later writer"
    );
    fs::remove_dir_all(root).unwrap();
}

fn range(date: &str, start: &str, end: &str, offset: i32) -> serde_json::Value {
    json!({"kind":"range","start":{"date":date,"time":start,"utcOffsetMinutes":offset},"end":{"date":date,"time":end,"utcOffsetMinutes":offset},"reportedText":"reported range"})
}

#[test]
fn a_selection_change_while_reading_discards_the_previous_vault_result() {
    use std::sync::{
        atomic::{AtomicUsize, Ordering},
        Arc,
    };
    struct SwitchAfterCapture {
        original: PathBuf,
        replacement: PathBuf,
        reads: Arc<AtomicUsize>,
    }
    impl TodayWorkspacePersistence for SwitchAfterCapture {
        fn load_selected_vault(&self) -> Result<Option<PathBuf>, String> {
            Ok(Some(if self.reads.fetch_add(1, Ordering::SeqCst) == 0 {
                self.original.clone()
            } else {
                self.replacement.clone()
            }))
        }
        fn save_selected_vault(&self, _: &Path) -> Result<(), String> {
            Ok(())
        }
    }
    let original = vault("read-capture");
    let replacement = vault("read-replacement");
    save(
        &application(&original),
        json!({"wakeDate":"2026-10-22","changeId":"private-original","getUp":point("2026-10-22","07:30",-240)}),
    );
    let reads = Arc::new(AtomicUsize::new(0));
    let app = TodayApplication::new(
        SwitchAfterCapture {
            original: original.clone(),
            replacement: replacement.clone(),
            reads: reads.clone(),
        },
        NoSelection,
        FixedClock,
    );
    let error = app
        .sleep_records()
        .expect_err("a late result belongs to the captured Vault, not the new selection");
    assert!(error.contains("Vault"));
    reads.store(0, Ordering::SeqCst);
    assert!(app.read_date("2026-10-22").expect_err("Today must reject a late projection from the old Vault").contains("Vault"));
    assert!(!replacement
        .join("life/.personal-dashboard/sleep/v1/sessions.json")
        .exists());
    fs::remove_dir_all(original).unwrap();
    fs::remove_dir_all(replacement).unwrap();
}

#[test]
fn legacy_standalone_values_remain_readable_and_competing_records_require_identity() {
    let root = vault("legacy-preserved");
    let path = root.join("life/.personal-dashboard/sleep/v1/sessions.json");
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    let legacy_record = |id, date| json!({"id":id,"wakeDate":date,"sleepOnset":point("2026-10-22","02:00",-240),"getUp":{"kind":"text","date":date,"text":"八点多吧，原话保留"},"estimatedDurationMinutes":null});
    let bytes = serde_json::to_vec(&json!({"schemaVersion":1,"records":[legacy_record("legacy-a","2026-10-22"),legacy_record("legacy-b","2026-10-23")],"operations":[]})).unwrap();
    fs::write(&path, &bytes).unwrap();
    let app = application(&root);
    let opened = app.sleep_records().unwrap();
    assert_eq!(opened.records.len(), 2);
    assert_eq!(
        serde_json::to_value(&opened).unwrap()["facts"][1]["livedDate"],
        serde_json::Value::Null
    );
    assert_eq!(fs::read(&path).unwrap(), bytes);
    let error = app.save_habit_sleep_time(serde_json::from_value(json!({"habitKey":"sleep","livedDate":"2026-10-21","endpoint":point("2026-10-22","01:30",-240),"changeId":"ambiguous-legacy","targetBinding":opened.target_binding,"expectedRevision":opened.revision})).unwrap()).unwrap_err();
    assert!(error.contains("身份"));
    assert_eq!(fs::read(&path).unwrap(), bytes);
    let corrected = app.save_habit_sleep_time(serde_json::from_value(json!({"habitKey":"sleep","livedDate":"2026-10-22","recordId":"legacy-b","endpoint":point("2026-10-23","01:30",-240),"changeId":"explicit-legacy","targetBinding":opened.target_binding,"expectedRevision":opened.revision})).unwrap()).unwrap();
    assert_eq!(corrected.records[0], opened.records[0]);
    assert_eq!(corrected.records[1].id, "legacy-b");
    assert_eq!(corrected.records[1].get_up, opened.records[1].get_up);
    assert_eq!(application(&root).sleep_records().unwrap(), corrected);
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn invalid_context_and_storage_redirection_fail_without_writing_or_daily_side_effects() {
    let root = vault("rejected-entry");
    let app = application(&root);
    let opened = app.sleep_records().unwrap();
    for (habit, day, endpoint) in [
        ("sleep", "2026-10-22", point("2026-10-22", "02:00", -240)),
        (
            "renamed-sleep",
            "2026-10-21",
            point("2026-10-22", "02:00", -240),
        ),
        ("sleep", "2026-10-21", point("2026-10-22", "02:00:30", -240)),
        ("sleep", "2026-10-21", point("2026-10-22", "24:00", -240)),
    ] {
        assert!(app.save_habit_sleep_time(serde_json::from_value(json!({"habitKey":habit,"livedDate":day,"endpoint":endpoint,"changeId":"bad-entry","targetBinding":opened.target_binding,"expectedRevision":opened.revision})).unwrap()).is_err());
        assert_eq!(app.sleep_records().unwrap(), opened);
        assert!(!root
            .join("life/.personal-dashboard/sleep/v1/sessions.json")
            .exists());
    }
    #[cfg(unix)]
    {
        let outside = vault("symlink-destination");
        fs::create_dir_all(root.join("life/.personal-dashboard")).unwrap();
        std::os::unix::fs::symlink(&outside, root.join("life/.personal-dashboard/sleep")).unwrap();
        assert!(app.sleep_records().is_err());
        assert!(!outside.join("v1/sessions.json").exists());
        fs::remove_dir_all(outside).unwrap();
    }
    assert_eq!(
        fs::read_dir(root.join("life/Journal/Daily"))
            .unwrap()
            .count(),
        0
    );
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn replay_cannot_confirm_an_endpoint_whose_lived_day_context_was_later_changed() {
    let root = vault("replay-context");
    let app = application(&root);
    let opened = app.sleep_records().unwrap();
    let original: SleepMutationInput = serde_json::from_value(json!({"wakeDate":"2026-10-22","changeId":"original-unknown","getUp":{"kind":"unknown"},"targetBinding":opened.target_binding,"expectedRevision":opened.revision})).unwrap();
    let first = app.save_sleep_record(original.clone()).unwrap();
    let corrected = app.save_habit_sleep_time(serde_json::from_value(json!({"habitKey":"wake","livedDate":"2026-10-22","endpoint":{"kind":"unknown"},"recordId":first.records[0].id,"changeId":"locate-unknown","targetBinding":first.target_binding,"expectedRevision":first.revision})).unwrap()).unwrap();
    assert!(app
        .save_sleep_record(original)
        .unwrap_err()
        .contains("读回"));
    assert_eq!(app.sleep_records().unwrap(), corrected);
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn today_time_entry_uses_canonical_habit_names_lifecycle_and_start_dates_without_changing_completion_context(
) {
    let root = vault("entry-catalog");
    let path = root.join(personal_dashboard_lib::habits::SNAPSHOT_RELATIVE_PATH);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    let mut snapshot: serde_json::Value =
        serde_json::from_str(include_str!("fixtures/habits-v1-complete.json")).unwrap();
    snapshot["generatedAt"] = json!("2026-10-22T08:00:00-04:00");
    snapshot["range"] = json!({"from":"2026-08-03","to":"2026-10-22"});
    snapshot["habits"]
        .as_array_mut()
        .unwrap()
        .retain(|h| ["wake", "sleep"].contains(&h["key"].as_str().unwrap()));
    fs::write(path, serde_json::to_vec(&snapshot).unwrap()).unwrap();
    let app = application(&root);
    let before = app.habits().unwrap();
    app.save_habit_definition(serde_json::from_value(json!({"operationId":"rename-wake","targetBinding":before.catalog_target_binding,"expectedRevision":before.catalog_revision,"habitKey":"wake","language":"en","name":"My renamed wake","startDate":null,"emoji":null,"group":null,"goal":null})).unwrap()).unwrap();
    let today = serde_json::to_value(app.read_date("2026-10-22").unwrap()).unwrap();
    assert_eq!(
        today["habitTimeHabits"][0]["localizedNames"]["en"],
        "My renamed wake"
    );
    let catalog = app.habits().unwrap();
    app.set_habit_active(serde_json::from_value(json!({"operationId":"pause-wake","targetBinding":catalog.catalog_target_binding,"expectedRevision":catalog.catalog_revision,"habitKey":"wake","active":false})).unwrap()).unwrap();
    let today = serde_json::to_value(app.read_date("2026-10-22").unwrap()).unwrap();
    assert_eq!(today["habitTimeHabits"].as_array().unwrap().len(), 1);
    assert_eq!(today["habitTimeHabits"][0]["key"], "sleep");
    let history = serde_json::to_value(app.read_date("2026-10-21").unwrap()).unwrap();
    assert!(history["habitTimeHabits"]
        .as_array()
        .unwrap()
        .iter()
        .any(|h| h["key"] == "wake" && h["localizedNames"]["en"] == "My renamed wake"));
    let catalog = app.habits().unwrap();
    app.save_habit_definition(serde_json::from_value(json!({"operationId":"later-start-sleep","targetBinding":catalog.catalog_target_binding,"expectedRevision":catalog.catalog_revision,"habitKey":"sleep","language":"en","name":"Later start sleep","startDate":"2026-10-23","emoji":null,"group":null,"goal":null})).unwrap()).unwrap();
    let today = serde_json::to_value(app.read_date("2026-10-22").unwrap()).unwrap();
    assert!(today["habitTimeHabits"].as_array().unwrap().is_empty());
    assert_eq!(
        fs::read_dir(root.join("life/Journal/Daily"))
            .unwrap()
            .count(),
        0
    );
    save(
        &app,
        json!({"wakeDate":"2026-06-02","changeId":"preserve-older-time","sleepOnset":point("2026-06-01","23:50",-240)}),
    );
    let older = serde_json::to_value(app.read_date("2026-06-01").unwrap()).unwrap();
    assert!(
        older["habitTimeHabits"]
            .as_array()
            .unwrap()
            .iter()
            .any(|habit| habit["key"] == "sleep"),
        "canonical earlier endpoints survive an edited future start beyond the snapshot window"
    );
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn today_reads_endpoint_points_on_their_own_lived_days_without_a_daily_record() {
    let root = vault("today-independent");
    let app = application(&root);
    let saved = save(
        &app,
        json!({"wakeDate":"2026-10-22","changeId":"today-points",
        "sleepOnset":point("2026-10-22","02:00",-240),"getUp":point("2026-10-22","07:30",-240)}),
    );
    let wednesday = serde_json::to_value(app.read_date("2026-10-21").unwrap()).unwrap();
    assert_eq!(
        wednesday["timeAxis"]["confirmedFacts"]
            .as_array()
            .unwrap()
            .len(),
        1
    );
    assert_eq!(
        wednesday["timeAxis"]["confirmedFacts"][0]["startMinute"],
        1560
    );
    assert_eq!(
        wednesday["timeAxis"]["confirmedFacts"][0]["endMinute"],
        serde_json::Value::Null
    );
    assert_eq!(
        wednesday["timeAxis"]["confirmedFacts"][0]["sleepFact"]["recordId"],
        saved.records[0].id
    );
    assert_eq!(
        wednesday["timeAxis"]["confirmedFacts"][0]["sleepFact"]["endpoint"]["date"],
        "2026-10-22"
    );
    let thursday = app.read_date("2026-10-22").unwrap();
    assert_eq!(thursday.time_axis.confirmed_facts.len(), 1);
    assert_eq!(
        thursday.time_axis.confirmed_facts[0].start_minute,
        Some(450)
    );
    assert_eq!(
        application(&root).read_date("2026-10-22").unwrap(),
        thursday
    );
    assert_eq!(
        fs::read_dir(root.join("life/Journal/Daily"))
            .unwrap()
            .count(),
        0
    );
    assert!(!root
        .join("life/.personal-dashboard/habit-completions/v1/completions.json")
        .exists());
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn today_keeps_independent_sources_visible_when_either_daily_record_or_sleep_is_unreadable() {
    let root = vault("today-source-failures");
    let app = application(&root);
    save(
        &app,
        json!({"wakeDate":"2026-10-22","changeId":"source-fact","getUp":point("2026-10-22","07:30",-240)}),
    );
    let daily = root.join("life/Journal/Daily/2026/2026-10/2026-10-22.md");
    fs::create_dir_all(daily.parent().unwrap()).unwrap();
    let original = include_str!("fixtures/today-time-axis.md").replace("2026-08-10", "2026-10-22");
    fs::write(&daily, &original).unwrap();
    let ready = app.read_date("2026-10-22").unwrap();
    assert_eq!(ready.time_axis.confirmed_facts.len(), 2);
    assert_eq!(ready.time_axis.unlocated_confirmed_facts.len(), 1);
    for bytes in [b"invalid daily record".as_slice(), &[0xff, 0xfe]] {
        fs::write(&daily, bytes).unwrap();
        let broken = app
            .read_date("2026-10-22")
            .expect("available independent facts survive Daily Record errors");
        assert_eq!(
            broken.daily_record_availability,
            personal_dashboard_lib::today::DailyRecordAvailability::Error
        );
        assert_eq!(broken.time_axis.confirmed_facts.len(), 1);
        assert_eq!(broken.time_axis.confirmed_facts[0].start_minute, Some(450));
        assert_eq!(fs::read(&daily).unwrap(), bytes);
    }
    fs::remove_file(&daily).unwrap();
    fs::create_dir(&daily).unwrap();
    assert_eq!(
        app.read_date("2026-10-22")
            .unwrap()
            .time_axis
            .confirmed_facts
            .len(),
        1
    );
    fs::remove_dir(&daily).unwrap();
    fs::write(&daily, &original).unwrap();
    fs::write(
        root.join("life/.personal-dashboard/sleep/v1/sessions.json"),
        b"invalid sleep",
    )
    .unwrap();
    let broken_sleep = serde_json::to_value(app.read_date("2026-10-22").unwrap()).unwrap();
    assert_eq!(
        broken_sleep["timeAxis"]["confirmedFacts"]
            .as_array()
            .unwrap()
            .len(),
        1
    );
    assert!(broken_sleep["timeAxis"]["sleepError"].as_str().is_some());
    assert_eq!(fs::read_to_string(&daily).unwrap(), original);
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn today_corrections_replace_stable_points_and_uncertainty_remains_unlocated_without_night_index_guessing(
) {
    let root = vault("today-precision");
    let app = application(&root);
    let first = save(
        &app,
        json!({"wakeDate":"2026-10-22","changeId":"precision-first",
        "sleepOnset":{"kind":"point","date":"2026-10-22","time":"03:59","utcOffsetMinutes":-240,"approximate":true},
        "getUp":{"kind":"unknown"},"getUpLivedDate":"2026-10-22"}),
    );
    let original = serde_json::to_value(app.read_date("2026-10-21").unwrap()).unwrap();
    assert_eq!(
        original["timeAxis"]["confirmedFacts"][0]["startMinute"],
        1679
    );
    assert_eq!(
        original["timeAxis"]["confirmedFacts"][0]["sleepFact"]["endpoint"]["approximate"],
        true
    );
    let corrected = save(
        &app,
        json!({"recordId":first.records[0].id,"wakeDate":"2026-10-22","changeId":"boundary-correction","sleepOnset":point("2026-10-22","04:00",-240)}),
    );
    assert!(app
        .read_date("2026-10-21")
        .unwrap()
        .time_axis
        .confirmed_facts
        .is_empty());
    let next = serde_json::to_value(app.read_date("2026-10-22").unwrap()).unwrap();
    assert_eq!(
        next["timeAxis"]["confirmedFacts"].as_array().unwrap().len(),
        1
    );
    assert_eq!(next["timeAxis"]["confirmedFacts"][0]["startMinute"], 240);
    assert_eq!(
        next["timeAxis"]["confirmedFacts"][0]["sleepFact"]["recordId"],
        first.records[0].id
    );
    assert_eq!(
        next["timeAxis"]["unlocatedConfirmedFacts"][0]["sleepFact"]["endpoint"]["kind"],
        "unknown"
    );
    assert_eq!(
        serde_json::to_value(application(&root).read_date("2026-10-22").unwrap()).unwrap(),
        next
    );
    save(
        &app,
        json!({"recordId":corrected.records[0].id,"wakeDate":"2026-10-22","changeId":"range-crosses-day",
      "sleepOnset":{"kind":"range","start":{"date":"2026-10-22","time":"03:30","utcOffsetMinutes":-240},"end":{"date":"2026-10-22","time":"04:30","utcOffsetMinutes":-240},"reportedText":"三点半到四点半之间"},"getUp":{"kind":"text","date":"2026-10-22","text":"八点多吧"}}),
    );
    let uncertain = serde_json::to_value(app.read_date("2026-10-22").unwrap()).unwrap();
    assert!(uncertain["timeAxis"]["confirmedFacts"]
        .as_array()
        .unwrap()
        .is_empty());
    assert_eq!(
        uncertain["timeAxis"]["unlocatedConfirmedFacts"]
            .as_array()
            .unwrap()
            .len(),
        2
    );
    assert_eq!(
        uncertain["timeAxis"]["unlocatedConfirmedFacts"][0]["sleepFact"]["endpoint"]
            ["reportedText"],
        "三点半到四点半之间"
    );
    assert!(app
        .read_date("2026-10-23")
        .unwrap()
        .time_axis
        .unlocated_confirmed_facts
        .is_empty());
    assert_eq!(
        fs::read_dir(root.join("life/Journal/Daily"))
            .unwrap()
            .count(),
        0
    );
    fs::remove_dir_all(root).unwrap();
}
