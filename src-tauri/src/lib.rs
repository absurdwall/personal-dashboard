use serde::Serialize;
#[cfg(target_os = "macos")]
use std::path::PathBuf;
use tauri::{Manager, State};
#[cfg(target_os = "macos")]
use tauri::{RunEvent, WindowEvent};

pub mod backup;
mod clock;
pub mod cutover;
pub mod exercise;
pub mod habits;
pub mod migration;
pub mod move_profile;
pub mod notification;
#[cfg(target_os = "macos")]
mod notification_platform;
#[allow(dead_code)] // Retained only for historical regression and cutover parsing boundaries.
mod platform;
pub mod profile;
pub mod today;

use clock::SystemClock;
#[cfg(target_os = "macos")]
use cutover::{
    CutoverApplication, CutoverPaths, MacLegacyCutoverRuntime, ReviewedCandidateIdentity,
};
use platform::{
    legacy_exercise_directory_for, profile_file_for, today_workspace_file_for,
    FileTodayWorkspacePersistence, NativeTodayWorkspaceExchange,
};
use today::{
    CalendarMonthView, DatedNoteCorrectionInput, DatedNoteInput, DaytimeUpdateInput,
    EveningUpdateInput, HabitSnapshotView, TodayApplication, TodayView, VaultSelectionResult,
};

type DesktopTodayApplication = TodayApplication<
    FileTodayWorkspacePersistence,
    NativeTodayWorkspaceExchange<tauri::Wry>,
    SystemClock,
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
        feature_area: "Daily records and habits",
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
) -> Result<VaultSelectionResult, String> {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let application = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            let today_workspace_file = today_workspace_file_for(&app_handle)?;
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
                FileTodayWorkspacePersistence::new(today_workspace_file),
                NativeTodayWorkspaceExchange::new(app_handle.clone()),
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
            update_evening_review
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
