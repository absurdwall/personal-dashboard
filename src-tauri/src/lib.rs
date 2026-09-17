use serde::Serialize;
#[cfg(target_os = "macos")]
use std::path::PathBuf;
use tauri::{Manager, State};
#[cfg(target_os = "macos")]
use tauri::{RunEvent, WindowEvent};

pub mod appearance;
pub mod backup;
mod clock;
pub mod cutover;
pub mod exercise;
pub mod habits;
pub mod interface_language;
pub mod migration;
pub mod move_profile;
pub mod notification;
#[cfg(target_os = "macos")]
mod notification_platform;
#[allow(dead_code)] // Retained only for historical regression and cutover parsing boundaries.
mod platform;
pub mod profile;
pub mod tasks;
pub mod today;

use appearance::{
    AccentColor, AppearanceApplication, AppearancePreferences, AppearanceSelectionResult,
};
use clock::SystemClock;
#[cfg(target_os = "macos")]
use cutover::{
    CutoverApplication, CutoverPaths, MacLegacyCutoverRuntime, ReviewedCandidateIdentity,
};
use interface_language::{
    InterfaceLanguage, InterfaceLanguageApplication, InterfaceLanguagePreferences,
};
use platform::{
    appearance_background_directory_for, appearance_file_for, interface_language_file_for,
    legacy_exercise_directory_for, profile_file_for, today_workspace_file_for,
    FileAppearancePersistence, FileInterfaceLanguagePersistence, FileTodayWorkspacePersistence,
    NativeAppearanceImageLibrary, NativeTodayWorkspaceExchange,
};
use tasks::{
    FileTaskStore, TaskApplication, TaskCompletionCorrectionInput, TaskCreateInput,
    TaskDeleteInput, TaskRestoreInput, TaskStateInput, TaskUpdateInput, TasksView,
};
use today::{
    CalendarMonthView, DatedNoteCorrectionInput, DatedNoteInput, DayTaskAddInput,
    DayTaskCompletionInput, DayTaskDeleteInput, DayTaskRenameInput, DaytimeUpdateInput,
    EveningUpdateInput, HabitCompletionMutationInput, HabitSnapshotView,
    PlanningDayTaskContextView, TodayApplication, TodayView, VaultSelectionResult,
};

type DesktopTodayApplication = TodayApplication<
    FileTodayWorkspacePersistence,
    NativeTodayWorkspaceExchange<tauri::Wry>,
    SystemClock,
>;
type DesktopAppearanceApplication =
    AppearanceApplication<FileAppearancePersistence, NativeAppearanceImageLibrary<tauri::Wry>>;
type DesktopInterfaceLanguageApplication =
    InterfaceLanguageApplication<FileInterfaceLanguagePersistence>;
type DesktopTaskApplication = TaskApplication<FileTodayWorkspacePersistence, SystemClock>;

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
        feature_area: "Daily records and habits",
        boundary_message: "Local Rust application ready · Offline",
    }
}

#[tauri::command]
fn appearance_preferences(
    application: State<'_, DesktopAppearanceApplication>,
) -> Result<AppearancePreferences, String> {
    application.load()
}

#[tauri::command]
fn set_accent_color(
    application: State<'_, DesktopAppearanceApplication>,
    accent_color: AccentColor,
) -> Result<AppearancePreferences, String> {
    application.set_accent_color(accent_color)
}

#[tauri::command]
fn restore_appearance_defaults(
    application: State<'_, DesktopAppearanceApplication>,
) -> Result<AppearancePreferences, String> {
    application.restore_defaults()
}

#[tauri::command]
async fn select_background_image(
    application: State<'_, DesktopAppearanceApplication>,
    interface_language: InterfaceLanguage,
) -> Result<AppearanceSelectionResult, String> {
    application.select_background_image(interface_language)
}

#[tauri::command]
fn remove_background_image(
    application: State<'_, DesktopAppearanceApplication>,
) -> Result<AppearancePreferences, String> {
    application.remove_background_image()
}

#[tauri::command]
fn interface_language_preferences(
    application: State<'_, DesktopInterfaceLanguageApplication>,
) -> Result<InterfaceLanguagePreferences, String> {
    application.load()
}

#[tauri::command]
fn set_interface_language(
    application: State<'_, DesktopInterfaceLanguageApplication>,
    interface_language: InterfaceLanguage,
) -> Result<InterfaceLanguagePreferences, String> {
    application.set_language(interface_language)
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
fn read_daily_view(
    application: State<'_, DesktopTodayApplication>,
    date: Option<String>,
) -> Result<TodayView, String> {
    match date {
        Some(date) => application.read_date(&date),
        None => application.read(),
    }
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
fn tasks_view(application: State<'_, DesktopTaskApplication>) -> Result<TasksView, String> {
    application.read()
}

#[tauri::command]
fn create_task(
    application: State<'_, DesktopTaskApplication>,
    input: TaskCreateInput,
) -> Result<TasksView, String> {
    application.create(input)
}

#[tauri::command]
fn update_task(
    application: State<'_, DesktopTaskApplication>,
    input: TaskUpdateInput,
) -> Result<TasksView, String> {
    application.update(input)
}

#[tauri::command]
fn set_task_state(
    application: State<'_, DesktopTaskApplication>,
    input: TaskStateInput,
) -> Result<TasksView, String> {
    application.set_state(input)
}

#[tauri::command]
fn delete_task(
    application: State<'_, DesktopTaskApplication>,
    input: TaskDeleteInput,
) -> Result<TasksView, String> {
    application.delete(input)
}

#[tauri::command]
fn restore_task(
    application: State<'_, DesktopTaskApplication>,
    input: TaskRestoreInput,
) -> Result<TasksView, String> {
    application.restore(input)
}

#[tauri::command]
fn correct_task_completion(
    application: State<'_, DesktopTaskApplication>,
    input: TaskCompletionCorrectionInput,
) -> Result<TasksView, String> {
    application.correct_completion(input)
}

#[tauri::command]
fn set_local_habit_completion(
    application: State<'_, DesktopTodayApplication>,
    input: HabitCompletionMutationInput,
) -> Result<HabitSnapshotView, String> {
    application.set_local_habit_completion(input)
}

#[tauri::command]
fn set_historical_habit_completion(
    application: State<'_, DesktopTodayApplication>,
    input: HabitCompletionMutationInput,
) -> Result<TodayView, String> {
    application.set_historical_habit_completion(input)
}

#[tauri::command]
async fn select_today_vault(
    application: State<'_, DesktopTodayApplication>,
    interface_language: InterfaceLanguage,
) -> Result<VaultSelectionResult, String> {
    application.select_vault_in_language(interface_language)
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
fn add_day_task(
    application: State<'_, DesktopTodayApplication>,
    input: DayTaskAddInput,
) -> Result<TodayView, String> {
    application.add_day_task(input)
}

#[tauri::command]
fn rename_day_task(
    application: State<'_, DesktopTodayApplication>,
    input: DayTaskRenameInput,
) -> Result<TodayView, String> {
    application.rename_day_task(input)
}

#[tauri::command]
fn set_day_task_completion(
    application: State<'_, DesktopTodayApplication>,
    input: DayTaskCompletionInput,
) -> Result<TodayView, String> {
    application.set_day_task_completion(input)
}

#[tauri::command]
fn delete_day_task(
    application: State<'_, DesktopTodayApplication>,
    input: DayTaskDeleteInput,
) -> Result<TodayView, String> {
    application.delete_day_task(input)
}

#[tauri::command]
fn planning_day_task_context(
    application: State<'_, DesktopTodayApplication>,
    date: String,
) -> Result<PlanningDayTaskContextView, String> {
    application.planning_day_task_context(&date)
}

#[tauri::command]
fn update_evening_review(
    application: State<'_, DesktopTodayApplication>,
    input: EveningUpdateInput,
) -> Result<TodayView, String> {
    application.update_evening_review(input)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let application = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            let today_workspace_file = today_workspace_file_for(&app_handle)?;
            let appearance_file = appearance_file_for(&app_handle)?;
            let appearance_background_directory = appearance_background_directory_for(&app_handle)?;
            let interface_language_file = interface_language_file_for(&app_handle)?;
            #[cfg(target_os = "macos")]
            if let Some(cutover_mode) = std::env::var_os("PERSONAL_DASHBOARD_2_CUTOVER_MODE") {
                use crate::notification::Clock;
                let cutover_mode = cutover_mode
                    .into_string()
                    .map_err(|_| "The cutover mode is not valid UTF-8.")?;
                let candidate = ReviewedCandidateIdentity::new(
                    std::env::var("PERSONAL_DASHBOARD_2_CUTOVER_COMMIT")
                        .map_err(|_| "The reviewed cutover commit is required.")?,
                    std::env::var("PERSONAL_DASHBOARD_2_CUTOVER_BUNDLE_SHA256")
                        .map_err(|_| "The reviewed cutover bundle SHA-256 is required.")?,
                )?;
                let app_data_dir = profile_file_for(&app_handle)?
                    .parent()
                    .map(PathBuf::from)
                    .ok_or("The app data path has no parent directory.")?;
                let cutover = CutoverApplication::new(
                    CutoverPaths::new(app_data_dir, legacy_exercise_directory_for(&app_handle)?),
                    MacLegacyCutoverRuntime,
                );
                match cutover_mode.as_str() {
                    "preflight" => {
                        use std::io::Write;
                        let result = cutover.inspect(&candidate);
                        let exit_code = match result {
                            Ok(view) => {
                                println!(
                                    "PERSONAL_DASHBOARD_CUTOVER_PREFLIGHT={}",
                                    serde_json::to_string(&view).map_err(|error| {
                                        format!("Could not encode preflight: {error}")
                                    })?
                                );
                                i32::from(!view.unknown_paths.is_empty()) * 2
                            }
                            Err(error) => {
                                eprintln!("PERSONAL_DASHBOARD_CUTOVER_BLOCKED={error}");
                                2
                            }
                        };
                        let _ = std::io::stdout().flush();
                        let _ = std::io::stderr().flush();
                        std::process::exit(exit_code);
                    }
                    "execute" => {
                        cutover.execute(&candidate, SystemClock.now_epoch_millis())?;
                    }
                    _ => return Err("The cutover mode must be preflight or execute.".into()),
                }
            }
            app.manage(TodayApplication::new(
                FileTodayWorkspacePersistence::new(today_workspace_file.clone()),
                NativeTodayWorkspaceExchange::new(app_handle.clone()),
                SystemClock,
            ));
            app.manage(TaskApplication::new(
                FileTodayWorkspacePersistence::new(today_workspace_file),
                SystemClock,
                FileTaskStore,
            ));
            app.manage(AppearanceApplication::with_image_library(
                FileAppearancePersistence::new(appearance_file),
                NativeAppearanceImageLibrary::new(
                    app_handle.clone(),
                    appearance_background_directory,
                ),
            ));
            app.manage(InterfaceLanguageApplication::new(
                FileInterfaceLanguagePersistence::new(interface_language_file),
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
            appearance_preferences,
            set_accent_color,
            restore_appearance_defaults,
            select_background_image,
            remove_background_image,
            interface_language_preferences,
            set_interface_language,
            today_view,
            daily_view,
            read_daily_view,
            calendar_month,
            habit_snapshot,
            tasks_view,
            create_task,
            update_task,
            set_task_state,
            delete_task,
            restore_task,
            correct_task_completion,
            set_local_habit_completion,
            set_historical_habit_completion,
            select_today_vault,
            append_daytime_update,
            add_dated_note,
            correct_dated_note,
            add_day_task,
            rename_day_task,
            set_day_task_completion,
            delete_day_task,
            planning_day_task_context,
            update_evening_review
        ]);

    #[cfg(not(target_os = "macos"))]
    let application = application.invoke_handler(tauri::generate_handler![
        application_identity,
        appearance_preferences,
        set_accent_color,
        restore_appearance_defaults,
        select_background_image,
        remove_background_image,
        interface_language_preferences,
        set_interface_language,
        today_view,
        daily_view,
        read_daily_view,
        calendar_month,
        habit_snapshot,
        tasks_view,
        create_task,
        update_task,
        set_task_state,
        delete_task,
        restore_task,
        correct_task_completion,
        set_local_habit_completion,
        set_historical_habit_completion,
        select_today_vault,
        append_daytime_update,
        add_dated_note,
        correct_dated_note,
        add_day_task,
        rename_day_task,
        set_day_task_completion,
        delete_day_task,
        planning_day_task_context,
        update_evening_review
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
