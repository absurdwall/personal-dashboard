use crate::appearance::{
    owned_background_file_name_is_safe, AppearanceImageLibrary, AppearancePersistence,
    SelectedBackgroundImage, MAX_BACKGROUND_IMAGE_BYTES,
};
use crate::backup::CompleteProfileReplacement;
use crate::exercise::ExercisePersistence;
use crate::interface_language::{InterfaceLanguage, InterfaceLanguagePersistence};
use crate::migration::{BaselinePersistence, CompleteProfileAdoption, CompleteProfileDocuments};
use crate::move_profile::ProfileMoveExchange;
use crate::profile::{ProfileExchange, ProfilePersistence};
use crate::today::{
    TodayWorkspaceExchange, TodayWorkspacePersistence, TodayWorkspaceSelectionState,
};
use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_dialog::DialogExt;

const PROFILE_FILE_NAME: &str = "profile.json";
const EXERCISE_FILE_NAME: &str = "exercise.json";
const TODAY_WORKSPACE_FILE_NAME: &str = "today-workspace.json";
const APPEARANCE_FILE_NAME: &str = "appearance.json";
const INTERFACE_LANGUAGE_FILE_NAME: &str = "interface-language.json";
const MAX_PROFILE_DOCUMENT_BYTES: u64 = 10 * 1024 * 1024;
const RESTORE_TRANSACTION_DIRECTORY: &str = ".profile-restore-transaction";
const RESTORE_PREPARED_MARKER: &str = "prepared";
const PREVIOUS_PROFILE_FILE: &str = "profile.previous.json";
const PREVIOUS_EXERCISE_FILE: &str = "exercise.previous.json";
const BASELINE_MIGRATION_TRANSACTION_DIRECTORY: &str = ".baseline-migration-transaction";
const MIGRATED_PROFILE_FILE: &str = "profile.migrated.json";
const MIGRATED_EXERCISE_FILE: &str = "exercise.migrated.json";
const MIGRATION_PREPARED_MARKER: &str = "prepared";

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

#[derive(Clone)]
pub struct FileBaselinePersistence {
    baseline_file: PathBuf,
}

impl FileBaselinePersistence {
    pub fn new(baseline_file: PathBuf) -> Self {
        Self { baseline_file }
    }
}

impl BaselinePersistence for FileBaselinePersistence {
    fn load(&self) -> Result<Option<Vec<u8>>, String> {
        match fs::read(&self.baseline_file) {
            Ok(document) if document.len() as u64 <= MAX_PROFILE_DOCUMENT_BYTES => {
                Ok(Some(document))
            }
            Ok(_) => Err("The completed baseline state is too large to migrate safely.".into()),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(error) => Err(format!(
                "Could not read the completed baseline state: {error}"
            )),
        }
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

#[derive(Clone)]
pub struct FileAppearancePersistence {
    appearance_file: PathBuf,
}

impl FileAppearancePersistence {
    pub fn new(appearance_file: PathBuf) -> Self {
        Self { appearance_file }
    }
}

impl AppearancePersistence for FileAppearancePersistence {
    fn load(&self) -> Result<Option<Vec<u8>>, String> {
        match fs::read(&self.appearance_file) {
            Ok(document) => Ok(Some(document)),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(error) => Err(format!(
                "Could not read the local appearance preference: {error}"
            )),
        }
    }

    fn save(&self, document: &[u8]) -> Result<(), String> {
        atomic_save(&self.appearance_file, document, "appearance preference")
    }
}

#[derive(Clone)]
pub struct NativeAppearanceImageLibrary<R: Runtime> {
    app: AppHandle<R>,
    background_directory: PathBuf,
}

impl<R: Runtime> NativeAppearanceImageLibrary<R> {
    pub fn new(app: AppHandle<R>, background_directory: PathBuf) -> Self {
        Self {
            app,
            background_directory,
        }
    }

    fn owned_path(&self, file_name: &str) -> Result<PathBuf, String> {
        if !owned_background_file_name_is_safe(file_name) {
            return Err("The app-owned background image name is invalid.".into());
        }
        Ok(self.background_directory.join(file_name))
    }
}

fn background_picker_copy(interface_language: InterfaceLanguage) -> (&'static str, &'static str) {
    match interface_language {
        InterfaceLanguage::Zh => ("选择本地背景图片", "图片"),
        InterfaceLanguage::En => ("Choose a local background image", "Images"),
    }
}

impl<R: Runtime> AppearanceImageLibrary for NativeAppearanceImageLibrary<R> {
    fn select_image(
        &self,
        interface_language: InterfaceLanguage,
    ) -> Result<Option<SelectedBackgroundImage>, String> {
        let (title, filter_label) = background_picker_copy(interface_language);
        let Some(selected_file) = self
            .app
            .dialog()
            .file()
            .set_title(title)
            .add_filter(filter_label, &["png", "jpg", "jpeg", "gif", "webp"])
            .blocking_pick_file()
        else {
            return Ok(None);
        };
        let selected_path = selected_file
            .into_path()
            .map_err(|_| "The selected background image is unavailable.".to_string())?;
        read_bounded_background_image(&selected_path, "selected")
            .map(|bytes| Some(SelectedBackgroundImage { bytes }))
    }

    fn load_owned(&self, file_name: &str) -> Result<Option<Vec<u8>>, String> {
        let path = self.owned_path(file_name)?;
        let file = match fs::File::open(&path) {
            Ok(file) => file,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
            Err(error) => {
                return Err(format!(
                    "Could not read the app-owned background image: {error}"
                ))
            }
        };
        read_bounded_open_background_image(file, "app-owned").map(Some)
    }

    fn image_is_decodable(&self, bytes: &[u8]) -> bool {
        native_image_is_decodable(bytes)
    }

    fn save_owned(&self, file_name: &str, document: &[u8]) -> Result<(), String> {
        let path = self.owned_path(file_name)?;
        atomic_save(&path, document, "background image")
    }

    fn remove_owned(&self, file_name: &str) -> Result<(), String> {
        let path = self.owned_path(file_name)?;
        match fs::remove_file(path) {
            Ok(()) => Ok(()),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(error) => Err(format!(
                "Could not remove the app-owned background image: {error}"
            )),
        }
    }
}

#[cfg(target_os = "macos")]
fn native_image_is_decodable(bytes: &[u8]) -> bool {
    use std::ffi::c_void;

    type CFTypeRef = *const c_void;
    type CFDataRef = *const c_void;
    type CGImageSourceRef = *const c_void;
    type CGImageRef = *const c_void;

    #[link(name = "CoreFoundation", kind = "framework")]
    extern "C" {
        fn CFDataCreate(allocator: *const c_void, bytes: *const u8, length: isize) -> CFDataRef;
        fn CFRelease(value: CFTypeRef);
    }
    #[link(name = "ImageIO", kind = "framework")]
    extern "C" {
        fn CGImageSourceCreateWithData(data: CFDataRef, options: *const c_void)
            -> CGImageSourceRef;
        fn CGImageSourceCreateImageAtIndex(
            source: CGImageSourceRef,
            index: usize,
            options: *const c_void,
        ) -> CGImageRef;
    }

    unsafe {
        let data = CFDataCreate(std::ptr::null(), bytes.as_ptr(), bytes.len() as isize);
        if data.is_null() {
            return false;
        }
        let source = CGImageSourceCreateWithData(data, std::ptr::null());
        CFRelease(data);
        if source.is_null() {
            return false;
        }
        let image = CGImageSourceCreateImageAtIndex(source, 0, std::ptr::null());
        CFRelease(source);
        if image.is_null() {
            return false;
        }
        CFRelease(image);
        true
    }
}

#[cfg(not(target_os = "macos"))]
fn native_image_is_decodable(_bytes: &[u8]) -> bool {
    true
}

fn read_bounded_background_image(path: &Path, ownership: &str) -> Result<Vec<u8>, String> {
    let file = fs::File::open(path)
        .map_err(|error| format!("Could not read the {ownership} background image: {error}"))?;
    read_bounded_open_background_image(file, ownership)
}

fn read_bounded_open_background_image(
    mut file: fs::File,
    ownership: &str,
) -> Result<Vec<u8>, String> {
    let length = file
        .metadata()
        .map_err(|error| format!("Could not read the {ownership} background image: {error}"))?
        .len();
    if length > MAX_BACKGROUND_IMAGE_BYTES as u64 {
        return Err("The selected background image is empty or larger than 20 MB.".into());
    }
    let mut bytes = Vec::with_capacity(length as usize);
    Read::by_ref(&mut file)
        .take(MAX_BACKGROUND_IMAGE_BYTES as u64 + 1)
        .read_to_end(&mut bytes)
        .map_err(|error| format!("Could not read the {ownership} background image: {error}"))?;
    if bytes.len() > MAX_BACKGROUND_IMAGE_BYTES {
        return Err("The selected background image is empty or larger than 20 MB.".into());
    }
    Ok(bytes)
}

#[derive(Clone)]
pub struct FileInterfaceLanguagePersistence {
    preference_file: PathBuf,
}

impl FileInterfaceLanguagePersistence {
    pub fn new(preference_file: PathBuf) -> Self {
        Self { preference_file }
    }
}

impl InterfaceLanguagePersistence for FileInterfaceLanguagePersistence {
    fn load(&self) -> Result<Option<Vec<u8>>, String> {
        match fs::read(&self.preference_file) {
            Ok(document) => Ok(Some(document)),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(error) => Err(format!(
                "Could not read the local interface language: {error}"
            )),
        }
    }

    fn save(&self, document: &[u8]) -> Result<(), String> {
        atomic_save(&self.preference_file, document, "interface language")
    }
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
        replacement.recover_pending_initialization()?;
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

    fn initialization_transaction_directory(&self) -> Result<PathBuf, String> {
        self.profile_file
            .parent()
            .map(|parent| parent.join(BASELINE_MIGRATION_TRANSACTION_DIRECTORY))
            .ok_or_else(|| "The local profile path has no parent directory.".to_string())
    }

    fn prepare_initialization(&self, profile: &[u8], exercise: &[u8]) -> Result<PathBuf, String> {
        if self.profile_file.exists() || self.exercise_file.exists() {
            return Err("App-owned profile state already exists.".into());
        }
        let transaction_directory = self.initialization_transaction_directory()?;
        fs::create_dir_all(&transaction_directory)
            .map_err(|error| format!("Could not prepare baseline migration: {error}"))?;
        let preparation = (|| {
            write_synced(&transaction_directory.join(MIGRATED_PROFILE_FILE), profile)?;
            write_synced(
                &transaction_directory.join(MIGRATED_EXERCISE_FILE),
                exercise,
            )?;
            write_synced(
                &transaction_directory.join(MIGRATION_PREPARED_MARKER),
                b"prepared",
            )
        })();
        if let Err(error) = preparation {
            let _ = fs::remove_dir_all(&transaction_directory);
            return Err(error);
        }
        Ok(transaction_directory)
    }

    fn recover_pending_initialization(&self) -> Result<(), String> {
        let transaction_directory = self.initialization_transaction_directory()?;
        if !transaction_directory.exists() {
            return Ok(());
        }
        if !transaction_directory
            .join(MIGRATION_PREPARED_MARKER)
            .exists()
        {
            fs::remove_dir_all(&transaction_directory).map_err(|error| {
                format!("Could not clear incomplete baseline migration: {error}")
            })?;
            return Ok(());
        }
        let profile = fs::read(transaction_directory.join(MIGRATED_PROFILE_FILE))
            .map_err(|error| format!("Could not recover the migrated profile: {error}"))?;
        let exercise = fs::read(transaction_directory.join(MIGRATED_EXERCISE_FILE))
            .map_err(|error| format!("Could not recover migrated exercise state: {error}"))?;
        atomic_save(&self.exercise_file, &exercise, "migrated exercise state")?;
        atomic_save(&self.profile_file, &profile, "migrated profile")?;
        fs::remove_dir_all(&transaction_directory)
            .map_err(|error| format!("Could not finish baseline migration recovery: {error}"))
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

impl CompleteProfileAdoption for FileProfileReplacement {
    fn adopt_complete(&self, documents: &CompleteProfileDocuments) -> Result<(), String> {
        match (self.profile_file.exists(), self.exercise_file.exists()) {
            (false, false) => {
                self.recover_pending_initialization()?;
                self.prepare_initialization(documents.profile(), documents.exercise())?;
                self.recover_pending_initialization()
            }
            (true, true) => self.replace_complete(documents.profile(), documents.exercise()),
            _ => Err("App-owned profile state is incomplete.".into()),
        }
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

#[derive(Clone)]
pub struct FileTodayWorkspacePersistence {
    workspace_file: PathBuf,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct TodayWorkspaceDocument {
    schema_version: u32,
    selected_vault: PathBuf,
}

impl FileTodayWorkspacePersistence {
    pub fn new(workspace_file: PathBuf) -> Self {
        Self { workspace_file }
    }

    fn inspect_document(&self) -> Result<TodayWorkspaceSelectionState, String> {
        let document = match fs::read(&self.workspace_file) {
            Ok(document) => document,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                return Ok(TodayWorkspaceSelectionState::Missing)
            }
            Err(error) => {
                return Err(format!(
                    "Could not read the Today workspace setting: {error}"
                ))
            }
        };
        let document: TodayWorkspaceDocument = match serde_json::from_slice(&document) {
            Ok(document) => document,
            Err(error) => {
                return Ok(TodayWorkspaceSelectionState::Recoverable(format!(
                    "The Today workspace setting is invalid: {error}"
                )))
            }
        };
        if document.schema_version != 1 {
            return Ok(TodayWorkspaceSelectionState::Recoverable(
                "The Today workspace setting uses an unsupported schema version.".into(),
            ));
        }
        Ok(TodayWorkspaceSelectionState::Selected(
            document.selected_vault,
        ))
    }
}

impl TodayWorkspacePersistence for FileTodayWorkspacePersistence {
    fn load_selected_vault(&self) -> Result<Option<PathBuf>, String> {
        match self.inspect_document()? {
            TodayWorkspaceSelectionState::Missing => Ok(None),
            TodayWorkspaceSelectionState::Selected(vault) => Ok(Some(vault)),
            TodayWorkspaceSelectionState::Recoverable(error) => Err(error),
        }
    }

    fn inspect_selected_vault(&self) -> Result<TodayWorkspaceSelectionState, String> {
        self.inspect_document()
    }

    fn save_selected_vault(&self, vault: &Path) -> Result<(), String> {
        let document = serde_json::to_vec_pretty(&TodayWorkspaceDocument {
            schema_version: 1,
            selected_vault: vault.to_path_buf(),
        })
        .map_err(|error| format!("Could not encode the Today workspace setting: {error}"))?;
        atomic_save(&self.workspace_file, &document, "Today workspace setting")
    }
}

#[derive(Clone)]
pub struct NativeTodayWorkspaceExchange<R: Runtime> {
    app: AppHandle<R>,
}

impl<R: Runtime> NativeTodayWorkspaceExchange<R> {
    pub fn new(app: AppHandle<R>) -> Self {
        Self { app }
    }
}

impl<R: Runtime> TodayWorkspaceExchange for NativeTodayWorkspaceExchange<R> {
    fn select_vault(&self) -> Result<Option<PathBuf>, String> {
        self.select_vault_in_language(InterfaceLanguage::Zh)
    }

    fn select_vault_in_language(
        &self,
        interface_language: InterfaceLanguage,
    ) -> Result<Option<PathBuf>, String> {
        let Some(selected_folder) = self
            .app
            .dialog()
            .file()
            .set_title(vault_picker_title(interface_language))
            .blocking_pick_folder()
        else {
            return Ok(None);
        };
        selected_folder
            .into_path()
            .map(Some)
            .map_err(|_| "The selected vault folder is unavailable.".into())
    }
}

fn vault_picker_title(interface_language: InterfaceLanguage) -> &'static str {
    match interface_language {
        InterfaceLanguage::Zh => "选择 Tortilla Flat Vault",
        InterfaceLanguage::En => "Select the Tortilla Flat Vault",
    }
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
        if metadata.len() > MAX_PROFILE_DOCUMENT_BYTES {
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
    application_data_file_for(app, PROFILE_FILE_NAME)
}

pub fn exercise_file_for<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    application_data_file_for(app, EXERCISE_FILE_NAME)
}

pub fn today_workspace_file_for<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    application_data_file_for(app, TODAY_WORKSPACE_FILE_NAME)
}

pub fn appearance_file_for<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    application_data_file_for(app, APPEARANCE_FILE_NAME)
}

pub fn appearance_background_directory_for<R: Runtime>(
    app: &AppHandle<R>,
) -> Result<PathBuf, String> {
    let appearance_file = appearance_file_for(app)?;
    appearance_file
        .parent()
        .map(|directory| directory.join("background-images"))
        .ok_or_else(|| "The local appearance preference has no parent directory.".into())
}

pub fn interface_language_file_for<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    application_data_file_for(app, INTERFACE_LANGUAGE_FILE_NAME)
}

fn application_data_file_for<R: Runtime>(
    app: &AppHandle<R>,
    file_name: &str,
) -> Result<PathBuf, String> {
    let data_directory = match std::env::var_os("PERSONAL_DASHBOARD_DATA_DIR") {
        Some(override_directory) => PathBuf::from(override_directory),
        None => app
            .path()
            .app_data_dir()
            .map_err(|error| format!("Could not locate the app data directory: {error}"))?,
    };
    Ok(data_directory.join(file_name))
}

pub fn baseline_file_for<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    if let Some(override_file) = std::env::var_os("PERSONAL_DASHBOARD_BASELINE_FILE") {
        return Ok(PathBuf::from(override_file));
    }
    app.path()
        .home_dir()
        .map(|home| {
            home.join("Library")
                .join("Application Support")
                .join("Exercise Habit Tracker")
                .join("state.json")
        })
        .map_err(|error| format!("Could not locate the completed baseline state: {error}"))
}

pub fn legacy_exercise_directory_for<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    if let Some(override_directory) = std::env::var_os("PERSONAL_DASHBOARD_LEGACY_EXERCISE_DIR") {
        return Ok(PathBuf::from(override_directory));
    }
    app.path()
        .home_dir()
        .map(|home| {
            home.join("Library")
                .join("Application Support")
                .join("Exercise Habit Tracker")
        })
        .map_err(|error| format!("Could not locate the legacy Exercise data directory: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::today::TodayWorkspaceSelectionState;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn vault_picker_title_follows_the_current_interface_language() {
        assert_eq!(
            vault_picker_title(InterfaceLanguage::Zh),
            "选择 Tortilla Flat Vault"
        );
        assert_eq!(
            vault_picker_title(InterfaceLanguage::En),
            "Select the Tortilla Flat Vault"
        );
    }

    #[test]
    fn background_picker_copy_follows_the_current_interface_language() {
        assert_eq!(
            background_picker_copy(InterfaceLanguage::Zh),
            ("选择本地背景图片", "图片")
        );
        assert_eq!(
            background_picker_copy(InterfaceLanguage::En),
            ("Choose a local background image", "Images")
        );
    }

    struct TemporaryWorkspaceDirectory(PathBuf);

    impl TemporaryWorkspaceDirectory {
        fn new(label: &str) -> Self {
            let unique = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos();
            let directory = std::env::temp_dir().join(format!(
                "personal-dashboard-{label}-{}-{unique}",
                std::process::id()
            ));
            fs::create_dir_all(&directory).unwrap();
            Self(directory)
        }

        fn file(&self) -> PathBuf {
            self.0.join(TODAY_WORKSPACE_FILE_NAME)
        }
    }

    impl Drop for TemporaryWorkspaceDirectory {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn malformed_today_workspace_settings_are_recoverable_only_after_explicit_choice() {
        let directory = TemporaryWorkspaceDirectory::new("today-workspace-malformed");
        fs::write(directory.file(), b"{not-json").unwrap();
        let persistence = FileTodayWorkspacePersistence::new(directory.file());

        assert!(persistence.load_selected_vault().is_err());
        assert!(matches!(
            persistence.inspect_selected_vault(),
            Ok(TodayWorkspaceSelectionState::Recoverable(message))
                if message.contains("invalid")
        ));
    }

    #[test]
    fn unsupported_today_workspace_schema_is_recoverable_without_being_empty() {
        let directory = TemporaryWorkspaceDirectory::new("today-workspace-schema");
        fs::write(
            directory.file(),
            br#"{"schemaVersion":2,"selectedVault":"/tmp/old"}"#,
        )
        .unwrap();
        let persistence = FileTodayWorkspacePersistence::new(directory.file());

        assert!(matches!(
            persistence.inspect_selected_vault(),
            Ok(TodayWorkspaceSelectionState::Recoverable(message))
                if message.contains("unsupported schema")
        ));
        assert!(persistence.load_selected_vault().is_err());
    }

    #[test]
    fn today_workspace_io_failures_remain_hard_errors() {
        let directory = TemporaryWorkspaceDirectory::new("today-workspace-io");
        let not_a_directory = directory.0.join("not-a-directory");
        fs::write(&not_a_directory, b"occupied").unwrap();
        let persistence =
            FileTodayWorkspacePersistence::new(not_a_directory.join(TODAY_WORKSPACE_FILE_NAME));

        let error = persistence
            .inspect_selected_vault()
            .expect_err("a path I/O error must not look recoverable");
        assert!(error.contains("Could not read the Today workspace setting"));
    }

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

    #[test]
    fn interrupted_baseline_initialization_completes_before_profile_use() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let directory = std::env::temp_dir().join(format!(
            "personal-dashboard-baseline-initialization-{}-{unique}",
            std::process::id()
        ));
        fs::create_dir_all(&directory).unwrap();
        let profile_file = directory.join(PROFILE_FILE_NAME);
        let exercise_file = directory.join(EXERCISE_FILE_NAME);
        let interrupted =
            FileProfileReplacement::new(profile_file.clone(), exercise_file.clone()).unwrap();
        interrupted
            .prepare_initialization(b"migrated profile", b"migrated exercise")
            .unwrap();
        atomic_save(
            &exercise_file,
            b"partially activated exercise",
            "exercise state",
        )
        .unwrap();

        FileProfileReplacement::new(profile_file.clone(), exercise_file.clone()).unwrap();

        assert_eq!(
            b"migrated profile",
            fs::read(&profile_file).unwrap().as_slice()
        );
        assert_eq!(
            b"migrated exercise",
            fs::read(&exercise_file).unwrap().as_slice()
        );
        assert!(!directory
            .join(BASELINE_MIGRATION_TRANSACTION_DIRECTORY)
            .exists());
        fs::remove_dir_all(directory).unwrap();
    }
}

#[cfg(all(test, target_os = "macos"))]
mod jpeg_regressions {
    #[test]
    fn native_decoder_accepts_jpeg_with_trailing_bytes() {
        let mut bytes = include_bytes!("../tests/fixtures/background-sample.jpg").to_vec();
        bytes.extend_from_slice(b"\r\n");
        assert!(super::native_image_is_decodable(&bytes));
        assert!(!super::native_image_is_decodable(&[0xff, 0xd8, 0xff, 0x00]));
    }
}
