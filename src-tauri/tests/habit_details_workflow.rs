use personal_dashboard_lib::habits::FileHabitSnapshotStore;
use personal_dashboard_lib::today::{
    FileDayTaskStore, FileHabitCompletionStore, FileTodayRecordStore, HabitCompletionMutationInput,
    HabitCompletionStore, HabitLocalCompletionState, TodayApplication, TodayClock,
    TodayWorkspaceExchange, TodayWorkspacePersistence,
};
use std::cell::Cell;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

struct TempVault(PathBuf);

impl TempVault {
    fn new(label: &str) -> Self {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "personal-dashboard-habit-completion-{label}-{}-{nonce}",
            std::process::id()
        ));
        fs::create_dir_all(path.join(".obsidian")).unwrap();
        fs::create_dir_all(path.join("life/Journal/Daily")).unwrap();
        Self(path)
    }

    fn path(&self) -> &Path {
        &self.0
    }
}

impl Drop for TempVault {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

#[derive(Clone)]
struct SelectedVault(PathBuf);

impl TodayWorkspacePersistence for SelectedVault {
    fn load_selected_vault(&self) -> Result<Option<PathBuf>, String> {
        Ok(Some(self.0.clone()))
    }

    fn save_selected_vault(&self, _vault: &Path) -> Result<(), String> {
        Ok(())
    }
}

struct NoSelection;

impl TodayWorkspaceExchange for NoSelection {
    fn select_vault(&self) -> Result<Option<PathBuf>, String> {
        Ok(None)
    }
}

#[derive(Clone, Copy)]
struct FixedClock;

impl TodayClock for FixedClock {
    fn current_date(&self) -> String {
        "2026-09-08".into()
    }

    fn current_time_label(&self) -> String {
        "14:10".into()
    }

    fn current_timestamp_label(&self) -> String {
        "2026-09-08T14:10-04:00".into()
    }
}

#[derive(Clone, Copy)]
struct FollowingMondayClock;

impl TodayClock for FollowingMondayClock {
    fn current_date(&self) -> String {
        "2026-09-14".into()
    }

    fn current_time_label(&self) -> String {
        "08:00".into()
    }

    fn current_timestamp_label(&self) -> String {
        "2026-09-14T08:00-04:00".into()
    }
}

fn app(vault: &Path) -> TodayApplication<SelectedVault, NoSelection, FixedClock> {
    TodayApplication::new(SelectedVault(vault.to_path_buf()), NoSelection, FixedClock)
}

fn snapshot_path(vault: &Path) -> PathBuf {
    vault.join("life/.personal-dashboard/derived/habits-v1.json")
}

fn write_snapshot(vault: &Path, document: &str) {
    let path = snapshot_path(vault);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(path, document).unwrap();
}

use personal_dashboard_lib::habit_catalog::{
    HabitDefinitionMutationInput, HabitGoal, HabitSettings,
};


#[test]
fn full_local_history_beyond_twelve_weeks_counts_distinct_days_and_reopens_without_claiming_missing_days() {
    let vault=TempVault::new("long-detail-history");let application=app(vault.path());
    let opened=application.habits().unwrap();
    application.save_habit_definition(HabitDefinitionMutationInput {habit_key:"local-reading".into(),change_id:"create-history".into(),target_binding:opened.catalog_target_binding.unwrap(),expected_revision:opened.catalog_revision,settings:HabitSettings {name:"Reading".into(),emoji:None,group:None,start_date:"2026-01-01".into(),goal:HabitGoal::DailyCompletion}}).unwrap();
    for (index,date) in ["2026-01-01","2026-05-02","2026-09-07","2026-09-08","2026-09-08"].iter().enumerate() {
        let view=application.habits().unwrap();application.set_local_habit_completion(HabitCompletionMutationInput {habit_key:"local-reading".into(),lived_date:(*date).into(),completed:true,change_id:format!("long-{index}"),target_binding:view.completion_target_binding.unwrap(),expected_revision:view.completion_revision}).unwrap();
    }
    let detail=application.habit_details("local-reading",0,20).unwrap();
    assert_eq!(detail.statistics.total_attained_days,4);assert_eq!(detail.statistics.month_attained_days,2);
    assert!(!detail.statistics.total_exact);assert_eq!(detail.statistics.current_streak,2);assert_eq!(detail.statistics.highest_known_streak,2);
    assert!(!detail.statistics.highest_confirmed);assert!(detail.records.iter().any(|record| record.cell.date=="2026-01-01"));
    let reopened=app(vault.path()).habit_details("local-reading",0,20).unwrap();assert_eq!(reopened.statistics.total_attained_days,4);
    assert_eq!(application.habits().unwrap().habit("local-reading").unwrap().history.len(),84);
}

use personal_dashboard_lib::habit_catalog::HabitLifecycleMutationInput;
#[derive(Clone)]
struct DetailClock(std::rc::Rc<std::cell::RefCell<String>>);
impl TodayClock for DetailClock {fn current_date(&self)->String {self.0.borrow().clone()} fn current_time_label(&self)->String {"14:10".into()} fn current_timestamp_label(&self)->String {format!("{}T14:10-04:00",self.current_date())}}
#[test]
fn deactivate_restore_reopens_same_identity_breaks_streaks_and_keeps_old_completion_and_pending_goals() {
    let vault=TempVault::new("lifecycle");let moment=std::rc::Rc::new(std::cell::RefCell::new("2026-09-01".into()));let clock=DetailClock(moment.clone());
    let application=TodayApplication::new(SelectedVault(vault.path().into()),NoSelection,clock.clone());
    let opened=application.habits().unwrap();application.save_habit_definition(HabitDefinitionMutationInput {habit_key:"local-reading".into(),change_id:"create-life".into(),target_binding:opened.catalog_target_binding.unwrap(),expected_revision:opened.catalog_revision,settings:HabitSettings {name:"Reading".into(),emoji:None,group:None,start_date:"2026-09-01".into(),goal:HabitGoal::DailyCompletion}}).unwrap();
    for date in ["2026-09-01","2026-09-02"] { *moment.borrow_mut()=date.into();let view=application.habits().unwrap();application.set_local_habit_completion(HabitCompletionMutationInput {habit_key:"local-reading".into(),lived_date:date.into(),completed:true,change_id:format!("life-{date}"),target_binding:view.completion_target_binding.unwrap(),expected_revision:view.completion_revision}).unwrap(); }
    *moment.borrow_mut()="2026-09-03".into();let view=application.habits().unwrap();let input=HabitLifecycleMutationInput {habit_key:"local-reading".into(),change_id:"deactivate-life".into(),target_binding:view.catalog_target_binding.unwrap(),expected_revision:view.catalog_revision,active:false};
    let inactive=application.set_habit_active(input.clone()).unwrap();assert!(!inactive.habit("local-reading").unwrap().active);application.set_habit_active(input).unwrap();
    *moment.borrow_mut()="2026-09-08".into();let reopened=TodayApplication::new(SelectedVault(vault.path().into()),NoSelection,clock.clone());let inactive_detail=reopened.habit_details("local-reading",0,20).unwrap();assert_eq!(inactive_detail.statistics.total_attained_days,2);assert_eq!(inactive_detail.statistics.highest_known_streak,2);
    let view=reopened.habits().unwrap();reopened.set_habit_active(HabitLifecycleMutationInput {habit_key:"local-reading".into(),change_id:"restore-life".into(),target_binding:view.catalog_target_binding.unwrap(),expected_revision:view.catalog_revision,active:true}).unwrap();
    let view=reopened.habits().unwrap();reopened.set_local_habit_completion(HabitCompletionMutationInput {habit_key:"local-reading".into(),lived_date:"2026-09-08".into(),completed:true,change_id:"after-restore".into(),target_binding:view.completion_target_binding.unwrap(),expected_revision:view.completion_revision}).unwrap();
    let detail=reopened.habit_details("local-reading",0,20).unwrap();assert_eq!(detail.statistics.total_attained_days,3);assert_eq!(detail.statistics.current_streak,1);assert_eq!(detail.statistics.highest_known_streak,2);assert!(detail.statistics.total_exact);assert_eq!(detail.activity_changes.len(),2);
    let final_read=TodayApplication::new(SelectedVault(vault.path().into()),NoSelection,clock).habit_details("local-reading",0,20).unwrap();assert!(final_read.habit.active);assert_eq!(final_read.activity_changes.len(),2);
}
