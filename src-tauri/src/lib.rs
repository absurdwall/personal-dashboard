use serde::Serialize;
use tauri::{Manager, State};
#[cfg(target_os = "macos")]
use tauri::{RunEvent, WindowEvent};

pub mod backup;
mod clock;
pub mod exercise;
pub mod habits;
pub mod migration;
pub mod move_profile;
pub mod notification;
#[cfg(target_os = "macos")]
mod notification_platform;
mod platform;
pub mod profile;
pub mod today;

use backup::{
    ProfileBackupAction, ProfileBackupApplication, ProfileRestoreAction, ProfileRestoreSelection,
};
use clock::SystemClock;
use exercise::{ExerciseApplication, ExerciseDashboardView};
use migration::{BaselineMigrationApplication, BaselineMigrationView};
use move_profile::{
    ProfileExerciseAuthority, ProfileMoveAction, ProfileMoveApplication, ProfileMoveSelection,
    ProfileNotificationCancellationJournal,
};
#[cfg(target_os = "macos")]
use notification::{NotificationApplication, NotificationCapabilityView};
#[cfg(target_os = "macos")]
use notification_platform::NativeNotificationPlatform;
use platform::{
    baseline_file_for, exercise_file_for, profile_file_for, today_workspace_file_for,
    FileBaselinePersistence, FileExercisePersistence, FileProfilePersistence,
    FileProfileReplacement, FileTodayWorkspacePersistence, NativeFileExchange,
    NativeTodayWorkspaceExchange,
};
use profile::{ProfileApplication, ProfileView};
use today::{
    CalendarMonthView, DatedNoteCorrectionInput, DatedNoteInput, DaytimeUpdateInput,
    EveningUpdateInput, HabitSnapshotView, TodayApplication, TodayView,
};

type DesktopProfileApplication =
    ProfileApplication<FileProfilePersistence, NativeFileExchange<tauri::Wry>>;
type DesktopTodayApplication = TodayApplication<
    FileTodayWorkspacePersistence,
    NativeTodayWorkspaceExchange<tauri::Wry>,
    SystemClock,
>;
#[cfg(target_os = "macos")]
type DesktopNotificationApplication =
    NotificationApplication<NativeNotificationPlatform, SystemClock>;
#[cfg(target_os = "macos")]
type DesktopExerciseApplication = ExerciseApplication<
    FileExercisePersistence,
    NativeNotificationPlatform,
    SystemClock,
    ProfileExerciseAuthority<FileProfilePersistence>,
    ProfileNotificationCancellationJournal<FileProfilePersistence>,
>;
#[cfg(target_os = "macos")]
type DesktopProfileBackupApplication = ProfileBackupApplication<
    FileProfilePersistence,
    FileExercisePersistence,
    NativeFileExchange<tauri::Wry>,
    NativeNotificationPlatform,
    SystemClock,
    FileProfileReplacement,
>;
#[cfg(target_os = "macos")]
type DesktopProfileMoveApplication = ProfileMoveApplication<
    FileProfilePersistence,
    FileExercisePersistence,
    NativeFileExchange<tauri::Wry>,
    NativeNotificationPlatform,
    SystemClock,
    FileProfileReplacement,
>;

#[cfg(not(target_os = "macos"))]
#[derive(Clone, Copy)]
struct UnavailableNotificationPlatform;

#[cfg(not(target_os = "macos"))]
impl notification::NotificationPlatform for UnavailableNotificationPlatform {
    fn permission(&self) -> Result<notification::NotificationPermission, String> {
        Ok(notification::NotificationPermission::Denied)
    }

    fn request_permission(&self) -> Result<notification::NotificationPermission, String> {
        Ok(notification::NotificationPermission::Denied)
    }

    fn schedule(&self, _intent: notification::NotificationIntent) -> Result<(), String> {
        Err("Native exercise reminders are not enabled on this platform yet.".into())
    }

    fn cancel(&self, _id: &str) -> Result<(), String> {
        Ok(())
    }
}

#[cfg(not(target_os = "macos"))]
type DesktopExerciseApplication = ExerciseApplication<
    FileExercisePersistence,
    UnavailableNotificationPlatform,
    SystemClock,
    ProfileExerciseAuthority<FileProfilePersistence>,
    ProfileNotificationCancellationJournal<FileProfilePersistence>,
>;
#[cfg(not(target_os = "macos"))]
type DesktopProfileBackupApplication = ProfileBackupApplication<
    FileProfilePersistence,
    FileExercisePersistence,
    NativeFileExchange<tauri::Wry>,
    UnavailableNotificationPlatform,
    SystemClock,
    FileProfileReplacement,
>;
#[cfg(not(target_os = "macos"))]
type DesktopProfileMoveApplication = ProfileMoveApplication<
    FileProfilePersistence,
    FileExercisePersistence,
    NativeFileExchange<tauri::Wry>,
    UnavailableNotificationPlatform,
    SystemClock,
    FileProfileReplacement,
>;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ApplicationIdentity {
    product_name: &'static str,
    feature_area: &'static str,
    boundary_message: &'static str,
}

#[tauri::command]
fn application_identity() -> ApplicationIdentity {
    ApplicationIdentity {
        product_name: "Personal Dashboard",
        feature_area: "Exercise tracking",
        boundary_message: "Local Rust application ready · Offline",
    }
}

#[tauri::command]
fn today_view(application: State<'_, DesktopTodayApplication>) -> Result<TodayView, String> {
    application.open()
}

#[tauri::command]
fn daily_view(
    application: State<'_, DesktopTodayApplication>,
    date: String,
) -> Result<TodayView, String> {
    application.open_date(&date)
}

#[tauri::command]
fn calendar_month(
    application: State<'_, DesktopTodayApplication>,
    year: i32,
    month: u32,
) -> Result<CalendarMonthView, String> {
    application.calendar_month(year, month)
}

#[tauri::command]
fn habit_snapshot(
    application: State<'_, DesktopTodayApplication>,
) -> Result<HabitSnapshotView, String> {
    application.habits()
}

#[tauri::command]
async fn select_today_vault(
    application: State<'_, DesktopTodayApplication>,
) -> Result<TodayView, String> {
    application.select_vault()
}

#[tauri::command]
fn append_daytime_update(
    application: State<'_, DesktopTodayApplication>,
    input: DaytimeUpdateInput,
) -> Result<TodayView, String> {
    application.append_daytime_update(input)
}

#[tauri::command]
fn add_dated_note(
    application: State<'_, DesktopTodayApplication>,
    input: DatedNoteInput,
) -> Result<TodayView, String> {
    application.add_dated_note(input)
}

#[tauri::command]
fn correct_dated_note(
    application: State<'_, DesktopTodayApplication>,
    input: DatedNoteCorrectionInput,
) -> Result<TodayView, String> {
    application.correct_dated_note(input)
}

#[tauri::command]
fn update_evening_review(
    application: State<'_, DesktopTodayApplication>,
    input: EveningUpdateInput,
) -> Result<TodayView, String> {
    application.update_evening_review(input)
}

#[tauri::command]
fn baseline_migration_state(migration: State<'_, BaselineMigrationView>) -> BaselineMigrationView {
    migration.inner().clone()
}

#[tauri::command]
fn profile_state(application: State<'_, DesktopProfileApplication>) -> Result<ProfileView, String> {
    application.open()
}

#[tauri::command]
fn update_profile_label(
    application: State<'_, DesktopProfileApplication>,
    profile_label: String,
) -> Result<ProfileView, String> {
    application.update_profile_label(profile_label)
}

#[tauri::command]
async fn backup_profile(
    application: State<'_, DesktopProfileBackupApplication>,
) -> Result<ProfileBackupAction, String> {
    application.backup_profile()
}

#[tauri::command]
async fn select_profile_restore(
    application: State<'_, DesktopProfileBackupApplication>,
) -> Result<ProfileRestoreSelection, String> {
    application.select_profile_restore()
}

#[tauri::command]
fn cancel_profile_restore(
    application: State<'_, DesktopProfileBackupApplication>,
) -> Result<ProfileRestoreSelection, String> {
    application.cancel_profile_restore()
}

#[tauri::command]
fn confirm_profile_restore(
    application: State<'_, DesktopProfileBackupApplication>,
) -> Result<ProfileRestoreAction, String> {
    application.confirm_profile_restore()
}

#[tauri::command]
async fn move_profile(
    application: State<'_, DesktopProfileMoveApplication>,
) -> Result<ProfileMoveAction, String> {
    application.move_profile()
}

#[tauri::command]
async fn select_profile_move_import(
    application: State<'_, DesktopProfileMoveApplication>,
) -> Result<ProfileMoveSelection, String> {
    application.select_profile_move_import()
}

#[tauri::command]
fn cancel_profile_move_import(
    application: State<'_, DesktopProfileMoveApplication>,
) -> Result<ProfileMoveSelection, String> {
    application.cancel_profile_move_import()
}

#[tauri::command]
fn confirm_profile_move_import(
    application: State<'_, DesktopProfileMoveApplication>,
) -> Result<ProfileMoveAction, String> {
    application.confirm_profile_move_import()
}

#[tauri::command]
fn reactivate_profile(
    application: State<'_, DesktopProfileMoveApplication>,
) -> Result<ProfileMoveAction, String> {
    application.reactivate_profile()
}

#[tauri::command]
fn exercise_dashboard(
    application: State<'_, DesktopExerciseApplication>,
) -> Result<ExerciseDashboardView, String> {
    application.open()
}

#[tauri::command]
fn adjust_current_week_departure(
    application: State<'_, DesktopExerciseApplication>,
    slot_id: String,
    day: String,
    departure_time: String,
) -> Result<ExerciseDashboardView, String> {
    application.adjust_current_week_departure(&slot_id, &day, &departure_time)
}

#[tauri::command]
fn preview_current_week_departure_change(
    application: State<'_, DesktopExerciseApplication>,
    slot_id: String,
    day: String,
    departure_time: String,
) -> Result<exercise::DepartureChangePreviewView, String> {
    application.preview_current_week_departure_change(&slot_id, &day, &departure_time)
}

#[tauri::command]
fn change_current_week_departure(
    application: State<'_, DesktopExerciseApplication>,
    slot_id: String,
    day: String,
    departure_time: String,
    confirm_conflict: bool,
) -> Result<ExerciseDashboardView, String> {
    application.change_current_week_departure(&slot_id, &day, &departure_time, confirm_conflict)
}

#[tauri::command]
fn skip_current_week_departure(
    application: State<'_, DesktopExerciseApplication>,
    slot_id: String,
) -> Result<ExerciseDashboardView, String> {
    application.skip_current_week_departure(&slot_id)
}

#[tauri::command]
fn undo_skip_current_week_departure(
    application: State<'_, DesktopExerciseApplication>,
    slot_id: String,
) -> Result<ExerciseDashboardView, String> {
    application.undo_skip_current_week_departure(&slot_id)
}

#[tauri::command]
fn change_repeating_primary_departure(
    application: State<'_, DesktopExerciseApplication>,
    order: u32,
    day: String,
    departure_time: String,
) -> Result<ExerciseDashboardView, String> {
    application.change_repeating_primary_departure(order, &day, &departure_time)
}

#[tauri::command]
fn respond_to_departure(
    application: State<'_, DesktopExerciseApplication>,
    slot_id: String,
    action: String,
) -> Result<ExerciseDashboardView, String> {
    application.respond_to_departure(&slot_id, &action)
}

#[tauri::command]
fn start_departure_decision(
    application: State<'_, DesktopExerciseApplication>,
    slot_id: String,
    outcome: String,
) -> Result<ExerciseDashboardView, String> {
    application.start_departure_decision(&slot_id, &outcome)
}

#[tauri::command]
fn confirm_departure_decision(
    application: State<'_, DesktopExerciseApplication>,
    slot_id: String,
    outcome: String,
    reason: String,
) -> Result<ExerciseDashboardView, String> {
    application.confirm_departure_decision(&slot_id, &outcome, &reason)
}

#[tauri::command]
fn start_workout_record(
    application: State<'_, DesktopExerciseApplication>,
    slot_id: String,
) -> Result<ExerciseDashboardView, String> {
    application.start_workout_record(&slot_id)
}

#[tauri::command]
fn start_unscheduled_workout_record(
    application: State<'_, DesktopExerciseApplication>,
) -> Result<ExerciseDashboardView, String> {
    application.start_unscheduled_workout_record()
}

#[tauri::command]
fn choose_workout_activity(
    application: State<'_, DesktopExerciseApplication>,
    slot_id: String,
    activity: String,
) -> Result<ExerciseDashboardView, String> {
    application.choose_workout_activity(&slot_id, &activity)
}

#[tauri::command]
fn choose_workout_duration(
    application: State<'_, DesktopExerciseApplication>,
    slot_id: String,
    duration: String,
) -> Result<ExerciseDashboardView, String> {
    application.choose_workout_duration(&slot_id, &duration)
}

#[tauri::command]
fn complete_workout_record(
    application: State<'_, DesktopExerciseApplication>,
    slot_id: String,
    effort: String,
) -> Result<ExerciseDashboardView, String> {
    application.complete_workout_record(&slot_id, &effort)
}

#[tauri::command]
fn correct_workout_record(
    application: State<'_, DesktopExerciseApplication>,
    record_id: String,
    activity: String,
    duration: String,
    effort: String,
) -> Result<ExerciseDashboardView, String> {
    application.correct_workout_record(&record_id, &activity, &duration, &effort)
}

#[tauri::command]
fn confirm_workout_record_deletion(
    application: State<'_, DesktopExerciseApplication>,
    record_id: String,
) -> Result<ExerciseDashboardView, String> {
    application.confirm_workout_record_deletion(&record_id)
}

#[tauri::command]
#[cfg(target_os = "macos")]
fn notification_state(
    application: State<'_, DesktopNotificationApplication>,
) -> Result<NotificationCapabilityView, String> {
    application.state()
}

#[tauri::command]
#[cfg(target_os = "macos")]
async fn request_notification_permission(
    application: State<'_, DesktopNotificationApplication>,
) -> Result<NotificationCapabilityView, String> {
    application.request_permission()
}

#[tauri::command]
#[cfg(target_os = "macos")]
fn schedule_capability_notification(
    application: State<'_, DesktopNotificationApplication>,
) -> Result<NotificationCapabilityView, String> {
    application.schedule_capability()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let application = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            let profile_file = profile_file_for(&app_handle)?;
            let exercise_file = exercise_file_for(&app_handle)?;
            let baseline_file = baseline_file_for(&app_handle)?;
            let today_workspace_file = today_workspace_file_for(&app_handle)?;
            let profile_replacement =
                FileProfileReplacement::new(profile_file.clone(), exercise_file.clone())?;
            let profile_persistence = FileProfilePersistence::new(profile_file);
            let exercise_persistence = FileExercisePersistence::new(exercise_file);
            let migration = BaselineMigrationApplication::new(
                FileBaselinePersistence::new(baseline_file),
                profile_persistence.clone(),
                exercise_persistence.clone(),
                profile_replacement.clone(),
                SystemClock,
            )
            .launch();
            app.manage(migration);
            app.manage(ProfileApplication::new(
                profile_persistence.clone(),
                NativeFileExchange::new(app_handle.clone()),
            ));
            app.manage(TodayApplication::new(
                FileTodayWorkspacePersistence::new(today_workspace_file),
                NativeTodayWorkspaceExchange::new(app_handle.clone()),
                SystemClock,
            ));
            #[cfg(target_os = "macos")]
            app.manage(ExerciseApplication::with_authority(
                exercise_persistence.clone(),
                NativeNotificationPlatform::new(),
                SystemClock,
                ProfileExerciseAuthority::new(profile_persistence.clone()),
                ProfileNotificationCancellationJournal::new(profile_persistence.clone()),
            ));
            #[cfg(not(target_os = "macos"))]
            app.manage(ExerciseApplication::with_authority(
                exercise_persistence.clone(),
                UnavailableNotificationPlatform,
                SystemClock,
                ProfileExerciseAuthority::new(profile_persistence.clone()),
                ProfileNotificationCancellationJournal::new(profile_persistence.clone()),
            ));
            #[cfg(target_os = "macos")]
            app.manage(ProfileBackupApplication::new(
                profile_persistence.clone(),
                exercise_persistence.clone(),
                NativeFileExchange::new(app_handle.clone()),
                NativeNotificationPlatform::new(),
                SystemClock,
                profile_replacement.clone(),
            ));
            #[cfg(target_os = "macos")]
            app.manage(ProfileMoveApplication::new(
                profile_persistence.clone(),
                exercise_persistence.clone(),
                NativeFileExchange::new(app_handle.clone()),
                NativeNotificationPlatform::new(),
                SystemClock,
                profile_replacement.clone(),
            ));
            #[cfg(not(target_os = "macos"))]
            app.manage(ProfileMoveApplication::new(
                profile_persistence.clone(),
                exercise_persistence.clone(),
                NativeFileExchange::new(app_handle.clone()),
                UnavailableNotificationPlatform,
                SystemClock,
                profile_replacement.clone(),
            ));
            #[cfg(not(target_os = "macos"))]
            app.manage(ProfileBackupApplication::new(
                profile_persistence.clone(),
                exercise_persistence.clone(),
                NativeFileExchange::new(app_handle.clone()),
                UnavailableNotificationPlatform,
                SystemClock,
                profile_replacement.clone(),
            ));
            #[cfg(target_os = "macos")]
            app.manage(NotificationApplication::new(
                NativeNotificationPlatform::new(),
                SystemClock,
            ));
            Ok(())
        });

    #[cfg(target_os = "macos")]
    let application = application
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            application_identity,
            today_view,
            daily_view,
            calendar_month,
            habit_snapshot,
            select_today_vault,
            append_daytime_update,
            add_dated_note,
            correct_dated_note,
            update_evening_review,
            baseline_migration_state,
            profile_state,
            update_profile_label,
            backup_profile,
            select_profile_restore,
            cancel_profile_restore,
            confirm_profile_restore,
            move_profile,
            select_profile_move_import,
            cancel_profile_move_import,
            confirm_profile_move_import,
            reactivate_profile,
            exercise_dashboard,
            adjust_current_week_departure,
            preview_current_week_departure_change,
            change_current_week_departure,
            skip_current_week_departure,
            undo_skip_current_week_departure,
            change_repeating_primary_departure,
            respond_to_departure,
            start_departure_decision,
            confirm_departure_decision,
            start_workout_record,
            start_unscheduled_workout_record,
            choose_workout_activity,
            choose_workout_duration,
            complete_workout_record,
            correct_workout_record,
            confirm_workout_record_deletion,
            notification_state,
            request_notification_permission,
            schedule_capability_notification
        ]);

    #[cfg(not(target_os = "macos"))]
    let application = application.invoke_handler(tauri::generate_handler![
        application_identity,
        today_view,
        daily_view,
        calendar_month,
        habit_snapshot,
        select_today_vault,
        append_daytime_update,
        add_dated_note,
        correct_dated_note,
        update_evening_review,
        baseline_migration_state,
        profile_state,
        update_profile_label,
        backup_profile,
        select_profile_restore,
        cancel_profile_restore,
        confirm_profile_restore,
        move_profile,
        select_profile_move_import,
        cancel_profile_move_import,
        confirm_profile_move_import,
        reactivate_profile,
        exercise_dashboard,
        adjust_current_week_departure,
        preview_current_week_departure_change,
        change_current_week_departure,
        skip_current_week_departure,
        undo_skip_current_week_departure,
        change_repeating_primary_departure,
        respond_to_departure,
        start_departure_decision,
        confirm_departure_decision,
        start_workout_record,
        start_unscheduled_workout_record,
        choose_workout_activity,
        choose_workout_duration,
        complete_workout_record,
        correct_workout_record,
        confirm_workout_record_deletion
    ]);

    let application = application
        .build(tauri::generate_context!())
        .expect("failed to build Personal Dashboard");

    #[cfg(target_os = "macos")]
    application.run(|app_handle, event| {
        if let RunEvent::Reopen {
            has_visible_windows: false,
            ..
        } = event
        {
            if let Some(window) = app_handle.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
    });

    #[cfg(not(target_os = "macos"))]
    application.run(|_, _| {});
}
