use serde::Serialize;
use tauri::{Manager, State};

mod platform;
mod profile;

use platform::{profile_file_for, FileProfilePersistence, NativeFileExchange};
use profile::{ProfileAction, ProfileApplication, ProfileView};

type DesktopProfileApplication =
    ProfileApplication<FileProfilePersistence, NativeFileExchange<tauri::Wry>>;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            let profile_file = profile_file_for(&app_handle)?;
            app.manage(ProfileApplication::new(
                FileProfilePersistence::new(profile_file),
                NativeFileExchange::new(app_handle),
            ));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            application_identity,
            profile_state,
            update_profile_label,
            export_profile,
            import_profile
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Personal Dashboard");
}
