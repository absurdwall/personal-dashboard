use crate::backup::CompleteProfileReplacement;
use crate::exercise::ExercisePersistence;
use crate::move_profile::ProfileMoveExchange;
use crate::profile::{ProfileExchange, ProfilePersistence};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_dialog::DialogExt;

const PROFILE_FILE_NAME: &str = "profile.json";
const EXERCISE_FILE_NAME: &str = "exercise.json";
const MAX_BACKUP_BYTES: u64 = 10 * 1024 * 1024;
const RESTORE_TRANSACTION_DIRECTORY: &str = ".profile-restore-transaction";
const RESTORE_PREPARED_MARKER: &str = "prepared";
const PREVIOUS_PROFILE_FILE: &str = "profile.previous.json";
const PREVIOUS_EXERCISE_FILE: &str = "exercise.previous.json";

#[derive(Clone)]
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

#[derive(Clone)]
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

#[derive(Clone)]
pub struct FileProfileReplacement {
    profile_file: PathBuf,
    exercise_file: PathBuf,
}

impl FileProfileReplacement {
    pub fn new(profile_file: PathBuf, exercise_file: PathBuf) -> Result<Self, String> {
        let replacement = Self {
            profile_file,
            exercise_file,
        };
        replacement.recover_pending_restore()?;
        Ok(replacement)
    }

    fn transaction_directory(&self) -> Result<PathBuf, String> {
        self.profile_file
            .parent()
            .map(|parent| parent.join(RESTORE_TRANSACTION_DIRECTORY))
            .ok_or_else(|| "The local profile path has no parent directory.".to_string())
    }

    fn prepare_restore(&self) -> Result<PathBuf, String> {
        let transaction_directory = self.transaction_directory()?;
        fs::create_dir_all(&transaction_directory)
            .map_err(|error| format!("Could not prepare the profile restore: {error}"))?;
        let preparation = (|| {
            let profile = fs::read(&self.profile_file)
                .map_err(|error| format!("Could not preserve the active profile: {error}"))?;
            let exercise = fs::read(&self.exercise_file).map_err(|error| {
                format!("Could not preserve the active exercise profile: {error}")
            })?;
            write_synced(&transaction_directory.join(PREVIOUS_PROFILE_FILE), &profile)?;
            write_synced(
                &transaction_directory.join(PREVIOUS_EXERCISE_FILE),
                &exercise,
            )?;
            write_synced(
                &transaction_directory.join(RESTORE_PREPARED_MARKER),
                b"prepared",
            )
        })();
        if let Err(error) = preparation {
            let _ = fs::remove_dir_all(&transaction_directory);
            return Err(error);
        }
        Ok(transaction_directory)
    }

    fn recover_pending_restore(&self) -> Result<(), String> {
        let transaction_directory = self.transaction_directory()?;
        if !transaction_directory.exists() {
            return Ok(());
        }
        if !transaction_directory.join(RESTORE_PREPARED_MARKER).exists() {
            fs::remove_dir_all(&transaction_directory)
                .map_err(|error| format!("Could not clear an incomplete restore: {error}"))?;
            return Ok(());
        }
        let profile = fs::read(transaction_directory.join(PREVIOUS_PROFILE_FILE))
            .map_err(|error| format!("Could not recover the active profile: {error}"))?;
        let exercise = fs::read(transaction_directory.join(PREVIOUS_EXERCISE_FILE))
            .map_err(|error| format!("Could not recover the active exercise profile: {error}"))?;
        atomic_save(&self.profile_file, &profile, "profile")?;
        atomic_save(&self.exercise_file, &exercise, "exercise state")?;
        fs::remove_dir_all(&transaction_directory)
            .map_err(|error| format!("Could not finish profile recovery: {error}"))
    }
}

impl CompleteProfileReplacement for FileProfileReplacement {
    fn replace_complete(&self, profile: &[u8], exercise: &[u8]) -> Result<(), String> {
        self.recover_pending_restore()?;
        let transaction_directory = self.prepare_restore()?;
        let replacement = atomic_save(&self.exercise_file, exercise, "exercise state")
            .and_then(|_| atomic_save(&self.profile_file, profile, "profile"))
            .and_then(|_| {
                fs::remove_dir_all(&transaction_directory)
                    .map_err(|error| format!("Could not finish the profile restore: {error}"))
            });
        if let Err(error) = replacement {
            return match self.recover_pending_restore() {
                Ok(()) => Err(error),
                Err(recovery_error) => Err(format!(
                    "{error} The previous profile could not be recovered: {recovery_error}"
                )),
            };
        }
        Ok(())
    }
}

fn write_synced(path: &Path, document: &[u8]) -> Result<(), String> {
    let mut output = OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(path)
        .map_err(|error| format!("Could not prepare the profile restore: {error}"))?;
    output
        .write_all(document)
        .and_then(|_| output.sync_all())
        .map_err(|error| format!("Could not prepare the profile restore: {error}"))
}

#[derive(Clone)]
pub struct NativeFileExchange<R: Runtime> {
    app: AppHandle<R>,
}

#[derive(Clone, Copy)]
enum ProfileFilePurpose {
    Backup,
    Move,
}

struct ProfileFileConfiguration {
    export_title: &'static str,
    import_title: &'static str,
    file_name: &'static str,
    filter_name: &'static str,
    subject: &'static str,
}

impl ProfileFilePurpose {
    fn configuration(self) -> ProfileFileConfiguration {
        match self {
            Self::Backup => ProfileFileConfiguration {
                export_title: "Back up Personal Dashboard profile",
                import_title: "Restore Personal Dashboard profile",
                file_name: "personal-dashboard-backup.json",
                filter_name: "Personal Dashboard backup",
                subject: "backup",
            },
            Self::Move => ProfileFileConfiguration {
                export_title: "Move Personal Dashboard profile",
                import_title: "Import moved Personal Dashboard profile",
                file_name: "personal-dashboard-move.json",
                filter_name: "Personal Dashboard move",
                subject: "profile move",
            },
        }
    }
}

impl<R: Runtime> NativeFileExchange<R> {
    pub fn new(app: AppHandle<R>) -> Self {
        Self { app }
    }

    fn export_document(
        &self,
        purpose: ProfileFilePurpose,
        document: &[u8],
    ) -> Result<bool, String> {
        let Some(selected_path) = self.select_export_path(purpose)? else {
            return Ok(false);
        };
        atomic_save(&selected_path, document, purpose.configuration().subject)?;
        Ok(true)
    }

    fn select_export_path(&self, purpose: ProfileFilePurpose) -> Result<Option<PathBuf>, String> {
        let configuration = purpose.configuration();
        let Some(selected_file) = self
            .app
            .dialog()
            .file()
            .set_title(configuration.export_title)
            .set_file_name(configuration.file_name)
            .add_filter(configuration.filter_name, &["json"])
            .blocking_save_file()
        else {
            return Ok(None);
        };
        let selected_path = selected_file.into_path().map_err(|_| {
            format!(
                "The selected {} destination is unavailable.",
                configuration.subject
            )
        })?;
        Ok(Some(selected_path))
    }

    fn import_document(&self, purpose: ProfileFilePurpose) -> Result<Option<Vec<u8>>, String> {
        let configuration = purpose.configuration();
        let Some(selected_file) = self
            .app
            .dialog()
            .file()
            .set_title(configuration.import_title)
            .add_filter(configuration.filter_name, &["json"])
            .blocking_pick_file()
        else {
            return Ok(None);
        };
        let selected_path = selected_file.into_path().map_err(|_| {
            format!(
                "The selected {} file is unavailable.",
                configuration.subject
            )
        })?;
        let metadata = fs::metadata(&selected_path).map_err(|error| {
            format!(
                "Could not inspect the selected {}: {error}",
                configuration.subject
            )
        })?;
        if metadata.len() > MAX_BACKUP_BYTES {
            return Err(format!(
                "The selected {} is too large.",
                configuration.subject
            ));
        }
        fs::read(selected_path).map(Some).map_err(|error| {
            format!(
                "Could not read the selected {}: {error}",
                configuration.subject
            )
        })
    }
}

impl<R: Runtime> ProfileExchange for NativeFileExchange<R> {
    fn export(&self, document: &[u8]) -> Result<bool, String> {
        self.export_document(ProfileFilePurpose::Backup, document)
    }

    fn import(&self) -> Result<Option<Vec<u8>>, String> {
        self.import_document(ProfileFilePurpose::Backup)
    }
}

impl<R: Runtime> ProfileMoveExchange for NativeFileExchange<R> {
    type ExportTarget = PathBuf;

    fn select_move_export(&self) -> Result<Option<Self::ExportTarget>, String> {
        self.select_export_path(ProfileFilePurpose::Move)
    }

    fn export_move(&self, target: &Self::ExportTarget, document: &[u8]) -> Result<(), String> {
        atomic_save(
            target,
            document,
            ProfileFilePurpose::Move.configuration().subject,
        )
    }

    fn import_move(&self) -> Result<Option<Vec<u8>>, String> {
        self.import_document(ProfileFilePurpose::Move)
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn interrupted_complete_replacement_recovers_both_previous_documents() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let directory = std::env::temp_dir().join(format!(
            "personal-dashboard-profile-replacement-{}-{unique}",
            std::process::id()
        ));
        fs::create_dir_all(&directory).unwrap();
        let profile_file = directory.join(PROFILE_FILE_NAME);
        let exercise_file = directory.join(EXERCISE_FILE_NAME);
        fs::write(&profile_file, b"previous profile").unwrap();
        fs::write(&exercise_file, b"previous exercise").unwrap();

        let interrupted =
            FileProfileReplacement::new(profile_file.clone(), exercise_file.clone()).unwrap();
        interrupted.prepare_restore().unwrap();
        atomic_save(
            &exercise_file,
            b"partially restored exercise",
            "exercise state",
        )
        .unwrap();

        FileProfileReplacement::new(profile_file.clone(), exercise_file.clone()).unwrap();
        assert_eq!(
            b"previous profile",
            fs::read(&profile_file).unwrap().as_slice()
        );
        assert_eq!(
            b"previous exercise",
            fs::read(&exercise_file).unwrap().as_slice()
        );
        assert!(!directory.join(RESTORE_TRANSACTION_DIRECTORY).exists());

        let replacement =
            FileProfileReplacement::new(profile_file.clone(), exercise_file.clone()).unwrap();
        replacement
            .replace_complete(b"restored profile", b"restored exercise")
            .unwrap();
        assert_eq!(
            b"restored profile",
            fs::read(&profile_file).unwrap().as_slice()
        );
        assert_eq!(
            b"restored exercise",
            fs::read(&exercise_file).unwrap().as_slice()
        );
        assert!(!directory.join(RESTORE_TRANSACTION_DIRECTORY).exists());
        fs::remove_dir_all(directory).unwrap();
    }
}
