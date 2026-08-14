use crate::exercise::ExercisePersistence;
use crate::profile::{ProfileExchange, ProfilePersistence};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_dialog::DialogExt;

const PROFILE_FILE_NAME: &str = "profile.json";
const EXERCISE_FILE_NAME: &str = "exercise.json";
const MAX_PROFILE_BYTES: u64 = 64 * 1024;

pub struct FileProfilePersistence {
    profile_file: PathBuf,
}

impl FileProfilePersistence {
    pub fn new(profile_file: PathBuf) -> Self {
        Self { profile_file }
    }
}

impl ProfilePersistence for FileProfilePersistence {
    fn load(&self) -> Result<Option<Vec<u8>>, String> {
        match fs::read(&self.profile_file) {
            Ok(document) => Ok(Some(document)),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(error) => Err(format!("Could not read the local profile: {error}")),
        }
    }

    fn save(&self, document: &[u8]) -> Result<(), String> {
        atomic_save(&self.profile_file, document, "profile")
    }
}

pub struct FileExercisePersistence {
    exercise_file: PathBuf,
}

impl FileExercisePersistence {
    pub fn new(exercise_file: PathBuf) -> Self {
        Self { exercise_file }
    }
}

impl ExercisePersistence for FileExercisePersistence {
    fn load(&self) -> Result<Option<Vec<u8>>, String> {
        match fs::read(&self.exercise_file) {
            Ok(document) => Ok(Some(document)),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(error) => Err(format!("Could not read the local exercise state: {error}")),
        }
    }

    fn save(&self, document: &[u8]) -> Result<(), String> {
        atomic_save(&self.exercise_file, document, "exercise state")
    }
}

fn atomic_save(path: &Path, document: &[u8], label: &str) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| format!("The local {label} path has no parent directory."))?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("Could not create the profile directory: {error}"))?;

    let temporary_file = temporary_file_for(path);
    let mut output = OpenOptions::new()
        .create(true)
        .truncate(true)
        .write(true)
        .open(&temporary_file)
        .map_err(|error| format!("Could not prepare the local {label}: {error}"))?;
    output
        .write_all(document)
        .and_then(|_| output.sync_all())
        .map_err(|error| format!("Could not write the local {label}: {error}"))?;
    fs::rename(&temporary_file, path)
        .map_err(|error| format!("Could not activate the local {label}: {error}"))
}

fn temporary_file_for(profile_file: &Path) -> PathBuf {
    profile_file.with_extension(format!("json.tmp-{}", std::process::id()))
}

pub struct NativeFileExchange<R: Runtime> {
    app: AppHandle<R>,
}

impl<R: Runtime> NativeFileExchange<R> {
    pub fn new(app: AppHandle<R>) -> Self {
        Self { app }
    }
}

impl<R: Runtime> ProfileExchange for NativeFileExchange<R> {
    fn export(&self, document: &[u8]) -> Result<bool, String> {
        let Some(selected_file) = self
            .app
            .dialog()
            .file()
            .set_title("Export Personal Dashboard profile")
            .set_file_name("personal-dashboard-profile.json")
            .add_filter("Personal Dashboard profile", &["json"])
            .blocking_save_file()
        else {
            return Ok(false);
        };
        let selected_path = selected_file
            .into_path()
            .map_err(|_| "The selected export destination is unavailable.".to_string())?;
        fs::write(selected_path, document)
            .map_err(|error| format!("Could not export the profile: {error}"))?;
        Ok(true)
    }

    fn import(&self) -> Result<Option<Vec<u8>>, String> {
        let Some(selected_file) = self
            .app
            .dialog()
            .file()
            .set_title("Import Personal Dashboard profile")
            .add_filter("Personal Dashboard profile", &["json"])
            .blocking_pick_file()
        else {
            return Ok(None);
        };
        let selected_path = selected_file
            .into_path()
            .map_err(|_| "The selected import file is unavailable.".to_string())?;
        let metadata = fs::metadata(&selected_path)
            .map_err(|error| format!("Could not inspect the selected profile: {error}"))?;
        if metadata.len() > MAX_PROFILE_BYTES {
            return Err("The selected profile is too large.".into());
        }
        fs::read(selected_path)
            .map(Some)
            .map_err(|error| format!("Could not read the selected profile: {error}"))
    }
}

pub fn profile_file_for<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let data_directory = match std::env::var_os("PERSONAL_DASHBOARD_DATA_DIR") {
        Some(override_directory) => PathBuf::from(override_directory),
        None => app
            .path()
            .app_data_dir()
            .map_err(|error| format!("Could not locate the app data directory: {error}"))?,
    };
    Ok(data_directory.join(PROFILE_FILE_NAME))
}

pub fn exercise_file_for<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let data_directory = match std::env::var_os("PERSONAL_DASHBOARD_DATA_DIR") {
        Some(override_directory) => PathBuf::from(override_directory),
        None => app
            .path()
            .app_data_dir()
            .map_err(|error| format!("Could not locate the app data directory: {error}"))?,
    };
    Ok(data_directory.join(EXERCISE_FILE_NAME))
}
