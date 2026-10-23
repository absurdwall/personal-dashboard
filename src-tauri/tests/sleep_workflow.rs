use personal_dashboard_lib::sleep::{
    HabitSleepPointRequest, HabitSleepRangeRequest, SleepMutationInput,
};
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
    fn resolve_local_wall_time(&self, _: &str, _: u16) -> personal_dashboard_lib::today::LocalWallTimeResolution {
        personal_dashboard_lib::today::LocalWallTimeResolution::Unique { utc_offset_minutes: -240 }
    }

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
fn habit_entry_pairs_contextual_early_wake_but_clarifies_opposite_night_ambiguity() {
    for (
        label,
        first_habit,
        first_date,
        first_time,
        second_habit,
        second_date,
        second_time,
        lived_date,
    ) in [
        (
            "A",
            "wake",
            "2026-09-09",
            "07:30",
            "sleep",
            "2026-09-09",
            "04:10",
            "2026-09-09",
        ),
        (
            "B",
            "sleep",
            "2026-09-08",
            "23:00",
            "wake",
            "2026-09-09",
            "03:30",
            "2026-09-08",
        ),
        (
            "A-reverse",
            "sleep",
            "2026-09-09",
            "04:10",
            "wake",
            "2026-09-09",
            "07:30",
            "2026-09-09",
        ),
        (
            "B-reverse",
            "wake",
            "2026-09-09",
            "03:30",
            "sleep",
            "2026-09-08",
            "23:00",
            "2026-09-08",
        ),
    ] {
        let root = vault(&format!("actual-night-repro-{label}"));
        let app = application(&root);
        let opened = app.sleep_records().unwrap();
        let first = app
            .save_habit_sleep_time(
                serde_json::from_value(json!({
                    "habitKey": first_habit, "livedDate": lived_date,
                    "endpoint": point(first_date, first_time, -240), "changeId": "first",
                    "targetBinding": opened.target_binding, "expectedRevision": opened.revision,
                }))
                .unwrap(),
            )
            .unwrap();
        let before =
            fs::read(root.join("life/.personal-dashboard/sleep/v1/sessions.json")).unwrap();
        let second = app.save_habit_sleep_time(
            serde_json::from_value(json!({
                "habitKey": second_habit, "livedDate": lived_date,
                "endpoint": point(second_date, second_time, -240), "changeId": "second",
                "targetBinding": first.target_binding, "expectedRevision": first.revision,
            }))
            .unwrap(),
        );
        match second {
            Ok(saved) => {
                assert!(
                    label.starts_with('B'),
                    "{label}: opposite-night ambiguity must reject"
                );
                eprintln!(
                    "CASE {label} WITHOUT ID: {}",
                    serde_json::to_string(&saved.records).unwrap()
                );
                assert_eq!(saved.records.len(), 1, "{label}: no duplicate night");
                assert_eq!(saved.records[0].id, first.records[0].id);
                assert_eq!(saved.records[0].night_index, "2026-09-09");
                assert_eq!(saved.records[0].estimated_duration_minutes, Some(270));
                assert_eq!(saved.facts.len(), 2);
                assert!(saved
                    .facts
                    .iter()
                    .all(|fact| fact.lived_date.as_deref() == Some("2026-09-08")));
                assert_eq!(application(&root).sleep_records().unwrap(), saved);
            }
            Err(error) => {
                assert!(
                    label.starts_with('A'),
                    "{label}: contextual early-wake pair must save: {error}"
                );
                eprintln!("CASE {label} CLARIFICATION: {error}");
                assert!(error.contains("请先澄清是否属于同一晚"), "{error}");
                assert_eq!(
                    fs::read(root.join("life/.personal-dashboard/sleep/v1/sessions.json")).unwrap(),
                    before
                );
            }
        }
        fs::remove_dir_all(root).unwrap();
    }
}

#[test]
fn explicit_identity_pairs_same_lived_day_nights_in_either_save_order() {
    for (
        label,
        first_habit,
        first_date,
        first_time,
        second_habit,
        second_date,
        second_time,
        lived_date,
        duration,
    ) in [
        (
            "A",
            "wake",
            "2026-09-09",
            "07:30",
            "sleep",
            "2026-09-09",
            "04:10",
            "2026-09-09",
            200,
        ),
        (
            "B",
            "sleep",
            "2026-09-08",
            "23:00",
            "wake",
            "2026-09-09",
            "03:30",
            "2026-09-08",
            270,
        ),
        (
            "A-reverse",
            "sleep",
            "2026-09-09",
            "04:10",
            "wake",
            "2026-09-09",
            "07:30",
            "2026-09-09",
            200,
        ),
        (
            "B-reverse",
            "wake",
            "2026-09-09",
            "03:30",
            "sleep",
            "2026-09-08",
            "23:00",
            "2026-09-08",
            270,
        ),
    ] {
        let root = vault(&format!("actual-night-explicit-{label}"));
        let app = application(&root);
        let opened = app.sleep_records().unwrap();
        let first = app
            .save_habit_sleep_time(
                serde_json::from_value(json!({
                    "habitKey": first_habit, "livedDate": lived_date,
                    "endpoint": point(first_date, first_time, -240), "changeId": "first",
                    "targetBinding": opened.target_binding, "expectedRevision": opened.revision,
                }))
                .unwrap(),
            )
            .unwrap();
        let saved = app.save_habit_sleep_time(serde_json::from_value(json!({
            "habitKey": second_habit, "livedDate": lived_date, "recordId": first.records[0].id,
            "endpoint": point(second_date, second_time, -240), "changeId": "second",
            "targetBinding": first.target_binding, "expectedRevision": first.revision,
        })).unwrap()).unwrap();
        eprintln!(
            "CASE {label} EXPLICIT ID: {}",
            serde_json::to_string(&saved.records).unwrap()
        );
        assert_eq!(saved.records.len(), 1);
        assert_eq!(saved.records[0].id, first.records[0].id);
        assert_eq!(saved.records[0].estimated_duration_minutes, Some(duration));
        assert!(saved
            .facts
            .iter()
            .all(|fact| fact.lived_date.as_deref() == Some(lived_date)));
        assert_eq!(application(&root).sleep_records().unwrap(), saved);
        fs::remove_dir_all(root).unwrap();
    }
}

fn habit_entry(
    app: &TodayApplication<Selected, NoSelection, FixedClock>,
    habit: &str,
    day: &str,
    endpoint: serde_json::Value,
) -> Result<personal_dashboard_lib::sleep::SleepView, String> {
    let opened = app.sleep_records().unwrap();
    app.save_habit_sleep_time(
        serde_json::from_value(json!({
            "habitKey":habit,"livedDate":day,"endpoint":endpoint,"changeId":"context-entry",
            "targetBinding":opened.target_binding,"expectedRevision":opened.revision,
        }))
        .unwrap(),
    )
}

#[test]
fn outside_index_night_requires_clarification_even_with_conventional_candidate_or_complete_record()
{
    for complete in [false, true] {
        let root = vault("outside-index-night");
        let app = application(&root);
        let mut outside = json!({"wakeDate":"2026-09-09","changeId":"outside","getUp":point("2026-09-09","07:30",-240)});
        if complete {
            outside["sleepOnset"] = point("2026-09-09", "02:00", -240);
        }
        let original = save(&app, outside);
        if !complete {
            save(
                &app,
                json!({"wakeDate":"2026-09-10","changeId":"conventional","getUp":point("2026-09-10","07:30",-240)}),
            );
        }
        let path = root.join("life/.personal-dashboard/sleep/v1/sessions.json");
        let before = fs::read(&path).unwrap();
        let error = habit_entry(
            &app,
            "sleep",
            "2026-09-09",
            point("2026-09-09", "04:10", -240),
        )
        .unwrap_err();
        assert!(error.contains("请先澄清是否属于同一晚"), "{error}");
        assert_eq!(fs::read(&path).unwrap(), before);
        let view = app.sleep_records().unwrap();
        let corrected = app
            .save_habit_sleep_time(
                serde_json::from_value(json!({
                    "habitKey":"sleep","livedDate":"2026-09-09","recordId":original.records[0].id,
                    "endpoint":point("2026-09-09","04:10",-240),"changeId":"explicit-correction",
                    "targetBinding":view.target_binding,"expectedRevision":view.revision,
                }))
                .unwrap(),
            )
            .unwrap();
        assert_eq!(corrected.records.len(), if complete { 1 } else { 2 });
        assert_eq!(corrected.records[0].id, original.records[0].id);
        assert_eq!(corrected.records[0].estimated_duration_minutes, Some(200));
        fs::remove_dir_all(root).unwrap();
    }
}

#[test]
fn identified_corrections_and_unrelated_historical_partial_nights_do_not_require_clarification() {
    let root = vault("bounded-night-context");
    let app = application(&root);
    save(
        &app,
        json!({"wakeDate":"2026-09-02","changeId":"old-incomplete","sleepOnset":point("2026-09-01","23:00",-240)}),
    );
    let new = habit_entry(
        &app,
        "wake",
        "2026-09-09",
        point("2026-09-09", "07:30", -240),
    )
    .unwrap();
    assert_eq!(new.records.len(), 2);
    let existing = save(
        &app,
        json!({"wakeDate":"2026-09-10","changeId":"identified-onset","sleepOnset":point("2026-09-09","04:10",-240)}),
    );
    // The same-role fact identifies an existing correction, despite another compatible wake on that lived day.
    let corrected = app.save_habit_sleep_time(serde_json::from_value(json!({
        "habitKey":"sleep","livedDate":"2026-09-09","endpoint":point("2026-09-09","04:20",-240),"changeId":"same-role-correction",
        "targetBinding":existing.target_binding,"expectedRevision":existing.revision,
    })).unwrap()).unwrap();
    assert_eq!(corrected.records.len(), 3);
    assert_eq!(corrected.records[2].id, existing.records[2].id);
    assert_eq!(corrected.records[1], existing.records[1]);
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn same_lived_day_but_reversed_actual_points_are_not_a_pairing_candidate() {
    let root = vault("reversed-candidate");
    let app = application(&root);
    save(
        &app,
        json!({"wakeDate":"2026-09-10","changeId":"later-onset","sleepOnset":point("2026-09-09","12:00",-240)}),
    );
    let saved = habit_entry(
        &app,
        "wake",
        "2026-09-09",
        point("2026-09-09", "07:30", -240),
    )
    .unwrap();
    assert_eq!(saved.records.len(), 2);
    fs::remove_dir_all(root).unwrap();
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
    assert_eq!(corrected.records[0].night_index, "2026-10-22");
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
    assert_eq!(sleep.actual_time_label,before.habit("sleep").unwrap().cell("2026-10-21").unwrap().actual_time_label);
    assert_eq!(sleep.sleep_fact.as_ref().unwrap().day_relation,personal_dashboard_lib::habits::DayRelation::NextDay);
    assert_eq!(
        serde_json::to_value(sleep).unwrap()["sleepFact"]["habitKey"],
        "sleep"
    );
    let wake = after.habit("wake").unwrap().cell("2026-10-22").unwrap();
    assert_eq!(wake.actual_time_label,before.habit("wake").unwrap().cell("2026-10-22").unwrap().actual_time_label);
    assert_eq!(wake.sleep_fact.as_ref().unwrap().day_relation,personal_dashboard_lib::habits::DayRelation::SameDay);
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
fn early_wake_and_previous_evening_pair_without_record_ids_in_either_input_order() {
    let mut failures = Vec::new();
    for (wake_time, sleep_lived_date, wake_lived_date, night_index, duration) in [
        ("03:00", "2026-10-21", "2026-10-21", "2026-10-22", 240),
        ("03:30", "2026-10-21", "2026-10-21", "2026-10-22", 270),
        ("03:59", "2026-10-21", "2026-10-21", "2026-10-22", 299),
        // At 04:00 the wake endpoint belongs to the new lived day, so its
        // corresponding evening is the preceding day's sleep Habit.
        ("04:00", "2026-10-20", "2026-10-21", "2026-10-21", 300),
    ] {
        for order in [
            [("sleep", "23:00"), ("wake", wake_time)],
            [("wake", wake_time), ("sleep", "23:00")],
        ] {
            let root = vault(&format!("early-wake-{}-first", order[0].0));
            let app = application(&root);
            let snapshot_path = root.join(personal_dashboard_lib::habits::SNAPSHOT_RELATIVE_PATH);
            fs::create_dir_all(snapshot_path.parent().unwrap()).unwrap();
            let mut snapshot: serde_json::Value =
                serde_json::from_str(include_str!("fixtures/habits-v1-complete.json")).unwrap();
            snapshot["generatedAt"] = json!("2026-10-22T08:00:00-04:00");
            snapshot["range"] = json!({"from":"2026-08-03","to":"2026-10-22"});
            fs::write(&snapshot_path, serde_json::to_vec(&snapshot).unwrap()).unwrap();
            let snapshot_bytes = fs::read(&snapshot_path).unwrap();
            let before_habits = app.habits().unwrap();
            let mut view = app.sleep_records().unwrap();
            let mut first_id = None;
            let mut requests = Vec::new();
            for (habit, time) in order {
                let lived_date = if habit == "sleep" {
                    sleep_lived_date
                } else {
                    wake_lived_date
                };
                let resolved = app
                    .resolve_habit_sleep_point(&HabitSleepPointRequest {
                        lived_date: lived_date.into(),
                        time: time.into(),
                        approximate: false,
                        existing_point: None,
                    })
                    .unwrap();
                let expected_date = if habit == "sleep" {
                    sleep_lived_date
                } else {
                    night_index
                };
                assert_eq!(resolved.date, expected_date);
                let request = json!({"habitKey":habit,"livedDate":lived_date,
                "endpoint":point(&resolved.date,&resolved.time,resolved.utc_offset_minutes),
                "changeId":format!("early-{habit}"),"targetBinding":view.target_binding,"expectedRevision":view.revision});
                match app.save_habit_sleep_time(serde_json::from_value(request.clone()).unwrap()) {
                    Ok(saved) => {
                        first_id.get_or_insert_with(|| saved.records[0].id.clone());
                        view = saved;
                        requests.push(request);
                    }
                    Err(error) => {
                        failures.push(format!(
                            "{} first, saving {habit}: {error}; existing night index {}",
                            order[0].0, view.records[0].night_index
                        ));
                        break;
                    }
                }
            }
            if requests.len() == 2 {
                assert_eq!(view.records.len(), 1);
                assert_eq!(view.records[0].id, first_id.unwrap());
                assert_eq!(view.records[0].night_index, night_index);
                assert_eq!(view.records[0].estimated_duration_minutes, Some(duration));
                assert_eq!(view.facts.len(), 2);
                for request in requests {
                    assert_eq!(
                        app.save_habit_sleep_time(serde_json::from_value(request).unwrap())
                            .unwrap(),
                        view
                    );
                }
                assert_eq!(application(&root).sleep_records().unwrap(), view);
                let after_habits = app.habits().unwrap();
                for (habit, lived_date) in [("sleep", sleep_lived_date), ("wake", wake_lived_date)]
                {
                    let fact = view
                        .facts
                        .iter()
                        .find(|fact| fact.habit_key.as_str() == habit)
                        .unwrap();
                    assert_eq!(fact.lived_date.as_deref(), Some(lived_date));
                    let today = app.read_date(lived_date).unwrap();
                    let today_fact = today
                        .time_axis
                        .confirmed_facts
                        .iter()
                        .filter_map(|entry| entry.sleep_fact.as_ref())
                        .find(|fact| fact.habit_key.as_str() == habit)
                        .unwrap();
                    assert_eq!(today_fact, fact);
                    let before = before_habits
                        .habit(habit)
                        .unwrap()
                        .cell(lived_date)
                        .unwrap();
                    let after = after_habits.habit(habit).unwrap().cell(lived_date).unwrap();
                    assert_eq!(
                        after.sleep_fact.as_ref().unwrap().record_id,
                        view.records[0].id
                    );
                    assert_eq!(after.counts_as_completion, before.counts_as_completion);
                    assert_eq!(
                        after.completion_source_labels,
                        before.completion_source_labels
                    );
                }
                assert!(app
                    .read_date("2026-10-22")
                    .unwrap()
                    .time_axis
                    .confirmed_facts
                    .iter()
                    .all(|entry| entry.sleep_fact.is_none()));
            }
            assert_eq!(fs::read(snapshot_path).unwrap(), snapshot_bytes);
            assert!(fs::read_dir(root.join("life/Journal/Daily"))
                .unwrap()
                .next()
                .is_none());
            assert!(!root
                .join("life/.personal-dashboard/habit-completions/v1/completions.json")
                .exists());
            fs::remove_dir_all(root).unwrap();
        }
    }
    assert!(
        failures.is_empty(),
        "legitimate early-wake pair was rejected: {failures:?}"
    );
}

#[test]
fn early_wake_pairs_its_new_night_without_reusing_the_previous_completed_night() {
    let mut failures = Vec::new();
    for order in [
        [("sleep", "23:00"), ("wake", "03:00")],
        [("wake", "03:00"), ("sleep", "23:00")],
    ] {
        let root = vault(&format!("adjacent-early-wake-{}-first", order[0].0));
        let app = application(&root);
        let mut view = save(
            &app,
            json!({"wakeDate":"2026-10-21","changeId":"previous-night",
            "sleepOnset":point("2026-10-20","23:00",-240),"getUp":point("2026-10-21","03:00",-240)}),
        );
        let previous = view.records[0].clone();
        for (habit, time) in order {
            let resolved = app
                .resolve_habit_sleep_point(&HabitSleepPointRequest {
                    lived_date: "2026-10-21".into(),
                    time: time.into(),
                    approximate: false,
                    existing_point: None,
                })
                .unwrap();
            let request = json!({"habitKey":habit,"livedDate":"2026-10-21",
                "endpoint":point(&resolved.date,&resolved.time,resolved.utc_offset_minutes),
                "changeId":format!("new-{habit}"),"targetBinding":view.target_binding,"expectedRevision":view.revision});
            match app.save_habit_sleep_time(serde_json::from_value(request).unwrap()) {
                Ok(saved) => view = saved,
                Err(error) => {
                    failures.push(format!("{} first, saving {habit}: {error}", order[0].0));
                    break;
                }
            }
        }
        assert_eq!(
            view.records.iter().find(|record| record.id == previous.id),
            Some(&previous)
        );
        if view.records.iter().any(|record| {
            record.night_index == "2026-10-22" && record.estimated_duration_minutes == Some(240)
        }) {
            assert_eq!(view.records.len(), 2);
            let new_night = view
                .records
                .iter()
                .find(|record| record.night_index == "2026-10-22")
                .unwrap();
            assert_ne!(new_night.id, previous.id);
            assert_eq!(new_night.estimated_duration_minutes, Some(240));
            assert_eq!(application(&root).sleep_records().unwrap(), view);
        } else if failures.is_empty() {
            failures.push(format!("{} first: new night was not paired", order[0].0));
        }
        fs::remove_dir_all(root).unwrap();
    }
    assert!(
        failures.is_empty(),
        "previous completed night blocked new early-wake pair: {failures:?}"
    );
}

#[test]
fn early_wake_correction_keeps_a_unique_existing_habit_fact_and_night_identity() {
    let root = vault("early-wake-existing-fact");
    let app = application(&root);
    let before = save(
        &app,
        json!({"wakeDate":"2026-10-21","changeId":"existing-night",
        "sleepOnset":point("2026-10-20","23:00",-240),"getUp":point("2026-10-21","07:00",-240)}),
    );
    let resolved = app
        .resolve_habit_sleep_point(&HabitSleepPointRequest {
            lived_date: "2026-10-21".into(),
            time: "03:00".into(),
            approximate: false,
            existing_point: None,
        })
        .unwrap();
    let saved = app.save_habit_sleep_time(serde_json::from_value(json!({
        "habitKey":"wake","livedDate":"2026-10-21",
        "endpoint":point(&resolved.date,&resolved.time,resolved.utc_offset_minutes),
        "changeId":"correct-existing-wake","targetBinding":before.target_binding,"expectedRevision":before.revision,
    })).unwrap()).unwrap();
    assert_eq!(
        saved.records.len(),
        1,
        "a unique existing Habit fact is corrected, not duplicated"
    );
    assert_eq!(saved.records[0].id, before.records[0].id);
    assert_eq!(saved.records[0].night_index, "2026-10-21");
    assert_eq!(saved.records[0].sleep_onset, before.records[0].sleep_onset);
    assert_eq!(
        serde_json::to_value(&saved.records[0].get_up).unwrap(),
        json!({"kind":"point","date":"2026-10-22","time":"03:00","utcOffsetMinutes":-240,"approximate":false})
    );
    assert_eq!(saved.records[0].estimated_duration_minutes, Some(1680));
    assert_eq!(application(&root).sleep_records().unwrap(), saved);
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
fn a_selection_change_after_sleep_operations_discards_even_failed_previous_vault_results() {
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
    let initial = save(
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
    let path = original.join("life/.personal-dashboard/sleep/v1/sessions.json");
    fs::write(&path, b"synthetic invalid canonical document").unwrap();
    for operation in ["read", "habit-save", "record-save"] {
        reads.store(0, Ordering::SeqCst);
        let result = match operation {
            "read" => app.sleep_records(),
            "habit-save" => app.save_habit_sleep_time(serde_json::from_value(json!({
                "habitKey":"wake","livedDate":"2026-10-22","endpoint":{"kind":"unknown"},
                "changeId":"failed-habit","targetBinding":initial.target_binding,"expectedRevision":initial.revision
            })).unwrap()),
            _ => app.save_sleep_record(serde_json::from_value(json!({
                "wakeDate":"2026-10-22","getUp":{"kind":"unknown"},
                "changeId":"failed-record","targetBinding":initial.target_binding,"expectedRevision":initial.revision
            })).unwrap()),
        };
        assert_eq!(result.unwrap_err(), "所选 Vault 在操作期间改变；结果属于原 Vault，请重新读取核对。", "selection confirmation precedes a captured operation error: {operation}");
        assert_eq!(fs::read(&path).unwrap(), b"synthetic invalid canonical document");
    }
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
        assert!(serde_json::from_value(json!({"habitKey":habit,"livedDate":day,"endpoint":endpoint,"changeId":"bad-entry","targetBinding":opened.target_binding,"expectedRevision":opened.revision})).map_err(|error| error.to_string()).and_then(|input| app.save_habit_sleep_time(input)).is_err());
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
        assert_eq!(
            serde_json::to_value(&broken).unwrap()["dailyRecordErrorKind"],
            "damagedRecord"
        );
        assert_eq!(broken.time_axis.confirmed_facts.len(), 1);
        assert_eq!(broken.time_axis.confirmed_facts[0].start_minute, Some(450));
        assert_eq!(serde_json::to_value(&broken).unwrap()["state"], "error");
        assert_eq!(broken.can_record, bytes == b"invalid daily record");
        assert_eq!(broken.target_binding.is_some(), broken.can_record);
        assert!(app
            .add_dated_note(
                serde_json::from_value(json!({
                    "date":"2026-10-22", "targetBinding":ready.target_binding,
                    "expectedRevision":ready.revision, "entryId":"blocked-note",
                    "category":"ordinary", "content":"must not overwrite failed source"
                }))
                .unwrap()
            )
            .is_err());
        assert_eq!(fs::read(&daily).unwrap(), bytes);
    }
    fs::remove_file(&daily).unwrap();
    fs::create_dir(&daily).unwrap();
    let unreadable = app.read_date("2026-10-22").unwrap();
    assert_eq!(
        serde_json::to_value(&unreadable).unwrap()["dailyRecordErrorKind"],
        "readError"
    );
    assert_eq!(unreadable.time_axis.confirmed_facts.len(), 1);
    assert_eq!(serde_json::to_value(&unreadable).unwrap()["state"], "error");
    assert!(!unreadable.can_record && unreadable.target_binding.is_none());
    assert!(app
        .add_dated_note(
            serde_json::from_value(json!({
                "date":"2026-10-22", "targetBinding":ready.target_binding,
                "expectedRevision":ready.revision, "entryId":"blocked-read-error-note",
                "category":"ordinary", "content":"must not overwrite unreadable source"
            }))
            .unwrap()
        )
        .is_err());
    assert!(daily.is_dir() && fs::read_dir(&daily).unwrap().next().is_none());
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

#[test]
fn habit_time_preview_uses_the_application_lived_day_and_local_clock_resolution() {
    let root = vault("time-preview");
    let workflow = application(&root);
    let wire = json!({"livedDate":"2026-09-09","time":"02:00","approximate":true});
    let request: HabitSleepPointRequest = serde_json::from_value(wire.clone()).unwrap();
    assert_eq!(serde_json::to_value(&request).unwrap(), wire, "point preview remains flat at the IPC boundary");
    let point = workflow.resolve_habit_sleep_point(&request).unwrap();
    assert_eq!(point.date, "2026-09-10");
    assert_eq!(point.time, "02:00");
    assert_eq!(point.utc_offset_minutes, -240);
    assert!(point.approximate);
    assert!(workflow
        .resolve_habit_sleep_point(&HabitSleepPointRequest { lived_date: "2026-02-30".into(), time: "02:00".into(), approximate: false, existing_point: None })
        .is_err());
    for time in ["24:00", "7:000", "007:0", " 7:00", "07: 0", "０7:00"] {
        assert!(
            workflow
                .resolve_habit_sleep_point(&HabitSleepPointRequest { lived_date: "2026-09-09".into(), time: time.into(), approximate: false, existing_point: None })
                .is_err(),
            "{time}"
        );
    }
    assert!(!root
        .join("life/.personal-dashboard/sleep/v1/sessions.json")
        .exists());
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn overview_projects_circular_clocks_and_same_record_elapsed_samples() {
    let root = vault("overview-statistics");
    let workflow = application(&root);
    save(
        &workflow,
        json!({"wakeDate":"2026-10-21","changeId":"overview-a","sleepOnset":point("2026-10-20","23:50",-240),"getUp":point("2026-10-21","07:20",-240)}),
    );
    save(
        &workflow,
        json!({"wakeDate":"2026-10-22","changeId":"overview-b","sleepOnset":{"kind":"point","date":"2026-10-22","time":"00:10","utcOffsetMinutes":-240,"approximate":true},"getUp":point("2026-10-22","08:10",-240)}),
    );
    let view = serde_json::to_value(workflow.sleep_records().unwrap()).unwrap();
    let overview = &view["overview"];
    assert_eq!(overview["date"], "2026-10-22");
    let stats = overview["statistics"].as_array().unwrap();
    let onset = stats
        .iter()
        .find(|s| s["metric"] == "sleep" && s["period"] == 7)
        .unwrap();
    assert_eq!(onset["mean"], 0);
    assert_eq!(onset["count"], 2);
    assert_eq!(onset["approximate"], true);
    assert_eq!(onset["earliestApproximate"], false);
    assert_eq!(onset["latestApproximate"], true);
    let duration = stats
        .iter()
        .find(|s| s["metric"] == "duration" && s["period"] == 30)
        .unwrap();
    assert_eq!(duration["mean"], 465);
    assert_eq!(duration["earliest"], 450);
    assert_eq!(duration["latest"], 480);
    assert_eq!(overview["durations"][0]["date"], "2026-10-21");
    assert_eq!(overview["durations"][0]["minutes"], 450);
    let records=workflow.sleep_records().unwrap().records;
    save(&workflow,json!({"wakeDate":"2026-10-21","recordId":records[0].id,"changeId":"round-a","sleepOnset":point("2026-10-20","23:59",-240)}));
    let rounded=save(&workflow,json!({"wakeDate":"2026-10-22","recordId":records[1].id,"changeId":"round-b","sleepOnset":point("2026-10-22","00:00",-240)}));
    let rounded=serde_json::to_value(rounded).unwrap();
    let stats=rounded["overview"]["statistics"].as_array().unwrap();
    assert_eq!(stats.iter().find(|s|s["metric"]=="sleep"&&s["period"]==7).unwrap()["mean"],0);

    fs::remove_dir_all(root).unwrap();
}

#[test]
fn manual_range_preview_preserves_both_actual_dates_and_cross_boundary_uncertainty() {
    let root = vault("range-preview");
    let workflow = application(&root);
    let wire = json!({"livedDate":"2026-09-09","startTime":"03:00","endTime":"05:00","reportedText":"between three and five"});
    let request: HabitSleepRangeRequest = serde_json::from_value(wire.clone()).unwrap();
    assert_eq!(serde_json::to_value(&request).unwrap(), wire, "range preview remains flat at the IPC boundary");
    let crossing = workflow.resolve_habit_sleep_range(&request).unwrap();
    let json = serde_json::to_value(&crossing).unwrap();
    assert_eq!(json["start"]["date"], "2026-09-10");
    assert_eq!(json["end"]["date"], "2026-09-10");
    assert_eq!(json["start"]["time"], "03:00");
    assert_eq!(json["end"]["time"], "05:00");
    let view = workflow.sleep_records().unwrap();
    let saved=workflow.save_habit_sleep_time(serde_json::from_value(json!({"habitKey":"sleep","livedDate":"2026-09-09","endpoint":crossing,"targetBinding":view.target_binding,"expectedRevision":view.revision,"changeId":"crossing-range"})).unwrap()).unwrap();
    assert_eq!(saved.facts[0].lived_date, None);
    assert_eq!(saved.records[0].estimated_duration_minutes, None);
    let midnight = serde_json::to_value(
        workflow
            .resolve_habit_sleep_range(&HabitSleepRangeRequest { lived_date: "2026-09-09".into(), start_time: "23:00".into(), end_time: "01:00".into(), reported_text: "night range".into(), existing_range: None })
            .unwrap(),
    )
    .unwrap();
    assert_eq!(midnight["start"]["date"], "2026-09-09");
    assert_eq!(midnight["end"]["date"], "2026-09-10");
    let morning = serde_json::to_value(
        workflow
            .resolve_habit_sleep_range(&HabitSleepRangeRequest { lived_date: "2026-09-09".into(), start_time: "07:00".into(), end_time: "08:00".into(), reported_text: "morning range".into(), existing_range: None })
            .unwrap(),
    )
    .unwrap();
    assert_eq!(morning["start"]["date"], "2026-09-09");
    assert_eq!(morning["end"]["date"], "2026-09-09");
    fs::remove_dir_all(root).unwrap();
}

struct TransitionClock;
impl TodayClock for TransitionClock {
    fn current_date(&self) -> String {
        "2026-10-22".into()
    }
    fn current_time_label(&self) -> String {
        "09:00".into()
    }
    fn current_timestamp_label(&self) -> String {
        "2026-10-22T09:00:00-04:00".into()
    }
    fn resolve_local_wall_time(
        &self,
        date: &str,
        minute: u16,
    ) -> personal_dashboard_lib::today::LocalWallTimeResolution {
        use personal_dashboard_lib::today::LocalWallTimeResolution::*;
        match (date, minute) {
            ("2026-03-08", 150) => Nonexistent,
            ("2026-11-01", 90) => Ambiguous,
            _ => Unique {
                utc_offset_minutes: -240,
            },
        }
    }
}
#[test]
fn point_and_range_preview_reject_nonexistent_and_ambiguous_actual_local_times() {
    let root = vault("transition-preview");
    let app = TodayApplication::new(Selected(root.clone()), NoSelection, TransitionClock);
    assert!(app
        .resolve_habit_sleep_point(&HabitSleepPointRequest { lived_date: "2026-03-07".into(), time: "02:30".into(), approximate: false, existing_point: None })
        .unwrap_err()
        .contains("不存在"));
    assert!(app
        .resolve_habit_sleep_range(&HabitSleepRangeRequest { lived_date: "2026-03-07".into(), start_time: "23:00".into(), end_time: "02:30".into(), reported_text: "original".into(), existing_range: None })
        .unwrap_err()
        .contains("不存在"));
    assert!(app
        .resolve_habit_sleep_point(&HabitSleepPointRequest { lived_date: "2026-10-31".into(), time: "01:30".into(), approximate: false, existing_point: None })
        .unwrap_err()
        .contains("重复"));
    assert!(app
        .resolve_habit_sleep_range(&HabitSleepRangeRequest { lived_date: "2026-10-31".into(), start_time: "23:00".into(), end_time: "01:30".into(), reported_text: "original".into(), existing_range: None })
        .unwrap_err()
        .contains("重复"));
    assert!(!root
        .join("life/.personal-dashboard/sleep/v1/sessions.json")
        .exists());
    fs::remove_dir_all(root).unwrap();
}

struct ReplaceSleepDuringDailyRead {
    path: PathBuf,
    reads: std::cell::Cell<usize>,
}
impl personal_dashboard_lib::today::TodayRecordStore for ReplaceSleepDuringDailyRead {
    fn load(&self, path: &Path) -> Result<Option<Vec<u8>>, String> {
        let reads = self.reads.get() + 1;
        self.reads.set(reads);
        if reads == 2 {
            fs::write(
                &self.path,
                br#"{"schemaVersion":1,"records":[],"operations":[]}"#,
            )
            .unwrap();
        }
        personal_dashboard_lib::today::TodayRecordStore::load(
            &personal_dashboard_lib::today::FileTodayRecordStore,
            path,
        )
    }
    fn save_if_unchanged(&self, _: &Path, _: &[u8], _: &[u8]) -> Result<(), String> {
        Err("read-only fixture".into())
    }
}
#[test]
fn one_today_read_keeps_historical_time_entry_and_point_on_the_same_captured_sleep_view() {
    let root = vault("coherent-sleep-view");
    let snapshot_path = root.join(personal_dashboard_lib::habits::SNAPSHOT_RELATIVE_PATH);
    fs::create_dir_all(snapshot_path.parent().unwrap()).unwrap();
    fs::write(
        snapshot_path,
        include_bytes!("fixtures/habits-v1-complete.json"),
    )
    .unwrap();
    let setup = application(&root);
    let catalog = setup.habits().unwrap();
    setup.save_habit_definition(serde_json::from_value(json!({"operationId":"later-start","targetBinding":catalog.catalog_target_binding,"expectedRevision":catalog.catalog_revision,"habitKey":"sleep","language":"en","name":"Sleep","startDate":"2026-10-23","emoji":null,"group":null,"goal":null})).unwrap()).unwrap();
    let saved = save(
        &setup,
        json!({"wakeDate":"2026-10-22","changeId":"captured-point","sleepOnset":point("2026-10-22","02:00",-240)}),
    );
    let app = TodayApplication::with_record_store(
        Selected(root.clone()),
        NoSelection,
        FixedClock,
        ReplaceSleepDuringDailyRead {
            path: root.join("life/.personal-dashboard/sleep/v1/sessions.json"),
            reads: std::cell::Cell::new(0),
        },
    );
    let first = app.read_date("2026-10-21").unwrap();
    assert!(first
        .habit_time_habits
        .iter()
        .any(|habit| habit.key == "sleep"));
    assert_eq!(
        first.time_axis.confirmed_facts.len(),
        1,
        "historical entry eligibility and its point must use the same captured read"
    );
    assert_eq!(
        first.time_axis.confirmed_facts[0]
            .sleep_fact
            .as_ref()
            .unwrap()
            .record_id,
        saved.records[0].id
    );
    let next = app.read_date("2026-10-21").unwrap();
    assert!(!next
        .habit_time_habits
        .iter()
        .any(|habit| habit.key == "sleep"));
    assert!(next.time_axis.confirmed_facts.is_empty());
    assert_eq!(first.vault_path, next.vault_path);
    fs::remove_dir_all(root).unwrap();
}

struct SelectionReadSequence(std::cell::RefCell<std::collections::VecDeque<PathBuf>>);
impl TodayWorkspacePersistence for SelectionReadSequence {
    fn load_selected_vault(&self) -> Result<Option<PathBuf>, String> {
        let mut paths = self.0.borrow_mut();
        Ok(if paths.len() > 1 {
            paths.pop_front()
        } else {
            paths.front().cloned()
        })
    }
    fn save_selected_vault(&self, _: &Path) -> Result<(), String> {
        Ok(())
    }
}

#[test]
fn path_bound_sleep_and_habit_reads_reject_same_basename_vaults_before_and_after_reading() {
    let parent = vault("path-bound-reads");
    let a = parent.join("A/Shared");
    let b = parent.join("B/Shared");
    for path in [&a, &b] {
        fs::create_dir_all(path.join(".obsidian")).unwrap();
        fs::create_dir_all(path.join("life/Journal/Daily")).unwrap();
    }
    for change_during_read in [false, true] {
        let selected = || {
            SelectionReadSequence(std::cell::RefCell::new(
                if change_during_read {
                    vec![a.clone(), b.clone()]
                } else {
                    vec![b.clone()]
                }
                .into(),
            ))
        };
        let app = TodayApplication::new(selected(), NoSelection, FixedClock);
        let error = app.sleep_records_for_path(a.to_str().unwrap()).unwrap_err();
        assert!(error.contains("所选 Vault"));
        let app = TodayApplication::new(selected(), NoSelection, FixedClock);
        let error = app
            .habits_for_selected_vault(a.to_str().unwrap())
            .unwrap_err();
        assert!(error.contains("所选 Vault"));
        let app = TodayApplication::new(selected(), NoSelection, FixedClock);
        let error = app
            .habit_detail_history_for_path("wake", a.to_str().unwrap())
            .unwrap_err();
        assert!(error.contains("所选 Vault"));
    }
    let app = TodayApplication::new(
        SelectionReadSequence(std::cell::RefCell::new(vec![a.clone()].into())),
        NoSelection,
        FixedClock,
    );
    assert_eq!(
        app.sleep_records_for_path(a.to_str().unwrap())
            .unwrap()
            .target_binding,
        application(&a).sleep_records().unwrap().target_binding
    );
    assert!(app.habits_for_selected_vault(a.to_str().unwrap()).is_ok());
    fs::remove_dir_all(parent).unwrap();
}

#[test]
fn sleep_habit_identity_rejects_other_keys_at_the_public_json_boundary() {
    use personal_dashboard_lib::sleep::{HabitSleepMutationInput, SleepEndpointFact};
    let root = vault("typed-habit-identity");
    let app = application(&root);
    let opened = app.sleep_records().unwrap();
    let input = json!({"habitKey":"wake","livedDate":"2026-10-22","endpoint":point("2026-10-22","07:20",-240),"changeId":"typed-key","targetBinding":opened.target_binding,"expectedRevision":opened.revision});
    for key in ["reading", "renamed-sleep", "", "Wake"] {
        let mut invalid = input.clone();
        invalid["habitKey"] = json!(key);
        let diagnostic = serde_json::from_value::<HabitSleepMutationInput>(invalid)
            .unwrap_err()
            .to_string();
        assert_eq!(diagnostic, "需要稳定的 wake 或 sleep Habit 身份；未写入。");
    }
    assert!(!root
        .join("life/.personal-dashboard/sleep/v1/sessions.json")
        .exists());
    for key in ["wake", "sleep"] {
        let mut valid = input.clone();
        valid["habitKey"] = json!(key);
        let decoded: HabitSleepMutationInput = serde_json::from_value(valid).unwrap();
        assert_eq!(serde_json::to_value(decoded).unwrap()["habitKey"], key);
    }
    let saved = app
        .save_habit_sleep_time(serde_json::from_value(input).unwrap())
        .unwrap();
    let mut fact = serde_json::to_value(&saved.facts[0]).unwrap();
    assert_eq!(fact["habitKey"], "wake");
    fact["habitKey"] = json!("reading");
    assert_eq!(
        serde_json::from_value::<SleepEndpointFact>(fact)
            .unwrap_err()
            .to_string(),
        "需要稳定的 wake 或 sleep Habit 身份；未写入。"
    );
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn habit_original_wording_accepts_cjk_within_the_input_limit() {
    let root = vault("original-wording-cjk");
    let app = application(&root);
    let opened = app.sleep_records().unwrap();
    let wording = "睡".repeat(700);
    let saved = app
        .save_habit_sleep_time(
            serde_json::from_value(json!({
                "habitKey":"sleep", "livedDate":"2026-10-21",
                "endpoint":{"kind":"text","text":wording}, "changeId":"cjk-wording",
                "targetBinding":opened.target_binding, "expectedRevision":opened.revision,
            }))
            .unwrap(),
        )
        .expect("700 Chinese characters fit the 2000-unit original-wording input");
    let reopened = application(&root).sleep_records().unwrap();
    assert_eq!(reopened, saved);
    assert_eq!(
        serde_json::to_value(&reopened.facts[0]).unwrap()["endpoint"]["text"],
        wording
    );
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn habit_original_wording_limit_matches_utf16_without_truncating_or_adding_timing() {
    // The mixed sample has 998 BMP units, 1000 surrogate-pair units and two spaces.
    let mixed_boundary = format!(" {}{} ", "睡".repeat(998), "🌙".repeat(500));
    for (label, wording, accepted) in [
        ("ascii-2000", "a".repeat(2000), true),
        ("ascii-2001", "a".repeat(2001), false),
        ("cjk-2000", "睡".repeat(2000), true),
        ("cjk-2001", "睡".repeat(2001), false),
        ("emoji-1000", "🌙".repeat(1000), true),
        ("emoji-1001", "🌙".repeat(1001), false),
        ("mixed-2000", mixed_boundary.clone(), true),
        ("mixed-2001", format!("{mixed_boundary}a"), false),
        ("blank", " \t　 ".into(), false),
    ] {
        let root = vault(label);
        let app = application(&root);
        let opened = app.sleep_records().unwrap();
        let baseline = app
            .save_habit_sleep_time(
                serde_json::from_value(json!({
                    "habitKey":"wake", "livedDate":"2026-10-22",
                    "endpoint":{"kind":"unknown"}, "changeId":"unknown-wake",
                    "targetBinding":opened.target_binding, "expectedRevision":opened.revision,
                }))
                .unwrap(),
            )
            .unwrap();
        let path = root.join("life/.personal-dashboard/sleep/v1/sessions.json");
        let before = fs::read(&path).unwrap();
        let result = app.save_habit_sleep_time(
            serde_json::from_value(json!({
                "habitKey":"sleep", "livedDate":"2026-10-21", "recordId":baseline.records[0].id,
                "endpoint":{"kind":"text","text":wording}, "changeId":"original-wording",
                "targetBinding":baseline.target_binding, "expectedRevision":baseline.revision,
            }))
            .unwrap(),
        );
        if accepted {
            let saved = result.unwrap_or_else(|error| panic!("{label}: {error}"));
            let reopened = application(&root).sleep_records().unwrap();
            assert_eq!(reopened, saved, "{label}");
            assert_eq!(reopened.records[0].id, baseline.records[0].id);
            assert_eq!(reopened.records[0].get_up, baseline.records[0].get_up);
            assert_eq!(reopened.records[0].estimated_duration_minutes, None);
            let fact = serde_json::to_value(&reopened.facts[0]).unwrap();
            assert_eq!(fact["endpoint"]["text"], wording, "{label}");
            assert!(fact["endpoint"]["date"].is_null());
            let today = application(&root).read_date("2026-10-21").unwrap();
            assert!(today.time_axis.confirmed_facts.is_empty());
            assert_eq!(today.time_axis.unlocated_confirmed_facts.len(), 1);
            let entry = &today.time_axis.unlocated_confirmed_facts[0];
            assert_eq!(entry.start_minute, None);
            assert_eq!(entry.end_minute, None);
            assert_eq!(
                serde_json::to_value(entry.sleep_fact.as_ref().unwrap()).unwrap()["endpoint"]
                    ["text"],
                wording,
                "{label}"
            );
        } else {
            assert_eq!(result.unwrap_err(), "请保留有效的模糊时间原文。", "{label}");
            assert_eq!(
                application(&root).sleep_records().unwrap(),
                baseline,
                "{label}"
            );
            assert_eq!(
                fs::read(&path).unwrap(),
                before,
                "{label}: rejected save wrote data"
            );
        }
        let wake_day = application(&root).read_date("2026-10-22").unwrap();
        assert!(wake_day.time_axis.confirmed_facts.is_empty());
        assert_eq!(wake_day.time_axis.unlocated_confirmed_facts.len(), 1);
        let unknown = &wake_day.time_axis.unlocated_confirmed_facts[0];
        assert_eq!(unknown.start_minute, None);
        assert_eq!(unknown.end_minute, None);
        assert_eq!(
            serde_json::to_value(unknown.sleep_fact.as_ref().unwrap()).unwrap()["endpoint"]["kind"],
            "unknown"
        );
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
}

#[test]
fn original_wording_retains_lived_context_without_claiming_an_actual_calendar_date() {
    let root = vault("unknown-text-calendar-date");
    let app = application(&root);
    let opened = app.sleep_records().unwrap();
    let input = json!({"habitKey":"sleep","livedDate":"2026-10-21","endpoint":{"kind":"text","date":null,"text":"around 2 a.m., not normalized"},"changeId":"original-only","targetBinding":opened.target_binding,"expectedRevision":opened.revision});
    let saved = app
        .save_habit_sleep_time(serde_json::from_value(input).unwrap())
        .unwrap();
    let fact = serde_json::to_value(&saved.facts[0]).unwrap();
    assert_eq!(fact["livedDate"], "2026-10-21");
    assert_eq!(fact["dayRelation"], "unresolved");
    assert!(fact["endpoint"]["date"].is_null());
    assert_eq!(fact["endpoint"]["text"], "around 2 a.m., not normalized");
    assert_eq!(saved.records[0].estimated_duration_minutes, None);
    let selected = app.read_date("2026-10-21").unwrap();
    assert_eq!(selected.time_axis.unlocated_confirmed_facts.len(), 1);
    assert!(app
        .read_date("2026-10-22")
        .unwrap()
        .time_axis
        .unlocated_confirmed_facts
        .is_empty());
    assert_eq!(application(&root).sleep_records().unwrap(), saved);
    let known = app.save_habit_sleep_time(serde_json::from_value(json!({"habitKey":"sleep","livedDate":"2026-10-21","recordId":saved.records[0].id,"endpoint":{"kind":"text","date":"2026-10-22","text":"original wording with an explicitly known actual date"},"changeId":"known-text-date","targetBinding":saved.target_binding,"expectedRevision":saved.revision})).unwrap()).unwrap();
    let reopened = serde_json::to_value(application(&root).sleep_records().unwrap()).unwrap();
    assert_eq!(reopened["facts"][0]["endpoint"]["date"], "2026-10-22");
    assert_eq!(reopened["facts"][0]["livedDate"], "2026-10-21");
    assert_eq!(known.records[0].id, saved.records[0].id);
    let mut invalid = json!({"habitKey":"sleep","livedDate":"2026-10-21","recordId":known.records[0].id,"endpoint":{"kind":"text","date":"not-a-date","text":"untouched wording"},"changeId":"invalid-text-date","targetBinding":known.target_binding,"expectedRevision":known.revision});
    assert!(app
        .save_habit_sleep_time(serde_json::from_value(invalid.clone()).unwrap())
        .is_err());
    invalid["endpoint"] = json!({"kind":"text","date":null,"text":""});
    assert!(app
        .save_habit_sleep_time(serde_json::from_value(invalid).unwrap())
        .is_err());
    assert_eq!(app.sleep_records().unwrap(), known);
    let schema = personal_dashboard_lib::sleep::tool_spec("Synthetic tool");
    let text = &schema["inputSchema"]["oneOf"][2]["properties"]["input"]["properties"]["endpoint"]
        ["oneOf"][2];
    assert!(text["properties"]["date"]["type"]
        .as_array()
        .unwrap()
        .contains(&json!("null")));
    assert!(!text["required"]
        .as_array()
        .unwrap()
        .contains(&json!("date")));
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn mutation_context_keeps_the_strict_flat_wire_contract_for_both_sleep_entries() {
    use personal_dashboard_lib::sleep::HabitSleepMutationInput;
    let record = json!({"recordId":null,"wakeDate":"2026-10-22","sleepOnset":null,"getUp":{"kind":"unknown"},"changeId":"flat-record","targetBinding":"captured-binding","expectedRevision":null});
    let habit = json!({"habitKey":"wake","livedDate":"2026-10-22","endpoint":{"kind":"unknown"},"recordId":null,"changeId":"flat-habit","targetBinding":"captured-binding","expectedRevision":null});
    for (value, is_habit) in [(record, false), (habit, true)] {
        let decode = |value: serde_json::Value| -> Result<serde_json::Value, String> {
            if is_habit {
                serde_json::from_value::<HabitSleepMutationInput>(value)
                    .and_then(serde_json::to_value)
                    .map_err(|e| e.to_string())
            } else {
                serde_json::from_value::<SleepMutationInput>(value)
                    .and_then(serde_json::to_value)
                    .map_err(|e| e.to_string())
            }
        };
        assert_eq!(decode(value.clone()).unwrap(), value);
        for extra in ["mutation", "unexpected"] {
            let mut invalid = value.clone();
            invalid[extra] =
                json!({"changeId":"nested","targetBinding":"other","expectedRevision":null});
            assert!(decode(invalid).unwrap_err().contains("unknown field"));
        }
        let mut missing = value.clone();
        missing.as_object_mut().unwrap().remove("targetBinding");
        assert!(decode(missing).unwrap_err().contains("targetBinding"));
        let duplicate =
            serde_json::to_string(&value)
                .unwrap()
                .replacen('{', "{\"changeId\":\"duplicate\",", 1);
        let diagnostic = if is_habit {
            serde_json::from_str::<HabitSleepMutationInput>(&duplicate)
                .unwrap_err()
                .to_string()
        } else {
            serde_json::from_str::<SleepMutationInput>(&duplicate)
                .unwrap_err()
                .to_string()
        };
        assert!(diagnostic.contains("duplicate field"));
    }
}

struct CorrectSleepDuringSnapshotRead {
    root: PathBuf,
    corrected: std::cell::Cell<bool>,
}
impl personal_dashboard_lib::habits::HabitSnapshotStore for CorrectSleepDuringSnapshotRead {
    fn load(&self, path: &Path) -> Result<Option<Vec<u8>>, String> {
        if !self.corrected.replace(true) {
            let app = application(&self.root);
            let before = app.sleep_records().unwrap();
            app.save_sleep_record(
                serde_json::from_value(json!({
                    "recordId":before.records[0].id,"wakeDate":"2026-10-22",
                    "changeId":"remove-during-snapshot","targetBinding":before.target_binding,
                    "expectedRevision":before.revision,"getUp":{"kind":"unrecorded"}
                }))
                .unwrap(),
            )
            .unwrap();
        }
        personal_dashboard_lib::habits::HabitSnapshotStore::load(
            &personal_dashboard_lib::habits::FileHabitSnapshotStore,
            path,
        )
    }
}

#[test]
fn habit_snapshot_captures_one_canonical_revision_for_cells_charts_and_statistics_during_correction(
) {
    let root = vault("coherent-habit-correction");
    let path = root.join(personal_dashboard_lib::habits::SNAPSHOT_RELATIVE_PATH);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    let mut source: serde_json::Value =
        serde_json::from_str(include_str!("fixtures/habits-v1-complete.json")).unwrap();
    source["generatedAt"] = json!("2026-10-22T08:00:00-04:00");
    source["range"] = json!({"from":"2026-08-03","to":"2026-10-22"});
    fs::write(path, serde_json::to_vec(&source).unwrap()).unwrap();
    let before = save(
        &application(&root),
        json!({"wakeDate":"2026-10-22","changeId":"before-snapshot",
        "sleepOnset":point("2026-10-21","23:30",-240),"getUp":point("2026-10-22","07:30",-240)}),
    );
    let app = TodayApplication::with_stores(
        Selected(root.clone()),
        NoSelection,
        FixedClock,
        personal_dashboard_lib::today::FileTodayRecordStore,
        CorrectSleepDuringSnapshotRead {
            root: root.clone(),
            corrected: std::cell::Cell::new(false),
        },
    );
    let captured = app.habits().unwrap();
    let wake = captured.habit("wake").unwrap();
    assert_eq!(
        wake.today.sleep_fact.as_ref().unwrap().record_id,
        before.records[0].id
    );
    let canonical = captured.sleep_view.as_ref().unwrap();
    assert_eq!(canonical.revision, before.revision);
    assert_eq!(canonical.facts, before.facts);
    let overview = serde_json::to_value(canonical).unwrap()["overview"].clone();
    assert_eq!(overview["date"], "2026-10-22");
    assert_eq!(overview["durations"][0]["minutes"], 480);
    for period in [7, 30] {
        let stats = overview["statistics"]
            .as_array()
            .unwrap()
            .iter()
            .find(|s| s["metric"] == "wake" && s["period"] == period)
            .unwrap();
        assert_eq!(stats["count"], 1);
        assert_eq!(stats["mean"], 450);
    }
    let corrected = app.habits().unwrap();
    assert!(corrected.habit("wake").unwrap().today.sleep_fact.is_none());
    assert_ne!(
        corrected.sleep_view.as_ref().unwrap().revision,
        canonical.revision
    );
    assert!(!corrected
        .sleep_view
        .as_ref()
        .unwrap()
        .facts
        .iter()
        .any(|f| f.habit_key.as_str() == "wake"));
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn canonical_plot_coordinates_and_overview_extrema_share_one_clock_phase_without_changing_raw_times(
) {
    let root = vault("canonical-clock-plot");
    let app = application(&root);
    for (index, (wake_date, date, time)) in [
        ("2026-10-19", "2026-10-18", "23:50"),
        ("2026-10-20", "2026-10-20", "00:10"),
        ("2026-10-21", "2026-10-21", "03:50"),
        ("2026-10-22", "2026-10-21", "04:10"),
    ]
    .into_iter()
    .enumerate()
    {
        let mut onset = point(date, time, -240);
        onset["approximate"] = json!(index == 0);
        let mut input =
            json!({"wakeDate":wake_date,"changeId":format!("plot-{index}"),"sleepOnset":onset});
        if index == 2 {
            input["getUp"] = point("2026-10-21", "13:30", -240);
        }
        save(&app, input);
    }
    let view = serde_json::to_value(app.sleep_records().unwrap()).unwrap();
    let facts = view["facts"].as_array().unwrap();
    let onsets = facts
        .iter()
        .filter(|f| f["habitKey"] == "sleep")
        .collect::<Vec<_>>();
    assert_eq!(
        onsets
            .iter()
            .map(|f| f["clockPlotMinutes"].clone())
            .collect::<Vec<_>>(),
        vec![json!(-10), json!(10), json!(230), json!(250)]
    );
    assert_eq!(
        onsets
            .iter()
            .map(|f| f["endpoint"]["time"].clone())
            .collect::<Vec<_>>(),
        vec![
            json!("23:50"),
            json!("00:10"),
            json!("03:50"),
            json!("04:10")
        ]
    );
    assert_eq!(onsets[0]["endpoint"]["approximate"], true);
    assert_eq!(
        facts.iter().find(|f| f["habitKey"] == "wake").unwrap()["clockPlotMinutes"],
        810
    );
    for period in [7, 30] {
        let stats = view["overview"]["statistics"]
            .as_array()
            .unwrap()
            .iter()
            .find(|s| s["metric"] == "sleep" && s["period"] == period)
            .unwrap();
        assert_eq!(stats["earliest"], -10);
        assert_eq!(stats["latest"], 250);
        assert_eq!(stats["mean"], 120);
        assert_eq!(stats["count"], 4);
        assert_eq!(stats["earliestApproximate"], true);
        assert_eq!(stats["latestApproximate"], false);
    }
    let daytime = save(
        &app,
        json!({"wakeDate":"2026-10-18","changeId":"daytime-sleep","sleepOnset":point("2026-10-17","13:30",-240)}),
    );
    let daytime = serde_json::to_value(daytime).unwrap();
    let fact = daytime["facts"]
        .as_array()
        .unwrap()
        .iter()
        .find(|f| f["endpoint"]["time"] == "13:30" && f["habitKey"] == "sleep")
        .unwrap();
    assert_eq!(
        fact["clockPlotMinutes"], -630,
        "the sleep anchor differs from wake without changing the reported clock"
    );
    assert_eq!(fact["endpoint"]["date"], "2026-10-17");
    let document: serde_json::Value = serde_json::from_slice(
        &fs::read(root.join("life/.personal-dashboard/sleep/v1/sessions.json")).unwrap(),
    )
    .unwrap();
    assert_eq!(document["schemaVersion"], 1);
    for record in document["records"].as_array().unwrap() {
        assert!(record.get("clockPlotMinutes").is_none());
        assert!(record["sleepOnset"].get("clockPlotMinutes").is_none());
    }
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn contextless_reported_date_is_only_possible_overlap_evidence_until_an_explicit_lived_context_is_supplied(
) {
    let root = vault("legacy-text-possible-days");
    let app = application(&root);
    let saved = save(
        &app,
        json!({"wakeDate":"2026-10-22","changeId":"legacy-contextless",
        "sleepOnset":{"kind":"text","date":"2026-10-21","text":"around two; original wording is not a clock"},"getUp":{"kind":"unknown"}}),
    );
    let id = saved.records[0].id.clone();
    for date in ["2026-10-20", "2026-10-21"] {
        let view = app.read_date(date).unwrap();
        let evidence = view
            .time_axis
            .unlocated_confirmed_facts
            .iter()
            .filter(|entry| entry.sleep_fact.is_some())
            .collect::<Vec<_>>();
        assert_eq!(
            evidence.len(),
            1,
            "actual civil date can overlap either adjacent lived window: {date}"
        );
        let entry = evidence[0];
        let fact = entry.sleep_fact.as_ref().unwrap();
        assert!(fact.lived_date.is_none());
        assert!(entry.start_minute.is_none());
        assert_eq!(entry.source_date, "2026-10-21");
        assert_eq!(fact.record_id, id);
        assert_eq!(
            serde_json::to_value(&fact.endpoint).unwrap()["date"],
            "2026-10-21"
        );
        assert!(view
            .time_axis
            .confirmed_facts
            .iter()
            .all(|entry| entry.sleep_fact.is_none()));
    }
    for date in ["2026-10-19", "2026-10-22"] {
        let view = app.read_date(date).unwrap();
        assert!(
            view.time_axis
                .unlocated_confirmed_facts
                .iter()
                .all(|entry| entry.sleep_fact.is_none()),
            "no dated evidence belongs to unrelated day or the night index: {date}"
        );
    }
    let canonical = serde_json::to_value(app.sleep_records().unwrap()).unwrap();
    assert_eq!(
        canonical["facts"].as_array().unwrap().len(),
        2,
        "contextless unknown remains independently readable without guessing a day"
    );
    assert!(canonical["overview"]["statistics"]
        .as_array()
        .unwrap()
        .iter()
        .all(|s| s["count"] == 0));
    let corrected = save(
        &app,
        json!({"recordId":id,"wakeDate":"2026-10-22","changeId":"explicit-context",
        "sleepOnset":{"kind":"text","date":"2026-10-21","text":"around two; original wording is not a clock"},"sleepOnsetLivedDate":"2026-10-20"}),
    );
    assert_eq!(corrected.records[0].id, id);
    let selected = app.read_date("2026-10-20").unwrap();
    let entry = selected
        .time_axis
        .unlocated_confirmed_facts
        .iter()
        .find(|entry| entry.sleep_fact.is_some())
        .unwrap();
    assert_eq!(entry.source_date, "2026-10-21");
    assert_eq!(
        entry.sleep_fact.as_ref().unwrap().lived_date.as_deref(),
        Some("2026-10-20")
    );
    assert!(app
        .read_date("2026-10-21")
        .unwrap()
        .time_axis
        .unlocated_confirmed_facts
        .iter()
        .all(|entry| entry.sleep_fact.is_none()));
    assert_eq!(
        fs::read_dir(root.join("life/Journal/Daily"))
            .unwrap()
            .count(),
        0
    );
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn legacy_night_index_keeps_the_wake_date_wire_key_and_stored_bytes_through_read_and_retry() {
    let root = vault("night-index-wire-compatibility");
    let path = root.join("life/.personal-dashboard/sleep/v1/sessions.json");
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    let legacy = serde_json::to_vec(&json!({"schemaVersion":1,"operations":[],"records":[{
        "id":"legacy-night","wakeDate":"2026-10-22","sleepOnset":{"kind":"unknown"},
        "getUp":{"kind":"unknown"},"estimatedDurationMinutes":null
    }]}))
    .unwrap();
    fs::write(&path, &legacy).unwrap();
    let app = application(&root);
    let opened = app.sleep_records().unwrap();
    assert_eq!(
        fs::read(&path).unwrap(),
        legacy,
        "reading never migrates the legacy document"
    );
    let wire = json!({"recordId":"legacy-night","wakeDate":"2026-10-22","sleepOnset":null,
        "getUp":{"kind":"point","date":"2026-10-23","time":"03:30","utcOffsetMinutes":-240,"approximate":false},
        "changeId":"same-night-correction","targetBinding":opened.target_binding,"expectedRevision":opened.revision});
    let input: SleepMutationInput = serde_json::from_value(wire.clone()).unwrap();
    assert_eq!(
        serde_json::to_value(&input).unwrap(),
        wire,
        "mutation boundary retains the exact flat public shape"
    );
    let saved = app.save_sleep_record(input.clone()).unwrap();
    let expected_record = json!({"id":"legacy-night","wakeDate":"2026-10-22","sleepOnset":{"kind":"unknown"},
        "getUp":{"kind":"point","date":"2026-10-23","time":"03:30","utcOffsetMinutes":-240,"approximate":false},
        "estimatedDurationMinutes":null});
    assert_eq!(
        serde_json::to_value(&saved.records[0]).unwrap(),
        expected_record,
        "night identity remains independent of the actual wake endpoint date"
    );
    let bytes = fs::read(&path).unwrap();
    let stored: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(stored["schemaVersion"], 1);
    assert_eq!(stored["records"], json!([expected_record]));
    for forbidden in ["nightIndex", "night_index", "wake_date"] {
        assert!(stored["records"][0].get(forbidden).is_none());
        assert!(serde_json::to_value(&input)
            .unwrap()
            .get(forbidden)
            .is_none());
    }
    let reopened = application(&root).sleep_records().unwrap();
    assert_eq!(reopened, saved);
    assert_eq!(
        app.save_sleep_record(input).unwrap(),
        saved,
        "the same delivery retains its idempotency receipt and revision"
    );
    assert_eq!(
        fs::read(&path).unwrap(),
        bytes,
        "read and duplicate delivery leave canonical bytes unchanged"
    );
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn stored_point_edits_preserve_actual_provenance_before_current_zone_resolution() {
    let root = vault("travel-point");
    let app = TodayApplication::new(Selected(root.clone()), NoSelection, TransitionClock);
    let original = json!({"date":"2026-03-08","time":"02:30","utcOffsetMinutes":540,"approximate":false});
    let initial = app.sleep_records().unwrap();
    let stored = app.save_sleep_record(serde_json::from_value(json!({"wakeDate":"2026-03-08","getUp":{"kind":"point","date":"2026-03-08","time":"02:30","utcOffsetMinutes":540},"changeId":"original","targetBinding":initial.target_binding,"expectedRevision":initial.revision})).unwrap()).unwrap();
    let request = serde_json::from_value(json!({"livedDate":"2026-03-07","time":"02:30","approximate":true,"existingPoint":original})).unwrap();
    let corrected = app.resolve_habit_sleep_point(&request).unwrap();
    assert_eq!(corrected.date, "2026-03-08");
    assert_eq!(corrected.utc_offset_minutes, 540);
    assert!(corrected.approximate);
    let saved = app.save_habit_sleep_time(serde_json::from_value(json!({"habitKey":"wake","livedDate":"2026-03-07","recordId":stored.records[0].id,"endpoint":{"kind":"point","date":corrected.date,"time":corrected.time,"utcOffsetMinutes":corrected.utc_offset_minutes,"approximate":corrected.approximate},"changeId":"approximate","targetBinding":stored.target_binding,"expectedRevision":stored.revision})).unwrap()).unwrap();
    assert_eq!(app.sleep_records().unwrap(), saved);
    let changed = app.resolve_habit_sleep_point(&serde_json::from_value(json!({"livedDate":"2026-03-07","time":"02:45","approximate":true,"existingPoint":original})).unwrap()).unwrap();
    assert_eq!(changed.date, "2026-03-08");
    assert_eq!(changed.time, "02:45");
    assert_eq!(changed.utc_offset_minutes, 540);
    let earlier = app.resolve_habit_sleep_point(&serde_json::from_value(json!({"livedDate":"2026-03-07","time":"23:30","approximate":false,"existingPoint":original})).unwrap()).unwrap();
    assert_eq!(earlier.date, "2026-03-07");
    assert_eq!(earlier.utc_offset_minutes, 540);
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn stored_range_edits_preserve_independent_offsets_through_dst_and_readback() {
    let root = vault("travel-range");
    let app = TodayApplication::new(Selected(root.clone()), NoSelection, TransitionClock);
    let original = json!({"start":{"date":"2026-11-01","time":"01:15","utcOffsetMinutes":-240},"end":{"date":"2026-11-01","time":"01:45","utcOffsetMinutes":-300}});
    let initial=app.sleep_records().unwrap();
    let stored=app.save_sleep_record(serde_json::from_value(json!({"wakeDate":"2026-11-01","sleepOnset":{"kind":"range","start":original["start"],"end":original["end"],"reportedText":"original"},"changeId":"stored-range","targetBinding":initial.target_binding,"expectedRevision":initial.revision})).unwrap()).unwrap();
    let endpoint=app.resolve_habit_sleep_range(&serde_json::from_value(json!({"livedDate":"2026-10-31","startTime":"01:30","endTime":"01:50","reportedText":"corrected","existingRange":original})).unwrap()).unwrap();
    let value=serde_json::to_value(&endpoint).unwrap();
    assert_eq!(value["start"]["date"],"2026-11-01");
    assert_eq!(value["start"]["utcOffsetMinutes"],-240);
    assert_eq!(value["end"]["date"],"2026-11-01");
    assert_eq!(value["end"]["utcOffsetMinutes"],-300);
    let saved=app.save_habit_sleep_time(serde_json::from_value(json!({"habitKey":"sleep","livedDate":"2026-10-31","recordId":stored.records[0].id,"endpoint":endpoint,"changeId":"corrected-range","targetBinding":stored.target_binding,"expectedRevision":stored.revision})).unwrap()).unwrap();
    assert_eq!(app.sleep_records().unwrap(),saved);
    assert_eq!(saved.records[0].estimated_duration_minutes,None);
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn new_sleep_range_requires_clarification_before_splitting_a_compatible_wake_night() {
    let root=vault("range-ambiguity");
    let app=application(&root);
    let before=save(&app,json!({"wakeDate":"2026-10-21","changeId":"wake","getUp":point("2026-10-21","07:30",-240)}));
    let result=app.save_habit_sleep_time(serde_json::from_value(json!({"habitKey":"sleep","livedDate":"2026-10-21","endpoint":range("2026-10-21","04:30","05:00",-240),"changeId":"new-sleep-range","targetBinding":before.target_binding,"expectedRevision":before.revision})).unwrap());
    assert!(result.is_err(),"a possibly compatible range must require clarification instead of creating a second night");
    assert!(result.unwrap_err().contains("澄清"));
    assert_eq!(app.sleep_records().unwrap(),before,"clarification performs zero writes");
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn unlocated_opposite_range_still_requires_clarification_when_a_same_lived_day_instant_is_compatible() {
    let root=vault("unlocated-range-ambiguity");
    let app=application(&root);
    let before=save(&app,json!({"wakeDate":"2026-10-21","changeId":"wake-range","getUp":range("2026-10-21","03:30","05:00",-240)}));
    assert_eq!(before.facts[0].lived_date,None);
    let result=app.save_habit_sleep_time(serde_json::from_value(json!({"habitKey":"sleep","livedDate":"2026-10-21","endpoint":point("2026-10-21","04:30",-240),"changeId":"new-sleep","targetBinding":before.target_binding,"expectedRevision":before.revision})).unwrap());
    assert!(result.is_err(),"null livedDate is uncertainty, not proof of a separate night");
    assert!(result.unwrap_err().contains("澄清"));
    assert_eq!(app.sleep_records().unwrap(),before);
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn range_clarification_uses_possible_chronology_without_pairing_or_guessing_location() {
    let cases = [
        ("mirrored-wake-range", "wake", "2026-10-22", "sleepOnset", point("2026-10-21","05:00",-240), range("2026-10-21","04:30","05:30",-240), true, false),
        ("opposite-wake-range", "sleep", "2026-10-21", "getUp", range("2026-10-21","05:00","06:00",-240), point("2026-10-21","05:30",-240), true, false),
        ("opposite-onset-range", "wake", "2026-10-22", "sleepOnset", range("2026-10-21","04:30","05:30",-240), point("2026-10-21","05:00",-240), true, false),
        ("both-ranges-overlap", "sleep", "2026-10-21", "getUp", range("2026-10-21","05:00","06:00",-240), range("2026-10-21","04:30","05:30",-240), true, false),
        ("disjoint-sleep-range", "sleep", "2026-10-21", "getUp", point("2026-10-21","07:30",-240), range("2026-10-21","08:00","09:00",-240), false, false),
        ("disjoint-wake-range", "wake", "2026-10-22", "sleepOnset", point("2026-10-21","07:30",-240), range("2026-10-21","04:30","05:30",-240), false, false),
        ("explicit-record", "sleep", "2026-10-21", "getUp", point("2026-10-21","07:30",-240), range("2026-10-21","04:30","05:00",-240), false, true),
        ("default-night", "sleep", "2026-10-22", "getUp", point("2026-10-21","07:30",-240), range("2026-10-21","04:30","05:00",-240), false, false),
        ("unlocated-mirrored", "wake", "2026-10-22", "sleepOnset", range("2026-10-21","03:30","05:00",-240), range("2026-10-21","04:30","05:30",-240), true, false),
        ("unlocated-disjoint", "sleep", "2026-10-21", "getUp", range("2026-10-21","03:30","05:00",-240), point("2026-10-21","23:00",-240), false, false),
        ("incoming-unlocated", "sleep", "2026-10-21", "getUp", point("2026-10-21","05:30",-240), range("2026-10-21","03:30","05:00",-240), true, false),
        ("wording-unknown", "sleep", "2026-10-21", "getUp", json!({"kind":"unknown"}), range("2026-10-21","04:30","05:00",-240), false, false),
    ];
    for (label,habit,index,key,opposite,incoming,clarify,explicit) in cases {
        let root=vault(label);
        let app=application(&root);
        let mut seed=json!({"wakeDate":index,"changeId":"seed"});
        seed[key]=opposite;
        let before=save(&app,seed);
        let mut input=json!({"habitKey":habit,"livedDate":"2026-10-21","endpoint":incoming,"changeId":"entry","targetBinding":before.target_binding,"expectedRevision":before.revision});
        if explicit {input["recordId"]=json!(before.records[0].id);}
        let request=serde_json::from_value(input).unwrap();
        let result=app.save_habit_sleep_time(request);
        if clarify {
            assert!(result.is_err(),"{label}: must clarify possible chronology");
            assert!(result.unwrap_err().contains("澄清"),"{label}");
            assert_eq!(app.sleep_records().unwrap(),before,"{label}: zero writes");
        } else {
            let saved=result.unwrap_or_else(|error|panic!("{label}: {error}"));
            assert_eq!(app.sleep_records().unwrap(),saved,"{label}");
            assert_eq!(saved.records.len(),if explicit||label=="default-night" {1} else {2},"{label}: never auto-pair by chronology");
        }
        fs::remove_dir_all(root).unwrap();
    }
    let root=vault("complete-range-candidate");
    let app=application(&root);
    let before=save(&app,json!({"wakeDate":"2026-10-21","changeId":"complete","sleepOnset":point("2026-10-20","23:00",-240),"getUp":range("2026-10-21","07:00","08:00",-240)}));
    let result=app.save_habit_sleep_time(serde_json::from_value(json!({"habitKey":"sleep","livedDate":"2026-10-21","endpoint":range("2026-10-21","04:30","05:00",-240),"changeId":"incoming","targetBinding":before.target_binding,"expectedRevision":before.revision})).unwrap());
    assert!(result.unwrap_err().contains("澄清"));
    assert_eq!(app.sleep_records().unwrap(),before);
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn incoming_unlocated_range_checks_opposite_facts_on_each_possible_lived_day() {
    let root=vault("incoming-unlocated-range");
    let app=application(&root);
    let before=save(&app,json!({"wakeDate":"2026-10-22","changeId":"identified-wake","getUp":point("2026-10-21","05:30",-240)}));
    // The selected day's 03:30 starts on the next actual date; its range then crosses 04:00.
    let incoming=app.resolve_habit_sleep_range(&serde_json::from_value(json!({"livedDate":"2026-10-20","startTime":"03:30","endTime":"05:00","reportedText":"between half past three and five"})).unwrap()).unwrap();
    let result=app.save_habit_sleep_time(serde_json::from_value(json!({"habitKey":"sleep","livedDate":"2026-10-20","endpoint":incoming,"changeId":"new-unlocated-range","targetBinding":before.target_binding,"expectedRevision":before.revision})).unwrap());
    assert!(result.is_err(),"an incoming crossing range may share either lived day with the opposite fact");
    assert!(result.unwrap_err().contains("澄清"));
    assert_eq!(app.sleep_records().unwrap(),before);
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn known_zero_and_non_hour_offsets_survive_gap_overlap_and_bidirectional_habit_date_corrections() {
    for (offset,actual,lived,time) in [(0,"2026-03-08","2026-03-07","02:30"),(345,"2026-11-01","2026-10-31","01:30")] {
        let root=vault("known-offset-correction");
        let app=TodayApplication::new(Selected(root.clone()),NoSelection,TransitionClock);
        let initial=app.sleep_records().unwrap();
        let mut source=json!({"date":actual,"time":time,"utcOffsetMinutes":offset,"approximate":false});
        let mut endpoint=source.clone();endpoint["kind"]=json!("point");
        let mut view=app.save_sleep_record(serde_json::from_value(json!({"wakeDate":actual,"sleepOnset":endpoint,"changeId":"seed","targetBinding":initial.target_binding,"expectedRevision":initial.revision})).unwrap()).unwrap();
        for (index,(new_time,expected_date)) in [(time,actual),("23:30",lived),(time,actual)].into_iter().enumerate() {
            let corrected=app.resolve_habit_sleep_point(&serde_json::from_value(json!({"livedDate":lived,"time":new_time,"approximate":true,"existingPoint":source})).unwrap()).unwrap();
            assert_eq!(corrected.date,expected_date);
            assert_eq!(corrected.utc_offset_minutes,offset);
            assert!(corrected.approximate);
            source=serde_json::to_value(&corrected).unwrap();
            let mut endpoint=source.clone();endpoint["kind"]=json!("point");
            view=app.save_habit_sleep_time(serde_json::from_value(json!({"habitKey":"sleep","livedDate":lived,"recordId":view.records[0].id,"endpoint":endpoint,"changeId":format!("correction-{index}"),"targetBinding":view.target_binding,"expectedRevision":view.revision})).unwrap()).unwrap();
            assert_eq!(app.sleep_records().unwrap(),view);
        }
        fs::remove_dir_all(root).unwrap();
    }
}

#[test]
fn wording_only_edit_preserves_repeated_hour_range_dates_offsets_and_approximation() {
    let root=vault("repeated-hour-wording");
    let app=TodayApplication::new(Selected(root.clone()),NoSelection,TransitionClock);
    let original=json!({"start":{"date":"2026-11-01","time":"01:45","utcOffsetMinutes":-240,"approximate":true},"end":{"date":"2026-11-01","time":"01:15","utcOffsetMinutes":-300,"approximate":true}});
    let initial=app.sleep_records().unwrap();
    let before=app.save_sleep_record(serde_json::from_value(json!({"wakeDate":"2026-11-01","sleepOnset":{"kind":"range","start":original["start"],"end":original["end"],"reportedText":"original"},"changeId":"seed","targetBinding":initial.target_binding,"expectedRevision":initial.revision})).unwrap()).unwrap();
    let endpoint=app.resolve_habit_sleep_range(&serde_json::from_value(json!({"livedDate":"2026-10-31","startTime":"01:45","endTime":"01:15","reportedText":"corrected wording","existingRange":original})).unwrap()).unwrap();
    let value=serde_json::to_value(&endpoint).unwrap();
    assert_eq!(value["start"],original["start"]);
    assert_eq!(value["end"],original["end"],"changing wording cannot add a calendar day to an already-known repeated-hour range");
    let saved=app.save_habit_sleep_time(serde_json::from_value(json!({"habitKey":"sleep","livedDate":"2026-10-31","recordId":before.records[0].id,"endpoint":endpoint,"changeId":"wording","targetBinding":before.target_binding,"expectedRevision":before.revision})).unwrap()).unwrap();
    assert_eq!(app.sleep_records().unwrap(),saved);
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn corrected_night_identity_requires_clarification_before_normal_overnight_supplement_creates_a_second_night() {
    let root=vault("corrected-night-supplement");
    let app=application(&root);
    let original=save(&app,json!({"wakeDate":"2026-10-23","changeId":"original-wake","getUp":point("2026-10-23","07:30",-240)}));
    let before=save(&app,json!({"recordId":original.records[0].id,"wakeDate":"2026-10-23","changeId":"corrected-wake","getUp":point("2026-10-22","07:30",-240)}));
    assert_eq!(before.records[0].id,original.records[0].id);
    let result=app.save_habit_sleep_time(serde_json::from_value(json!({"habitKey":"sleep","livedDate":"2026-10-21","endpoint":point("2026-10-21","23:00",-240),"changeId":"supplement","targetBinding":before.target_binding,"expectedRevision":before.revision})).unwrap());
    assert!(result.is_err(),"a date-corrected identity must be clarified before creating a possible duplicate night");
    assert!(result.unwrap_err().contains("澄清"));
    assert_eq!(app.sleep_records().unwrap(),before);
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn stored_range_time_corrections_keep_endpoint_metadata_and_existing_fixed_context_date_rules() {
    let root=vault("range-date-corrections");
    let app=TodayApplication::new(Selected(root.clone()),NoSelection,TransitionClock);
    let mut source=json!({"start":{"date":"2026-03-08","time":"03:00","utcOffsetMinutes":345,"approximate":true},"end":{"date":"2026-03-08","time":"03:30","utcOffsetMinutes":0,"approximate":true}});
    let initial=app.sleep_records().unwrap();
    let mut view=app.save_sleep_record(serde_json::from_value(json!({"wakeDate":"2026-03-08","sleepOnset":{"kind":"range","start":source["start"],"end":source["end"],"reportedText":"original"},"changeId":"seed","targetBinding":initial.target_binding,"expectedRevision":initial.revision})).unwrap()).unwrap();
    for (index,(start_time,start_date)) in [("02:30","2026-03-08"),("23:30","2026-03-07"),("02:30","2026-03-08")].into_iter().enumerate() {
        let endpoint=app.resolve_habit_sleep_range(&serde_json::from_value(json!({"livedDate":"2026-03-07","startTime":start_time,"endTime":"03:30","reportedText":"corrected","existingRange":source})).unwrap()).unwrap();
        let value=serde_json::to_value(&endpoint).unwrap();
        assert_eq!(value["start"]["date"],start_date);
        assert_eq!(value["end"]["date"],"2026-03-08");
        assert_eq!(value["start"]["utcOffsetMinutes"],345);
        assert_eq!(value["end"]["utcOffsetMinutes"],0);
        assert_eq!(value["start"]["approximate"],true);
        assert_eq!(value["end"]["approximate"],true);
        source=json!({"start":value["start"],"end":value["end"]});
        view=app.save_habit_sleep_time(serde_json::from_value(json!({"habitKey":"sleep","livedDate":"2026-03-07","recordId":view.records[0].id,"endpoint":endpoint,"changeId":format!("range-{index}"),"targetBinding":view.target_binding,"expectedRevision":view.revision})).unwrap()).unwrap();
        assert_eq!(app.sleep_records().unwrap(),view);
        assert_eq!(view.records[0].estimated_duration_minutes,None);
    }
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn corrected_overnight_identity_clarification_is_symmetric_and_keeps_unrelated_or_disjoint_nights_separate() {
    let root=vault("corrected-onset-supplement");
    let app=application(&root);
    let original=save(&app,json!({"wakeDate":"2026-10-21","changeId":"original-onset","sleepOnset":point("2026-10-20","23:00",-240)}));
    let before=save(&app,json!({"recordId":original.records[0].id,"wakeDate":"2026-10-21","changeId":"corrected-onset","sleepOnset":point("2026-10-21","23:00",-240)}));
    let result=app.save_habit_sleep_time(serde_json::from_value(json!({"habitKey":"wake","livedDate":"2026-10-22","endpoint":point("2026-10-22","07:30",-240),"changeId":"supplement","targetBinding":before.target_binding,"expectedRevision":before.revision})).unwrap());
    assert!(result.unwrap_err().contains("澄清"));
    assert_eq!(app.sleep_records().unwrap(),before);
    fs::remove_dir_all(root).unwrap();
    for (label,wake_date,wake_offset,sleep_offset) in [("unrelated-morning","2026-10-23",-240,-240),("utc-disjoint-morning","2026-10-22",840,-720)] {
        let root=vault(label);
        let app=application(&root);
        let before=save(&app,json!({"wakeDate":"2026-10-23","changeId":"other-wake","getUp":point(wake_date,"07:30",wake_offset)}));
        let input=serde_json::from_value(json!({"habitKey":"sleep","livedDate":"2026-10-21","endpoint":point("2026-10-21","23:00",sleep_offset),"changeId":"entry","targetBinding":before.target_binding,"expectedRevision":before.revision})).unwrap();
        let saved=app.save_habit_sleep_time(input).unwrap();
        assert_eq!(saved.records.len(),2,"{label}: no inferred pairing or blanket blockage");
        assert_eq!(app.sleep_records().unwrap(),saved);
        fs::remove_dir_all(root).unwrap();
    }
}

#[test]
fn a_conflicting_habit_date_retains_the_captured_view_and_other_dates_statistics() {
    struct FixtureClock;
    impl TodayClock for FixtureClock {
        fn current_date(&self) -> String { "2026-08-10".into() }
        fn current_time_label(&self) -> String { "09:00".into() }
        fn current_timestamp_label(&self) -> String { "2026-08-10T09:00:00-04:00".into() }
    }
    let root=vault("conflict-local-overview");
    let path=root.join(personal_dashboard_lib::habits::SNAPSHOT_RELATIVE_PATH);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    let mut source:serde_json::Value=serde_json::from_str(include_str!("fixtures/habits-v1-complete.json")).unwrap();
    source["generatedAt"]=json!("2026-08-10T09:00:00-04:00");
    source["range"]=json!({"from":"2026-05-25","to":"2026-08-10"});
    for habit in source["habits"].as_array_mut().unwrap() {
        habit["days"]=json!([]);habit["goalHistory"]=json!([]);
    }
    fs::write(path,serde_json::to_vec(&source).unwrap()).unwrap();
    let app=TodayApplication::new(Selected(root.clone()),NoSelection,FixtureClock);
    // Retained/external canonical documents may contain conflicting endpoint dates;
    // current mutation guards correctly refuse to create new conflicts.
    let sleep_path=root.join("life/.personal-dashboard/sleep/v1/sessions.json");
    fs::create_dir_all(sleep_path.parent().unwrap()).unwrap();
    fs::write(sleep_path,serde_json::to_vec(&json!({"schemaVersion":1,"operations":[],"records":[
        {"id":"conflicting-wake-a","wakeDate":"2026-08-08","sleepOnset":{"kind":"unrecorded"},"getUp":point("2026-08-09","07:20",-240),"estimatedDurationMinutes":null},
        {"id":"conflicting-wake-b","wakeDate":"2026-08-09","sleepOnset":{"kind":"unrecorded"},"getUp":point("2026-08-09","08:40",-240),"estimatedDurationMinutes":null},
        {"id":"valid-night","wakeDate":"2026-08-10","sleepOnset":point("2026-08-09","23:30",-240),"getUp":point("2026-08-10","07:30",-240),"estimatedDurationMinutes":480}
    ]})).unwrap()).unwrap();
    let snapshot=app.habits().unwrap();
    assert!(!snapshot.habits.is_empty(), "snapshot {:?}: {}",snapshot.state,snapshot.message);
    assert!(snapshot.sleep_error.as_deref().unwrap().contains("多条作息端点"));
    let sleep=snapshot.sleep_view.as_ref().unwrap();
    assert_eq!(sleep.facts.iter().filter(|fact|fact.habit_key.as_str()=="wake"&&fact.lived_date.as_deref()==Some("2026-08-09")).count(),2);
    let wake=snapshot.habit("wake").unwrap();
    assert!(wake.history.iter().find(|cell|cell.date=="2026-08-09").unwrap().sleep_fact.is_none());
    assert!(wake.today.sleep_fact.is_some());
    let overview=serde_json::to_value(sleep).unwrap()["overview"].clone();
    assert_eq!(overview["durations"].as_array().unwrap().len(),1);
    assert_eq!(overview["durations"][0]["date"],"2026-08-10");
    for (metric,mean) in [("wake",450),("sleep",1410),("duration",480)] {
        for period in [7,30] {
            let stats=overview["statistics"].as_array().unwrap().iter().find(|stats|stats["metric"]==metric&&stats["period"]==period).unwrap();
            assert_eq!(stats["count"],1,"{metric}/{period}: conflict excludes only its own date");
            assert_eq!(stats["mean"],mean,"{metric}/{period}");
        }
    }
    // Optional synthetic capture used by the compiled-page regression fixture.
    if let Ok(path)=std::env::var("PD_SLEEP_CONFLICT_FIXTURE") {
        fs::write(path,serde_json::to_vec_pretty(&json!({"sleepError":snapshot.sleep_error,"sleepView":snapshot.sleep_view})).unwrap()).unwrap();
    }
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn repeated_hour_range_clock_corrections_preserve_known_end_date() {
    assert_repeated_hour_range_correction("end", "01:45", "01:10");
}

#[test]
fn repeated_hour_range_clock_corrections_preserve_known_start_date() {
    assert_repeated_hour_range_correction("start", "01:50", "01:15");
}

fn assert_repeated_hour_range_correction(label: &str, start_time: &str, end_time: &str) {
    let root = vault(&format!("repeated-hour-correct-{label}"));
    let app = TodayApplication::new(Selected(root.clone()), NoSelection, TransitionClock);
    let original = json!({"start":{"date":"2026-11-01","time":"01:45","utcOffsetMinutes":-240,"approximate":true},"end":{"date":"2026-11-01","time":"01:15","utcOffsetMinutes":-300,"approximate":false}});
    let initial = app.sleep_records().unwrap();
    let before = app.save_sleep_record(serde_json::from_value(json!({"wakeDate":"2026-11-01","sleepOnset":{"kind":"range","start":original["start"],"end":original["end"],"reportedText":"original"},"changeId":"seed","targetBinding":initial.target_binding,"expectedRevision":initial.revision})).unwrap()).unwrap();
    let endpoint = app.resolve_habit_sleep_range(&serde_json::from_value(json!({"livedDate":"2026-10-31","startTime":start_time,"endTime":end_time,"reportedText":"corrected clock","existingRange":original})).unwrap()).unwrap();
    let saved = app.save_habit_sleep_time(serde_json::from_value(json!({"habitKey":"sleep","livedDate":"2026-10-31","recordId":before.records[0].id,"endpoint":endpoint,"changeId":"clock-correction","targetBinding":before.target_binding,"expectedRevision":before.revision})).unwrap()).unwrap();
    let reopened = app.sleep_records().unwrap();
    let mut expected_start = original["start"].clone();
    expected_start["time"] = json!(start_time);
    let mut expected_end = original["end"].clone();
    expected_end["time"] = json!(end_time);
    assert_eq!(serde_json::to_value(&reopened.records[0].sleep_onset).unwrap(),json!({"kind":"range","start":expected_start,"end":expected_end,"reportedText":"corrected clock"}),"{label}: only the explicitly corrected clock changes");
    assert_eq!(reopened.records[0].id, before.records[0].id);
    assert_eq!(reopened.records[0].night_index, before.records[0].night_index);
    assert_eq!(reopened.records[0].sleep_onset_lived_date.as_deref(), Some("2026-10-31"));
    assert_eq!(reopened.facts[0].lived_date.as_deref(), Some("2026-10-31"));
    assert_eq!(reopened, saved);
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn invalid_known_date_range_clock_corrections_clarify_end_without_adding_a_day() {
    assert_invalid_known_date_range_correction("end", "01:45", "00:30");
}

#[test]
fn invalid_known_date_range_clock_corrections_clarify_start_without_adding_a_day() {
    assert_invalid_known_date_range_correction("start", "02:30", "01:15");
}

fn assert_invalid_known_date_range_correction(label: &str, start_time: &str, end_time: &str) {
    let root = vault(&format!("repeated-hour-invalid-{label}"));
    let app = TodayApplication::new(Selected(root.clone()), NoSelection, TransitionClock);
    let original = json!({"start":{"date":"2026-11-01","time":"01:45","utcOffsetMinutes":-240},"end":{"date":"2026-11-01","time":"01:15","utcOffsetMinutes":-300}});
    let initial = app.sleep_records().unwrap();
    let before = app.save_sleep_record(serde_json::from_value(json!({"wakeDate":"2026-11-01","sleepOnset":{"kind":"range","start":original["start"],"end":original["end"],"reportedText":"original"},"changeId":"seed","targetBinding":initial.target_binding,"expectedRevision":initial.revision})).unwrap()).unwrap();
    let path = root.join("life/.personal-dashboard/sleep/v1/sessions.json");
    let bytes = fs::read(&path).unwrap();
    let result = app.resolve_habit_sleep_range(&serde_json::from_value(json!({"livedDate":"2026-10-31","startTime":start_time,"endTime":end_time,"reportedText":"needs clarification","existingRange":original})).unwrap())
        .and_then(|endpoint| app.save_habit_sleep_time(serde_json::from_value(json!({"habitKey":"sleep","livedDate":"2026-10-31","recordId":before.records[0].id,"endpoint":endpoint,"changeId":"invalid-correction","targetBinding":before.target_binding,"expectedRevision":before.revision})).unwrap()));
    assert!(result.is_err(),"{label}: invalid known-date chronology must not silently become a next-day range");
    assert!(result.unwrap_err().contains("澄清"));
    assert_eq!(fs::read(&path).unwrap(), bytes);
    assert_eq!(app.sleep_records().unwrap(), before);
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn habit_unrecorded_receipt_retries_keep_full_selected_operation_identity() {
    assert_habit_receipt_identity("unrecorded", json!({"kind":"unrecorded"}));
}

#[test]
fn habit_cross_boundary_range_receipt_retries_keep_full_selected_operation_identity() {
    assert_habit_receipt_identity("cross-boundary", json!({"kind":"range","start":{"date":"2026-10-22","time":"03:30","utcOffsetMinutes":-240},"end":{"date":"2026-10-22","time":"04:30","utcOffsetMinutes":-240},"reportedText":"known crossing range"}));
}

fn assert_habit_receipt_identity(label: &str, endpoint: serde_json::Value) {
    let mut acknowledged_conflicts = Vec::new();
    for explicit_record in [false, true] {
        let root = vault(&format!("receipt-{label}-{explicit_record}"));
        let app = application(&root);
        let before = if explicit_record {
            // The stable night identity is deliberately independent of the selected lived day.
            save(&app, json!({"wakeDate":"2026-10-24","sleepOnset":{"kind":"unknown"},"changeId":"seed"}))
        } else { app.sleep_records().unwrap() };
        let mut request = json!({"habitKey":"sleep","livedDate":"2026-10-21","endpoint":endpoint,"changeId":"habit-operation","targetBinding":before.target_binding,"expectedRevision":before.revision});
        if explicit_record { request["recordId"] = json!(before.records[0].id); }
        let saved = app.save_habit_sleep_time(serde_json::from_value(request.clone()).unwrap()).unwrap();
        let path = root.join("life/.personal-dashboard/sleep/v1/sessions.json");
        let bytes = fs::read(&path).unwrap();
        assert_eq!(app.save_habit_sleep_time(serde_json::from_value(request.clone()).unwrap()).unwrap(), saved);
        assert_eq!(fs::read(&path).unwrap(), bytes, "exact delivery is read-only");
        let mut mismatches = Vec::new();
        let mut changed = request.clone(); changed["livedDate"] = json!("2026-10-22"); mismatches.push(("date", changed));
        let mut changed = request.clone(); changed["habitKey"] = json!("wake"); mismatches.push(("key", changed));
        let mut changed = request.clone();
        if explicit_record { changed.as_object_mut().unwrap().remove("recordId"); }
        else { changed["recordId"] = json!(saved.records[0].id); }
        mismatches.push(("record intent", changed));
        let mut changed = request.clone(); changed["recordId"] = json!("another-record"); mismatches.push(("record identity", changed));
        let mut changed = request.clone(); changed["targetBinding"] = json!("other-vault"); mismatches.push(("binding", changed));
        let mut changed = request.clone(); changed["expectedRevision"] = json!("different-revision"); mismatches.push(("revision", changed));
        let mut changed = request.clone(); changed["endpoint"] = json!({"kind":"unknown"}); mismatches.push(("endpoint", changed));
        for (field, changed) in mismatches {
            if app.save_habit_sleep_time(serde_json::from_value(changed).unwrap()).is_ok() {
                acknowledged_conflicts.push(format!("{label}, explicit={explicit_record}: {field}"));
            }
            assert_eq!(fs::read(&path).unwrap(), bytes, "{field}: no write after conflicting retry");
            assert_eq!(app.sleep_records().unwrap(), saved);
        }
        fs::remove_dir_all(root).unwrap();
    }
    assert!(acknowledged_conflicts.is_empty(), "conflicting Habit requests acknowledged as old receipts: {acknowledged_conflicts:?}");
}

#[test]
fn legacy_sleep_receipts_remain_readable_and_directly_replayable_without_guessing_habit_context() {
    for endpoint in [json!({"kind":"unrecorded"}), json!({"kind":"range","start":{"date":"2026-10-22","time":"03:30","utcOffsetMinutes":-240},"end":{"date":"2026-10-22","time":"04:30","utcOffsetMinutes":-240},"reportedText":"legacy crossing range"})] {
        let root = vault("legacy-receipt-identity");
        let app = application(&root);
        let before = app.sleep_records().unwrap();
        let request = json!({"habitKey":"sleep","livedDate":"2026-10-21","endpoint":endpoint,"changeId":"legacy-habit-operation","targetBinding":before.target_binding,"expectedRevision":before.revision});
        app.save_habit_sleep_time(serde_json::from_value(request.clone()).unwrap()).unwrap();
        let path = root.join("life/.personal-dashboard/sleep/v1/sessions.json");
        let mut legacy: serde_json::Value = serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
        for operation in legacy["operations"].as_array_mut().unwrap() { operation.as_object_mut().unwrap().remove("habitRequest"); }
        let generic_request = legacy["operations"][0]["input"].clone();
        let bytes = serde_json::to_vec(&legacy).unwrap();
        fs::write(&path, &bytes).unwrap();
        let read = app.sleep_records().unwrap();
        assert_eq!(fs::read(&path).unwrap(), bytes, "legacy reads never migrate the receipt");
        let result = app.save_habit_sleep_time(serde_json::from_value(request).unwrap());
        assert!(result.is_err(), "missing original Habit request identity cannot prove this wrapper retry");
        assert!(result.unwrap_err().contains("changeId"));
        assert_eq!(fs::read(&path).unwrap(), bytes);
        assert_eq!(app.save_sleep_record(serde_json::from_value(generic_request).unwrap()).unwrap(), read, "the complete generic request still proves its legitimate retry");
        assert_eq!(fs::read(&path).unwrap(), bytes);
        fs::remove_dir_all(root).unwrap();
    }
}

#[test]
fn cross_zone_range_with_reversed_local_coordinates_stays_visible_on_both_endpoint_lived_days() {
    let root = vault("cross-zone-reversed-range");
    let app = application(&root);
    // 2026-03-01 09:30Z through 13:00Z is chronological despite reversed local clocks.
    let endpoint = json!({"kind":"range","start":{"date":"2026-03-01","time":"23:30","utcOffsetMinutes":840,"approximate":true},"end":{"date":"2026-03-01","time":"01:00","utcOffsetMinutes":-720,"approximate":false},"reportedText":"Explicit cross-zone range"});
    let saved = save(&app, json!({"wakeDate":"2026-03-03","changeId":"cross-zone-range","sleepOnset":endpoint}));
    let id = saved.records[0].id.clone();
    assert_eq!(saved.records[0].night_index, "2026-03-03");
    assert_eq!(saved.records[0].estimated_duration_minutes, None);
    assert_eq!(saved.facts.len(), 1);
    assert!(saved.facts[0].lived_date.is_none(), "a crossing range has no guessed single lived day");
    assert_eq!(serde_json::to_value(&saved.facts[0].endpoint).unwrap(), endpoint);
    assert_eq!(application(&root).sleep_records().unwrap(), saved);
    let path = root.join("life/.personal-dashboard/sleep/v1/sessions.json");
    let bytes = fs::read(&path).unwrap();
    let mut observed = Vec::new();
    for date in ["2026-02-28", "2026-03-01"] {
        let view = app.read_date(date).unwrap();
        let facts = view.time_axis.unlocated_confirmed_facts.iter()
            .filter(|entry| entry.sleep_fact.is_some()).collect::<Vec<_>>();
        observed.push((date, facts.len()));
        for entry in facts {
            let fact = entry.sleep_fact.as_ref().unwrap();
            assert_eq!(fact.record_id, id);
            assert!(fact.lived_date.is_none());
            assert_eq!(serde_json::to_value(&fact.endpoint).unwrap(), endpoint);
            assert_eq!(entry.source_date, "2026-03-01");
            assert_eq!(entry.text, "Explicit cross-zone range");
            assert!(entry.start_minute.is_none() && entry.end_minute.is_none());
        }
        assert!(view.time_axis.confirmed_facts.iter().all(|entry| entry.sleep_fact.is_none()));
    }
    for date in ["2026-02-27", "2026-03-02", "2026-03-03"] {
        let view = app.read_date(date).unwrap();
        assert!(view.time_axis.confirmed_facts.iter().chain(&view.time_axis.unlocated_confirmed_facts)
            .all(|entry| entry.sleep_fact.is_none()), "unrelated day or night index is not placement evidence: {date}");
    }
    assert_eq!(fs::read(&path).unwrap(), bytes, "Today reads never rewrite canonical provenance");
    assert_eq!(application(&root).sleep_records().unwrap(), saved);
    assert!(fs::read_dir(root.join("life/Journal/Daily")).unwrap().next().is_none());
    assert!(!root.join("life/.personal-dashboard/habit-completions/v1/completions.json").exists());
    fs::remove_dir_all(root).unwrap();
    assert_eq!(observed, [("2026-02-28", 1), ("2026-03-01", 1)], "one canonical unlocated range must remain visible on both endpoint lived days");
}

#[test]
fn range_wording_is_bounded_at_both_save_entries_without_truncation() {
    let mixed = format!(" {}{} ", "睡".repeat(998), "🌙".repeat(500));
    for (label, wording, accepted) in [
        ("ascii-limit", "a".repeat(2000), true),
        ("ascii-over", "a".repeat(2001), false),
        ("cjk-limit", "睡".repeat(2000), true),
        ("cjk-over", "睡".repeat(2001), false),
        ("emoji-limit", "🌙".repeat(1000), true),
        ("emoji-over", "🌙".repeat(1001), false),
        ("mixed-limit", mixed.clone(), true),
        ("mixed-over", format!("{mixed}a"), false),
        ("blank", " \t　 ".into(), false),
    ] {
        for (action, habit, field) in [
            ("save", "sleep", "sleepOnset"),
            ("save", "wake", "getUp"),
            ("saveHabitTime", "sleep", "sleepOnset"),
            ("saveHabitTime", "wake", "getUp"),
        ] {
            let root = vault(&format!("range-{label}-{action}-{habit}"));
            let app = application(&root);
            let baseline = save(
                &app,
                json!({"wakeDate":"2026-10-22", "getUp":{"kind":"unknown"}, "changeId":"baseline"}),
            );
            let path = root.join("life/.personal-dashboard/sleep/v1/sessions.json");
            let before = fs::read(&path).unwrap();
            let endpoint = json!({"kind":"range", "start":{"date":"2026-10-21","time":"21:00","utcOffsetMinutes":-240,"approximate":false}, "end":{"date":"2026-10-21","time":"22:00","utcOffsetMinutes":-240,"approximate":false}, "reportedText":wording});
            let mut input = json!({"recordId":baseline.records[0].id,"changeId":"range-wording","targetBinding":baseline.target_binding,"expectedRevision":baseline.revision});
            let result = if action == "save" {
                input["wakeDate"] = json!("2026-10-22");
                input[field] = endpoint.clone();
                app.save_sleep_record(serde_json::from_value(input).unwrap())
            } else {
                input["habitKey"] = json!(habit);
                input["livedDate"] = json!("2026-10-21");
                input["endpoint"] = endpoint.clone();
                app.save_habit_sleep_time(serde_json::from_value(input).unwrap())
            };
            let case = format!("{label}/{action}/{habit}");
            if accepted {
                let saved = result.unwrap_or_else(|error| panic!("{case}: {error}"));
                let reopened = application(&root).sleep_records().unwrap();
                assert_eq!(saved, reopened, "{case}: reopen");
                assert_eq!(reopened.records.len(), 1, "{case}");
                assert_eq!(reopened.records[0].id, baseline.records[0].id, "{case}");
                assert_eq!(
                    serde_json::to_value(&reopened.records[0]).unwrap()[field],
                    endpoint,
                    "{case}: exact wording and endpoints"
                );
                assert_eq!(
                    reopened.records[0].estimated_duration_minutes, None,
                    "{case}"
                );
                if habit == "sleep" {
                    assert_eq!(
                        reopened.records[0].get_up, baseline.records[0].get_up,
                        "{case}"
                    );
                } else {
                    assert_eq!(
                        reopened.records[0].sleep_onset, baseline.records[0].sleep_onset,
                        "{case}"
                    );
                }
            } else {
                assert_eq!(
                    result.expect_err(&case),
                    "时间范围需要可靠且有序的上下界与原文。",
                    "{case}"
                );
                assert_eq!(
                    application(&root).sleep_records().unwrap(),
                    baseline,
                    "{case}"
                );
                assert_eq!(fs::read(&path).unwrap(), before, "{case}: rejected write");
            }
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
    }
}

#[test]
fn oversized_legacy_range_stays_readable_and_can_be_corrected() {
    let root = vault("legacy-range-wording");
    let app = application(&root);
    let seed = save(
        &app,
        json!({"wakeDate":"2026-10-22","changeId":"seed","sleepOnset":{"kind":"range","start":{"date":"2026-10-21","time":"21:00","utcOffsetMinutes":-240},"end":{"date":"2026-10-21","time":"22:00","utcOffsetMinutes":-240},"reportedText":"original"}}),
    );
    let path = root.join("life/.personal-dashboard/sleep/v1/sessions.json");
    // A valid document produced before range wording was bounded.
    let mut legacy: serde_json::Value = serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
    let long_wording = "🌙".repeat(1001);
    legacy["records"][0]["sleepOnset"]["reportedText"] = json!(long_wording);
    fs::write(&path, serde_json::to_vec(&legacy).unwrap()).unwrap();
    let before = fs::read(&path).unwrap();
    let read = application(&root).sleep_records().unwrap();
    assert_eq!(read.records[0].id, seed.records[0].id);
    assert_eq!(
        serde_json::to_value(&read.records[0]).unwrap()["sleepOnset"]["reportedText"],
        long_wording
    );
    assert_eq!(
        fs::read(&path).unwrap(),
        before,
        "read must not migrate wording"
    );
    let supplemented = save(
        &app,
        json!({"recordId":read.records[0].id,"wakeDate":"2026-10-22","changeId":"other-endpoint","getUp":{"kind":"unknown"}}),
    );
    assert_eq!(
        supplemented.records[0].sleep_onset,
        read.records[0].sleep_onset
    );
    assert_eq!(application(&root).sleep_records().unwrap(), supplemented);
    let before_rejection = fs::read(&path).unwrap();
    let rejected = app.save_habit_sleep_time(serde_json::from_value(json!({"habitKey":"sleep","livedDate":"2026-10-21","recordId":read.records[0].id,"endpoint":legacy["records"][0]["sleepOnset"],"changeId":"new-long-input","targetBinding":supplemented.target_binding,"expectedRevision":supplemented.revision})).unwrap());
    assert_eq!(
        rejected.unwrap_err(),
        "时间范围需要可靠且有序的上下界与原文。"
    );
    assert_eq!(fs::read(&path).unwrap(), before_rejection);
    legacy["records"][0]["sleepOnset"]["reportedText"] = json!("corrected");
    let corrected = app.save_habit_sleep_time(serde_json::from_value(json!({"habitKey":"sleep","livedDate":"2026-10-21","recordId":read.records[0].id,"endpoint":legacy["records"][0]["sleepOnset"],"changeId":"short-correction","targetBinding":supplemented.target_binding,"expectedRevision":supplemented.revision})).unwrap()).unwrap();
    assert_eq!(corrected.records[0].id, read.records[0].id);
    assert_eq!(
        serde_json::to_value(&corrected.records[0]).unwrap()["sleepOnset"]["reportedText"],
        "corrected"
    );
    assert_eq!(application(&root).sleep_records().unwrap(), corrected);
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn sleep_tool_advertises_wording_bounds_for_both_save_actions() {
    let schema = personal_dashboard_lib::sleep::tool_spec("Synthetic tool");
    let save = &schema["inputSchema"]["oneOf"][1]["properties"]["input"]["properties"];
    let habit = &schema["inputSchema"]["oneOf"][2]["properties"]["input"]["properties"];
    for endpoint in [&save["sleepOnset"], &save["getUp"], &habit["endpoint"]] {
        for (kind, field) in [("range", "reportedText"), ("text", "text")] {
            let variant = endpoint["oneOf"]
                .as_array()
                .unwrap()
                .iter()
                .find(|value| value["properties"]["kind"]["const"] == kind)
                .unwrap();
            let wording = &variant["properties"][field];
            assert_eq!(wording["minLength"], 1, "{kind}/{field}");
            assert_eq!(wording["maxLength"], 2000, "{kind}/{field}");
            assert!(wording["description"].as_str().unwrap().contains("UTF-16"));
        }
    }
}
