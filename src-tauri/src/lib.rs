use serde::Serialize;
use tauri::{Manager, State};
#[cfg(target_os = "macos")]
use tauri::{RunEvent, WindowEvent};

mod clock;
pub mod exercise;
pub mod notification;
#[cfg(target_os = "macos")]
mod notification_platform;
mod platform;
mod profile;

use clock::SystemClock;
use exercise::{ExerciseApplication, ExerciseDashboardView};
#[cfg(target_os = "macos")]
use notification::{NotificationApplication, NotificationCapabilityView};
#[cfg(target_os = "macos")]
use notification_platform::NativeNotificationPlatform;
use platform::{
    exercise_file_for, profile_file_for, FileExercisePersistence, FileProfilePersistence,
    NativeFileExchange,
};
use profile::{ProfileAction, ProfileApplication, ProfileView};

type DesktopProfileApplication =
    ProfileApplication<FileProfilePersistence, NativeFileExchange<tauri::Wry>>;
#[cfg(target_os = "macos")]
type DesktopNotificationApplication =
    NotificationApplication<NativeNotificationPlatform, SystemClock>;
#[cfg(target_os = "macos")]
type DesktopExerciseApplication =
    ExerciseApplication<FileExercisePersistence, NativeNotificationPlatform, SystemClock>;

#[cfg(not(target_os = "macos"))]
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
}

#[cfg(not(target_os = "macos"))]
type DesktopExerciseApplication =
    ExerciseApplication<FileExercisePersistence, UnavailableNotificationPlatform, SystemClock>;

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
fn export_profile(
    application: State<'_, DesktopProfileApplication>,
) -> Result<ProfileAction, String> {
    application.export_profile()
}

#[tauri::command]
fn import_profile(
    application: State<'_, DesktopProfileApplication>,
) -> Result<ProfileAction, String> {
    application.import_profile()
}

#[tauri::command]
fn exercise_dashboard(
    application: State<'_, DesktopExerciseApplication>,
) -> Result<ExerciseDashboardView, String> {
    application.open()
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
            app.manage(ProfileApplication::new(
                FileProfilePersistence::new(profile_file),
                NativeFileExchange::new(app_handle.clone()),
            ));
            let exercise_file = exercise_file_for(&app_handle)?;
            #[cfg(target_os = "macos")]
            app.manage(ExerciseApplication::new(
                FileExercisePersistence::new(exercise_file),
                NativeNotificationPlatform::new(),
                SystemClock,
            ));
            #[cfg(not(target_os = "macos"))]
            app.manage(ExerciseApplication::new(
                FileExercisePersistence::new(exercise_file),
                UnavailableNotificationPlatform,
                SystemClock,
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
            profile_state,
            update_profile_label,
            export_profile,
            import_profile,
            exercise_dashboard,
            notification_state,
            request_notification_permission,
            schedule_capability_notification
        ]);

    #[cfg(not(target_os = "macos"))]
    let application = application.invoke_handler(tauri::generate_handler![
        application_identity,
        profile_state,
        update_profile_label,
        export_profile,
        import_profile,
        exercise_dashboard
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
